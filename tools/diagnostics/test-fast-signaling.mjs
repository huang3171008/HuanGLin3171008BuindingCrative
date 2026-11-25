// With explicit device-owner consent, transfer SDP only in local process memory
// between two USB-connected diagnostic WebViews. No SDP, address, or IDs are logged.
// The actual WebRTC connection is still made over each phone's own network.
import {execFileSync} from 'node:child_process';
const adb='D:/创作/android-platform-tools/platform-tools/adb.exe',app='com.huanglin1008.guessing.diagnostic';
const call=(...a)=>execFileSync(adb,a,{encoding:'utf8',windowsHide:true,timeout:12000}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ids=call('devices').split(/\r?\n/).slice(1).map(x=>x.trim().split(/\s+/)).filter(x=>x[1]==='device').map(x=>x[0]);
if(ids.length!==2)throw Error('需要两台已授权安卓设备');
const forwards=[],devices=[];
const safeState=`(async()=>{const p=peer.pc,c=peer.dc;const out={role:peer.role,ready:!!peer.ready,lost:!!peer.lost,hidden:!!document.hidden,pc:p?.connectionState||'none',ice:p?.iceConnectionState||'none',gathering:p?.iceGatheringState||'none',channel:c?.readyState||'none',localMapping:peer.localSrflx===null?'unknown':peer.localSrflx?'yes':'no',remoteMapping:p?.remoteDescription?(hasPublicCandidate(p.remoteDescription)?'yes':'no'):'not-received'};if(p)try{const s=await p.getStats(),count={};for(const x of s.values())if(x.type==='candidate-pair'&&['frozen','waiting','in-progress','failed','succeeded'].includes(x.state)){count[x.state]=(count[x.state]||0)+1;const l=s.get(x.localCandidateId),r=s.get(x.remoteCandidateId),safe=y=>['host','srflx','prflx','relay'].includes(y)?y:'unknown',num=y=>Number.isSafeInteger(y)&&y>=0?y:null;(out.pairDetails??=[]).push({local:safe(l?.candidateType),remote:safe(r?.candidateType),protocol:['udp','tcp'].includes(l?.protocol)?l.protocol:'unknown',state:x.state,requestsSent:num(x.requestsSent),responsesReceived:num(x.responsesReceived),requestsReceived:num(x.requestsReceived),responsesSent:num(x.responsesSent)})}out.pairs=count}catch{}return out})()`;
async function connect(url){const ws=new WebSocket(url);await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad});let id=0;const pending=new Map();ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error('诊断页面命令失败')):p.resolve(m.result)}};return {ws,async eval(expr){const n=++id,x=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(n);reject(Error('诊断页面响应超时'))},75000);pending.set(n,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression:expr,awaitPromise:true,returnByValue:true}}))});if(x.exceptionDetails)throw Error('诊断页面执行失败');return x.result?.value}}}
try{
 for(let i=0;i<ids.length;i++){const id=ids[i],model=call('-s',id,'shell','getprop','ro.product.model');const pid=call('-s',id,'shell','pidof',app).split(/\s+/)[0];if(!/^\d+$/.test(pid))throw Error('请打开诊断应用');const port=call('-s',id,'forward','tcp:0','localabstract:webview_devtools_remote_'+pid);if(!/^\d+$/.test(port))throw Error('本机诊断连接失败');forwards.push({id,port});let page;for(let n=0;n<20&&!page;n++){try{page=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page'&&x.url.startsWith('https://appassets.androidplatform.net/'))}catch{}if(!page)await sleep(500)}if(!page)throw Error('请保持诊断应用打开');devices.push({model,...await connect(page.webSocketDebuggerUrl)})}
 for(const [hostIndex,guestIndex] of [[0,1],[1,0]]){
  const host=devices[hostIndex],guest=devices[guestIndex];console.log('开始快速交换：房主',host.model,'加入者',guest.model);
  await Promise.all([host.eval("resetPeer();'ok'"),guest.eval("resetPeer();'ok'")]);
  for(const d of [host,guest])await d.eval("if(!window.__testOriginalGather)window.__testOriginalGather=gather;gather=window.__testOriginalGather;'ok'");
  if(process.env.LONG_HOST_GATHER==='1'){
   await host.eval("gather=pc=>new Promise(resolve=>{if(pc.iceGatheringState==='complete'){resolve();return}let done=false;const finish=()=>{if(done)return;done=true;pc.removeEventListener('icegatheringstatechange',check);clearTimeout(timer);resolve()};const check=()=>{if(pc.iceGatheringState==='complete')finish()};pc.addEventListener('icegatheringstatechange',check);const timer=setTimeout(finish,55000)});'ok'");
   console.log('本轮仅房主等待候选收集完成（最多 55 秒）；加入者保持原 8 秒。');
  }
  const offer=await host.eval("(async()=>{remoteMenu();await startHost('remote');return document.getElementById('shareText')?.value||null})()");
  if(typeof offer!=='string'||!offer.startsWith('GUESS2.')){console.log('未能生成邀请');continue}
  console.log('邀请生成时房主候选收集状态：',await host.eval("peer.pc?.iceGatheringState||'none'"));
  const answer=await guest.eval(`(async()=>{remoteMenu();document.getElementById('offerInput').value=${JSON.stringify(offer)};await joinRemote();return document.getElementById('shareText')?.value||null})()`);
  if(typeof answer!=='string'||!answer.startsWith('GUESS2.')){console.log('加入者未能生成回复');continue}
  if(process.env.INSPECT_GUEST_LATE==='1')await guest.eval("window.__diagnosticInitialCandidates=new Set((peer.pc?.localDescription?.sdp||'').split(String.fromCharCode(10)).filter(x=>x.startsWith('a=candidate:')).map(x=>x.trim()));'ok'");
  const started=Date.now();await host.eval(`(async()=>{const input=document.getElementById('answerInput');if(!input)return false;input.value=${JSON.stringify(answer)};await finishRemote();return true})()`);console.log('回复传递耗时：',Date.now()-started,'毫秒（仅在本机内存中处理）');
  let connected=false;for(let i=0;i<75;i++){const states=await Promise.all([host.eval(safeState),guest.eval(safeState)]);if(i%5===0||states.some(s=>s.lost)||states.every(s=>s.ready))console.log('连接状态',i,JSON.stringify(states));if(states.every(s=>s.ready)){connected=true;break}if(states.some(s=>s.lost))break;await sleep(500)}
  if(connected){await host.eval("p2pApi('create',{mode:'normal'})");for(let i=0;i<20&&!await guest.eval('!!state?.room?.hasOpponent');i++)await sleep(250);await host.eval("p2pApi('move',{move:'rock',stake:1,tier:10})");await guest.eval("p2pApi('move',{move:'scissors',stake:1,tier:10})");let ok=false;for(let i=0;i<20;i++){if(await host.eval('state?.room?.round===2')&&await guest.eval('state?.room?.round===2')){ok=true;break}await sleep(250)}console.log(ok?'诊断钱包的一回合同步成功':'已连接，但一回合同步未确认')}
  else console.log('本次快速交换仍未建立直连。');
  if(process.env.INSPECT_GUEST_LATE==='1'){
   for(let i=0;i<55;i++){if(await guest.eval("peer.pc?.iceGatheringState==='complete'"))break;await sleep(1000)}
   const summary=await guest.eval(`(()=>{const initial=window.__diagnosticInitialCandidates||new Set(),current=new Set((peer.pc?.localDescription?.sdp||'').split(String.fromCharCode(10)).filter(x=>x.startsWith('a=candidate:')).map(x=>x.trim())),added={};for(const line of current){if(initial.has(line))continue;for(const k of ['host','srflx','prflx','relay'])if(line.includes(' typ '+k+' ')||line.endsWith(' typ '+k)){added[k]=(added[k]||0)+1;break}}return {gathering:peer.pc?.iceGatheringState||'none',initialCount:initial.size,finalCount:current.size,addedTypes:added}})()`);
   console.log('加入者生成回复后候选变化（仅数量及类型）：',JSON.stringify(summary));break;
  }
 }
}finally{for(const d of devices)try{d.ws.close()}catch{}for(const f of forwards)try{call('-s',f.id,'forward','--remove','tcp:'+f.port)}catch{}}
