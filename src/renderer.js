const video = document.getElementById('petVideo');
const petViewport = document.getElementById('petViewport');
const stool = document.getElementById('sitStool');
const bed = document.getElementById('sleepBed');
const bubble = document.getElementById('bubble');
const dragRegion = document.getElementById('dragRegion');

const baseActionNames = {
  sit: 'Sit',
  relax: 'Relax',
  sleep: 'Sleep',
  move: 'Move',
  interact: 'Interact'
};

const defaultAssetFiles = {
  sit: '维什戴尔-绝对主角-基建-Sit-x1.webm',
  relax: '维什戴尔-绝对主角-基建-Relax-x1.webm',
  sleep: '维什戴尔-绝对主角-基建-Sleep-x1.webm',
  move: '维什戴尔-绝对主角-基建-Move-x1.webm',
  interact: '维什戴尔-绝对主角-基建-Interact-x1.webm'
};
const defaultSpecialAssetFiles = ['维什戴尔-绝对主角-基建-Special-x1.webm'];

let assetFiles = { ...defaultAssetFiles };

let assetRootPath = null;
let specialAssetFiles = [...defaultSpecialAssetFiles];

const temporaryActions = new Set(['interact', 'special']);

const dailyLines = [
  '博士，今天的理智还够用吗？',
  '我在这儿。别把待办事项堆到明天。',
  '窗外看起来很适合摸鱼，当然，我只是客观描述。',
  '喝口水吧。战术规划也需要补给。',
  '文件可以晚点整理，但保存一定要现在点。',
  '你刚才那个思路不错，继续推一小步试试。',
  '今天也要把麻烦处理得漂亮一点。',
  '休息五分钟，不算撤退，算战术调整。',
  '如果困了，我可以先替你盯着桌面。',
  '别担心，进度条会动，事情也会过去。',
  '有新的任务吗？我已经准备好围观了。',
  '这份沉默很有压迫感，适合专心工作。',
  '博士，要不要先从最小的一件事开始？',
  '现在的状态：看似发呆，实则严密警戒。',
  '别忘了把重要的东西备份。真的，别忘。',
  '要是有难题，把它拆小一点，再拆小一点。',
  '我刚刚路过任务栏，那里没有新的奇迹。',
  '这台电脑的风声听起来像在赶工。',
  '博士，别盯太久屏幕，眼睛也需要撤离路线。',
  '今天的作战目标：至少完成一件真的有用的事。',
  '如果你在等灵感，它可能已经在路上堵住了。',
  '先保存，再冒险。这不是胆小，是经验。',
  '我会在这里巡逻。可疑窗口，一个都别想跑。',
  '你负责推进计划，我负责增加一点存在感。',
  '桌面很宽，适合散步，也适合假装忙碌。',
  '别急，复杂的事情本来就需要几轮试探。',
  '咖啡不是治疗法术，但有时候很像。',
  '我刚才认真想了想，结论是：可以再休息一分钟。',
  '今天也把混乱压成清单吧。',
  '如果任务太多，先抓住最会添乱的那个。',
  '我看见你切窗口了。放心，我不记仇。',
  '这个计划听起来可行，至少比发呆可行。',
  '博士，桌面不是仓库，虽然它经常被这么使用。',
  '保持节奏。快一点慢一点都可以，别停太久。',
  '我会自己走走，不打扰你太久。',
  '需要提醒的话，我可以装作很严肃。',
  '这不是偷懒，是短暂维护系统稳定。',
  '好消息：你还在推进。坏消息：文件名还可以更清楚。',
  '我不负责写报告，但我负责监督你写报告。',
  '今天的窗口数量很有战术纵深。',
  '博士，你的鼠标路线刚才很犹豫。',
  '整理一下桌面吧。不是现在也行，但总得有一天。',
  '有些 bug 不会自己消失，但会在重启后换个姿势。',
  '我在。你继续。',
  '今天的节奏挺稳，别自己先急。',
  '一口气做完很爽，但慢一点也能到。',
  '先把最烦的那件事解决掉，后面会轻很多。',
  '要是卡住了，换个角度，不用硬顶。',
  '你已经开始了，这就比拖着强。',
  '桌面这么安静，正适合认真一下。',
  '可以稍微偷懒，但别把节奏丢了。',
  '今天的任务看起来多，其实一件件来就好。',
  '我觉得你现在只差一个开始。',
  '别怕出错，改正比犹豫更快。',
  '如果想休息，记得是真的休息，不是发呆。',
  '我会继续看着这边，你先忙你的。'
];

