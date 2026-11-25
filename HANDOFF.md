# 项目无缝接力档案（HANDOFF）· 猜拳小擂台

> 本文件供 **Antigravity (Gemini)** 与 **OpenAI Codex** 实时同步进度。任一方完成一步修改、测试或诊断后，请立即更新本文件。

## 1. 项目概况
- **项目名称**：`猜拳小擂台 (Huang-Lin1008 Guessing)`
- **当前分支 / 基线**：`codex/cloud-room-prototype-20261124`（已同步 Codex `v4.6.0` 六位云房间码版本到本地 Git 仓库）
- **最后更新时间**：`2026-11-25 10:08`
- **最后经手 AI**：Antigravity（已完成 Codex v4.6 源码回流与基线验证，准备推进 v4.6 普通模式「技能对战」升级）
- **架构简介**：一核三端猜拳游戏（普通模式 10 回合 / 竞猜手势 / 竞猜输赢 + 单人 AI 陪练）。前端统一在 `shared-web/` 维护，经 `node sync-shared.mjs` 同步至 `android/assets/`、`desktop/app-assets/`、`ios/GuessingArena/web/`；联机支持公网 6 位房间码云服务（`game/cloud-server.mjs`，协议 2）与局域网 WebRTC 直连（房主权威）。

## 2. 本机运行、同步与测试命令（换端直接跑）

- **环境要求**：Node.js 24 LTS（当前本机 `v24.21.0`）
- **前端资源同步**（修改 `shared-web/` 后必跑）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node sync-shared.mjs
  ```
- **核心引擎与玩法自检**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node test-modes.mjs
  ```
- **云端房间服务（协议 2 · 6 位码）测试与启动**（默认 `http://127.0.0.1:3100`，`/healthz`，`/ws`）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\game"
  npm ci --ignore-scripts
  node test-cloud.mjs
  node cloud-server.mjs
  ```
- **多端浏览器自动化测试**（按需）：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\android"
  node test-ai.mjs
  node test-cloud-ui.mjs
  node test-peer.mjs
  ```

## 3. 当前已完成进度与最新基线

### 已完成节点
- [x] **v4.6.0 同步入库**：已将 `D:\创作\猜拳-6位房间码工作区` 中的 v4.6 源码、文档、测试及 `普通模式技能升级提示词.md` 同步至本共享仓库（保留 `MainActivity.java` 动态包名分享修复，未纳入任何私钥、数据库或打包产物）。
- [x] **v4.6 基线回归通过**：
  - `node sync-shared.mjs`：开源素材就绪，已同步至 Android / Windows / iOS。
  - `node test-modes.mjs`：普通模式 9 种手势、竞猜手势 81 种、竞猜输赢 36 种、旧回合保护与 10 回合最终结算全部通过。
  - `cd game && node test-cloud.mjs`：协议 2 认证/拒绝协议 1、每日领取幂等、6 位房间码、公开搜索、快捷表情、保密、断线重连、三种模式、再来一局与重启持久化全部通过。
- [x] 已完整研读 `shared-web/` 核心模块与 `game/cloud-server.mjs`、测试脚手架，梳理出「普通模式技能对战」的变更与风险清单。

## 4. 正在进行 / 下一步待办（按优先级）
1. [ ] **确认是否将 v4.6 基线推送至 GitHub**（`codex/cloud-room-prototype-20261124`），并确认是否立刻开始实施「普通模式技能对战」（需求全文见 `普通模式技能升级提示词.md`）。
2. [ ] **阶段一：技能对战权威引擎与自动测试**
   - 涉及文件：`shared-web/assets/engine.js`（或拆出独立 `skill-engine.js` 由 `engine.js` 复用，需同步 `cloud-server.mjs` 加载方式）、新增 `test-skill-mode.mjs`（覆盖 16 张卡胜/负/平、边界、同时归零、非法操作与对局模拟）。
3. [ ] **阶段二：云端协议扩展、AI 技能适配与局域网同步**
   - 涉及文件：`game/cloud-server.mjs`、`game/test-cloud.mjs`、`shared-web/assets/cloud-client.js`、`shared-web/assets/p2p.js`、`shared-web/assets/ai-bot.js`。
4. [ ] **阶段三：三端共享界面、特效素材与游戏内教程**
   - 涉及文件：`shared-web/index.html`、`shared-web/assets/enhance.css`、`shared-web/assets/enhance.js`、`shared-web/assets/extras.js`、`THIRD_PARTY_NOTICES.md`，执行 `node sync-shared.mjs` 同步并跑全量回归（含 `test-modes.mjs`、`game/test-cloud.mjs`、`android/test-ai.mjs`、`android/test-cloud-ui.mjs`）。
5. [ ] **后续运维与跨端真机验证**（有环境时推进）：服务器 SQLite 定期备份与恢复演练、证书续期观察、Windows×Android 跨设备联机、iOS Xcode 构建与真机测试。

## 5. 踩坑记录与红线提醒
- `shared-web/` 是唯一前端真源，改完必须运行 `node sync-shared.mjs`；注意 `game/cloud-server.mjs` 第 22 行目前读取的是 `../android/assets/assets/engine.js`，未同步会导致服务端跑旧引擎。
- 技能模式**绝对不能**读写钱包金币（免费进入、不扣/不奖金币、不写 `ledger`），且必须保持经典普通/竞猜模式 100% 回归兼容。
- 协议兼容红线：当前云房间协议为 `2`，扩展技能模式时必须有明确规则版本/能力协商或错误提示，确保旧版客户端不能误进技能房，且旧房间与金币数据不被静默清空。
- 严禁将 `D:\创作\server-ssh\` 私钥、`android/signing/`、密钥密码、设备凭证或 `*.sqlite` 提交到 Git 仓库。
