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

共享前端中包含两首 CC0 音乐供离线使用；若文件缺失，`prepare-assets.mjs` 会从原始来源下载，并在本地校验 SHA-256 后打包。

本版共享前端不再使用云朵和大理石 JPG 纹理；背景由 WebGL/CSS 生成。原有两首音乐仍为上述 OpenGameArt CC0 曲目。界面音效采用 [Kenney UI Audio](https://kenney.nl/assets/ui-audio) 的 CC0 素材：`click1.ogg`、`switch1.ogg`、`click2.ogg` 转码为 MP3；取得来源为 [Open Game SFX Index 镜像](https://github.com/Mcamento8/open-game-sfx-index)，下载文件与其 SHA-256 索引一致。找不到文件或无法解码时回退为 Web Audio 合成。指定的 Freesound 示例尚未随包提供；两个作品的原始下载需登录，参考 [Joyful Game Loop](https://freesound.org/people/Venus17/sounds/840648/) 与 [Cute Background Loop Song Thing](https://freesound.org/people/Seth_Makes_Sounds/sounds/655515/)。

## 新增背景音乐（CC0）

- “暖阳钢琴”：OwlishMedia，[Happy Clappy Loop](https://opengameart.org/content/happy-clappy-loop)，CC0；从作者提供的 WAV 转码为 `bright-piano.mp3`。
- “快乐冒险”：TinyWorlds，[Happy Adventure (Loop)](https://opengameart.org/content/happy-adventure-loop)，CC0；源文件 `happy_adveture.mp3` 保存为 `sunny-adventure.mp3`。MP3 解码和设备差异可能在循环处出现短暂间隙。
- 旧版“云边散步”和“快乐时光”仍可在音乐菜单中选择。新用户第一次交互后尝试播放“暖阳钢琴”；原来选择旧曲的用户会迁移到对应新曲，原来选择关闭音乐的用户继续保持关闭。
