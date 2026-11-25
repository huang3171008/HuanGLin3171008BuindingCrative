// Explicitly authorized: classify IPv6 candidate presence inside each phone.
// No address, SDP, device ID, or other connection content leaves the phone.
import {execFileSync} from 'node:child_process';
const adb='D:/创作/android-platform-tools/platform-tools/adb.exe',app='com.huanglin1008.guessing.diagnostic';
const call=(...a)=>execFileSync(adb,a,{encoding:'utf8',windowsHide:true,timeout:12000}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ids=call('devices').split(/\r?\n/).slice(1).map(x=>x.trim().split(/\s+/)).filter(x=>x[1]==='device').map(x=>x[0]);
if(ids.length!==2)throw Error('需要两台已授权安卓设备');
const forwards=[],sockets=[];
const expr=`(async()=>{
 const p=peer.pc;if(!p)return {status:'无法判断',reason:'当前没有连接尝试'};
 let found=false,hidden=false,seen=false;
 const inspect=(address,type)=>{if(typeof address!=='string'||!address){if(type==='host')hidden=true;return}seen=true;if(address.endsWith('.local')){hidden=true;return}if(!address.includes(':'))return;const first=parseInt(address.split(':')[0],16);if(first>=0x2000&&first<=0x3fff&&!address.toLowerCase().startsWith('2001:db8:'))found=true};
 try{for(const line of (p.localDescription?.sdp||'').split(String.fromCharCode(10))){if(!line.startsWith('a=candidate:'))continue;try{const c=new RTCIceCandidate({candidate:line.slice(2).trim(),sdpMid:'0'});inspect(c.address,c.type)}catch{hidden=true}}}catch{hidden=true}
 try{for(const c of (await p.getStats()).values())if(c.type==='local-candidate')inspect(c.address,c.candidateType)}catch{hidden=true}
 return found?{status:'有'}:hidden?{status:'无法判断',reason:'部分候选地址被系统隐藏'}:seen?{status:'未发现'}:{status:'无法判断',reason:'没有可检查的候选'};
})()`;
async function evalOnce(url){const ws=new WebSocket(url);sockets.push(ws);await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad});return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('读取状态超时')),5000);ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id!==1)return;clearTimeout(timer);if(x.error||x.result?.exceptionDetails)reject(Error('读取状态失败'));else resolve(x.result?.result?.value)};ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:expr,awaitPromise:true,returnByValue:true}}))})}
try{for(let i=0;i<ids.length;i++){const id=ids[i],model=call('-s',id,'shell','getprop','ro.product.model'),pid=call('-s',id,'shell','pidof',app).split(/\s+/)[0];if(!/^\d+$/.test(pid))throw Error('诊断应用未运行');const port=call('-s',id,'forward','tcp:0','localabstract:webview_devtools_remote_'+pid);forwards.push({id,port});let page;for(let n=0;n<20&&!page;n++){try{page=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page'&&x.url.startsWith('https://appassets.androidplatform.net/'))}catch{}if(!page)await sleep(500)}if(!page)throw Error('诊断页面不可用');const result=await evalOnce(page.webSocketDebuggerUrl);console.log('手机'+(i+1)+'（'+model+'）：公网 IPv6 候选',JSON.stringify(result))}}
finally{for(const s of sockets)try{s.close()}catch{}for(const f of forwards)try{call('-s',f.id,'forward','--remove','tcp:'+f.port)}catch{}}
