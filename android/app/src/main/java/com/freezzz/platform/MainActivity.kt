package com.freezzz.platform

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Android target shell.
 *
 * Android-specific UI/lifecycle stays inside the Android target. The shared
 * platform runtime remains target-neutral and is reached through adapters.
 */
class MainActivity : Activity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        status = TextView(this).apply {
            textSize = 16f
            text = "FREEzzz Platform\nAndroid host: created"
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
        }
        root.addView(TextView(this).apply {
            text = "FREEzzz Platform"
            textSize = 28f
        })
        root.addView(status)
        setContentView(root)
        setHostStatus("ready")
    }

    override fun onStart() {
        super.onStart()
        setHostStatus("running")
    }

    override fun onStop() {
        setHostStatus("stopped")
        super.onStop()
    }

    private fun setHostStatus(value: String) {
        if (::status.isInitialized) {
            status.text = "FREEzzz Platform\nAndroid host: $value"
        }
    }
}
