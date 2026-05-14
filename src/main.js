const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require('electron');
const path = require('node:path');

let mainWindow;
let tray;
let lockedOnTop = true;

const ACTIONS = ['sit', 'relax', 'sleep', 'move', 'interact', 'special'];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 280,
    height: 340,
    minWidth: 220,
    minHeight: 260,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: lockedOnTop,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(lockedOnTop, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendToPet(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: lockedOnTop ? '取消置顶' : '窗口置顶',
      click: () => {
        lockedOnTop = !lockedOnTop;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(lockedOnTop, 'screen-saver');
        }
        if (tray) tray.setContextMenu(buildContextMenu());
      }
    },
    { type: 'separator' },
    ...ACTIONS.map((action) => ({
      label: actionLabel(action),
      click: () => sendToPet('pet:set-action', action)
    })),
    { type: 'separator' },
    {
      label: '说点什么',
      click: () => sendToPet('pet:say-random')
    },
    {
      label: '休息一下',
      click: () => sendToPet('pet:set-action', 'sleep')
    },
    { type: 'separator' },
    {
      label: '退出桌宠',
      click: () => app.quit()
    }
  ]);
}

function actionLabel(action) {
  const labels = {
    sit: '坐下',
    relax: '放松',
    sleep: '睡觉',
    move: '活动',
    interact: '互动',
    special: '特别动作'
  };
  return labels[action] || action;
}

app.whenReady().then(() => {
  createMainWindow();

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray-icon.svg')));
  tray.setToolTip('维什戴尔桌面宠物');
  tray.setContextMenu(buildContextMenu());
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

ipcMain.handle('pet:show-menu', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  buildContextMenu().popup({ window: mainWindow });
});

ipcMain.handle('pet:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});