const interactionLines = [
  '嗯？找我有什么事？',
  '别突然点我，我会认真回应的。',
  '互动确认。今天的博士也很忙。',
  '收到，注意力已经分给你一点了。',
  '点到了。然后呢，博士？',
  '我还以为你要交代新的任务。',
  '手感确认：桌宠仍在正常运行。',
  '你这样会打断我的巡逻路线。',
  '我听见了，不用点第二下。',
  '嗯，我在。',
  '确认收到。还有别的指令吗？',
  '这次找我，是想聊什么？',
  '我已经转过来了，继续说。',
  '别急，先把话说完。',
  '刚刚那一下我记住了。',
  '我会认真听的，你放心。'
];

const specialLines = [
  '既然你想看，那就稍微认真一点。',
  '特别演出时间。别眨眼。',
  '主角登场，总要有点仪式感。',
  '这个动作可不是随便给人看的。',
  '好吧，就当是给今天加点士气。',
  '记住，这叫专业，不叫花哨。',
  '既然都看到了，那就顺便鼓个劲。',
  '这一下算是额外的营业时间。',
  '别笑，真的很有气势。',
  '动作做完了，继续干正事吧。'
];

const walkLines = [
  '巡逻开始。',
  '我去那边看看。',
  '桌面路线确认。',
  '稍微活动一下。',
  '让开一点，我要经过。',
  '屏幕边界也归我检查。',
  '这边似乎更适合站岗。',
  '不用管我，我自己走走。',
  '我去前面探探路，很快回来。',
  '巡逻半圈，看看有没有偷懒的窗口。',
  '这边风平浪静，暂时安全。',
  '我换个位置，不影响你。',
  '路过一下，别太想我。',
  '走动一下，脑子也能清醒一点。'
];

let currentAction = 'sit';
let idleTimer;
let talkTimer;
let bubbleTimer;
let temporaryTimer;
let roamTimer;
let roamFrame;
let roamState = null;
let windowState = null;
let isDragging = false;
let dragMoved = false;
let dragFrame = null;
let lastPointerDown = null;
let dragStartBounds = null;
let lastDirection = 0;
let clickTimer = null;
let suppressNextClick = false;
let assetMetrics = new Map();
let currentMetrics = null;
let mouseEventsIgnored = false;
let mousePollTimer = null;
let mousePollInFlight = false;
let isRoaming = false;
let currentAssetFile = assetFiles.sit;
let assetUrls = new Map();
let actionLoadToken = 0;
let bundleLoadToken = 0;

const clickThreshold = 5;
const dragSampleMs = 16;
const visibleAlphaThreshold = 24;
const measurementSampleCount = 5;
const measurementCropPadding = 3;
const measurementSeekTimeoutMs = 900;
const mousePollMs = 40;
const bubbleGap = 2;

function configureAssetFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return false;

  const nextAssetFiles = {};
  const nextSpecialAssetFiles = [];

  for (const file of files) {
    if (typeof file !== 'string' || !file.toLowerCase().endsWith('.webm')) continue;

    const baseAction = getBaseActionFromAssetFile(file);

    if (baseAction) {
      nextAssetFiles[baseAction] = file;
    } else {
      nextSpecialAssetFiles.push(file);
    }
  }

  assetFiles = nextAssetFiles;
  specialAssetFiles = nextSpecialAssetFiles;
  return true;
}

function getBaseActionFromAssetFile(file) {
  const stem = file.replace(/\.webm$/i, '');

  for (const [action, assetName] of Object.entries(baseActionNames)) {
    const pattern = new RegExp(`(^|[-_\\s])${assetName}($|[-_\\s])`, 'i');
    if (pattern.test(stem)) return action;
  }

  return null;
}

function getAssetFileForAction(action) {
  if (action === 'special') return randomFrom(specialAssetFiles);
  return assetFiles[action];
}

