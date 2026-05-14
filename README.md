# 维什戴尔桌面宠物

一个基于 Electron 的 PC 端透明桌面宠物，会使用 `assets/` 里的 WebM 动作素材，并随机说一些日常碎碎念。

## 启动

```powershell
npm install
npm start
```

如果 Electron 下载很慢，可以临时使用国内镜像：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

## 操作

- 拖动角色区域可以移动桌宠。
- 单击角色会触发互动动作。
- 双击角色会触发特别动作。
- 右键桌宠或点击右上角菜单可以切换动作、说一句话、置顶或退出。

## 修改碎碎念

台词在 `src/renderer.js` 里：

- `dailyLines`：日常随机碎碎念
- `interactionLines`：单击互动台词
- `specialLines`：双击特别动作台词
