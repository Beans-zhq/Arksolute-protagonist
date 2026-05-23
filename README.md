# Absolute protagonist

Absolute protagonist 是一个基于 Tauri 的 Windows 透明桌面宠物。它支持 WebM 动作素材和 Spine 动画素材，可以在桌面上自动移动、互动、触发特殊动作，并随机说一些日常碎碎念。

## 功能

- 透明桌面宠物窗口，默认置顶并隐藏任务栏图标。
- 支持拖动桌宠，移动到屏幕边缘时会自动限制在当前屏幕工作区内。
- 单击触发互动动作，双击触发特殊动作。
- 桌宠会自动巡逻、待机、说话。
- 右键菜单支持切换动作、随机说话、调整桌宠大小、切换素材文件夹、切换内置 Spine 角色、退出程序。
- WebM 素材会在启动时扫描可见像素边界并缓存，减少透明区域对点击和定位的影响。
- 支持内置家具素材，WebM 的坐下和睡觉动作可以显示凳子或床。
- 支持将 `webm-assets/`、`spine-assets/` 和 `icon/` 一起打进安装包。

## 素材版权

- 本项目自带素材来源：鹰角网络。
- 本项目自带素材版权归鹰角网络所有。
- 本项目不主张拥有自带角色素材、动画素材及相关美术资源的版权，仅用于个人学习、桌面宠物展示与非商业用途。

## 目录

```text
Absolute protagonist
├─ icon/                 应用图标、托盘图标、安装包图标
├─ scripts/              打包脚本
├─ src/                  前端界面和桌宠逻辑
├─ src-tauri/            Tauri/Rust 桌面端逻辑
├─ webm-assets/          WebM 桌宠素材
│  └─ 绝对主角/
├─ spine-assets/         Spine 桌宠素材
├─ package.json
└─ README.md
```

默认 WebM 素材目录是：

```text
webm-assets/绝对主角/
```

## 开发启动

需要先安装 Node.js 和 Rust 工具链。

如果本机没有 Rust，可以先安装：

```powershell
winget install Rustlang.Rustup
```

安装依赖并启动：

```powershell
npm install
npm start
```

## 打包

生成 Windows exe 安装包：

```powershell
npm run package:installer
```

打包脚本会把运行需要的素材一起打进去，并尽量使用 Tauri/NSIS 的压缩能力减小安装包体积。

只查看会被打包的资源，不真正打包：

```powershell
npm run package:installer:dry-run
```

## 使用

- 左键按住桌宠可拖动。
- 单击桌宠触发互动。
- 双击桌宠触发特殊动作。
- 右键桌宠打开菜单。
- 在右键菜单的“设置”里可以调整桌宠大小、选择动作文件夹、恢复默认动作文件夹、切换内置 Spine 角色。

## WebM 素材

WebM 素材文件夹可以包含一个 `profile.json`，用于明确指定动作、台词和家具参数。如果没有 `profile.json`，程序会按文件名自动识别：

- `Sit`：坐下
- `Relax`：放松/待机
- `Sleep`：睡觉
- `Move`：移动
- `Interact`：互动
- 其他 `.webm`：特殊动作

示例：

```json
{
  "name": "Absolute protagonist",
  "renderer": "webm",
  "actions": {
    "sit": "角色-Sit.webm",
    "relax": "角色-Relax.webm",
    "sleep": "角色-Sleep.webm",
    "move": "角色-Move.webm",
    "interact": "角色-Interact.webm",
    "special": ["角色-Special-1.webm", "角色-Special-2.webm"]
  },
  "decorations": {
    "sit": {
      "enabled": true,
      "widthRatio": 0.48,
      "minWidth": 76,
      "maxWidth": 128,
      "bottomRatio": 0.012,
      "petLiftRatio": -0.13
    },
    "sleep": {
      "enabled": true,
      "widthRatio": 0.86,
      "minWidth": 154,
      "maxWidth": 224,
      "bottomRatio": -0.045,
      "petLiftRatio": -0.34
    }
  },
  "lines": {
    "daily": ["今天也要保持节奏。"],
    "interaction": ["嗯？我在。"],
    "special": ["特别演出时间。"],
    "walk": ["我去那边看看。"]
  }
}
```

`special` 可以是一个文件名，也可以是多个文件名。多个特殊动作会在触发时随机选择。

## Spine 素材

Spine 素材目录需要包含同一套角色的 `.skel`、`.atlas`、`.png` 文件。右键选择动作文件夹时，如果选择的是角色外层目录，程序会自动寻找第一个可用的 Spine 子目录。

Spine 的 `profile.json` 示例：

```json
{
  "name": "阿米娅",
  "renderer": "spine",
  "spine": {
    "skeleton": "build_char_002_amiya.skel",
    "atlas": "build_char_002_amiya.atlas",
    "image": "build_char_002_amiya.png",
    "scale": 0.52,
    "displayScale": 0.55
  },
  "actions": {
    "sit": "Idle",
    "relax": "Idle",
    "sleep": "Idle",
    "move": "Move",
    "interact": "Interact",
    "special": ["Skill", "Attack"]
  }
}
```

如果不写 `actions`，程序会根据动画名自动猜测 `Idle`、`Move`、`Interact`、`Skill` 等动作。

## 台词

内置台词在 `src/renderer.js`：

- `dailyLines`：日常碎碎念
- `interactionLines`：互动台词
- `specialLines`：特殊动作台词
- `walkLines`：移动台词

素材目录里的 `profile.json` 也可以通过 `lines` 覆盖对应台词。

## 说明

本项目是个人桌面宠物工具，项目名称已避免使用可能造成混淆的原作品名称。请勿将自带素材用于商业用途或其他可能侵犯原版权方权益的场景。