async function createAssetUrl(assetFile) {
  if (window.desktopPet?.readAssetFile) {
    const bytes = await window.desktopPet.readAssetFile(assetFile);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'video/webm' });
    return URL.createObjectURL(blob);
  }

  if (!assetRootPath || !window.desktopPet?.convertAssetFileSrc) {
    return `../assets/${encodeURIComponent(assetFile)}`;
  }

  const separator = assetRootPath.endsWith('\\') || assetRootPath.endsWith('/') ? '' : '\\';
  return window.desktopPet.convertAssetFileSrc(`${assetRootPath}${separator}${assetFile}`);
}

async function getAssetUrl(assetFile) {
  if (assetUrls.has(assetFile)) return assetUrls.get(assetFile);

  const assetUrl = await createAssetUrl(assetFile);
  assetUrls.set(assetFile, assetUrl);
  return assetUrl;
}

function revokeAssetUrls() {
  for (const assetUrl of assetUrls.values()) {
    if (assetUrl.startsWith('blob:')) URL.revokeObjectURL(assetUrl);
  }

  assetUrls = new Map();
}

function getFallbackAction() {
  return ['sit', 'relax', 'sleep', 'move', 'interact'].find((action) => assetFiles[action]) || null;
}

function getIdleActions() {
  const preferredActions = ['sit', 'relax'].filter((action) => assetFiles[action]);
  if (preferredActions.length > 0) return preferredActions;

  const stableActions = Object.keys(assetFiles).filter((action) => !temporaryActions.has(action));
  return stableActions.length > 0 ? stableActions : Object.keys(assetFiles);
}

async function applyAssetBundle(bundle) {
  if (!bundle || !configureAssetFiles(bundle.files)) return false;

  const loadToken = bundleLoadToken + 1;
  bundleLoadToken = loadToken;
  assetRootPath = bundle.rootPath;
  currentAssetFile = null;
  currentMetrics = null;
  assetMetrics = new Map();
  revokeAssetUrls();
  setMouseEventsIgnored(true);

  await preloadAssetMetrics(bundle.files, loadToken);
  if (loadToken !== bundleLoadToken) return false;

  const nextAction = assetFiles[currentAction] ? currentAction : getFallbackAction();
  if (nextAction) {
    await setAction(nextAction, { restart: true });
  }

  return true;
}

async function setAction(action, options = {}) {
  const assetFile = getAssetFileForAction(action);
  if (!assetFile) return;

  const loadToken = actionLoadToken + 1;
  actionLoadToken = loadToken;
  const metrics = assetMetrics.get(assetFile);
  if (!metrics) return;

  const sameAction = currentAction === action;
  const sameAsset = currentAssetFile === assetFile;
  currentAction = action;
  currentAssetFile = assetFile;
  currentMetrics = metrics;
  document.documentElement.dataset.action = action;
  applyAssetMetrics(metrics);

  let nextAssetUrl;
  try {
    nextAssetUrl = await getAssetUrl(assetFile);
  } catch {
    return;
  }

  if (loadToken !== actionLoadToken) {
    return;
  }

  video.src = nextAssetUrl;
  video.loop = !temporaryActions.has(action);

  if (sameAction && (options.restart || (action === 'special' && sameAsset))) {
    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      // ignore
    }
    video.load();
  }

  try {
    await video.play();
  } catch {
    // Autoplay can be delayed until the element is ready.
  }

  updateContentBounds();
  refreshMouseHitTestFromCursor();

  window.clearTimeout(temporaryTimer);
  if (temporaryActions.has(action)) {
    temporaryTimer = window.setTimeout(() => {
      setAction(randomFrom(getIdleActions()));
    }, options.duration || (action === 'special' ? 7600 : 3400));
  }
}

function setDirection(direction) {
  const nextDirection = direction < 0 ? -1 : 1;
  if (nextDirection === lastDirection) return;

  lastDirection = nextDirection;
  document.documentElement.dataset.direction = nextDirection < 0 ? 'left' : 'right';
  updateContentBounds();
}

function say(text, duration = 5200) {
  bubble.textContent = formatBubbleText(text);
  updateContentBounds();
  bubble.classList.add('is-visible');
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => {
    bubble.classList.remove('is-visible');
  }, duration);
}

function sayRandom() {
  say(randomFrom(dailyLines));
}

function scheduleIdleAction() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (!isRoaming && !temporaryActions.has(currentAction)) {
      setAction(randomFrom(getIdleActions()));
    }
    scheduleIdleAction();
  }, randomBetween(18000, 42000));
}

