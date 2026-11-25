// Two USB-attached diagnostic WebViews; only the local connection code is passed
// through this process. SDP and gameplay travel through the devices' LAN path.
import assert from 'node:assert/strict';
const delay = ms => new Promise(r => setTimeout(r, ms));
async function attach(port) {
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const tab = tabs.find(x => x.type === 'page' && x.webSocketDebuggerUrl);
  if (!tab) throw Error('诊断应用未显示游戏页面');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0; const pending = new Map();
  ws.onmessage = e => { const m=JSON.parse(e.data); if (!m.id || !pending.has(m.id)) return; const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(Error(m.error.message)):p.resolve(m.result); };
  return {ws, async eval(expression) { const id=++seq; const result=await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}))});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value; }};
}
async function until(fn,label,ms=25000) {const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(200)}throw Error(label)}
const clients=[];
try {
 const a=await attach(39601), b=await attach(39602); clients.push(a,b);
 await until(async()=>await a.eval('document.readyState === "complete" && typeof cloudMenu === "function"')&&await b.eval('document.readyState === "complete" && typeof cloudMenu === "function"'),'诊断页面未加载');
 await a.eval('resetPeer();cloudMenu();startCloud()');await b.eval('resetPeer();cloudMenu();startCloud()');
 await until(async()=>await a.eval('cloud.ready && !!state')&&await b.eval('cloud.ready && !!state'),'手机未连接云服务器',30000);
 for(const c of [a,b]){if(await c.eval('!!state.room')){await c.eval("cloudAction('leave')");await until(async()=>await c.eval('state.room===null'),'旧房间未退出')}}
 await a.eval('createRoom()');await until(async()=>await a.eval("/^\\d{6}$/.test(state?.room?.code||'')"),'没有取得六位房间码');
 const code=await a.eval('state.room.code');await b.eval(`document.getElementById('joinCode').value=${JSON.stringify(code)};joinRoom()`);
 await until(async()=>await a.eval("state?.room?.phase==='ready'")&&await b.eval("state?.room?.phase==='ready'"),'云房间未同步');
 await a.eval('cloudReady()');await b.eval('cloudReady()');await until(async()=>await a.eval('state.room.lobbyReady.every(Boolean)'),'准备状态未同步');await a.eval('cloudStart()');
 await until(async()=>await a.eval("state?.room?.phase==='move'")&&await b.eval("state?.room?.phase==='move'"),'对局未开始');
 const beforeA=await a.eval('state.wallet'),beforeB=await b.eval('state.wallet');
 await a.eval("cloudAction('move',{move:'rock',tier:10,stake:10})");await b.eval("cloudAction('move',{move:'scissors',tier:10,stake:10})");
 await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'回合结果未同步');
 assert.equal(await a.eval('state.wallet'),beforeA);assert.equal(await b.eval('state.wallet'),beforeB-20);
 await a.eval("cloudAction('leave')");await until(async()=>await b.eval('state?.room===null'),'离开房间未同步');
 console.log('两台安卓实体手机：公网云服务器、6 位房间码、准备、对局和金币同步通过。');
}finally{for(const c of clients)c.ws.close()}
