// Same-machine control only: this cannot reproduce mobile carrier NAT or background limits.
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const duration=Math.max(1000,Number(process.env.SOAK_MS)||330000);
const scenario=`try{
const [u1,u2]=await Promise.all([spawnBrowser(39281),spawnBrowser(39282)]);const [a,b]=await Promise.all([connect(u1),connect(u2)]);
await until(async()=>await a.eval('typeof startHost === "function"')&&await b.eval('typeof joinRemote === "function"'),'页面未加载');
await a.eval("remoteMenu();startHost('remote')");const offer=await a.eval("document.getElementById('shareText').value");
await b.eval(\`remoteMenu();document.getElementById('offerInput').value=\${JSON.stringify(offer)};joinRemote()\`);const answer=await b.eval("document.getElementById('shareText').value");
await a.eval(\`document.getElementById('answerInput').value=\${JSON.stringify(answer)};finishRemote()\`);
await until(async()=>await a.eval('peer.ready')&&await b.eval('peer.ready'),'同机控制测试未建立连接');
await a.eval("p2pApi('create',{mode:'normal'})");await until(async()=>await b.eval('state?.room?.hasOpponent'),'房间未建立');
await a.eval("p2pApi('move',{move:'rock',stake:1,tier:10})");await b.eval("p2pApi('move',{move:'scissors',stake:1,tier:10})");
await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'首回合未同步');
const started=Date.now();while(Date.now()-started<${duration}){await delay(Math.min(30000,${duration}-(Date.now()-started)));const st=await Promise.all([a.eval('({ready:peer.ready,connection:peer.pc?.connectionState,ice:peer.pc?.iceConnectionState,channel:peer.dc?.readyState})'),b.eval('({ready:peer.ready,connection:peer.pc?.connectionState,ice:peer.pc?.iceConnectionState,channel:peer.dc?.readyState})')]);console.log('同机连接检查：',Math.round((Date.now()-started)/1000),'秒',JSON.stringify(st));if(st.some(x=>!x.ready||x.channel!=='open'))throw Error('同机控制连接中断')}
await a.eval("p2pApi('move',{move:'rock',stake:1,tier:10})");await b.eval("p2pApi('move',{move:'scissors',stake:1,tier:10})");await until(async()=>await a.eval('state?.room?.round===3')&&await b.eval('state?.room?.round===3'),'长时间等待后回合未同步');
console.log('同机控制测试通过；此结果不能证明真实手机及不同网络稳定。');a.ws.close();b.ws.close();
`;
const file='test-soak-peer-generated.mjs';try{writeFileSync(file,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[file],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(file)}catch{}}