function scheduleTalking() {
  window.clearTimeout(talkTimer);
  talkTimer = window.setTimeout(() => {
    if (!isDragging) sayRandom();
    scheduleTalking();
  }, randomBetween(16000, 42000));
}

function scheduleRoaming(delay = randomBetween(5000, 13000)) {
  window.clearTimeout(roamTimer);
  roamTimer = window.setTimeout(() => {
    startRoaming();
  }, delay);
}

async function startRoaming(options = {}) {
  if (isDragging || (!options.force && temporaryActions.has(currentAction))) {
    scheduleRoaming(randomBetween(2400, 5200));
    return;
  }

  isRoaming = true;
  windowState = await window.desktopPet.getWindowState();
  if (!windowState) {
    isRoaming = false;
    scheduleRoaming();
    return;
  }

  const { bounds, workArea, contentBounds } = windowState;
  const minX = workArea.x - contentBounds.left;
  const maxX = workArea.x + workArea.width - contentBounds.right;
  const usableWidth = Math.max(0, maxX - minX);

  if (usableWidth < 32) {
    isRoaming = false;
    scheduleRoaming(randomBetween(9000, 16000));
    return;
  }

  const distance = randomBetween(160, Math.min(520, Math.floor(usableWidth)));
  const preferredDirection = Math.random() > 0.5 ? 1 : -1;
  let targetX = bounds.x + distance * preferredDirection;

  if (targetX <= minX + 8 || targetX >= maxX - 8) {
    targetX = bounds.x - distance * preferredDirection;
  }

  targetX = clamp(targetX, minX, maxX);

  if (Math.abs(targetX - bounds.x) < 48) {
    isRoaming = false;
    scheduleRoaming(randomBetween(4200, 8000));
    return;
  }

  const direction = targetX > bounds.x ? 1 : -1;
  const speed = randomBetween(70, 120) / 1000;

  roamState = {
    startX: bounds.x,
    y: bounds.y,
    targetX,
    direction,
    speed,
    lastTime: performance.now()
  };

  setDirection(direction);
  setAction('move', { restart: true });
  if (Math.random() > 0.38) say(randomFrom(walkLines), 2600);
  animateRoaming();
}

async function animateRoaming(time = performance.now()) {
  if (!roamState || isDragging) return;

  const elapsed = Math.min(48, time - roamState.lastTime);
  roamState.lastTime = time;

  const currentState = await window.desktopPet.getWindowState();
  if (!currentState) {
    stopRoaming();
    return;
  }

  const currentX = currentState.bounds.x;
  const remaining = roamState.targetX - currentX;
  const step = Math.sign(remaining) * roamState.speed * elapsed;
  const nextX = Math.abs(step) >= Math.abs(remaining) ? roamState.targetX : currentX + step;
  const nextState = await window.desktopPet.setWindowPosition({ x: nextX, y: roamState.y });

  if (nextState) {
    windowState = nextState;
    const { bounds, workArea, contentBounds } = nextState;
    const minX = workArea.x - contentBounds.left;
    const maxX = workArea.x + workArea.width - contentBounds.right;
    const hitEdge = bounds.x <= minX + 1 || bounds.x >= maxX - 1;

    if (Math.abs(bounds.x - roamState.targetX) <= 2 || hitEdge) {
      stopRoaming();
      settleAfterRoam(hitEdge);
      return;
    }
  }

  roamFrame = window.requestAnimationFrame(animateRoaming);
}

function stopRoaming() {
  window.cancelAnimationFrame(roamFrame);
  roamFrame = null;
  roamState = null;
  isRoaming = false;
}

