const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow;
let tray;
let lockedOnTop = true;
let dragState = null;
let contentBounds = null;
let ignoringMouseEvents = false;
let customAssetRootPath = null;

const ACTIONS = ['sit', 'relax', 'sleep', 'move', 'interact', 'special'];
const WINDOW_SIZE = {
  width: 320,
  height: 392
};
const settingsFileName = 'settings.json';

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
    icon: getIconPath('png'),
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

function getSettingsPath() {
  return path.join(app.getPath('userData'), settingsFileName);
}

function loadSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
    if (typeof settings.assetRootPath === 'string' && isDirectory(settings.assetRootPath)) {
      customAssetRootPath = settings.assetRootPath;
    }
  } catch {
    customAssetRootPath = null;
  }
}

function saveSettings() {
  try {
    const settingsPath = getSettingsPath();
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify({ assetRootPath: customAssetRootPath }, null, 2), 'utf8');
  } catch {
    // ignore settings write failures
  }
}

function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function getDefaultAssetRootPath() {
  const candidates = [
    path.resolve(app.getAppPath(), 'assets'),
    path.resolve(app.getAppPath(), '..', 'assets'),
    path.resolve(app.getAppPath(), '..', '..', 'assets'),
    path.resolve(process.cwd(), 'assets')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function getAssetRootPath() {
  if (customAssetRootPath && isDirectory(customAssetRootPath)) {
    return customAssetRootPath;
  }

  return getDefaultAssetRootPath();
}

function getAssetFiles(assetRootPath = getAssetRootPath()) {
  if (!isDirectory(assetRootPath)) return [];

  try {
    return fs
      .readdirSync(assetRootPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.webm'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function getAssetBundle() {
  const rootPath = getAssetRootPath();

  return {
    rootPath,
    rootUrl: pathToFileURL(rootPath + path.sep).href,
    files: getAssetFiles(rootPath),
    isCustom: customAssetRootPath === rootPath
  };
}

function getAssetFolderLabel() {
  const rootPath = getAssetRootPath();
  if (!customAssetRootPath || customAssetRootPath !== rootPath) return '内置 assets';
  return path.basename(rootPath) || rootPath;
}

async function chooseAssetFolder() {
  const options = {
    title: '选择动作文件夹',
    buttonLabel: '选择此文件夹',
    defaultPath: getAssetRootPath(),
    properties: ['openDirectory']
  };
  const result =
    mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return;

  const nextRootPath = result.filePaths[0];
  const files = getAssetFiles(nextRootPath);

  if (files.length === 0) {
    const messageOptions = {
      type: 'warning',
      title: '没有找到动作文件',
      message: '这个文件夹里没有 .webm 动作文件。',
      detail: '请选择包含 WebM 动作资源的文件夹。'
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, messageOptions);
    } else {
      await dialog.showMessageBox(messageOptions);
    }
    return;
  }

  customAssetRootPath = nextRootPath;
  saveSettings();
  notifyAssetBundleChanged();
  if (tray) tray.setContextMenu(buildContextMenu());
}

function resetAssetFolder() {
  customAssetRootPath = null;
  saveSettings();
  notifyAssetBundleChanged();
  if (tray) tray.setContextMenu(buildContextMenu());
}

function notifyAssetBundleChanged() {
  sendToPet('pet:assets-changed', getAssetBundle());
}

function getIconPath(extension = 'png') {
  const candidates = [
    path.resolve(app.getAppPath(), 'icon', `icon.${extension}`),
    path.resolve(app.getAppPath(), '..', 'icon', `icon.${extension}`),
    path.resolve(app.getAppPath(), '..', '..', 'icon', `icon.${extension}`),
    path.resolve(process.cwd(), 'icon', `icon.${extension}`)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function setMouseEventsIgnored(ignored) {
  if (!mainWindow || mainWindow.isDestroyed() || ignoringMouseEvents === ignored) return;

  ignoringMouseEvents = ignored;
  mainWindow.setIgnoreMouseEvents(ignored, { forward: true });
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
    {
      label: '设置',
      submenu: [
        {
          label: '选择动作文件夹...',
          click: () => {
            chooseAssetFolder();
          }
        },
        {
          label: '恢复默认动作文件夹',
          enabled: Boolean(customAssetRootPath),
          click: resetAssetFolder
        },
        { type: 'separator' },
        {
          label: `当前动作文件夹：${getAssetFolderLabel()}`,
          enabled: false
        }
      ]
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
  loadSettings();
  createMainWindow();

  tray = new Tray(nativeImage.createFromPath(getIconPath('png')));
  tray.setToolTip('Absolute protagonist');
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

ipcMain.handle('pet:set-mouse-events-ignored', (_event, ignored) => {
  setMouseEventsIgnored(Boolean(ignored));
});

ipcMain.handle('pet:get-asset-root-url', () => pathToFileURL(getAssetRootPath() + path.sep).href);

ipcMain.handle('pet:get-asset-files', () => getAssetFiles());

ipcMain.handle('pet:get-assets', () => getAssetBundle());

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
