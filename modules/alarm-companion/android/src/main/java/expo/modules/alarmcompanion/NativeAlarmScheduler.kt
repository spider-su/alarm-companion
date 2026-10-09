package expo.modules.alarmcompanion

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone

object NativeAlarmScheduler {
  private const val PREFS = "alarm_companion_native_v1"
  private const val ROUTINES = "routines"
  private const val COMPLETED = "completed"
  private const val SNOOZES = "snoozes"
  data class Routine(val id: String, val name: String, val type: String, val time: String, val repeat: String, val days: Set<Int>, val enabled: Boolean, val reminderBehavior: String, val source: JSONObject)

  fun sync(context: Context, json: String): Map<String, Any> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val old = runCatching { JSONObject(prefs.getString(ROUTINES, "{}") ?: "{}") }.getOrDefault(JSONObject())
    val completed = prefs.getStringSet(COMPLETED, emptySet()).orEmpty().toMutableSet()
    val parsed = JSONArray(json)
    val next = JSONObject()
    val alarm = context.getSystemService(AlarmManager::class.java)
    for (i in 0 until parsed.length()) {
      val value = parsed.getJSONObject(i)
      val routine = parse(value)
      val oldValue = old.optJSONObject(routine.id)
      val oldAt = oldValue?.optLong("nextAt", 0L) ?: 0L
      val staleOnce = routine.enabled && routine.repeat == "once" && oldAt > 0 && oldAt <= System.currentTimeMillis() && oldValue?.optBoolean("enabled", false) == true
      val saved = JSONObject(value.toString()).put("enabled", routine.enabled && !staleOnce)
      if (staleOnce) prefs.edit().putStringSet(COMPLETED, prefs.getStringSet(COMPLETED, emptySet()).orEmpty() + routine.id).apply()
      if (old.has(routine.id)) cancel(context, alarm, routine.id, "regular")
      next.put(routine.id, saved)
      if (saved.optBoolean("enabled")) schedule(context, alarm, saved, null, "regular")
      else if (routine.id !in completed || prefs.getLong("snoozeAt:${routine.id}", 0L) <= System.currentTimeMillis()) cancel(context, alarm, routine.id, "snooze")
      completed.remove(routine.id)
    }
    val keys = old.keys()
    while (keys.hasNext()) { val id = keys.next(); if (!next.has(id)) { cancel(context, alarm, id, "regular"); cancel(context, alarm, id, "snooze"); completed.remove(id) } }
    prefs.edit().putString(ROUTINES, next.toString()).apply()
    if (completed.isEmpty()) prefs.edit().remove(COMPLETED).apply() else prefs.edit().putStringSet(COMPLETED, completed).apply()
    return capabilities(context)
  }

  fun capabilities(context: Context?): Map<String, Any> {
    if (context == null) return mapOf("exactAlarms" to false, "fullScreenIntent" to false)
    val manager = context.getSystemService(AlarmManager::class.java)
    val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
    val full = Build.VERSION.SDK_INT < 34 || context.getSystemService(android.app.NotificationManager::class.java).canUseFullScreenIntent()
    return mapOf("exactAlarms" to exact, "fullScreenIntent" to full, "notifications" to (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED))
  }

  fun fire(context: Context, id: String, kind: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val routines = runCatching { JSONObject(prefs.getString(ROUTINES, "{}") ?: "{}") }.getOrDefault(JSONObject())
    val routine = routines.optJSONObject(id) ?: return
    if (kind == "regular" && !routine.optBoolean("enabled")) return
    if (kind == "regular") {
      val expected = routine.optLong("nextAt", 0L)
      if (expected > 0 && System.currentTimeMillis() + 5_000 < expected) return
      if (routine.optString("repeat") == "once") {
        routine.put("enabled", false)
        prefs.edit().putStringSet(COMPLETED, prefs.getStringSet(COMPLETED, emptySet()).orEmpty() + id).apply()
      } else schedule(context, context.getSystemService(AlarmManager::class.java), routine, null, "regular")
      prefs.edit().putString(ROUTINES, routines.toString()).apply()
    } else prefs.edit().remove("snoozeAt:$id").apply()
    val type = routine.optString("type")
    val behavior = routine.optString("reminderBehavior", "notification-only")
    if (type == "alarm" && !capabilities(context)["exactAlarms"].toString().toBoolean()) { AlarmNotifications.postAlarmFallback(context, routine); return }
    if (type != "alarm" && behavior == "notification-only") { AlarmNotifications.postReminder(context, routine); return }
    if (type != "alarm" && !capabilities(context)["exactAlarms"].toString().toBoolean()) { AlarmNotifications.postReminder(context, routine); return }
    AlarmPlaybackService.start(context, routine, type == "alarm")
  }

  fun snooze(context: Context?, id: String) {
    if (context == null) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val routines = runCatching { JSONObject(prefs.getString(ROUTINES, "{}") ?: "{}") }.getOrDefault(JSONObject())
    val routine = routines.optJSONObject(id) ?: return
    val manager = context.getSystemService(AlarmManager::class.java)
    cancel(context, manager, id, "snooze")
    schedule(context, manager, routine, System.currentTimeMillis() + routine.optInt("snoozeMinutes", 9) * 60_000L, "snooze")
    AlarmPlaybackService.stop(context, id)
  }

  fun dismiss(context: Context?, id: String) {
    if (context == null) return
    cancel(context, context.getSystemService(AlarmManager::class.java), id, "snooze")
    AlarmNotifications.cancel(context, id)
    AlarmPlaybackService.stop(context, id)
  }

  fun consumeCompleted(context: Context?): List<String> {
    if (context == null) return emptyList()
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = prefs.getStringSet(COMPLETED, emptySet()).orEmpty().toList()
    return ids
  }

  fun recover(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val routines = runCatching { JSONObject(prefs.getString(ROUTINES, "{}") ?: "{}") }.getOrDefault(JSONObject())
    val manager = context.getSystemService(AlarmManager::class.java)
    val keys = routines.keys()
    while (keys.hasNext()) {
      val id = keys.next(); val r = routines.getJSONObject(id)
      if (r.optBoolean("enabled")) {
        if (r.optString("repeat") == "once" && r.optLong("nextAt", 0L) in 1..System.currentTimeMillis()) {
          cancel(context, manager, id, "regular")
          r.put("enabled", false)
          prefs.edit().putStringSet(COMPLETED, prefs.getStringSet(COMPLETED, emptySet()).orEmpty() + id).apply()
        } else schedule(context, manager, r, null, "regular")
      }
      val snooze = prefs.getLong("snoozeAt:$id", 0L)
      if (snooze in 1..System.currentTimeMillis()) cancel(context, manager, id, "snooze")
      else if (snooze > 0) schedule(context, manager, r, snooze, "snooze")
    }
    prefs.edit().putString(ROUTINES, routines.toString()).apply()
  }

  private fun schedule(context: Context, manager: AlarmManager, routine: JSONObject, at: Long?, kind: String) {
    val parsed = parse(routine)
    val whenAt = at ?: nextAt(parsed)
    routine.put("nextAt", whenAt)
    if (kind == "snooze") context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("snoozeAt:${parsed.id}", whenAt).apply()
    val intent = Intent(context, AlarmReceiver::class.java).setAction("${context.packageName}.ALARM_${kind.uppercase()}").putExtra("id", parsed.id).putExtra("kind", kind)
    val pending = PendingIntent.getBroadcast(context, stableId(parsed.id, kind), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    manager.cancel(pending)
    if (kind == "regular" && parsed.type == "alarm" && canExact(manager)) {
      val show = PendingIntent.getActivity(context, 0, Intent(context, AlarmActivity::class.java).putExtra("id", parsed.id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      manager.setAlarmClock(AlarmManager.AlarmClockInfo(whenAt, show), pending)
    } else if (canExact(manager)) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenAt, pending)
    else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenAt, pending)
  }

  private fun nextAt(r: Routine): Long = nextOccurrence(r.time, r.repeat, r.days, System.currentTimeMillis(), TimeZone.getDefault())

  internal fun nextOccurrence(time: String, repeatRule: String, days: Set<Int>, now: Long, zone: TimeZone): Long {
    val (h, m) = time.split(":").mapNotNull { it.toIntOrNull() }.let { (it.getOrNull(0) ?: 7) to (it.getOrNull(1) ?: 0) }
    require(h in 0..23 && m in 0..59) { "Invalid routine time" }
    require(repeatRule != "custom" || days.isNotEmpty()) { "Custom schedule requires a weekday" }
    val c = Calendar.getInstance(zone).apply { timeInMillis = now; set(Calendar.HOUR_OF_DAY, h); set(Calendar.MINUTE, m); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }
    repeat(8) { i ->
      val candidate = (c.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, i) }
      val day = candidate.get(Calendar.DAY_OF_WEEK) - 1
      val allowed = when (repeatRule) { "daily" -> true; "weekdays" -> day in 1..5; "custom" -> day in days; else -> true }
      if (allowed && candidate.timeInMillis > now) return candidate.timeInMillis
    }
    c.add(Calendar.DAY_OF_YEAR, 1); return c.timeInMillis
  }

  private fun canExact(m: AlarmManager) = Build.VERSION.SDK_INT < 31 || m.canScheduleExactAlarms()
  private fun parse(o: JSONObject) = Routine(o.optString("id"), o.optString("name"), o.optString("type", "alarm"), o.optString("time", "07:00"), o.optString("repeat", "once"), o.optJSONArray("days")?.let { a -> (0 until a.length()).map { a.optInt(it) }.toSet() } ?: emptySet(), o.optBoolean("enabled"), o.optString("reminderBehavior", "notification-only"), o)
  private fun stableId(id: String, kind: String) = (id + kind).hashCode()
  private fun cancel(context: Context, manager: AlarmManager, id: String, kind: String) { val intent = Intent(context, AlarmReceiver::class.java).setAction("${context.packageName}.ALARM_${kind.uppercase()}"); PendingIntent.getBroadcast(context, stableId(id, kind), intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)?.let { manager.cancel(it); it.cancel() }; if (kind == "snooze") context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove("snoozeAt:$id").apply() }
}
