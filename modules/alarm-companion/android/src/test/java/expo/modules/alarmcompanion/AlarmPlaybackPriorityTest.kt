package expo.modules.alarmcompanion

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmPlaybackPriorityTest {
  @Test fun alarmBlocksRemindersAndPreview() {
    assertFalse(AlarmPlaybackService.shouldReplace(3, 2))
    assertFalse(AlarmPlaybackService.shouldReplace(3, 1))
    assertFalse(AlarmPlaybackService.shouldReplace(3, 0))
  }

  @Test fun alarmCanReplaceLowerPriorityPlayback() {
    assertTrue(AlarmPlaybackService.shouldReplace(0, 3))
    assertTrue(AlarmPlaybackService.shouldReplace(1, 3))
    assertTrue(AlarmPlaybackService.shouldReplace(2, 3))
  }

  @Test fun equalPriorityDoesNotInterruptActivePlayback() {
    assertFalse(AlarmPlaybackService.shouldReplace(3, 3))
    assertFalse(AlarmPlaybackService.shouldReplace(2, 2))
  }
}
