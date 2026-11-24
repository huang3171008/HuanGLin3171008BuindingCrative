import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8');const start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const head=source.slice(0,start).replace('readFileSync,existsSync','readFileSync,writeFileSync,existsSync').replace('return {ws,async eval(expression){','return {ws,async command(method,params={}){const id=++seq;return await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})},async eval(expression){');
const scenario=`try{
const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('typeof cloudMenu === "function" && !!document.querySelector(".bottom-nav")'),'界面未加载');
for(const [width,height,name] of [[360,800,'mobile'],[1280,800,'desktop']]){
 await a.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await delay(400);
 const layout=await a.eval(\`(()=>{const n=document.querySelector('.bottom-nav').getBoundingClientRect(),w=document.querySelector('.wallet').getBoundingClientRect();return {left:n.left,right:n.right,bottom:n.bottom,width:innerWidth,height:innerHeight,wallet:w.right,buttons:document.querySelectorAll('.bottom-nav button').length}})()\`);
 assert.ok(layout.left>=0&&layout.right<=width&&layout.bottom<=height&&layout.wallet<=width&&layout.buttons===5,JSON.stringify(layout));
 const shot=await a.command('Page.captureScreenshot',{format:'png'});writeFileSync('visual-'+name+'.png',Buffer.from(shot.data,'base64'));
}
await a.eval("SkyRenderer.setQuality('low')");assert.equal(await a.eval("document.getElementById('sky-canvas').hidden"),true);
await a.eval("SkyRenderer.setQuality('high')");await a.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(100);assert.equal(await a.eval('SkyRenderer.isFallback()'),true);
await a.command('Emulation.setEmulatedMedia',{features:[]});await a.eval("GameAudio.setSfx(15);GameAudio.setMusic(25)");assert.equal(await a.eval('GameAudio.getSfx()'),15);assert.equal(await a.eval('GameAudio.getMusic()'),25);
await a.eval("document.querySelectorAll('.bottom-nav button')[2].click()");assert.equal(await a.eval("document.getElementById('modal').hidden"),false);assert.equal(await a.eval("!!document.getElementById('sfxVolume')"),true);await a.eval('closeModal()');
await a.command('Page.enable');await a.command('Page.addScriptToEvaluateOnNewDocument',{source:"window.__webglBlocked=true;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'?null:original.call(this,kind,...args)}"});
await a.eval("setTimeout(()=>location.reload(),20);'ok'");await until(async()=>await a.eval("window.__webglBlocked===true && document.readyState==='complete' && !!window.SkyRenderer"),'刷新失败');
assert.equal(await a.eval('SkyRenderer.isFallback()'),true,'不支持 WebGL 时必须降级');assert.equal(await a.eval("document.getElementById('sky-canvas').hidden"),true);
console.log('通过：360px 手机及桌面底部导航和金币区域未越界。');a.ws.close();
`;
const generated='test-visual-generated.mjs';try{writeFileSync(generated,head+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
