package expo.modules.alarmcompanion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra("id") ?: return
    NativeAlarmScheduler.fire(context, id, intent.getStringExtra("kind") ?: "regular")
  }
}

class AlarmSystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) { NativeAlarmScheduler.recover(context) }
}

class AlarmActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra("id") ?: return
    if (intent.action == "${context.packageName}.SNOOZE") NativeAlarmScheduler.snooze(context, id)
    else NativeAlarmScheduler.dismiss(context, id)
  }
}
