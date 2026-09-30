package com.freezzz.platform

import android.app.Activity
import android.os.Bundle
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.io.IOException
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.safeBrowsingEnabled = true
            webViewClient = LocalAssetWebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                    android.util.Log.d(
                        "FREEzzzWeb",
                        "${message.message()} @ ${message.sourceId()}:${message.lineNumber()}"
                    )
                    return true
                }
            }
        }

        setContentView(webView)

        if (savedInstanceState == null) {
            webView.loadUrl("https://freezzz.local/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onStart() {
        super.onStart()
        webView.onResume()
    }

    override fun onStop() {
        webView.onPause()
        super.onStop()
    }

    @Deprecated("Deprecated in Android API 33; retained for minSdk compatibility.")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    private class LocalAssetWebViewClient : WebViewClient() {
        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? {
            val url = request.url
            if (url.scheme != "https" || url.host != "freezzz.local") {
                return super.shouldInterceptRequest(view, request)
            }

            val path = url.path ?: "/index.html"
            val assetPath = path.removePrefix("/").ifBlank { "index.html" }

            return try {
                val bytes = view.context.assets.open("web/$assetPath").use { it.readBytes() }
                WebResourceResponse(
                    mimeType(assetPath),
                    "UTF-8",
                    200,
                    "OK",
                    mapOf("Cache-Control" to "no-cache"),
                    ByteArrayInputStream(bytes)
                )
            } catch (_: IOException) {
                WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    404,
                    "Not Found",
                    emptyMap(),
                    ByteArrayInputStream("Not Found".toByteArray())
                )
            }
        }

        private fun mimeType(path: String): String = when {
            path.endsWith(".html", true) -> "text/html"
            path.endsWith(".js", true) -> "text/javascript"
            path.endsWith(".css", true) -> "text/css"
            path.endsWith(".json", true) -> "application/json"
            path.endsWith(".svg", true) -> "image/svg+xml"
            path.endsWith(".png", true) -> "image/png"
            path.endsWith(".jpg", true) || path.endsWith(".jpeg", true) -> "image/jpeg"
            path.endsWith(".webp", true) -> "image/webp"
            path.endsWith(".woff2", true) -> "font/woff2"
            path.endsWith(".woff", true) -> "font/woff"
            else -> "application/octet-stream"
        }
    }
}
