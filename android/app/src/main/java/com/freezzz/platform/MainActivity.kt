package com.freezzz.platform

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
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
    private var pageLoaded = false
    private var loadStarted = false

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
        createWebView()
    }

    private fun enterImmersiveMode() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
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

    private fun createWebView() {
        webView?.let {
            container.removeView(it)
            it.stopLoading()
            it.removeAllViews()
            it.destroy()
        }

        pageLoaded = false
        loadStarted = false

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val view = WebView(this)
        webView = view

        with(view) {
            setBackgroundColor(Color.rgb(8, 10, 15))

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                if (android.os.Build.VERSION.SDK_INT >= 26) safeBrowsingEnabled = true
            }

            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    return assetLoader.shouldInterceptRequest(request.url)
                }

                override fun onPageFinished(view: WebView, url: String) {
                    pageLoaded = true
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

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                    android.util.Log.d(
                        LOG_TAG,
                        "${message.message()} @ ${message.sourceId()}:${message.lineNumber()}"
                    )
                    return true
                }
            }
        }

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
                view.loadUrl(START_URL)
            }
        }
    }

    private fun showRendererRecovery() {
        webView?.let {
            container.removeView(it)
            it.stopLoading()
            it.removeAllViews()
            it.destroy()
            webView = null
        }

        val message = TextView(this).apply {
            text = "FREEzzz Platform\n\nWebView остановился.\nНажмите здесь для повторного запуска."
            setTextColor(Color.WHITE)
            textSize = 18f
            gravity = android.view.Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(8, 10, 15))
            setOnClickListener {
                container.removeAllViews()
                createWebView()
            }
        }

        container.removeAllViews()
        container.addView(
            message,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
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
        webView?.let {
            it.stopLoading()
            it.clearHistory()
            it.removeAllViews()
            container.removeView(it)
            it.destroy()
        }
        webView = null
        super.onDestroy()
    }

    @Deprecated("Deprecated in Android API 33; retained for minSdk compatibility.")
    override fun onBackPressed() {
        val view = webView
        if (view != null && view.canGoBack()) view.goBack() else super.onBackPressed()
    }
}
