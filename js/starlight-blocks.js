(() => {
'use strict';
const get = id => document.getElementById('sb-' + id);
const shell = get('game'), canvas = get('board'), ctx = canvas.getContext('2d');
const stage = shell.querySelector('.sb-stage'), scene = stage.querySelector('.sb-scene');
const field = get('field'), gauge = get('stars'), starSlots = [...gauge.children];
const width = 10, height = 18, unit = 32;
const boardWidth = width * unit, boardHeight = height * unit;
const activeModes = ['play','lesson'];
const rowScores = [0,100,260,460,740];
const ghostDash = [4,4], solidLine = [];
const clearStrengths = [0,.45,.72,.86,1];
const blockSymbols = {O:'✦',T:'◇',J:'☾',S:'✿'};
const pieces = {
  I: [[0,1],[1,1],[2,1],[3,1]], O: [[1,0],[2,0],[1,1],[2,1]],
  T: [[1,0],[0,1],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]],
  Z: [[0,0],[1,0],[1,1],[2,1]]
};
const colors = {I:'#68cdeb',O:'#ffd080',T:'#bd91ed',J:'#819eff',L:'#fca777',S:'#88d9b9',Z:'#ed8eb7'};
const tileArt = {};
if (typeof Image === 'function') {
  const sources = {I:"assets/blocks/sky.png",O:"assets/blocks/gold.png",T:"assets/blocks/purple.png",
    J:"assets/blocks/blue.png",L:"assets/blocks/peach.png",S:"assets/blocks/mint.png",Z:"assets/blocks/pink.png"};
  for (const [type,src] of Object.entries(sources)) {
    tileArt[type] = new Image();
    tileArt[type].src = src;
  }
}
const testMode = typeof location !== 'undefined' && (new URLSearchParams(location.search).has('block-test') || location.hash === '#block-test' || document.documentElement?.hasAttribute('data-block-test'));
const storageKey = testMode ? 'moonlight-starlight-blocks-test-v1' : 'moonlight-starlight-blocks-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const empty = () => Array(width).fill(null);
let record = {score:0, combo:0, learned:false, muted:false, musicMuted:false, wins:0, bestTime:null};
function readRecord() {
  try {
    const {homeCard, ...savedRecord} = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    return savedRecord;
  }
  catch { return {}; }
}
Object.assign(record, readRecord());
const save = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(record));
  } catch {}
};
let state, frameId, lastTime, pointer, audio, toastTimer;
const fallTimes = [910,660,500,400,340,290,255,225,200,180];
const finishLines = 60;
const fallInterval = level => fallTimes[level-1];
function formatTime(ms) {
  const tenths = Math.floor(ms/100);
  return String(Math.floor(tenths/600)).padStart(2,'0')+':'+
    String(Math.floor(tenths/10)%60).padStart(2,'0')+'.'+tenths%10;
}
const attacksByLevel = {
  3:[[1,1]], 4:[[1,1],[3,1]], 5:[[1,2]], 6:[[1,1],[3,1],[4,1]],
  7:[[1,3]], 8:[[1,2],[3,1]], 9:[[1,3],[3,2]], 10:[[1,2],[3,2]]
};
const valid = (piece, board = state.board) => piece.cells.every(([cx,cy]) => {
  const x = cx + piece.x, y = cy + piece.y;
  return x >= 0 && x < width && y >= 0 && y < height && !board[y][x];
});
function fillQueue() {
  while (state.queue.length < 3) {
    const bag = Object.keys(pieces);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i],bag[j]] = [bag[j],bag[i]];
    }
    state.queue.push(...bag);
  }
}
function spawn() {
  fillQueue();
  const type = state.queue.shift();
  state.active = {type, cells:pieces[type], x:3, y:0};
  state.elapsed = state.lockTime = state.resets = 0;
  state.contacted = false;
  state.motion = null;
  if (!valid(state.active)) {
    state.active = null;
    finish();
  }
}
function grounded() { return !valid({...state.active, y:state.active.y + 1}); }
function toast(message) {
  clearTimeout(toastTimer);
  get('notice').textContent = message;
  get('notice').hidden = false;
  toastTimer = setTimeout(() => get('notice').hidden = true, 1450);
}
const clips = {drop:"assets/blocks/soft-drop.wav",land:"assets/blocks/land.wav",hard:"assets/blocks/hard-land.wav",clear:"assets/blocks/clear.wav"};
const clearClips = ["assets/blocks/clear-1.wav","assets/blocks/clear-2.wav","assets/blocks/clear-3.wav","assets/blocks/clear-4.wav"];
const fallback = {};
let music, musicBeat = -1;
let audioNeedsTap = false;
function showAudioPrompt() {
  get('audio-enable').hidden = !audioNeedsTap || (record.muted && record.musicMuted) ||
    !activeModes.includes(state?.mode);
}
const musicBeatLength = 60/116/2;
function musicPressure() {
  if (!music || music.paused || record.musicMuted) return;
  const top = state.board.findIndex(row => row.some(Boolean));
  const pressured = state.level >= 5 || (top >= 0 && top <= 6);
  music.playbackRate = pressured ? 1.065 : 1;
  const beat = Math.floor(music.currentTime/musicBeatLength);
  if (beat === musicBeat) return;
  musicBeat = beat;
  if (!pressured || record.muted || audio?.state !== 'running') return;
  const clock = audio.currentTime;
  const pulse = audio.createOscillator();
  const envelope = audio.createGain();
  pulse.type = 'triangle';
  pulse.frequency.setValueAtTime(beat%4===0 ? 155 : 465,clock);
  pulse.frequency.exponentialRampToValueAtTime(beat%4===0 ? 58 : 210,clock+.065);
  envelope.gain.setValueAtTime(beat%4===0 ? .12 : .048,clock);
  envelope.gain.exponentialRampToValueAtTime(.001,clock+.085);
  pulse.connect(envelope).connect(audio.destination);
  pulse.start(clock);
  pulse.stop(clock+.09);
}
function syncMusic() {
  if (typeof Audio !== 'function') return;
  try {
    const playing = state?.mode === 'play' || (state?.mode === 'power' && state.beforeAim === 'play');
    if (record.musicMuted || shell.hidden || !playing) {
      music?.pause();
      return;
    }
    if (!music) {
      music = new Audio("assets/blocks/starlight-cloud-circuit.mp3");
      music.loop = true;
      music.volume = .25;
    }
    if (music.paused) music.play().then(() => {
      audioNeedsTap = false;
      showAudioPrompt();
    }).catch(() => {
      if (music.paused && state?.mode === 'play' && !record.musicMuted && !shell.hidden) {
        audioNeedsTap = true;
        showAudioPrompt();
      }
    });
  } catch {}
}
function playClip(name) {
  if (typeof Audio !== 'function') return;
  try {
    const clip = fallback[name] ||= new Audio(clips[name] || name);
    clip.currentTime = 0;
    clip.play().catch(() => {});
  } catch {}
}
function sound(notes) {
  if (record.muted) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) { if (notes.length) playClip('clear'); return; }
  try {
    audio ||= new Audio();
    if (audio.state !== 'running') {
      audio.resume().then(() => {
        if (record.musicMuted) {
          audioNeedsTap = false;
          showAudioPrompt();
        }
      }).catch(() => {
        audioNeedsTap = true;
        showAudioPrompt();
      });
      if (notes.length) playClip('clear');
      return;
    }
    const time = audio.currentTime;
    notes.forEach((freq,i) => {
      const start = time + i * .055;
      const wave = audio.createOscillator(), gain = audio.createGain();
      wave.type = 'sine';
      wave.frequency.value = freq;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(.09,start+.014);
      gain.gain.exponentialRampToValueAtTime(.001,start+.22);
      wave.connect(gain).connect(audio.destination);
      wave.start(start);
      wave.stop(start+.23);
    });
  } catch { if (notes.length) playClip('clear'); }
}
function unlockGameAudio() {
  if (shell.hidden || !state) return;
  sound([]);
  syncMusic();
}
function landingSound(hard, clearing) {
  if (record.muted) return;
  if (audio?.state !== 'running') { playClip(hard ? 'hard' : 'land'); return; }
  const time = audio.currentTime;
  const strength = clearing ? .72 : 1;
  clearTone(time,hard ? 320 : 415,hard ? 78 : 128,(hard ? .43 : .33)*strength,.105,'triangle');
  clearTone(time,hard ? 1200 : 1510,525,.06*strength,.034,'triangle');
  clearTone(time,hard ? 195 : 270,hard ? 153 : 206,.17*strength,.24);
  clearTone(time+.027,hard ? 620 : 735,hard ? 545 : 655,.06*strength,.175);
  if (hard) {
    clearTone(time,190,102,.15*strength,.14);
    clearTone(time+.038,1047,1000,.073*strength,.25);
    clearTone(time+.075,1568,1510,.033*strength,.19);
  }
}
function update() {
  const score = get('score');
  get('clock').textContent = formatTime(state.runTime);
  get('wins').textContent = record.wins+'회';
  get('best-score').textContent = record.score.toLocaleString('ko-KR');
  get('best-time').textContent = record.bestTime === null ? '—' : formatTime(record.bestTime);
  get('reset-wins').hidden = state.mode !== 'paused';
  get('open-test').hidden = testMode || state.mode !== 'paused';
  get('reset-wins').disabled = record.wins === 0;
  score.textContent = state.score.toLocaleString('ko-KR');
  score.setAttribute('data-wide',score.textContent.length > 5 ? 'true' : 'false');
  get('level').textContent = state.level;
  get('combo').textContent = state.combo;
  updatePowers();
  updateDanger();
  get('mute').textContent = record.muted ? '효과음 끔 · 눌러 켜기' : '효과음 켬 · 눌러 끄기';
  get('mute').setAttribute('aria-pressed',String(!record.muted));
  get('music').textContent = record.musicMuted ? '배경음악 끔' : '배경음악 켬';
  get('music').setAttribute('aria-pressed',String(!record.musicMuted));
  syncMusic();
  showAudioPrompt();
  const preview = get('next');
  preview.replaceChildren(...state.queue.slice(0,2).map(type => {
    const grid = document.createElement('span');
    grid.className = 'sb-mini';
    const cells = pieces[type];
    const left = Math.min(...cells.map(([x]) => x));
    const top = Math.min(...cells.map(([,y]) => y));
    for (const [x,y] of cells) {
      const block = tileArt[type].cloneNode();
      block.alt = '';
      block.style.gridArea = (y-top+1) + '/' + (x-left+1);
      grid.append(block);
    }
    return grid;
  }));
}
function canAim() {
  return !state.dropFlight && (state.mode === 'lesson' || (state.mode === 'play' && !!state.active));
}
function updatePowers() {
  gauge.setAttribute('aria-label','별빛 '+state.charge+'/5');
  starSlots.forEach((slot,i) => slot.classList.toggle('ready',i < state.charge));
  const aiming = state.mode === 'aim';
  for (const [id,cost] of [['meteor',3],['cross',5]]) {
    const button = get(id);
    button.disabled = !(aiming || canAim()) || state.charge < cost;
    button.setAttribute('aria-pressed',String(aiming && state.cost === cost));
  }
  get('pause').disabled = state.mode === 'lesson';
  canvas.classList.toggle('sb-full',state.charge === 5);
}
function remember() {
  record.score = Math.max(record.score,state.score);
  record.combo = Math.max(record.combo,state.bestCombo);
  save();
}
function panel(title, message, primary, secondary = '오락실') {
  get('panel-title').textContent = title;
  get('panel-message').textContent = message;
  get('primary').textContent = primary;
  get('secondary').textContent = secondary;
  const dialog = get('panel');
  const panelHost = state.mode === 'ended' ? field : shell;
  if (dialog.parentElement !== panelHost) panelHost.append(dialog);
  get('panel').hidden = false;
  get('primary').focus();
}
function finish(won = false) {
  state.mode = 'ended';
  shell.classList.toggle('sb-ended',true);
  if (won) {
    record.wins++;
    if (record.bestTime === null || state.runTime < record.bestTime) record.bestTime = state.runTime;
  }
  remember();
  panel(won ? '60줄 완주!' : '별빛 결산',
    '점수 '+state.score.toLocaleString('ko-KR')+' · '+Math.min(state.lines,finishLines)+'줄'+
    '\n플레이 시간 '+formatTime(state.runTime)+' · 누적 완주 '+record.wins+'회'+
    '\n최고점 '+record.score.toLocaleString('ko-KR')+
    ' · 최단 완주 '+(record.bestTime === null ? '—' : formatTime(record.bestTime)),
    '다시 도전');
  sound(won ? [523,659,784,1047] : [392,330,262]);
  update();
}
function start(lesson = !record.learned, level = 1) {
  sound([]);
  lastSoftDrop = -Infinity;
  cancelAnimationFrame(frameId);
  clearTimeout(toastTimer);
  pointer = null;
  clearChargeFlights();
  canvas.classList.remove('sb-shake');
  starSlots.forEach(slot => slot.classList.remove('sb-spark'));
  document.getElementById('home').hidden = true;
  shell.hidden = false;
  layoutPending = true;
  shell.classList.toggle('sb-ended',false);
  get('intro').hidden = get('panel').hidden = get('notice').hidden = true;
  get('lesson').hidden = !lesson;
  state = {board:Array.from({length:height},empty), queue:[], active:null, mode:lesson?'lesson':'play',
    score:0, lines:(level-1)*6, combo:0, bestCombo:0, level, charge:0, target:null, flash:null, lessonPlaced:false,
    runTime:0, clockTenth:0, placements:0, attacks:[], chargeFlights:[]};
  if (lesson) {
    state.queue.push('O','L','T');
    for (const x of [0,1,2,3,4,7,8,9]) state.board[height-1][x] = x < 4 ? 'T':'S';
    get('lesson-text').textContent = '판을 옆으로 밀어 점선을 빈틈에 맞춘 뒤 떨어뜨려 보세요.';
    get('skip').textContent = '건너뛰기';
  }
  if (level > 1) planAttacks(level);
  spawn();
  update();
  canvas.focus({preventScroll:true});
  lastTime = performance.now();
  frameId = requestAnimationFrame(tick);
}
function leave() {
  if (state.mode !== 'lesson') remember();
  cancelAnimationFrame(frameId);
  clearTimeout(toastTimer);
  clearChargeFlights();
  pointer = null;
  shell.hidden = true;
  syncMusic();
  document.getElementById('home').hidden = false;
  window.moonlightArcade.refreshHomeRecords?.();
  document.querySelector('[data-game="blocks"]').focus({preventScroll:true});
}
function completeLesson() {
  record.learned = true;
  save();
  start(false);
}
function showLanding(active, distance = 0) {
  state.impact = {
    cells:active.cells.map(([x,y])=>[x+active.x,y+active.y]), type:active.type,
    start:performance.now(),distance
  };
}
function contactFloor() {
  if (!grounded()) {
    state.contacted = false;
  } else if (!state.contacted) {
    state.contacted = true;
    state.elapsed = 0;
    showLanding(state.active);
    landingSound(false,false);
  }
}
function planAttacks(level) {
  const pattern = attacksByLevel[level];
  if (!pattern) return;
  const gap = Math.floor(Math.random()*width);
  for (const [delay,count] of pattern) {
    const rows = Array.from({length:count},(_,i) => {
      const hole = (gap+delay*3+i*3)%width;
      const holes = level >= 7 ? [hole] :
        [hole,(hole+(level===3 ? (hole===width-1 ? -1 : 1) : 3))%width];
      return empty().map((_,x) => holes.includes(x) ? null : 'rubble');
    });
    state.attacks.push({at:state.placements+delay,rows});
  }
  state.attacks.sort((a,b) => a.at-b.at);
}
function attackWarning() {
  const attack = state.attacks[0];
  return attack ? Math.max(1,attack.at-state.placements)+'블록 뒤 +'+attack.rows.length+'줄' : '';
}
function updateDanger() {
  field.classList.toggle('sb-danger',state.board.slice(0,5).some(row => row.some(Boolean)));
  const attack = state.attacks[0];
  const warning = get('attack');
  warning.textContent = attackWarning();
  warning.hidden = !attack;
  const imminent = !!attack && attack.at-state.placements <= 1;
  warning.classList.toggle('sb-imminent',imminent);
  if (imminent && state.warnedAttack !== attack) {
    state.warnedAttack = attack;
    sound([147]);
  }
}
function fullRows(board) {
  return board.flatMap((row,y) => row.every(Boolean) ? [y] : []);
}
function collapseRows(board, rows) {
  return [...rows.map(empty),...board.filter((_,y) => !rows.includes(y))];
}
function compressColumns(board, rows) {
  const compacted = Array.from({length:height},empty);
  const tiles = [];
  for (let x=0;x<width;x++) {
    let toY = height-1;
    for (let y=height-1;y>=0;y--) {
      const type = board[y][x];
      if (!type || rows.includes(y)) continue;
      compacted[toY][x] = type;
      tiles.push({x,y,toY,type});
      toY--;
    }
  }
  return {board:compacted,tiles};
}
function scoreRows(count, chain = false) {
  state.combo += count;
  state.bestCombo = Math.max(state.bestCombo,state.combo);
  state.lines += count;
  state.score += (rowScores[count] || 100*count)*state.level
    + (35*(state.combo-1) + (chain ? 150*count : 0))*state.level;
  state.level = Math.min(fallTimes.length,1+Math.floor(state.lines/6));
}
function riseDue() {
  let risen = 0;
  while (risen < 3 && state.attacks[0]?.at <= state.placements) {
    const attack = state.attacks[0];
    const rows = attack.rows.splice(0,3-risen);
    if (!attack.rows.length) state.attacks.shift();
    if (state.board.slice(0,rows.length).some(row => row.some(Boolean))) {
      state.active = null;
      finish();
      return false;
    }
    state.board.splice(0,rows.length);
    state.board.push(...rows);
    risen += rows.length;
  }
  if (risen) {
    state.riseAt = performance.now();
    state.riseRows = risen;
    toast('별먼지 바닥 +'+risen+'줄'+(state.attacks.length ? ' · '+attackWarning() : ''));
    if (!record.muted && audio?.state === 'running') {
      const time = audio.currentTime;
      clearTone(time,95,55,.28,.23,'triangle');
      clearTone(time+.04,225,92,.13,.22);
    }
  }
  return true;
}
function locked(hard = false, distance = 0) {
  const {active, board} = state;
  pointer = null;
  state.elapsed = 0;
  for (const [x,y] of active.cells) board[active.y+y][active.x+x] = active.type;
  const full = fullRows(board);
  if (hard || !state.contacted) {
    showLanding(active,distance);
    landingSound(hard,full.length > 0);
  }
  if (state.mode === 'lesson') {
    if (!full.length) {
      for (const [x,y] of active.cells) board[active.y+y][active.x+x] = null;
      active.x = 3; active.y = 0;
      toast('점선을 빈 두 칸에 맞춰보세요');
      return;
    }
    state.board = collapseRows(board,full);
    state.active = null;
    state.lessonPlaced = true;
    beginClear(board,full,active,1,3);
    get('lesson-text').textContent = '연속으로 줄을 지우면 콤보! 별빛으로 세로줄도 지워 보세요.';
    get('skip').textContent = '게임 시작';
    update();
    return;
  }
  state.placements++;
  const previousLevel = state.level;
  if (!full.length) state.combo = 0;
  else {
    const previousCombo = state.combo;
    scoreRows(full.length);
    const earned = full.length >= 2 || Math.floor(state.combo/3) > Math.floor(previousCombo/3);
    state.board = collapseRows(board,full);
    beginClear(board,full,active,state.combo,earned ? (full.length === 4 ? 2 : 1) : 0);
    remember();
  }
  if (state.lines >= finishLines) {
    state.active = null;
    state.mode = 'finishing';
    state.nextPieceAt = state.flash.start+state.flash.lastHit+clearSettle;
    update();
    return;
  }
  if (!riseDue()) return;
  if (state.level > previousLevel) {
    planAttacks(state.level);
    const speed = (fallInterval(previousLevel)/fallInterval(state.level)).toFixed(1);
    const warning = state.attacks.length ? ' · '+attackWarning() : '';
    toast(state.level+'단계 · 낙하 '+speed+'배'+warning);
  }
  if (full.length) {
    state.active = null;
    state.nextPieceAt = state.flash.start + state.flash.lastHit + clearSettle;
  } else spawn();
  update();
}
let lastSoftDrop = -Infinity;
function action(name, manual = true) {
  if (shell.hidden || !activeModes.includes(state.mode) || !state.active || state.dropFlight) return;
  let next = {...state.active};
  if (name === 'drop') {
    while (valid({...next,y:next.y+1})) next.y++;
    const distance = next.y-state.active.y;
    if (distance > 0 && !reducedMotion.matches) {
      state.dropFlight = {target:next,distance,start:performance.now(),duration:Math.min(185,105+distance*6)};
      state.motion = null;
      updatePowers();
      if (!record.muted && audio?.state === 'running') {
        const time = audio.currentTime;
        const duration = state.dropFlight.duration/1000;
        clearTone(time,1250,310,.058,duration,'triangle');
        clearTone(time+.012,840,205,.038,duration-.012);
      }
    } else {
      state.active = next;
      locked(true,distance);
    }
    return;
  }
  if (name === 'down' || name === 'nudge') {
    next.y++;
    if (!valid(next)) return;
    if (name === 'nudge' && valid({...next,y:next.y+1})) next.y++;
  } else if (name === 'left' || name === 'right') {
    next.x += name === 'left' ? -1 : 1;
  } else {
    if (next.type === 'O') return;
    const pivot = next.type === 'I' ? 3 : 2;
    next.cells = next.cells.map(([x,y]) => name === 'reverse' ? [y,pivot-x] : [pivot-y,x]);
    const kicks = [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1]];
    if (next.type === 'I') kicks.push([0,-2],[-1,-2],[1,-2],[-2,-2],[2,-2]);
    const kick = kicks.find(([x,y]) => valid({...next,x:next.x+x,y:next.y+y}));
    if (!kick) return;
    next.x += kick[0]; next.y += kick[1];
  }
  if (!valid(next)) return;
  if (grounded() && name !== 'down' && name !== 'nudge' && state.resets < 8) {
    state.lockTime = 0;
    state.resets++;
  }
  if (manual) state.motion = {piece:state.active, name, start:performance.now()};
  if (pointer && pointer.piece === state.active) pointer.piece = next;
  state.active = next;
  contactFloor();
  if ((name === 'down' || name === 'nudge') && manual && !state.contacted && !record.muted) {
    const now = performance.now();
    if (now - lastSoftDrop >= 38) {
      lastSoftDrop = now;
      playClip('drop');
    }
  }
}
function drawBlock(x,y,type,ghost = false) {
  const px = x * unit, py = y * unit;
  const color = colors[type] || '#766478';
  if (ghost) {
    ctx.fillStyle = '#d2b7f34a';
    ctx.fillRect(px+4,py+4,unit-8,unit-8);
    ctx.strokeStyle = '#c9b8e0'; ctx.lineWidth = 2;
    ctx.setLineDash(ghostDash);
    ctx.strokeRect(px+4,py+4,unit-8,unit-8);
    ctx.setLineDash(solidLine);
    return;
  }
  const tile = tileArt[type];
  if (tile?.complete && tile.naturalWidth) {
    ctx.drawImage(tile,px,py,unit,unit);
    return;
  }
  ctx.fillStyle = '#231637'; ctx.fillRect(px+1,py+1,unit-2,unit-2);
  ctx.fillStyle = color; ctx.fillRect(px+2,py+2,unit-4,unit-5);
  ctx.fillStyle = '#ffffff85'; ctx.fillRect(px+3,py+3,unit-7,2);
  ctx.fillStyle = '#ffffff42'; ctx.fillRect(px+3,py+5,2,unit-11);
  ctx.fillStyle = '#30184b55'; ctx.fillRect(px+5,py+unit-7,unit-8,4);
  if (blockSymbols[type]) {
    ctx.fillStyle = '#2e164e78';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(blockSymbols[type],px+16,py+21);
  }
}
const maxParticles = 84;
let particlesLeft = maxParticles;
function starBurst(x,y,size,rotation) {
  if (particlesLeft <= 0) return;
  particlesLeft--;
  ctx.beginPath();
  for (let i=0;i<10;i++) {
    const angle = rotation + i*Math.PI/5;
    const radius = i%2 ? size*.42 : size;
    const px = x + radius*Math.cos(angle);
    const py = y + radius*Math.sin(angle);
    if (i===0) ctx.moveTo(px,py);
    else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fill();
}
const clearWindup = 18;
const clearIntervalMs = 94;
const clearSettle = 86;
const powerHitStop = 80;
const powerSettle = 240;
const maxPowerChainRounds = 20;

function clearChargeFlights() {
  state?.chargeFlights.forEach(flight => flight.star?.remove());
}
function queueCharge(flash, amount) {
  const flights = state.chargeFlights;
  const previousCharge = state.charge;
  const count = Math.min(amount,5-previousCharge);
  state.charge += count;
  for (let i=0;i<count;i++) {
    const row = flash.rows[Math.min(i,flash.rows.length-1)];
    const start = Math.max(flash.start+flash.lastHit+i*85,(flights.at(-1)?.start ?? -Infinity)+85);
    flights.push({row,center:flash.center,start,slotIndex:previousCharge+i});
  }
  const cross = previousCharge < 5 && state.charge === 5;
  if (cross || (previousCharge < 3 && state.charge >= 3)) {
    state.readyEffect = {cross,start:flash.start};
    toast(cross ? '십자 삭제 준비!' : '세로 삭제 준비!');
    sound(cross ? [523,659,784,1047] : [659,880,1047]);
  }
}
function advanceCharge(now) {
  const flights = state.chargeFlights;
  flights.forEach(flight => {
    const t = (now-flight.start)/400;
    if (t < 0 || t >= 1 || reducedMotion.matches) return;
    const slot = starSlots[flight.slotIndex];
    if (!flight.star) {
      flight.star = document.createElement('span');
      flight.star.className = 'sb-flight';
      flight.star.setAttribute('aria-hidden','true');
      flight.star.textContent = '★';
      gauge.closest('.sb-scene').append(flight.star);
    }
    if (flight.slot !== slot) {
      const scene = flight.star.parentElement.getBoundingClientRect();
      const board = canvas.getBoundingClientRect();
      const target = slot.getBoundingClientRect();
      flight.fromX = board.left-scene.left+flight.center/width*board.width-10;
      flight.fromY = board.top-scene.top+(flight.row+.5)/height*board.height-10;
      flight.toX = target.left-scene.left+target.width/2-10;
      flight.toY = target.top-scene.top+target.height/2-10;
      flight.slot = slot;
    }
    const eased = t*(2-t);
    const x = flight.fromX+(flight.toX-flight.fromX)*eased+Math.sin(t*Math.PI)*18;
    const y = flight.fromY+(flight.toY-flight.fromY)*eased;
    flight.star.style.transform = 'translate('+x+'px,'+y+'px)';
  });
  while (flights[0] && now >= flights[0].start+400) {
    const flight = flights.shift();
    flight.star?.remove();
    const slot = starSlots[flight.slotIndex];
    slot.classList.remove('sb-spark');
    void slot.offsetWidth;
    slot.classList.add('sb-spark');
    sound([1047+(flight.slotIndex+1)*95]);
  }
}

function clearTone(time, high, low, volume, duration, type = 'sine') {
  const wave = audio.createOscillator(), gain = audio.createGain();
  wave.type = type;
  wave.frequency.setValueAtTime(high,time);
  wave.frequency.exponentialRampToValueAtTime(low,time+duration*.62);
  gain.gain.setValueAtTime(.001,time);
  gain.gain.exponentialRampToValueAtTime(volume,time+.006);
  gain.gain.exponentialRampToValueAtTime(.001,time+duration);
  wave.connect(gain).connect(audio.destination);
  wave.start(time);
  wave.stop(time+duration);
}

function beginClear(board, rows, active, combo, charge = 0) {
  const ordered = [...rows].reverse();
  const center = active ? active.x + active.cells.reduce((sum,[x]) => sum+x+.5,0)/active.cells.length : width/2;
  const start = performance.now();
  const lastHit = clearWindup+(ordered.length-1)*clearIntervalMs;
  state.flash = {board,rows:ordered,start,lastHit,center,combo,quad:ordered.length >= 4};
  queueCharge(state.flash,charge);
  if (state.flash.quad) state.quadEffect = state.flash;
  if (record.muted) return;
  if (audio?.state !== 'running') {
    playClip(clearClips[Math.min(4,ordered.length)-1]);
    return;
  }
  const time = audio.currentTime+clearWindup/1000;
  ordered.forEach((_,index) => {
    const hit = time+index*clearIntervalMs/1000;
    const final = index === ordered.length-1;
    clearTone(hit,230+index*35,final ? 72 : 125,final ? .37 : .25,.092,'triangle');
    clearTone(hit,1320+index*125,440,.085,.044,'triangle');
    clearTone(hit,406+index*58,290+index*38,final ? .16 : .11,.235);
    clearTone(hit+.032,850+index*90,760+index*78,.055,.198);
  });
  const last = audio.currentTime+lastHit/1000;
  if (combo > 1) {
    const note = 523.25 * 2 ** (Math.min(combo-1,7)*2/12);
    clearTone(last+.035,note,note,.067,.115);
  }
  clearTone(last+.098,290,122,.07,.042,'triangle');
  if (state.flash.quad) {
    clearTone(last+.015,140,73,.15,.26,'triangle');
    [523,784,1047].forEach((note,i) => clearTone(last+.04+i*.032,note,note,.057,.29));
  }
}

function drawMeteorTarget({x,y},cross) {
  ctx.fillStyle = '#e7aaff60';
  ctx.fillRect(x*unit,0,unit,boardHeight);
  if (cross) ctx.fillRect(0,y*unit,boardWidth,unit);
  ctx.fillStyle = '#fff1b8';
  ctx.fillRect(x*unit+3,0,5,boardHeight);
  if (cross) ctx.fillRect(0,y*unit+3,boardWidth,5);
  if (state.mode === 'aim') {
    ctx.save();
    ctx.strokeStyle = '#fff1b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x*unit+1,y*unit+1,unit-2,unit-2);
    ctx.restore();
  }
}

const quadTail = 610;

function drawQuadFinale(flash, age) {
  const elapsed = age-flash.lastHit;
  if (elapsed < 0 || elapsed >= quadTail) return;
  const t = elapsed/quadTail;
  const still = reducedMotion.matches;
  const x = boardWidth / 2;
  const y = Math.min(boardHeight-90,Math.max(100,(flash.rows[0]+.5)*unit-42));
  const titleY = Math.max(48,Math.min(boardHeight-130,y-56));
  ctx.save();
  if (!still) {
    const travel = 1-(1-t)**3;
    ctx.globalAlpha = .9*(1-t);
    ctx.strokeStyle = '#fff0ff';
    ctx.shadowColor = '#ec8dff';
    ctx.shadowBlur = 17;
    ctx.lineWidth = 7*(1-t)+1;
    ctx.strokeRect(5,5,boardWidth-10,boardHeight-10);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(x,y,18+travel*173,9+travel*112,0,0,Math.PI*2);
    ctx.stroke();
    for (let i=0;i<24;i++) {
      const angle = Math.PI*2*i/24;
      const reach = travel*(111+(i%4)*24);
      const px = x+Math.cos(angle)*reach;
      const py = y+Math.sin(angle)*reach*.68-travel*53;
      ctx.fillStyle = ['#fff3d7','#e8a5ff','#8bf1ff','#ffb2de'][i%4];
      starBurst(px,py,(i%3===0 ? 15 : 9)*(1-t*.75),angle+t*4);
    }
  }
  ctx.globalAlpha = Math.min(1,(1-t)*3);
  ctx.textAlign = 'center';
  ctx.font = '900 33px system-ui';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#211034';
  ctx.fillStyle = '#fff1cc';
  const title = flash.rows.length+'줄 동시 삭제';
  ctx.strokeText(title,x,titleY);
  ctx.fillText(title,x,titleY);
  ctx.font = '800 20px system-ui';
  ctx.lineWidth = 5;
  ctx.strokeText(flash.combo+' 콤보',x,titleY+29);
  ctx.fillText(flash.combo+' 콤보',x,titleY+29);
  ctx.restore();
}

function drawClearParticles(flash, age) {
  const still = reducedMotion.matches;
  if (flash.target) {
    const {x,y} = flash.target;
    if (!still && age < 105) {
      const px = (x+.5)*unit, py = (y+.5)*unit*Math.min(1,age/100)**2;
      ctx.save();
      ctx.fillStyle = '#dcc0ff';
      ctx.globalAlpha = .65;
      ctx.beginPath();
      ctx.moveTo(px-9,py);
      ctx.lineTo(px,Math.max(0,py-100));
      ctx.lineTo(px+9,py);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#cc8aff';
      ctx.shadowBlur = 21;
      ctx.fillStyle = '#fff3de';
      starBurst(px,py,19,age/40);
      ctx.restore();
    }
    flash.tiles.forEach(tile => {
      const t = (age-(still ? 0 : (Math.abs(tile.y-y)+Math.abs(tile.x-x))*3))/155;
      if (t >= 1) return;
      if (t < 0) return;
      ctx.globalAlpha = 1-t;
      ctx.fillStyle = colors[tile.type] || '#ddd1fa';
      const px = (tile.x+.5)*unit, py = (tile.y+.5)*unit;
      if (still) ctx.fillRect(px-12,py-12,24,24);
      else {
        starBurst(px,py-t*36,17-t*10,t*4);
        ctx.fillStyle = '#fff1ff';
        starBurst(px-t*18,py-t*16,4*(1-t*.7),t*5);
        starBurst(px+t*21,py+t*7,5*(1-t*.7),-t*4);
      }
    });
  } else {
    flash.rows.forEach((row,index) => {
      const t = (age-clearWindup-index*clearIntervalMs)/245;
      if (t < 0 || t >= 1) return;
      const strength = clearStrengths[Math.min(4,flash.rows.length)];
      ctx.globalAlpha = Math.max(0,1-t*4)*strength;
      ctx.fillStyle = flash.quad ? '#fff0ba' : '#fff2ff';
      ctx.fillRect(0,row*unit,boardWidth,unit);
      if (still) return;
      const travel = 1-(1-t)**2;
      flash.board[row].forEach((type,x) => {
        const px = (x+.5)*unit, py = (row+.5)*unit;
        const spread = (x+.5-flash.center)*travel*(flash.quad ? 18 : 14);
        ctx.globalAlpha = (1-t)**.65;
        ctx.fillStyle = colors[type] || '#ddd1fa';
        starBurst(px+spread,py-travel*(52+(x%4)*22),(flash.quad ? 24 : 21)*(1-t*.7),t*5+x);
        ctx.fillStyle = '#fff4fd';
        starBurst(px+spread*.6,py-travel*(24+(x%3)*16),9*(1-t*.75),x-t*3);
        ctx.globalAlpha *= .78;
        ctx.fillStyle = colors[type] || '#ddd1fa';
        starBurst(px-spread*.25,py+travel*(18+(x%3)*9),5*(1-t*.75),x+t*4);
      });
    });
    const hits = Math.min(flash.rows.length,1+Math.floor((age-clearWindup)/clearIntervalMs));
    const combo = flash.combo-flash.rows.length+hits;
    if (hits > 0 && combo > 1) {
      ctx.globalAlpha = Math.max(0,Math.min(1,(flash.lastHit+215-age)/115));
      ctx.font = '900 32px system-ui';
      ctx.textAlign = 'right';
      ctx.strokeStyle = '#231437';
      ctx.lineWidth = 5;
      ctx.fillStyle = '#f5dbff';
      const y = Math.max(35, Math.min(...flash.rows)*unit-10);
      const title = combo+' 콤보';
      ctx.strokeText(title,boardWidth-9,y);
      ctx.fillText(title,boardWidth-9,y);
    }
  }
  ctx.globalAlpha = 1;
}
function drawFallingPiece(flight, now) {
  const {target,distance,start,duration} = flight;
  const progress = Math.max(0,Math.min(1,(now-start)/duration));
  const traveled = distance*progress**1.45;
  const y = target.y-distance+traveled;
  const color = colors[target.type];
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  const columns = target.cells.map(([x]) => x);
  const head = (y+Math.min(...target.cells.map(([,cy]) => cy)))*unit+3;
  const tail = Math.max(0,head-Math.min(traveled*unit,3*unit));
  if (head > tail) {
    const left = (target.x+Math.min(...columns))*unit;
    const span = (Math.max(...columns)-Math.min(...columns)+1)*unit;
    const center = left+span/2;
    const light = ctx.createLinearGradient(0,tail,0,head);
    light.addColorStop(0,color+'00');
    light.addColorStop(.58,color+'90');
    light.addColorStop(1,color);
    ctx.fillStyle = light;
    ctx.fillRect(center-span*.36,tail,span*.72,head-tail);
    const core = ctx.createLinearGradient(0,tail,0,head);
    core.addColorStop(0,'#ffffff00');
    core.addColorStop(.45,'#fff6fb44');
    core.addColorStop(1,'#fffaff');
    ctx.fillStyle = core;
    ctx.fillRect(center-span*.24,tail,span*.48,head-tail);
  }
  target.cells.forEach(([cx,cy]) => drawBlock(target.x+cx,y+cy,target.type));
  ctx.restore();
}

function drawRotateTrail(piece, name, t) {
  const direction = name === 'reverse' ? -1 : 1;
  const pivot = piece.type === 'I' ? 2 : 1.5;
  const x = (piece.x+pivot)*unit, y = (piece.y+pivot)*unit;
  const radius = piece.type === 'I' ? 63 : 51;
  const centerAngle = y+radius > boardHeight ? -Math.PI/2 : Math.PI/2;
  const start = centerAngle-direction*Math.PI/4;
  const travel = Math.min(1,t/.83);
  const angle = start+direction*travel*Math.PI/2;
  const tail = Math.max(0,travel-.55);
  const fade = 1-Math.max(0,(t-.83)/.17);

  ctx.save();
  if (travel > 0) {
    ctx.globalAlpha = .3*fade;
    ctx.strokeStyle = '#ffd477';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x,y,radius,start+direction*tail*Math.PI/2,angle,direction < 0);
    ctx.stroke();
  }
  for (let i=3;i>=0;i--) {
    const behind = i*.16;
    const progress = travel-behind;
    if (progress < 0) continue;
    const position = start+direction*progress*Math.PI/2;
    const visibility = Math.min(1,progress/.12);
    const twinkle = i === 0 ? Math.sin(Math.PI*(1-fade)) : 0;
    ctx.globalAlpha = visibility*fade*(1-i*.17);
    ctx.fillStyle = i%2 ? '#ffd477' : '#fff7dc';
    starBurst(x+Math.cos(position)*radius,y+Math.sin(position)*radius,5-i*.7+twinkle*4,0);
  }
  ctx.restore();
}

