package expo.modules.alarmcompanion

internal class PlaybackSessionState {
  private var nextGeneration = 0L
  private var activeGeneration: Long? = null

  fun begin(): Long = (++nextGeneration).also { activeGeneration = it }
  fun isCurrent(generation: Long): Boolean = activeGeneration == generation
  fun finish(generation: Long): Boolean {
    if (!isCurrent(generation)) return false
    activeGeneration = null
    return true
  }
  fun current(): Long? = activeGeneration
}

internal class TtsInitializationState {
  enum class Status { IDLE, INITIALIZING, READY, FAILED }
  private var generation = 0L
  var status: Status = Status.IDLE
    private set

  fun shouldInitialize(): Boolean = status == Status.IDLE || status == Status.FAILED
  fun begin(): Long { status = Status.INITIALIZING; return ++generation }
  fun complete(attempt: Long, success: Boolean): Boolean {
    if (attempt != generation || status != Status.INITIALIZING) return false
    status = if (success) Status.READY else Status.FAILED
    return true
  }
  fun invalidate() { generation++; status = Status.IDLE }
}

internal fun reservationMatches(active: String?, expected: String): Boolean = active == expected
internal data class PlaybackReservation(val token: String, val priority: Int)
internal fun restoreFailedReservation(current: PlaybackReservation?, failedToken: String, previous: PlaybackReservation?): PlaybackReservation? =
  if (current?.token == failedToken) previous else current
internal fun previewExpired(startedAtMs: Long, nowMs: Long, maxDurationMs: Long): Boolean = nowMs - startedAtMs >= maxDurationMs
internal fun releasePlaybackResource(stop: () -> Unit, release: () -> Unit) {
  runCatching(stop)
  runCatching(release)
}
