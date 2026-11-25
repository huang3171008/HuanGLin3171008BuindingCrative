# 项目无缝接力档案（HANDOFF）· 猜拳小擂台

> 本文件供 **Antigravity (Gemini)** 与 **OpenAI Codex** 实时同步进度。任一方完成一步修改、测试或诊断后，请立即更新本文件。

## 1. 项目概况
- **项目名称**：`猜拳小擂台 (Huang-Lin1008 Guessing)`
- **当前版本 / 分支**：`v4.7.0`（Android `versionCode="14"`）/ 分支 `codex/cloud-room-prototype-20261124`
- **最后更新时间**：`2026-11-25 10:56`
- **最后经手 AI**：Antigravity（已完成 v4.7.0 技能对战全端整合、公网 `64.83.48.200:8443` 部署验证，以及 Android APK 与 Windows EXE 新版打包与实测）
- **架构简介**：一核三端猜拳游戏（普通模式【经典金币规则 / 免费技能规则】、竞猜手势、竞猜输赢 + 单人 AI 陪练）。前端统一在 `shared-web/` 维护，经 `node sync-shared.mjs` 同步至 `android/assets/`、`desktop/app-assets/`、`ios/GuessingArena/web/`；所有模式均同时支持「6 位房间码服务器联机」与「同一 Wi-Fi / 热点局域网直连」。

## 2. 最新安装包产物与本机运行/测试命令

### 已打包的新版交付物（位于 `.gitignore` 忽略的 `release-v4.7/`）
- **Android 签名安装包**：`d:\Gemini 创作\猜拳小擂台\release-v4.7\猜拳小擂台-v4.7.0-技能对战整合版.apk`（与 v4.6 同签名 `SHA-256: 2c4181d3...56e9`，支持直接覆盖安装保留数据）
- **Windows 桌面版程序**：`d:\Gemini 创作\猜拳小擂台\release-v4.7\GuessingArena-win32-x64\GuessingArena.exe`
- **完整整合测试报告**：`d:\Gemini 创作\猜拳小擂台\v4.7.0-技能对战整合与测试报告.md`

### 常用同步、构建与测试命令
- **同步三端前端**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node sync-shared.mjs
  ```
- **规则引擎与公网冒烟测试**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台"
  node test-modes.mjs
  node test-skill-mode.mjs
  node tools/diagnostics/public-smoke-skill.mjs
  ```
- **云端服务与桌面/浏览器集成测试**：
  ```powershell
  cd "d:\Gemini 创作\猜拳小擂台\game"; node test-cloud.mjs
  cd "d:\Gemini 创作\猜拳小擂台\android"; node test-peer.mjs; node test-cloud-ui.mjs; node test-ai.mjs
  $env:GUESS_PACKAGED_EXE="d:\Gemini 创作\猜拳小擂台\release-v4.7\GuessingArena-win32-x64\GuessingArena.exe"
  cd "d:\Gemini 创作\猜拳小擂台\desktop"; node test-desktop.mjs; node test-cloud-desktop.mjs
  ```
- **重新编译并签名 Android APK**（本机工具链位于 `D:\创作\android-build-tools`，切勿将密钥拷入仓库）：
  ```powershell
  $env:JAVA_HOME="D:\创作\android-build-tools\jdk\jdk-17.0.21.1+2"
  $env:ANDROID_SDK_ROOT="D:\创作\android-build-tools\sdk"
  powershell -ExecutionPolicy Bypass -File "d:\Gemini 创作\猜拳小擂台\android\build.ps1"
  & "$env:JAVA_HOME\bin\java.exe" -jar "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\lib\apksigner.jar" sign --ks "D:\创作\猜拳小擂台-安卓源码\signing\release.p12" --ks-type PKCS12 --ks-pass "file:D:\创作\猜拳小擂台-安卓源码\signing\password.txt" --out "d:\Gemini 创作\猜拳小擂台\release-v4.7\猜拳小擂台-v4.7.0-技能对战整合版.apk" "d:\Gemini 创作\猜拳小擂台\android\out\aligned-unsigned.apk"
  ```

## 3. 当前已完成进度
- [x] 同步 Codex `v4.6.0` 六位房间码工程并升级至 `v4.7.0` 技能对战整合版。
- [x] 完成普通模式「技能规则」（16 张技能卡、120 HP、能量/连胜/中毒/封印/破盾/反伤/同时归零），打通 6 位房间码云服务、局域网直连（含房主再来一局）与三档 AI 陪练。
- [x] 公网服务器 `64.83.48.200:8443` 在线备份升级完成（备份目录 `/var/backups/guess-arena-cloud/before-skill-mode.MnuGbgqN`）并通过公网 WSS 冒烟验证。
- [x] 修复 `android/build.ps1` PowerShell 5.1 编码报错，产出签名版 `v4.7.0` APK 与 Windows `GuessingArena.exe`，11 项单元、浏览器、打包桌面双实例与实网测试全部通过。

## 4. 正在进行 / 下一步待办（按优先级）
1. [ ] **真机覆盖安装试玩与手感反馈**：在 Android 手机覆盖安装 `猜拳小擂台-v4.7.0-技能对战整合版.apk`，与好友试玩局域网及 6 位云房间技能模式，收集首版 16 卡平衡调整意见。
2. [ ] **第二阶段美术与动效升级（待用户开启）**：按需引入已核验许可证的卡牌专属图标（如 Game-icons.net CC BY 3.0 署名打包）及轻量出牌/命中特效。
3. [ ] **远端仓库同步与运维加固**：确认后将本地分支推送到 GitHub（切勿包含 `release-v4.7/` 大体积二进制或任何密钥）；为云服务器配置定时 SQLite 备份。

## 5. 踩坑记录与红线提醒
- `shared-web/` 是唯一前端真源，修改后必须运行 `node sync-shared.mjs`。
- `android/build.ps1` 须保持带 UTF-8 BOM 保存，否则 Windows PowerShell 5.1 会按 GBK 误读中文引号报错。
- 严禁将 `D:\创作\server-ssh\` 私钥、`D:\创作\猜拳小擂台-安卓源码\signing\`、密码、设备凭证或 `*.sqlite` 提交到 Git 仓库。
