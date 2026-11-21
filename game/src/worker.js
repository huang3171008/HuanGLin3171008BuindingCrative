const HTML = __HTML__;
const ASSETS = __ASSETS__;
const MOVE = ['rock','scissors','paper'];
const NAMES = ['小狐狸','小熊','小兔子','小熊猫'];
const wins = (a,b) => a === b ? 0 : ({rock:'scissors',scissors:'paper',paper:'rock'}[a] === b ? 1 : -1);
const err = message => { throw new Error(message); };
const integer = n => Number.isSafeInteger(n);
const copy = value => JSON.parse(JSON.stringify(value));
function clean(world, now) {
  for (const [code, room] of Object.entries(world.rooms)) if (now - room.updated > 86400000) { for (const p of room.players) if (world.players[p.id]?.room === code) world.players[p.id].room = null; delete world.rooms[code]; }
  for (const [id, p] of Object.entries(world.players)) if (!p.room && now - p.seen > 90*86400000) delete world.players[id];
}
function sanitize(world,id) {
  const me=world.players[id], r=me.room && world.rooms[me.room];
  if (!r) return {wallet:me.wallet,character:me.character,room:null};
  const i=r.players.findIndex(p=>p.id===id), other=r.players[1-i];
  return {wallet:me.wallet,character:me.character,room:{code:r.code,mode:r.mode,round:r.round,phase:r.phase,players:r.players.map((p,j)=>({character:p.character,net:p.net,high:p.high,ready:!!p.move,guessed:!!p.guess,isMe:j===i,...(j===i?{move:p.move,stake:p.stake,tier:p.tier,guess:p.guess}: {})})),last:r.last,hasOpponent:!!other}};
}
function finishNormal(world,r){
 const [a,b]=r.players; let bonus=[0,0];
 if(a.net>=0&&b.net>=0&&a.net!==b.net){let wi=a.net>b.net?0:1,li=1-wi;let value=Math.min(Math.floor(r.players[li].net/2),world.players[r.players[li].id].wallet);bonus[wi]=value;bonus[li]=-value;}
 else if(a.net>=0&&b.net<0)bonus[0]=a.net;
 else if(b.net>=0&&a.net<0)bonus[1]=b.net;
 for(let i=0;i<2;i++)world.players[r.players[i].id].wallet+=bonus[i];
 r.last.final={nets:[a.net,b.net],bonus};r.phase='finished';
}
function settleNormal(world,r){
 const [a,b]=r.players, outcome=wins(a.move,b.move);let changes=[];
 for(let i=0;i<2;i++){let p=r.players[i],delta= -p.tier + (i===0?outcome:-outcome)*p.stake*(p.tier/10);world.players[p.id].wallet+=delta;p.net+=delta;changes.push(delta);}
 r.last={round:r.round,moves:[a.move,b.move],outcome,changes};
 for(const p of r.players){p.move=null;p.tier=null;p.stake=null;}
 if(r.round===10)finishNormal(world,r);else r.round++;
}
function settleBet(world,r){
 const [a,b]=r.players, outcome=wins(a.move,b.move),changes=outcome===0?[0,0]:[outcome*2*a.stake,-outcome*2*b.stake];
 let correct;
 if(r.mode==='guessMove')correct=[a.guess===b.move,b.guess===a.move];
 else correct=outcome===0?null:[a.guess===(outcome===1?'win':'lose'),b.guess===(outcome===-1?'win':'lose')];
 if(correct){if(correct[0]!==correct[1]){const win=correct[0]?0:1,lose=1-win;changes[win]+=r.players[lose].stake;changes[lose]-=r.players[lose].stake;}else{changes[0]-=a.stake;changes[1]-=b.stake;}}
 for(let i=0;i<2;i++){world.players[r.players[i].id].wallet+=changes[i];r.players[i].net+=changes[i];}
 r.last={round:1,moves:[a.move,b.move],outcome,guesses:[a.guess,b.guess],correct,stakes:[a.stake,b.stake],changes};r.phase='finished';
}
function mutate(world,id,body,now){
 clean(world,now);let me=world.players[id];if(!me)me=world.players[id]={wallet:5000,character:0,room:null,seen:now};me.seen=now;
 const action=body.action||'state';
 if(action==='state')return;
 if(action==='character'){if(!integer(body.character)||body.character<0||body.character>=NAMES.length)err('请选择有效角色');if(me.room)err('请先离开房间再更换角色');me.character=body.character;return;}
 if(action==='leave'){const r=world.rooms[me.room];if(r){for(const p of r.players)if(world.players[p.id])world.players[p.id].room=null;delete world.rooms[me.room];}me.room=null;return;}
 if(action==='create'){
  if(me.room)err('请先离开当前房间');if(!['normal','guessMove','guessOutcome'].includes(body.mode))err('请选择游戏模式');if(body.mode==='normal'&&me.wallet<100)err('普通模式需要至少 100 金币，才能支付 10 回合的最低入场费');if(body.mode!=='normal'&&me.wallet<30)err('竞猜模式至少需要 30 金币');
  let code;do{code=Array.from(crypto.getRandomValues(new Uint8Array(6)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('')}while(world.rooms[code]);
  world.rooms[code]={code,mode:body.mode,round:1,phase:'waiting',players:[{id,character:me.character,net:0,high:0,move:null,guess:null}],last:null,updated:now};me.room=code;return;
 }
 if(action==='join'){
  if(me.room)err('请先离开当前房间');const code=String(body.code||'').trim().toUpperCase(),r=world.rooms[code];if(!r)err('没有找到这个房间，请检查房间码');if(r.players.length!==1||r.phase!=='waiting')err('房间已满或对局已开始');if(r.players[0].id===id)err('不能加入自己的房间');if(r.mode==='normal'&&me.wallet<100)err('普通模式需要至少 100 金币');if(r.mode!=='normal'&&me.wallet<30)err('竞猜模式至少需要 30 金币');r.players.push({id,character:me.character,net:0,high:0,move:null,guess:null});me.room=code;r.phase='move';r.updated=now;return;
 }
 const r=world.rooms[me.room];if(!r||r.players.length!==2)err('请等待另一位玩家加入');const p=r.players.find(x=>x.id===id);if(!p)err('你不在这个房间中');
 if(action==='move'){
  if(r.phase!=='move'||p.move)err('本回合已经出拳');if(!MOVE.includes(body.move))err('请选择手势');const stake=Number(body.stake);if(!integer(stake)||stake<1)err('请输入有效投入金币');
  if(r.mode==='normal'){const tier=Number(body.tier);if(![10,20,30].includes(tier))err('请选择入场费');if(tier===30&&p.high>=2)err('30 金币场次每把最多选择两次');const remaining=10-r.round;const max=Math.floor((me.wallet-tier-remaining*10)/(tier/10));if(stake>max)err('投入过高，请保留后续回合的最低入场费');p.tier=tier;if(tier===30)p.high++;}
  else {if(![10,20,50,100].includes(stake))err('请选择竞猜投入');if(me.wallet<stake*3)err('金币不足，需至少准备投入额的 3 倍');}
  p.stake=stake;p.move=body.move;r.updated=now;
  if(r.players.every(x=>x.move)){if(r.mode==='normal')settleNormal(world,r);else r.phase='guess';}return;
 }
 if(action==='guess'){
  if(r.phase!=='guess'||p.guess)err('现在不能竞猜');const choices=r.mode==='guessMove'?MOVE:['win','lose'];if(!choices.includes(body.guess))err('请选择竞猜结果');p.guess=body.guess;r.updated=now;if(r.players.every(x=>x.guess))settleBet(world,r);return;
 }
 err('无效操作');
}
async function hash(token){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
async function api(request,env){
 if(!env.DB)return Response.json({error:'游戏数据库尚未连接'},{status:503});let body;try{body=await request.json()}catch{return Response.json({error:'请求格式错误'},{status:400})}
 const token=request.headers.get('x-player-token')||'';if(!/^[a-f0-9-]{72,80}$/.test(token))return Response.json({error:'玩家凭证无效'},{status:401});const id=await hash(token);
 for(let attempt=0;attempt<8;attempt++){
  const row=await env.DB.prepare('SELECT version, data FROM game_world WHERE id = 1').first();if(!row)return Response.json({error:'游戏数据库尚未初始化'},{status:503});let world=JSON.parse(row.data);
  if(body.action==='inspect')return world.players[id]?Response.json({exists:true,wallet:world.players[id].wallet},{headers:{'Cache-Control':'no-store'}}):Response.json({error:'没有找到对应的钱包，请检查迁移码'},{status:404});
  if(body.action==='state' && world.players[id] && (!world.players[id].room || (world.rooms[world.players[id].room] && Date.now()-world.rooms[world.players[id].room].updated < 86400000))) return Response.json(sanitize(world,id),{headers:{'Cache-Control':'no-store'}});
  try{mutate(world,id,body,Date.now());}catch(e){return Response.json({error:e.message},{status:400});}
  const result=await env.DB.prepare('UPDATE game_world SET data = ?, version = version + 1 WHERE id = 1 AND version = ?').bind(JSON.stringify(world),row.version).run();
  if(result.meta.changes===1)return Response.json(sanitize(world,id),{headers:{'Cache-Control':'no-store'}});
 }
 return Response.json({error:'操作繁忙，请重试'},{status:409});
}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api'&&request.method==='POST'){try{return await api(request,env)}catch(e){console.error('api error',e);return Response.json({error:'服务暂时不可用，请稍后重试'},{status:500})}}const asset=url.pathname.match(/^\/assets\/(1F98A|1F43B|1F430|1F43C)\.svg$/);if(asset)return new Response(ASSETS[asset[1]],{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});if(url.pathname==='/')return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});return new Response('Not found',{status:404});}};
export {mutate,sanitize,wins};


