package com.freezzz.platform

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

class MainActivity : Activity() {
    private lateinit var container: FrameLayout
    private var webView: WebView? = null
    private var loadStarted = false
    private var bootstrapStarted = false

    companion object {
        private const val START_URL = "https://appassets.androidplatform.net/assets/web/index.html"
        private const val LOG_TAG = "FREEzzzWeb"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setStatusBarColor(Color.TRANSPARENT)
        window.setNavigationBarColor(Color.TRANSPARENT)
        enterImmersiveMode()

        container = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(8, 10, 15))
        }
        setContentView(container)

        // Draw a native screen first. This prevents Android's launch splash from
        // remaining visible while the WebView/provider is being initialized.
        showLaunchScreen()
        container.postDelayed({
            if (!isFinishing && !isDestroyed) {
                bootstrapWebView()
            }
        }, 200L)
    }

    private fun enterImmersiveMode() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(
                    WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars()
                )
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    private fun showLaunchScreen() {
        container.removeAllViews()
        val screen = TextView(this).apply {
            text = "FREEzzz Platform"
            setTextColor(Color.WHITE)
            textSize = 22f
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(8, 10, 15))
        }
        container.addView(
            screen,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
    }

    private fun bootstrapWebView() {
        if (bootstrapStarted) return
        bootstrapStarted = true

        try {
            createWebView()
        } catch (t: Throwable) {
            android.util.Log.e(LOG_TAG, "WebView initialization failed", t)
            showFatalRecovery(t)
        }
    }

    private fun createWebView() {
        webView?.let {
            container.removeView(it)
            it.stopLoading()
            it.removeAllViews()
            it.destroy()
        }

        loadStarted = false

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val view = WebView(this)
        webView = view

        view.setBackgroundColor(Color.rgb(8, 10, 15))
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                safeBrowsingEnabled = true
            }
        }

        view.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                view.setBackgroundColor(Color.TRANSPARENT)
                super.onPageFinished(view, url)
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: android.webkit.RenderProcessGoneDetail
            ): Boolean {
                android.util.Log.e(
                    LOG_TAG,
                    "WebView renderer exited; didCrash=${detail.didCrash()}"
                )
                runOnUiThread { showRendererRecovery() }
                return true
            }
        }

        view.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                android.util.Log.d(
                    LOG_TAG,
                    "${message.message()} @ ${message.sourceId()}:${message.lineNumber()}"
                )
                return true
            }
        }

        container.removeAllViews()
        container.addView(
            view,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        view.post {
            if (!isFinishing && !isDestroyed && webView === view && !loadStarted) {
                loadStarted = true
                try {
                    view.loadUrl(START_URL)
                } catch (t: Throwable) {
                    android.util.Log.e(LOG_TAG, "WebView load failed", t)
                    showFatalRecovery(t)
                }
            }
        }
    }

    private fun showRendererRecovery() {
        destroyWebView()
        showRecovery("WebView остановился. Нажмите для повторного запуска.")
    }

    private fun showFatalRecovery(error: Throwable) {
        destroyWebView()
        val detail = error.javaClass.simpleName
        showRecovery("Не удалось запустить WebView.\n\nОшибка: $detail\n\nНажмите для повтора.")
    }

    private fun showRecovery(message: String) {
        container.removeAllViews()
        val screen = TextView(this).apply {
            text = "FREEzzz Platform\n\n$message"
            setTextColor(Color.WHITE)
            textSize = 17f
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(8, 10, 15))
            setOnClickListener {
                bootstrapStarted = false
                showLaunchScreen()
                container.postDelayed({
                    if (!isFinishing && !isDestroyed) bootstrapWebView()
                }, 100L)
            }
        }
        container.addView(
            screen,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
    }

    private fun destroyWebView() {
        webView?.let {
            try {
                it.stopLoading()
                it.clearHistory()
                it.removeAllViews()
                container.removeView(it)
                it.destroy()
            } catch (_: Throwable) {
            }
        }
        webView = null
        loadStarted = false
    }

    override fun onResume() {
        super.onResume()
        enterImmersiveMode()
        webView?.onResume()
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        destroyWebView()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Android API 33; retained for minSdk compatibility.")
    override fun onBackPressed() {
        val view = webView
        if (view != null && view.canGoBack()) {
            view.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
