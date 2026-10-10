package expo.modules.alarmcompanion

internal object SleepTimerPolicy {
  const val FADE_OUT_MS = 30_000L
  fun delayMinutes(value: Int): Int = value.coerceIn(1, 180)
  fun fadeProgress(elapsedMs: Long): Float = (elapsedMs.toFloat() / FADE_OUT_MS).coerceIn(0f, 1f)
}
