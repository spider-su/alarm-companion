package expo.modules.alarmcompanion

import org.junit.Assert.assertEquals
import org.junit.Test

class SleepTimerPolicyTest {
  @Test fun durationIsBounded() {
    assertEquals(1, SleepTimerPolicy.delayMinutes(0))
    assertEquals(60, SleepTimerPolicy.delayMinutes(60))
    assertEquals(180, SleepTimerPolicy.delayMinutes(500))
  }

  @Test fun fadeProgressRunsForThirtySeconds() {
    assertEquals(0f, SleepTimerPolicy.fadeProgress(0), 0.001f)
    assertEquals(0.5f, SleepTimerPolicy.fadeProgress(15_000), 0.001f)
    assertEquals(1f, SleepTimerPolicy.fadeProgress(40_000), 0.001f)
  }
}
