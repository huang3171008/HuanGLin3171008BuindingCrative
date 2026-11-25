// Standalone cloud room prototype. Bind to loopback and place behind HTTPS/WSS.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomInt,randomBytes,createHash,randomUUID,webcrypto} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {isIP} from 'node:net';
import {WebSocketServer,WebSocket} from 'ws';

const directory=resolve(process.env.GAME_DATA_DIR||'./data-cloud');mkdirSync(directory,{recursive:true});
const db=new DatabaseSync(resolve(directory,'cloud.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS world(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
INSERT OR IGNORE INTO world VALUES(1,'{"players":{},"rooms":{}}');
CREATE TABLE IF NOT EXISTS codes(code TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS operations(player TEXT NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(player,id));
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,player TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ledger(player TEXT NOT NULL,match_id TEXT NOT NULL,round INTEGER NOT NULL,mode TEXT NOT NULL,delta INTEGER NOT NULL,balance INTEGER NOT NULL,details TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(player,match_id,round));
`);
const context=vm.createContext({crypto:webcrypto});
vm.runInContext(readFileSync(new URL('../android/assets/assets/engine.js',import.meta.url),'utf8')+'\nthis.engine={mutate,sanitize};',context);
const {mutate,sanitize}=context.engine;
const sockets=new Map(),limits=new Map();
const hash=x=>createHash('sha256').update(x).digest('hex');
const load=()=>JSON.parse(db.prepare('SELECT data FROM world WHERE id=1').get().data);
const save=w=>db.prepare('UPDATE world SET data=? WHERE id=1').run(JSON.stringify(w));
const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};
const now=()=>Date.now();
function limiter(key,maximum,period){const t=now();let bucket=limits.get(key);if(!bucket||t-bucket.start>=period){if(!bucket&&limits.size>=20000)limits.delete(limits.keys().next().value);bucket={start:t,count:0};limits.set(key,bucket)}if(bucket.count>=maximum)return false;bucket.count++;return true}
function clientIp(req){const peer=req.socket.remoteAddress||'';const forwarded=req.headers['x-real-ip'];if(process.env.GAME_TRUST_LOCAL_PROXY==='1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)&&typeof forwarded==='string'&&isIP(forwarded))return forwarded;return peer||'unknown'}
setInterval(()=>{const t=now();for(const [k,v] of limits)if(t-v.start>120000)limits.delete(k)},120000).unref();
function session(player){const token=randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),player,now()+15*60*1000);return token}
function send(ws,value){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value))}
function snapshot(world,id){const s=sanitize(world,id);if(!s.room)return s;const r=world.rooms[s.room.code];s.room.matchId=r.matchId;s.room.score=r.score||[0,0];s.room.lobbyReady=r.players.map(p=>!!r.lobbyReady?.[p.id]);s.room.replayReady=r.players.map(p=>!!r.replayReady?.[p.id]);s.room.online=r.players.map(p=>sockets.has(p.id));s.room.host=r.players[0]?.id===id;return s}
function broadcast(world,ids){for(const id of new Set(ids)){const ws=sockets.get(id);if(ws&&world.players[id])send(ws,{type:'state',state:snapshot(world,id)})}}
function roomPlayers(w,id){const r=w.rooms[w.players[id]?.room];return r?r.players.map(p=>p.id):[id]}
function pruneCodes(w){const keep=new Set(Object.keys(w.rooms));for(const row of db.prepare('SELECT code FROM codes').all())if(!keep.has(row.code))db.prepare('DELETE FROM codes WHERE code=?').run(row.code)}
function newCode(){for(let i=0;i<100;i++){const code=String(randomInt(1000000)).padStart(6,'0');try{db.prepare('INSERT INTO codes(code) VALUES(?)').run(code);return code}catch(e){if(!String(e.message).includes('UNIQUE'))throw e}}throw Error('房间较多，请稍后重试')}
function operate(id,msg){
 if(!/^[a-f0-9-]{36}$/i.test(msg.id||''))throw Error('请求编号无效');
 if(!msg.data||typeof msg.data!=='object'||Array.isArray(msg.data))throw Error('请求格式错误');
 const action=msg.action,data=msg.data,allowed=['state','character','create','join','leave','ready','start','move','guess','replay','daily'];if(!allowed.includes(action))throw Error('无效操作');
 const digest=hash(JSON.stringify({action,data}));
 return transaction(()=>{
  const previous=db.prepare('SELECT hash FROM operations WHERE player=? AND id=?').get(id,msg.id);
  if(previous){if(previous.hash!==digest)throw Error('请求编号重复');return {world:load(),duplicate:true,affected:[id]}}
  const w=load();mutate(w,id,{action:'state'},now());pruneCodes(w);const before=roomPlayers(w,id);let room=w.rooms[w.players[id].room];
  if(['ready','start','replay','move','guess'].includes(action)&&(!room||data.matchId!==room.matchId))throw Error('对局已变化，请重新选择');
  if(['move','guess'].includes(action)&&(!Number.isInteger(data.round)||data.round!==room.round))throw Error('回合已变化，请重新选择');
  if(action==='daily'){
   const player=w.players[id],stamp=now();if(player.room)throw Error('请先离开房间再领取');if(player.lastDaily&&stamp-player.lastDaily<86400000)throw Error('距离上次领取未满 24 小时');if(player.wallet>1e12-100)throw Error('金币余额已达上限');player.wallet+=100;player.lastDaily=stamp;db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?)').run(id,'daily:'+randomUUID(),0,'daily',100,player.wallet,JSON.stringify([{label:'每日领取',delta:100}]),stamp);
  }else if(action==='create'){
   mutate(w,id,{action,mode:data.mode},now());const old=w.players[id].room;room=w.rooms[old];const code=newCode();delete w.rooms[old];room.code=code;room.roomId=randomUUID();room.public=data.public===true;room.matchId=randomUUID();room.lobbyReady={};room.replayReady={};room.score=[0,0];w.rooms[code]=room;w.players[id].room=code;
  }else if(action==='join'){
   if(typeof data.code!=='string'||!/^\d{6}$/.test(data.code))throw Error('房间码应为6位数字');
   mutate(w,id,{action,code:data.code},now());room=w.rooms[data.code];room.phase='ready';room.lobbyReady={};
  }else if(action==='ready'){
   if(!room||room.phase!=='ready'||room.players.length!==2)throw Error('房间尚未准备');room.lobbyReady[id]=data.ready===true;room.updated=now();
  }else if(action==='start'){
   if(!room||room.phase!=='ready'||room.players[0].id!==id||room.players.length!==2||!room.players.every(p=>room.lobbyReady[p.id]))throw Error('请等待双方准备，再由房主开始');room.phase='move';room.updated=now();
  }else if(action==='replay'){
   if(!room||room.phase!=='finished')throw Error('当前对局尚未结束');room.replayReady[id]=true;room.updated=now();
   if(room.players.every(p=>room.replayReady[p.id])){room.matchId=randomUUID();room.round=1;room.phase='ready';room.last=null;room.lobbyReady={};room.replayReady={};for(const p of room.players){p.net=0;p.high=0;p.move=null;p.guess=null;p.stake=null;p.tier=null}}
  }else if(action==='move'||action==='guess'){
   const oldLast=room.last,balances=room.players.map(p=>w.players[p.id].wallet);mutate(w,id,{action,round:data.round,move:data.move,stake:data.stake,tier:data.tier,guess:data.guess},now());
   if(room.last!==oldLast&&room.last){if(room.last.outcome===1)room.score[0]++;if(room.last.outcome===-1)room.score[1]++;for(let i=0;i<2;i++){const p=room.players[i],last=room.last,after=w.players[p.id].wallet;const details=room.mode==='normal'?[{label:'入场费',delta:-last.fees[i]},{label:'手势',delta:last.changes[i]+last.fees[i]},...(last.final?[{label:'最终结算',delta:last.final.bonus[i]}]:[])]:[{label:'手势',delta:last.handChanges[i]},{label:'竞猜',delta:last.guessChanges[i]}];if(!Number.isSafeInteger(after)||after<0||after>1e12)throw Error('金币余额超出允许范围');db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?)').run(p.id,room.matchId,last.round,room.mode,after-balances[i],after,JSON.stringify(details),now())}}
  }else if(action!=='state')mutate(w,id,{action,character:data.character},now());
  for(const pid of new Set([...before,...roomPlayers(w,id)])){const p=w.players[pid];if(p&&(!Number.isSafeInteger(p.wallet)||p.wallet<0||p.wallet>1e12))throw Error('金币余额超出允许范围');}
  if(room&&room.players.some(p=>!Number.isSafeInteger(p.net)||Math.abs(p.net)>1e12))throw Error('对局金币超出允许范围');
  if(room?.score?.some(n=>!Number.isSafeInteger(n)||n<0||n>1000000000))throw Error('胜场超出允许范围');
  pruneCodes(w);save(w);db.prepare('INSERT INTO operations VALUES(?,?,?,?)').run(id,msg.id,digest,now());
  db.prepare('DELETE FROM operations WHERE created<?').run(now()-48*3600*1000);
  return {world:w,duplicate:false,affected:[...before,...roomPlayers(w,id),id]};
 });
}
const server=http.createServer((req,res)=>{if(req.url==='/healthz'&&req.method==='GET'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{"ok":true}');return}res.writeHead(404).end()});
const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{const origin=req.headers.origin||'';const host=req.headers.host||'';const extra=(process.env.GAME_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);const allowed=!origin||origin==='guessgame://game'||origin==='https://appassets.androidplatform.net'||/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)||origin===`https://${host}`||extra.includes(origin);if(req.url!=='/ws'||!allowed||wss.clients.size>=500||!limiter('ip:'+clientIp(req),40,60000)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req))});
wss.on('connection',(ws,req)=>{let id=null,alive=true;const remote=clientIp(req);const deadline=setTimeout(()=>{if(!id)ws.close(1008,'认证超时')},10000);
 ws.on('pong',()=>alive=true);const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return}alive=false;ws.ping()},30000);
 ws.on('message',raw=>{let msg;try{if(!limiter('message-ip:'+remote,300,10000)){ws.close(1008,'请求过于频繁');return}msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object')throw Error('请求格式错误');
  if(!id){if(msg.type!=='auth')throw Error('请先认证');if(msg.protocol!==2)throw Error('版本不兼容，请更新应用后使用6位房间码');if(!limiter('auth:'+remote,50,60000))throw Error('请求过于频繁');let player;
   if(typeof msg.resume==='string'&&/^[A-Za-z0-9_-]{43}$/.test(msg.resume)){const row=db.prepare('SELECT player,expires FROM sessions WHERE hash=?').get(hash(msg.resume));if(row&&row.expires>now())player=row.player}
   if(!player&&typeof msg.credential==='string'&&/^[a-f0-9]{64}$/.test(msg.credential))player=hash(msg.credential);
   if(!player)throw Error(msg.resume?'恢复凭证已失效，请重新认证':'身份凭证无效');
   transaction(()=>{const w=load();if(!w.players[player]&&Object.keys(w.players).length>=10000)throw Error('服务器玩家数已达上限');mutate(w,player,{action:'state'},now());save(w);db.prepare('DELETE FROM sessions WHERE player=? OR expires<?').run(player,now())});id=player;clearTimeout(deadline);
   const old=sockets.get(id);sockets.set(id,ws);if(old&&old!==ws)old.close(4001,'连接已更新');send(ws,{type:'authenticated',resume:session(id),protocol:2});const w=load();broadcast(w,roomPlayers(w,id));return;
  }
  if(sockets.get(id)!==ws)throw Error('连接已更新');if(!limiter('player:'+id,100,10000))throw Error('操作过于频繁，请稍后再试');if(msg.type!=='action')throw Error('无效请求');
  if(msg.action==='emote'){const text=msg.data?.text,valid=['稳了','别出石头','快点呀','平局吧','好厉害','再来一局'];if(!valid.includes(text))throw Error('表情无效');if(!limiter('emote:'+id,8,10000))throw Error('表情发送过快');const w=load(),room=w.rooms[w.players[id]?.room];if(!room||room.players.length!==2)throw Error('需要先进入双人房间');for(const p of room.players)if(p.id!==id){const other=sockets.get(p.id);if(other)send(other,{type:'emote',text})}return}
  if(msg.action==='history'){const entries=db.prepare('SELECT round,mode,delta,balance,details,created FROM ledger WHERE player=? ORDER BY created DESC,rowid DESC LIMIT 100').all(id).map(x=>({...x,details:JSON.parse(x.details)}));send(ws,{type:'history',entries});return}
  if(msg.action==='list'){if(!limiter('list:'+id,12,60000))throw Error('查询过于频繁，请稍后再试');const rooms=Object.values(load().rooms).filter(r=>r.public===true&&r.phase==='waiting'&&r.players.length===1&&now()-r.updated<86400000).slice(0,20).map(r=>({code:r.code,mode:r.mode}));send(ws,{type:'rooms',rooms});return}
  if(msg.action==='join'&&(!limiter('join:'+id,12,60000)||!limiter('join-ip:'+remote,60,60000)))throw Error('查询过于频繁，请稍后再试');
  const result=operate(id,msg);send(ws,{type:'ack',id:msg.id,duplicate:result.duplicate});broadcast(result.world,result.affected);
  const room=result.world.rooms[result.world.players[id]?.room];if(room&&['create','join','start','move','guess'].includes(msg.action)&&!result.duplicate)console.log(JSON.stringify({event:msg.action,roomId:room.roomId,round:room.round,phase:room.phase}));
 }catch(e){send(ws,{type:'error',id:typeof msg?.id==='string'?msg.id:null,message:e.message||'操作失败'})}});
 ws.on('close',()=>{clearTimeout(deadline);clearInterval(heartbeat);if(id&&sockets.get(id)===ws){sockets.delete(id);const w=load();if(w.players[id])broadcast(w,roomPlayers(w,id))}});
 ws.on('error',()=>{});
});
const port=Number(process.env.PORT||3100),host=process.env.HOST||'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw Error('无效端口');
server.listen(port,host,()=>console.log(`房间服务监听 ${host}:${port}；公网必须通过 HTTPS/WSS 反向代理`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{wss.close();server.close(()=>{db.close();process.exit(0)});for(const ws of wss.clients)ws.terminate()});