let layoutPending = true, gestureStep = 11;
function updateLayout() {
  layoutPending = false;
  const viewport = window.visualViewport;
  shell.style.setProperty('--sb-viewport-width', (viewport?.width ?? window.innerWidth)+'px');
  shell.style.setProperty('--sb-viewport-height', (viewport?.height ?? window.innerHeight)+'px');
  const {width:stageWidth,height:stageHeight} = stage.getBoundingClientRect();
  scene.style.setProperty('--sb-scene-width', Math.min(stageWidth,stageHeight*320/568)+'px');
  const cssWidth = canvas.getBoundingClientRect().width;
  gestureStep = Math.max(11,cssWidth/width*.72);
  if (pointer && !pointer.aiming) pointer.step = gestureStep;
  if (cssWidth > 0) {
    const cellPixels = Math.max(1, Math.round(cssWidth * (window.devicePixelRatio || 1) / width));
    const pixelWidth = cellPixels * width, pixelHeight = cellPixels * height;
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const scale = cellPixels / unit;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
}

// The game frame consumes all viewport events together before updating or drawing.
const queueLayout = () => { layoutPending = true; };
window.addEventListener('resize',queueLayout);
window.visualViewport?.addEventListener('resize',queueLayout);
window.addEventListener('orientationchange',queueLayout);

function draw(now) {
  particlesLeft = maxParticles;
  ctx.fillStyle = '#160d27';
  ctx.fillRect(0,0,boardWidth,boardHeight);
  ctx.fillStyle = '#4b2a69';
  for (let x=1;x<width;x++) ctx.fillRect(x*unit,0,1,boardHeight);
  for (let y=1;y<height;y++) ctx.fillRect(0,y*unit,boardWidth,1);
  const flash = state.flash;
  const age = flash ? now-flash.start : Infinity;
  const settling = flash?.rows && age < flash.lastHit+clearSettle;
  if (flash?.quad && age >= flash.lastHit && !flash.shaken) {
    flash.shaken = true;
    if (!reducedMotion.matches) {
      canvas.classList.remove('sb-shake');
      void canvas.offsetWidth;
      canvas.classList.add('sb-shake');
    }
  }
  const gravity = flash?.gravity;
  const fallAge = age-(flash?.lastHit ?? 0);
  if (gravity && fallAge >= 0 && fallAge < powerSettle && !reducedMotion.matches) {
    const t = (fallAge/powerSettle)**2;
    gravity.forEach(({x,y,toY,type}) => drawBlock(x,y+(toY-y)*t,type));
  } else if (settling && (!gravity || fallAge < 0)) {
    const settle = reducedMotion.matches ? 1 : Math.max(0,Math.min(1,(age-flash.lastHit)/clearSettle));
    flash.board.forEach((row,y) => {
      const hit = flash.rows.indexOf(y);
      if (hit >= 0 && age >= clearWindup+hit*clearIntervalMs) return;
      const dy = hit >= 0 ? 0 : flash.rows.filter(cleared => cleared > y).length*settle;
      row.forEach((type,x) => { if (type) drawBlock(x,y+dy,type); });
      if (hit < 0) return;
      const untilHit = clearWindup+hit*clearIntervalMs-age;
      ctx.globalAlpha = untilHit < 38 ? .57 : .07;
      ctx.fillStyle = '#fff3ff';
      row.forEach((_,x) => ctx.fillRect(x*unit+4,y*unit+4,unit-8,unit-8));
      ctx.globalAlpha = 1;
    });
  } else {
    state.board.forEach((row,y) => row.forEach((type,x) => { if (type) drawBlock(x,y,type); }));
  }
  if (state.attacks[0]) {
    ctx.fillStyle = '#ffce87';
    state.attacks[0].rows[0].forEach((type,x) => {
      if (!type) ctx.fillRect(x*unit+4,boardHeight-5,unit-8,3);
    });
  }
  const riseStart = Math.max(state.riseAt ?? -Infinity,flash?.rows && state.riseAt >= flash.start ? flash.start+flash.lastHit+clearSettle : -Infinity);
  const riseAge = now-riseStart;
  if (state.riseAt && !settling && riseAge >= 0 && riseAge < 455) {
    const t = riseAge/455;
    ctx.save();
    ctx.globalAlpha = .85*(1-t);
    ctx.strokeStyle = '#dc9dff';
    ctx.shadowColor = '#bd62ff';
    ctx.shadowBlur = 17;
    ctx.lineWidth = 3;
    for (let i=0;i<state.riseRows;i++) {
      const y = boardHeight-(i+1)*unit;
      ctx.strokeRect(3,y+2,boardWidth-6,unit-4);
    }
    if (!reducedMotion.matches) {
      ctx.shadowBlur = 0;
      for (let i=0;i<16;i++) {
        ctx.fillStyle = i%3 ? '#d4a3ff' : '#fff1ce';
        starBurst(10+i*20,boardHeight-(8+(i%4)*25)*t,7*(1-t*.7),i+t*3);
      }
    }
    ctx.restore();
  }
  if (state.dropFlight) drawFallingPiece(state.dropFlight,now);
  else if (state.active && valid(state.active)) {
    const {type,cells,x,y} = state.active;
    let landing = y;
    if (!state.power) while (valid({...state.active,y:landing+1})) landing++;
    if (landing !== y) cells.forEach(([cx,cy]) => drawBlock(x+cx,landing+cy,type,true));
    const motion = state.motion;
    const rotating = motion?.name === 'rotate' || motion?.name === 'reverse';
    const t = motion ? Math.max(0,now-motion.start)/(rotating ? 180 : 125) : 1;
    if (motion && t >= 1) state.motion = null;
    if (motion && !rotating && t < 1 && !reducedMotion.matches) {
      const from = motion.piece;
      ctx.save();
      ctx.globalAlpha = .53*(1-t);
      ctx.shadowColor = colors[type];
      ctx.shadowBlur = 9;
      from.cells.forEach(([cx,cy]) => drawBlock(from.x+cx,from.y+cy,type));
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = colors[type];
    ctx.shadowBlur = 9;
    cells.forEach(([cx,cy]) => drawBlock(x+cx,y+cy,type));
    ctx.restore();
    if (rotating && t < 1 && !reducedMotion.matches) {
      drawRotateTrail(state.active,motion.name,t);
    }
  }
  if (state.impact) {
    const {cells,start,distance,type} = state.impact;
    const elapsed = Math.max(0,now-start);
    const still = reducedMotion.matches;
    const duration = still ? 145 : 330;
    if (elapsed >= duration) state.impact = null;
    else {
      const t = elapsed/duration, travel = 1-(1-t)**2;
      const floor = Math.max(...cells.map(([,y])=>y));
      cells.forEach(([x,y]) => {
        ctx.fillStyle = '#fff2ff';
        ctx.globalAlpha = (distance ? .93 : .78)*Math.max(0,1-elapsed/(distance ? 140 : 118));
        ctx.fillRect(x*unit+3,y*unit+3,unit-6,unit-6);
      });
      if (!still) cells.filter(([,y]) => y===floor).forEach(([x,y],i) => {
        const px = (x+.5)*unit, py = (y+1)*unit-4;
        ctx.globalAlpha = .85*(1-t);
        ctx.strokeStyle = colors[type];
        ctx.lineWidth = 3.8*(1-t)+.7;
        ctx.beginPath();
        ctx.ellipse(px,py,12+travel*(distance ? 43 : 30),3+travel*9,0,Math.PI,Math.PI*2);
        ctx.stroke();
        for (let j=0;j<7;j++) {
          ctx.globalAlpha = 1-t;
          ctx.fillStyle = j%2 ? colors[type] : '#fff4dd';
          starBurst(px+(j-3)*travel*15,py-travel*(17+(j%3)*15), (j%2 ? 9 : 6)*(1-t*.65),i+j+t*3);
        }
      });
      ctx.globalAlpha = 1;
    }
  }
  if (state.target) drawMeteorTarget(state.target,state.cost === 5);
  if (flash) {
    const duration = flash.target ? 430 : Math.max(360,flash.lastHit+245);
    if (age < duration) {
      drawClearParticles(flash,age);
    } else state.flash = null;
  }
  if (state.quadEffect) {
    const quadAge = now-state.quadEffect.start;
    if (quadAge < state.quadEffect.lastHit+quadTail) drawQuadFinale(state.quadEffect,quadAge);
    else state.quadEffect = null;
  }
  if (state.readyEffect) {
    const {cross,start} = state.readyEffect;
    const t = (now-start)/(cross ? 620 : 300);
    if (t >= 1) state.readyEffect = null;
    else {
      ctx.globalAlpha = (1-t)*.85;
      ctx.strokeStyle = cross ? '#d798ff' : '#ffe18b';
      ctx.lineWidth = 8;
      ctx.strokeRect(4,4,boardWidth-8,boardHeight-8);
      if (cross) {
        ctx.fillStyle = '#ba6cff';
        ctx.globalAlpha = (1-t)*.24;
        ctx.fillRect(0,0,boardWidth,boardHeight);
        if (!reducedMotion.matches) {
          const y = t*boardHeight;
          const wave = ctx.createLinearGradient(0,y-85,0,y+25);
          wave.addColorStop(0,'#ba6cff00');
          wave.addColorStop(.7,'#edd3ff');
          wave.addColorStop(1,'#ba6cff00');
          ctx.globalAlpha = .65*(1-t);
          ctx.fillStyle = wave;
          ctx.fillRect(0,y-85,boardWidth,110);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

function tick(now) {
  const resized = layoutPending;
  if (resized) updateLayout();
  if (state.mode === 'paused' && state.power) {
    if (resized) draw(state.power.pausedAt);
    frameId = requestAnimationFrame(tick);
    return;
  }
  const elapsed = now-lastTime;
  const delta = Math.min(50,elapsed);
  lastTime = now;
  advanceCharge(now);
  const powering = state.mode === 'power';
  if (powering && now >= state.power.until) advancePower(now);
  if (state.mode === 'finishing' && now >= state.nextPieceAt) finish(true);
  const flying = state.dropFlight;
  if (!powering && state.mode === 'play') {
    state.runTime += Math.max(0,elapsed);
    const tenth = Math.floor(state.runTime/100);
    if (tenth !== state.clockTenth) {
      state.clockTenth = tenth;
      get('clock').textContent = formatTime(state.runTime);
    }
    musicPressure();
    if (!flying && !state.active) {
      if (now >= state.nextPieceAt) { spawn(); update(); }
    } else if (!flying && grounded()) {
      contactFloor();
      state.lockTime += delta;
      if (state.lockTime >= 385) locked();
    } else if (!flying) {
      if (state.resets < 8) state.lockTime = 0;
      state.elapsed += delta;
      const interval = fallInterval(state.level);
      if (state.elapsed >= interval) {
        state.elapsed -= interval;
        action('down',false);
      }
    }
  }
  if (flying && activeModes.includes(state.mode) && now >= flying.start+flying.duration) {
    state.dropFlight = null;
    state.active = flying.target;
    locked(true,flying.distance);
  }
  draw(now);
  frameId = requestAnimationFrame(tick);
}
function aim(cost = 3) {
  const aiming = state.mode === 'aim';
  if (aiming && state.cost === cost) { closeAim(); return; }
  if ((!aiming && !canAim()) || state.charge < cost) return;
  state.cost = cost;
  pointer = null;
  if (!aiming) state.beforeAim = state.mode;
  state.target = null;
  state.mode = 'aim';
  canvas.focus({preventScroll:true});
  update();
}
function closeAim() {
  if (state.mode !== 'aim') return;
  state.mode = state.beforeAim;
  state.target = null;
  pointer = null;
  lastTime = performance.now();
  update();
  canvas.focus({preventScroll:true});
}
function pause(exit = false) {
  if (state.mode === 'ended' || state.mode === 'intro') { if (exit) leave(); return; }
  if (state.mode === 'aim') closeAim();
  if (state.mode === 'lesson') { if(exit) leave(); return; }
  if (state.mode !== 'play' && state.mode !== 'power') return;
  if (state.power) {
    state.power.pausedAt = performance.now();
    state.power.remaining = Math.max(0,state.power.until-state.power.pausedAt);
  }
  state.mode = 'paused';
  pointer = null;
  panel(exit?'오락실로 돌아갈까요?':'잠깐 쉬어요', '점수 ' + state.score + ' · 콤보 ' + state.combo, '계속하기', '기록 남기고 나가기');
  update();
}
get('back').onclick = () => pause(true);
get('pause').onclick = () => pause();
get('mute').onclick = () => { record.muted = !record.muted; save(); update(); if (!record.muted) sound([523]); };
get('open-test').onclick = () => {
  const url = new URL(location.href);
  url.hash = 'block-test';
  window.open(url.href,'_blank','noopener');
};
get('reset-wins').onclick = () => {
  if (state.mode !== 'paused' || record.wins === 0) return;
  if (!window.confirm('누적 완주 횟수를 0회로 초기화할까요? 최고점과 최단 완주 기록은 유지됩니다.')) return;
  record.wins = 0;
  save();
  update();
  get('primary').focus();
};
get('skip').onclick = completeLesson;
get('music').onclick = () => { record.musicMuted = !record.musicMuted; save(); update(); };
get('practice').onclick = () => start(true);
get('intro-skip').onclick = completeLesson;
get('meteor').onclick = () => aim(3);
get('cross').onclick = () => aim(5);
function activatePower() {
  if (!state.target) return;
  state.power = {target:state.target,cross:state.cost === 5,phase:'hit',chain:0,rounds:0,until:performance.now()+powerHitStop,
    keepLock:state.resets >= 8 && !!state.active && grounded()};
  state.mode = 'power';
  state.charge -= state.cost;
  state.motion = state.impact = null;
  canvas.focus({preventScroll:true});
  update();
}
function advancePower(now) {
  const power = state.power;
  if (power.phase === 'hit') {
    const {x,y} = power.target;
    const tiles = state.board.flatMap((row,cy) => row.flatMap((type,cx) =>
      type && (cx === x || (power.cross && cy === y)) ? [{x:cx,y:cy,type}] : []));
    const board = state.board.map(row => row.map((type,cx) => cx === x ? null : type));
    const gravity = power.cross ? compressColumns(board,[y]) : null;
    state.board = gravity ? gravity.board : board;
    power.keepLock &&= valid(state.active) && grounded();
    state.flash = {tiles,start:now,target:power.target,gravity:gravity?.tiles};
    state.target = null;
    power.phase = 'settle';
    power.until = now+(power.cross && reducedMotion.matches ? 0 : powerSettle);
    sound(power.cross ? [156,523,784,1047] : [196,659,880]);
    updateDanger();
    return;
  }
  const board = state.board;
  const rows = power.cross && power.rounds < maxPowerChainRounds ? fullRows(board) : [];
  if (rows.length) {
    const previousLevel = state.level;
    power.rounds++;
    power.chain += rows.length;
    scoreRows(rows.length,true);
    const gravity = compressColumns(board,rows);
    state.board = gravity.board;
    power.keepLock &&= valid(state.active) && grounded();
    beginClear(board,rows,null,state.combo);
    state.flash.gravity = gravity.tiles;
    power.until = state.flash.start+state.flash.lastHit+(reducedMotion.matches ? 0 : powerSettle);
    if (state.level > previousLevel && state.lines < finishLines) planAttacks(state.level);
    toast('별빛 연쇄 ×'+power.chain);
    remember();
    update();
    return;
  }
  state.power = null;
  if (state.lines >= finishLines) {
    state.active = null;
    finish(true);
    return;
  }
  const piece = state.active;
  if (piece && !valid(piece)) {
    const top = -Math.min(...piece.cells.map(([,y]) => y));
    while (piece.y > top && !valid(piece)) piece.y--;
    if (!valid(piece)) {
      state.active = null;
      finish();
      return;
    }
  }
  state.mode = state.beforeAim;
  state.elapsed = 0;
  if (!power.keepLock) {
    state.lockTime = 0;
    state.contacted = false;
  }
  if (state.mode === 'lesson') get('lesson-text').textContent = '세로줄을 지웠어요! 별빛 다섯 개로는 십자 삭제가 가능해요.';
  update();
}
get('primary').onclick = () => {
  if (state.mode === 'ended') {
    if (testMode) get('test-start').click();
    else start(false);
  }
  else {
    get('panel').hidden = true;
    lastTime = performance.now();
    const power = state.power;
    state.mode = power ? 'power' : 'play';
    if (power) {
      const pausedFor = lastTime-power.pausedAt;
      power.until = lastTime+power.remaining;
      for (const effect of new Set([state.flash,state.quadEffect,state.readyEffect,...state.chargeFlights])) {
        if (effect) effect.start += pausedFor;
      }
      if (state.riseAt) state.riseAt += pausedFor;
    }
    update();
    canvas.focus({preventScroll:true});
  }
};
get('secondary').onclick = leave;
// A touch activates playback when the finger lifts, before the gesture handler runs.
for (const eventName of ['pointerup','touchend','click']) {
  shell.addEventListener?.(eventName, unlockGameAudio, {capture:true, passive:true});
}
get('audio-enable').onclick = () => {
  unlockGameAudio();
  sound([523,784]);
};
canvas.onpointerdown = event => {
  if (event.button !== 0 || !event.isPrimary) return;
  if (audio?.state !== 'running') sound([]);
  if (state.mode === 'aim') {
    canvas.setPointerCapture?.(event.pointerId);
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,aiming:true};
    return;
  }
  if (!activeModes.includes(state.mode) || !state.active || state.dropFlight) return;
  canvas.setPointerCapture?.(event.pointerId);
  pointer = {id:event.pointerId,piece:state.active,x:event.clientX,y:event.clientY,axis:null,
    step:gestureStep};
};
function moveGesture(event) {
  if (!pointer || event.pointerId !== pointer.id || pointer.piece !== state.active) return;
  const dx = event.clientX-pointer.x, dy = event.clientY-pointer.y;
  if (!pointer.axis && Math.max(Math.abs(dx),Math.abs(dy)) >= 8) {
    pointer.axis = Math.abs(dx)>=Math.abs(dy) ? 'horizontal' : 'vertical';
  }
  if (pointer.axis === 'horizontal') {
    const steps = Math.trunc(dx/pointer.step);
    for (let i=0;i<Math.abs(steps);i++) action(steps>0?'right':'left');
    pointer.x += steps*pointer.step;
  } else if (pointer.axis === 'vertical') {
    pointer.downDistance = dy;
  }
}
canvas.onpointermove = moveGesture;
canvas.onpointerup = event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  if (pointer.aiming) {
    const tap = Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y) < 12;
    pointer = null;
    if (!tap || state.mode !== 'aim') return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX-rect.left)*width/rect.width);
    const y = Math.floor((event.clientY-rect.top)*height/rect.height);
    if (x<0 || x>=width || y<0 || y>=height) return;
    if (state.target?.tapped && state.target.x === x && state.target.y === y) activatePower();
    else state.target = {x,y,tapped:true};
    return;
  }
  if (pointer.piece !== state.active) return;
  moveGesture(event);
  const {axis,downDistance,step} = pointer;
  pointer = null;
  if (axis === 'vertical' && downDistance >= 12) {
    action(downDistance >= Math.max(62,step*3.1) ? 'drop' : 'nudge');
  } else if (!axis) action('rotate');
};
canvas.onpointercancel = canvas.onlostpointercapture = () => { pointer = null; };
document.addEventListener('keydown', event => {
  if (shell.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.mode === 'aim') closeAim();
    else if (state.mode === 'paused') get('primary').click();
    else pause();
    return;
  }
  const key = event.key.toLowerCase();
  if (['m','n'].includes(key)) {
    if (!event.repeat) aim(key === 'n' ? 5 : 3);
    return;
  }
  if (state.mode === 'aim' && event.target === canvas) {
    const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (direction) {
      event.preventDefault();
      const row = state.target ? -1 : state.board.findLastIndex(cells => cells.some(Boolean));
      const {x,y} = state.target ?? {
        x:row < 0 ? Math.floor(width/2) : state.board[row].findIndex(Boolean),
        y:row < 0 ? height-1 : row
      };
      const [dx,dy] = direction;
      state.target = {x:Math.max(0,Math.min(width-1,x+dx)),y:Math.max(0,Math.min(height-1,y+dy))};
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) activatePower();
    }
    return;
  }
  if (event.target.closest?.('button') && [' ','Enter'].includes(event.key)) return;
  if (!activeModes.includes(state.mode)) return;
  const name = {arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowdown:'down',s:'down',
    arrowup:'rotate',x:'rotate',z:'reverse',w:'rotate',' ':'drop'}[key];
  if (name) {
    if (audio?.state !== 'running') sound([]);
    event.preventDefault();
    if (!event.repeat || !['drop','rotate','reverse'].includes(name)) action(name);
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && !shell.hidden) pause(); });
window.moonlightArcade.register('blocks',{start:() => {
  if (testMode) { get('test-start').click(); return; }
  start();
  if (!record.learned) {
    state.mode = 'intro';
    pointer = null;
    get('lesson').hidden = true;
    get('intro').hidden = false;
    get('practice').focus();
    update();
  }
}});
if (testMode) {
  const picker = get('test-level');
  fallTimes.forEach((ms,index) => {
    const option = document.createElement('option');
    option.value = index+1;
    option.textContent = (index+1)+'단계 · '+(ms/1000)+'초';
    picker.append(option);
  });
  picker.value = fallTimes.length;
  shell.classList.add('sb-testing');
  audioNeedsTap = true;
  get('test-tools').hidden = false;
  get('test-start').onclick = () => start(false,Number(picker.value));
  start(false,Number(picker.value));
}
})();
