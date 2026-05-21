(function () {
  const tauri = window.__TAURI__;

  if (!tauri?.core || !tauri?.event || !tauri?.window) {
    console.error('Tauri API is not available.');
    return;
  }

  const { invoke, convertFileSrc } = tauri.core;
  const { listen } = tauri.event;
  const {
    getCurrentWindow,
    primaryMonitor,
    monitorFromPoint,
    cursorPosition,
    PhysicalPosition
  } = tauri.window;

  const currentWindow = getCurrentWindow();
  let contentBounds = null;
  let dragState = null;

  function convertAssetFileSrc(filePath) {
    return convertFileSrc(filePath);
  }

  async function getWindowState() {
    const [position, size, scaleFactor] = await Promise.all([
      currentWindow.outerPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor()
    ]);
    const cssSize = physicalSizeToCss(size, scaleFactor);
    const effectiveBounds = getEffectiveContentBounds(cssSize);
    const monitor = await monitorFromContentBounds(position, effectiveBounds, scaleFactor);

    return {
      bounds: {
        x: position.x,
        y: position.y,
        width: cssSize.width,
        height: cssSize.height
      },
      scaleFactor,
      workArea: monitorToWorkArea(monitor, size),
      contentBounds: effectiveBounds
    };
  }

  async function monitorFromWindowBounds(position, size) {
    const center = {
      x: position.x + size.width / 2,
      y: position.y + size.height / 2
    };

    return (await monitorFromPoint(center.x, center.y)) || (await primaryMonitor());
  }

  async function monitorFromCursor() {
    const cursor = await cursorPosition();
    const monitor = (await monitorFromPoint(cursor.x, cursor.y)) || (await primaryMonitor());

    return { cursor, monitor };
  }

  async function monitorFromContentBounds(position, bounds, scaleFactor) {
    const center = {
      x: position.x + ((bounds.left + bounds.right) / 2) * scaleFactor,
      y: position.y + ((bounds.top + bounds.bottom) / 2) * scaleFactor
    };

    return (await monitorFromPoint(center.x, center.y)) || (await primaryMonitor());
  }

  function monitorToWorkArea(monitor, fallbackSize) {
    if (!monitor) {
      return {
        x: 0,
        y: 0,
        width: fallbackSize.width,
        height: fallbackSize.height
      };
    }

    return {
      x: monitor.workArea.position.x,
      y: monitor.workArea.position.y,
      width: monitor.workArea.size.width,
      height: monitor.workArea.size.height
    };
  }

  function getEffectiveContentBounds(size, nextContentBounds = contentBounds) {
    const fallback = {
      left: 0,
      top: 0,
      right: size.width,
      bottom: size.height,
      width: size.width,
      height: size.height
    };

    if (!nextContentBounds) return fallback;

    const left = clamp(nextContentBounds.left, 0, size.width);
    const top = clamp(nextContentBounds.top, 0, size.height);
    const right = clamp(nextContentBounds.right, left + 1, size.width);
    const bottom = clamp(nextContentBounds.bottom, top + 1, size.height);

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  async function setWindowPosition(position) {
    const [currentPosition, size, scaleFactor] = await Promise.all([
      currentWindow.outerPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor()
    ]);
    const cssSize = physicalSizeToCss(size, scaleFactor);
    const effectiveBounds = getEffectiveContentBounds(cssSize);
    const monitor = await monitorFromContentBounds(
      { x: position.x, y: position.y },
      effectiveBounds,
      scaleFactor
    );
    const workArea = monitorToWorkArea(monitor, size);
    const physicalBounds = scaleBounds(effectiveBounds, scaleFactor);
    const nextPosition = clampWindowPosition(position.x, position.y, workArea, physicalBounds);

    await currentWindow.setPosition(new PhysicalPosition(nextPosition.x, nextPosition.y));

    return {
      bounds: {
        x: nextPosition.x,
        y: nextPosition.y,
        width: cssSize.width,
        height: cssSize.height
      },
      scaleFactor,
      workArea,
      contentBounds: effectiveBounds
    };
  }

  async function beginDrag() {
    const [cursor, position, size, scaleFactor] = await Promise.all([
      cursorPosition(),
      currentWindow.outerPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor()
    ]);

    dragState = { cursor, position };
    return getWindowStateFromParts(position, size, scaleFactor);
  }

  async function dragWindow() {
    if (!dragState) return null;

    const [cursor, size, scaleFactor] = await Promise.all([
      cursorPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor()
    ]);
    const x = dragState.position.x + cursor.x - dragState.cursor.x;
    const y = dragState.position.y + cursor.y - dragState.cursor.y;
    const { monitor } = await monitorFromCursor();
    const workArea = monitorToWorkArea(monitor, size);
    const cssSize = physicalSizeToCss(size, scaleFactor);
    const effectiveBounds = getEffectiveContentBounds(cssSize);
    const physicalBounds = scaleBounds(effectiveBounds, scaleFactor);
    const nextPosition = clampWindowPosition(x, y, workArea, physicalBounds);

    await currentWindow.setPosition(new PhysicalPosition(nextPosition.x, nextPosition.y));

    return {
      bounds: {
        x: nextPosition.x,
        y: nextPosition.y,
        width: cssSize.width,
        height: cssSize.height
      },
      scaleFactor,
      workArea,
      contentBounds: effectiveBounds
    };
  }

  async function endDrag() {
    dragState = null;
    return getWindowState();
  }

  async function getCursorClientPoint() {
    const [cursor, position, scaleFactor] = await Promise.all([
      cursorPosition(),
      currentWindow.outerPosition(),
      currentWindow.scaleFactor()
    ]);

    return {
      x: (cursor.x - position.x) / scaleFactor,
      y: (cursor.y - position.y) / scaleFactor
    };
  }

  async function setContentBounds(bounds) {
    const [position, size, scaleFactor] = await Promise.all([
      currentWindow.outerPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor()
    ]);
    const cssSize = physicalSizeToCss(size, scaleFactor);
    contentBounds = normalizeContentBounds(bounds, cssSize);

    const effectiveBounds = getEffectiveContentBounds(cssSize, contentBounds);
    const monitor = await monitorFromContentBounds(position, effectiveBounds, scaleFactor);
    const workArea = monitorToWorkArea(monitor, size);
    const physicalBounds = scaleBounds(effectiveBounds, scaleFactor);
    const nextPosition = clampWindowPosition(position.x, position.y, workArea, physicalBounds);

    if (nextPosition.x !== position.x || nextPosition.y !== position.y) {
      await currentWindow.setPosition(new PhysicalPosition(nextPosition.x, nextPosition.y));
    }

    return {
      bounds: {
        x: nextPosition.x,
        y: nextPosition.y,
        width: cssSize.width,
        height: cssSize.height
      },
      scaleFactor,
      workArea,
      contentBounds: effectiveBounds
    };
  }

  function getWindowStateFromParts(position, size, scaleFactor) {
    const cssSize = physicalSizeToCss(size, scaleFactor);
    const effectiveBounds = getEffectiveContentBounds(cssSize);

    return monitorFromContentBounds(position, effectiveBounds, scaleFactor).then((monitor) => ({
      bounds: {
        x: position.x,
        y: position.y,
        width: cssSize.width,
        height: cssSize.height
      },
      scaleFactor,
      workArea: monitorToWorkArea(monitor, size),
      contentBounds: effectiveBounds
    }));
  }

  function physicalSizeToCss(size, scaleFactor) {
    return {
      width: size.width / scaleFactor,
      height: size.height / scaleFactor
    };
  }

  function scaleBounds(bounds, scaleFactor) {
    return {
      left: bounds.left * scaleFactor,
      top: bounds.top * scaleFactor,
      right: bounds.right * scaleFactor,
      bottom: bounds.bottom * scaleFactor,
      width: bounds.width * scaleFactor,
      height: bounds.height * scaleFactor
    };
  }

  function normalizeContentBounds(bounds, size) {
    if (!bounds) return null;

    const left = clamp(Math.round(bounds.left), 0, size.width);
    const top = clamp(Math.round(bounds.top), 0, size.height);
    const right = clamp(Math.round(bounds.right), left + 1, size.width);
    const bottom = clamp(Math.round(bounds.bottom), top + 1, size.height);

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  function clampWindowPosition(x, y, workArea, effectiveBounds) {
    const minX = workArea.x - effectiveBounds.left;
    const minY = workArea.y - effectiveBounds.top;
    const maxX = workArea.x + workArea.width - effectiveBounds.right;
    const maxY = workArea.y + workArea.height - effectiveBounds.bottom;

    return {
      x: Math.round(clamp(x, minX, maxX)),
      y: Math.round(clamp(y, minY, maxY))
    };
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
  }

  function onEvent(eventName, callback) {
    listen(eventName, (event) => callback(event.payload));
  }

  window.desktopPet = {
    showMenu: () => invoke('show_menu'),
    chooseAssetFolder: () => invoke('choose_asset_folder'),
    resetAssetFolder: () => invoke('reset_asset_folder'),
    setMouseEventsIgnored: (ignored) => currentWindow.setIgnoreCursorEvents(ignored),
    getAssets: () => invoke('get_assets'),
    readAssetFile: (fileName) => invoke('read_asset_file', { fileName }),
    getWindowState,
    setWindowPosition,
    setContentBounds,
    beginDrag,
    dragWindow,
    endDrag,
    getCursorClientPoint,
    convertAssetFileSrc,
    onSetAction: (callback) => onEvent('pet:set-action', callback),
    onSayRandom: (callback) => onEvent('pet:say-random', callback),
    onAssetsChanged: (callback) => onEvent('pet:assets-changed', callback)
  };
})();
