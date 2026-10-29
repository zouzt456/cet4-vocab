package com.zou.cet4vocab;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView web;
    private boolean dark = false;

    private static final int BG_DARK = 0xFF14161A;
    private static final int BG_LIGHT = 0xFFFFFFFF;

    /* 网页里切夜间模式时回调这里，把系统状态栏/导航栏一起变深 */
    public class ThemeBridge {
        @JavascriptInterface
        public void setDark(final boolean d) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { applyTheme(d); }
            });
        }
    }

    private void applyTheme(boolean d) {
        dark = d;
        int bg = d ? BG_DARK : BG_LIGHT;
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        if (web != null) web.setBackgroundColor(bg);
        int flags = getWindow().getDecorView().getSystemUiVisibility();
        if (d) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        else flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (d) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            else flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG_LIGHT);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        web.setBackgroundColor(BG_LIGHT);
        web.addJavascriptInterface(new ThemeBridge(), "AndroidTheme");
        web.setWebViewClient(new WebViewClient());
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
