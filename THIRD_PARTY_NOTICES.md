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

本版共享前端不再使用云朵和大理石 JPG 纹理；背景由 WebGL/CSS 生成。原有两首音乐已从此版本移除。界面音效采用 [Kenney UI Audio](https://kenney.nl/assets/ui-audio) 的 CC0 素材：`click1.ogg`、`switch1.ogg`、`click2.ogg` 转码为 MP3；取得来源为 [Open Game SFX Index 镜像](https://github.com/Mcamento8/open-game-sfx-index)，下载文件与其 SHA-256 索引一致。找不到文件或无法解码时回退为 Web Audio 合成。指定的 Freesound 示例尚未随包提供；两个作品的原始下载需登录，参考 [Joyful Game Loop](https://freesound.org/people/Venus17/sounds/840648/) 与 [Cute Background Loop Song Thing](https://freesound.org/people/Seth_Makes_Sounds/sounds/655515/)。

## 新增背景音乐（CC0）

- “暖阳钢琴”：OwlishMedia，[Happy Clappy Loop](https://opengameart.org/content/happy-clappy-loop)，CC0；从作者提供的 WAV 转码为 `bright-piano.mp3`。
- “快乐冒险”：TinyWorlds，[Happy Adventure (Loop)](https://opengameart.org/content/happy-adventure-loop)，CC0；源文件 `happy_adveture.mp3` 保存为 `sunny-adventure.mp3`。MP3 解码和设备差异可能在循环处出现短暂间隙。
- 旧版“云边散步”和“快乐时光”已从音乐菜单移除。新用户第一次交互后尝试播放“暖阳钢琴”；原来选择旧曲的用户会迁移到对应新曲，原来选择关闭音乐的用户继续保持关闭。

- **Happy menu song**, Blocky Modeler, [OpenGameArt](https://opengameart.org/content/happy-menu-song), CC0 1.0; `assets/music/pixel-menu.mp3`.
- **qrcode-generator** 1.4.4, Kazuhiko Arase, MIT License: https://github.com/kazuhikoarase/qrcode-generator . The license header is preserved in `assets/qrcode.js`.

### qrcode-generator MIT license

Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

- 新增《Flowerbed Fields》：Zane Little Music，[OpenGameArt](https://opengameart.org/content/flowerbed-fields-loop)，CC0；从 OGG 转为 `flowerbed.mp3`。
- 胜利、落败、金币音效：Kenney 的 [51 UI sound effects](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks)，CC0；`switch15.wav`、`switch24.wav`、`switch38.wav` 转码。
- 两首旧音乐已从本版本移除，既有用户的选择迁移到对应新曲。

## 技能卡图标素材（Game-icons.net · CC BY 3.0）

`shared-web/assets/skills/`（同步至 Android、Windows、iOS）中的 16 张技能卡矢量图标轮廓源自 **[Game-icons.net](https://game-icons.net/)**（官方仓库 [game-icons/icons](https://github.com/game-icons/icons)），采用 **[Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/)** 许可。本项目对原始黑白单色 SVG 轮廓进行了赛璐璐徽章化二次加工（添加双色渐变底托、深紫描边、斜切硬边高光与流派外框）。逐卡作者与原始链接如下：

| 技能卡 | 文件 | 原图标 | 作者 | 原始页面与许可 |
| --- | --- | --- | --- | --- |
| 烈焰重拳 | `01_flame_punch.svg` | `fire-punch` | Lorc | https://game-icons.net/1x1/lorc/fire-punch.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 双星连击 | `02_twin_strike.svg` | `lightning-saber` | Lorc | https://game-icons.net/1x1/lorc/lightning-saber.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 破盾陨星 | `03_meteor_break.svg` | `burning-meteor` | Lorc | https://game-icons.net/1x1/lorc/burning-meteor.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 疾风偷袭 | `04_gale_ambush.svg` | `wind-slap` | Lorc | https://game-icons.net/1x1/lorc/wind-slap.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 圣光壁垒 | `05_holy_barrier.svg` | `checked-shield` | Lorc | https://game-icons.net/1x1/lorc/checked-shield.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 镜面反弹 | `06_mirror_reflect.svg` | `shield-reflect` | Lorc | https://game-icons.net/1x1/lorc/shield-reflect.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 蓄势待发 | `07_brace_charge.svg` | `hourglass` | Lorc | https://game-icons.net/1x1/lorc/hourglass.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 铁壁反震 | `08_iron_counter.svg` | `lightning-shield` | Lorc | https://game-icons.net/1x1/lorc/lightning-shield.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 元气甘露 | `09_vitality_nectar.svg` | `heart-bottle` | Lorc | https://game-icons.net/1x1/lorc/heart-bottle.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 治愈护符 | `10_heal_talisman.svg` | `charm` | Lorc | https://game-icons.net/1x1/lorc/charm.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 灵动抽牌 | `11_nimble_draw.svg` | `card-draw` | Faithtoken | https://game-icons.net/1x1/faithtoken/card-draw.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 能量虹吸 | `12_energy_siphon.svg` | `energise` | Lorc | https://game-icons.net/1x1/lorc/energise.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 毒雾飞镖 | `13_venom_dart.svg` | `poison-gas` | Lorc | https://game-icons.net/1x1/lorc/poison-gas.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 命运封印 | `14_fate_seal.svg` | `padlock` | Lorc | https://game-icons.net/1x1/lorc/padlock.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 逆转天平 | `15_tip_scales.svg` | `scales` | Lorc | https://game-icons.net/1x1/lorc/scales.html (CC BY 3.0，已加赛璐璐徽章加工) |
| 幻影置换 | `16_phantom_swap.svg` | `card-exchange` | Delapouite | https://game-icons.net/1x1/delapouite/card-exchange.html (CC BY 3.0，已加赛璐璐徽章加工) |

## 粒子特效架构说明

`shared-web/assets/pixelfx.js` 为本项目自主编写的零依赖 Canvas 2D 双缓冲像素粒子模块（`color` 像素层 + `lighter` 发光层），设计理念参照 [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) 的像素渲染规范，未直接引入外部二进制/字体包，在低画质与 `prefers-reduced-motion` 模式下自动降级关闭。
