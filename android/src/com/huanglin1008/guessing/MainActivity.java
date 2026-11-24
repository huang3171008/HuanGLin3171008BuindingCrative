package com.huanglin1008.guessing;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import android.webkit.WebChromeClient;
import android.webkit.JsResult;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String DEFAULT_SERVER = "https://punch-pals-rps-2026.eternalknot8.chatgpt.site";
    private WebView web;
    private View nativeBar;
    private View errorView;
    private SharedPreferences prefs;
    private String server;
    private final LanBridge lanBridge = new LanBridge();
    private AudioBridge audioBridge;
    private final ClipboardBridge clipboardBridge = new ClipboardBridge();
    private final ServerBridge serverBridge = new ServerBridge();
    private volatile boolean localMode = true;
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        audioBridge = new AudioBridge(this);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        int ui = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (android.os.Build.VERSION.SDK_INT >= 26) ui |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(ui);
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            android.view.WindowManager.LayoutParams attrs=getWindow().getAttributes();
            attrs.layoutInDisplayCutoutMode=android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attrs);
        }
        prefs = getSharedPreferences("guessing", MODE_PRIVATE);
        server = prefs.getString("server", DEFAULT_SERVER);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(248, 196, 209));
        LinearLayout bar = new LinearLayout(this);
        nativeBar = bar;
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), dp(28), dp(8), dp(3));
        TextView title = new TextView(this);
        title.setText("✊ 猜拳小擂台");
        title.setTextColor(Color.rgb(57, 42, 77));
        title.setTextSize(17);
        title.setTypeface(null, 1);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        title.setGravity(Gravity.CENTER_VERTICAL);
        Button home = new Button(this);
        home.setText("首页"); home.setAllCaps(false);
        home.setOnClickListener(v -> openHome());
        bar.addView(home);
        Button settings = new Button(this);
        settings.setText("模式"); settings.setAllCaps(false);
        settings.setOnClickListener(v -> showModeDialog());
        bar.addView(settings);
        root.addView(bar);
        FrameLayout content = new FrameLayout(this);
        web = new WebView(this);
        WebSettings options = web.getSettings();
        options.setJavaScriptEnabled(true);
        options.setMediaPlaybackRequiresUserGesture(true);
        options.setDomStorageEnabled(true);
        options.setAllowFileAccess(false);
        options.setAllowContentAccess(false);
        options.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        options.setSupportMultipleWindows(false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定", (d, w) -> result.confirm()).setNegativeButton("取消", (d, w) -> result.cancel()).setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定", (d, w) -> result.confirm()).setOnCancelListener(d -> result.cancel()).show(); return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u=request.getUrl();if (!"https".equalsIgnoreCase(u.getScheme()) || !LOCAL_HOST.equalsIgnoreCase(u.getHost())) return null;
                String path=u.getPath();String asset=null;String mime="text/plain";
                if ("/index.html".equals(path)) {asset="index.html";mime="text/html";}
                else if ("/manifest.webmanifest".equals(path)) {asset="manifest.webmanifest";mime="application/manifest+json";}
                else if ("/service-worker.js".equals(path)) {asset="service-worker.js";mime="application/javascript";}
                else if (path!=null && path.matches("/assets/(engine|p2p|enhance|cloud-client|platform-bridge|shader-bg|ripple-transition|audio-manager|ai-bot|qrcode)\\.js")) {asset=path.substring(1);mime="application/javascript";}
                else if (path!=null && path.matches("/assets/[0-9A-F]+(?:-200D-[0-9A-F]+)*\\.svg")) {asset=path.substring(1);mime="image/svg+xml";}
                else if ("/assets/app-icon.png".equals(path)) {asset=path.substring(1);mime="image/png";}
                else if (path!=null && path.matches("/assets/enhance\\.css")) {asset=path.substring(1);mime="text/css";}
                else if (path!=null && path.matches("/assets/themes/(clouds|marble)\\.jpg")) {asset=path.substring(1);mime="image/jpeg";}
                else if (path!=null && path.matches("/assets/music/(overworld|happy-loop|bright-piano|sunny-adventure|pixel-menu)\\.mp3")) {asset=path.substring(1);mime="audio/mpeg";}
                else if (path!=null && path.matches("/assets/sfx/(click|switch|confirm)\\.mp3")) {asset=path.substring(1);mime="audio/mpeg";}
                if(asset!=null) try {return new WebResourceResponse(mime,"UTF-8",getAssets().open(asset));} catch(Exception ignored) {}
                return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) { errorView.setVisibility(View.GONE); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) { if(request.isForMainFrame()) errorView.setVisibility(View.VISIBLE); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return handleLink(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return handleLink(Uri.parse(url)); }
        });
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        errorView = makeErrorView();
        errorView.setVisibility(View.GONE);
        content.addView(errorView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        openHome();
    }

    private View makeErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(28), dp(24), dp(28), dp(24));
        box.setBackgroundColor(Color.rgb(255, 250, 241));
        TextView headline = new TextView(this);
        headline.setText("暂时无法连接服务器"); headline.setTextSize(21); headline.setTypeface(null, 1);
        headline.setTextColor(Color.rgb(57, 42, 77)); headline.setGravity(Gravity.CENTER);
        box.addView(headline);
        TextView detail = new TextView(this);
        detail.setText("双人房间需要连接同一个可访问的游戏服务器。\n如果你在中国大陆，请先配置可用的服务器地址。");
        detail.setTextSize(15); detail.setTextColor(Color.rgb(110, 90, 118)); detail.setGravity(Gravity.CENTER); detail.setPadding(0,dp(14),0,dp(18));
        box.addView(detail);
        Button retry = new Button(this); retry.setText("重新连接"); retry.setOnClickListener(v -> openHome()); box.addView(retry);
        Button edit = new Button(this); edit.setText("设置服务器地址"); edit.setOnClickListener(v -> showModeDialog()); box.addView(edit);
        return box;
    }
    private void openHome() { openLocal(); }
    public final class HapticsBridge {
        @JavascriptInterface public void tap() { if (localMode) runOnUiThread(() -> web.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)); }
    }
    public final class ClipboardBridge {
        @JavascriptInterface public boolean copy(String value) {
            if (!localMode || value == null || value.isEmpty() || value.length() > 20000) return false;
            try {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) return false;
                clipboard.setPrimaryClip(ClipData.newPlainText("猜拳连接信息", value));
                return true;
            } catch (RuntimeException ignored) { return false; }
        }
    }
    public final class ServerBridge {
        @JavascriptInterface public String open(String raw) {
            if (!localMode || raw == null) return "error";
            Uri u = Uri.parse(raw);
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost()==null || u.getUserInfo()!=null || u.getQuery()!=null || u.getFragment()!=null || (u.getPath()!=null && !u.getPath().isEmpty() && !"/".equals(u.getPath()))) return "error";
            final String next="https://"+u.getHost().toLowerCase(java.util.Locale.ROOT)+(u.getPort()==-1?"":":"+u.getPort());
            runOnUiThread(()->{server=next;prefs.edit().putString("server",server).apply();openServer();});return "ok";
        }
    }
    private void openLocal() { lanBridge.stop();localMode=true;nativeBar.setVisibility(View.GONE);web.stopLoading();web.clearHistory();web.addJavascriptInterface(lanBridge,"LanBridge");web.addJavascriptInterface(audioBridge,"AppAudio");web.addJavascriptInterface(clipboardBridge,"AppClipboard");web.addJavascriptInterface(serverBridge,"ServerMode");web.addJavascriptInterface(new HapticsBridge(),"AppHaptics");errorView.setVisibility(View.GONE);web.loadUrl("https://"+LOCAL_HOST+"/index.html"); }
    private void openServer() { lanBridge.stop();localMode=false;nativeBar.setVisibility(View.VISIBLE);web.stopLoading();audioBridge.stop();web.removeJavascriptInterface("AppAudio");web.removeJavascriptInterface("LanBridge");web.removeJavascriptInterface("AppClipboard");web.removeJavascriptInterface("ServerMode");web.removeJavascriptInterface("AppHaptics");web.clearHistory();errorView.setVisibility(View.GONE);web.loadUrl(server+"/"); }
    private void showModeDialog() { new AlertDialog.Builder(this).setTitle("选择游戏模式").setItems(new String[]{"手机直连（局域网 / 不同网络）","原服务器模式"}, (d,which)->{if(which==0)openLocal();else showServerDialog();}).setNegativeButton("取消",null).show(); }
    private boolean handleLink(Uri uri) {
        if (localMode) { if ("https".equalsIgnoreCase(uri.getScheme()) && LOCAL_HOST.equalsIgnoreCase(uri.getHost())) return false; if ("https".equalsIgnoreCase(uri.getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception ignored) {} } return true; }
        Uri allowed = Uri.parse(server);
        if ("https".equalsIgnoreCase(uri.getScheme()) && allowed.getHost().equalsIgnoreCase(uri.getHost()) && allowed.getPort() == uri.getPort()) return false;
        if ("https".equalsIgnoreCase(uri.getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {} }
        return true;
    }
    private void showServerDialog() {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(22),dp(4),dp(22),0);
        TextView help = new TextView(this);
        help.setText("请输入你自己的 HTTPS 游戏服务器地址。更换地址后钱包可能需要通过原网站的‘钱包迁移’功能导入。两位玩家需使用同一个服务器。\n\n当前默认服务器在中国大陆可能无法访问。");
        help.setTextSize(15); box.addView(help);
        EditText input = new EditText(this);
        input.setSingleLine(true); input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI); input.setText(server); input.setSelectAllOnFocus(true);
        box.addView(input);
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("游戏服务器").setView(box).setNegativeButton("取消", null).setPositiveButton("连接", null).create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String text = input.getText().toString().trim();
            if (!text.contains("://")) text = "https://" + text;
            Uri uri = Uri.parse(text);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isEmpty() || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))) {
                input.setError("请输入 HTTPS 域名，例如 https://example.com"); return;
            }
            String host = uri.getHost().toLowerCase(java.util.Locale.ROOT);
            String next = "https://" + host + (uri.getPort() == -1 ? "" : ":" + uri.getPort());
            if (!next.equals(server)) web.clearHistory();
            server = next; prefs.edit().putString("server", server).apply(); dialog.dismiss(); openServer();
        }));
        dialog.show();
    }
    @Override public void onBackPressed() { if (errorView.getVisibility() == View.VISIBLE) { showModeDialog(); } else if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { lanBridge.stop();audioBridge.stop(); if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}

