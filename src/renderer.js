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
  '别忘了把重要的东西备份。真的，别忘。'
];

const interactionLines = [
  '嗯？找我有什么事？',
  '别突然点我，我会认真回应的。',
  '互动确认。今天的博士也很忙。',
  '收到，注意力已经分给你一点了。'
];

const specialLines = [
  '既然你想看，那就稍微认真一点。',
  '特别演出时间。别眨眼。',
  '主角登场，总要有点仪式感。'
];

let currentAction = 'sit';
let idleTimer;
let talkTimer;
let bubbleTimer;
let temporaryTimer;

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
    sayRandom();
    scheduleTalking();
  }, randomBetween(22000, 56000));
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

dragRegion.addEventListener('click', () => {
  setAction('interact');
  say(randomFrom(interactionLines), 3600);
});

dragRegion.addEventListener('dblclick', () => {
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
  setAction(action);
});

window.desktopPet.onSayRandom(() => {
  sayRandom();
});

video.addEventListener('ended', () => {
  if (temporaryActions.has(currentAction)) setAction(randomFrom(idleActions));
});

setAction('sit');
window.setTimeout(() => say('博士，我在桌面待命。', 4200), 800);
scheduleIdleAction();
scheduleTalking();
