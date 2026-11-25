import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
const dir=mkdtempSync(join(tmpdir(),'guess-cloud-test-')),port=39187;
let child;
async function start(){child=spawn(process.execPath,['cloud-server.mjs'],{env:{...process.env,PORT:String(port),GAME_DATA_DIR:dir},stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('服务启动超时')),8000);child.stdout.on('data',d=>{if(String(d).includes('房间服务监听')){clearTimeout(timer);resolve()}});child.on('exit',code=>{clearTimeout(timer);reject(Error('服务退出 '+code))})})}
async function stop(){if(!child||child.exitCode!==null)return;await new Promise(r=>{child.once('exit',r);child.kill()});child=null}
function waitFor(fn,label){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{const result=fn();if(result){clearInterval(timer);resolve(result)}else if(Date.now()-started>5000){clearInterval(timer);reject(Error(label))}},10)})}
async function client(credential,resume='',rulesVersion=2){const c={credential:credential||randomBytes(32).toString('hex'),resume,events:[],state:null};c.ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);c.ws.on('message',b=>{const m=JSON.parse(b);c.events.push(m);if(m.type==='state')c.state=m.state;if(m.type==='authenticated')c.resume=m.resume});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j)});const auth={type:'auth',credential:c.credential,resume:c.resume,protocol:2};if(rulesVersion!==null)auth.rulesVersion=rulesVersion;c.ws.send(JSON.stringify(auth));await waitFor(()=>c.events.find(x=>x.type==='authenticated'),'认证失败');await waitFor(()=>c.state,'未收到状态');return c}
async function action(c,name,data={},id=randomUUID()){c.ws.send(JSON.stringify({type:'action',id,action:name,data}));const m=await waitFor(()=>c.events.find(x=>x.id===id&&(x.type==='ack'||x.type==='error')),'请求超时');c.events=c.events.filter(x=>x!==m);return m}
async function ok(c,name,data={},id){const m=await action(c,name,data,id);assert.equal(m.type,'ack',m.message);return m}
try{await start();const old=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise((r,j)=>{old.once('open',r);old.once('error',j)});old.send(JSON.stringify({type:'auth',credential:randomBytes(32).toString('hex'),protocol:1}));const oldReply=await new Promise(r=>old.once('message',b=>r(JSON.parse(b))));assert.equal(oldReply.type,'error');assert.match(oldReply.message,/版本不兼容/);old.terminate();const daily=await client();const dailyId=randomUUID();await ok(daily,'daily',{},dailyId);await waitFor(()=>daily.state.wallet===5100,'每日金币未到账');assert.equal((await action(daily,'daily',{},dailyId)).duplicate,true,'相同领取请求应幂等');assert.equal((await action(daily,'daily')).type,'error','24 小时内不能重复领取');daily.ws.terminate();let a=await client(),b=await client(),c=await client();await ok(a,'create',{mode:'normal'});await waitFor(()=>a.state.room?.code,'创建房间失败');const code=a.state.room.code;assert.match(code,/^\d{6}$/);c.ws.send(JSON.stringify({type:'action',action:'list',data:{}}));let list=await waitFor(()=>c.events.find(x=>x.type==='rooms'),'房间列表无响应');assert.ok(!list.rooms.some(r=>r.code===code),'私人房间不可出现在搜索结果');c.events=c.events.filter(x=>x!==list);const pub=await client();await ok(pub,'create',{mode:'normal',public:true});await waitFor(()=>pub.state.room?.code,'公开房间创建失败');c.ws.send(JSON.stringify({type:'action',action:'list',data:{}}));list=await waitFor(()=>c.events.find(x=>x.type==='rooms'),'公开房间搜索失败');assert.ok(list.rooms.some(r=>r.code===pub.state.room.code));pub.ws.terminate();let e=await action(c,'join',{code:'not-code'});assert.equal(e.type,'error');e=await action(c,'join',{code:'12345678'});assert.equal(e.type,'error');assert.match(e.message,/6位/);e=await action(c,'join',{code:'000000'===code?'999999':'000000'});assert.equal(e.type,'error');await ok(b,'join',{code});await waitFor(()=>a.state.room?.phase==='ready','未进入准备');a.ws.send(JSON.stringify({type:'action',action:'emote',data:{text:'稳了'}}));await waitFor(()=>b.events.find(x=>x.type==='emote'&&x.text==='稳了'),'快捷表情未同步');e=await action(c,'join',{code});assert.equal(e.type,'error');const matchId=a.state.room.matchId;await ok(a,'ready',{ready:true,matchId});await ok(b,'ready',{ready:true,matchId});await ok(a,'start',{matchId});await waitFor(()=>b.state.room?.phase==='move','未开始');const id=randomUUID();const move={round:1,matchId,move:'rock',tier:10,stake:10};await ok(a,'move',move,id);await waitFor(()=>b.state.room?.players[0]?.ready,'出拳状态未同步');assert.equal(b.state.room.players[0].move,undefined,'对手不能看到未揭晓的手势');assert.equal((await action(a,'move',move,id)).duplicate,true,'相同请求应幂等');e=await action(a,'move',{...move,round:undefined},randomUUID());assert.equal(e.type,'error');await ok(b,'move',{round:1,matchId,move:'scissors',tier:10,stake:10});await waitFor(()=>a.state.room?.round===2,'下一回合未同步');assert.equal(a.state.wallet,5000);assert.equal(b.state.wallet,4980);e=await action(a,'move',{...move,round:undefined},randomUUID());assert.equal(e.type,'error','缺少回合号不能提交到下一回合');e=await action(a,'move',move,randomUUID());assert.equal(e.type,'error','旧回合不能重复提交');const cred=b.credential,resume=b.resume;b.ws.terminate();await waitFor(()=>a.state.room?.online?.[1]===false,'离线未同步');b=await client(cred,resume);await waitFor(()=>b.state.room?.round===2,'恢复房间失败');assert.equal(b.state.wallet,4980);a.ws.terminate();b.ws.terminate();c.ws.terminate();await stop();await start();const dailyAgain=await client(daily.credential);assert.equal(dailyAgain.state.wallet,5100,'每日金币应持久化');assert.equal((await action(dailyAgain,'daily')).type,'error','重启不能重置领取间隔');dailyAgain.ws.terminate();a=await client(a.credential);assert.equal(a.state.room.round,2,'服务重启未恢复回合');assert.equal(a.state.wallet,5000);a.ws.terminate();for(const mode of ['guessMove','guessOutcome']){const x=await client(),y=await client();await ok(x,'create',{mode});await waitFor(()=>x.state.room?.code,'竞猜建房失败');const roomCode=x.state.room.code;await ok(y,'join',{code:roomCode});await waitFor(()=>x.state.room?.phase==='ready','竞猜准备失败');const m=x.state.room.matchId;await ok(x,'ready',{ready:true,matchId:m});await ok(y,'ready',{ready:true,matchId:m});await ok(x,'start',{matchId:m});await waitFor(()=>y.state.room?.phase==='move','竞猜开始失败');await ok(x,'move',{round:1,matchId:m,move:'rock',stake:10});await ok(y,'move',{round:1,matchId:m,move:'scissors',stake:20});await waitFor(()=>x.state.room?.phase==='guess','竞猜阶段失败');await ok(x,'guess',{round:1,matchId:m,guess:mode==='guessMove'?'scissors':'win'});await ok(y,'guess',{round:1,matchId:m,guess:mode==='guessMove'?'paper':'win'});await waitFor(()=>x.state.room?.phase==='finished','竞猜结算失败');assert.equal(x.state.wallet,5040);assert.equal(y.state.wallet,4940);await ok(x,'replay',{matchId:m});await ok(y,'replay',{matchId:m});await waitFor(()=>x.state.room?.phase==='ready','再来一局失败');assert.notEqual(x.state.room.matchId,m);x.ws.terminate();y.ws.terminate()}const n=await client(),o=await client();await ok(n,'create',{mode:'normal'});await waitFor(()=>n.state.room?.code,'十回合建房失败');await ok(o,'join',{code:n.state.room.code});await waitFor(()=>n.state.room?.phase==='ready','十回合准备失败');const nm=n.state.room.matchId;await ok(n,'ready',{ready:true,matchId:nm});await ok(o,'ready',{ready:true,matchId:nm});await ok(n,'start',{matchId:nm});for(let round=1;round<=10;round++){await waitFor(()=>n.state.room?.round===round&&n.state.room?.phase==='move','回合未同步');await ok(n,'move',{matchId:nm,round,move:'rock',tier:10,stake:10});await ok(o,'move',{matchId:nm,round,move:'scissors',tier:10,stake:10})}await waitFor(()=>n.state.room?.phase==='finished','十回合未完成');assert.equal(n.state.wallet,5000);assert.equal(o.state.wallet,4800);assert.deepEqual(n.state.room.score,[10,0]);n.ws.send(JSON.stringify({type:'action',action:'history',data:{}}));const history=await waitFor(()=>n.events.find(x=>x.type==='history'),'金币记录未返回');assert.equal(history.entries.length,10);assert.equal(history.entries[0].balance,5000);assert.ok(history.entries[0].details.some(x=>x.label==='入场费'&&x.delta===-10));n.ws.terminate();o.ws.terminate();
// 技能对战云房间回归：旧客户端拦截、保密、幂等、免费不写账本、断线重连、重启持久化与再来一局
const legacy=await client(undefined,'',null),sHost=await client(),sGuest=await client();
assert.equal((await action(legacy,'create',{mode:'normal',variant:'skill'})).type,'error','旧客户端不可创建技能房');
await ok(sHost,'create',{mode:'normal',variant:'skill',public:true});
await waitFor(()=>sHost.state.room?.code&&sHost.state.room?.variant==='skill','技能房创建失败');
const sCode=sHost.state.room.code;
legacy.ws.send(JSON.stringify({type:'action',action:'list',data:{}}));
const legacyList=await waitFor(()=>legacy.events.find(x=>x.type==='rooms'),'旧客户端搜索无响应');
assert.ok(!legacyList.rooms.some(r=>r.code===sCode),'旧客户端搜索列表不应暴露技能房');
const joinErr=await action(legacy,'join',{code:sCode});
assert.equal(joinErr.type,'error');assert.match(joinErr.message,/更新应用/);
legacy.ws.terminate();
await ok(sGuest,'join',{code:sCode});
await waitFor(()=>sHost.state.room?.phase==='ready'&&sGuest.state.room?.phase==='ready','技能房未进入准备阶段');
assert.deepEqual(sHost.state.room.players[0].hand,[],'准备阶段不应提前暴露起手牌');
const sm=sHost.state.room.matchId;
await ok(sHost,'ready',{ready:true,matchId:sm});await ok(sGuest,'ready',{ready:true,matchId:sm});
await ok(sHost,'start',{matchId:sm});
await waitFor(()=>sHost.state.room?.phase==='move'&&sHost.state.room.players[0].hand.length===3,'技能房开局手牌未下发');
const costMap={'03_meteor_break':3,'15_tip_scales':3};
const firstCard=sHost.state.room.players[0].hand.find(id=>id!=='16_phantom_swap'&&!costMap[id])||null;
const moveReqId=randomUUID();
await ok(sHost,'move',{matchId:sm,round:1,move:'rock',card:firstCard},moveReqId);
assert.equal((await action(sHost,'move',{matchId:sm,round:1,move:'rock',card:firstCard},moveReqId)).duplicate,true,'技能提交重复请求应幂等');
await waitFor(()=>sGuest.state.room?.players[0]?.ready===true,'技能房对手提交状态未同步');
assert.equal(sGuest.state.room.players[0].card,undefined,'对手未揭晓技能不得泄露');
assert.equal(sGuest.state.room.players[0].energy,undefined,'对手剩余能量不得泄露');
assert.equal(sGuest.state.room.players[0].hand,undefined,'对手手牌不得泄露');
await ok(sGuest,'move',{matchId:sm,round:1,move:'scissors',card:null});
await waitFor(()=>sHost.state.room?.round===2&&sGuest.state.room?.round===2,'技能房第一回合未结算');
assert.equal(sHost.state.wallet,5000,'技能房不得修改胜方钱包');
assert.equal(sGuest.state.wallet,5000,'技能房不得修改负方钱包');
assert.ok(sGuest.state.room.players[1].hp<120,'技能房落败方应扣减生命');
// 断线重连与服务重启恢复手牌/生命/回合
const gCred=sGuest.credential,gResume=sGuest.resume;
sGuest.ws.terminate();
await waitFor(()=>sHost.state.room?.online?.[1]===false,'技能房离线状态未同步');
const sGuest2=await client(gCred,gResume);
await waitFor(()=>sGuest2.state.room?.round===2&&sGuest2.state.room.players[1].hand.length>=3,'技能房断线重连未恢复手牌');
sHost.ws.terminate();sGuest2.ws.terminate();
await stop();await start();
const sHostR=await client(sHost.credential),sGuestR=await client(gCred);
assert.equal(sHostR.state.room?.round,2,'重启后未恢复技能房回合');
assert.equal(sHostR.state.room?.variant,'skill');
// 打完剩余回合验证结算与再来一局重置，且金币账本为0条
while(sHostR.state.room.phase==='move'){
 const r=sHostR.state.room.round,m=sHostR.state.room.matchId;
 await ok(sHostR,'move',{matchId:m,round:r,move:'rock',card:null});
 await ok(sGuestR,'move',{matchId:m,round:r,move:'scissors',card:null});
 await waitFor(()=>sHostR.state.room.round>r||sHostR.state.room.phase==='finished','技能房推进超时');
}
assert.equal(sHostR.state.room.phase,'finished');
assert.equal(sHostR.state.wallet,5000);assert.equal(sGuestR.state.wallet,5000);
sHostR.ws.send(JSON.stringify({type:'action',action:'history',data:{}}));
const sHist=await waitFor(()=>sHostR.events.find(x=>x.type==='history'),'技能房账本查询超时');
assert.equal(sHist.entries.length,0,'免费技能模式不得写入金币账本');
const finishedMatch=sHostR.state.room.matchId;
await ok(sHostR,'replay',{matchId:finishedMatch});await ok(sGuestR,'replay',{matchId:finishedMatch});
await waitFor(()=>sHostR.state.room.phase==='ready'&&sHostR.state.room.players[0].hp===120,'技能房再来一局未重置生命');
sHostR.ws.terminate();sGuestR.ws.terminate();
console.log('通过：真实 WebSocket 服务、本机多客户端、房间码、满员、准备、保密、幂等、旧回合拒绝、重连、三种经典模式+技能对战、旧版拦截、零账本污染、再来一局和重启持久化。')}
finally{await stop();rmSync(dir,{recursive:true,force:true})}