function settleAfterRoam(hitEdge = false) {
  isRoaming = false;
  setAction(randomFrom(getIdleActions()));
  if (hitEdge && Math.random() > 0.35) {
    say('到边界了。看来桌面也有尽头。', 3200);
  }
  scheduleRoaming(randomBetween(5000, 14000));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatBubbleText(text) {
  const chars = Array.from(text);
  const maxLineChars = chars.length > 22 ? 16 : 18;
  const lines = [];
  let line = '';

  for (const char of chars) {
    line += char;
    if (line.length >= maxLineChars && /[，。！？、,.!?]/.test(char)) {
      lines.push(line);
      line = '';
      continue;
    }

    if (line.length >= maxLineChars + 2) {
      lines.push(line);
      line = '';
    }
  }

  if (line) lines.push(line);
  return lines.join('\n');
}

async function preloadAssetMetrics(files, loadToken) {
  const webmFiles = files.filter((file) => typeof file === 'string' && file.toLowerCase().endsWith('.webm'));

  for (const file of webmFiles) {
    if (loadToken !== bundleLoadToken) return;
    if (assetMetrics.has(file)) continue;

    try {
      const metrics = await measureAssetMetrics(file);
      if (loadToken === bundleLoadToken) assetMetrics.set(file, metrics);
    } catch {
      // Invalid or unreadable assets are ignored; actions without metrics are not selected.
    }

    await yieldToBrowser();
  }
}

async function measureAssetMetrics(assetFile) {
  const assetUrl = await getAssetUrl(assetFile);
  const probe = document.createElement('video');
  probe.muted = true;
  probe.preload = 'auto';
  probe.playsInline = true;
  probe.src = assetUrl;

  await waitForVideoMetadata(probe);

  const width = probe.videoWidth;
  const height = probe.videoHeight;
  if (!width || !height) throw new Error('Video dimensions are unavailable.');

  const duration = Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 0;
  const sampleTimes = getMeasurementSampleTimes(duration);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable.');

  let unionBounds = null;

  for (const time of sampleTimes) {
    await seekVideoFrame(probe, time);
    context.clearRect(0, 0, width, height);
    context.drawImage(probe, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const bounds = scanVisibleBounds(frame.data, width, height);
    if (bounds) unionBounds = unionBounds ? unionBoundsWith(unionBounds, bounds) : bounds;
    await yieldToBrowser();
  }

  if (!unionBounds) {
    unionBounds = { left: 0, top: 0, right: width - 1, bottom: height - 1 };
  }

  unionBounds = expandBounds(unionBounds, width, height, measurementCropPadding);

  const crop = {
    left: unionBounds.left,
    top: unionBounds.top,
    right: unionBounds.right + 1,
    bottom: unionBounds.bottom + 1
  };
  const cropWidth = Math.max(1, crop.right - crop.left);
  const cropHeight = Math.max(1, crop.bottom - crop.top);

  return {
    file: assetFile,
    videoWidth: width,
    videoHeight: height,
    crop,
    cropWidth,
    cropHeight,
    anchor: {
      x: cropWidth / 2,
      y: 0
    }
  };
}

function waitForVideoMetadata(probe) {
  if (probe.readyState >= 1 && probe.videoWidth && probe.videoHeight) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      probe.removeEventListener('loadedmetadata', onLoaded);
      probe.removeEventListener('error', onError);
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video metadata failed to load.'));
    };

    probe.addEventListener('loadedmetadata', onLoaded, { once: true });
    probe.addEventListener('error', onError, { once: true });
    probe.load();
  });
}

function seekVideoFrame(probe, time) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      probe.removeEventListener('seeked', done);
      resolve();
    };
    const timer = window.setTimeout(done, measurementSeekTimeoutMs);

    probe.addEventListener('seeked', done, { once: true });
    try {
      probe.currentTime = time;
    } catch {
      done();
    }
  });
}

function getMeasurementSampleTimes(duration) {
  if (!duration) return [0];

  const usableEnd = Math.max(0, duration - 0.05);
  if (measurementSampleCount <= 1) return [Math.min(0.05, usableEnd)];

  const times = [];
  for (let index = 0; index < measurementSampleCount; index += 1) {
    const ratio = index / (measurementSampleCount - 1);
    times.push(Math.min(usableEnd, Math.max(0, ratio * usableEnd)));
  }
  return times;
}

function scanVisibleBounds(data, width, height) {
  const left = findVisibleColumn(data, width, height, 0, width, 1);
  if (left < 0) return null;

  const right = findVisibleColumn(data, width, height, width - 1, -1, -1);
  const top = findVisibleRow(data, width, left, right, 0, height, 1);
  const bottom = findVisibleRow(data, width, left, right, height - 1, -1, -1);

  return { left, top, right, bottom };
}

