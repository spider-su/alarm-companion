package expo.modules.alarmcompanion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackStateTest {
  @Test fun repeatedSessionsInvalidatePreviousCallbacksAndAllowRestart() {
    val state = PlaybackSessionState()
    val first = state.begin()
    assertTrue(state.finish(first))
    val second = state.begin()
    assertFalse(state.isCurrent(first))
    assertTrue(state.isCurrent(second))
    assertFalse(state.finish(first))
    assertTrue(state.finish(second))
  }

  @Test fun ttsInitializationFailureCanRecoverOnANewAttempt() {
    val state = TtsInitializationState()
    val first = state.begin()
    assertTrue(state.complete(first, false))
    assertEquals(TtsInitializationState.Status.FAILED, state.status)
    assertTrue(state.shouldInitialize())
    val retry = state.begin()
    assertFalse(state.complete(first, true))
    assertTrue(state.complete(retry, true))
    assertEquals(TtsInitializationState.Status.READY, state.status)
    assertFalse(state.shouldInitialize())
  }

  @Test fun shutdownInvalidatesTheOldTtsEngineAndAllowsFreshInitialization() {
    val state = TtsInitializationState()
    val oldEngine = state.begin()
    assertTrue(state.complete(oldEngine, true))
    state.invalidate()
    assertTrue(state.shouldInitialize())
    val newEngine = state.begin()
    assertFalse(state.complete(oldEngine, true))
    assertTrue(state.complete(newEngine, true))
  }

  @Test fun failedStartupOnlyClearsItsOwnReservation() {
    assertTrue(reservationMatches("failed", "failed"))
    assertFalse(reservationMatches("replacement", "failed"))
    val previous = PlaybackReservation("previous", 2)
    assertEquals(previous, restoreFailedReservation(PlaybackReservation("failed", 3), "failed", previous))
    assertEquals(PlaybackReservation("replacement", 3), restoreFailedReservation(PlaybackReservation("replacement", 3), "failed", previous))
  }

  @Test fun previewHasABoundedDuration() {
    assertFalse(previewExpired(1_000, 120_999, 120_000))
    assertTrue(previewExpired(1_000, 121_000, 120_000))
  }

  @Test fun dismissingRecordingOrTtsInvalidatesItsLateCompletionCallback() {
    val state = PlaybackSessionState()
    val recording = state.begin()
    assertTrue(state.finish(recording))
    assertFalse(state.isCurrent(recording))
    val tts = state.begin()
    assertTrue(state.finish(tts))
    assertFalse(state.isCurrent(tts))
  }

  @Test fun rapidPreviewStopPreviewKeepsOnlyLatestSessionCurrent() {
    val state = PlaybackSessionState()
    val first = state.begin()
    assertTrue(state.finish(first))
    val second = state.begin()
    assertFalse(state.isCurrent(first))
    assertTrue(state.isCurrent(second))
  }

  @Test fun resourceReleaseRunsEvenWhenStoppingAnAlreadyStoppedPlayerFails() {
    var released = false
    releasePlaybackResource({ error("already stopped") }, { released = true })
    assertTrue(released)
  }
}
