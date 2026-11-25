import {readFileSync,writeFileSync,unlinkSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const source=readFileSync('test-desktop.mjs','utf8'),start=source.indexOf("try{console.log('启动桌面实例"),end=source.indexOf('}finally{for(const c of children)',start);
if(start<0||end<0)throw Error('Cannot locate desktop harness');
const scenario=`try{
const [u,v]=await Promise.all([launch(39381),launch(39382)]);const [a,b]=await Promise.all([connect(u),connect(v)]);
await until(async()=>await a.eval('typeof cloudMenu === "function"')&&await b.eval('typeof cloudMenu === "function"'),'界面未启动');
await a.eval("cloudMenu();document.getElementById('cloudAddress').value='http://127.0.0.1:39189';startCloud()");
await b.eval("cloudMenu();document.getElementById('cloudAddress').value='http://127.0.0.1:39189';startCloud()");
await until(async()=>await a.eval('cloud.ready && !!state')&&await b.eval('cloud.ready && !!state'),'桌面程序未连接服务器');
await a.eval('createRoom()');await until(async()=>await a.eval("/^\\\\d{6}$/.test(state?.room?.code||'')"),'房间码未生成');
const code=await a.eval('state.room.code');await b.eval(\`document.getElementById('joinCode').value=\${JSON.stringify(code)};joinRoom()\`);
await until(async()=>await a.eval("state?.room?.phase==='ready'")&&await b.eval("state?.room?.phase==='ready'"),'加入失败');
await a.eval('cloudReady()');await b.eval('cloudReady()');await until(async()=>await a.eval('state.room.lobbyReady.every(Boolean)'),'准备失败');await a.eval('cloudStart()');
await until(async()=>await b.eval("state?.room?.phase==='move'"),'开始失败');
await a.eval("cloudAction('move',{move:'rock',tier:10,stake:10})");await b.eval("cloudAction('move',{move:'scissors',tier:10,stake:10})");
await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'出拳未同步');
assert.equal(await a.eval('state.wallet'),5000);assert.equal(await b.eval('state.wallet'),4980);
await a.eval("api('leave')");await until(async()=>await a.eval('state.room===null')&&await b.eval('state.room===null'),'离开经典房间失败');
await a.eval("setMode('normal');setVariant('skill');createRoom()");await until(async()=>await a.eval("state?.room?.variant==='skill'"),'桌面端创建技能房失败');
const sCode=await a.eval('state.room.code');await b.eval(\`document.getElementById('joinCode').value=\${JSON.stringify(sCode)};joinRoom()\`);
await until(async()=>await a.eval("state?.room?.phase==='ready'")&&await b.eval("state?.room?.phase==='ready'"),'桌面端技能房加入失败');
await a.eval('cloudReady()');await b.eval('cloudReady()');await until(async()=>await a.eval('state.room.lobbyReady.every(Boolean)'),'桌面端技能准备失败');await a.eval('cloudStart()');
await until(async()=>await b.eval("state?.room?.phase==='move'&&state.room.players.find(p=>p.isMe).hand.length===3"),'桌面端技能房发牌失败');
await a.eval("(()=>{const me=state.room.players.find(p=>p.isMe),c=me.hand.find(id=>id!=='16_phantom_swap'&&SKILL_MAP[id].cost<=me.energy);if(c)toggleSkillCard(c);selectMove('rock');sendMove()})()");
await b.eval("selectMove('scissors');sendMove()");
await until(async()=>await a.eval('state?.room?.round===2')&&await b.eval('state?.room?.round===2'),'桌面端技能首回合未同步');
assert.equal(await a.eval('state.wallet'),5000);assert.equal(await b.eval('state.wallet'),4980);
console.log('通过：两个本机 Windows 打包应用使用云房间服务完成经典对局与技能对战。');a.ws.close();b.ws.close();
`;
const dir=mkdtempSync(join(tmpdir(),'guess-cloud-desktop-')),server=spawn(process.execPath,['cloud-server.mjs'],{cwd:resolve('../game'),env:{...process.env,PORT:'39189',GAME_DATA_DIR:dir},stdio:'ignore',windowsHide:true}),generated='test-cloud-desktop-generated.mjs';
try{await new Promise(r=>setTimeout(r,1000));writeFileSync(generated,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit',env:process.env});process.exitCode=r.status??1}
finally{server.kill();try{unlinkSync(generated)}catch{}await new Promise(r=>setTimeout(r,500));try{rmSync(dir,{recursive:true,force:true})}catch{}}
