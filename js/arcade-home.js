(() => {
const get=id=>document.getElementById(id);
const miniGames={};
const blocksRecordKey='moonlight-starlight-blocks-v1';
const homeCardKey='moonlight-arcade.home-card';
const gameCards=[...document.querySelectorAll('[data-game]')];
function readBlocksRecord(){
  try { return JSON.parse(localStorage.getItem(blocksRecordKey)) || {}; }
  catch { return {}; }
}
let recordGame;
try { recordGame=localStorage.getItem(homeCardKey); } catch {}
if(!gameCards.some(card=>card.dataset.game===recordGame))recordGame='rabbit';
function refreshHomeRecords(){
  const rabbit=recordGame==='rabbit';
  const blocks=recordGame==='blocks';
  get('home-rabbit-records').hidden=!rabbit;
  get('home-block-records').hidden=!blocks;
  get('home-pending-records').hidden=rabbit||blocks;
  get('album').hidden=!rabbit;
  if(!rabbit){
    get('collection').hidden=true;
    get('album').setAttribute('aria-expanded','false');
  }
  if(blocks){
    const {score=0,bestTime=null,wins=0}=readBlocksRecord();
    get('home-block-score').textContent=Number(score).toLocaleString('ko-KR');
    const tenths=Math.floor(bestTime/100);
    const minutes=String(Math.floor(tenths/600)).padStart(2,'0');
    const seconds=String(Math.floor(tenths/10)%60).padStart(2,'0');
    get('home-block-time').textContent=bestTime===null?'—':minutes+':'+seconds+'.'+tenths%10;
    get('home-block-wins').textContent=Number(wins).toLocaleString('ko-KR')+'회';
  }
}
window.moonlightArcade=Object.freeze({
  register(id,game){miniGames[id]=game;},
  refreshHomeRecords,
  showRabbitRecords(bests,perfectRescues){
    get('difficultyRecords').querySelectorAll('b').forEach((value,i)=>{
      value.textContent=bests[i];
      value.title=value.textContent;
    });
    const marks=get('perfectRecords');
    marks.textContent=Array.from({length:5},(_,id)=>perfectRescues.has(id)?'✦':'◇').join('');
    const areas=Array.from(perfectRescues).sort().map(id=>(id+1)+'구역');
    marks.setAttribute('aria-label',areas.length?'완벽 구출 '+areas.join(', '):'완벽 구출 기록 없음');
  }
});
refreshHomeRecords();
const difficultyButtons=[...get('difficulty').querySelectorAll('[data-mode]')];
function closeDifficulty(){
  get('difficulty').hidden=true;
  get('home').inert=false;
}
let selectedCard = null;
for(const card of gameCards){
  card.onclick=()=>{
    const id=card.dataset.game;
    recordGame=id;
    try { localStorage.setItem(homeCardKey,id); } catch {}
    refreshHomeRecords();
    for(const option of gameCards)option.setAttribute('aria-pressed',String(option===card));
    const game=miniGames[id];
    if (selectedCard !== card || !game?.start) {
      selectedCard = card;
      return;
    }
    selectedCard = null;
    card.setAttribute('aria-pressed','false');
    if(id==='rabbit'&&game.unlocked?.()){
      get('home').inert=true;
      get('difficulty').hidden=false;
      difficultyButtons[0]?.focus();
    }else game.start(0);
  };
}
for(const button of difficultyButtons){
  button.onclick=()=>{
    if(!miniGames.rabbit?.unlocked?.()||get('difficulty').hidden)return;
    const mode=Number(button.dataset.mode);
    closeDifficulty();
    miniGames.rabbit.start(mode);
  };
}
get('difficultyBack').onclick=()=>{
  closeDifficulty();
  gameCards.find(card=>card.dataset.game==='rabbit')?.focus();
};
get('difficulty').addEventListener('keydown',e=>{
  if(e.key==='Escape')get('difficultyBack').onclick();
});

get('album').onclick=()=>{
  const album=get('collection');
  album.hidden=!album.hidden;
  get('album').setAttribute('aria-expanded',String(!album.hidden));
};
})();
