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

## 修改碎碎念

台词在 `src/renderer.js` 里：

- `dailyLines`：日常随机碎碎念
- `interactionLines`：单击互动台词
- `specialLines`：双击特别动作台词
