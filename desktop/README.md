# Windows 版

需要 Windows 10/11 64 位。发行包解压后运行 `GuessingArena.exe`，请保留程序目录中的其他文件。

源码构建需要 Node.js 24。首次下载依赖后安装 Electron 运行时并打包：

```powershell
npm install
node node_modules/electron/install.js
npm run package:win
```

脚本会先运行仓库根目录的 `prepare-assets.mjs`，从原始来源下载并校验 CC0 图片和音乐，然后将共享界面打包进桌面程序。联机、金币、主题和音乐等功能与安卓直连版共用代码；直连钱包保存在本机，与安卓或服务器钱包分开。

`node test-desktop.mjs` 可用两份隐藏的 Electron 实例测试局域网连接、竞猜、金币记录、主题和音乐。测试只覆盖本机网络，不代表所有网络条件都可直连。
