# 猜拳竞技塔 · Huang-Lin1008 Guessing

共享前端在 `shared-web/`，通过 `node sync-shared.mjs` 同步到 Android、Windows 和 iOS 工程。版本 4.6 使用 **6 位云房间码**；旧版 8 位码客户端需要升级。

## 联机方式

- **服务器房间**：客户端连接同一 HTTPS/WSS 服务，云端发放 6 位数字房间码，主持对局、验证操作和结算。默认服务位于东京，地址 `https://64.83.48.200:8443`。该服务为小规模测试环境，不保证所有网络都可访问。
- **同一 Wi-Fi / 热点**：本地桥接交换连接信息，WebRTC 设备直连，由房主执行结算，无需公网。受局域网设备隔离等限制。
- **单人 AI 陪练**：本机离线运行，使用独立练习钱包。

云端、局域网和陪练钱包分别保存。云端身份保存在本机；卸载、清除应用数据或丢失凭据可能无法找回。金币只作游戏内虚拟积分。

## 项目目录与测试

- `game/cloud-server.mjs`：Node.js 24、`ws` 和 SQLite 实现的权威房间服务；参阅 [云端房间说明](game/云端房间测试说明.md)。
- `shared-web/`：共用界面、规则与桥接。
- `android/`：安卓工程和测试；参阅 [安卓说明](android/README.md)。
- `desktop/`：Electron Windows 客户端；`ios/`：待 Xcode 编译和验证的苹果工程。
- [使用教程](使用教程.md)包含安装、两种联机方式及三种玩法。

`npm run test:cloud` 在 `game/` 执行后端回归；`node test-cloud-ui.mjs` 与 `node test-peer.mjs` 在 `android/` 执行本机双浏览器测试。2026-11-24 已用两台 Android 真机验证局域网三种玩法、Wi-Fi + 移动数据服务器房间一回合；Windows 已通过同机双实例测试；iOS 尚未构建或真机测试。一次性测试不能保证其他网络或长期稳定性。

源码使用 MIT 许可；角色等第三方素材的许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。不要公开服务器密钥、数据库、身份凭据或签名文件。
