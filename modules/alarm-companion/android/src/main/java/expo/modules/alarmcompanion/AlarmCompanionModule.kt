package expo.modules.alarmcompanion

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmCompanionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmCompanion")
    AsyncFunction("syncRoutines") { json: String ->
      NativeAlarmScheduler.sync(appContext.reactContext ?: return@AsyncFunction mapOf("error" to "No context"), json)
    }
    AsyncFunction("getCapabilities") { NativeAlarmScheduler.capabilities(appContext.reactContext) }
    AsyncFunction("openExactAlarmSettings") { openSettings(if (android.os.Build.VERSION.SDK_INT >= 31) Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM else Settings.ACTION_APPLICATION_DETAILS_SETTINGS) }
    AsyncFunction("openFullScreenSettings") { openSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT) }
    AsyncFunction("previewRoutine") { json: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      AlarmNotifications.ensureChannels(context)
      AlarmPlaybackService.start(context, org.json.JSONObject(json), false, true)
    }
    AsyncFunction("stopPlayback") { AlarmPlaybackService.stop(appContext.reactContext) }
    AsyncFunction("dismissAlarm") { id: String -> NativeAlarmScheduler.dismiss(appContext.reactContext, id) }
    AsyncFunction("snoozeAlarm") { id: String -> NativeAlarmScheduler.snooze(appContext.reactContext, id) }
    AsyncFunction("consumeCompletedRoutineIds") { NativeAlarmScheduler.consumeCompleted(appContext.reactContext) }
  }

  private fun openSettings(action: String) {
    val context = appContext.reactContext ?: return
    val intent = Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }
}
