/* Offline practice runs the same rules as peer play, with a separate wallet.
   The bot plans from revealed history and its own sanitized hand before submission. */
window.AIPractice=(()=>{
 const KEY='practice_wallet_v1', HISTORY='practice_history_v1';
 const hands=['rock','scissors','paper'], defeats={rock:'paper',scissors:'rock',paper:'scissors'};
 let world=null,timer=null,history=[],plan=null,epoch=0,rematching=false;
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
 function chooseSkillCard(bot,human,r){
  const penalty=bot.sealCost>0?1:0;
  const playable=bot.hand.filter(id=>(SKILL_MAP[id]?.cost||99)+penalty<=bot.energy&&(id!=='16_phantom_swap'||bot.hand.length>=2));
  if(!playable.length)return null;
  if(ai.difficulty==='easy')return rand()<.5?null:pick(playable);
  const scoreCard=id=>{
   let v=10;const needHeal=120-bot.hp,danger=human.streak>=2||bot.hp<=38,late=r.round>=8;
   if(id==='01_flame_punch')v=26+(human.hp<=44?14:0);
   else if(id==='02_twin_strike')v=24+(bot.streak===0?8:0);
   else if(id==='03_meteor_break')v=34+(human.hp<=46?20:0);
   else if(id==='04_gale_ambush')v=20+(human.hp<=30?10:0);
   else if(id==='05_holy_barrier')v=16+(danger?16:0);
   else if(id==='06_mirror_reflect')v=20+(danger?15:0);
   else if(id==='07_brace_charge')v=bot.energy<=2&&bot.hand.length<=3?24:10;
   else if(id==='08_iron_counter')v=20+(bot.energy<=3&&r.round<10?8:0)+(danger?8:0);
   else if(id==='09_vitality_nectar')v=needHeal>=24?30:needHeal>=12?16:2;
   else if(id==='10_heal_talisman')v=needHeal>=12?23:14;
   else if(id==='11_nimble_draw')v=bot.hand.length<=2?28:18;
   else if(id==='12_energy_siphon')v=(needHeal>=10?25:15)+(bot.energy<=3?7:0);
   else if(id==='13_venom_dart')v=human.poison===0&&r.round<=8?27:(human.poison===1&&r.round<=8?14:4);
   else if(id==='14_fate_seal')v=r.round<10?25:12;
   else if(id==='15_tip_scales')v=22+(danger?18:0);
   else if(id==='16_phantom_swap')v=bot.hand.length<=2?22:15;
   if(penalty>0)v-=6;
   return v+rand()*(ai.difficulty==='hard'?5:12);
  };
  if(ai.difficulty==='normal'&&rand()<.28&&bot.energy<5&&r.round<9)return null;
  const ranked=playable.map(id=>({id,s:scoreCard(id)})).sort((a,b)=>b.s-a.s);
  if(ai.difficulty==='hard'&&ranked[0].s<15&&bot.energy<4&&r.round<9)return null;
  return ranked[0].id;
 }
 function makePlan(){
  const s=sanitize(world,'bot'),r=s.room,bot=r.players.find(p=>p.isMe),human=r.players.find(p=>!p.isMe);
  if(r.variant==='skill')return {move:historyMove(),card:chooseSkillCard(bot,human,r)};
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
  const other=r.players.find(p=>!p.isMe);
  if(r.phase==='move'&&!other.ready){plan=makePlan();ai.thinking=true;const current=++epoch;render();timer=setTimeout(()=>{timer=null;if(!ai.active||current!==epoch)return;try{mutate(world,'bot',{action:'move',...plan,round:r.round},Date.now());ai.thinking=false;afterChange()}catch(e){ai.thinking=false;note('陪练无法继续：'+e.message)}},500+Math.floor(rand()*701))}
  else if(r.phase==='guess'&&!other.guessed){ai.thinking=true;const current=++epoch;render();timer=setTimeout(()=>{timer=null;if(!ai.active||current!==epoch)return;try{mutate(world,'bot',{action:'guess',guess:plan.guess,round:r.round},Date.now());ai.thinking=false;afterChange()}catch(e){ai.thinking=false;note('陪练无法继续：'+e.message)}},500+Math.floor(rand()*701))}
 }
 let lastKey='';
 function afterChange(){const r=sanitize(world,'human').room;if(r?.last){const k=r.code+':'+r.last.round;if(k!==lastKey){lastKey=k;history.push(r.last.moves[0])}}publish();schedule()}
 ai.start=function(difficulty){if(peer.ready||cloud.active){note('请先断开当前联机，再开始陪练');return}ai.difficulty=difficulty;ai.active=true;ai.thinking=false;history=[];lastKey='';world={players:{},rooms:{}};mutate(world,'human',{action:'state'},Date.now());world.players.human.wallet=wallet();world.players.human.character=Number(localStorage.getItem('direct_character_v1'))||0;mutate(world,'bot',{action:'state'},Date.now());world.players.bot.character={easy:1,normal:0,hard:7}[difficulty]??1;peer.ready=true;peer.role='host';signature='';showGame();publish();closeModal();note('已进入离线陪练，金币与联机钱包分开')};
 ai.stop=function(){++epoch;clearTimeout(timer);timer=null;ai.active=false;ai.thinking=false;world=null;peer.ready=false;peer.role=null;state=null;signature='';document.getElementById('gameArea').hidden=true;document.getElementById('directInfo').hidden=true;document.getElementById('connectionArea').hidden=false;connectionMenu();p2pApi('state',{},true)};
 ai.action=async function(action,data={},silent=false){try{if(action==='create'){history=[];lastKey='';mutate(world,'human',{action,...data},Date.now());try{world.players.bot.wallet=5000;mutate(world,'bot',{action:'join',code:world.players.human.room},Date.now())}catch(e){mutate(world,'human',{action:'leave'},Date.now());throw e}afterChange();return true}if(action==='leave'){++epoch;clearTimeout(timer);timer=null;ai.thinking=false;plan=null}mutate(world,'human',{action,...data,...(['move','guess'].includes(action)?{round:state.room.round}:{})},Date.now());afterChange();if(!silent)note('');return true}catch(e){if(!silent)note(e.message);return false}};
 ai.reset=function(){if(ai.active&&state?.room){note('请先离开当前对局');return}localStorage.setItem(KEY,'5000');localStorage.removeItem(HISTORY);if(ai.active){world.players.human.wallet=5000;publish()}note('陪练钱包已重置为 5000 金币')};

 const EMOTE_REPLIES={
  easy:['嘿嘿，继续！','好厉害呀','平局吧','我再想想…','再来一局'],
  normal:['稳了','别出石头','猜猜我出啥','好厉害','再来一局'],
  hard:['看穿你了','稳了','别出石头','这把必胜','再来一局']
 };
 ai.rematch=async function(){if(rematching||!ai.active||state?.room?.phase!=='finished')return;const currentMode=state.room.mode,currentVariant=state.room.variant||'classic';if(currentVariant!=='skill'&&state.wallet<(currentMode==='normal'?100:30)){note('练习金币不足，请返回大厅后重置练习钱包');return}rematching=true;try{const leaving=ai.action('leave'),expected=epoch;if(!await leaving)return;if(ai.active&&epoch===expected&&!state?.room)await ai.action('create',{mode:currentMode,variant:currentVariant})}finally{rematching=false}};
 ai.replyEmote=function(playerText){if(!ai.active||!state?.room?.hasOpponent)return;const roomCode=state.room.code,pool=EMOTE_REPLIES[ai.difficulty]||EMOTE_REPLIES.easy;const reply=playerText==='快点呀'?'马上就好！':pick(pool);setTimeout(()=>{if(ai.active&&state?.room?.code===roomCode&&typeof window.receivePracticeEmote==='function')window.receivePracticeEmote(reply)},650+Math.floor(rand()*550))};
 ai.wallet=wallet;return ai;
})();
