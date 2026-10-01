package com.freezzz.platform;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "freezzz.local";
    private static final int FILE_REQUEST = 4101;
    private ValueCallback<Uri[]> fileCallback;
    private static final String LOCAL_SCHEME = "https";
    private WebView webView;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Keep the local runtime away from file:// origins.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            settings.setSafeBrowsingEnabled(true);
        }

        webView.setWebViewClient(new LocalAssetWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
            ) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);

                try {
                    startActivityForResult(intent, FILE_REQUEST);
                } catch (Exception error) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    android.util.Log.e("FREEzzzWeb", "Cannot open document picker", error);
                    return false;
                }
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                android.util.Log.d(
                    "FREEzzzWeb",
                    message.message() + " @ " + message.sourceId() + ":" + message.lineNumber()
                );
                return true;
            }
        });

        setContentView(webView);

        if (state == null) {
            webView.loadUrl(LOCAL_SCHEME + "://" + LOCAL_HOST + "/index.html");
        } else {
            webView.restoreState(state);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQUEST || fileCallback == null) return;

        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                result = new Uri[] { uri };
                try {
                    getContentResolver().takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    );
                } catch (Exception ignored) {
                    // Some document providers do not expose persistable permissions.
                }
            }
        }

        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onStop() {
        if (webView != null) webView.onPause();
        super.onStop();
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private static final class LocalAssetWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serveLocalAsset(view, request.getUrl().getScheme(), request.getUrl().getHost(), request.getUrl().getPath());
        }

        @Override
        @SuppressWarnings("deprecation")
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            android.net.Uri uri = android.net.Uri.parse(url);
            return serveLocalAsset(view, uri.getScheme(), uri.getHost(), uri.getPath());
        }

        private WebResourceResponse serveLocalAsset(WebView view, String scheme, String host, String path) {
            if (!LOCAL_SCHEME.equalsIgnoreCase(scheme) || !LOCAL_HOST.equalsIgnoreCase(host)) {
                return null;
            }

            String assetPath = path == null ? "index.html" : path.replaceFirst("^/+", "");
            if (assetPath.isEmpty()) assetPath = "index.html";

            try {
                byte[] bytes;
                try (java.io.InputStream input = view.getContext().getAssets().open(assetPath);
                     ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                    }
                    bytes = output.toByteArray();
                }

                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-cache");
                headers.put("Access-Control-Allow-Origin", "https://" + LOCAL_HOST);

                return new WebResourceResponse(
                    mimeType(assetPath),
                    "UTF-8",
                    200,
                    "OK",
                    headers,
                    new ByteArrayInputStream(bytes)
                );
            } catch (IOException error) {
                android.util.Log.e("FREEzzzWeb", "Local asset not found: " + assetPath, error);
                byte[] body = ("Not Found: " + assetPath).getBytes(StandardCharsets.UTF_8);
                return new WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    404,
                    "Not Found",
                    new HashMap<>(),
                    new ByteArrayInputStream(body)
                );
            }
        }

        private static String mimeType(String path) {
            String lower = path.toLowerCase(java.util.Locale.ROOT);
            if (lower.endsWith(".html")) return "text/html";
            if (lower.endsWith(".js")) return "text/javascript";
            if (lower.endsWith(".css")) return "text/css";
            if (lower.endsWith(".json")) return "application/json";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".woff")) return "font/woff";
            if (lower.endsWith(".wasm")) return "application/wasm";
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            return "application/octet-stream";
        }
    }
}
