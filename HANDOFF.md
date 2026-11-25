# 项目无缝接力档案（HANDOFF）· 猜拳小擂台

> 本文件供 **Antigravity (Gemini)** 与 **OpenAI Codex** 实时同步进度。任一方完成一步修改、测试或诊断后，请立即更新本文件。

## 1. 项目概况
- **项目名称**：`猜拳小擂台 (Huang-Lin1008 Guessing)`
- **当前分支 / 基线**：`codex/cloud-room-prototype-20261124`（已完成 `v4.6` 普通模式「技能对战」全链路功能升级与本机自测，暂未引入外部图标与重度特效）
- **最后更新时间**：`2026-11-25 10:36`
- **最后经手 AI**：Antigravity
- **架构简介**：一核三端猜拳游戏（普通模式【经典金币规则 / 免费技能规则】、竞猜手势、竞猜输赢 + 单人 AI 陪练）。前端统一在 `shared-web/` 维护，经 `node sync-shared.mjs` 同步至 `android/assets/`、`desktop/app-assets/`、`ios/GuessingArena/web/`；联机支持公网 6 位房间码云服务（`game/cloud-server.mjs`，`protocol: 2` + `rulesVersion: 2`）与局域网 WebRTC 直连（房主权威）。

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
- **云端房间服务（含经典与技能模式）测试与启动**（默认 `http://127.0.0.1:3100`，`/healthz`，`/ws`）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\game"
  node test-cloud.mjs
  node cloud-server.mjs
  ```
- **多端无头浏览器集成测试**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\android"
  node test-ai.mjs
  node test-cloud-ui.mjs
  node test-peer.mjs
  node test-android-asset-policy.mjs
  node test-extras.mjs
  node test-music.mjs
  node test-v45-integration.mjs
  ```
- **公网服务器 SSH 连通检查**（密钥位于本机外部 `D:\创作\server-ssh\guess-arena-ed25519`，严禁入库）：
  ```powershell
  ssh -i "D:\创作\server-ssh\guess-arena-ed25519" -o UserKnownHostsFile="D:\创作\server-ssh\known_hosts" -o StrictHostKeyChecking=yes root@64.83.48.200 "systemctl is-active guess-arena-cloud.service guess-arena-caddy.service && curl -fsS http://127.0.0.1:3100/healthz"
  ```

## 3. 当前已完成进度

- [x] **公网服务器 SSH 连通验证**：已读取 `D:\创作\server-ssh\guess-arena-ed25519.pub`（`guess-arena-deploy`）并连接 `root@64.83.48.200`，确认 `guess-arena-cloud.service` 与 `guess-arena-caddy.service` 均 `active`，`/healthz` 正常，且未改动线上运行态。
- [x] **普通模式「技能对战」一核三端内容实现（图标与特效美化暂未改动）**：
  - `shared-web/assets/engine.js`：实现 `variant: 'classic' | 'skill'`、120 HP、初始 2/上限 5 能量、16 张首版技能卡独立洗牌抽弃牌（手牌上限 4）、提交即扣能且对对手完全隐藏手牌与能量差、同时结算（直接伤害/减伤/破盾/反伤→已有中毒/回复/能量/封印/抽牌→统一扣血回血与同时归零判平），免费不触碰钱包金币。
  - `game/cloud-server.mjs` & `shared-web/assets/cloud-client.js`：保持 `protocol: 2` 向后兼容并增加 `rulesVersion: 2` 能力保护（旧客户端仍可玩经典模式，尝试创建/加入技能房时提示升级，搜索列表对旧端自动过滤技能房）；技能房跳过金币账本写入，支持断线重连、服务重启持久化与再来一局重置。
  - `shared-web/assets/p2p.js` & `shared-web/assets/ai-bot.js`：支持局域网技能对战及简单/普通/困难三档 AI 预决策出卡与再来一局。
  - `shared-web/index.html`、`enhance.css`、`enhance.js`、`extras.js`：完成经典/技能规则切换、双端生命条与状态标签（连胜/中毒/封印）、手牌选择（含费用、不可用原因、无障碍标签与 `Q/W/E/R` + `1/2/3` 快捷键）、16 卡图鉴与逐卡教程、账本隔离及技能战绩卡适配，并经 `node sync-shared.mjs` 同步至 Android / Windows / iOS。
  - `game/deploy/upgrade-skill-mode.sh`：编写线上 SQLite 在线备份 + `engine.js` 与 `cloud-server.mjs` 双文件原子替换及失败自动回滚脚本。
- [x] **全套 9 项本机自动化测试 100% 通过**：`test-modes.mjs`、`test-skill-mode.mjs`（含 48 分支与 600 局模拟）、`game/test-cloud.mjs`、`android/test-ai.mjs`、`android/test-cloud-ui.mjs`、`android/test-peer.mjs`、`test-android-asset-policy.mjs`、`test-extras.mjs`、`test-music.mjs`、`test-v45-integration.mjs`。

## 4. 正在进行 / 下一步待办（按优先级）
1. [ ] **线上部署确认（待用户指令）**：使用 `game/deploy/upgrade-skill-mode.sh` 将新版 `engine.js` 与 `cloud-server.mjs` 备份部署至 `root@64.83.48.200`（`/opt/guess-arena-cloud`），并跑公网 WSS 冒烟验证。
2. [ ] **三端客户端打包与真机验证**（有环境时推进）：重新构建 Android APK 与 Windows Electron 包，在两台真机上实测技能模式（局域网 & 6 位云房间）；iOS 工程待 Mac + Xcode 构建验证。
3. [ ] **第二阶段视觉与内容扩展（待用户开启）**：技能卡图标（如 Game-icons.net 逐一署名引入）与粒子/动效美化；真人试玩平衡首版 16 张技能卡数值。
4. [ ] **GitHub 远端同步（待用户确认）**：确认是否将本地已提交的 v4.6 与技能对战分支推送至 GitHub。

## 5. 踩坑记录与红线提醒
- `shared-web/` 修改后必须先运行 `node sync-shared.mjs`，因为 `game/cloud-server.mjs` 直接加载 `../android/assets/assets/engine.js`。
- 向 `64.83.48.200` 升级服务端时必须**同时**备份并更新 `/opt/guess-arena-cloud/android/assets/assets/engine.js` 与 `/opt/guess-arena-cloud/game/cloud-server.mjs`（脚本 `game/deploy/upgrade-skill-mode.sh` 已封装此逻辑）。
- 严禁将 `D:\创作\server-ssh\` 私钥、`android/signing/`、密钥密码、设备凭证或 `*.sqlite` 提交到 Git 仓库。
