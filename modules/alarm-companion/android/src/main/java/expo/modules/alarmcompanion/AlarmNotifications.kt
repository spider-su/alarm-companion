package expo.modules.alarmcompanion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

object AlarmNotifications {
  const val ALARM_CHANNEL = "alarm_companion_alarms"
  const val PLAYBACK_CHANNEL = "alarm_companion_playback"
  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT >= 26) {
      val manager = context.getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(NotificationChannel(ALARM_CHANNEL, "Alarms and reminders", NotificationManager.IMPORTANCE_HIGH).apply { description = "Scheduled alarms and reminders"; setSound(null, null) })
      manager.createNotificationChannel(NotificationChannel(PLAYBACK_CHANNEL, "Active alarm playback", NotificationManager.IMPORTANCE_LOW).apply { setSound(null, null); setShowBadge(false) })
    }
  }
  fun foreground(context: Context, routine: JSONObject, alarm: Boolean, fullScreen: Boolean): Notification {
    ensureChannels(context)
    val id = routine.optString("id")
    val activity = PendingIntent.getActivity(context, id.hashCode(), Intent(context, AlarmActivity::class.java).putExtra("id", id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = notificationBuilder(context, if (alarm) ALARM_CHANNEL else PLAYBACK_CHANNEL)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(routine.optString("name")).setContentText(if (routine.optBoolean("recordingUnavailable")) "Voice recording unavailable · ${routine.optString("time")}" else if (alarm) "Wake-up alarm · ${routine.optString("time")}" else "${routine.optString("type", "reminder").replaceFirstChar { it.uppercase() }} · ${routine.optString("time")}")
      .setCategory(if (alarm) Notification.CATEGORY_ALARM else Notification.CATEGORY_REMINDER).setOngoing(alarm).setContentIntent(activity).setVisibility(Notification.VISIBILITY_PUBLIC)
    if (alarm) {
      builder.addAction(android.R.drawable.ic_media_pause, "Snooze", action(context, id, true))
      builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", action(context, id, false))
      if (fullScreen) builder.setFullScreenIntent(activity, true)
    }
    return builder.build()
  }
  fun postReminder(context: Context, routine: JSONObject) {
    ensureChannels(context)
    val open = PendingIntent.getActivity(context, routine.optString("id").hashCode(), Intent(context, AlarmActivity::class.java).putExtra("id", routine.optString("id")), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val variants = routine.optJSONArray("messageVariants")
    val text = variants?.optJSONObject(if (variants.length() > 0) (Math.random() * variants.length()).toInt() else 0)?.optString("text")?.takeIf { it.isNotBlank() } ?: routine.optString("message", "Your reminder is due.")
    val type = routine.optString("type", "reminder").replaceFirstChar { it.uppercase() }
    val notification = notificationBuilder(context, ALARM_CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(routine.optString("name")).setContentText("$type · ${routine.optString("time")}: $text").setContentIntent(open).setAutoCancel(true)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", action(context, routine.optString("id"), false)).build()
    context.getSystemService(NotificationManager::class.java).notify(routine.optString("id").hashCode(), notification)
  }
  fun postAlarmFallback(context: Context, routine: JSONObject) {
    ensureChannels(context)
    val id = routine.optString("id")
    val activity = PendingIntent.getActivity(context, id.hashCode(), Intent(context, AlarmActivity::class.java).putExtra("id", id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = notificationBuilder(context, ALARM_CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(routine.optString("name")).setContentText("Alarm time · exact alarm access is off")
      .setCategory(Notification.CATEGORY_ALARM).setOngoing(true).setContentIntent(activity).setVisibility(Notification.VISIBILITY_PUBLIC)
    builder.addAction(android.R.drawable.ic_media_pause, "Snooze", action(context, id, true))
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", action(context, id, false))
    if (Build.VERSION.SDK_INT < 34 || context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()) builder.setFullScreenIntent(activity, true)
    context.getSystemService(NotificationManager::class.java).notify(id.hashCode(), builder.build())
  }
  fun postAlarmWaiting(context: Context, routine: JSONObject) {
    ensureChannels(context)
    val id = routine.optString("id")
    val activity = PendingIntent.getActivity(context, id.hashCode(), Intent(context, AlarmActivity::class.java).putExtra("id", id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = notificationBuilder(context, ALARM_CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(routine.optString("name", "Alarm")).setContentText("Another alarm is active. Tap here after dismissing it to start this alarm.").setCategory(Notification.CATEGORY_ALARM).setOngoing(true).setContentIntent(activity).setVisibility(Notification.VISIBILITY_PUBLIC)
    builder.addAction(android.R.drawable.ic_media_pause, "Snooze", action(context, id, true))
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", action(context, id, false))
    context.getSystemService(NotificationManager::class.java).notify(id.hashCode(), builder.build())
  }
  fun cancel(context: Context, id: String) = context.getSystemService(NotificationManager::class.java).cancel(id.hashCode())
  private fun notificationBuilder(context: Context, channel: String): Notification.Builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, channel) else Notification.Builder(context)
  private fun action(context: Context, id: String, snooze: Boolean): PendingIntent {
    val intent = Intent(context, AlarmActionReceiver::class.java).setAction("${context.packageName}.${if (snooze) "SNOOZE" else "DISMISS"}").putExtra("id", id)
    return PendingIntent.getBroadcast(context, id.hashCode() + if (snooze) 1 else 2, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
