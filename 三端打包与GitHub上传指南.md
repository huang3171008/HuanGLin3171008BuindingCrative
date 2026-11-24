# 猜拳小擂台 v4.5 — 三端打包与 GitHub 上传指南

本工作区基于提供的 v4.5 工程与原 v4.4 代码整合，三端共享前端使用 `sync-shared.mjs` 同步。原始压缩包和原工作区未覆盖。

## 一、本轮核心升级摘要（v4.5）

1. **原生软件形态（消除网页感）**
   - 彻底禁止非输入区的长按选字与弹出菜单（解决手机端长按底部「陪练」弹出 `复制 / 全选 / 网页搜索 / 分享` 的问题），保留房间码与输入框正常复制粘贴。
   - 改为固定视口 App Shell 框架：顶部品牌与金币栏固定、中间内容区独立滚动（隐藏浏览器丑陋滚动条、卡片不再被底栏遮挡）、底部胶囊导航栏新增当前页激活态高亮，隐藏主页底部冗长的网页风规则折叠区与页脚（已收纳进「教程」弹窗）。
2. **视觉与动效精修**
   - 修复 `shader-bg.js` 背景星点呈规整网格波点的问题，改为自然随机闪烁星芒 + 双阶赛璐璐流动云层 + 决胜局晚霞氛围联动。
   - 升级 `enhance.css` 水波纹玻璃转场为真正由点击处向外扩散的双环折射玻璃波纹。
   - 为角色头像增加赛璐璐圆形底托；24 小时每日领金币可领时增加红点脉动提醒。
3. **可玩性与完整性补齐**
   - 离线 AI 陪练支持**快捷表情互动**（简单小熊 / 普通小狐狸 / 困难魔法师会按性格俏皮回复气泡）、结算后支持**一键「再来一局」**、战绩分享卡标注 AI 难度。
   - 修复 `android/src/com/huanglin1008/guessing/AudioBridge.java` 仍映射已删除旧曲目的问题，同步 4 首新 CC0 曲目。
   - 修复 `test-modes.mjs` 在 Node 18 下的 `crypto` 兼容问题，以及 `android/test-peer.mjs` 跨平台浏览器检测与多标签匹配问题。
   - 新增 `.github/workflows/ios-build.yml`（提供手动触发的 iOS 未签名构建工作流，尚未经 macOS 实际验证）。

---

## 二、三端打包步骤

### 1. 同步共享前端（每次改完 `shared-web/` 后运行一次）
```powershell
node sync-shared.mjs
```

### 2. Android 端（生成新版 APK）
```powershell
cd android
.\build.ps1
```
- `build.ps1` 只生成未签名 APK，必须另外使用自己的签名密钥签名才能安装。签名与旧版一致时可尝试覆盖安装，保留本机数据。
- 如需在本机跑浏览器自动化回归测试：
```powershell
cd android
node test-android-asset-policy.mjs
node test-visual.mjs
node test-music.mjs
node test-ai.mjs
node test-extras.mjs
```

### 3. Windows 桌面端（Electron）
```powershell
cd desktop
npm install
npm run start        # 本地运行调试
npm run package:win  # 打包 Windows 可执行程序到 desktop/release/
```

### 4. 苹果 iOS 端（无需 Mac 云端出包）
1. 将本项目推送到你的 GitHub 仓库（见下方第三节）。
2. 打开 GitHub 仓库的 **Actions → Build iOS (Unsigned IPA) → Run workflow**。
3. 工作流尚未在 macOS 实测；成功后才能在 **Artifacts** 下载未签名包。未签名包不能直接安装；自签、真机安装或 TestFlight 需要相应工具、Apple 账号和签名条件。

---

## 三、一键上传到 GitHub

在解压后的项目根目录打开 PowerShell，运行：
```powershell
git add <需提交的文件>
.\push-to-github.ps1 -Branch <当前分支> -Push
```
脚本仅处理你事先暂存的文件，要求当前分支与 `-Branch` 一致；不会初始化仓库或修改远程地址。仅传入 `-Push` 才会推送至现有 origin。运行前请检查暂存文件，切勿上传密钥。iOS 工作流仅手动触发，可能产生 Actions 资源费用。
