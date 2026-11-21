# iPhone / iPad 工程

此工程提供与安卓直连版相同的网页界面和游戏规则，并通过原生局域网桥接交换连接码。跨网络使用手动交换 WebRTC 邀请/回复；使用公共 STUN 辅助发现地址，不含 TURN 中转。

## 构建前提

需要 macOS、Xcode、Node.js 24 和可用于签名的 Apple 账号。如果使用完整源码仓库，先在 `ios` 目录运行 `node sync-assets.mjs`，再打开 `GuessingArena.xcodeproj`。如果使用单独的 iPhone 工程压缩包，`GuessingArena/web` 已包含资源，解压后可直接打开工程，不需要运行同步脚本。

在 Xcode 的 Signing & Capabilities 中选择自己的 Team 和可用的 Bundle Identifier，连接 iPhone 或选择模拟器后构建。安装到 iPhone 需要按 Apple 的签名及设备安装流程操作。

## 验证状态

工程是在 Windows 环境准备的，**尚未在 Xcode、iOS 模拟器或 iPhone 上编译和测试**。不能将此工程视作已生成、可安装的 IPA；尤其需要检查 WebKit 的点对点连接、本地网络权限、音频和不同系统版本。

直连金币保存在设备本机，与服务器模式钱包分开。不要提交签名证书、私钥或包含玩家数据的数据库。
