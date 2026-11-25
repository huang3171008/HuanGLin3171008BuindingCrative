// Same-machine control for delayed manual signaling; this is not a mobile network test.
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const delayMs=Math.max(0,Number(process.env.SIGNAL_DELAY_MS)||75000);
const scenario=`try{
 const [u1,u2]=await Promise.all([spawnBrowser(39281),spawnBrowser(39282)]),[a,b]=await Promise.all([connect(u1),connect(u2)]);
 await until(async()=>await a.eval('typeof startHost === "function"')&&await b.eval('typeof joinRemote === "function"'),'页面未加载');
 await a.eval("remoteMenu();startHost('remote')");const offer=await a.eval("document.getElementById('shareText').value");
 await b.eval(\`remoteMenu();document.getElementById('offerInput').value=\${JSON.stringify(offer)};joinRemote()\`);const answer=await b.eval("document.getElementById('shareText').value");
 const start=Date.now();while(Date.now()-start<${delayMs}){await delay(Math.min(15000,${delayMs}-(Date.now()-start)));const status=await b.eval("({peer:peer.pc?.connectionState,ice:peer.pc?.iceConnectionState,channel:peer.dc?.readyState||'pending',lost:peer.lost})");console.log('回复尚未送达房主，已等待',Math.round((Date.now()-start)/1000),'秒',JSON.stringify(status));if(status.lost)break}
 await a.eval(\`document.getElementById('answerInput').value=\${JSON.stringify(answer)};finishRemote()\`);
 await until(async()=>await a.eval('peer.ready')&&await b.eval('peer.ready'),'延迟交换后未建立连接');
 console.log('同机延迟交换控制测试通过；不能代表手机 NAT 或移动网络。');a.ws.close();b.ws.close();
`;
const file='test-handshake-delay-generated.mjs';try{writeFileSync(file,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[file],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(file)}catch{}}
