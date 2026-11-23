import {readFileSync,writeFileSync,unlinkSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const source=readFileSync('test-peer.mjs','utf8');const start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const scenario=`try{
const [u1,u2]=await Promise.all([spawnBrowser(39281),spawnBrowser(39282)]);const [a,b]=await Promise.all([connect(u1),connect(u2)]);
await until(async()=>await a.eval('typeof cloudMenu === "function"')&&await b.eval('typeof cloudMenu === "function"'),'页面未加载');
await a.eval("cloudMenu();document.getElementById('cloudAddress').value='http://127.0.0.1:39188';startCloud()");
await b.eval("cloudMenu();document.getElementById('cloudAddress').value='http://127.0.0.1:39188';startCloud()");
await until(async()=>await a.eval('cloud.ready && !!state')&&await b.eval('cloud.ready && !!state'),'未连接服务器');
await a.eval('createRoom()');await until(async()=>await a.eval("/^\\\\d{8}$/.test(state?.room?.code||'')"),'房主未取得八位房间码');
const code=await a.eval('state.room.code');await b.eval(\`document.getElementById('joinCode').value=\${JSON.stringify(code)};joinRoom()\`);
await until(async()=>await a.eval("state?.room?.phase==='ready'")&&await b.eval("state?.room?.phase==='ready'"),'未进入准备状态');
await a.eval('cloudReady()');await b.eval('cloudReady()');await until(async()=>await a.eval('state.room.lobbyReady.every(Boolean)'),'准备未同步');await a.eval('cloudStart()');
await until(async()=>await b.eval("state?.room?.phase==='move'"),'无法开始');
await a.eval("cloudAction('move',{move:'rock',tier:10,stake:10})");await b.eval("cloudAction('move',{move:'scissors',tier:10,stake:10})");
await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'出拳未同步');
assert.equal(await a.eval('state.wallet'),5000);assert.equal(await b.eval('state.wallet'),4980);
await a.eval(\`const forged=structuredClone(state);forged.room.code='<img src=x onerror="window.compromised=true">';cloud.ws.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:forged})}));\`);
assert.equal(await a.eval('window.compromised===true'),false,'伪造服务器状态不得执行脚本');
assert.equal(await a.eval('cloud.ready'),false,'无效服务器状态必须断开');
console.log('通过：独立浏览器界面连接本机服务器、八位房间码、准备和服务端结算。');a.ws.close();b.ws.close();
`;
const dir=mkdtempSync(join(tmpdir(),'guess-cloud-ui-'));const server=spawn(process.execPath,['cloud-server.mjs'],{cwd:resolve('../game'),env:{...process.env,PORT:'39188',GAME_DATA_DIR:dir},stdio:'ignore',windowsHide:true});
const generated='test-cloud-ui-generated.mjs';
try{await new Promise((r,j)=>setTimeout(r,1000));writeFileSync(generated,source.slice(0,start)+scenario+source.slice(end));const result=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=result.status??1}
finally{server.kill();try{unlinkSync(generated)}catch{}await new Promise(r=>setTimeout(r,500));try{rmSync(dir,{recursive:true,force:true})}catch{}}
