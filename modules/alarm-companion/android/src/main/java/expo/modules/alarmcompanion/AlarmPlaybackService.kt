package expo.modules.alarmcompanion

import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max

class AlarmPlaybackService : Service() {
  companion object {
    const val ACTION_FIRE = "alarm_companion.FIRE"
    const val ACTION_PREVIEW = "alarm_companion.PREVIEW"
    const val ACTION_STOP = "alarm_companion.STOP"
    private const val PREFS = "alarm_companion_native_v1"
    private const val PREVIEW_MAX_DURATION_MS = 120_000L
    private val sessionIds = AtomicLong()
    @Volatile private var current: AlarmPlaybackService? = null
    @Volatile private var startingSessionToken: String? = null

    @Synchronized fun start(context: Context, routine: JSONObject, alarm: Boolean, preview: Boolean = false): Boolean {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val activeToken = prefs.getString("activeSession", null)
      val activePriority = prefs.getInt("activePriority", -1)
      val isLive = activeToken != null && (
        startingSessionToken == activeToken || current?.ownsReservation(activeToken) == true
      )
      if (!isLive && activeToken != null) clearReservation(prefs, activeToken)
      val priority = priority(routine, alarm, preview)
      if (isLive && !shouldReplace(activePriority, priority)) {
        val activeRoutineId = runCatching { prefs.getString("activeRoutine", null)?.let(::JSONObject)?.optString("id") }.getOrNull()
        if (alarm && !preview && activeRoutineId != routine.optString("id")) AlarmNotifications.postAlarmWaiting(context, routine)
        return false
      }

      val previousToken = if (isLive) activeToken else null
      val previousPriority = if (isLive) activePriority else -1
      val previousReservation = previousToken?.let { PlaybackReservation(it, previousPriority) }
      val token = "${android.os.Process.myPid()}-${sessionIds.incrementAndGet()}-${System.nanoTime()}"
      prefs.edit().putString("activeSession", token).putInt("activePriority", priority).apply()
      startingSessionToken = token
      val intent = Intent(context, AlarmPlaybackService::class.java)
        .setAction(if (preview) ACTION_PREVIEW else ACTION_FIRE)
        .putExtra("routine", routine.toString())
        .putExtra("alarm", alarm)
        .putExtra("preview", preview)
        .putExtra("sessionToken", token)
      try {
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
      } catch (_: Exception) {
        val active = prefs.getString("activeSession", null)?.let { PlaybackReservation(it, prefs.getInt("activePriority", -1)) }
        val restored = restoreFailedReservation(active, token, previousReservation)
        if (restored != active) {
          if (restored == null) clearReservation(prefs, token)
          else prefs.edit().putString("activeSession", restored.token).putInt("activePriority", restored.priority).apply()
        }
        if (startingSessionToken == token) startingSessionToken = null
        if (alarm && !preview) AlarmNotifications.postAlarmFallback(context, routine)
        return false
      }
      return true
    }

    fun priority(routine: JSONObject, alarm: Boolean, preview: Boolean): Int = when {
      preview -> 0
      alarm -> 3
      routine.optString("reminderBehavior") == "spoken" -> 2
      else -> 1
    }

    fun shouldReplace(activePriority: Int, incomingPriority: Int): Boolean = activePriority < 0 || incomingPriority > activePriority

    fun stop(context: Context?, id: String? = null) {
      if (context == null) { current?.stopCurrentSession(); return }
      val token = if (id == null) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("activeSession", null) else null
      runCatching {
        context.startService(Intent(context, AlarmPlaybackService::class.java).setAction(ACTION_STOP).putExtra("id", id).putExtra("sessionToken", token))
      }
    }

    private fun clearReservation(prefs: android.content.SharedPreferences, token: String) {
      if (!reservationMatches(prefs.getString("activeSession", null), token)) return
      prefs.edit().remove("activeSession").remove("activePriority").remove("activeRoutine")
        .remove("activeAlarm").remove("activePreview").apply()
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private val sessions = PlaybackSessionState()
  private val ttsState = TtsInitializationState()
  private var player: MediaPlayer? = null
  private var voicePlayer: MediaPlayer? = null
  private var tts: TextToSpeech? = null
  private var pending: JSONObject? = null
  private var sessionToken: String? = null
  @Volatile private var sessionTokenForReservation: String? = null
  private var routineId: String? = null
  private var startId = 0
  private var alarm = true
  private var preview = false
  private var stopped = true
  private var ttsAttemptedSession: Long? = null
  private var speechSequence = 0L
  private var completedSpeechSequence = 0L
  private var fade: Runnable? = null
  private var intro: Runnable? = null
  private var repeat: Runnable? = null
  private var previewTimeout: Runnable? = null
  private var reminderFinish: Runnable? = null
  private var sleepTimer: Runnable? = null
  private var sleepFade: Runnable? = null
  private var ttsRetry: Runnable? = null
  private var focus: AudioFocusRequest? = null
  private var focusListener: AudioManager.OnAudioFocusChangeListener? = null
  private var focusPaused = false

  override fun onCreate() {
    super.onCreate()
    AlarmNotifications.ensureChannels(this)
    sessionTokenForReservation = getSharedPreferences(PREFS, MODE_PRIVATE).getString("activeSession", null)
    current = this
    ensureTts()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, commandStartId: Int): Int {
    startId = commandStartId
    if (intent?.action == ACTION_STOP) {
      val requestedId = intent.getStringExtra("id")
      if (requestedId == null) {
        val requestedToken = intent.getStringExtra("sessionToken")
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        if (requestedToken == null || !reservationMatches(prefs.getString("activeSession", null), requestedToken)) {
          return if (sessions.current() != null) START_STICKY else START_NOT_STICKY
        }
        stopCurrentSession()
        clearReservation(prefs, requestedToken)
        stopSelf(commandStartId)
      } else if (routineId == requestedId) {
        stopCurrentSession()
        stopSelf(commandStartId)
      } else {
        return if (sessions.current() != null) START_STICKY else START_NOT_STICKY
      }
      return START_NOT_STICKY
    }

    val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
    val routine: JSONObject
    val token: String
    val isAlarm: Boolean
    val isPreview: Boolean
    if (intent == null) {
      token = prefs.getString("activeSession", null) ?: run { stopSelf(commandStartId); return START_NOT_STICKY }
      routine = runCatching { prefs.getString("activeRoutine", null)?.let(::JSONObject) }.getOrNull()
        ?: run { clearReservation(prefs, token); stopSelf(commandStartId); return START_NOT_STICKY }
      isAlarm = prefs.getBoolean("activeAlarm", true)
      isPreview = prefs.getBoolean("activePreview", false)
    } else {
      token = intent.getStringExtra("sessionToken") ?: run { stopSelf(commandStartId); return START_NOT_STICKY }
      routine = runCatching { intent.getStringExtra("routine")?.let(::JSONObject) }.getOrNull()
        ?: run { clearReservation(prefs, token); stopSelf(commandStartId); return START_NOT_STICKY }
      isAlarm = intent.getBooleanExtra("alarm", true)
      isPreview = intent.getBooleanExtra("preview", false)
    }

    if (!reservationMatches(prefs.getString("activeSession", null), token)) {
      stopSelf(commandStartId)
      return START_NOT_STICKY
    }
    replaceSession(routine, token, isAlarm, isPreview, commandStartId)
    return START_STICKY
  }

  private fun replaceSession(routine: JSONObject, token: String, isAlarm: Boolean, isPreview: Boolean, commandStartId: Int) {
    val previousId = routineId
    if (sessions.current() != null) endCurrentSession(clearReservation = false, removeForeground = false, stopService = false)
    val generation = sessions.begin()
    pending = routine
    sessionToken = token
    sessionTokenForReservation = token
    if (startingSessionToken == token) startingSessionToken = null
    routineId = routine.optString("id")
    alarm = isAlarm
    preview = isPreview
    startId = commandStartId
    stopped = false
    ttsAttemptedSession = null
    speechSequence = 0L
    completedSpeechSequence = 0L
    val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
    prefs.edit().putString("activeSession", token).putInt("activePriority", priority(routine, alarm, preview))
      .putString("activeRoutine", routine.toString()).putBoolean("activeAlarm", alarm).putBoolean("activePreview", preview).apply()
    if (!previousId.isNullOrBlank() && previousId != routineId) AlarmNotifications.cancel(this, previousId)

    try {
      val fullScreen = Build.VERSION.SDK_INT < 34 || getSystemService(android.app.NotificationManager::class.java).canUseFullScreenIntent()
      val notification = AlarmNotifications.foreground(this, routine, alarm, alarm && fullScreen)
      val notificationId = routineId!!.hashCode()
      if (Build.VERSION.SDK_INT >= 29) startForeground(notificationId, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      else startForeground(notificationId, notification)
      if (tts == null) ensureTts()
      requestFocus(generation)
      begin(routine, generation)
    } catch (_: Exception) {
      finishSession(generation)
      if (alarm && !preview) AlarmNotifications.postAlarmFallback(this, routine)
    }
  }

  private fun ensureTts() {
    if (!ttsState.shouldInitialize()) return
    val attempt = ttsState.begin()
    var created: TextToSpeech? = null
    try {
      created = TextToSpeech(applicationContext) { status ->
        handler.post {
          if (!ttsState.complete(attempt, status == TextToSpeech.SUCCESS)) return@post
          if (status != TextToSpeech.SUCCESS) {
            runCatching { created?.shutdown() }
            if (tts === created) tts = null
          }
        }
      }
      tts = created
    } catch (_: Exception) {
      ttsState.complete(attempt, false)
      runCatching { created?.shutdown() }
      tts = null
    }
  }

  private fun begin(routine: JSONObject, generation: Long) {
    if (!sessions.isCurrent(generation)) return
    val sound = routine.optString("sound", "birds")
    val raw = when (sound) { "birds" -> R.raw.ac_birds; "rain" -> R.raw.ac_rain; "ocean" -> R.raw.ac_ocean; "stream" -> R.raw.ac_stream; "chime" -> R.raw.ac_chime; else -> null }
    val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
    fun createPlayer(resource: Int): MediaPlayer? {
      val created = runCatching { MediaPlayer.create(this, resource, attributes, 0) }.getOrNull() ?: return null
      return try {
        created.isLooping = true
        created.setVolume(0f, 0f)
        created.start()
        created
      } catch (_: Exception) { releasePlayer(created); null }
    }
    player = raw?.let { runCatching { createPlayer(it) }.getOrNull() }
    if (player == null && raw != null && raw != R.raw.ac_chime) player = runCatching { createPlayer(R.raw.ac_chime) }.getOrNull()
    val duration = max(1, routine.optInt("fadeSeconds", 30)) * 1000
    val started = System.currentTimeMillis()
    val fadeStep = object : Runnable {
      override fun run() {
        if (!sessions.isCurrent(generation) || stopped) return
        val activePlayer = player ?: return
        val ratio = ((System.currentTimeMillis() - started).toFloat() / duration).coerceIn(0f, 1f)
        val volume = routine.optDouble("backgroundVolume", .35).toFloat() * ratio
        runCatching { activePlayer.setVolume(volume, volume) }.onFailure { finishSession(generation) }
        if (ratio < 1f && sessions.isCurrent(generation)) { fade = this; handler.postDelayed(this, 200) }
      }
    }
    fade = fadeStep
    handler.post(fadeStep)
    if (preview) {
      val startedAt = System.currentTimeMillis()
      previewTimeout = Runnable {
        if (sessions.isCurrent(generation) && previewExpired(startedAt, System.currentTimeMillis(), PREVIEW_MAX_DURATION_MS)) finishSession(generation)
      }
      handler.postDelayed(previewTimeout!!, PREVIEW_MAX_DURATION_MS)
    }
    val speechDelay = routine.optInt("introSeconds", 8).coerceIn(0, 120) * 1000L
    intro = Runnable {
      if (!sessions.isCurrent(generation) || stopped) return@Runnable
      if (preview || alarm || routine.optString("reminderBehavior", "notification-only") == "spoken") speak(routine, generation)
      else {
        if (routine.optString("type") == "sleep") startSleepTimer(routine, generation)
        else { reminderFinish = Runnable { if (sessions.isCurrent(generation)) finishSession(generation) }; handler.postDelayed(reminderFinish!!, 30_000) }
      }
    }
    handler.postDelayed(intro!!, speechDelay)
  }

  private fun speak(routine: JSONObject, generation: Long, waitedMs: Long = 0L, existingSpeechId: Long? = null) {
    if (!sessions.isCurrent(generation) || stopped) return
    val speechId = existingSpeechId ?: (++speechSequence)
    if (speechId != speechSequence || completedSpeechSequence == speechId) return
    runCatching { player?.setVolume((routine.optDouble("backgroundVolume", .35) * .22).toFloat(), (routine.optDouble("backgroundVolume", .35) * .22).toFloat()) }
    val clip = routine.optString("selectedRecordingUri", "")
    if (routine.optBoolean("recordingUnavailable")) { onSpeechFinished(routine, generation, speechId); return }
    if (clip.isNotBlank()) { playRecording(routine, generation, clip, speechId); return }

    if (ttsState.status != TtsInitializationState.Status.READY || tts == null) {
      if (ttsState.shouldInitialize() && ttsAttemptedSession != generation) {
        ttsAttemptedSession = generation
        ensureTts()
      }
      if (ttsState.status == TtsInitializationState.Status.INITIALIZING && waitedMs < 5_000L) {
        ttsRetry = Runnable { ttsRetry = null; speak(routine, generation, waitedMs + 200L, speechId) }
        handler.postDelayed(ttsRetry!!, 200L)
      } else onSpeechFinished(routine, generation, speechId)
      return
    }

    val engine = tts ?: run { onSpeechFinished(routine, generation, speechId); return }
    try {
      val config = routine.optJSONObject("speechConfig") ?: JSONObject()
      val language = config.optString("language", routine.optString("language", "en-US")).let(Locale::forLanguageTag)
      val result = engine.setLanguage(language)
      if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) engine.language = Locale.getDefault()
      val voiceId = config.optString("voice", routine.optString("voice", ""))
      engine.voices?.firstOrNull { it.name == voiceId }?.let { engine.voice = it }
      engine.setSpeechRate(config.optDouble("rate", .88).toFloat())
      engine.setPitch(config.optDouble("pitch", .98).toFloat())
      engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) {}
        override fun onDone(utteranceId: String?) { handler.post { onSpeechFinished(routine, generation, speechId) } }
        @Deprecated("Deprecated in Java") override fun onError(utteranceId: String?) { handler.post { onSpeechFinished(routine, generation, speechId) } }
        override fun onError(utteranceId: String?, errorCode: Int) { handler.post { onSpeechFinished(routine, generation, speechId) } }
      })
      val message = routine.optString("selectedMessage", routine.optString("message")).ifBlank { "Your reminder is due." }
      val parameters = Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, routine.optDouble("voiceVolume", 1.0).toFloat().coerceIn(0f, 1f)) }
      if (engine.speak(message, TextToSpeech.QUEUE_FLUSH, parameters, "ac-${generation}-$speechId-${routine.optString("id")}") == TextToSpeech.ERROR) onSpeechFinished(routine, generation, speechId)
    } catch (_: Exception) { onSpeechFinished(routine, generation, speechId) }
  }

  private fun playRecording(routine: JSONObject, generation: Long, clip: String, speechId: Long) {
    val mediaPlayer = try { MediaPlayer() } catch (_: Exception) { onSpeechFinished(routine, generation, speechId); return }
    try {
        mediaPlayer.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        mediaPlayer.setDataSource(this@AlarmPlaybackService, android.net.Uri.parse(clip))
        val volume = routine.optDouble("voiceVolume", 1.0).toFloat().coerceIn(0f, 1f)
        mediaPlayer.setVolume(volume, volume)
        mediaPlayer.setOnCompletionListener { completed ->
          if (voicePlayer === completed) voicePlayer = null
          releasePlayer(completed)
          onSpeechFinished(routine, generation, speechId)
        }
        mediaPlayer.setOnErrorListener { failed, _, _ ->
          if (voicePlayer === failed) voicePlayer = null
          releasePlayer(failed)
          onSpeechFinished(routine, generation, speechId)
          true
        }
        mediaPlayer.prepare()
    } catch (_: Exception) { releasePlayer(mediaPlayer); onSpeechFinished(routine, generation, speechId); return }
    if (!sessions.isCurrent(generation)) { releasePlayer(mediaPlayer); return }
    voicePlayer = mediaPlayer
    runCatching { mediaPlayer.start() }.onFailure { releasePlayer(mediaPlayer); voicePlayer = null; onSpeechFinished(routine, generation, speechId) }
  }

  private fun onSpeechFinished(routine: JSONObject, generation: Long, speechId: Long) {
    if (!sessions.isCurrent(generation) || stopped || speechId != speechSequence || completedSpeechSequence == speechId) return
    completedSpeechSequence = speechId
    if (preview) { finishSession(generation); return }
    val volume = routine.optDouble("backgroundVolume", .35).toFloat()
    runCatching { player?.setVolume(volume, volume) }
    if (!alarm) {
      if (routine.optString("type") == "sleep") startSleepTimer(routine, generation)
      else { reminderFinish = Runnable { if (sessions.isCurrent(generation)) finishSession(generation) }; handler.postDelayed(reminderFinish!!, 30_000L) }
    }
    else if (routine.optBoolean("repeatVoice")) {
      repeat = Runnable { speak(routine, generation) }
      handler.postDelayed(repeat!!, 15_000)
    }
  }

  private fun startSleepTimer(routine: JSONObject, generation: Long) {
    if (sleepTimer != null || !sessions.isCurrent(generation)) return
    val minutes = SleepTimerPolicy.delayMinutes(routine.optInt("sleepTimerMinutes", 30))
    sleepTimer = Runnable {
      if (!sessions.isCurrent(generation)) return@Runnable
      val started = System.currentTimeMillis()
      val initialVolume = routine.optDouble("backgroundVolume", .35).toFloat().coerceIn(0f, 1f)
      val fadeOut = object : Runnable {
        override fun run() {
          if (!sessions.isCurrent(generation)) return
          val progress = SleepTimerPolicy.fadeProgress(System.currentTimeMillis() - started)
          runCatching { player?.setVolume(initialVolume * (1f - progress), initialVolume * (1f - progress)) }
          if (progress >= 1f) finishSession(generation) else { sleepFade = this; handler.postDelayed(this, 500L) }
        }
      }
      sleepFade = fadeOut
      handler.post(fadeOut)
    }
    handler.postDelayed(sleepTimer!!, minutes * 60_000L)
  }

  private fun requestFocus(generation: Long) {
    val manager = getSystemService(AudioManager::class.java)
    val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
    val gain = if (alarm) AudioManager.AUDIOFOCUS_GAIN else AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
    val listener = AudioManager.OnAudioFocusChangeListener { change ->
      if (!sessions.isCurrent(generation)) return@OnAudioFocusChangeListener
      when (change) {
        AudioManager.AUDIOFOCUS_LOSS -> finishSession(generation)
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> { runCatching { player?.pause(); voicePlayer?.pause() }; focusPaused = true }
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> runCatching { player?.setVolume(.08f, .08f) }
        AudioManager.AUDIOFOCUS_GAIN -> {
          if (focusPaused) { runCatching { player?.start(); voicePlayer?.start() }; focusPaused = false }
          pending?.let { r -> runCatching { player?.setVolume(r.optDouble("backgroundVolume", .35).toFloat(), r.optDouble("backgroundVolume", .35).toFloat()) } }
        }
      }
    }
    focusListener = listener
    if (Build.VERSION.SDK_INT >= 26) {
      focus = AudioFocusRequest.Builder(gain).setAudioAttributes(attributes).setOnAudioFocusChangeListener(listener).build()
      manager.requestAudioFocus(focus!!)
    } else {
      @Suppress("DEPRECATION") manager.requestAudioFocus(listener, AudioManager.STREAM_ALARM, gain)
    }
  }

  private fun ownsReservation(token: String): Boolean = sessionTokenForReservation == token || startingSessionToken == token

  private fun stopCurrentSession() {
    sessions.current()?.let(::finishSession)
  }

  private fun finishSession(generation: Long) {
    if (!sessions.finish(generation)) return
    endCurrentSession(clearReservation = true, removeForeground = true, stopService = true)
  }

  private fun endCurrentSession(clearReservation: Boolean, removeForeground: Boolean, stopService: Boolean) {
    val token = sessionToken
    val id = routineId
    stopped = true
    cancelCallbacks()
    runCatching { tts?.stop() }
    releasePlayer(player); player = null
    releasePlayer(voicePlayer); voicePlayer = null
    abandonFocus()
    if (clearReservation && token != null) clearReservation(getSharedPreferences(PREFS, MODE_PRIVATE), token)
    if (removeForeground) stopForeground(STOP_FOREGROUND_REMOVE)
    if (id != null && removeForeground) AlarmNotifications.cancel(this, id)
    sessionToken = null
    if (clearReservation) sessionTokenForReservation = null
    routineId = null
    pending = null
    if (stopService) stopSelf(startId)
  }

  private fun cancelCallbacks() {
    listOf(fade, intro, repeat, previewTimeout, reminderFinish, ttsRetry, sleepTimer, sleepFade).forEach { callback -> if (callback != null) handler.removeCallbacks(callback) }
    fade = null; intro = null; repeat = null; previewTimeout = null; reminderFinish = null; ttsRetry = null; sleepTimer = null; sleepFade = null
  }

  private fun abandonFocus() {
    val manager = getSystemService(AudioManager::class.java)
    if (Build.VERSION.SDK_INT >= 26) focus?.let { runCatching { manager.abandonAudioFocusRequest(it) } }
    else focusListener?.let { @Suppress("DEPRECATION") runCatching { manager.abandonAudioFocus(it) } }
    focus = null
    focusListener = null
    focusPaused = false
  }

  private fun releasePlayer(mediaPlayer: MediaPlayer?) {
    if (mediaPlayer == null) return
    releasePlaybackResource({ mediaPlayer.stop() }, { mediaPlayer.release() })
  }

  override fun onDestroy() {
    stopCurrentSession()
    ttsState.invalidate()
    runCatching { tts?.shutdown() }
    tts = null
    if (current === this) current = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