function findVisibleColumn(data, width, height, start, end, step) {
  for (let x = start; x !== end; x += step) {
    for (let y = 0; y < height; y += 1) {
      if (getAlpha(data, width, x, y) > visibleAlphaThreshold) return x;
    }
  }

  return -1;
}

function findVisibleRow(data, width, left, right, start, end, step) {
  for (let y = start; y !== end; y += step) {
    for (let x = left; x <= right; x += 1) {
      if (getAlpha(data, width, x, y) > visibleAlphaThreshold) return y;
    }
  }

  return -1;
}

function getAlpha(data, width, x, y) {
  return data[(y * width + x) * 4 + 3];
}

function expandBounds(bounds, width, height, padding) {
  return {
    left: clamp(bounds.left - padding, 0, width - 1),
    top: clamp(bounds.top - padding, 0, height - 1),
    right: clamp(bounds.right + padding, 0, width - 1),
    bottom: clamp(bounds.bottom + padding, 0, height - 1)
  };
}

function unionBoundsWith(current, next) {
  return {
    left: Math.min(current.left, next.left),
    top: Math.min(current.top, next.top),
    right: Math.max(current.right, next.right),
    bottom: Math.max(current.bottom, next.bottom)
  };
}

function applyAssetMetrics(metrics) {
  const scale = getFullVideoDisplayScale(metrics);
  const fullWidth = Math.max(1, Math.round(metrics.videoWidth * scale));
  const fullHeight = Math.max(1, Math.round(metrics.videoHeight * scale));
  const cropWidth = Math.max(1, Math.round(metrics.cropWidth * scale));
  const cropHeight = Math.max(1, Math.round(metrics.cropHeight * scale));
  const offsetX = Math.round(metrics.crop.left * scale);
  const offsetY = Math.round(metrics.crop.top * scale);

  document.documentElement.style.setProperty('--pet-full-width', `${fullWidth}px`);
  document.documentElement.style.setProperty('--pet-full-height', `${fullHeight}px`);
  document.documentElement.style.setProperty('--pet-crop-width', `${cropWidth}px`);
  document.documentElement.style.setProperty('--pet-crop-height', `${cropHeight}px`);
  document.documentElement.style.setProperty('--pet-offset-x', `${offsetX}px`);
  document.documentElement.style.setProperty('--pet-offset-y', `${offsetY}px`);
}

function yieldToBrowser() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function getFullVideoDisplayScale(metrics) {
  const dragRect = dragRegion.getBoundingClientRect();
  const maxWidth = Math.max(1, Math.min(window.innerWidth * 0.92, 292, dragRect.width - 8));
  const maxHeight = Math.max(1, Math.min(window.innerHeight * 0.88, 344, dragRect.height - 4));
  const videoRatio = metrics.videoWidth / metrics.videoHeight;
  const targetRatio = maxWidth / maxHeight;

  if (targetRatio > videoRatio) {
    return maxHeight / metrics.videoHeight;
  }

  return maxWidth / metrics.videoWidth;
}

function updateContentBounds() {
  if (!currentMetrics) return;

  const renderedPet = getRenderedPetRect();
  const mappedBounds = getRenderedContentBounds(renderedPet);
  const mappedAnchor = mapCropPointToWindow(renderedPet, currentMetrics.anchor);

  window.desktopPet.setContentBounds(mappedBounds).then((nextState) => {
    if (nextState) {
      windowState = nextState;
      updateBubbleAnchor(mappedBounds, mappedAnchor);
    } else {
      updateBubbleAnchor(mappedBounds, mappedAnchor);
    }
  });
}

