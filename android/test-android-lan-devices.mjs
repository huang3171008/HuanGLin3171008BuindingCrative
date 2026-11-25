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
  await until(async()=>await a.eval('document.readyState === "complete" && typeof lanMenu === "function"')&&await b.eval('document.readyState === "complete" && typeof lanMenu === "function"'),'诊断页面未加载');
  await a.eval('resetPeer();lanMenu();startHost()');
  await until(async()=>await a.eval("Boolean(document.getElementById('shareText')?.value)"),'房主未生成局域网连接码');
  const code=await a.eval("document.getElementById('shareText').value");
  await b.eval(`resetPeer();lanMenu();document.getElementById('lanCode').value=${JSON.stringify(code)};joinLan()`);
  await until(async()=>await a.eval('peer.ready')&&await b.eval('peer.ready'),'两台手机未建立局域网连接',35000);
  console.log('两台实体手机：局域网连接建立。');
  await a.eval("p2pApi('create',{mode:'normal'})");
  await until(async()=>await a.eval("state?.room?.phase==='move'")&&await b.eval("state?.room?.phase==='move'"),'房间未同步');
  const beforeA=await a.eval('state.wallet'), beforeB=await b.eval('state.wallet');
  await a.eval("p2pApi('move',{move:'rock',tier:10,stake:10})");
  await b.eval("p2pApi('move',{move:'scissors',tier:10,stake:10})");
  await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'回合未同步');
  assert.equal(await a.eval('state.wallet'),beforeA);
  assert.equal(await b.eval('state.wallet'),beforeB-20);
  console.log('两台实体手机：普通模式首回合、双方状态与金币变化同步通过。');
  for(let round=2;round<=10;round++){
    await a.eval("p2pApi('move',{move:'rock',tier:10,stake:10})");
    await b.eval("p2pApi('move',{move:'scissors',tier:10,stake:10})");
    await until(async()=>round===10
      ? await a.eval("state?.room?.phase==='finished'")&&await b.eval("state?.room?.phase==='finished'")
      : await a.eval(`state?.room?.round===${round+1}`)&&await b.eval(`state?.room?.round===${round+1}`),'普通模式回合未同步');
  }
  assert.equal(await a.eval('state.wallet'),beforeA);
  assert.equal(await b.eval('state.wallet'),beforeB-200);
  console.log('两台实体手机：普通模式十回合结算通过。');
  await a.eval("p2pApi('leave')");
  await until(async()=>await b.eval('state?.room===null'),'退出房间未同步');
  await a.eval("p2pApi('create',{mode:'guessMove'})");
  await until(async()=>await b.eval("state?.room?.phase==='move'"),'竞猜房间未建立');
  await a.eval("p2pApi('move',{move:'rock',stake:10})");
  await b.eval("p2pApi('move',{move:'scissors',stake:20})");
  await a.eval("p2pApi('guess',{guess:'scissors'})");
  await b.eval("p2pApi('guess',{guess:'paper'})");
  await until(async()=>await b.eval("state?.room?.phase==='finished'"),'竞猜手势未结束');
  assert.equal(await a.eval('state.wallet'),beforeA+40);
  assert.equal(await b.eval('state.wallet'),beforeB-260);
  await a.eval("p2pApi('leave')");
  await until(async()=>await b.eval('state?.room===null'),'退出房间未同步');
  await a.eval("p2pApi('create',{mode:'guessOutcome'})");
  await until(async()=>await b.eval("state?.room?.phase==='move'"),'竞猜输赢房间未建立');
  await a.eval("p2pApi('move',{move:'rock',stake:10})");
  await b.eval("p2pApi('move',{move:'rock',stake:20})");
  await a.eval("p2pApi('guess',{guess:'win'})");
  await b.eval("p2pApi('guess',{guess:'lose'})");
  await until(async()=>await b.eval("state?.room?.phase==='finished'"),'竞猜输赢未结束');
  assert.equal(await a.eval('state.wallet'),beforeA+40);
  assert.equal(await b.eval('state.wallet'),beforeB-260);
  console.log('两台实体手机：两种竞猜模式结算通过。');
  await a.eval("p2pApi('leave')");
  await until(async()=>await b.eval('state?.room===null'),'退出房间未同步');
} finally { for (const c of clients) c.ws.close(); }
