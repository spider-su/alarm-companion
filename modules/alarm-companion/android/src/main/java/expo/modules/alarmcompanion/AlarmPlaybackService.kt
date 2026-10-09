package expo.modules.alarmcompanion

import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import org.json.JSONObject
import java.util.Locale
import kotlin.math.max

class AlarmPlaybackService : Service(), TextToSpeech.OnInitListener {
  companion object {
    const val ACTION_FIRE = "alarm_companion.FIRE"
    const val ACTION_PREVIEW = "alarm_companion.PREVIEW"
    const val ACTION_STOP = "alarm_companion.STOP"
    private var current: AlarmPlaybackService? = null
    fun start(context: Context, routine: JSONObject, alarm: Boolean) {
      val intent = Intent(context, AlarmPlaybackService::class.java).setAction(ACTION_FIRE).putExtra("routine", routine.toString()).putExtra("alarm", alarm)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
    }
    fun stop(context: Context?, id: String? = null) { if (context != null) runCatching { context.startService(Intent(context, AlarmPlaybackService::class.java).setAction(ACTION_STOP).putExtra("id", id)) } else current?.stopSelf() }
  }
  private val handler = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var tts: TextToSpeech? = null
  private var pending: JSONObject? = null
  private var alarm = true
  private var ready = false
  private var stopped = false
  private var fade: Runnable? = null
  private var intro: Runnable? = null
  private var repeat: Runnable? = null
  private var focus: AudioFocusRequest? = null
  private var focusPaused = false
  override fun onCreate() { super.onCreate(); current = this; AlarmNotifications.ensureChannels(this); tts = TextToSpeech(this, this) }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      val requestedId = intent.getStringExtra("id")
      if (requestedId == null || pending == null || requestedId == pending?.optString("id")) { stopPlayback(); stopSelf(); return START_NOT_STICKY }
      return START_STICKY
    }
    if (intent == null) {
      val prefs = getSharedPreferences("alarm_companion_native_v1", MODE_PRIVATE)
      pending = runCatching { prefs.getString("activeRoutine", null)?.let(::JSONObject) }.getOrNull()
      if (pending == null) { stopSelf(); return START_NOT_STICKY }
      alarm = prefs.getBoolean("activeAlarm", true)
      stopped = false
      val fullScreen = Build.VERSION.SDK_INT < 34 || getSystemService(android.app.NotificationManager::class.java).canUseFullScreenIntent()
      val notification = AlarmNotifications.foreground(this, pending!!, alarm, alarm && fullScreen)
      if (Build.VERSION.SDK_INT >= 29) startForeground(pending!!.optString("id").hashCode(), notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) else startForeground(pending!!.optString("id").hashCode(), notification)
      requestFocus()
      if (ready) begin(pending!!)
      return START_STICKY
    }
    val json = intent.getStringExtra("routine") ?: return START_NOT_STICKY
    val previousId = pending?.optString("id")
    pending = runCatching { JSONObject(json) }.getOrNull() ?: return START_NOT_STICKY
    alarm = intent.getBooleanExtra("alarm", true)
    getSharedPreferences("alarm_companion_native_v1", MODE_PRIVATE).edit().putString("activeRoutine", pending.toString()).putBoolean("activeAlarm", alarm).apply()
    if (!previousId.isNullOrBlank() && previousId != pending?.optString("id")) AlarmNotifications.cancel(this, previousId)
    stopped = false
    val fullScreen = Build.VERSION.SDK_INT < 34 || getSystemService(android.app.NotificationManager::class.java).canUseFullScreenIntent()
    val notification = AlarmNotifications.foreground(this, pending!!, alarm, alarm && fullScreen)
    if (Build.VERSION.SDK_INT >= 29) startForeground(pending!!.optString("id").hashCode(), notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    else startForeground(pending!!.optString("id").hashCode(), notification)
    requestFocus()
    if (ready) begin(pending!!)
    return START_STICKY
  }
  override fun onInit(status: Int) { ready = status == TextToSpeech.SUCCESS; pending?.let { begin(it) } }
  private fun begin(r: JSONObject) {
    if (stopped) return
    stopAudioOnly()
    val sound = r.optString("sound", "birds")
    val raw = when (sound) { "birds" -> R.raw.ac_birds; "rain" -> R.raw.ac_rain; "ocean" -> R.raw.ac_ocean; "stream" -> R.raw.ac_stream; "chime" -> R.raw.ac_chime; else -> null }
    val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
    fun createPlayer(resource: Int) = MediaPlayer.create(this, resource, attributes, 0)?.apply { isLooping = true; setVolume(0f, 0f); start() }
    player = raw?.let { runCatching { createPlayer(it) }.getOrNull() }
    if (player == null && raw != null && raw != R.raw.ac_chime) player = runCatching { createPlayer(R.raw.ac_chime) }.getOrNull()
    val duration = max(1, r.optInt("fadeSeconds", 30)) * 1000
    val started = System.currentTimeMillis()
    val fadeStep = object : Runnable { override fun run() { val p = player ?: return; if (stopped) return; val ratio = ((System.currentTimeMillis() - started).toFloat() / duration).coerceIn(0f, 1f); val volume = r.optDouble("backgroundVolume", .35).toFloat() * ratio; p.setVolume(volume, volume); if (ratio < 1) { fade = this; handler.postDelayed(this, 200) } } }
    fade = fadeStep; handler.post(fadeStep)
    val speechDelay = r.optInt("introSeconds", 8).coerceIn(0, 120) * 1000L
    intro = Runnable {
      if (alarm || r.optString("reminderBehavior", "notification-only") == "spoken") speak(r)
      else handler.postDelayed({ if (!stopped) { stopPlayback(); stopSelf() } }, 30_000)
    }; handler.postDelayed(intro!!, speechDelay)
  }
  private fun speak(r: JSONObject) {
    if (stopped) return
    player?.setVolume((r.optDouble("backgroundVolume", .35) * .22).toFloat(), (r.optDouble("backgroundVolume", .35) * .22).toFloat())
    val engine = tts
    if (!ready || engine == null) { onSpeechFinished(r); return }
    val language = r.optString("language", "en-US").let { Locale.forLanguageTag(it) }
    val result = engine.setLanguage(language)
    if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) engine.language = Locale.getDefault()
    val voiceId = r.optString("voice", "")
    engine.voices?.firstOrNull { it.name == voiceId }?.let { engine.voice = it }
    val presets = when (r.optString("tone")) { "Cheerful" -> 1.06f to 1.08f; "Firm" -> 1f to 1f; "Playful" -> 1.08f to 1.15f; else -> .88f to .98f }
    engine.setSpeechRate(r.optDouble("speed", presets.first.toDouble()).toFloat()); engine.setPitch(r.optDouble("pitch", presets.second.toDouble()).toFloat())
    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String?) {}
      override fun onDone(utteranceId: String?) { handler.post { onSpeechFinished(r) } }
      @Deprecated("Deprecated in Java") override fun onError(utteranceId: String?) { handler.post { onSpeechFinished(r) } }
      override fun onError(utteranceId: String?, errorCode: Int) { handler.post { onSpeechFinished(r) } }
    })
    val message = r.optString("message").ifBlank { "Your reminder is due." }
    val parameters = Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, r.optDouble("voiceVolume", 1.0).toFloat().coerceIn(0f, 1f)) }
    val code = engine.speak(message, TextToSpeech.QUEUE_FLUSH, parameters, "ac-${r.optString("id")}")
    if (code == TextToSpeech.ERROR) onSpeechFinished(r)
  }
  private fun onSpeechFinished(r: JSONObject) {
    if (stopped) return
    val volume = r.optDouble("backgroundVolume", .35).toFloat(); player?.setVolume(volume, volume)
    if (!alarm) { val seconds = r.optInt("introSeconds", 8).coerceAtLeast(0) + 30; handler.postDelayed({ if (!stopped) { stopPlayback(); stopSelf() } }, seconds * 1000L) }
    else if (r.optBoolean("repeatVoice")) { repeat = Runnable { speak(r) }; handler.postDelayed(repeat!!, 15_000) }
  }
  private fun requestFocus() {
    if (Build.VERSION.SDK_INT >= 26 && focus != null) return
    val manager = getSystemService(AudioManager::class.java)
    val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
    val gain = if (alarm) AudioManager.AUDIOFOCUS_GAIN else AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
    val listener = AudioManager.OnAudioFocusChangeListener { change ->
      when (change) {
        AudioManager.AUDIOFOCUS_LOSS -> { stopped = true; stopSelf() }
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> { player?.pause(); focusPaused = true }
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> player?.setVolume(.08f, .08f)
        AudioManager.AUDIOFOCUS_GAIN -> { if (focusPaused) { player?.start(); focusPaused = false }; pending?.let { r -> player?.setVolume(r.optDouble("backgroundVolume", .35).toFloat(), r.optDouble("backgroundVolume", .35).toFloat()) } }
      }
    }
    if (Build.VERSION.SDK_INT >= 26) { focus = AudioFocusRequest.Builder(gain).setAudioAttributes(attrs).setOnAudioFocusChangeListener(listener).build(); manager.requestAudioFocus(focus!!) }
    else @Suppress("DEPRECATION") manager.requestAudioFocus(listener, AudioManager.STREAM_ALARM, gain)
  }
  private fun stopAudioOnly() { listOf(fade, intro, repeat).forEach { if (it != null) handler.removeCallbacks(it) }; fade = null; intro = null; repeat = null; player?.runCatching { stop(); release() }; player = null; tts?.stop() }
  private fun stopPlayback() { stopped = true; stopAudioOnly(); tts?.shutdown(); tts = null; if (Build.VERSION.SDK_INT >= 26) focus?.let { getSystemService(AudioManager::class.java).abandonAudioFocusRequest(it) }; focus = null; stopForeground(STOP_FOREGROUND_REMOVE); pending?.optString("id")?.let { AlarmNotifications.cancel(this, it) }; getSharedPreferences("alarm_companion_native_v1", MODE_PRIVATE).edit().remove("activeRoutine").remove("activeAlarm").apply() }
  override fun onDestroy() { stopPlayback(); current = null; super.onDestroy() }
  override fun onBind(intent: Intent?): IBinder? = null
}
