/* Offline practice runs the same rules as peer play, with a separate wallet.
   The bot plans from revealed history before either side's next submission. */
window.AIPractice=(()=>{
 const KEY='practice_wallet_v1', HISTORY='practice_history_v1';
 const hands=['rock','scissors','paper'], defeats={rock:'paper',scissors:'rock',paper:'scissors'};
 let world=null,timer=null,history=[],plan=null,epoch=0;
 const ai={active:false,thinking:false,difficulty:'easy'};
 const rand=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
 const pick=a=>a[Math.floor(rand()*a.length)];
 function wallet(){const n=Number(localStorage.getItem(KEY));return localStorage.getItem(KEY)!==null&&Number.isSafeInteger(n)&&n>=0?n:5000}
 function publish(){const s=sanitize(world,'human');localStorage.setItem(KEY,String(s.wallet));acceptState(s)}
 function historyMove(){
  if(ai.difficulty==='easy')return rand()<.4?'rock':pick(hands);
  const weights={rock:1,scissors:1,paper:1};
  for(const h of history.slice(-8))weights[h]++;
  if(ai.difficulty==='hard'&&history.length>1){const last=history.at(-1);for(let i=1;i<history.length;i++)if(history[i-1]===last)weights[history[i]]+=3}
  if(rand()<(ai.difficulty==='hard'?.25:.45))return pick(hands);
  const total=Object.values(weights).reduce((a,b)=>a+b,0);let n=rand()*total;
  for(const h of hands){n-=weights[h];if(n<0)return defeats[h]}return pick(hands);
 }
 function makePlan(){
  const s=sanitize(world,'bot'),r=s.room,bot=r.players.find(p=>p.isMe),human=r.players.find(p=>!p.isMe);
  let tier=10,stake=10;
  if(r.mode==='normal'){
   if(ai.difficulty!=='easy'&&r.round>3&&rand()<.45)tier=20;
   if(ai.difficulty==='hard'&&bot.high<2&&r.round>5&&bot.net<human.net&&rand()<.55)tier=30;
   let max=Math.floor((s.wallet-tier-(10-r.round)*10)/(tier/10));
   if(max<1){tier=10;max=Math.floor((s.wallet-tier-(10-r.round)*10)/(tier/10))}
   stake=Math.max(1,Math.min(max,ai.difficulty==='easy'?10:ai.difficulty==='normal'?20:Math.max(10,Math.min(80,Math.floor((human.net-bot.net)/4)+25))));
  }else{const choices=[10,20,50,100].filter(x=>x*3<=s.wallet);stake=ai.difficulty==='easy'?choices[0]:pick(choices)}
  return {move:historyMove(),tier,stake,guess:r.mode==='guessMove'?pick(hands):pick(['win','lose'])};
 }
 function schedule(){
  const r=sanitize(world,'human').room;if(!r||r.phase==='finished'||timer)return;
  const me=r.players.find(p=>p.isMe),other=r.players.find(p=>!p.isMe);
  if(r.phase==='move'&&!other.ready){plan=makePlan();ai.thinking=true;const current=++epoch;render();timer=setTimeout(()=>{timer=null;if(!ai.active||current!==epoch)return;try{mutate(world,'bot',{action:'move',...plan,round:r.round},Date.now());ai.thinking=false;afterChange()}catch(e){ai.thinking=false;note('陪练无法继续：'+e.message)}},500+Math.floor(rand()*701))}
  else if(r.phase==='guess'&&!other.guessed){ai.thinking=true;const current=++epoch;render();timer=setTimeout(()=>{timer=null;if(!ai.active||current!==epoch)return;try{mutate(world,'bot',{action:'guess',guess:plan.guess,round:r.round},Date.now());ai.thinking=false;afterChange()}catch(e){ai.thinking=false;note('陪练无法继续：'+e.message)}},500+Math.floor(rand()*701))}
 }
 let lastKey='';
 function afterChange(){const r=sanitize(world,'human').room;if(r?.last){const k=r.code+':'+r.last.round;if(k!==lastKey){lastKey=k;history.push(r.last.moves[0])}}publish();schedule()}
 ai.start=function(difficulty){if(peer.ready||cloud.active){note('请先断开当前联机，再开始陪练');return}ai.difficulty=difficulty;ai.active=true;ai.thinking=false;history=[];lastKey='';world={players:{},rooms:{}};mutate(world,'human',{action:'state'},Date.now());world.players.human.wallet=wallet();world.players.human.character=Number(localStorage.getItem('direct_character_v1'))||0;mutate(world,'bot',{action:'state'},Date.now());world.players.bot.character={easy:1,normal:0,hard:7}[difficulty]??1;peer.ready=true;peer.role='host';signature='';showGame();publish();closeModal();note('已进入离线陪练，金币与联机钱包分开')};
 ai.stop=function(){++epoch;clearTimeout(timer);timer=null;ai.active=false;ai.thinking=false;world=null;peer.ready=false;peer.role=null;state=null;signature='';document.getElementById('gameArea').hidden=true;document.getElementById('directInfo').hidden=true;document.getElementById('connectionArea').hidden=false;connectionMenu();p2pApi('state',{},true)};
 ai.action=async function(action,data={},silent=false){try{if(action==='create'){history=[];lastKey='';mutate(world,'human',{action,...data},Date.now());mutate(world,'bot',{action:'join',code:world.players.human.room},Date.now());afterChange();return}if(action==='leave'){++epoch;clearTimeout(timer);timer=null;ai.thinking=false;plan=null}mutate(world,'human',{action,...data,...(['move','guess'].includes(action)?{round:state.room.round}:{})},Date.now());afterChange();if(!silent)note('')}catch(e){if(!silent)note(e.message)}};
 ai.reset=function(){if(ai.active&&state?.room){note('请先离开当前对局');return}localStorage.setItem(KEY,'5000');localStorage.removeItem(HISTORY);if(ai.active){world.players.human.wallet=5000;publish()}note('陪练钱包已重置为 5000 金币')};
 ai.wallet=wallet;return ai;
})();
