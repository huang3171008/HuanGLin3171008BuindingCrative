# 第三方素材

`game/src/assets/` 和 `android/assets/assets/` 中的狐狸、小熊、兔子和熊猫图片由 **OpenMoji — the open-source emoji and icon project** 设计。

- 项目：https://openmoji.org/
- 原始素材：https://github.com/hfg-gmuend/openmoji/tree/master/color/svg
- 许可：[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
- 本仓库中的 SVG 文件未修改；网页使用这些文件展示角色。

本仓库 MIT 许可适用于本项目代码，不覆盖这些第三方图片的许可。

## 界面和音乐素材（CC0）

- 云朵主题：Greg Zaal / Poly Haven，[Cloud Layers](https://polyhaven.com/a/cloud_layers)，CC0。
- 大理石主题：ambientCG，[Marble 001](https://ambientcg.com/view?id=Marble001)，CC0。
- “云边散步”：Another Page Studio（IntelligentGene），[Overworld (BGM)](https://opengameart.org/content/overworld-bgm)，CC0。
- “快乐时光”：wipics，[Happy Loop](https://opengameart.org/content/happy-loop)，CC0。

大体积的图片和音频不直接存储在源码仓库；`prepare-assets.mjs` 会从上述原始来源下载，并在本地校验 SHA-256 后打包。
