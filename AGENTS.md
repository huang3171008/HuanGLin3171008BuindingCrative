# 猜拳小擂台 · 双 AI 无缝接力规范（Antigravity × OpenAI Codex）

本项目启用 **Antigravity (Gemini)** 与 **OpenAI Codex** 双端无缝接力模式。无论单独打开本目录还是从上级工作区进入，当前 AI 均须遵守以下规则：

## 1. 接手即读档
- 当用户说“继续”、“读取项目”、“接着跑”或新开会话接手本项目时，**第一步必须先读取本目录下的 `HANDOFF.md`**，并运行 `git status -sb` 与 `git diff --stat` 核对现场。
- 若存在比 `HANDOFF.md` 更新的未提交代码（可能因上一方额度耗尽中断），先阅读 diff 理解改动意图，严禁擅自回滚。

## 2. 实时更新 `HANDOFF.md`（防额度突然耗尽）
- 每完成一次代码修改、测试验证或真机诊断，在回复用户前**必须同步更新 `HANDOFF.md`**。
- 涉及端口、启动脚本、打包或同步步骤变更时，同步更新 `HANDOFF.md` 的运行指南。

## 3. 本项目特定铁律
- **共享前端单点维护**：界面、音频和动效统一维护在 `shared-web/`，修改后必须在项目根目录运行 `node sync-shared.mjs` 同步到 Android、Electron (`desktop/`) 和 iOS 工程，切勿只单改某一端的副本。
- **敏感文件隔离**：Android 签名密钥（`android/signing/`、`*.keystore`、`password.txt`）、服务器凭据、`.env` 以及本地 SQLite 数据库（`*.sqlite`）严禁提交或上传至公开仓库。
- **推送谨慎**：`push-to-github.ps1` 仅在用户明确要求上传时按需处理，不得自动推送或覆盖远程分支。
