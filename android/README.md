# Android 客户端

支持 Android 6.0 及以上，需设备具备支持 WebRTC 数据通道的 Android System WebView。应用内包含三种连接方式：

- **同一 Wi-Fi / 热点**：房主创建局域网连接码，对方输入后尝试直接连接。房主的手机会临时提供连接信息交换；不需要公网或云服务器。
- **不同网络**：房主生成邀请，通过聊天工具发送；加入者粘贴后生成回复，再发给房主。双方尝试 WebRTC 直连，使用 `stun.cloudflare.com:3478` 查询网络地址，不经过游戏数据中转。部分网络无法直连，暂不支持 TURN。
- **原服务器模式**：在顶部“模式”中设置 HTTPS 游戏服务器，两位玩家需要使用同一服务器。

直连模式的金币保存在各自手机，与服务器模式的金币分开；清除应用数据或卸载可能丢失。房主客户端负责结算，无法防止有意修改客户端。连接信息可能包含网络地址，请只发给可信的对手。

## Windows 构建

安装 JDK 17，以及 Android SDK Platform 35、Build Tools 35.0.0。设置 `JAVA_HOME`、`ANDROID_SDK_ROOT`，然后在本目录的 PowerShell 中运行：

```powershell
./build.ps1
```

生成 `out/aligned-unsigned.apk`。这是**未签名**的 APK，不能直接用于正常安装。使用自己的 Android 签名密钥和 SDK `apksigner` 签名后再安装；更新已安装的应用需要使用相同密钥。签名密钥和密码不要提交到 GitHub。

`node test-peer.mjs` 可在安装了 Chrome 的 Windows 机器上运行双浏览器测试。该测试会模拟局域网连接信息交换，不能代替两台安卓手机、不同实际网络的测试。
