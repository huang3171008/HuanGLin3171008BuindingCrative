# 项目无缝接力档案（HANDOFF）· 猜拳小擂台

> 本文件供 **Antigravity (Gemini)** 与 **OpenAI Codex** 实时同步进度。任一方完成一步修改、测试或诊断后，请立即更新本文件。

## 1. 项目概况
- **项目名称**：`猜拳小擂台 (Huang-Lin1008 Guessing)`
- **当前分支 / 基线**：`codex/cloud-room-prototype-20261124`（`v4.6` 普通模式「技能对战」已完成一核三端功能开发、双联机模式复测，并**已正式上线公网服务器 `64.83.48.200:8443`**）
- **最后更新时间**：`2026-11-25 10:45`
- **最后经手 AI**：Antigravity
- **架构简介**：一核三端猜拳游戏（普通模式【经典金币规则 / 免费技能规则】、竞猜手势、竞猜输赢 + 单人 AI 陪练）。前端统一在 `shared-web/` 维护，经 `node sync-shared.mjs` 同步至 `android/assets/`、`desktop/app-assets/`、`ios/GuessingArena/web/`；**新技能模式与经典玩法均同时支持「6 位房间码服务器联机」与「同一 Wi-Fi / 热点局域网直连」两种联机方式**。

## 2. 本机运行、同步与测试命令（换端直接跑）

- **环境要求**：Node.js 24 LTS（当前本机 `v24.21.0`）
- **前端资源同步**（修改 `shared-web/` 后必跑）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node sync-shared.mjs
  ```
- **核心引擎与技能规则自检**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node test-modes.mjs
  node test-skill-mode.mjs
  ```
- **云端房间服务本机测试与启动**（默认 `http://127.0.0.1:3100`，`/healthz`，`/ws`）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\game"
  node test-cloud.mjs
  node cloud-server.mjs
  ```
- **多端无头浏览器集成测试（含局域网与云房间技能对战）**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\android"
  node test-peer.mjs
  node test-cloud-ui.mjs
  node test-ai.mjs
  ```
- **公网服务器 WSS 冒烟自检**（测试线上 `wss://64.83.48.200:8443/ws` 技能房 + 经典房 + 旧端拦截）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node tools/diagnostics/public-smoke-skill.mjs
  ```

## 3. 当前已完成进度

- [x] **普通模式「技能对战」支持双联机模式 + AI 陪练**：
  - **6 位房间码服务器联机（`cloud`）**：连接 `https://64.83.48.200:8443` 后，选「普通模式 → 技能规则」即可创建 6 位数字房间码（支持二维码与公开房间搜索），双方准备后服务端权威发牌、扣能与结算，结束支持再来一局。
  - **同一 Wi-Fi / 热点局域网联机（`lan`）**：通过房主连接码建立 WebRTC 直连后，房主选「普通模式 → 技能规则」对方自动入房开战，结束支持房主一键「再来一局」（`p2pRematch`）或返回切换其他模式。
  - **单人 AI 陪练**：简单 / 普通 / 困难三档 AI 完整支持技能规则与再来一局。
- [x] **公网服务器备份部署与实网冒烟通过（`2026-11-25 10:44`）**：
  - 已通过 `game/deploy/upgrade-skill-mode.sh` 对线上 `/var/lib/guess-arena-cloud/cloud.sqlite` 完成 SQLite 在线备份与 `PRAGMA integrity_check` 校验，快照保存在服务器 `/var/backups/guess-arena-cloud/before-skill-mode.MnuGbgqN`（含旧版 `engine.js`、`cloud-server.mjs` 与 `cloud.sqlite`）。
  - 原子更新 `/opt/guess-arena-cloud/android/assets/assets/engine.js` 与 `game/cloud-server.mjs`，`guess-arena-cloud.service` 与 `guess-arena-caddy.service` 均 `active`。
  - 运行 `node tools/diagnostics/public-smoke-skill.mjs` 实网 WSS 冒烟通过：6 位房间码技能对战发牌/保密/结算/零金币变动、经典金币模式结算、旧版客户端兼容与进入技能房升级提示全部正常。

## 4. 正在进行 / 下一步待办（按优先级）
1. [ ] **重新打包客户端安装包（Android APK / Windows EXE）**：由于手机与桌面端界面内置在应用包内，需重新编译签名 APK（注意使用本机旧签名密钥覆盖安装以保留本地钱包与云端身份）及打包 Windows 桌面端，方可在实体设备上体验新技能模式。
2. [ ] **第二阶段美化与体验打磨（待用户开启）**：技能卡专属图标（如 Game-icons.net 逐一核验署名打包）与出牌/结算粒子特效美化；根据真人试玩反馈微调 16 张技能卡数值。
3. [ ] **运维与远端同步**：服务器配置定期自动备份任务；确认后将本地 Git 分支推送至 GitHub。

## 5. 踩坑记录与红线提醒
- `shared-web/` 修改后必须先运行 `node sync-shared.mjs`，确保 `android/assets/assets/engine.js` 与 `shared-web` 一致。
- 线上回滚方法：若需回滚服务器，可将 `/var/backups/guess-arena-cloud/before-skill-mode.MnuGbgqN/` 下的 `engine.js` 与 `cloud-server.mjs` 拷回 `/opt/guess-arena-cloud/` 对应路径并重启 `guess-arena-cloud.service`。
- 严禁将 `D:\创作\server-ssh\` 私钥、`android/signing/`、密钥密码、设备凭证或 `*.sqlite` 提交到 Git 仓库。