function getRenderedPetRect() {
  const rect = petViewport.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

function getRenderedContentBounds(renderedPet) {
  let bounds = {
    left: renderedPet.x,
    top: renderedPet.y,
    right: renderedPet.x + renderedPet.width,
    bottom: renderedPet.y + renderedPet.height
  };

  if (currentAction === 'sit' && stool) {
    const stoolRect = stool.getBoundingClientRect();
    if (stoolRect.width > 0 && stoolRect.height > 0) {
      bounds = unionBoundsWith(bounds, {
        left: stoolRect.left,
        top: stoolRect.top,
        right: stoolRect.right,
        bottom: stoolRect.bottom
      });
    }
  }

  if (currentAction === 'sleep' && bed) {
    const bedRect = bed.getBoundingClientRect();
    if (bedRect.width > 0 && bedRect.height > 0) {
      bounds = unionBoundsWith(bounds, {
        left: bedRect.left,
        top: bedRect.top,
        right: bedRect.right,
        bottom: bedRect.bottom
      });
    }
  }

  return bounds;
}

function mapCropPointToWindow(renderedPet, point) {
  const scaleX = renderedPet.width / currentMetrics.cropWidth;
  const scaleY = renderedPet.height / currentMetrics.cropHeight;
  const rawX = point.x * scaleX;
  const xOffset = lastDirection < 0 ? renderedPet.width - rawX : rawX;

  return {
    x: renderedPet.x + xOffset,
    y: renderedPet.y + point.y * scaleY
  };
}

function updateBubbleAnchor(bounds, anchor = null) {
  const bubbleRect = bubble.getBoundingClientRect();
  const padding = 8;
  const halfBubbleWidth = Math.max(1, bubbleRect.width / 2);
  const visibleCenterX = bounds.left + (bounds.right - bounds.left) / 2;
  let x = anchor?.x ?? visibleCenterX;

  if (windowState?.bounds && windowState?.workArea) {
    const screenX = windowState.bounds.x + x;
    const minScreenX = windowState.workArea.x + padding + halfBubbleWidth;
    const maxScreenX = windowState.workArea.x + windowState.workArea.width - padding - halfBubbleWidth;
    const clampedScreenX = clamp(screenX, minScreenX, Math.max(minScreenX, maxScreenX));
    x = clampedScreenX - windowState.bounds.x;
  } else {
    const minX = padding + halfBubbleWidth;
    const maxX = window.innerWidth - padding - halfBubbleWidth;
    x = clamp(x, minX, Math.max(minX, maxX));
  }

  const anchorY = anchor?.y ?? bounds.top;
  const minY = bubbleRect.height + padding;
  const maxY = Math.max(minY, window.innerHeight - padding);
  const y = clamp(anchorY - bubbleGap, minY, maxY);

  document.documentElement.style.setProperty('--bubble-x', `${Math.round(x)}px`);
  document.documentElement.style.setProperty('--bubble-y', `${Math.round(y)}px`);
}

function setMouseEventsIgnored(ignored) {
  startMouseHitPolling();

  if (mouseEventsIgnored === ignored) return;

  mouseEventsIgnored = ignored;
  window.desktopPet.setMouseEventsIgnored(ignored).catch(() => {});
}

function startMouseHitPolling() {
  if (mousePollTimer || !window.desktopPet?.getCursorClientPoint) return;

  mousePollTimer = window.setInterval(async () => {
    if (isDragging || mousePollInFlight) return;

    mousePollInFlight = true;
    try {
      await refreshMouseHitTestFromCursor();
    } finally {
      mousePollInFlight = false;
    }
  }, mousePollMs);
}

function stopMouseHitPolling() {
  window.clearInterval(mousePollTimer);
  mousePollTimer = null;
}

function isVisiblePixelAtPoint(point) {
  if (!currentMetrics) return false;

  const renderedPet = getRenderedPetRect();

  if (
    point.x < renderedPet.x ||
    point.x >= renderedPet.x + renderedPet.width ||
    point.y < renderedPet.y ||
    point.y >= renderedPet.y + renderedPet.height
  ) {
    return false;
  }

  return true;
}

async function refreshMouseHitTestFromCursor() {
  if (isDragging || !window.desktopPet?.getCursorClientPoint) return;

  const point = await window.desktopPet.getCursorClientPoint();
  setMouseEventsIgnored(!isVisiblePixelAtPoint(point));
}

function syncMouseHitTest(event) {
  if (isDragging) {
    setMouseEventsIgnored(false);
    return;
  }

  setMouseEventsIgnored(!isVisiblePixelAtPoint(getPointerPoint(event)));
}

function getPointerPoint(event) {
  return { x: event.clientX, y: event.clientY };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function beginManualDrag(event) {
  if (event.button !== 0) return;
  if (!isVisiblePixelAtPoint(getPointerPoint(event))) return;
  event.preventDefault();

  stopRoaming();
  window.clearTimeout(roamTimer);
  window.clearTimeout(temporaryTimer);

  isDragging = true;
  dragMoved = false;
  lastPointerDown = getPointerPoint(event);
  dragRegion.setPointerCapture(event.pointerId);
  document.documentElement.classList.add('is-dragging');

  windowState = await window.desktopPet.beginDrag();
  dragStartBounds = windowState?.bounds ?? null;
  sampleDrag();
}

async function sampleDrag() {
  if (!isDragging) return;

  const nextState = await window.desktopPet.dragWindow();
  if (nextState) {
    windowState = nextState;
    updateDragMovedFromWindow(nextState.bounds);
  }
  dragFrame = window.setTimeout(sampleDrag, dragSampleMs);
}

function updateDragMoved(event) {
  if (!isDragging || !lastPointerDown) return;
  if (distanceBetween(lastPointerDown, getPointerPoint(event)) > clickThreshold) {
    dragMoved = true;
  }
}

function updateDragMovedFromWindow(bounds) {
  if (!dragStartBounds) return;

  const movedBy = Math.hypot(bounds.x - dragStartBounds.x, bounds.y - dragStartBounds.y);
  if (movedBy > clickThreshold) dragMoved = true;
}

async function endManualDrag(event) {
  if (!isDragging) return;

  window.clearTimeout(dragFrame);
  dragFrame = null;
  isDragging = false;
  document.documentElement.classList.remove('is-dragging');

  try {
    dragRegion.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already be released if the pointer leaves the window.
  }

  await window.desktopPet.endDrag();

  if (!dragMoved) {
    scheduleInteractionClick();
  } else {
    setAction('sit');
    if (Math.random() > 0.55) say('位置调整完毕。', 2400);
  }

  lastPointerDown = null;
  dragStartBounds = null;
  scheduleRoaming(randomBetween(3600, 9000));
}

function scheduleInteractionClick() {
  window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    setAction('interact');
    say(randomFrom(interactionLines), 3600);
  }, 180);
}

