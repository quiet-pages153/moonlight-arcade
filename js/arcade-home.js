(() => {
const get=id=>document.getElementById(id);
const miniGames={};
window.moonlightArcade=Object.freeze({
  register(id,game){miniGames[id]=game;}
});
const gameCards=[...document.querySelectorAll('[data-game]')];
const difficultyButtons=[...get('difficulty').querySelectorAll('[data-mode]')];
function closeDifficulty(){
  get('difficulty').hidden=true;
  get('home').inert=false;
}
let selectedCard = null;
for(const card of gameCards){
  card.onclick=()=>{
    const id=card.dataset.game;
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
