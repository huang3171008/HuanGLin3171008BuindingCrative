// Local, opt-in diagnostics for the separately installed diagnostic application.
// Do not log device IDs, addresses, candidate IDs, session descriptions, or game data.
import {execFileSync} from 'node:child_process';
const adb='D:/创作/android-platform-tools/platform-tools/adb.exe';
const app='com.huanglin1008.guessing.diagnostic';
const call=(...args)=>execFileSync(adb,args,{encoding:'utf8',windowsHide:true,timeout:12000}).trim();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ids=call('devices').split(/\r?\n/).slice(1).map(x=>x.trim().split(/\s+/)).filter(x=>x[1]==='device').map(x=>x[0]);
if(ids.length!==2)throw Error('需要恰好两台已授权安卓设备');
const forwards=[],conns=[];
const expression=`(async()=>{
 if(typeof peer==='undefined')return {loaded:false};
 const allowed=(x,valid)=>valid.includes(x)?x:'unknown';
 const pc=peer.pc,dc=peer.dc;
 const out={loaded:true,role:allowed(peer.role,['host','guest']),mode:allowed(peer.kind,['lan','remote']),ready:!!peer.ready,everReady:!!peer.everReady,lost:!!peer.lost,hidden:!!document.hidden,
 pc:pc?allowed(pc.connectionState,['new','connecting','connected','disconnected','failed','closed']):'none',
 ice:pc?allowed(pc.iceConnectionState,['new','checking','connected','completed','disconnected','failed','closed']):'none',
 gathering:pc?allowed(pc.iceGatheringState,['new','gathering','complete']):'none',
 channel:dc?allowed(dc.readyState,['connecting','open','closing','closed']):'none',
 signaling:pc?allowed(pc.signalingState,['stable','have-local-offer','have-remote-offer','closed']):'none',
 sctp:pc?.sctp?allowed(pc.sctp.state,['connecting','connected','closed']):'none',
 dtls:pc?.sctp?.transport?allowed(pc.sctp.transport.state,['new','connecting','connected','closed','failed']):'none',
 localMapping:peer.localSrflx===null?'unknown':peer.localSrflx?'yes':'no',
 remoteMapping:pc?.remoteDescription?(hasPublicCandidate(pc.remoteDescription)?'yes':'no'):'not-received'};
 const candidateCounts=d=>{const counts={};if(!d?.sdp)return counts;for(const line of d.sdp.split(String.fromCharCode(10))){if(!line.startsWith('a=candidate:'))continue;for(const kind of ['host','srflx','prflx','relay'])if(line.includes(' typ '+kind+' ')||line.trimEnd().endsWith(' typ '+kind)){counts[kind]=(counts[kind]||0)+1;break}}return counts};
 if(pc){out.descriptions={local:candidateCounts(pc.localDescription),remote:candidateCounts(pc.remoteDescription)};try{const encoded=document.getElementById('shareText')?.value;if(encoded?.startsWith('GUESS2.')){const parsed=JSON.parse(atob(encoded.slice(7)));out.descriptions.shared=candidateCounts(parsed)}}catch{}}
 if(pc){try{const s=await pc.getStats(),types=['host','srflx','prflx','relay'],counts={local:{},remote:{},pairs:{}},state=['frozen','waiting','in-progress','failed','succeeded'];let selected=null;
  for(const v of s.values()){if(v.type==='local-candidate'||v.type==='remote-candidate'){const side=v.type==='local-candidate'?'local':'remote',k=allowed(v.candidateType,types);counts[side][k]=(counts[side][k]||0)+1}
   if(v.type==='candidate-pair'){const k=allowed(v.state,state);counts.pairs[k]=(counts.pairs[k]||0)+1;if(v.nominated&&v.state==='succeeded')selected=v}}
  if(selected){const l=s.get(selected.localCandidateId),r=s.get(selected.remoteCandidateId);counts.selected={local:allowed(l?.candidateType,types),remote:allowed(r?.candidateType,types),protocol:allowed(l?.protocol,['udp','tcp'])}}
  out.candidates=counts;
 }catch{out.candidates='unavailable'}}return out;
})()`;
async function connect(url){const ws=new WebSocket(url);await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad});let id=0;const pending=new Map();ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error('读取状态失败')):p.resolve(m.result)}};return {ws,async eval(){const n=++id;const x=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(n);reject(Error('读取状态超时'))},5000);pending.set(n,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}))});return x?.result?.value||{loaded:false}}}}
try{
 for(let i=0;i<ids.length;i++){
  const id=ids[i],model=call('-s',id,'shell','getprop','ro.product.model');let pid='';for(let n=0;n<20&&!pid;n++){try{pid=call('-s',id,'shell','pidof',app).split(/\s+/)[0]}catch{}if(!pid)await wait(500)}
  if(!/^\d+$/.test(pid))throw Error('诊断版未启动，请保持两台手机解锁');
  const port=call('-s',id,'forward','tcp:0','localabstract:webview_devtools_remote_'+pid);if(!/^\d+$/.test(port))throw Error('无法建立本机诊断连接');forwards.push({id,port});
  let page=null;for(let n=0;n<30&&!page;n++){try{const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('https://appassets.androidplatform.net/'))}catch{}if(!page)await wait(500)}
  if(!page)throw Error('无法读取诊断页面，请保持游戏在前台');conns.push({label:'手机'+(i+1)+'（'+model+'）',...(await connect(page.webSocketDebuggerUrl))});
 }
 console.log('两台诊断页面已连接。仅输出状态、候选类型和数量，不输出 IP、邀请、回复或游戏内容。');
 const started=Date.now(),duration=Math.max(30000,Number(process.env.TRACE_MS)||600000);let last=['',''],heartbeat=0;
 while(Date.now()-started<duration){for(let i=0;i<conns.length;i++){try{const value=await conns[i].eval(),line=JSON.stringify(value);if(line!==last[i]){console.log('+'+Math.round((Date.now()-started)/1000)+'s',conns[i].label,line);last[i]=line}}catch{console.log('+'+Math.round((Date.now()-started)/1000)+'s',conns[i].label,'诊断页面连接中断');last[i]=''}}
  if(Date.now()-heartbeat>30000){console.log('诊断观察中：'+Math.round((Date.now()-started)/1000)+' 秒');heartbeat=Date.now()}await wait(2000)}
}finally{for(const c of conns)try{c.ws.close()}catch{}for(const f of forwards)try{call('-s',f.id,'forward','--remove','tcp:'+f.port)}catch{}}
