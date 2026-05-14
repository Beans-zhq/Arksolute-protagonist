const video = document.getElementById('petVideo');
const bubble = document.getElementById('bubble');
const dragRegion = document.getElementById('dragRegion');
const menuButton = document.getElementById('menuButton');
const minButton = document.getElementById('minButton');

const assets = {
  sit: '../assets/维什戴尔-绝对主角-基建-Sit-x1.webm',
  relax: '../assets/维什戴尔-绝对主角-基建-Relax-x1.webm',
  sleep: '../assets/维什戴尔-绝对主角-基建-Sleep-x1.webm',
  move: '../assets/维什戴尔-绝对主角-基建-Move-x1.webm',
  interact: '../assets/维什戴尔-绝对主角-基建-Interact-x1.webm',
  special: '../assets/维什戴尔-绝对主角-基建-Special-x1.webm'
};

const idleActions = ['sit', 'relax', 'move'];
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

const clickThreshold = 5;
const dragSampleMs = 16;

function setAction(action, options = {}) {
  if (!assets[action]) return;

  currentAction = action;
  video.src = assets[action];
  video.loop = !temporaryActions.has(action);
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
}

function say(text, duration = 5200) {
  bubble.textContent = text;
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
    if (!temporaryActions.has(currentAction)) {
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

async function startRoaming() {
  if (isDragging || temporaryActions.has(currentAction)) {
    scheduleRoaming(randomBetween(2400, 5200));
    return;
  }

  windowState = await window.desktopPet.getWindowState();
  if (!windowState) {
    scheduleRoaming();
    return;
  }

  const { bounds, workArea } = windowState;
  const minX = workArea.x;
  const maxX = workArea.x + workArea.width - bounds.width;
  const usableWidth = Math.max(0, maxX - minX);

  if (usableWidth < 32) {
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
  setAction('move');
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
    const { bounds, workArea } = nextState;
    const minX = workArea.x;
    const maxX = workArea.x + workArea.width - bounds.width;
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
}

function settleAfterRoam(hitEdge = false) {
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

function getPointerPoint(event) {
  return { x: event.clientX, y: event.clientY };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function beginManualDrag(event) {
  if (event.button !== 0) return;
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
  event.preventDefault();
  window.desktopPet.showMenu();
});

menuButton.addEventListener('click', () => {
  window.desktopPet.showMenu();
});

minButton.addEventListener('click', () => {
  window.desktopPet.minimize();
});

window.desktopPet.onSetAction((action) => {
  stopRoaming();
  scheduleRoaming(randomBetween(7000, 14000));
  setAction(action);
});

window.desktopPet.onSayRandom(() => {
  sayRandom();
});

video.addEventListener('ended', () => {
  if (temporaryActions.has(currentAction)) setAction(randomFrom(idleActions));
});

setAction('sit');
setDirection(1);
window.setTimeout(() => say('博士，我在桌面待命。', 4200), 800);
scheduleIdleAction();
scheduleTalking();
scheduleRoaming(3200);
