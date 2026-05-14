const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } = require('electron');
const path = require('node:path');

let mainWindow;
let tray;
let lockedOnTop = true;
let dragState = null;
let contentBounds = null;

const ACTIONS = ['sit', 'relax', 'sleep', 'move', 'interact', 'special'];
const WINDOW_SIZE = {
  width: 320,
  height: 392
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
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

  placeWindowOnDesktop();
  mainWindow.setAlwaysOnTop(lockedOnTop, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function placeWindowOnDesktop() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const bounds = mainWindow.getBounds();
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + workArea.width - bounds.width - 64;
  const y = workArea.y + workArea.height - bounds.height - 18;
  const position = clampWindowPosition(x, y, bounds, null, null);

  mainWindow.setPosition(position.x, position.y, false);
}

function sendToPet(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function getWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const bounds = mainWindow.getBounds();
  const workArea = getWorkAreaForBounds(bounds);

  return {
    bounds,
    workArea,
    contentBounds: getEffectiveContentBounds(bounds)
  };
}

function getWorkAreaForBounds(bounds) {
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  return screen.getDisplayNearestPoint(center).workArea;
}

function getWorkAreaForPoint(point) {
  return screen.getDisplayNearestPoint(point).workArea;
}

function getEffectiveContentBounds(bounds) {
  const fallback = {
    left: 0,
    top: 0,
    right: bounds.width,
    bottom: bounds.height,
    width: bounds.width,
    height: bounds.height
  };

  if (!contentBounds) return fallback;

  return {
    left: clamp(contentBounds.left, 0, bounds.width),
    top: clamp(contentBounds.top, 0, bounds.height),
    right: clamp(contentBounds.right, 0, bounds.width),
    bottom: clamp(contentBounds.bottom, 0, bounds.height),
    width: clamp(contentBounds.width, 1, bounds.width),
    height: clamp(contentBounds.height, 1, bounds.height)
  };
}

function clampWindowPosition(x, y, bounds, point, nextContentBounds = contentBounds) {
  const workArea = point ? getWorkAreaForPoint(point) : getWorkAreaForBounds({ ...bounds, x, y });
  const effectiveBounds = nextContentBounds || {
    left: 0,
    top: 0,
    right: bounds.width,
    bottom: bounds.height
  };
  const minX = workArea.x - effectiveBounds.left;
  const minY = workArea.y - effectiveBounds.top;
  const maxX = workArea.x + workArea.width - effectiveBounds.right;
  const maxY = workArea.y + workArea.height - effectiveBounds.bottom;

  return {
    x: Math.round(clamp(x, minX, maxX)),
    y: Math.round(clamp(y, minY, maxY))
  };
}

function normalizeContentBounds(bounds, windowBounds) {
  if (!bounds) return null;

  const left = clamp(Math.round(bounds.left), 0, windowBounds.width);
  const top = clamp(Math.round(bounds.top), 0, windowBounds.height);
  const right = clamp(Math.round(bounds.right), left + 1, windowBounds.width);
  const bottom = clamp(Math.round(bounds.bottom), top + 1, windowBounds.height);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
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

ipcMain.handle('pet:get-window-state', () => getWindowState());

ipcMain.handle('pet:set-window-position', (_event, position) => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const bounds = mainWindow.getBounds();
  const nextPosition = clampWindowPosition(position.x, position.y, bounds);
  mainWindow.setPosition(nextPosition.x, nextPosition.y, false);

  return getWindowState();
});

ipcMain.handle('pet:begin-drag', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  dragState = {
    cursor: screen.getCursorScreenPoint(),
    bounds: mainWindow.getBounds()
  };

  return getWindowState();
});

ipcMain.handle('pet:drag-window', () => {
  if (!mainWindow || mainWindow.isDestroyed() || !dragState) return null;

  const cursor = screen.getCursorScreenPoint();
  const nextX = dragState.bounds.x + cursor.x - dragState.cursor.x;
  const nextY = dragState.bounds.y + cursor.y - dragState.cursor.y;
  const nextPosition = clampWindowPosition(nextX, nextY, dragState.bounds, cursor);

  mainWindow.setPosition(nextPosition.x, nextPosition.y, false);

  return getWindowState();
});

ipcMain.handle('pet:end-drag', () => {
  dragState = null;
  return getWindowState();
});

ipcMain.handle('pet:set-content-bounds', (_event, bounds) => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const windowBounds = mainWindow.getBounds();
  contentBounds = normalizeContentBounds(bounds, windowBounds);
  const nextPosition = clampWindowPosition(windowBounds.x, windowBounds.y, windowBounds, null, contentBounds);

  if (nextPosition.x !== windowBounds.x || nextPosition.y !== windowBounds.y) {
    mainWindow.setPosition(nextPosition.x, nextPosition.y, false);
  }

  return getWindowState();
});