dragRegion.addEventListener('pointerdown', beginManualDrag);

dragRegion.addEventListener('pointermove', updateDragMoved);

window.addEventListener('mousemove', syncMouseHitTest);

window.addEventListener('mouseleave', () => {
  if (!isDragging) setMouseEventsIgnored(true);
});

dragRegion.addEventListener('pointerup', endManualDrag);

dragRegion.addEventListener('pointercancel', endManualDrag);

dragRegion.addEventListener('dblclick', (event) => {
  if (dragMoved) return;
  event.preventDefault();
  suppressNextClick = true;
  window.clearTimeout(clickTimer);
  stopRoaming();
  window.clearTimeout(roamTimer);
  scheduleRoaming(randomBetween(7600, 13000));
  setAction('special');
  say(randomFrom(specialLines), 5200);
});

dragRegion.addEventListener('mouseenter', () => {
  if (currentAction === 'sleep') {
    say('醒着呢，只是在省电。', 3000);
  }
});

window.addEventListener('contextmenu', (event) => {
  if (!isVisiblePixelAtPoint(getPointerPoint(event))) return;
  event.preventDefault();
  window.desktopPet.showMenu();
});

window.desktopPet.onSetAction((action) => {
  stopRoaming();
  if (action === 'move') {
    startRoaming({ force: true });
    return;
  }
  scheduleRoaming(randomBetween(7000, 14000));
  setAction(action);
});

window.desktopPet.onSayRandom(() => {
  sayRandom();
});

window.desktopPet.onAssetsChanged((assets) => {
  stopRoaming();
  window.clearTimeout(roamTimer);

  applyAssetBundle(assets).then((applied) => {
    if (applied) {
      say('动作文件夹已切换。', 3000);
    } else {
      say('这个文件夹里没有可用动作。', 3200);
    }

    scheduleRoaming(randomBetween(5000, 11000));
  });
});

video.addEventListener('ended', () => {
  if (temporaryActions.has(currentAction)) setAction(randomFrom(getIdleActions()));
});

window.addEventListener('resize', () => {
  if (currentMetrics) applyAssetMetrics(currentMetrics);
  updateContentBounds();
});

async function boot() {
  const assets = await window.desktopPet.getAssets();
  setDirection(1);
  setMouseEventsIgnored(true);
  await applyAssetBundle(assets);
  window.setTimeout(() => say('博士，我在桌面待命。', 4200), 800);
  scheduleIdleAction();
  scheduleTalking();
  scheduleRoaming(3200);
}

boot();
