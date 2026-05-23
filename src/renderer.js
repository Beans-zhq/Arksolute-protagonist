const video = document.getElementById('petVideo');
const spineCanvas = document.getElementById('spineCanvas');
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
let assetFileInfos = new Map();
let specialAssetFiles = [...defaultSpecialAssetFiles];
let activeRenderer = 'webm';
let spineAssetFiles = null;
let spineApp = null;
let spineReady = false;
let spineAnimationMap = {};
let spineAnimationNames = [];
let spineAnimationEndAt = 0;
let spineObjectUrls = new Map();
let lastAssetBundleError = null;

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

const defaultLineSets = {
  daily: dailyLines,
  interaction: interactionLines,
  special: specialLines,
  walk: walkLines
};

const defaultDecorationProfiles = {
  sit: {
    enabled: true,
    widthRatio: 0.48,
    minWidth: 76,
    maxWidth: 128,
    bottomRatio: 0.012,
    petLiftRatio: -0.13
  },
  sleep: {
    enabled: true,
    widthRatio: 0.86,
    minWidth: 154,
    maxWidth: 224,
    bottomRatio: -0.045,
    petLiftRatio: -0.34
  }
};

let activeProfile = {};
let activeDecorationProfiles = { ...defaultDecorationProfiles };
let activeLineSets = { ...defaultLineSets };

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
let manualActionHoldUntil = 0;
let manualHeldAction = null;
let petSizeScale = 1;

const clickThreshold = 5;
const dragSampleMs = 16;
const visibleAlphaThreshold = 24;
const measurementSampleCount = 5;
const measurementCropPadding = 3;
const measurementSeekTimeoutMs = 900;
const metricsCacheVersion = 1;
const metricsCacheStoragePrefix = 'absolute-protagonist.asset-metrics.';
const manualActionHoldMs = 10000;
const mousePollMs = 40;
const bubbleGap = 2;
const minPetSizeScale = 0.5;
const maxPetSizeScale = 2;
const defaultSpineSkeletonScale = 0.46;
const defaultSpineDisplayScale = 0.55;
const spinePixiSpriteMaxTextures = 1;
const spineBoundsSampleCount = 8;
const spineCanvasWidth = 292;
const spineCanvasHeight = 344;
const spineCanvasPadding = 18;
const spineActionVisualOffsets = {
  sit: { x: -10, y: 50 },
  sleep: { x: -15, y: 90 }
};
const spineActionAntiClipPadding = {
  sit: { bottom: 72 },
  sleep: { bottom: 72 }
};

function configureAssetFiles(files, profile = null) {
  activeRenderer = getBundleRenderer({ files, profile });

  if (activeRenderer === 'spine') {
    return configureSpineAssetFiles(files, profile);
  }

  if (!Array.isArray(files) || files.length === 0) return false;

  const nextAssetFiles = {};
  const nextSpecialAssetFiles = [];
  const profileActions = normalizeProfileActions(profile?.actions);

  for (const file of files) {
    if (typeof file !== 'string' || !file.toLowerCase().endsWith('.webm')) continue;

    const baseAction = profileActions.get(file) || getBaseActionFromAssetFile(file);

    if (baseAction === 'special') {
      nextSpecialAssetFiles.push(file);
    } else if (baseAction) {
      nextAssetFiles[baseAction] = file;
    } else {
      nextSpecialAssetFiles.push(file);
    }
  }

  assetFiles = nextAssetFiles;
  specialAssetFiles = nextSpecialAssetFiles;
  return true;
}

function getBundleRenderer(bundle) {
  const profileRenderer = String(bundle?.profile?.renderer || '').trim().toLowerCase();
  if (profileRenderer === 'spine' || profileRenderer === 'webm') return profileRenderer;
  if (bundle?.renderer === 'spine') return 'spine';
  if (Array.isArray(bundle?.files) && bundle.files.some((file) => /\.skel$/i.test(file))) return 'spine';
  return 'webm';
}

function configureSpineAssetFiles(files, profile = null) {
  if (!window.PIXI?.spine || !spineCanvas) {
    lastAssetBundleError = 'Spine 3.8 运行时没有加载成功。';
    return false;
  }
  if (!Array.isArray(files) || files.length === 0) return false;

  const imageFiles = files.filter((file) => typeof file === 'string' && /\.png$/i.test(file));
  const skeleton = profile?.spine?.skeleton || files.find((file) => /\.skel$/i.test(file));
  const atlas = profile?.spine?.atlas || files.find((file) => /\.atlas$/i.test(file));
  const image = profile?.spine?.image || imageFiles[0];

  if (!skeleton || !atlas || !image) return false;

  spineAssetFiles = {
    skeleton,
    atlas,
    image,
    images: [...new Set([image, ...imageFiles])],
    scale: Number(profile?.spine?.scale) || defaultSpineSkeletonScale,
    displayScale: Number(profile?.spine?.displayScale) || defaultSpineDisplayScale
  };
  spineAnimationMap = {};
  spineAnimationNames = [];
  spineAnimationEndAt = 0;
  assetFiles = {
    sit: 'spine:sit',
    relax: 'spine:relax',
    sleep: 'spine:sleep',
    move: 'spine:move',
    interact: 'spine:interact'
  };
  specialAssetFiles = ['spine:special'];
  return true;
}

