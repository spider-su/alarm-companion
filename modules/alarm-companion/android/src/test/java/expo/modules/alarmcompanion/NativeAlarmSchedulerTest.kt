package expo.modules.alarmcompanion

import java.util.Calendar
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class NativeAlarmSchedulerTest {
  @Test fun dailyKeepsLocalWallClockAfterSpringDstChange() {
    val zone = TimeZone.getTimeZone("Europe/Warsaw")
    val now = Calendar.getInstance(zone).apply { set(2026, Calendar.MARCH, 28, 23, 45, 0) }.timeInMillis
    val next = NativeAlarmScheduler.nextOccurrence("03:30", "daily", emptySet(), now, zone)
    val result = Calendar.getInstance(zone).apply { timeInMillis = next }
    assertEquals(29, result.get(Calendar.DAY_OF_MONTH))
    assertEquals(3, result.get(Calendar.HOUR_OF_DAY))
    assertEquals(30, result.get(Calendar.MINUTE))
  }

  @Test fun weekdayScheduleSkipsWeekend() {
    val zone = TimeZone.getTimeZone("UTC")
    val now = Calendar.getInstance(zone).apply { set(2026, Calendar.OCTOBER, 9, 18, 0, 0) }.timeInMillis
    val next = Calendar.getInstance(zone).apply { timeInMillis = NativeAlarmScheduler.nextOccurrence("07:00", "weekdays", emptySet(), now, zone) }
    assertEquals(12, next.get(Calendar.DAY_OF_MONTH))
  }

  @Test fun customScheduleHonorsSelectedWeekday() {
    val zone = TimeZone.getTimeZone("UTC")
    val now = Calendar.getInstance(zone).apply { set(2026, Calendar.OCTOBER, 9, 6, 0, 0) }.timeInMillis
    val next = Calendar.getInstance(zone).apply { timeInMillis = NativeAlarmScheduler.nextOccurrence("07:00", "custom", setOf(Calendar.SUNDAY - 1), now, zone) }
    assertEquals(Calendar.SUNDAY, next.get(Calendar.DAY_OF_WEEK))
    assertEquals(11, next.get(Calendar.DAY_OF_MONTH))
  }

  @Test fun rejectsCustomScheduleWithNoDays() {
    assertThrows(IllegalArgumentException::class.java) { NativeAlarmScheduler.nextOccurrence("07:00", "custom", emptySet(), 0L, TimeZone.getTimeZone("UTC")) }
  }

  @Test fun recalculatesLocalTimeAfterTimeZoneChange() {
    val now = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { set(2026, Calendar.OCTOBER, 10, 4, 0, 0) }.timeInMillis
    val utc = NativeAlarmScheduler.nextOccurrence("07:00", "daily", emptySet(), now, TimeZone.getTimeZone("UTC"))
    val warsaw = NativeAlarmScheduler.nextOccurrence("07:00", "daily", emptySet(), now, TimeZone.getTimeZone("Europe/Warsaw"))
    assertEquals(2 * 60 * 60 * 1000L, utc - warsaw)
  }
}
