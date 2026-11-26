(() => {
const get = id => document.getElementById(id);
const board = get('board');
const friendshipMeter=document.createElement('div');
const friendshipFill=document.createElement('span');
friendshipMeter.hidden=true;
friendshipMeter.setAttribute('role','progressbar');
friendshipMeter.setAttribute('aria-label','우정 게이지');
friendshipMeter.setAttribute('aria-valuenow','0');
Object.assign(friendshipMeter.style,{height:'8px',background:'#38294f',borderRadius:'4px',overflow:'hidden',margin:'0 8px 4px'});
Object.assign(friendshipFill.style,{display:'block',height:'100%',background:'#ffaddb',width:'0%'});
friendshipMeter.append(friendshipFill);
get('bossHud').before(friendshipMeter);
const ctx = board.getContext('2d');
const W = 360, H = 710, startY = 648, minY = 385, maxY = 679;
const boardCorners = [[6,6],[W-10,6],[6,H-10],[W-10,H-10]];
const warningDash = [4,5], solidLine = [];
const barrierOffsets = [-12,0,12];
const combatTimers = ['heavyShake','bossFlash','levelRing','bossBanner','squadNotice'];
const shipWidths = [44,49,60,73];
const shotPitches = [1,.966,1.025,.983,1.014];
const blastRates = [1,.96,1.04];
const doubleDamagePowers = [2,4,6,8];
const dropMilestones = [2,5,8];
const straightVolley = [0], guardVolley = [-43,43], satelliteVolley = [-40,40];
const extraVolleys = [[-36,28],[-55,0,55]];
const bossVolley = [-75,0,75], bossPortVolley = [-111,-74,-37,0,37,74,111];
const bossFans = [[-110,-55,0,55,110],[-74,-28,32,88],[-125,-84,-34,25,93]];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const storageKey = 'moonlight-arcade.best.v1';
const challengeKey='moonlight-arcade.perfect-rescues.v1';
const perfectRescues=new Set();
try{
  const saved=JSON.parse(localStorage.getItem(challengeKey));
  if(Array.isArray(saved))for(const id of saved)if(Number.isInteger(id)&&id>=0&&id<5)perfectRescues.add(id);
}catch{}
const rescueNames=['솜이','레미','블루','민티','루나','용기별'];
const supportNames=['3방향','집중탄','쌍발','속사','교차탄'];
const clearKey='moonlight-arcade.campaign-clear.v1';
let cleared=false,mode=0;
try{cleared=localStorage.getItem(clearKey)==='1';}catch{}
const difficulties=['쉬움','보통','어려움'];
const bestKeys=difficulties.map(difficulty=>'moonlight-arcade.best.'+difficulty+'.v1');
const difficultyBests=bestKeys.map(key=>{
  try{return Math.max(0,Number(localStorage.getItem(key))||0);}catch{return 0;}
});
const pressure=[
  {speed:0,interval:0,opening:0,extraEvery:4,bossHp:[17,33,10]},
  {speed:.23,interval:.24,opening:.49,extraEvery:3,bossHp:[24,44,15]},
  {speed:.38,interval:.36,opening:.72,extraEvery:2,bossHp:[31,54,20]}
];
const albumKey='moonlight-arcade.rescue.v1';
const unlocked=new Set();
try {
  const saved=JSON.parse(localStorage.getItem(albumKey));
  if(Array.isArray(saved))for(const id of saved)if(Number.isInteger(id)&&id>=0&&id<6)unlocked.add(id);
} catch {}
const itemColors={star:'#ffe17c',bolt:'#b8a2ff',comet:'#8efbe9',preview:'#fff2b4'};
const itemLabels={star:'무기 강화',bolt:'연사 6초',comet:'유도탄 6초',preview:'최대 무기 5초'};
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem(storageKey)) || 0); } catch {}
const maxShots=96,maxBullets=192,maxBursts=24;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const shotColors=['#94ffdc','#dc9fff','#ffdc78'];
const weapons=[
  {name:'가는 단발',color:'#94ffdc',length:12,width:3,lanes:[[0,0]]},
  {name:'가는 쌍발',color:'#b2f9ed',length:13,width:3,lanes:[[-6,0],[6,0]]},
  {name:'굵은 단발',color:'#9ee4ff',length:19,width:7,lanes:[[0,0]]},
  {name:'교차 쌍발',color:'#a7b4ff',length:19,width:4,lanes:[[-8,18],[8,-18]]},
  {name:'갈고리탄',color:'#d1a4ff',length:20,width:6,shape:'arrow',lanes:[[0,0]]},
  {name:'긴 쌍발',color:'#e8abff',length:26,width:5,lanes:[[-10,0],[10,0]]},
  {name:'물결 단발',color:'#ffabd8',length:28,width:7,shape:'diamond',lanes:[[0,0]]},
  {name:'별가루 쌍발',color:'#ffc4aa',length:28,width:5,shape:'diamond',lanes:[[-9,-11],[9,11]]},
  {name:'중앙 포격',color:'#ffe9aa',length:34,width:10,shape:'arrow',lanes:[[0,0]]},
  {name:'금빛 3방향',color:'#ffdc78',length:36,width:6,shape:'arrow',lanes:[[-11,-145],[0,0],[11,145]]}
];
const companions=[
  {name:'솜이',color:'#ffaddb',length:19,width:5,shape:'diamond',lanes:[[-7,-90],[0,0],[7,90]]},
  {name:'레미',color:'#ffe375',length:45,width:8,shape:'arrow',lanes:[[0,0]]},
  {name:'블루',color:'#8fd6ff',length:27,width:4,shape:'diamond',lanes:[[-7,-25],[7,25]]},
  {name:'민티',color:'#8df2e3',length:16,width:4,lanes:[[0,0]],cadence:.30},
  {name:'루나',color:'#ffd3a6',length:32,width:5,lanes:[[-9,20],[9,-20]],cadence:.52}
];
const maxPower=weapons.length-1;
const friendshipGoal=28, friendshipRadius=43;
const specialNames=['부채꼴 폭죽','관통 광선','별빛 방어막','두 배 연사','X자 교차 탄막'];
const specialDurations=[.4,1.2,3,4,2];
const specialSounds=[
  [[550,1320,.18,.15],[1000,470,.19,.10,'square',.18]],
  [[290,810,.7,.16,'sawtooth'],[580,1020,.43,.1,'sine',.12]],
  [[440,660,.34,.14,'sine'],[660,880,.42,.11,'sine',.12]],
  [[440,620,.09,.11],[620,830,.09,.11,'triangle',.09],[830,1240,.15,.12,'triangle',.18]],
  [[1047,392,.42,.13],[330,988,.42,.13]]
];
const fanStyle={...companions[0],lanes:Array.from({length:15},(_,i)=>[0,(i-7)*48])};
const crossStyle={...companions[4],lanes:[[-22,175],[22,-175]]};
function companionIndex(area){return area-1;}
function companion(){return companions[companionIndex(run.area)];}
function launch(style,x,y,options={}){
  if(run.shots.length+style.lanes.length>maxShots)return;
  for(const [offset,vx] of style.lanes)run.shots.push({x:x+offset,y,vx,style,age:0,...options});
}
const stars = Array.from({length: 49}, (_, i) => [(i*83+19)%W,(i*193+31)%H,i%4===0?2:1]);
let state = 'home', run, last = 0, drag = null, dragTarget = null;
const keys = new Set();
const moveKeys = new Map([
  ['ArrowLeft','left'],['ArrowRight','right'],['ArrowUp','up'],['ArrowDown','down'],
  ['KeyA','left'],['KeyD','right'],['KeyW','up'],['KeyS','down']
]);
function focusBoard(){board.focus({preventScroll:true});}
function loadSprite(url){
  const image=new Image();
  image.src=url;
  return image;
}
const playerArt=[
  loadSprite("assets/sprites/player-base.png"), loadSprite("assets/sprites/player-cannon.png"),
  loadSprite("assets/sprites/player-pods.png"), loadSprite("assets/sprites/player-gold.png")
];
const crewShips=[
  loadSprite("assets/sprites/som.png"), loadSprite("assets/sprites/lemon.png"),
  loadSprite("assets/sprites/grape.png"), loadSprite("assets/sprites/dash.png"),
  loadSprite("assets/sprites/moon.png")
];
const crewPortraits=[
  loadSprite("assets/sprites/som-pilot.png"), loadSprite("assets/sprites/lemon-pilot.png"),
  loadSprite("assets/sprites/grape-pilot.png"), loadSprite("assets/sprites/dash-pilot.png"),
  loadSprite("assets/sprites/moon-pilot.png")
];
const enemiesArt={
  gold:loadSprite("assets/sprites/star-gold.png"), purple:loadSprite("assets/sprites/star-purple.png"),
  diving:loadSprite("assets/sprites/star-dive.png"), crescent:loadSprite("assets/sprites/crescent.png"),
  shield:loadSprite("assets/sprites/shield.png"), commander:loadSprite("assets/sprites/commander.png"),
  midBoss:loadSprite("assets/sprites/mid-boss.png"), finalBoss:loadSprite("assets/sprites/final-boss.png"),
  satellite:loadSprite("assets/sprites/satellite.png")
};
function drawSprite(g,image,x,y,maxWidth,maxHeight){
  if(!image?.complete||!image.naturalWidth)return;
  const scale=Math.min(maxWidth/image.naturalWidth,maxHeight/image.naturalHeight);
  const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
  g.imageSmoothingEnabled=false;
  g.drawImage(image,Math.round(x-w/2),Math.round(y-h/2),w,h);
}
const whiteSprites=new WeakMap();
function enemyArt(e){
  if(e.kind==='runner')return enemiesArt.gold;
  if(e.phase==='escort')return enemiesArt.crescent;
  const danger=e.phase==='dive'||(e.phase==='warning'&&Math.floor(e.time*14)%2===0);
  return danger?enemiesArt.diving:(e.kind==='rear'?e.open:!(e.row%2))?enemiesArt.gold:enemiesArt.purple;
}
function enemySprite(image,enemy,width,height){
  if(!enemy.whiteFrames||!image.complete||!image.naturalWidth){
    drawSprite(ctx,image,enemy.x,enemy.y,width,height);return;
  }
  let white=whiteSprites.get(image);
  if(!white){
    white=document.createElement('canvas');
    white.width=image.naturalWidth;white.height=image.naturalHeight;
    const mask=white.getContext('2d');
    mask.drawImage(image,0,0);
    mask.globalCompositeOperation='source-in';
    mask.fillStyle='#fff';mask.fillRect(0,0,white.width,white.height);
    whiteSprites.set(image,white);
  }
  const scale=Math.min(width/white.width,height/white.height);
  const w=Math.round(white.width*scale),h=Math.round(white.height*scale);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(white,Math.round(enemy.x-w/2),Math.round(enemy.y-h/2),w,h);
}
function ship(g,x,y,power){
  const stage=power===maxPower?3:power>=5?2:power>=2?1:0;
  drawSprite(g,playerArt[stage],x,y-3,shipWidths[stage],47);
}
function hud(){
  friendshipMeter.hidden=!run.escorts.length;
  const charge=Math.floor(run.friendship*100/friendshipGoal)+'%';
  if(friendshipFill.style.width!==charge){
    friendshipFill.style.width=charge;
    friendshipMeter.setAttribute('aria-valuenow',charge.slice(0,-1));
  }
  get('score').textContent='점수 '+String(run.score).padStart(4,'0');
  get('level').textContent=run.area+'구역';
  const boss=run.boss;
  get('bossHud').hidden=!(boss?.hp>0);
  if(boss?.hp>0){
    const ratio=Math.round(100*boss.hp/boss.maxHp);
    get('bossName').textContent=run.area===5?'최종 보스':'달그림자';
    get('bossFill').style.width=ratio+'%';
    get('bossMeter').setAttribute('aria-valuenow',String(ratio));
  }
  get('hearts').textContent='♥'.repeat(run.hp)+'♡'.repeat(3-run.hp);
  const effects=[];
  if(run.shield)effects.push('보호막');
  if(run.bolt>0)effects.push('연사 '+Math.ceil(run.bolt)+'초');
  if(run.comet>0)effects.push('유도 '+Math.ceil(run.comet)+'초');
  if(run.preview>0)effects.push('Lv.10 체험 '+Math.ceil(run.preview)+'초');
  const weaponText=['무기 '+(run.power+1)+' · '+weapons[run.power].name,...effects].join(' · ');
  if(get('weapon').textContent!==weaponText)get('weapon').textContent=weaponText;
  const wingNames=run.wings.map(id=>companions[id].name).join(' · ');
  const mission=run.breakthrough
    ? breakthroughLabel()
    : run.extra
    ? (run.extra.kind==='cross'
      ? (run.stage===0?'구역 이동 · 기습 편대':'교차 편대')
      : '방패 편대 · '+(run.extra.broken?'방패 해제!':(run.extra.side<0?'왼쪽':'오른쪽')+' 빈틈 / 빛나는 지휘 별'))
    :run.escort
    ? companion().name+' 구출 · '+(run.escort.result||
      (run.escort.flight?'탈출 엄호 '+Math.max(0,Math.ceil(run.escort.duration-run.clock))+'초 · 조준 중인 적 격추':(run.escort.deadline?Math.max(0,Math.ceil(run.escort.deadline-run.clock))+'초 · ':'')+rescueInstructions[run.area-1]))
    : run.boss
      ? (run.area===5?'최종 보스':'중간보스 달그림자')+' · '+(run.boss.open?'핵이 열렸어요!':wingNames||'공격을 피하세요')
      : run.area+'/5구역 · 편대 '+run.stage+'/'+formationWaves+(run.support>0?' · '+wingNames+' 지원':'');
  if(get('mission').textContent!==mission)get('mission').textContent=mission;
}
function show(title, detail, action){
  get('title').textContent=title;
  get('detail').textContent=detail;
  get('action').textContent=action;
  get('finish').hidden=state!=='finalSelect';
  get('crew').hidden=true;
  get('overlay').hidden=false;
}
function release(){drag=dragTarget=null;keys.clear();}
const battleMusic=new Audio("assets/audio/battle.mp3");
battleMusic.loop=true;
const soundKey='moonlight-arcade.sound';
let hapticsOn=true,shotVariation=0;
try{hapticsOn=localStorage.getItem(soundKey+'.haptics')!=='off';}catch{}
function vibrate(pattern){
  if(hapticsOn&&typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'){
    navigator.vibrate(pattern);
  }
}
let soundOn=true,musicVolume=33,effectsVolume=78,audioContext,effectsBus,shotBus,musicFilter;
let musicSilenceUntil=0;
function syncBattleTone(){
  const bossActive=run?.boss?.hp>0&&state!=='home'&&state!=='over';
  battleMusic.playbackRate=bossActive?1.06:1;
  if(musicFilter)musicFilter.gain.value=bossActive?3:0;
  battleMusic.volume=soundOn&&performance.now()>=musicSilenceUntil?musicVolume/100*.65:0;
}
let shotDuckUntil=0;
function duckShots(now,hold){
  if(!shotBus)return;
  const gain=shotBus.gain;
  shotDuckUntil=Math.max(shotDuckUntil,now+hold);
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(.48,now);
  gain.setValueAtTime(.48,shotDuckUntil);
  gain.linearRampToValueAtTime(1,shotDuckUntil+.03);
}
let resumeAfterSound=false,audioRetry=false,audioAttempt=0,lastCombatSound=-Infinity,combatPriority=0,blastVariant=0,nextSweepBlast=0;
try{
  soundOn=localStorage.getItem(soundKey)!=='off';
  const levels=JSON.parse(localStorage.getItem(soundKey+'.levels'));
  if(Number.isFinite(levels?.music))musicVolume=clamp(levels.music,0,100);
  if(Number.isFinite(levels?.effects))effectsVolume=clamp(levels.effects,0,100);
}catch{}
function saveSound(){
  try{
    localStorage.setItem(soundKey,soundOn?'on':'off');
    localStorage.setItem(soundKey+'.levels',JSON.stringify({music:musicVolume,effects:effectsVolume}));
  }catch{}
}
function showSoundButton(){
  const button=get('sound');
  button.textContent=audioRetry&&soundOn?'소리 켜기':soundOn?'소리 켬':'소리 끔';
  button.setAttribute('aria-label',audioRetry&&soundOn?'소리 켜기':'게임 소리 설정');
}
function syncSound(onFailure=()=>{}){
  showSoundButton();
  syncBattleTone();
  if(effectsBus)effectsBus.gain.value=soundOn?effectsVolume/100:0;
  const playing=state==='playing'||(resumeAfterSound&&get('soundPanel').open);
  if(soundOn&&musicVolume>0&&playing&&!document.hidden){
    if(battleMusic.paused)battleMusic.play().catch(onFailure);
  }else battleMusic.pause();
}
function activateSound(onFailure=()=>{}){
  if(!soundOn)return;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context&&!audioContext){
    try{
      audioContext=new Context();
      effectsBus=audioContext.createGain();
      const limiter=audioContext.createDynamicsCompressor();
      effectsBus.connect(limiter);limiter.connect(audioContext.destination);
      shotBus=audioContext.createGain();shotBus.connect(effectsBus);
    }catch{onFailure();}
  }
  if(audioContext&&audioContext.state!=='running')audioContext.resume().catch(onFailure);
}
function resumeGameAudio(){
  const attempt=++audioAttempt;
  audioRetry=false;
  const onFailure=()=>{
    if(attempt!==audioAttempt||state!=='playing'||!soundOn)return;
    audioRetry=true;showSoundButton();
  };
  activateSound(onFailure);syncSound(onFailure);
}
function showSoundLevels(){
  get('musicVolume').value=musicVolume;get('musicValue').value=musicVolume+'%';
  get('effectsVolume').value=effectsVolume;get('effectsValue').value=effectsVolume+'%';
  get('soundMute').textContent=soundOn?'음소거':'소리 켜기';
  get('vibrationToggle').textContent=hapticsOn?'진동 켬':'진동 끔';
  get('vibrationToggle').setAttribute('aria-pressed',String(hapticsOn));
  get('vibrationToggle').hidden=typeof navigator==='undefined'||typeof navigator.vibrate!=='function';
}
get('sound').onclick=()=>{
  if(audioRetry){audioRetry=false;showSoundButton();}
  const panel=get('soundPanel');
  if(panel.open)return;
  resumeAfterSound=state==='playing';
  if(resumeAfterSound){release();state='soundSettings';}
  showSoundLevels();panel.showModal();activateSound();syncSound();
};
get('musicVolume').oninput=e=>{
  musicVolume=Number(e.target.value);showSoundLevels();saveSound();syncSound();
};
get('effectsVolume').oninput=e=>{
  effectsVolume=Number(e.target.value);showSoundLevels();saveSound();syncSound();
};
get('effectsVolume').onchange=()=>{activateSound();combatSound('kill',true);};
get('soundMute').onclick=()=>{
  soundOn=!soundOn;showSoundLevels();saveSound();activateSound();syncSound();
};
get('vibrationToggle').onclick=()=>{
  hapticsOn=!hapticsOn;
  try{localStorage.setItem(soundKey+'.haptics',hapticsOn?'on':'off');}catch{}
  showSoundLevels();
  if(hapticsOn)vibrate(16);
  else if(typeof navigator!=='undefined')navigator.vibrate?.(0);
};
get('soundDone').onclick=()=>get('soundPanel').close();
get('soundPanel').addEventListener('close',()=>{
  if(resumeAfterSound){
    state='playing';
    if(document.hidden||!document.hasFocus())pause();
    else{focusBoard();activateSound();}
  }
  resumeAfterSound=false;syncSound();
});
function soundLayers(parts,volume=1,startTime=audioContext?.currentTime,attack=.003,pitch=1,bus=effectsBus){
  if(!soundOn||!effectsVolume||!effectsBus||audioContext.state!=='running')return;
  for(const [from,to,length,gain,type='triangle',delay=0] of parts){
    const t=startTime+delay;
    const tone=audioContext.createOscillator(),envelope=audioContext.createGain();
    tone.type=type;tone.frequency.setValueAtTime(from*pitch,t);
    tone.frequency.exponentialRampToValueAtTime(to*pitch,t+length);
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.linearRampToValueAtTime(gain*volume,t+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+length);
    tone.connect(envelope);envelope.connect(bus);
    tone.start(t);tone.stop(t+length);
    tone.onended=()=>{tone.disconnect();envelope.disconnect();};
  }
}
function shotSound(power,rapid){
  const level=power+1, long=weapons[power].length>=26;
  const duration=long?(rapid?.082:.155):.072;
  const parts=long?[[405,715,duration,.13,'sine'],[203,360,duration,.065,'sine']]
    :[[990,500,duration,.105,'sine']];
  if(level>=3&&!long)parts.push([490,295,.077,.047,'sine']);
  if(level===10)parts.push([740,1160,rapid?.056:.112,.035,'sine',.013]);
  const shot=shotVariation++;
  const shift=shot%5;
  const pitch=shotPitches[shift];
  const accent=shot%(rapid?4:3)===0;
  const volume=rapid?(accent?.49:.25):(accent?.90:.57);
  // The quiet follow-up shots retain their exact timing but carry less low-end.
  soundLayers(accent?parts:parts.slice(0,1),volume,undefined,long?.014:.008,pitch,shotBus||effectsBus);
}
const combatSounds={
  hit:[[820,310,.046,.115,'square']],
  block:[[1440,2100,.07,.11]],

  hurt:[[460,98,.19,.22,'square']],
  rescue:[[520,390,.065,.11],[523,600,.16,.18,'sine',.08],[659,760,.17,.17,'sine',.18],[784,1046,.22,.18,'sine',.28]],
  warning:[[490,620,.12,.15,'sine'],[620,830,.14,.12,'sine',.13]],
  breakthrough:[[540,710,.10,.13,'triangle'],[810,1060,.13,.14,'triangle',.08]],
  level:[[523,587,.12,.10,'sine'],[659,698,.14,.12,'triangle',.07],[784,880,.18,.12,'sine',.14]],
  siren:[[370,830,.22,.13,'triangle'],[830,430,.22,.11,'sine',.22],[430,690,.18,.08,'triangle',.44]],
  pickup:[[650,880,.095,.11],[880,1320,.14,.13,'triangle',.065]]
};
const blastBuffers=[];
function explosionSound(large,now){
  const id=Number(large);
  if(!blastBuffers[id]){
    const bytes=atob(window.moonlightBlasts[id]);
    const buffer=audioContext.createBuffer(1,bytes.length/2,22050);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++){
      const sample=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);
      samples[i]=(sample>=32768?sample-65536:sample)/32768;
    }
    blastBuffers[id]=buffer;
  }
  const source=audioContext.createBufferSource(),volume=audioContext.createGain();
  source.buffer=blastBuffers[id];
  source.playbackRate.value=large?1:blastRates[blastVariant++%3];
  volume.gain.setValueAtTime(large?.78:.53,now);
  source.connect(volume);volume.connect(effectsBus);
  source.start(now);
  source.onended=()=>{source.disconnect();volume.disconnect();};
  duckShots(now,large?.32:.12);
}
function combatSound(kind,preview=false){
  if(!soundOn||!effectsVolume||!effectsBus||audioContext.state!=='running')return;
  const now=audioContext.currentTime;
  if(kind==='rescue'||kind==='level')duckShots(now,.27);
  if(kind==='kill'&&!preview&&run?.breakthrough){
    const at=Math.max(now,nextSweepBlast);
    if(at-now<=.092){
      nextSweepBlast=at+.042;
      explosionSound(false,at);
    }
    return;
  }
  const priority=kind==='rescue'?5:kind==='boss'?4:kind==='kill'||kind==='hurt'?3:(kind==='pickup'||kind==='rescue'||kind==='warning')?2:1;
  if(!preview&&kind!=='level'&&kind!=='siren'&&kind!=='boss'&&kind!=='breakthrough'&&now-lastCombatSound<(kind==='kill'?.038:.065)&&priority<=combatPriority)return;
  lastCombatSound=now;combatPriority=priority;
  if(kind==='kill'||kind==='boss')explosionSound(kind==='boss',now);
  else soundLayers(combatSounds[kind]);
}
function home(){
  audioAttempt++;audioRetry=false;
  if(run)resetItemCompanions();
  friendshipMeter.hidden=true;
  state='home';release();musicSilenceUntil=0;syncSound();battleMusic.currentTime=0;
  get('home').hidden=false;get('game').hidden=true;
  get('record').textContent='최고점 '+best;
  window.moonlightArcade.showRabbitRecords(difficultyBests,perfectRescues);
  get('difficulty').hidden=true;
  get('home').inert=false;
  get('album').textContent='구조 도감 '+companions.filter((_,id)=>unlocked.has(id)).length+'/5';
  const records=document.createElement('li');
  records.className='challengeSummary';
  records.textContent='완벽 구출 '+perfectRescues.size+'/5 · 재도전 없이 기체와 구조 대상 무피격';
  get('collection').replaceChildren(records,...rescueNames.flatMap((name,id)=>{
    if(id>=companions.length&&!unlocked.has(id))return [];
    const li=document.createElement('li');
    li.textContent=unlocked.has(id)?'✦ '+name+(perfectRescues.has(id)?' · 완벽 구출':''):'◇ '+name+' · '+(id+1)+'구역 감옥 열기';
    return li;
  }));
}
const rescueInstructions=[
  '경비 두 대를 격추하세요',
  '빛나는 잠금 장치를 쏘세요',
  '달그림자의 열린 핵을 쏘세요',
  '열쇠를 든 적을 두 바퀴 안에 잡으세요',
  '방어막 전원을 부수세요'
];
function setWings(ids){
  run.wings=ids;run.wingShots=ids.map((_,i)=>i*.24);
  run.support=ids.length?6:0;
}
function selectCrew(){
  release();state='finalSelect';
  run.selected=run.team.at(-1);
  show('최종전 출격','선택 동료와 무작위 동료가 지원해요.','돌파전 출격');
  const buttons=run.team.map(id=>{
    const button=document.createElement('button');
    button.className='crewChoice';button.dataset.crew=String(id);
    button.style.setProperty('--shot',companions[id].color);
    const portrait=document.createElement('img');
    portrait.src=crewPortraits[id].src;portrait.alt='';
    const name=document.createElement('b');name.textContent=companions[id].name;
    const weapon=document.createElement('small');weapon.textContent=supportNames[id];
    button.append(portrait,name,weapon);
    button.setAttribute('aria-pressed',String(run.selected===id));
    button.onclick=()=>{
      run.selected=id;
      for(const [i,choice] of buttons.entries())choice.setAttribute('aria-pressed',String(run.team[i]===id));
    };
    return button;
  });
  get('crew').replaceChildren(...buttons);
  get('crew').hidden=false;
}
function recruit(){
  const id=companionIndex(run.area);
  if(run.team.includes(id))return;
  run.team.push(id);run.rescued=true;
  addScore(300);unlock(id);
  saveBest();
  if(!run.rescueMistakes.has(run.area)){
    perfectRescues.add(id);
    try{localStorage.setItem(challengeKey,JSON.stringify([...perfectRescues]));}catch{}
  }
  combatSound('rescue');vibrate([20,45,26]);
}
function advanceArea(){
  setWings([run.team.at(-1)]);
  run.area++;run.stage=0;run.level++;run.rescued=false;
  run.bolt=0;run.comet=0;run.drops=[];run.sparks=[];run.invincible=.8;
  wave();
}
function makeBoss(){
  const final=run.area===5;
  const profile=pressure[run.mode];
  const hp=Math.round(profile.bossHp[final?1:0]*(final?1.6:1.3));
  run.boss={x:W/2,y:final?126:118,hp,maxHp:hp,open:false};
  run.bossBanner=1.2;
  musicSilenceUntil=0;syncBattleTone();combatSound('siren');
  if(final){
    const sideHp=Math.round(profile.bossHp[2]*1.3);
    run.satellite={x:46,y:190,hp:sideHp,maxHp:sideHp,lastVolley:-1,warning:false};
  }
}
const formationWaves=3,rescueStage=formationWaves+1;
const breakthroughRoutes=['s','cross','v','shield','sweep'];
const breakthroughCount=breakthroughRoutes.length,breakthroughRest=1.2;
const shieldHealth=[4,6,8];
function baseFormationSize(area){return area>=4?15:10;}
function formationSize(area){
  return Math.round(baseFormationSize(area)*(run.mode===0?1.15:1.35));
}
function breakthroughRate(group){return 1+.30*(group-1)/(breakthroughCount-1);}
function breakthroughSize(group){return Math.round(formationSize(5)*breakthroughRate(group));}
function breakthroughLabel(){return '돌파 '+run.breakthrough.group+'/'+breakthroughCount;}
function companionDropChance(){
  const area=run.area;
  // Transfer waves, special formations and the final breakthrough also drop companions.
  const other=(area>1?20:0)+(area===2?20:area===4?14:0);
  const previousFinalSize=area===5?30:0;
  const finalSize=area===5?breakthroughRoutes.reduce((total,_,i)=>total+breakthroughSize(i+1),0):0;
  return .045*(baseFormationSize(area)*2+other+previousFinalSize)/(formationSize(area)*formationWaves+other+finalSize);
}
const victoryBursts=[
  [.34,-32,5],[.72,29,-12],[1.08,-16,-19],
  [1.49,35,14],[1.93,-24,15],[2.42,0,0]
];
const victoryDuration=4.15;
const endingDuration=8.4;
function moveBreakthrough(e){
  const time=run.clock-e.started;
  const travel=clamp((time-e.leadIn-e.slot*.23)/1.65,0,1);
  const center=180+e.side*42;
  const slot=center+(e.slot-2)*25;
  const edge=e.side<0?-39:W+39;
  const weave=Math.sin(time*1.42)*27*travel;
  e.x=edge+(slot-edge)*travel+weave;
  e.entered=e.x>12&&e.x<W-12;
  e.y=108+(e.slot%2)*38+Math.sin(time*1.2+e.slot*.35)*15;
}
function addBullet(bullet){
  if(run.bullets.length<maxBullets)run.bullets.push(bullet);
}
function fireFormationVolley(x,y,aim,vy,offsets){
  fireVolley(x,y,aim,vy,offsets,false,false,true);
}
function fireAimedShots(x,y,aim,vy,offsets,side=false,scale=false){
  const rescued=scale?run.team.length:0;
  const bonus=run.mode===0?Math.floor(rescued/2):rescued;
  if(!bonus){
    for(const offset of offsets)addBullet({x,y,vx:aim+offset,vy,side});
    return;
  }
  const count=offsets.length+bonus;
  const center=Math.atan2(aim,vy),speed=Math.hypot(aim,vy);
  for(let i=0;i<count;i++){
    const angle=center+(i-(count-1)/2)*Math.PI/18;
    addBullet({x,y,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed,side});
  }
}
function fireVolley(x,y,aim,vy,offsets,irregular=false,side=false,scale=false){
  const r=run;
  fireAimedShots(x,y,aim,vy,offsets,side,scale);
  r.volleyCount++;
  if(!irregular&&r.volleyCount%pressure[r.mode].extraEvery!==0)return;
  const drift=Math.random()<.5?-1:1;
  const skew=drift*(44+Math.random()*79);
  addBullet({
    x,y,vx:aim+skew,vy:vy*(.88+Math.random()*.24),
    bend:-drift*(72+Math.random()*66),irregular:true,side
  });
}
function breakthroughAttack(speed){
  const r=run;
  if(r.enemyTimer>0)return;
  const firing=r.enemies.filter(e=>!e.entry&&!e.shieldHp&&e.phase!=='dive'&&e.x>14&&e.x<W-14&&e.y>32);
  if(!firing.length)return;
  const shooter=firing[Math.floor(Math.random()*firing.length)];
  const vy=192*speed;
  const aim=clamp((r.x-shooter.x)*vy/(r.y-shooter.y),-170,170);
  fireFormationVolley(shooter.x,shooter.y+12,aim,vy,r.extra?extraVolleys[1]:straightVolley);
  r.enemyTimer=(1.18-pressure[r.mode].interval)/breakthroughRate(r.breakthrough.group);
}
function extraFormation(kind=run.area===2?'cross':'shield',size=20){
  const r=run,cross=kind==='cross',descending=kind==='descending';
  const layout=r.layouts[r.area];
  r.extra={kind,side:r.stage===0?-layout.side:layout.side,variant:layout.variant,broken:false};
  r.enemyTimer=2.2;r.waveWait=1;
  if(descending){
    for(let row=0;row<4;row++){
      for(let slot=0;slot<5;slot++){
        r.enemies.push({x:180,y:-34,phase:'extra',kind:'descending',row,slot,hp:1});
      }
    }
  }else if(cross){
    for(let row=0;row<2;row++){
      const slots=row?Math.floor(size/2):Math.ceil(size/2);
      for(let slot=0;slot<slots;slot++){
        r.enemies.push({x:row?W+24:-24,y:-35,phase:'extra',kind:'cross',row,slot,hp:1});
      }
    }
  }else{
    r.enemies.push({x:180,y:100,phase:'extra',kind:'leader',hp:8+r.mode*2});
    for(let slot=0;slot<5;slot++){
      r.enemies.push({x:0,y:-35,phase:'extra',kind:'plate',slot,hp:2,shieldHp:shieldHealth[r.mode]});
    }
    for(let row=0;row<2;row++){
      for(let slot=0;slot<4;slot++){
        r.enemies.push({x:0,y:-35,phase:'extra',kind:'rear',row,slot,hp:2+r.mode});
      }
    }
  }
}
function moveExtra(e,exposedByRow){
  const r=run, f=r.extra;
  if(e.kind==='descending'){
    const age=r.clock-(e.row*1.65+e.slot*.19+.35);
    const drift=Math.sin(Math.max(0,age)*1.85+e.row*.55)*38*f.side;
    e.x=62+e.slot*59+drift+(e.row%2?14:-14)*f.side;
    const stop=252-e.row*35;
    const drop=clamp(age*102,0,stop+34);
    e.y=-34+drop+(drop>=stop+34?Math.sin(age*2+e.slot)*8:0);
    return;
  }
  if(e.kind==='cross'){
    const side=(e.row?-1:1)*f.side;
    const stagger=r.stage===0&&e.slot>=5?.85:0;
    const entry=clamp((r.clock-1.05-e.slot*.15-stagger)/1.5,0,1);
    const target=180+side*Math.sin(r.clock*(f.variant?1.08:.84)+e.slot*.34)*104;
    e.x=(side<0?-26:W+26)*(1-entry)+target*entry;
    e.y=93+e.row*101+(e.slot%5)*13+Math.floor(e.slot/5)*27+Math.sin(r.clock*2+e.slot)*10;
  }else{
    const center=180+Math.sin(r.clock*.76)*28;

    const phase=(r.clock+f.variant*.68)%3.4;
    if(e.kind==='leader'){
      const peek=f.broken?1:Math.min(clamp((phase-1.40)/.32,0,1),clamp((3.4-phase)/.25,0,1));
      e.open=f.broken||phase>=1.72&&phase<3.24;
      e.x=center+f.side*62*peek;e.y=105+21*peek;
    }else if(e.kind==='plate'){
      const lanes=[-100,-51,0,51,100];
      e.x=center+lanes[e.slot]+Math.sin(r.clock*.85+e.slot)*9;
      e.y=(e.slot%2?231:263)+Math.sin(r.clock*1.1+e.slot)*5;
    }else{
      const exposed=exposedByRow[e.row];
      e.open=f.broken||e===exposed;
      e.x=e===exposed&&!f.broken?center+f.side*(114+e.row*9):center+(e.slot-1.5)*37;
      e.y=210-e.row*44;
    }
  }
}
function extraAttack(speed){
  const r=run;
  if(!r.extra||r.enemyTimer>0)return;
  const firing=r.enemies.filter(e=>!e.shieldHp&&e.x>14&&e.x<W-14&&e.y>32);
  if(!firing.length)return;
  const e=firing[Math.floor(Math.random()*firing.length)];
  const vy=184*speed;
  const vx=clamp((r.x-e.x)*vy/(r.y-e.y),-125,125);
  fireFormationVolley(e.x,e.y+14,vx,vy,extraVolleys[r.area===2?0:1]);
  r.enemyTimer=Math.max(.62,(r.area===2?1.38:1.12)-pressure[r.mode].interval);
}
function wave(){
  musicSilenceUntil=0;
  run.clock=0;run.enemyTimer=.85;run.diveTimer=1.5;run.waveWait=.85;
  run.enemies=[];run.bullets=[];run.shots=[];run.hitGhosts=[];run.defeated=0;run.volleyCount=0;
  run.entryEnd=0;run.entryBonus=0;run.quickClear=false;
  run.escort=null;run.boss=null;run.breakthrough=null;run.satellite=null;run.extra=null;run.bossBanner=0;syncBattleTone();
  if(run.stage===0){
    // Each transfer has one two-row crossing wave, before the destination's normal waves.
    extraFormation(run.area===3?'descending':'cross');return;
  }
  if(run.stage===rescueStage&&(run.area===2||run.area===4)&&!run.extraCleared.has(run.area)){
    extraFormation();return;
  }
  if(run.stage===rescueStage){
    if(run.escapeCheckpoint){startEscape();return;}
    if(!run.lunaEscort)run.rescueScore=run.score;
    run.drops=[];
    run.rescueCompanions=snapshotItemCompanions();
    run.escort={x:W/2,y:221,result:'',end:0,launched:0,
      deadline:run.area===2?23:run.area===4?17.55:0,
      flight:run.area===5&&Boolean(run.lunaEscort),duration:9.8,
      hearts:run.area===3||run.area===5?3:0,nextThreat:run.area===3&&run.mode===1?5:4.2,threatCount:0};
    const target=(x,kind,hp)=>({x,y:164,baseX:x,phase:'escort',kind,
      fires:x<W/2?2.45:3.6,hp,hitUntil:0});
    if(run.area===1)run.enemies=[target(91,'guard',3),target(269,'guard',3)];
    if(run.area===2)run.enemies=[target(91,'lock',3),target(269,'lock',3),target(180,'guard',3)];
    if(run.area===3)makeBoss();
    if(run.area===4)run.enemies=[
      target(90,'runner',8+run.mode*2),target(67,'guard',3),target(292,'guard',3)
    ];
    if(run.area===5){
      if(run.escort.flight){
        run.escort.nextThreat=1.35;
        run.escort.hearts=run.escortHearts??3;
      }else run.enemies=[target(180,'reactor',13+run.mode*3)];
    }
    return;
  }
  const size=formationSize(run.area);
  const route=['s','v','sweep'][(run.area+run.stage-2)%formationWaves];
  const group=run.stage-rescueStage;
  if(run.area===5&&group>0){
    if(group>breakthroughCount){setWings(run.wings);makeBoss();return;}
    if(group===1){
      run.support=30;run.preview=Math.max(run.preview,6);
      if(run.power===maxPower)run.bolt=Math.max(run.bolt,6);
    }
    const entry=breakthroughRoutes[group-1],count=breakthroughSize(group);
    run.breakthrough={group};
    if(entry==='cross'||entry==='shield')extraFormation(entry,count);
    if(entry!=='cross')normalFormation(count-run.enemies.length,entry==='shield'?'v':entry,entry==='shield'?42:89);
    run.waveWait=breakthroughRest;run.enemyTimer=2.2;
    combatSound('breakthrough');
    return;
  }
  run.entryBonus=size*100*.20;
  normalFormation(size,route);
}
function normalFormation(size,route,top=89){
  const mix=run.area>=3?run.layouts[run.area]:null;
  for(let row=0;row<Math.ceil(size/5);row++){
    const columns=Math.min(5,size-row*5);
    for(let column=0;column<columns;column++){
      const lane=column-(columns-1)/2;
      const x=W/2+lane*49+(mix?mix.side*(row%2?14:-10):0);
      const y=top+row*48+(mix&&mix.variant?(column%2?9:-5):0);
      const side=run.area%2?-1:1;
      const order=route==='v'?Math.abs(lane):side<0?column:columns-1-column;
      const delay=order*.09+row*.17,duration=1.55;
      const fromX=route==='v'?W/2:side<0?-24:W+24;
      const fromY=route==='v'?-24:y+(route==='sweep'?18:-42);
      const entry={route,fromX,fromY,delay,duration};
      run.entryEnd=Math.max(run.entryEnd,delay+duration);
      run.enemies.push({baseX:x,baseY:y,x:fromX,y:fromY,row,phase:'formation',time:0,entry});
    }
  }
}
function start(){
  run={x:W/2,y:startY,flash:0,muzzle:0,area:1,stage:1,mode,extraCleared:new Set(),rescueMistakes:new Set(),layouts:Object.fromEntries([2,3,4,5].map(area=>[area,{side:Math.random()<.5?-1:1,variant:Math.floor(Math.random()*2)}])),rescued:false,team:[],wings:[],wingShots:[],selected:0,support:0,pickup:null,preview:0,level:1,score:0,hp:3,power:0,shield:false,bolt:0,comet:0,cometShot:0,shots:[],drops:[],sparks:[],fireTimer:0,invincible:0};
  resetItemCompanions();
  release();wave();hud();
  state='playing';get('overlay').hidden=true;focusBoard();activateSound();syncSound();
}
function pause(){
  if(state!=='playing')return;
  release();state='paused';show('잠깐 쉬기','현재 레벨 '+run.level,'이어 하기');
}
function unlock(id){
  if(unlocked.has(id))return;
  unlocked.add(id);
  try{localStorage.setItem(albumKey,JSON.stringify([...unlocked]));}catch{}
}
function addScore(points){
  run.score+=points;
  if(!run.escort||run.escort.result)saveBest();
}
function saveBest(){
  const {score,mode}=run;
  if(score>best){
    best=score;
    try{localStorage.setItem(storageKey,String(best));}catch{}
  }
  if(score>difficultyBests[mode]){
    difficultyBests[mode]=score;
    try{localStorage.setItem(bestKeys[mode],String(score));}catch{}
  }
}
function bossAttack(dt,speed){
  const r=run,b=r.boss;
  if(!b||b.hp<=0)return;
  b.x=W/2+Math.sin(r.clock*(.96+Math.min(8,Math.max(0,r.area-2))*.045))*94;
  if(b.phase2At!==undefined){
    const elapsed=r.clock-b.phase2At,cycle=Math.floor(elapsed/3.6),beat=elapsed%3.6;
    const side=cycle%2?-1:1;
    b.x=180+Math.sin(elapsed*1.9)*42;
    const extension=r.satellite?.hp<=0?.35:0;
    const opensAt=1.60+pressure[r.mode].opening*.45-extension;
    b.open=beat>=opensAt;
    b.portWarning=beat<.70?side:0;
    if(b.portWarning&&b.warnedCycle!==cycle){
      b.warnedCycle=cycle;combatSound('warning');
    }
    if(beat>=.70&&beat<1.50&&b.portCycle!==cycle){
      b.portCycle=cycle;
      const x=b.x+side*35,vy=232*speed;
      const aim=clamp((r.x-x)*vy/(r.y-b.y),-160,160);
      fireVolley(x,b.y+22,aim,vy,bossPortVolley,true);
    }
    if(!b.open)bossSpiral(b,elapsed,opensAt-beat,speed);
    return;
  }
  const phase=r.clock%4;
  const opening=r.satellite&&r.satellite.hp<=0?.9:1.6;
  const profile=pressure[r.mode],final=r.area===5;
  b.open=phase>=(r.area===3&&r.mode===1?1.9:opening+profile.opening);
  if(b.open||r.enemyTimer>0)return;
  r.enemyTimer=Math.max(.40,.73-Math.max(0,r.area-2)*.03-profile.interval);
  const vy=175*speed;
  const aim=clamp((r.x-b.x)*vy/(r.y-b.y),-170,170);
  const pattern=final?bossFans[Math.floor(Math.random()*bossFans.length)]:bossVolley;
  fireVolley(b.x,b.y+26,aim,vy,pattern,final);
}
function bossSpiral(b,elapsed,closedFor,speed){
  const duration=.42,count=run.mode===0?10:16;
  const scheduled=b.nextSpiral??3;
  if(!b.spiral&&elapsed>=scheduled&&closedFor>=duration+.032){
    b.spiral={started:elapsed,angle:Math.PI/2+elapsed*.65,shot:0};
    b.nextSpiral=scheduled+3;
  }
  const spiral=b.spiral;
  if(!spiral)return;
  const due=Math.min(count,1+Math.floor((elapsed-spiral.started)*count/duration));
  while(spiral.shot<due){
    const angle=spiral.angle+spiral.shot++*2*Math.PI/count;
    const velocity=164*speed;
    addBullet({x:b.x,y:b.y+22,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,spiral:true});
  }
  if(spiral.shot===count)b.spiral=null;
}
function bossReinforcements(){
  const r=run,b=r.boss;
  if(r.area!==5||!b?.hp)return;
  const phase=b.phase2At===undefined?1:2;
  const age=phase===1?r.clock:r.clock-b.phase2At;
  if(b.starPhase===phase||age<1.35)return;
  b.starPhase=phase;
  for(const side of [-1,1]){
    for(let slot=0;slot<3;slot++){
      r.enemies.push({x:side<0?-40:W+40,y:-35,row:slot%2,phase:'breakthrough',
        side,slot,started:r.clock,leadIn:side<0?.05:.78,entered:false,hp:1});
    }
  }
}
function satelliteAttack(speed){
  const r=run,s=r.satellite;
  if(!s||s.hp<=0||r.boss.hp<=0)return;
  const cycle=Math.floor(r.clock/4), phase=r.clock%4;
  const arc=Math.sin(phase*Math.PI/4);
  s.x=W/2-146*Math.cos(r.clock*Math.PI/4);
  s.y=188+arc*161;
  s.warning=phase>=2.35&&phase<3.05;
  if(phase<3.05||s.lastVolley===cycle)return;
  s.lastVolley=cycle;
  const vy=210*speed;
  const aim=clamp((r.x-s.x)*vy/Math.max(100,r.y-s.y),-185,185);
  fireVolley(s.x,s.y+13,aim,vy,satelliteVolley,false,true);
}
function shotTouchesEnemy(shot,e){
  if(e.dead||e.y<=0||(e.phase==='breakthrough'&&!e.entered))return false;
  const fixed=e.kind==='lock'||e.kind==='reactor';
  const halfX=(fixed?18:e.kind==='cageThreat'?16:13)+Math.min(3,(shot.style?.width||0)/2);
  const halfY=fixed?15:13;
  const travel=shot.prevY-shot.y;
  if(travel<=0)return Math.abs(shot.x-e.x)<=halfX&&Math.abs(shot.y-e.y)<=halfY;
  if(shot.prevY<e.y-halfY||shot.y>e.y+halfY)return false;
  const enter=clamp((shot.prevY-e.y-halfY)/travel,0,1);
  const exit=clamp((shot.prevY-e.y+halfY)/travel,0,1);
  const dx=shot.x-shot.prevX;
  const x0=shot.prevX+dx*enter,x1=shot.prevX+dx*exit;
  return Math.min(x0,x1)<=e.x+halfX&&Math.max(x0,x1)>=e.x-halfX;
}
function activeTarget(e){
  if(e.kind==='reactor')return run.clock%3.2>=1.05;
  if(e.kind!=='lock')return true;
  const leftOpen=Math.floor(run.clock/2)%2===0;
  return (e.x<W/2)===leftOpen||run.enemies.filter(unit=>unit.kind==='lock'&&!unit.dead).length===1;
}
function moveGuards(){
  const r=run;
  if(!r.escort||r.escort.result)return;
  for(const guard of r.enemies){
    if(guard.kind==='runner'){
      guard.x=180-110*r.layouts[4].side*Math.cos(Math.max(0,r.clock-1.55)*Math.PI/4);
      guard.y=178+18*Math.sin(r.clock*1.55);
    }
    if(guard.kind!=='guard')continue;
    guard.x=guard.baseX+Math.sin(r.clock*1.55)*(r.area===1?13:28);
    if(r.clock<guard.fires)continue;
    guard.fires=r.clock+(r.area===1?2.3:1.55)-pressure[r.mode].interval;
    const vy=(r.area===1?180:230)*(1+pressure[r.mode].speed*.65);
    const aim=(r.x-guard.x)*vy/(r.y-guard.y);
    fireAimedShots(guard.x,guard.y,aim,vy,r.area===1?straightVolley:guardVolley,false,true);
  }
}
function cageThreats(){
  const r=run,e=r.escort;
  if(!e?.hearts||e.result)return;
  if(r.clock>=e.nextThreat&&(!e.shortFlight||e.threatCount<3)){
    const side=(e.threatCount++%2?1:-1)*(r.layouts[r.area]?.side??1);
    r.enemies.push({x:180+side*107,y:166,kind:'cageThreat',phase:'escort',
      hp:3+r.mode,hitUntil:0,fires:r.clock+(e.flight?2.25:2.55)});
    e.nextThreat=r.clock+(e.shortFlight?1.4:e.flight?2.35:r.area===3?5:3.7);
  }
  for(const enemy of r.enemies){
    if(enemy.kind!=='cageThreat'||enemy.dead||r.clock<enemy.fires)continue;
    enemy.dead=true;e.hearts--;r.rescueMistakes.add(r.area);e.lastHit={x:enemy.x,y:enemy.y,time:r.clock};
    burst(e.x,e.y,1,0,'#ffa58f');
  }
}
function startEscape(){
  const r=run;
  r.clock=0;r.boss=null;r.satellite=null;r.bossBanner=0;
  r.enemies=[];r.bullets=[];r.shots=[];r.hitGhosts=[];
  r.escort={x:W/2,y:221,result:'',flight:true,shortFlight:true,duration:6,
    hearts:3,nextThreat:.55,threatCount:0};
  syncBattleTone();
}
function escortStep(){
  const r=run,e=r.escort;
  if(e.result){
    if(r.clock>=e.end){
      if(r.area===5)selectCrew();
      else advanceArea();
    }
    return;
  }
  if(e.flight){
    const progress=clamp(r.clock/e.duration,0,1);
    e.x=180+Math.sin(progress*Math.PI*2)*67;
    e.y=221+progress*149;
  }
  const live=kind=>r.enemies.some(unit=>unit.kind===kind&&!unit.dead);
  const pending=e.flight?r.clock<e.duration:r.area===2?live('lock'):r.area===4?live('runner'):
    r.enemies.some(unit=>unit.kind!=='cageThreat'&&!unit.dead)||r.boss?.hp>0;
  if(r.area===5&&!e.flight&&!pending&&e.hearts>0){
    r.lunaEscort=true;r.escortHearts=Math.max(1,e.hearts);r.rescueScore=r.score;wave();return;
  }
  const lost=(e.flight||r.area===3||r.area===5)&&e.hearts<=0;
  const timeout=e.deadline&&r.clock>=e.deadline;
  if(pending||lost||timeout){
    if(timeout||lost){
      r.rescueMistakes.add(r.area);
      if(e.flight&&!e.shortFlight)r.escortHearts=3;
      release();state='rescueRetry';
      if(e.shortFlight){
        show('탈출 엄호 실패','점선으로 '+companion().name+'를 겨누는 적부터 격추하세요.','탈출 엄호 다시 도전');
        return;
      }
      show(lost?(e.flight?'루나의 기체가 피격됐어요':'감옥이 공격받았어요'):r.area===4?'열쇠가 달아났어요':'구출 시간 종료',
        lost?(e.flight?'점선으로 루나를 겨누는 적부터 격추하세요.':'감옥을 겨누는 적을 먼저 막아보세요.'):'열린 잠금이나 열쇠를 먼저 노려보세요.','구출 다시 도전');
    }
    return;
  }
  if(r.area<5&&!e.flight){
    r.escapeCheckpoint={score:r.score,companions:snapshotItemCompanions(),
      special:snapshotSpecial(r.special),specialNotice:r.specialNotice};
    startEscape();return;
  }
  r.escapeCheckpoint=null;
  recruit();
  r.enemies=[];r.bullets=[];r.shots=[];
  const id=companionIndex(r.area);
  e.result=r.area===5?'루나 구출 성공!':companions[id].name+' 합류 · '+supportNames[id];e.launched=r.clock;e.end=r.clock+1.7;
  burst(e.x,e.y,2,300);
}
function wingX(i=0){
  const side=run.wings.length===2?(i===0?-1:1):(run.x>W*.7?-1:1);
  return clamp(run.x+side*36,13,W-13);
}
function itemCompanionX(i){
  return clamp(run.x+(i===0?-36:36),13,W-13);
}
function resetItemCompanions(){
  Object.assign(run,{escorts:[],escortShots:[],friendship:0,lastSpecial:-1,special:null,specialNotice:0});
  run.drops=run.drops.filter(d=>d.type!=='companion');
}
function snapshotItemCompanions(source=run){
  const {escorts,escortShots,friendship,lastSpecial}=source;
  return {escorts:[...escorts],escortShots:[...escortShots],friendship,lastSpecial};
}
function snapshotSpecial(special){
  return special&&{...special,bossDamage:new Map(special.bossDamage)};
}
function dropCompanion(target){
  const r=run;
  if(!r.team.length||r.drops.some(d=>d.type==='companion')||Math.random()>=companionDropChance())return;
  const available=r.team.filter(id=>!r.escorts.includes(id));
  const pool=available.length?available:r.team;
  r.drops.push({x:target.x,y:target.y,type:'companion',id:pool[Math.floor(Math.random()*pool.length)]});
}
function collectCompanion(id){
  const r=run,friend=companions[id];
  combatSound('pickup');
  if(r.escorts.length===2||r.escorts.includes(id)){
    r.friendship=Math.min(friendshipGoal,r.friendship+friendshipGoal*.4);
    addScore(300);
    r.pickup={text:'우정 보너스!',color:friend.color,time:1.2};
  }else{
    r.escortShots.push(r.escorts.length*.24);
    r.escorts.push(id);
    r.pickup={text:friend.name+' 동행!',color:friend.color,time:1.2};
  }
  burst(r.x,r.y,1,0,friend.color);
}
function hitItemCompanions(){
  const r=run,y=r.y+3;
  for(let i=r.escorts.length-1;i>=0;i--){
    const x=itemCompanionX(i);
    const touches=unit=>(unit.x-x)**2+(unit.y-y)**2<=9**2;
    const bullet=r.bullets.find(b=>!b.dead&&touches(b));
    if(!bullet&&!r.enemies.some(touches)&&!(r.boss?.hp>0&&touches(r.boss))&&
      !(r.satellite?.hp>0&&touches(r.satellite)))continue;
    if(bullet)bullet.dead=true;
    const [id]=r.escorts.splice(i,1);
    r.escortShots.splice(i,1);
    const friend=companions[id];
    burst(x,y,0,0,friend.color);
    soundLayers([[480,250,.2,.12,'sine']]);
    r.pickup={text:friend.name+' 귀환…',color:friend.color,time:1.2};
  }
}
function wingCadence(friend,count){
  return (friend.cadence||.48)+(count===2?.12:0);
}
function wingSupport(dt){
  const r=run;
  const active=r.boss?r.boss.open&&r.boss.hp>0:!r.escort&&r.enemies.length>0;
  const boosted=active&&r.support>0;
  if(boosted){
    r.support=Math.max(0,r.support-dt);
    for(const [i,id] of r.wings.entries()){
      r.wingShots[i]-=dt;
      if(r.wingShots[i]>0)continue;
      const friend=companions[id];
      r.wingShots[i]=wingCadence(friend,r.wings.length);
      launch(friend,wingX(i),r.y-10);
    }
  }
  if((boosted&&r.wings.length)||r.escort?.result)return;
  for(const [i,id] of r.escorts.entries()){
    r.escortShots[i]-=dt;
    if(r.escortShots[i]>0)continue;
    const friend=companions[id];
    r.escortShots[i]=wingCadence(friend,r.escorts.length);
    launch(friend,itemCompanionX(i),r.y-10);
  }
}
function chargeFriendship(){
  const r=run;
  if(r.escorts.length)r.friendship=Math.min(friendshipGoal,r.friendship+1);
}
function updateFriendship(dt){
  const r=run;
  if(r.specialNotice>0)r.specialNotice=Math.max(0,r.specialNotice-dt);
  if(r.special){
    r.special.time-=dt;
    if(r.special.time<=0)r.special=null;
  }
  if(!r.special&&r.escorts.length&&r.friendship===friendshipGoal&&!r.escort?.result){
    const i=(r.escorts.indexOf(r.lastSpecial)+1)%r.escorts.length;
    const id=r.escorts[i];
    r.friendship=0;r.lastSpecial=id;r.specialNotice=1;
    r.special={id,time:specialDurations[id],next:0,volleys:0,bossDamage:new Map()};
    soundLayers(specialSounds[id]);
  }
  const special=r.special;
  if(!special)return;
  special.next-=dt;
  if(special.next>0)return;
  const {id}=special;
  if(id===0&&special.volleys<2){
    if(r.shots.length+15>maxShots)r.shots.splice(0,r.shots.length+15-maxShots);
    special.next=.24;special.volleys++;
    launch(fanStyle,r.x,r.y-22,{special});
  }else if(id===1&&r.shots.length<maxShots){
    special.next=.15;
    r.shots.push({x:r.x,y:r.y-22,style:companions[1],ray:true,special,damage:2});
  }else if(id===4){
    special.next=.14;
    launch(crossStyle,r.x,r.y-20,{special});
  }
}
function bossShotDamage(shot,boss){
  const damage=shot.damage||1;
  if(!shot.special)return damage;
  const totals=shot.special.bossDamage;
  const used=totals.get(boss)||0;
  const allowed=Math.min(damage,boss.hp,Math.max(0,boss.maxHp*.08-used));
  totals.set(boss,used+allowed);
  return allowed;
}
function beginEnding(){
  release();state='ending';run.ending=0;
  get('overlay').hidden=true;
}
function updateVictory(dt){
  const r=run,b=r.boss;
  r.flash=Math.max(0,r.flash-dt);
  r.sparks=r.sparks.filter(s=>(s.t-=dt)>0);
  b.victoryTime+=dt;
  while(b.victoryIndex<victoryBursts.length){
    const [at,x,y]=victoryBursts[b.victoryIndex];
    if(b.victoryTime<at)break;
    b.victoryIndex++;
    const final=b.victoryIndex===victoryBursts.length;
    burst(b.x+x,b.y+y,2,0,final?'#fff0ad':'#ffbb76',final?'heavy':'normal');
    combatSound(final?'boss':'kill');
    r.flash=.13;
  }
  if(b.victoryTime>=victoryDuration)beginEnding();
}
function impact(hold,strength,flash=0){
  if(!reducedMotion.matches){
    run.hitStop=Math.max(run.hitStop||0,hold);
    run.heavyShake=.22;run.shakeStrength=strength;
  }
  if(flash)run.bossFlash=flash;
}
function hitEnemy(r,s,target){
  if(target.dead)return;
  s.dead=true;
  if(target.phase==='escort'){
    if(!activeTarget(target)){
      if(!target.blockUntil||r.clock>=target.blockUntil){
        target.blockUntil=r.clock+.17;
        combatSound('block');burst(target.x,target.y,0,0,'#a5bdf9');
      }
      return;
    }
    target.hp-=s.damage||1;target.hitUntil=r.clock+.13;
    if(target.hp>0){target.whiteFrames=2;combatSound('hit');burst(target.x,target.y,1,0,s.style?.color);return;}
  }
  if(target.phase==='extra'){
    if(target.shieldHp>0){
      target.shieldHp--;
      target.whiteFrames=2;
      if(target.shieldHp===0){
        addScore(50);combatSound('kill');
        burst(target.x,target.y,1,50,'#9aaeea','shield');
      }else{
        combatSound('block');burst(target.x,target.y,0,0,'#bdc8ff');
      }
      return;
    }
    const blocked=(target.kind==='leader'||target.kind==='rear')&&!target.open;
    if(blocked){
      if(!target.hitUntil||target.hitUntil<r.clock){
        target.hitUntil=r.clock+.15;combatSound('block');burst(target.x,target.y,0,0,'#bdc8ff');
      }
      return;
    }
    target.hp-=s.damage||1;target.hitUntil=r.clock+.13;
    if(target.hp>0){target.whiteFrames=2;combatSound('hit');burst(target.x,target.y,1,0,s.style?.color);return;}
    const lastRear=target.kind==='rear'&&!r.enemies.some(e=>e!==target&&!e.dead&&e.kind==='rear');
    if((target.kind==='leader'||lastRear)&&!r.extra.broken){
      r.extra.broken=true;
      for(const plate of r.enemies.filter(e=>e.shieldHp>0)){
        plate.shieldHp=0;burst(plate.x,plate.y,1,0,'#9aaeea','shield');
      }
      r.pickup={text:'방패 편대 해제!',color:'#ffe9a6',time:1.1};
    }
  }
  if(target.phase==='breakthrough'){
    target.hp-=s.damage||1;target.hitUntil=r.clock+.12;
    if(target.hp>0){target.whiteFrames=2;combatSound('hit');burst(target.x,target.y,1,0,s.style?.color);return;}
  }
  if(target.phase==='formation'||target.phase==='warning'||target.phase==='dive'||target.phase==='return'){
    target.hp=(target.hp??1)-(s.damage||1);
    if(target.hp>0){target.whiteFrames=2;combatSound('hit');return;}
  }
  target.dead=true;combatSound('kill');
  chargeFriendship();
  if(target.kind==='leader')impact(.05,8);
  else if(target.kind!=='lock'&&target.kind!=='reactor'&&target.kind!=='cageThreat'){
    target.whiteFrames=1;
    r.hitGhosts.push(target);
  }
  const diving=target.phase==='dive';
  const points=diving?180:100;
  addScore(points);
  r.flash=.13;
  burst(target.x,target.y,target.phase==='breakthrough'?2:1,points,s.style?.color);
  r.defeated++;
  if(!r.escort)dropCompanion(target);
  if(!r.escort&&!r.breakthrough&&!r.extra&&dropMilestones.includes(r.defeated)){
    const type=r.defeated!==8?'star':r.stage===1
      ? (r.area%2===1?'preview':'bolt') : 'comet';
    r.drops.push({x:target.x,y:target.y,type});
  }
}
function update(dt){
  const r=run;
  if(r.boss?.victoryTime!==undefined){updateVictory(dt);return;}
  if(dragTarget){
    r.x=dragTarget.x;
    r.y=dragTarget.y;
    dragTarget=null;
  }
  r.clock+=dt;
  if(r.escort?.deadline&&!r.escort.result&&r.clock>=r.escort.deadline){
    escortStep();hud();return;
  }
  r.invincible=Math.max(0,r.invincible-dt);
  r.flash=Math.max(0,r.flash-dt);
  r.muzzle=Math.max(0,r.muzzle-dt);
  const held = new Set([...keys].map(key=>moveKeys.get(key)));
  const dx=Number(held.has('right'))-Number(held.has('left'));
  const dy=Number(held.has('down'))-Number(held.has('up'));
  const step=345*dt/(Math.hypot(dx,dy)||1);
  r.x=clamp(r.x+dx*step,22,W-22);
  r.y=clamp(r.y+dy*step,minY,maxY);
  r.bolt=Math.max(0,r.bolt-dt);r.comet=Math.max(0,r.comet-dt);
  r.preview=Math.max(0,r.preview-dt);
  updateFriendship(dt);
  if(r.pickup)r.pickup.time-=dt;
  r.cometShot-=dt;
  if(r.comet>0&&r.cometShot<=0&&!(r.escort&&((!r.escort.flight&&r.clock<1.55)||r.escort.result))){
    r.cometShot=1.1;
    launch(companions[1],r.x,r.y-24,{homing:true});
  }
  r.fireTimer-=dt;
  if(r.fireTimer<=0&&!(r.escort&&((!r.escort.flight&&r.clock<1.55)||r.escort.result))){
    const power=r.preview>0?maxPower:r.power;
    const weapon=weapons[power];
    const mint=r.special?.id===3?r.special:null;
    const interval=r.bolt>0?.095:weapon.lanes.length===1?.24:.21;
    r.fireTimer=mint?interval/2+Math.max(-dt,r.fireTimer):interval;
    r.muzzle=.085;
    const damage=doubleDamagePowers.includes(power)?2:1;
    const extraShot=mint&&++mint.volleys%2===0;
    launch(weapon,r.x,r.y-20,{damage:damage*(1+r.mode*.20),special:extraShot?mint:null});
    shotSound(power,r.bolt>0);
  }
  const speed=1+Math.min(8,Math.max(0,r.area-2))*.075+pressure[r.mode].speed;
  const exposedByRow=[];
  if(r.extra?.kind==='shield'&&!r.extra.broken){
    for(const e of r.enemies){
      if(e.kind!=='rear'||e.dead)continue;
      const exposed=exposedByRow[e.row];
      if(!exposed||r.extra.side*(e.slot-exposed.slot)>0)exposedByRow[e.row]=e;
    }
  }
  for(const e of r.enemies){
    if(e.phase==='escort')continue;
    if(e.phase==='breakthrough'){moveBreakthrough(e);continue;}
    if(e.phase==='extra'){moveExtra(e,exposedByRow);continue;}
    e.time+=dt;
    const fx=e.baseX+Math.sin(r.clock*1.7*speed)*40;
    const fy=e.baseY+Math.sin(r.clock*2+e.row)*6;
    if(e.entry){
      const {route,fromX,fromY,delay,duration}=e.entry;
      const t=clamp((e.time-delay)/duration,0,1);
      if(t<1){
        e.x=fromX+(fx-fromX)*t;
        e.y=fromY+(fy-fromY)*t;
        if(route==='s')e.y+=Math.sin(t*Math.PI*2)*43;
        if(route==='v')e.x=fromX+(fx-fromX)*t*t;
        continue;
      }
      e.entry=null;
    }
    if(e.phase==='formation'||e.phase==='warning'){
      e.x=fx;e.y=fy;
      if(e.phase==='warning'&&e.time>=.58){
        e.phase='dive';e.time=0;e.startX=e.x;e.startY=e.y;e.targetX=r.x;
      }
    }else if(e.phase==='dive'){
      const t=e.time*speed/1.52;
      e.x=e.startX+(e.targetX-e.startX)*Math.min(1,t)+Math.sin(t*Math.PI)*36;
      e.y=e.startY+(H+22-e.startY)*t;
      if(t>=1){e.phase='return';e.time=0;}
    }else{
      e.x=fx;e.y=-20+(fy+20)*Math.min(1,e.time/.55);
      if(e.time>=.55)e.phase='formation';
    }
  }
  r.enemyTimer-=dt;r.diveTimer-=dt;
  bossAttack(dt,speed);
  satelliteAttack(speed);
  bossReinforcements();
  if(r.breakthrough)breakthroughAttack(speed);
  else extraAttack(speed);
  moveGuards();
  wingSupport(dt);
  const formation=r.enemies.filter(e=>e.phase==='formation'&&e.y>0&&!e.entry);
  if(!r.breakthrough&&r.enemyTimer<=0&&formation.length){
    r.enemyTimer=Math.max(r.mode===2?.65:.51,1.13-Math.max(0,r.area-2)*.055-pressure[r.mode].interval);
    const e=formation[Math.floor(Math.random()*formation.length)];
    const vy=210*speed;
    const vx=r.level>=2?clamp((r.x-e.x)*vy/(r.y-e.y),-170,170):0;
    fireFormationVolley(e.x,e.y+10,vx,vy,straightVolley);
  }
  if(r.diveTimer<=0&&r.area>=2&&formation.length&&!r.enemies.some(e=>e.phase==='warning'||e.phase==='dive')){
    r.diveTimer=Math.max(2.4,4.6-(r.area-2)*.2);
    const e=formation[Math.floor(Math.random()*formation.length)];
    e.phase='warning';e.time=0;
  }
  for(const s of r.shots){
    if(s.homing){
      const side=r.satellite;
      const target=side?.hp>0&&side.y<s.y&&Math.abs(side.x-s.x)<100
        ? side : r.boss?.hp>0?r.boss:r.enemies.find(e=>!e.dead&&e.y<s.y);
      if(target)s.vx=clamp((target.x-s.x)*4,-200,200);
    }
    s.prevX=s.x;s.prevY=s.y;
    if(s.ray){s.y=-30;s.dead=true;}
    else{s.age+=dt;s.x+=s.vx*dt;s.y-=(s.homing?380:565)*dt;}
    const boss=r.boss, side=r.satellite;
    if(side?.hp>0&&boss.hp>0&&Math.abs(s.x-side.x)<18&&
      (s.ray?side.y<s.prevY:Math.abs(s.y-side.y)<17)){
      side.hp=Math.max(0,side.hp-(s.damage||1));s.dead=true;
      if(!side.hp){
        addScore(450);chargeFriendship();combatSound('kill');burst(side.x,side.y,2,450);impact(.045,8);
        r.bullets=r.bullets.filter(b=>!b.side);
        r.pickup={text:'위성 격파 · 핵 개방 연장',color:'#ffe49a',time:1.25};
      }else{side.whiteFrames=2;combatSound('hit');burst(side.x,side.y,1,0,s.style?.color);}
      if(!s.ray)continue;
    }
    if(boss?.hp>0&&Math.abs(s.x-boss.x)<30&&
      (s.ray?boss.y<s.prevY:Math.abs(s.y-boss.y)<22)){
      s.dead=true;
      const damage=boss.open?bossShotDamage(s,boss):0;
      if(damage>0){
        boss.hp=Math.max(0,boss.hp-damage);
        if(r.area===5&&boss.phase2At===undefined&&boss.hp<=boss.maxHp/2){
          boss.hp=boss.maxHp/2;boss.open=false;boss.phase2At=r.clock;
          musicSilenceUntil=performance.now()+100;syncBattleTone();
          r.pickup={text:'포대 전개!',color:'#ffc58c',time:1.2};
        }
        if(boss.hp===0){
          if(r.area===5){
            cleared=true;
            try{localStorage.setItem(clearKey,'1');}catch{}
          }
          addScore(750);chargeFriendship();combatSound('boss');
          musicSilenceUntil=0;syncBattleTone();impact(.055,11,.22);
          burst(boss.x,boss.y,2,750);r.flash=.13;
          r.bullets=[];r.waveWait=.7;
          if(r.area===5){
            vibrate([25,55,75]);
            boss.victoryTime=0;boss.victoryIndex=0;
            r.shots=[];r.drops=[];r.enemies=[];r.muzzle=0;hud();
            return;
          }
        }else{boss.whiteFrames=2;combatSound('hit');burst(boss.x,boss.y,1,0,s.style?.color);}
      }else if(!boss.open)combatSound('block');
      if(!s.ray)continue;
    }
    if(s.ray){
      for(const target of r.enemies){
        if(shotTouchesEnemy(s,target))hitEnemy(r,s,target);
      }
    }else{
      let target=null;
      for(const enemy of r.enemies){
        if((!target||enemy.y>target.y)&&shotTouchesEnemy(s,enemy))target=enemy;
      }
      if(target)hitEnemy(r,s,target);
    }
  }
  r.shots=r.shots.filter(s=>!s.dead&&s.y>-20&&s.x>-20&&s.x<W+20);
  const hadEnemies=r.enemies.length>0;
  r.enemies=r.enemies.filter(e=>!e.dead);
  if(hadEnemies&&!r.enemies.length&&r.breakthrough)r.bullets=[];
  if(hadEnemies&&!r.enemies.length&&!r.escort&&!r.breakthrough&&!r.boss){
    r.squadNotice=1.1;
    r.quickClear=r.clock<r.entryEnd;
    if(r.quickClear)addScore(r.entryBonus);
  }
  for(const b of r.bullets){
    if(b.irregular)b.vx=clamp(b.vx+b.bend*dt,-270,270);
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(r.special?.id===2&&(b.x-r.x)**2+(b.y-r.y)**2<friendshipRadius**2)b.dead=true;
  }
  hitItemCompanions();
  const hit=(x,y,radius)=>Math.abs(x-r.x)<radius&&Math.abs(y-(r.y+1))<radius;
  if(!r.invincible){
    const bullet=r.bullets.find(b=>!b.dead&&hit(b.x,b.y,11));
    if(bullet||r.enemies.some(e=>e.phase==='dive'&&hit(e.x,e.y,19))){
      if(bullet)bullet.dead=true;
      combatSound(run.shield?'block':'hurt');
      if(r.escort)r.rescueMistakes.add(r.area);
      vibrate(r.shield?12:r.power>0?18:34);
      if(r.shield)r.shield=false;
      else if(r.power>0)r.power--;
      else r.hp--;
      r.invincible=1.35;
      burst(r.x,r.y,0,0);
      if(!r.hp){
        resetItemCompanions();saveBest();hud();release();state='over';show('비행 종료','점수 '+r.score+' · 최고 '+best,'다시 하기');return;
      }
    }
  }
  r.bullets=r.bullets.filter(b=>!b.dead&&b.y<H+15&&b.x>-15&&b.x<W+15);
  for(const d of r.drops){
    d.y+=(r.enemies.length?146:335)*dt;
    if(hit(d.x,d.y,22)){
      d.dead=true;
      if(d.type==='companion'){collectCompanion(d.id);continue;}
      const levelUp=d.type==='star'&&r.power<maxPower;
      combatSound(levelUp?'level':'pickup');
      if(levelUp)r.levelRing=.42;
      const gainsShield=d.type==='star'&&r.power===maxPower;
      if(d.type==='bolt')r.bolt=6;
      else if(d.type==='comet'){r.comet=6;r.cometShot=0;}
      else if(d.type==='preview')r.preview=5;
      else if(r.power<maxPower)r.power++;
      else r.shield=true;
      r.pickup={
        text:d.type==='star'?(gainsShield?'보호막 획득':'무기 Lv. '+(r.power+1)):itemLabels[d.type],
        color:itemColors[d.type],time:.95
      };
      burst(r.x,r.y,1,0,itemColors[d.type]);
    }
  }
  r.drops=r.drops.filter(d=>!d.dead&&d.y<H+18);
  r.sparks=r.sparks.filter(s=>(s.t-=dt)>0);
  if(r.escort){
    cageThreats();escortStep();
  }
  else if(!r.enemies.length&&!(r.boss?.hp>0)){
    if(r.breakthrough||r.boss||!r.drops.some(d=>d.y<r.y+22))r.waveWait-=dt;
    if(r.waveWait<=0){
      if(r.extra&&!r.breakthrough){
        if(r.stage===0){r.stage=1;r.level++;}
        else r.extraCleared.add(r.area);
        wave();
      }else if(r.boss){
        beginEnding();
      }else{
        r.stage++;r.level++;wave();
      }
    }
  }
  hud();
}
function burst(x,y,power,points,color=shotColors[power],effect){
  const destroyed=Boolean(effect)||points===100||points===180||points===450||points===750;
  const heavy=effect==='heavy'||points>=450;
  const life=heavy?.68:destroyed?.53:.38;
  const particles=Array.from({length:destroyed?(heavy?27:18):8+power*3},(_,i)=>{
    const angle=i*2.39996;
    const speed=35+Math.random()*(destroyed?142:88)+power*15;
    return {vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:2+i%3};
  });
  if(run.sparks.length>=maxBursts)run.sparks.shift();
  run.sparks.push({x,y,t:life,life,color,power,particles,points,destroyed,heavy});
}
const weaponLevels=new Map(weapons.map((weapon,index)=>[weapon,index+1]));
function pixelStar(x,y,radius){
  ctx.fillRect(x-radius,y-1,radius*2+1,3);
  ctx.fillRect(x-1,y-radius,3,radius*2+1);
}
function weaponBeam(s,level){
  const {x,y,age,style}=s;
  const length=Math.min(style.length,5+age*565);
  const lean=s.vx*length/565;
  const tail=(fraction)=>x-lean*fraction;
  ctx.fillStyle=style.color;
  switch(level){
    case 1:
      ctx.fillRect(x-1,y-3,2,length);
      break;
    case 2:
      ctx.fillRect(x-1,y-2,2,length-2);
      ctx.fillRect(x-2,y+length-5,4,3);
      break;
    case 3:{
      const width=reducedMotion.matches?7:7+2*Math.sin(age*46);
      ctx.fillRect(x-width/2,y,width,length*.72);
      ctx.fillRect(x-2,y-3,4,length);
      break;
    }
    case 4:
      ctx.fillRect(tail(.5)-1,y+3,2,length*.65);
      pixelStar(x,y,6);
      break;
    case 5:
      ctx.fillRect(x-4,y-4,8,8);
      ctx.fillRect(x-3,y+4,6,length*.35);
      ctx.fillRect(x-1,y+4+length*.35,2,length*.65+7);
      break;
    case 6:
      for(let i=0;i<6;i++){
        const offset=Math.round(Math.sin(i*1.1)*4);
        ctx.fillRect(x-2+offset,y+i*length/6,4,Math.ceil(length/6));
      }
      break;
    case 7:
      ctx.fillRect(x-5,y,3,length);
      ctx.fillRect(x+2,y,3,length);
      ctx.fillRect(x-5,y-2,10,3);
      break;
    case 8:
      pixelStar(x,y,4);
      for(let i=1;i<=4;i++){
        const dy=i*length/4, size=(i+Math.floor(age*22))%3===0?3:2;
        ctx.fillRect(tail(i/4)+(i%2?4:-5),y+dy,size,size);
      }
      break;
    case 9:
      ctx.fillRect(x-6,y-2,12,13);
      ctx.fillRect(x-4,y-6,8,20);
      ctx.fillRect(x-2,y+14,4,length*.55);
      break;
    case 10:
      ctx.fillRect(x-1,y-6,3,13);
      ctx.fillRect(x-6,y-1,2,9);
      ctx.fillRect(x+5,y-1,2,9);
      ctx.fillRect(x-6,y+6,13,3);
      ctx.fillRect(tail(.45)-1,y+8,3,length*.65);
      break;
  }
  ctx.fillStyle='#fff9eb';
  ctx.fillRect(x-1,y-2,level===9?4:2,level===9?7:3);
}
function beam(s){
  const level=weaponLevels.get(s.style);
  if(level){weaponBeam(s,level);return;}
  const style=s.style||weapons[0];
  const length=Math.min(style.length,5+s.age*565);
  const lean=s.vx*length/565;
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle=style.color;
  ctx.globalAlpha=.23;
  ctx.lineWidth=style.width+5;
  ctx.beginPath();ctx.moveTo(s.x-lean,s.y+length);ctx.lineTo(s.x,s.y);ctx.stroke();
  ctx.globalAlpha=.86;ctx.lineWidth=style.width;ctx.stroke();
  const size=style.shape==='diamond'?style.width*.78:style.width*.59;
  ctx.fillStyle=style.color;
  ctx.beginPath();ctx.arc(s.x,s.y-3,size,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff9eb';
  ctx.beginPath();ctx.arc(s.x,s.y-4,Math.max(1,size*.38),0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawCompanion(x,y,friend=companion(),portrait=false,label=false){
  const id=companions.indexOf(friend);
  drawSprite(ctx,portrait?crewPortraits[id]:crewShips[id],x,y,portrait?25:29,portrait?32:33);
  if(label){
    ctx.fillStyle='#fff0f6';ctx.font='bold 15px system-ui';ctx.textAlign='center';
    ctx.fillText(friend.name,x,y+29);
  }
}
function paintEscort(e){
  if(run.rescued){
    const t=clamp((run.clock-e.launched)/1.15,0,1);
    drawCompanion(e.x+(wingX()-e.x)*t,e.y+(run.y-e.y)*t,companion(),t<.57,true);
  }else if(e.flight){
    drawCompanion(e.x,e.y,companion());
  }else{
    ctx.fillStyle='#272049';ctx.fillRect(e.x-26,e.y-24,52,48);
    drawCompanion(e.x,e.y,companion(),true);
    ctx.strokeStyle='#c6a5f0';ctx.lineWidth=3;ctx.strokeRect(e.x-26,e.y-24,52,48);
    ctx.fillStyle='#c6a5f0';
    for(const offset of barrierOffsets)ctx.fillRect(e.x+offset,e.y-23,2,46);
    ctx.lineWidth=1;
    const locks=run.area===2?run.enemies.filter(unit=>unit.kind==='lock').length:Math.max(1,run.enemies.length);
    for(let i=0;i<locks;i++){
      const x=e.x-(locks-1)*10-5+i*21;
      ctx.fillStyle='#ffdd83';ctx.fillRect(x,e.y+28,11,9);
      ctx.strokeStyle='#ffdd83';ctx.strokeRect(x+2,e.y+23,7,6);
    }
  }
  ctx.textAlign='center';ctx.fillStyle='#ffe6a6';ctx.font='bold 14px system-ui';
  ctx.fillText(e.result||companion().name,e.x,e.y+(e.result?49:56));
  if(e.deadline&&!e.result){
    ctx.fillStyle='#e3cafa';ctx.font='12px system-ui';
    ctx.fillText(Math.max(0,Math.ceil(e.deadline-run.clock))+'초',e.x,e.y+75);
  }
  if((e.flight||run.area===3||run.area===5)&&!e.result){
    const hit=e.lastHit;
    if(hit&&run.clock-hit.time<.16){
      ctx.strokeStyle='#ff826f';ctx.lineWidth=2;ctx.beginPath();
      ctx.moveTo(hit.x,hit.y);ctx.lineTo(e.x,e.y);ctx.stroke();ctx.lineWidth=1;
    }
    for(let i=0;i<3;i++){
      const x=e.x-14+i*14,y=e.y+70;
      ctx.fillStyle=i<e.hearts?'#ff9bc4':'#4b365a';
      ctx.fillRect(x-5,y-4,4,5);ctx.fillRect(x+1,y-4,4,5);
      ctx.fillRect(x-4,y,8,3);ctx.fillRect(x-2,y+3,4,2);
    }
  }
}
function paintItem(d){
  ctx.save();ctx.translate(d.x,d.y);
  const color=d.type==='companion'?companions[d.id].color:itemColors[d.type];
  ctx.fillStyle=color;ctx.strokeStyle=color;
  ctx.shadowBlur=11;ctx.shadowColor=color;
  if(d.type==='companion'){
    ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    drawSprite(ctx,crewPortraits[d.id],0,0,16,21);
  }else if(d.type==='star'){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-Math.PI/2,r=i%2?5:12;
      if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.fill();
  }else if(d.type==='bolt'){
    ctx.beginPath();ctx.moveTo(1,-13);ctx.lineTo(-8,1);ctx.lineTo(-2,1);
    ctx.lineTo(-4,13);ctx.lineTo(9,-3);ctx.lineTo(2,-3);ctx.fill();
  }else if(d.type==='comet'){
    ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(-2,3);ctx.lineTo(-10,11);ctx.moveTo(2,5);ctx.lineTo(-4,12);ctx.stroke();
    ctx.beginPath();ctx.arc(4,-3,7,0,Math.PI*2);ctx.fill();
  }else{
    ctx.beginPath();ctx.moveTo(-13,-8);ctx.lineTo(-6,-4);ctx.lineTo(0,-12);
    ctx.lineTo(6,-4);ctx.lineTo(13,-8);ctx.lineTo(10,8);ctx.lineTo(-10,8);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#372346';ctx.font='bold 10px system-ui';ctx.textAlign='center';
    ctx.fillText('10',0,6);
  }
  ctx.restore();
}
function paintEntry(e){
  let wait,x,y;
  const clock=run.clock;
  if(e.entry){
    const {delay,fromX,fromY}=e.entry;
    wait=delay+.24-e.time;
    x=clamp(fromX,13,W-13);y=clamp(fromY,13,H-13);
  }else if(e.phase==='extra'&&e.kind==='descending'){
    wait=e.row*1.65+e.slot*.19+.35+14/102-run.clock;
    x=62+e.slot*59+Math.sin(e.row*.55)*38*run.extra.side+(e.row%2?14:-14)*run.extra.side;y=13;
  }else if(e.phase==='extra'&&e.kind==='cross'){
    const side=(e.row?-1:1)*run.extra.side;
    const start=1.05+e.slot*.15+(run.stage===0&&e.slot>=5?.85:0);
    wait=start+.25-clock;
    x=side<0?13:W-13;
    y=93+e.row*101+(e.slot%5)*13+Math.floor(e.slot/5)*27+Math.sin(start*2+e.slot)*10;
  }else if(e.phase==='breakthrough'){
    const lead=e.leadIn+e.slot*.23;
    wait=e.started+Math.max(.4,lead+.35)-clock;
    x=e.side<0?13:W-13;
    y=108+(e.slot%2)*38+Math.sin(lead*1.2+e.slot*.35)*15;
  }
  if(!(wait>0&&wait<=.4))return;
  ctx.fillStyle='#fff0b6';
  ctx.globalAlpha=.35+.65*(1-wait/.4);
  pixelStar(x,y,wait>.2?3:5);
  ctx.globalAlpha=1;
}
function paintCombatNotices(){
  if(run.levelRing>0){
    const radius=21+(1-run.levelRing/.42)*37;
    ctx.globalAlpha=run.levelRing/.42;
    ctx.strokeStyle='#ffec9c';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(run.x,run.y-3,radius,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
  }
  if(run.bossFlash>0){
    ctx.globalAlpha=(reducedMotion.matches?.25:.72)*run.bossFlash/.22;
    ctx.fillStyle='#fff3cd';ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=1;
  }
  ctx.textAlign='center';
  if(run.squadNotice>0){
    const notice=run.quickClear?'빠른 격추! · +'+run.entryBonus:'편대 전멸!';
    ctx.font='bold 28px system-ui';ctx.lineWidth=5;ctx.strokeStyle='#281841';ctx.fillStyle='#ffe7a6';
    ctx.strokeText(notice,W/2,294);
    ctx.fillText(notice,W/2,294);
  }
  if(run.bossBanner>0||(run.breakthrough&&run.clock<1)){
    ctx.fillStyle='#402752';ctx.fillRect(8,23,W-16,47);
    ctx.strokeStyle='#e9b5f4';ctx.lineWidth=2;ctx.strokeRect(9,24,W-18,45);
    ctx.fillStyle='#ffe6a6';pixelStar(41,46,6);pixelStar(W-41,46,6);
    ctx.font='bold 23px system-ui';
    ctx.fillText(run.breakthrough?breakthroughLabel():'달그림자 출현!',W/2,55);
  }
  if(run.specialNotice>0){
    const id=run.lastSpecial;
    ctx.fillStyle='#402752';ctx.fillRect(8,83,W-16,41);
    ctx.fillStyle=companions[id].color;ctx.fillRect(8,83,W-16,3);
    ctx.font='bold 19px system-ui';
    ctx.fillText(companions[id].name+'의 '+specialNames[id]+'!',W/2,110);
  }
}
function paint(){
  ctx.fillStyle='#14122d';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#1b1737';ctx.fillRect(3,3,W-6,H-6);
  ctx.strokeStyle='#665087';ctx.strokeRect(4,4,W-8,H-8);
  ctx.fillStyle='#c9a2e5';
  for(const [x,y] of boardCorners)ctx.fillRect(x,y,4,4);
  ctx.save();
  if(!reducedMotion.matches){
    if(run.heavyShake>0){
      const t=run.heavyShake,kick=t/.22*run.shakeStrength;
      ctx.translate(Math.sin(t*155)*kick,Math.cos(t*115)*kick*.42);
    }else if(run.flash)ctx.translate(Math.sin(run.flash*140)*run.flash*18,0);
  }
  ctx.fillStyle='#5a487a';
  for(const [x,y,size] of stars)ctx.fillRect(x,y,size,size);
  if(run.escort)paintEscort(run.escort);
  if(run.extra&&run.clock<1.25){
    ctx.fillStyle='#ffe9ab';ctx.font='bold 22px system-ui';ctx.textAlign='center';
    if(run.extra.kind==='shield'){
      ctx.fillText('방패 편대',W/2,330);
      ctx.font='14px system-ui';ctx.fillStyle='#dbc9f5';
      ctx.fillText('방패를 깨거나 빛나는 지휘 별을 공격',W/2,354);
    }
  }
  for(const e of run.enemies){
    paintEntry(e);
    if(e.y<=-20)continue;
    if(e.phase==='escort'){
      if(e.kind==='cageThreat'){
        drawSprite(ctx,enemiesArt.diving,e.x,e.y,33,33);
        ctx.strokeStyle='#ff987d';ctx.setLineDash(warningDash);ctx.beginPath();
        ctx.moveTo(e.x,e.y+15);ctx.lineTo(run.escort.x,run.escort.y-23);ctx.stroke();ctx.setLineDash(solidLine);
        continue;
      }
      if(e.kind==='lock'||e.kind==='reactor'){
        const open=activeTarget(e);
        ctx.fillStyle=e.whiteFrames?'#fff':open?'#ffda83':'#524565';
        ctx.fillRect(e.x-18,e.y-13,36,26);
        if(e.blockUntil>run.clock){ctx.strokeStyle='#d6e4ff';ctx.strokeRect(e.x-20,e.y-15,40,30);}
        ctx.strokeStyle=open?'#fff3ce':'#a58fb7';ctx.strokeRect(e.x-7,e.y-19,14,12);
        ctx.fillStyle='#372345';ctx.fillRect(e.x-2,e.y-2,4,8);
        continue;
      }
      if(e.kind==='runner'){
        enemySprite(enemiesArt.gold,e,31,31);
        ctx.fillStyle='#ffe383';ctx.fillRect(e.x+13,e.y+4,14,4);
        ctx.strokeStyle='#ffe383';ctx.strokeRect(e.x+7,e.y+1,7,8);
        ctx.fillRect(e.x+23,e.y+6,4,5);continue;
      }
      enemySprite(enemiesArt.crescent,e,33,34);
      ctx.fillStyle='#ffe4a0';
      ctx.fillRect(e.x-15,e.y-24,30*clamp((e.fires-run.clock)/1.55,0,1),3);
      continue;
    }
    if(e.shieldHp>0){
      enemySprite(enemiesArt.shield,e,30,27);
      const ratio=e.shieldHp/shieldHealth[run.mode];
      if(ratio<=2/3){
        ctx.strokeStyle=e.whiteFrames?'#63567d':'#fff2c2';
        ctx.lineWidth=1.5;ctx.beginPath();
        ctx.moveTo(e.x+2,e.y-10);ctx.lineTo(e.x-3,e.y-3);
        ctx.lineTo(e.x+1,e.y+1);ctx.lineTo(e.x-5,e.y+8);
        if(ratio<=1/3){
          ctx.moveTo(e.x-3,e.y-3);ctx.lineTo(e.x-10,e.y-5);
          ctx.moveTo(e.x+1,e.y+1);ctx.lineTo(e.x+7,e.y+2);ctx.lineTo(e.x+10,e.y+7);
        }
        ctx.stroke();
      }
      continue;
    }
    if(e.phase==='extra'&&e.kind==='leader'){
      enemySprite(enemiesArt.commander,e,35,35);
      ctx.strokeStyle=e.open?'#ffefbb':'#8a84a8';ctx.strokeRect(e.x-18,e.y-18,36,36);continue;
    }
    if(e.phase==='warning'){
      ctx.strokeStyle='#ff9479';ctx.setLineDash(warningDash);ctx.beginPath();
      ctx.moveTo(e.x,e.y+16);ctx.lineTo(run.x,run.y-30);ctx.stroke();ctx.setLineDash(solidLine);
    }
    enemySprite(enemyArt(e),e,31,31);
    if(e.kind==='rear'&&e.open){ctx.strokeStyle='#9ef9e7';ctx.strokeRect(e.x-17,e.y-17,34,34);}
  }
  for(const e of run.hitGhosts)enemySprite(enemyArt(e),e,31,31);
  const defeatedBoss=run.boss;
  if(defeatedBoss?.victoryTime!==undefined&&defeatedBoss.victoryTime<2.42){
    ctx.save();
    ctx.globalAlpha=.88-defeatedBoss.victoryTime*.23;
    const shake=reducedMotion.matches?0:Math.sin(defeatedBoss.victoryTime*39)*2;
    drawSprite(ctx,enemiesArt.finalBoss,defeatedBoss.x+shake,defeatedBoss.y,88,62);
    ctx.restore();
  }
  if(run.boss?.hp>0){
    const b=run.boss;
    const final=run.area===5;
    enemySprite(final?enemiesArt.finalBoss:enemiesArt.midBoss,b,final?88:76,final?62:50);
    if(b.portWarning){
      const x=b.x+b.portWarning*35;
      ctx.fillStyle='#ff9b75';ctx.fillRect(x-6,b.y+12,12,7);
      ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('!',x,b.y+35);
    }
    const coreY=b.y+(final?4:2);
    if(b.open){
      ctx.strokeStyle='#fff2ac';ctx.strokeRect(b.x-10,coreY-9,20,18);
    }else{
      ctx.fillStyle='#52336f';ctx.fillRect(b.x-7,coreY-6,14,12);
      ctx.strokeStyle='#8770aa';ctx.strokeRect(b.x-8,coreY-7,16,14);
    }
  }
  if(run.satellite?.hp>0&&run.boss?.hp>0){
    const s=run.satellite;
    enemySprite(enemiesArt.satellite,s,42,33);
    ctx.fillStyle='#51394e';ctx.fillRect(s.x-15,s.y-23,30,3);
    ctx.fillStyle='#ffb6d7';ctx.fillRect(s.x-15,s.y-23,30*s.hp/s.maxHp,3);
    if(s.warning){
      ctx.fillStyle='#fff2a6';ctx.font='bold 13px system-ui';ctx.textAlign='center';
      ctx.fillText('!',s.x,s.y-29);
    }
  }
  for(const s of run.shots)beam(s);
  for(const d of run.drops)paintItem(d);
  for(const s of run.sparks){
    const elapsed=s.life-s.t;
    const fade=Math.min(1,s.t*4);
    if(s.destroyed){
      const radius=(s.heavy?15:11)+elapsed*(s.heavy?111:79);
      ctx.globalAlpha=fade*.59;ctx.strokeStyle='#ffc779';ctx.lineWidth=s.heavy?3:2;
      ctx.beginPath();ctx.arc(s.x,s.y,radius,0,Math.PI*2);ctx.stroke();
      if(elapsed<.12){
        const hot=(s.heavy?25:15)*(1-elapsed/.15);
        ctx.globalAlpha=.79-elapsed*4;ctx.fillStyle='#ffd086';
        ctx.beginPath();ctx.arc(s.x,s.y,hot,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff4c8';
        ctx.fillRect(s.x-hot*.45,s.y-hot*.39,hot*.9,hot*.78);
      }
    }
    ctx.globalAlpha=fade;
    ctx.strokeStyle=s.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(s.x,s.y,8+elapsed*65,0,Math.PI*2);ctx.stroke();
    if(elapsed<(s.destroyed?.095:.06)){
      ctx.fillStyle='#fff9e9';
      const size=11+s.power*4;
      ctx.fillRect(s.x-size,s.y-3,size*2,6);
      ctx.fillRect(s.x-3,s.y-size,6,size*2);
    }
    for(const p of s.particles){
      ctx.fillStyle=p.size===4?'#fff1ba':s.destroyed&&p.size===3?'#ffad73':s.color;
      const age=s.destroyed?elapsed*(1.1-elapsed*.55):elapsed;
      const x=s.x+p.vx*age,y=s.y+p.vy*age+(s.destroyed?elapsed*elapsed*43:0);
      ctx.fillRect(x,y,p.size,p.size);
      if(s.destroyed&&p.size===4&&elapsed<.24)ctx.fillRect(x-p.vx*.024,y-p.vy*.024,2,2);

    }
    if(s.points){
      ctx.fillStyle='#fff3c5';ctx.font='bold 13px system-ui';ctx.textAlign='center';
      ctx.fillText('+'+s.points,s.x,s.y-17-elapsed*55);
    }
  }
  ctx.globalAlpha=1;
  for(const b of run.bullets){
    ctx.fillStyle=b.spiral?'#a28cff':b.irregular?'#ef81d0':'#ff806f';ctx.fillRect(b.x-4,b.y-5,8,10);
    ctx.fillStyle=b.irregular?'#fff0f4':'#ffe0b0';ctx.fillRect(b.x-2,b.y-3,4,5);
    if(b.irregular){
      ctx.fillStyle='#ae538e';ctx.fillRect(b.x-b.vx*.033-1,b.y-9,3,4);
    }
  }
  if(!run.invincible||Math.floor(run.invincible*14)%2===0){
    const power=run.preview>0?maxPower:run.power;
    ship(ctx,run.x,run.y,power);
    if(run.shield){
      ctx.strokeStyle='#a9f9e8';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(run.x,run.y-2,25,0,Math.PI*2);ctx.stroke();
    }
    if(run.muzzle){
      ctx.fillStyle=weapons[power].color;
      const size=5+Math.floor(power/2);
      ctx.fillRect(run.x-size,run.y-24,size*2,4);
      ctx.fillRect(run.x-2,run.y-29,4,14);
    }
  }
  const showWings=run.support>0&&(!run.escort||run.boss);
  if(showWings){
    for(const [i,id] of run.wings.entries())drawCompanion(wingX(i),run.y+3,companions[id]);
  }
  for(const [i,id] of run.escorts.entries()){
    const x=itemCompanionX(i);
    if(showWings&&run.wings.some((_,slot)=>wingX(slot)===x))continue;
    drawCompanion(x,run.y+3,companions[id]);
  }
  if(run.special?.id===1){
    ctx.fillStyle='#ffe375';ctx.fillRect(run.x-9,4,18,run.y-26);
    ctx.fillStyle='#fff5d3';ctx.fillRect(run.x-3,4,6,run.y-26);
  }else if(run.special?.id===2){
    ctx.strokeStyle='#8fd6ff';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(run.x,run.y,friendshipRadius,0,Math.PI*2);ctx.stroke();
  }
  if(run.pickup?.time>0){
    ctx.fillStyle=run.pickup.color;ctx.textAlign='center';ctx.font='bold 15px system-ui';
    ctx.fillText(run.pickup.text,clamp(run.x,78,W-78),run.y-43);
  }
  ctx.restore();
  paintCombatNotices();
  if(!run.squadNotice&&!run.escort&&!run.enemies.length&&(run.boss?.hp<=0||run.breakthrough?.group===breakthroughCount)){
    ctx.fillStyle='#ffe6a6';ctx.font='bold 20px system-ui';ctx.textAlign='center';
    ctx.fillText(run.boss?(run.boss.victoryTime<2.42?'':'최종 보스 격파!') : '돌파 성공!',W/2,294);
  }
}
window.moonlightArcade.register('rabbit',{
  unlocked:()=>cleared,
  start(difficulty=0){
    mode=difficulty;
    get('home').hidden=true;get('game').hidden=false;start();paint();
  }
});
get('back').onclick=home;
get('finish').onclick=home;
get('pause').onclick=pause;
get('action').onclick=()=>{
  if(state==='over')start();
  else if(['finalSelect','rescueRetry'].includes(state)){
    if(state==='finalSelect'){
      const others=run.team.filter(id=>id!==run.selected);
      setWings([run.selected,others[Math.floor(Math.random()*others.length)]]);
      run.stage=rescueStage+1;
    }else{
      run.score=run.escapeCheckpoint?.score??run.rescueScore;
      Object.assign(run,snapshotItemCompanions(run.escapeCheckpoint?.companions??run.rescueCompanions));
      run.special=snapshotSpecial(run.escapeCheckpoint?.special??null);
      run.specialNotice=run.escapeCheckpoint?.specialNotice??0;
    }
    wave();hud();state='playing';get('overlay').hidden=true;focusBoard();
    resumeGameAudio();
  }
  else if(state==='paused'){
    state='playing';get('overlay').hidden=true;focusBoard();resumeGameAudio();
  }
};
board.onpointerdown=e=>{
  if(state!=='playing'||drag)return;
  focusBoard();
  const {left,top,width,height}=board.getBoundingClientRect();
  const shipX=dragTarget?.x??run.x;
  let shipY=dragTarget?.y??run.y;
  if(e.pointerType==='touch'&&width&&height){
    const fingerY=(e.clientY-top)*H/height;
    const fingerX=(e.clientX-left)*W/width;
    const clearance=38*H/height;
    if(Math.abs(shipX-fingerX)<50&&Math.abs(shipY-fingerY)<clearance){
      shipY=clamp(Math.min(shipY,fingerY-clearance),minY,maxY);
      dragTarget={x:shipX,y:shipY};
    }
  }
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,
    shipX,shipY,width,height};
  board.setPointerCapture(e.pointerId);
};
function resizeDrag(){
  if(!drag)return;
  const {width,height}=board.getBoundingClientRect();
  if(width===drag.width&&height===drag.height)return;
  Object.assign(drag,{width,height,x:drag.lastX,y:drag.lastY,
    shipX:dragTarget?.x??run.x,shipY:dragTarget?.y??run.y});
}
new ResizeObserver(resizeDrag).observe(board);
board.onpointermove=e=>{
  if(drag?.id===e.pointerId&&state==='playing'){
    resizeDrag();
    if(!drag.width||!drag.height)return;
    drag.lastX=e.clientX;drag.lastY=e.clientY;
    dragTarget={
      x:clamp(drag.shipX+(e.clientX-drag.x)*W/drag.width,22,W-22),
      y:clamp(drag.shipY+(e.clientY-drag.y)*H/drag.height,minY,maxY)
    };
  }
};
board.onlostpointercapture=board.onpointerup=board.onpointercancel=e=>{
  if(drag?.id===e.pointerId)drag=null;
};
function inputKey(event){
  return moveKeys.has(event.code)?event.code:event.key;
}
document.addEventListener('keydown',e=>{
  const key=inputKey(e);
  if(state==='playing'&&moveKeys.has(key)&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
    e.preventDefault();
    keys.add(key);
  }
  if(e.key==='Escape'&&!e.repeat)pause();
},true);
document.addEventListener('keyup',e=>keys.delete(inputKey(e)),true);
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();syncSound();});
function paintEnding(){
  const t=run.ending;
  ctx.fillStyle='#1f1536';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#9874bb';
  for(const [x,y,size] of stars)ctx.fillRect(x,y,size,size);
  ctx.fillStyle='#ffe5a9';ctx.beginPath();ctx.arc(180,230,77,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#bd87cf';ctx.fillRect(155,227,50,35);
  ctx.fillStyle='#8b5b9e';ctx.beginPath();
  ctx.moveTo(150,230);ctx.lineTo(180,203);ctx.lineTo(210,230);ctx.fill();
  ctx.fillStyle='#fff1b6';ctx.fillRect(163,235,8,8);ctx.fillRect(188,235,8,8);
  ctx.fillStyle='#6f468b';ctx.fillRect(175,243,10,19);
  const travel=clamp((t-2.6)/4.1,0,1);
  const y=420-183*travel;
  const spread=1-.69*travel;
  ship(ctx,180,y+49,0);
  for(const [i,id] of run.team.entries()){
    const x=180+(i-2)*47*spread;
    const bounce=Math.sin(t*8+i)*9*(1-travel);
    drawCompanion(x,y+bounce,companions[id],travel===0);
    if(travel===0){ctx.fillStyle=companions[id].color;ctx.fillRect(x-2,y-39+Math.sin(t*6+i)*8,4,4);}
  }
  ctx.fillStyle='#fff0c7';ctx.font='bold 25px system-ui';ctx.textAlign='center';
  ctx.fillText(t<2.6?'다섯 토끼가 다시 모였어요!':'우리 집으로!',180,100);
  ctx.font='16px system-ui';ctx.fillText(difficulties[run.mode]+' 완주 · 점수 '+run.score,180,135);
}
let lastAudioState;
function frame(now){
  const dt=Math.min(.032,(now-last)/1000);last=now;
  if(musicSilenceUntil&&now>=musicSilenceUntil){
    musicSilenceUntil=0;syncBattleTone();
  }
  if(state==='playing'){
    for(const key of combatTimers){
      if(run[key]>0)run[key]=Math.max(0,run[key]-dt);
    }
    const held=reducedMotion.matches?0:Math.min(dt,run.hitStop||0);
    run.hitStop=held?Math.max(0,run.hitStop-held):0;
    if(dt>held)update(dt-held);
    if(state!=='ending'){
      paint();
      run.hitGhosts.length=0;
      for(const e of run.enemies)if(e.whiteFrames)e.whiteFrames--;
      if(run.boss?.whiteFrames)run.boss.whiteFrames--;
      if(run.satellite?.whiteFrames)run.satellite.whiteFrames--;
    }
  }
  if(state==='ending'){
    if(!document.hidden)run.ending+=dt;
    if(run.ending>=endingDuration)home();else paintEnding();
  }
  if(state!==lastAudioState){lastAudioState=state;syncSound();}
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);
})();