function normalizeProfileActions(actions) {
  const actionMap = new Map();
  if (!actions || typeof actions !== 'object') return actionMap;

  for (const [action, value] of Object.entries(actions)) {
    const normalizedAction = normalizeActionName(action);
    if (!normalizedAction) continue;

    const files = Array.isArray(value) ? value : [value];
    for (const file of files) {
      if (typeof file === 'string' && file.toLowerCase().endsWith('.webm')) {
        actionMap.set(file, normalizedAction);
      }
    }
  }

  return actionMap;
}

function normalizeActionName(action) {
  const normalized = String(action || '').trim().toLowerCase();
  if (['sit', 'relax', 'sleep', 'move', 'interact'].includes(normalized)) return normalized;
  if (normalized === 'special') return 'special';
  return null;
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

function revokeSpineObjectUrls() {
  for (const assetUrl of spineObjectUrls.values()) {
    if (assetUrl.startsWith('blob:')) URL.revokeObjectURL(assetUrl);
  }

  spineObjectUrls = new Map();
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
  lastAssetBundleError = null;
  if (!bundle || !configureAssetFiles(bundle.files, bundle.profile)) return false;

  const loadToken = bundleLoadToken + 1;
  bundleLoadToken = loadToken;
  assetRootPath = bundle.rootPath;
  assetFileInfos = normalizeAssetFileInfos(bundle.fileInfos);
  activeProfile = normalizeProfile(bundle.profile);
  applyProfile(activeProfile);
  document.documentElement.dataset.renderer = activeRenderer;
  currentAssetFile = null;
  currentMetrics = null;
  assetMetrics = new Map();
  revokeAssetUrls();
  revokeSpineObjectUrls();
  disposeSpineApp();
  setMouseEventsIgnored(true);

  if (activeRenderer === 'spine') {
    await initializeSpineRenderer(loadToken);
    if (!spineReady) {
      activeRenderer = 'webm';
      document.documentElement.dataset.renderer = activeRenderer;
      configureAssetFiles(defaultAssetFiles ? Object.values(defaultAssetFiles) : [], { actions: defaultAssetFiles });
      setMouseEventsIgnored(false);
      return false;
    }
  } else {
    await preloadAssetMetrics(bundle.files, loadToken);
  }

  if (loadToken !== bundleLoadToken) return false;

  const nextAction = assetFiles[currentAction] ? currentAction : getFallbackAction();
  if (nextAction) {
    await setAction(nextAction, { restart: true });
  }

  return true;
}

function normalizeAssetFileInfos(fileInfos) {
  const infoMap = new Map();
  if (!Array.isArray(fileInfos)) return infoMap;

  for (const info of fileInfos) {
    if (!info || typeof info.name !== 'string') continue;
    infoMap.set(info.name, {
      name: info.name,
      size: Number(info.size) || 0,
      modifiedMs: Number(info.modifiedMs) || 0
    });
  }

  return infoMap;
}

function normalizeProfile(profile) {
  return profile && typeof profile === 'object' ? profile : {};
}

function applyProfile(profile) {
  const decorations = mergeDecorationProfiles(profile.decorations);
  activeDecorationProfiles = decorations;
  applyDecorationProfile('sit', decorations.sit);
  applyDecorationProfile('sleep', decorations.sleep);
  activeLineSets = mergeLineSets(profile.lines);
}

function mergeDecorationProfiles(decorations) {
  return {
    sit: { ...defaultDecorationProfiles.sit, ...(decorations?.sit || {}) },
    sleep: { ...defaultDecorationProfiles.sleep, ...(decorations?.sleep || {}) }
  };
}

function applyDecorationProfile(action, profile) {
  for (const [key, value] of Object.entries(profile)) {
    const propertyName = `--${action}-${toKebabCase(key)}`;
    document.documentElement.style.setProperty(propertyName, formatDecorationValue(key, value, getDecorationPixelScale()));
  }

  document.documentElement.classList.toggle(`has-${action}-decoration`, profile.enabled !== false);
}

function mergeLineSets(lines) {
  return {
    daily: mergeTextList(defaultLineSets.daily, lines?.daily),
    interaction: mergeTextList(defaultLineSets.interaction, lines?.interaction),
    special: mergeTextList(defaultLineSets.special, lines?.special),
    walk: mergeTextList(defaultLineSets.walk, lines?.walk)
  };
}

function mergeTextList(defaultList, customList) {
  if (!Array.isArray(customList)) return defaultList;
  const cleaned = customList.filter((line) => typeof line === 'string' && line.trim());
  return cleaned.length > 0 ? cleaned : defaultList;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function getDecorationPixelScale() {
  if (activeRenderer !== 'spine') return 1;
  return Number(spineAssetFiles?.displayScale) > 0 ? Number(spineAssetFiles.displayScale) : defaultSpineDisplayScale;
}

function formatDecorationValue(key, value, pixelScale = 1) {
  if (['minWidth', 'maxWidth'].includes(key) && typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.max(1, Math.round(value * pixelScale))}px`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value ?? '');
}

async function initializeSpineRenderer(loadToken) {
  spineReady = false;
  if (!spineAssetFiles || !assetRootPath || !window.PIXI?.spine) return;

  const pixi = window.PIXI;
  configurePixiRuntime(pixi);
  const spineRuntime = pixi.spine;
  const atlasKey = spineAssetFiles.atlas;
  const skeletonKey = spineAssetFiles.skeleton;
  const imageKeys = spineAssetFiles.images?.length ? spineAssetFiles.images : [spineAssetFiles.image];
  let atlasText;
  let skeletonBytes;
  let imageUrls;

  try {
    [atlasText, skeletonBytes, imageUrls] = await Promise.all([
      readAssetText(atlasKey),
      readAssetBytes(skeletonKey),
      Promise.all(imageKeys.map((fileName) => createSpineImageUrl(fileName)))
    ]);
  } catch (error) {
    lastAssetBundleError = `Spine 素材读取失败：${getErrorMessage(error)}`;
    console.error('Spine assets failed to read.', error);
    return;
  }

  if (loadToken !== bundleLoadToken) return;

  try {
    const textureMap = await loadSpineTextures(pixi, imageKeys, imageUrls);
    if (loadToken !== bundleLoadToken) return;

    const atlas = await createPixiSpineAtlas(spineRuntime, atlasText, textureMap);
    if (loadToken !== bundleLoadToken) return;

    const atlasLoader = new spineRuntime.AtlasAttachmentLoader(atlas);
    const skeletonBinary = new spineRuntime.SkeletonBinary(atlasLoader);
    skeletonBinary.scale = spineAssetFiles.scale;
    const skeletonData = skeletonBinary.readSkeletonData(skeletonBytes);
    const spineObject = new spineRuntime.Spine(skeletonData);
    spineObject.autoUpdate = false;
    spineObject.visible = true;

    const webglContext = createSpineWebglContext(spineCanvas);
    const pixiApp = new pixi.Application({
      view: spineCanvas,
      context: webglContext || undefined,
      width: 1,
      height: 1,
      transparent: true,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    });
    pixiApp.stage.addChild(spineObject);
    pixiApp.ticker.add(updatePixiSpineFrame);
    pixiApp.ticker.start();

    spineApp = {
      renderer: 'pixi',
      pixiApp,
      spineObject,
      skeleton: spineObject.skeleton,
      state: spineObject.state,
      skeletonData,
      atlas,
      textureMap
    };
    spineAnimationNames = skeletonData.animations.map((animation) => animation.name);
    spineAnimationMap = buildSpineAnimationMap(activeProfile?.actions, spineAnimationNames);
    spineReady = true;
    rebuildSpineMetrics();
  } catch (error) {
    lastAssetBundleError = `Spine 初始化失败：${getErrorMessage(error)}`;
    console.error('Spine initialize failed.', error);
  }
}

function configurePixiRuntime(pixi) {
  if (!pixi?.settings) return;

  if (pixi.ENV?.WEBGL !== undefined) {
    pixi.settings.PREFER_ENV = pixi.ENV.WEBGL;
  }

  if (pixi.settings.SPRITE_MAX_TEXTURES !== undefined) {
    pixi.settings.SPRITE_MAX_TEXTURES = spinePixiSpriteMaxTextures;
  }

  if (pixi.MIPMAP_MODES?.OFF !== undefined) {
    pixi.settings.MIPMAP_TEXTURES = pixi.MIPMAP_MODES.OFF;
  }
}

function createSpineWebglContext(canvas) {
  if (!canvas) return null;

  const options = {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  };

  try {
    const context = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    const maxTextures = Number(context?.getParameter(context.MAX_TEXTURE_IMAGE_UNITS)) || 0;
    return maxTextures > 0 ? context : null;
  } catch (error) {
    console.warn('Spine WebGL context preflight failed.', error);
    return null;
  }
}

async function readAssetBytes(fileName) {
  const bytes = await window.desktopPet.readAssetFile(fileName);
  return new Uint8Array(bytes);
}

async function readAssetText(fileName) {
  const bytes = await readAssetBytes(fileName);
  return new TextDecoder('utf-8').decode(bytes);
}

async function createSpineImageUrl(fileName) {
  return createSpineObjectUrl(fileName, 'image/png');
}

async function createSpineObjectUrl(fileName, mimeType) {
  if (spineObjectUrls.has(fileName)) return spineObjectUrls.get(fileName);

  const bytes = await readAssetBytes(fileName);
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  spineObjectUrls.set(fileName, objectUrl);
  return objectUrl;
}

async function loadSpineTextures(pixi, imageKeys, imageUrls) {
  const entries = await Promise.all(
    imageKeys.map(async (fileName, index) => {
      const texture = await pixi.Texture.fromURL(imageUrls[index]);
      return [getSpineTextureLookupKey(fileName), texture];
    })
  );

  return new Map(entries);
}

function getSpineTextureLookupKey(fileName) {
  return String(fileName || '').replace(/\\/g, '/').split('/').pop();
}

function createPixiSpineAtlas(spineRuntime, atlasText, textureMap) {
  return new Promise((resolve, reject) => {
    try {
      const atlas = new spineRuntime.TextureAtlas(
        atlasText,
        (pageName, done) => {
          const texture =
            textureMap.get(pageName) ||
            textureMap.get(getSpineTextureLookupKey(pageName)) ||
            textureMap.values().next().value;
          done(texture?.baseTexture || null);
        },
        (atlasResult) => {
          if (!atlasResult) {
            reject(new Error('贴图 atlas 加载失败。'));
            return;
          }
          resolve(atlasResult);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

function updatePixiSpineFrame(delta) {
  if (!spineReady || !spineApp) return;
  const deltaSeconds = (delta || 0) / 60;

  spineApp.spineObject.update(deltaSeconds);
  renderPixiSpine();

  if (temporaryActions.has(currentAction) && spineAnimationEndAt > 0 && performance.now() >= spineAnimationEndAt) {
    spineAnimationEndAt = 0;
    setAction(randomFrom(getIdleActions()));
  }
}

function renderPixiSpine() {
  if (!spineReady || !spineApp || !currentMetrics) return;

  const { pixiApp } = spineApp;
  const metrics = currentMetrics;
  const renderWidth = Math.max(1, Math.round(metrics.renderWidth || metrics.videoWidth));
  const renderHeight = Math.max(1, Math.round(metrics.renderHeight || metrics.videoHeight));
  if (pixiApp.renderer.width !== renderWidth || pixiApp.renderer.height !== renderHeight) {
    pixiApp.renderer.resize(renderWidth, renderHeight);
    applySpineCanvasDisplaySize(metrics);
  }

  positionSpineSkeleton(metrics);
  pixiApp.renderer.render(pixiApp.stage);
}

function buildSpineAnimationMap(profileActions, animationNames) {
  const map = {};
  for (const action of ['sit', 'relax', 'sleep', 'move', 'interact', 'special']) {
    const configured = normalizeSpineActionValue(profileActions?.[action], animationNames);
    map[action] = configured || findSpineAnimationForAction(action, animationNames);
  }

  return map;
}

function normalizeSpineActionValue(value, animationNames) {
  const values = Array.isArray(value) ? value : [value];
  const matches = values.filter((name) => typeof name === 'string' && animationNames.includes(name));
  if (matches.length === 0) return null;
  return matches.length === 1 ? matches[0] : matches;
}

function findSpineAnimationForAction(action, animationNames) {
  const candidates = {
    sit: ['sit', 'idle', 'relax', 'wait', 'default'],
    relax: ['relax', 'idle', 'wait', 'stand', 'default'],
    sleep: ['sleep', 'idle', 'relax', 'wait'],
    move: ['move', 'walk', 'run', 'idle'],
    interact: ['interact', 'touch', 'tap', 'idle'],
    special: ['special', 'skill', 'attack', 'interact', 'touch']
  }[action] || [];

  for (const candidate of candidates) {
    const exact = animationNames.find((name) => name.toLowerCase() === candidate);
    if (exact) return exact;
    const partial = animationNames.find((name) => name.toLowerCase().includes(candidate));
    if (partial) return partial;
  }

  return animationNames[0] || null;
}

function rebuildSpineMetrics() {
  if (!spineReady || !spineApp) return;

  assetMetrics = new Map();
  const actions = ['sit', 'relax', 'sleep', 'move', 'interact', 'special'];
  for (const action of actions) {
    const animation = getSpineAnimationForAction(action);
    if (!animation) continue;
    const metrics = measureSpineMetrics(animation, action);
    if (metrics) assetMetrics.set(`spine:${action}`, metrics);
  }
}

function getSpineAnimationForAction(action) {
  const value = spineAnimationMap[action];
  return Array.isArray(value) ? randomFrom(value) : value;
}

function measureSpineMetrics(animationName, action = null) {
  if (!spineApp || !animationName) return null;

  const { skeleton, state, spineObject, skeletonData } = spineApp;
  const animation = skeletonData.findAnimation(animationName);
  const duration = Number(animation?.duration) || 0;
  const sampleCount = duration > 0 ? spineBoundsSampleCount : 1;
  let unionBounds = null;

  try {
    for (let index = 0; index < sampleCount; index += 1) {
      const sampleTime = duration > 0 ? (duration * index) / sampleCount : 0;
      if (typeof skeleton.setToSetupPose === 'function') skeleton.setToSetupPose();
      state.setAnimation(0, animationName, true);
      state.update(sampleTime);
      state.apply(skeleton);
      skeleton.updateWorldTransform();
      spineObject.update(0);
      unionBounds = unionSpineWorldBounds(unionBounds, getSpineSkeletonBounds(skeleton));
    }
  } catch (error) {
    console.error(`Spine animation "${animationName}" failed to measure.`, error);
    return null;
  }

  const bounds = unionBounds || getSpineSkeletonBounds(skeleton);
  const worldWidth = Math.max(1, Math.ceil(bounds.width || 220));
  const worldHeight = Math.max(1, Math.ceil(bounds.height || 300));
  const fullWidth = spineCanvasWidth;
  const fullHeight = spineCanvasHeight;
  const antiClipPadding = spineActionAntiClipPadding[action] || {};
  const renderWidth = fullWidth + Math.max(0, Number(antiClipPadding.left) || 0) + Math.max(0, Number(antiClipPadding.right) || 0);
  const renderHeight = fullHeight + Math.max(0, Number(antiClipPadding.top) || 0) + Math.max(0, Number(antiClipPadding.bottom) || 0);
  const actionOffset = spineActionVisualOffsets[action] || {};
  const offsetY = Number(actionOffset.y) || 0;
  const fitScale = Math.min(
    1,
    (spineCanvasWidth - spineCanvasPadding * 2) / worldWidth,
    (fullHeight - spineCanvasPadding * 2 - Math.max(0, offsetY)) / worldHeight
  );
  const crop = {
    left: 0,
    top: 0,
    right: fullWidth,
    bottom: fullHeight
  };
  const visibleBox = getSpineVisibleBox(bounds, fitScale, fullWidth, fullHeight, action);

  return {
    file: `spine:${animationName}`,
    animationName,
    renderer: 'spine',
    worldBounds: bounds,
    worldScale: fitScale,
    visibleBox,
    videoWidth: fullWidth,
    videoHeight: fullHeight,
    renderWidth,
    renderHeight,
    displayScale: spineAssetFiles.displayScale,
    crop,
    cropWidth: fullWidth,
    cropHeight: fullHeight,
    anchor: {
      x: visibleBox.left + (visibleBox.right - visibleBox.left) / 2,
      y: visibleBox.top
    }
  };
}

function getSpineVisibleBox(bounds, worldScale, fullWidth, fullHeight, action = null) {
  const scaledWidth = bounds.width * worldScale;
  const scaledHeight = bounds.height * worldScale;
  const offset = spineActionVisualOffsets[action] || {};
  const offsetY = Number(offset.y) || 0;
  const left = (fullWidth - scaledWidth) / 2;
  const top = fullHeight - spineCanvasPadding - scaledHeight + offsetY;

  return {
    left: left + (Number(offset.x) || 0),
    top,
    right: left + (Number(offset.x) || 0) + scaledWidth,
    bottom: top + scaledHeight
  };
}

function unionSpineWorldBounds(current, next) {
  const left = next.x;
  const top = next.y;
  const right = next.x + next.width;
  const bottom = next.y + next.height;

  if (!current) {
    return {
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top)
    };
  }

  const unionLeft = Math.min(current.x, left);
  const unionTop = Math.min(current.y, top);
  const unionRight = Math.max(current.x + current.width, right);
  const unionBottom = Math.max(current.y + current.height, bottom);

  return {
    x: unionLeft,
    y: unionTop,
    width: Math.max(1, unionRight - unionLeft),
    height: Math.max(1, unionBottom - unionTop)
  };
}

function getSpineSkeletonBounds(skeleton) {
  const offset = new window.PIXI.spine.Vector2();
  const size = new window.PIXI.spine.Vector2();
  skeleton.getBounds(offset, size, []);

  const x = Number.isFinite(offset.x) ? offset.x : 0;
  const y = Number.isFinite(offset.y) ? offset.y : 0;
  const width = Number.isFinite(size.x) && size.x > 0 ? size.x : 220;
  const height = Number.isFinite(size.y) && size.y > 0 ? size.y : 300;

  return { x, y, width, height };
}

function positionSpineSkeleton(metrics) {
  if (!spineApp || !metrics?.worldBounds) return;
  const bounds = metrics.worldBounds;
  const worldScale = Number(metrics.worldScale) > 0 ? Number(metrics.worldScale) : 1;
  const visibleBox = metrics.visibleBox || getSpineVisibleBox(bounds, worldScale, metrics.videoWidth, metrics.videoHeight);

  spineApp.spineObject.scale.set(worldScale);
  spineApp.spineObject.x = visibleBox.left - bounds.x * worldScale;
  spineApp.spineObject.y = visibleBox.top - bounds.y * worldScale;
}

async function setSpineAction(action, options = {}) {
  if (!spineReady || !spineApp) return;

  const animationName = getSpineAnimationForAction(action);
  if (!animationName) return;

  try {
    spineApp.state.setAnimation(0, animationName, !temporaryActions.has(action));
    spineApp.state.update(0);
    spineApp.state.apply(spineApp.skeleton);
    spineApp.skeleton.updateWorldTransform();
  } catch {
    return;
  }

  const assetKey = `spine:${action}`;
  const metrics = measureSpineMetrics(animationName, action) || assetMetrics.get(assetKey);
  if (!metrics) return;

  currentAction = action;
  currentAssetFile = assetKey;
  currentMetrics = metrics;
  document.documentElement.dataset.action = action;
  applyAssetMetrics(metrics);
  positionSpineSkeleton(metrics);

  try {
    spineApp.state.setAnimation(0, animationName, !temporaryActions.has(action));
    spineApp.state.update(0);
    spineApp.state.apply(spineApp.skeleton);
    spineApp.skeleton.updateWorldTransform();
  } catch {
    return;
  }

  const animation = spineApp.skeletonData.findAnimation(animationName);
  if (temporaryActions.has(action)) {
    spineAnimationEndAt = performance.now() + Math.max(600, (animation?.duration || 3.2) * 1000);
  } else {
    spineAnimationEndAt = 0;
  }

  renderPixiSpine();
  updateContentBounds();
  refreshMouseHitTestFromCursor();
}

function disposeSpineApp() {
  spineReady = false;
  spineAnimationEndAt = 0;
  if (spineApp?.pixiApp) {
    try {
      spineApp.pixiApp.destroy(false, { children: true, texture: false, baseTexture: false });
    } catch {
      // Ignore disposal errors while switching renderers.
    }
  }
  spineCanvas.width = 1;
  spineCanvas.height = 1;
  spineApp = null;
}

async function setAction(action, options = {}) {
  if (activeRenderer === 'spine') {
    await setSpineAction(action, options);
    return;
  }

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
      if (isManualActionHoldActive()) {
        temporaryTimer = window.setTimeout(() => {
          setAction(randomFrom(getIdleActions()));
        }, getManualActionHoldRemaining());
        return;
      }

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
  say(randomFrom(activeLineSets.daily));
}

function holdManualAction(action) {
  manualHeldAction = action;

  if (temporaryActions.has(action)) {
    manualActionHoldUntil = 0;
    return;
  }

  manualActionHoldUntil = performance.now() + manualActionHoldMs;
}

function getManualActionHoldRemaining() {
  return Math.max(0, manualActionHoldUntil - performance.now());
}

function isManualActionHoldActive() {
  return getManualActionHoldRemaining() > 0;
}

function scheduleIdleAction() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (!isManualActionHoldActive() && !isRoaming && !temporaryActions.has(currentAction)) {
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
  if (!options.force && isManualActionHoldActive()) {
    scheduleRoaming(getManualActionHoldRemaining() + randomBetween(800, 2200));
    return;
  }

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
  const edgeDirection = getHorizontalEdgeDirection(bounds.x, minX, maxX, 8);
  const preferredDirection = options.direction || (edgeDirection ? -edgeDirection : Math.random() > 0.5 ? 1 : -1);
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
  const speed = (randomBetween(35, 60) * petSizeScale) / 1000;

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
  if (Math.random() > 0.38) say(randomFrom(activeLineSets.walk), 2600);
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
    const edgeDirection = getHorizontalEdgeDirection(bounds.x, minX, maxX, 1);
    const hitEdge = edgeDirection !== 0;

    if (Math.abs(bounds.x - roamState.targetX) <= 2 || hitEdge) {
      stopRoaming();
      settleAfterRoam(edgeDirection);
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

function settleAfterRoam(edgeDirection = 0) {
  isRoaming = false;
  const hitEdge = edgeDirection !== 0;
  if (hitEdge) setDirection(-edgeDirection);

  if (manualHeldAction === 'move' && isManualActionHoldActive()) {
    if (hitEdge && Math.random() > 0.35) {
      say('到边界了。看来桌面也有尽头。', 3200);
    }

    if (hitEdge) {
      startRoaming({ force: true, direction: -edgeDirection });
    } else {
      window.clearTimeout(roamTimer);
      roamTimer = window.setTimeout(() => {
        startRoaming({ force: true });
      }, randomBetween(300, 900));
    }

    return;
  }

  setAction(randomFrom(getIdleActions()));
  if (hitEdge && Math.random() > 0.35) {
    say('到边界了。看来桌面也有尽头。', 3200);
  }
  scheduleRoaming(randomBetween(5000, 14000));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getHorizontalEdgeDirection(x, minX, maxX, tolerance = 1) {
  if (x <= minX + tolerance) return -1;
  if (x >= maxX - tolerance) return 1;
  return 0;
}

function randomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizePetSizeScale(value) {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return clamp(scale, minPetSizeScale, maxPetSizeScale);
}

function setPetSizePercent(percent) {
  petSizeScale = normalizePetSizeScale((Number(percent) || 100) / 100);

  if (currentMetrics) {
    applyAssetMetrics(currentMetrics);
    updateContentBounds();
    refreshMouseHitTestFromCursor();
  }
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || '未知错误');
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
      const cachedMetrics = readCachedAssetMetrics(file);
      const metrics = cachedMetrics || (await measureAssetMetrics(file));
      if (!cachedMetrics) writeCachedAssetMetrics(file, metrics);
      if (loadToken === bundleLoadToken) assetMetrics.set(file, metrics);
    } catch {
      // Invalid or unreadable assets are ignored; actions without metrics are not selected.
    }

    await yieldToBrowser();
  }
}

function readCachedAssetMetrics(assetFile) {
  const cacheKey = getMetricsCacheKey();
  const signature = getAssetFileSignature(assetFile);
  if (!cacheKey || !signature) return null;

  try {
    const rawCache = window.localStorage.getItem(cacheKey);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache);
    const entry = cache?.entries?.[assetFile];
    if (!entry || !isSameFileSignature(entry.signature, signature)) return null;
    if (!isUsableMetrics(entry.metrics)) return null;

    return entry.metrics;
  } catch {
    return null;
  }
}

function writeCachedAssetMetrics(assetFile, metrics) {
  const cacheKey = getMetricsCacheKey();
  const signature = getAssetFileSignature(assetFile);
  if (!cacheKey || !signature || !isUsableMetrics(metrics)) return;

  try {
    const cache = readMetricsCache(cacheKey);
    cache.version = metricsCacheVersion;
    cache.rootPath = assetRootPath || '';
    cache.entries[assetFile] = {
      signature,
      metrics
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    // Cache writes are an optimization; runtime should continue without them.
  }
}

function readMetricsCache(cacheKey) {
  try {
    const cache = JSON.parse(window.localStorage.getItem(cacheKey) || '');
    if (cache?.version === metricsCacheVersion && cache.entries && typeof cache.entries === 'object') {
      return cache;
    }
  } catch {
    // Fall through to an empty cache.
  }

  return {
    version: metricsCacheVersion,
    rootPath: assetRootPath || '',
    entries: {}
  };
}

function getMetricsCacheKey() {
  if (!assetRootPath) return null;
  return `${metricsCacheStoragePrefix}${hashText(assetRootPath)}`;
}

function getAssetFileSignature(assetFile) {
  const info = assetFileInfos.get(assetFile);
  if (!info) return null;

  return {
    size: info.size,
    modifiedMs: info.modifiedMs
  };
}

function isSameFileSignature(left, right) {
  return (
    left &&
    right &&
    Number(left.size) === Number(right.size) &&
    Math.round(Number(left.modifiedMs)) === Math.round(Number(right.modifiedMs))
  );
}

function isUsableMetrics(metrics) {
  return (
    metrics &&
    Number.isFinite(metrics.videoWidth) &&
    Number.isFinite(metrics.videoHeight) &&
    Number.isFinite(metrics.cropWidth) &&
    Number.isFinite(metrics.cropHeight) &&
    metrics.crop &&
    Number.isFinite(metrics.crop.left) &&
    Number.isFinite(metrics.crop.top) &&
    Number.isFinite(metrics.crop.right) &&
    Number.isFinite(metrics.crop.bottom) &&
    metrics.anchor &&
    Number.isFinite(metrics.anchor.x) &&
    Number.isFinite(metrics.anchor.y)
  );
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
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

  if (metrics.renderer === 'spine') {
    applySpineCanvasDisplaySize(metrics, scale);
  }
}

function applySpineCanvasDisplaySize(metrics, scale = getFullVideoDisplayScale(metrics)) {
  if (!spineCanvas || !metrics) return;

  const renderWidth = Math.max(1, Math.round((metrics.renderWidth || metrics.videoWidth) * scale));
  const renderHeight = Math.max(1, Math.round((metrics.renderHeight || metrics.videoHeight) * scale));
  document.documentElement.style.setProperty('--spine-render-width', `${renderWidth}px`);
  document.documentElement.style.setProperty('--spine-render-height', `${renderHeight}px`);
  spineCanvas.style.width = `${renderWidth}px`;
  spineCanvas.style.height = `${renderHeight}px`;
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
  const rendererScale = Number(metrics.displayScale) > 0 ? Number(metrics.displayScale) : 1;
  const sizeScale = normalizePetSizeScale(petSizeScale);

  if (targetRatio > videoRatio) {
    return (maxHeight / metrics.videoHeight) * rendererScale * sizeScale;
  }

  return (maxWidth / metrics.videoWidth) * rendererScale * sizeScale;
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
  let bounds = activeRenderer === 'spine' ? getRenderedSpineVisibleBounds(renderedPet) : {
    left: renderedPet.x,
    top: renderedPet.y,
    right: renderedPet.x + renderedPet.width,
    bottom: renderedPet.y + renderedPet.height
  };

  if (activeRenderer !== 'spine' && currentAction === 'sit' && stool && activeDecorationProfiles.sit?.enabled !== false) {
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

  if (activeRenderer !== 'spine' && currentAction === 'sleep' && bed && activeDecorationProfiles.sleep?.enabled !== false) {
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

function getRenderedSpineVisibleBounds(renderedPet) {
  const box = currentMetrics?.visibleBox;
  if (!box) {
    return {
      left: renderedPet.x,
      top: renderedPet.y,
      right: renderedPet.x + renderedPet.width,
      bottom: renderedPet.y + renderedPet.height
    };
  }

  const scaleX = renderedPet.width / currentMetrics.videoWidth;
  const scaleY = renderedPet.height / currentMetrics.videoHeight;
  return {
    left: renderedPet.x + box.left * scaleX,
    top: renderedPet.y + box.top * scaleY,
    right: renderedPet.x + box.right * scaleX,
    bottom: renderedPet.y + box.bottom * scaleY
  };
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
    const scaleFactor = windowState.scaleFactor || 1;
    const screenX = windowState.bounds.x + x * scaleFactor;
    const minScreenX = windowState.workArea.x + (padding + halfBubbleWidth) * scaleFactor;
    const maxScreenX =
      windowState.workArea.x + windowState.workArea.width - (padding + halfBubbleWidth) * scaleFactor;
    const clampedScreenX = clamp(screenX, minScreenX, Math.max(minScreenX, maxScreenX));
    x = (clampedScreenX - windowState.bounds.x) / scaleFactor;
  } else {
    const minX = padding + halfBubbleWidth;
    const maxX = window.innerWidth - padding - halfBubbleWidth;
    x = clamp(x, minX, Math.max(minX, maxX));
  }

  const minLocalX = padding + halfBubbleWidth;
  const maxLocalX = window.innerWidth - padding - halfBubbleWidth;
  x = clamp(x, minLocalX, Math.max(minLocalX, maxLocalX));

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

function isVisiblePixelAtPoint(point) {
  if (!currentMetrics) return false;

  const renderedPet = getRenderedPetRect();
  const visibleBounds = activeRenderer === 'spine' ? getRenderedContentBounds(renderedPet) : null;

  if (visibleBounds) {
    return (
      point.x >= visibleBounds.left &&
      point.x < visibleBounds.right &&
      point.y >= visibleBounds.top &&
      point.y < visibleBounds.bottom
    );
  }

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
    say(randomFrom(activeLineSets.interaction), 3600);
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
  say(randomFrom(activeLineSets.special), 5200);
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
  holdManualAction(action);
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

window.desktopPet.onPetSizeChanged((percent) => {
  stopRoaming();
  setPetSizePercent(percent);
  scheduleRoaming(randomBetween(3600, 9000));
  say(`桌宠大小：${Math.round(Number(percent) || 100)}%`, 2200);
});

window.desktopPet.onAssetsChanged((assets) => {
  stopRoaming();
  window.clearTimeout(roamTimer);

  applyAssetBundle(assets).then((applied) => {
    if (applied) {
      say('动作文件夹已切换。', 3000);
    } else {
      say(lastAssetBundleError || '这个文件夹里没有可用动作。', 4200);
    }

    scheduleRoaming(randomBetween(5000, 11000));
  });
});

video.addEventListener('ended', () => {
  if (temporaryActions.has(currentAction)) {
    setAction(randomFrom(getIdleActions()));
  }
});

window.addEventListener('resize', () => {
  if (currentMetrics) applyAssetMetrics(currentMetrics);
  updateContentBounds();
});

async function boot() {
  try {
    setPetSizePercent(await window.desktopPet.getPetSize());
  } catch {
    setPetSizePercent(100);
  }

  const assets = await window.desktopPet.getAssets();
  setDirection(1);
  setMouseEventsIgnored(true);
  const applied = await applyAssetBundle(assets);
  if (applied && currentMetrics) {
    window.setTimeout(() => say('博士，我在桌面待命。', 4200), 800);
  }
  scheduleIdleAction();
  scheduleTalking();
  scheduleRoaming(3200);
}

boot();
