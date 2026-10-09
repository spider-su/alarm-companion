package expo.modules.alarmcompanion

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlarmActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    val id = intent.getStringExtra("id") ?: ""
    val prefs = getSharedPreferences("alarm_companion_native_v1", MODE_PRIVATE)
    val r = runCatching { JSONObject(prefs.getString("routines", "{}") ?: "{}").optJSONObject(id) }.getOrNull()
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(32, 32, 32, 32); setBackgroundColor(0xFF17392F.toInt()) }
    fun label(text: String, size: Float) { layout.addView(TextView(this).apply { this.text = text; textSize = size; setTextColor(-1); gravity = Gravity.CENTER; setPadding(0, 12, 0, 12) }) }
    label(SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()), 60f)
    label(r?.optString("name", "Alarm") ?: "Alarm", 25f)
    label("${r?.optString("sound", "none") ?: "none"} · ${r?.optString("message", "") ?: ""}", 16f)
    if (r?.optString("type") == "alarm") {
      layout.addView(Button(this).apply { text = "Dismiss"; setOnClickListener { NativeAlarmScheduler.dismiss(this@AlarmActivity, id); finish() } })
      layout.addView(Button(this).apply { text = "Snooze · ${r.optInt("snoozeMinutes", 9)} min"; setOnClickListener { NativeAlarmScheduler.snooze(this@AlarmActivity, id); finish() } })
    } else layout.addView(Button(this).apply { text = "Done"; setOnClickListener { finish() } })
    setContentView(layout)
  }
}
