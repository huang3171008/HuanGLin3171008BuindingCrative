# Android 客户端

应用是一个安卓 WebView 客户端，支持 Android 6.0 及以上。默认地址是原演示站点；可通过顶部“服务器”按钮设置自己部署的 HTTPS 游戏地址。两位玩家必须连接同一台服务器。该客户端不包含服务器本身，也无法自动解决网络不可达问题。

## Windows 构建

安装 JDK 17，以及 Android SDK Platform 35、Build Tools 35.0.0。设置 `JAVA_HOME`、`ANDROID_SDK_ROOT`，然后在本目录的 PowerShell 中运行：

```powershell
./build.ps1
```

生成 `out/aligned-unsigned.apk`。这是**未签名**的 APK，不能直接用于正常安装。使用你自己的 Android 签名密钥和 Android SDK `apksigner` 签名后再安装；后续更新必须使用相同密钥。请妥善备份密钥并保密，绝不要把密钥或密码提交到 GitHub。

仓库不附带作者的签名密钥、密码或官方已签名的发布包。AndroidManifest.xml 中的包名为 `com.huanglin1008.guessing`；重新分发时可根据需要修改。
