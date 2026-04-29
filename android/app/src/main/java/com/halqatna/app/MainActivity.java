package com.halqatna.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_NOTIFICATIONS = 4001;
    private static final int REQUEST_LOCATION = 4002;

    private WebView webView;
    private ProgressBar progressBar;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private SensorManager sensorManager;
    private Sensor headingSensor;
    private SensorEventListener headingListener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        progressBar = findViewById(R.id.progressBar);
        webView = findViewById(R.id.webView);
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.addJavascriptInterface(new HalaqatnaJsBridge(), "HalaqatnaBridge");
        webView.setWebViewClient(new WebViewClientCompat() {
            @Nullable
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(ProgressBar.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(ProgressBar.GONE);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                    return;
                }

                pendingGeoOrigin = origin;
                pendingGeoCallback = callback;
                ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                        REQUEST_LOCATION
                );
            }
        });

        PrayerNotificationScheduler.ensureChannel(this);
        setupBackHandling();
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    private void setupBackHandling() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView == null) {
                    finish();
                    return;
                }

                webView.evaluateJavascript(
                        "(() => window.handleAndroidBackRequest ? window.handleAndroidBackRequest() : 'exit')();",
                        value -> {
                            String result = value == null ? "" : value.replace("\"", "");
                            if ("exit".equals(result)) {
                                finish();
                            }
                        }
                );
            }
        });
    }

    private void sendPermissionResult(String type, String status) {
        String script = "window.HalaqatnaNative && window.HalaqatnaNative.onPermissionResult("
                + quote(type) + ", " + quote(status) + ");";
        runJavascript(script);
    }

    private void sendHeadingUpdate(float degrees) {
        runJavascript("window.HalaqatnaNative && window.HalaqatnaNative.onHeadingUpdate(" + degrees + ");");
    }

    private void runJavascript(String script) {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript(script, null);
            }
        });
    }

    private String quote(String raw) {
        return "\"" + raw.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private boolean startHeadingSensor() {
        if (sensorManager == null) {
            return false;
        }

        headingSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (headingSensor == null) {
            headingSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        }
        if (headingSensor == null) {
            return false;
        }

        stopHeadingSensor();
        headingListener = new SensorEventListener() {
            private long lastSentAt = 0L;

            @Override
            public void onSensorChanged(SensorEvent event) {
                float[] rotationMatrix = new float[9];
                SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
                float[] orientation = new float[3];
                SensorManager.getOrientation(rotationMatrix, orientation);
                float azimuth = (float) Math.toDegrees(orientation[0]);
                if (azimuth < 0) {
                    azimuth += 360f;
                }

                long now = System.currentTimeMillis();
                if (now - lastSentAt > 120) {
                    lastSentAt = now;
                    sendHeadingUpdate(azimuth);
                }
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
            }
        };

        sensorManager.registerListener(headingListener, headingSensor, SensorManager.SENSOR_DELAY_UI);
        return true;
    }

    private void stopHeadingSensor() {
        if (sensorManager != null && headingListener != null) {
            sensorManager.unregisterListener(headingListener);
        }
        headingListener = null;
        headingSensor = null;
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
        stopHeadingSensor();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        stopHeadingSensor();
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (requestCode == REQUEST_NOTIFICATIONS) {
            sendPermissionResult("notifications", granted ? "granted" : "denied");
            return;
        }

        if (requestCode == REQUEST_LOCATION) {
            sendPermissionResult("location", granted ? "granted" : "denied");
            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            }
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    private final class HalaqatnaJsBridge {

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public void showNativeToast(String message) {
            mainHandler.post(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED) {
                    sendPermissionResult("notifications", "granted");
                    return;
                }
                ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_NOTIFICATIONS
                );
                return;
            }

            sendPermissionResult("notifications", "granted");
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                sendPermissionResult("location", "granted");
                return;
            }

            ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    REQUEST_LOCATION
            );
        }

        @JavascriptInterface
        public void schedulePrayerNotifications(String scheduleJson) {
            new Thread(() -> {
                try {
                    PrayerNotificationScheduler.scheduleFromPayload(MainActivity.this, scheduleJson);
                    sendPermissionResult("notifications", "granted");
                } catch (Exception ignored) {
                }
            }).start();
        }

        @JavascriptInterface
        public void cancelPrayerNotifications() {
            PrayerNotificationScheduler.cancelAll(MainActivity.this);
        }

        @JavascriptInterface
        public boolean startCompass() {
            return startHeadingSensor();
        }

        @JavascriptInterface
        public void stopCompass() {
            stopHeadingSensor();
        }
    }
}
