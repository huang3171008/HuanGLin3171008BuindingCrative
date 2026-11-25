# Android 客户端

Android 6.0 及以上，局域网玩法需要支持 WebRTC 数据通道的 WebView。**服务器房间**使用服务端生成的 6 位数字房间码；**同一 Wi-Fi / 热点**使用局域网连接码，两种方式的钱包相互独立。不同网络请使用服务器房间。

## 构建

在 Windows 安装 JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0，设置 `JAVA_HOME` 和 `ANDROID_SDK_ROOT`，然后运行：

```powershell
./build.ps1
```

生成的 `out/aligned-unsigned.apk` 必须使用自己的密钥签名才能安装；覆盖旧版需使用相同签名，避免卸载或清除数据。不要提交签名密钥和密码。构建会同步 `shared-web/` 至 Android、Windows 和 iOS。

`node test-cloud-ui.mjs` 和 `node test-peer.mjs` 分别测试本机双浏览器云房间与模拟局域网；不是双真机测试。两台 Android 手机的测试需独立诊断包、USB 授权和真实网络。安装与玩法见 [使用教程](../使用教程.md)。
