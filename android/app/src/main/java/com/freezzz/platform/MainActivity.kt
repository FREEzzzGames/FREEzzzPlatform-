package com.freezzz.platform

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
        }
        root.addView(TextView(this).apply {
            text = "FREEzzz Platform"
            textSize = 28f
        })
        root.addView(TextView(this).apply {
            text = "Android host ready"
            textSize = 16f
            setPadding(0, 24, 0, 0)
        })
        setContentView(root)
    }
}
