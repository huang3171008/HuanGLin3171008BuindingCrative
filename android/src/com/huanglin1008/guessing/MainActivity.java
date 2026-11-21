package com.huanglin1008.guessing;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
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
    private View errorView;
    private SharedPreferences prefs;
    private String server;
    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(57, 42, 77));
        getWindow().setNavigationBarColor(Color.rgb(57, 42, 77));
        prefs = getSharedPreferences("guessing", MODE_PRIVATE);
        server = prefs.getString("server", DEFAULT_SERVER);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(248, 196, 209));
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), dp(3), dp(8), dp(3));
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
        settings.setText("服务器"); settings.setAllCaps(false);
        settings.setOnClickListener(v -> showServerDialog());
        bar.addView(settings);
        root.addView(bar);
        FrameLayout content = new FrameLayout(this);
        web = new WebView(this);
        WebSettings options = web.getSettings();
        options.setJavaScriptEnabled(true);
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
        Button edit = new Button(this); edit.setText("设置服务器地址"); edit.setOnClickListener(v -> showServerDialog()); box.addView(edit);
        return box;
    }
    private void openHome() { errorView.setVisibility(View.GONE); web.loadUrl(server + "/"); }
    private boolean handleLink(Uri uri) {
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
            server = next; prefs.edit().putString("server", server).apply(); dialog.dismiss(); openHome();
        }));
        dialog.show();
    }
    @Override public void onBackPressed() { if (errorView.getVisibility() == View.VISIBLE) { showServerDialog(); } else if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}

