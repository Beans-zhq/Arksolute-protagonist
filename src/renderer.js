const video = document.getElementById('petVideo');
const bubble = document.getElementById('bubble');
const dragRegion = document.getElementById('dragRegion');

const assets = {
  sit: '../assets/维什戴尔-绝对主角-基建-Sit-x1.webm',
  relax: '../assets/维什戴尔-绝对主角-基建-Relax-x1.webm',
  sleep: '../assets/维什戴尔-绝对主角-基建-Sleep-x1.webm',
  move: '../assets/维什戴尔-绝对主角-基建-Move-x1.webm',
  interact: '../assets/维什戴尔-绝对主角-基建-Interact-x1.webm',
  special: '../assets/维什戴尔-绝对主角-基建-Special-x1.webm'
};

const idleActions = ['sit', 'relax'];
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
  '我在。你继续。'
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
  '嗯，我在。'
];

const specialLines = [
  '既然你想看，那就稍微认真一点。',
  '特别演出时间。别眨眼。',
  '主角登场，总要有点仪式感。',
  '这个动作可不是随便给人看的。',
  '好吧，就当是给今天加点士气。',
  '记住，这叫专业，不叫花哨。'
];

const walkLines = [
  '巡逻开始。',
  '我去那边看看。',
  '桌面路线确认。',
  '稍微活动一下。',
  '让开一点，我要经过。',
  '屏幕边界也归我检查。',
  '这边似乎更适合站岗。',
  '不用管我，我自己走走。'
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
let lastDirection = 1;
let clickTimer = null;
let suppressNextClick = false;
let measuredVideoBounds = null;
let measureTimer = null;
let measureSamplesLeft = 0;
let hitMap = null;
let mouseEventsIgnored = false;
let isRoaming = false;

const clickThreshold = 5;
const dragSampleMs = 16;
const alphaThreshold = 8;
const scanWidth = 180;
const measureSampleCount = 8;
const measureSampleInterval = 180;

function setAction(action, options = {}) {
  if (!assets[action]) return;

  const sameAction = currentAction === action;
  currentAction = action;
  video.src = assets[action];
  video.loop = !temporaryActions.has(action);
  measuredVideoBounds = null;
  hitMap = null;
  measureSamplesLeft = measureSampleCount;

  if (sameAction && options.restart) {
    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      // ignore
    }
    video.load();
  }

  video.play().catch(() => {});

  window.clearTimeout(temporaryTimer);
  if (temporaryActions.has(action)) {
    temporaryTimer = window.setTimeout(() => {
      setAction(randomFrom(idleActions));
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
  bubble.textContent = text;
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
      setAction(randomFrom(idleActions));
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
  setAction(randomFrom(['sit', 'relax']));
  if (hitEdge && Math.random() > 0.35) {
    say('到边界了。看来桌面也有尽头。', 3200);
  }
  scheduleRoaming(randomBetween(5000, 14000));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scheduleContentBoundsMeasurement(delay = 180) {
  window.clearTimeout(measureTimer);
  measureTimer = window.setTimeout(() => {
    measureVisibleVideoBounds();
  }, delay);
}

function measureVisibleVideoBounds() {
  if (!video.videoWidth || !video.videoHeight) {
    scheduleContentBoundsMeasurement(140);
    return;
  }

  const scale = scanWidth / video.videoWidth;
  const canvas = document.createElement('canvas');
  canvas.width = scanWidth;
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const scan = scanVisiblePixels(frame.data, canvas.width, canvas.height);

  if (!scan.bounds) {
    scheduleContentBoundsMeasurement(220);
    return;
  }

  const nextBounds = {
    left: scan.bounds.left / scale,
    top: scan.bounds.top / scale,
    right: (scan.bounds.right + 1) / scale,
    bottom: (scan.bounds.bottom + 1) / scale
  };

  measuredVideoBounds = measuredVideoBounds ? unionVideoBounds(measuredVideoBounds, nextBounds) : nextBounds;
  hitMap = scan.hitMap;

  updateContentBounds();

  if (measureSamplesLeft > 0) {
    measureSamplesLeft -= 1;
    scheduleContentBoundsMeasurement(measureSampleInterval);
  }
}

function scanVisiblePixels(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;

      pixels[y * width + x] = 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  const bounds = right < left || bottom < top ? null : { left, top, right, bottom };

  return {
    bounds,
    hitMap: {
      width,
      height,
      pixels
    }
  };
}

function unionVideoBounds(current, next) {
  return {
    left: Math.min(current.left, next.left),
    top: Math.min(current.top, next.top),
    right: Math.max(current.right, next.right),
    bottom: Math.max(current.bottom, next.bottom)
  };
}

function updateContentBounds() {
  if (!measuredVideoBounds) return;

  const videoRect = video.getBoundingClientRect();
  const renderedVideo = getRenderedVideoRect(videoRect);
  const mappedBounds = mapVideoBoundsToWindow(renderedVideo);

  updateBubbleAnchor(mappedBounds);

  window.desktopPet.setContentBounds(mappedBounds).then((nextState) => {
    if (nextState) windowState = nextState;
  });
}

function getRenderedVideoRect(videoRect) {
  const videoRatio = video.videoWidth / video.videoHeight;
  const elementRatio = videoRect.width / videoRect.height;

  if (elementRatio > videoRatio) {
    const width = videoRect.height * videoRatio;
    return {
      x: videoRect.left + (videoRect.width - width) / 2,
      y: videoRect.top,
      width,
      height: videoRect.height
    };
  }

  const height = videoRect.width / videoRatio;
  return {
    x: videoRect.left,
    y: videoRect.top + (videoRect.height - height) / 2,
    width: videoRect.width,
    height
  };
}

function mapVideoBoundsToWindow(renderedVideo) {
  const scaleX = renderedVideo.width / video.videoWidth;
  const scaleY = renderedVideo.height / video.videoHeight;
  const rawLeft = measuredVideoBounds.left * scaleX;
  const rawRight = measuredVideoBounds.right * scaleX;
  const leftOffset = lastDirection < 0 ? renderedVideo.width - rawRight : rawLeft;
  const rightOffset = lastDirection < 0 ? renderedVideo.width - rawLeft : rawRight;

  return {
    left: renderedVideo.x + leftOffset,
    top: renderedVideo.y + measuredVideoBounds.top * scaleY,
    right: renderedVideo.x + rightOffset,
    bottom: renderedVideo.y + measuredVideoBounds.bottom * scaleY
  };
}

function updateBubbleAnchor(bounds) {
  const shellRect = document.documentElement.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  const padding = 8;
  const halfBubbleWidth = Math.max(80, bubbleRect.width / 2);
  const minX = padding + halfBubbleWidth;
  const maxX = shellRect.width - padding - halfBubbleWidth;
  const visibleCenterX = bounds.left + (bounds.right - bounds.left) / 2;
  const x = clamp(visibleCenterX, minX, Math.max(minX, maxX));
  const y = Math.max(48, bounds.top - 2);

  document.documentElement.style.setProperty('--bubble-x', `${Math.round(x)}px`);
  document.documentElement.style.setProperty('--bubble-y', `${Math.round(y)}px`);
}

function setMouseEventsIgnored(ignored) {
  if (mouseEventsIgnored === ignored) return;

  mouseEventsIgnored = ignored;
  window.desktopPet.setMouseEventsIgnored(ignored);
}

function isVisiblePixelAtPoint(point) {
  if (!hitMap || !video.videoWidth || !video.videoHeight) return true;

  const videoRect = video.getBoundingClientRect();
  const renderedVideo = getRenderedVideoRect(videoRect);

  if (
    point.x < renderedVideo.x ||
    point.x >= renderedVideo.x + renderedVideo.width ||
    point.y < renderedVideo.y ||
    point.y >= renderedVideo.y + renderedVideo.height
  ) {
    return false;
  }

  let videoX = ((point.x - renderedVideo.x) / renderedVideo.width) * hitMap.width;
  const videoY = ((point.y - renderedVideo.y) / renderedVideo.height) * hitMap.height;

  if (lastDirection < 0) {
    videoX = hitMap.width - videoX;
  }

  const x = clamp(Math.floor(videoX), 0, hitMap.width - 1);
  const y = clamp(Math.floor(videoY), 0, hitMap.height - 1);

  return hitMap.pixels[y * hitMap.width + x] === 1;
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

video.addEventListener('ended', () => {
  if (temporaryActions.has(currentAction)) setAction(randomFrom(idleActions));
});

video.addEventListener('loadeddata', () => {
  scheduleContentBoundsMeasurement(120);
});

video.addEventListener('playing', () => {
  scheduleContentBoundsMeasurement(180);
});

window.addEventListener('resize', () => {
  updateContentBounds();
});

setAction('sit');
setDirection(1);
setMouseEventsIgnored(true);
window.setTimeout(() => say('博士，我在桌面待命。', 4200), 800);
scheduleIdleAction();
scheduleTalking();
scheduleRoaming(3200);
