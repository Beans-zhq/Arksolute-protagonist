# Absolute protagonist

一个基于 Tauri 的 Windows 透明桌面宠物，会使用 `assets/` 里的 WebM 动作素材，并随机说一些日常碎碎念。

## 启动

需要先安装 Node.js 和 Rust 工具链。

如果命令行提示找不到 `cargo`，先安装 Rust：

```powershell
winget install Rustlang.Rustup
```

```powershell
npm install
npm start
```

## 打包

```powershell
npm run package:installer
```

## 操作

- 拖动角色区域可以移动桌宠。
- 单击角色会触发互动动作。
- 双击角色会触发特别动作。
- 右键桌宠可以切换动作、说一句话、置顶、选择动作文件夹或退出。

## 角色配置

动作文件夹可以放一个可选的 `profile.json`，用于明确指定动作文件、台词和家具位置。没有这个文件时，程序仍会按文件名里的 `Sit`、`Relax`、`Sleep`、`Move`、`Interact` 自动识别基础动作，其余 `.webm` 会作为特别动作。

示例：

```json
{
  "name": "Absolute protagonist",
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

`special` 可以写一个文件名，也可以写多个文件名；触发特别动作时会随机选一个。`lines` 里的数组为空或不写时，会使用程序内置台词。

程序会按动作文件的文件名、大小和修改时间缓存可见边界，素材没变化时下次启动会直接复用缓存，减少启动时的扫描开销。

## 修改碎碎念

台词在 `src/renderer.js` 里：

- `dailyLines`：日常随机碎碎念
- `interactionLines`：单击互动台词
- `specialLines`：双击特别动作台词
