# 项目无缝接力档案（HANDOFF）· 猜拳小擂台

> 本文件供 **Antigravity (Gemini)** 与 **OpenAI Codex** 实时同步进度。任一方完成一步修改、测试或诊断后，请立即更新本文件。

## 1. 项目概况
- **项目名称**：`猜拳小擂台 (Huang-Lin1008 Guessing)`
- **当前版本 / 分支**：`v4.7.1`（Android `versionCode="15"`）/ 分支 `codex/cloud-room-prototype-20261124`
- **最后更新时间**：`2026-11-25 11:13`
- **最后经手 AI**：Antigravity（已完成 16 张 Game-icons.net 赛璐璐技能徽章、PixelFX 双缓冲粒子引擎、卡牌 3D 翻转抖动与手势蓄力发光特效，并重新打包 v4.7.1 安卓与桌面端）
- **架构简介**：一核三端猜拳游戏（普通模式【经典金币规则 / 免费技能规则】、竞猜手势、竞猜输赢 + 单人 AI 陪练）。前端统一在 `shared-web/` 维护，经 `node sync-shared.mjs` 同步至 `android/assets/`、`desktop/app-assets/`、`ios/GuessingArena/web/`；所有模式均同时支持「6 位房间码服务器联机」与「同一 Wi-Fi / 热点局域网直连」。

## 2. 最新安装包产物与本机运行/测试命令

### 已打包的 v4.7.1 交付物（位于 `.gitignore` 忽略的 `release-v4.7/`）
- **Android 签名安装包**：`d:\Gemini 创作\猜拳小擂台\release-v4.7\猜拳小擂台-v4.7.1-技能特效美化版.apk`（与旧版同签名 `SHA-256: 2c4181d3...56e9`，`versionCode="15"`，支持直接覆盖安装保留数据）
- **Windows 桌面版程序**：`d:\Gemini 创作\猜拳小擂台\release-v4.7\GuessingArena-win32-x64\GuessingArena.exe`（已更新 `app.asar` 至 v4.7.1）
- **完整整合与美化总报告**：`d:\Gemini 创作\猜拳小擂台\v4.7.1-项目整合与特效美化总报告.md`
- **GitHub 分支同步**：已推送至 `origin/codex/cloud-room-prototype-20261124`（对应 PR #1；因项目仍在持续迭代且待真机试玩平衡，暂未合并至 `main`）。

### 常用同步、构建与测试命令
- **同步三端前端**：`cd "d:\Gemini 创作\猜拳小擂台"; node sync-shared.mjs`
- **规则引擎与公网冒烟**：`node test-modes.mjs; node test-skill-mode.mjs; node tools/diagnostics/public-smoke-skill.mjs`
- **浏览器与桌面端集成测试**：
  - `cd android; node test-android-asset-policy.mjs; node test-ai.mjs; node test-cloud-ui.mjs; node test-peer.mjs`
  - `$env:GUESS_PACKAGED_EXE="d:\Gemini 创作\猜拳小擂台\release-v4.7\GuessingArena-win32-x64\GuessingArena.exe"; cd desktop; node test-desktop.mjs; node test-cloud-desktop.mjs`

## 3. 当前已完成进度
- [x] **16 张技能卡赛璐璐徽章（Game-icons.net · CC BY 3.0）**：在 `shared-web/assets/skills/01_flame_punch.svg` ～ `16_phantom_swap.svg` 中离线打包 16 张矢量徽章（双色渐变流派底托、圆/六角/菱形形态、斜切硬边高光、深紫粗描边与顶部宝石费用角标），已在 `THIRD_PARTY_NOTICES.md` 逐一记录作者（Lorc / Faithtoken / Delapouite）、原始链接与 CC BY 3.0 许可。
- [x] **PixelFX 双缓冲粒子引擎（`shared-web/assets/pixelfx.js`）**：自主实现零依赖 Canvas 2D 双缓冲（`color` 像素层 + `lighter` 发光层 + 快速爆发/慢速余烬衰减），实现四大流派卡牌爆散、石头/剪刀/布专属冲击波，并在 `prefers-reduced-motion`、低画质与切后台时自动降级关闭。
- [x] **卡牌 3D 翻转抖动与手势蓄力发光（`shared-web/assets/enhance.css` + `index.html`）**：选中手牌执行 `perspective(600px)` 3D Y 轴翻转 + 弹性左右微抖上浮并点亮流派流光框，再次点击平滑回落；手势按钮选中时触发蓄力缩放与专属颜色呼吸发光。
- [x] **Android 白名单放行与 v4.7.1 双端重新打包**：`MainActivity.java` 已放行 `/assets/pixelfx.js` 与 `/assets/skills/*.svg`，`test-android-asset-policy.mjs` 已新增 16 张技能 SVG 校验。

## 4. 正在进行 / 下一步待办（按优先级）
1. [ ] **真机覆盖安装试玩**：将 `猜拳小擂台-v4.7.1-技能特效美化版.apk` 覆盖安装到 Android 手机，实测卡牌翻转、粒子手感与 16 张技能卡数值平衡。
2. [ ] **远端仓库同步与运维加固**：确认后将本地 Git 分支推送至 GitHub（切勿包含 `release-v4.7/` 大体积安装包或任何密钥）；为云服务器配置定时 SQLite 备份。

## 5. 踩坑记录与红线提醒
- `MainActivity.java` 拦截 `https://appassets.androidplatform.net/assets/...` 并执行严格白名单，今后新增任何 JS 或静态子目录资源都必须同步更新 `MainActivity.java` 与 `test-android-asset-policy.mjs`。
- 严禁将 `D:\创作\server-ssh\` 私钥、`D:\创作\猜拳小擂台-安卓源码\signing\`、密码、设备凭证或 `*.sqlite` 提交到 Git 仓库。
