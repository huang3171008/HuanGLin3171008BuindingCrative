// Drive the actual Android asset allowlist through the browser, including new modules and audio.
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const java=readFileSync('src/com/huanglin1008/guessing/MainActivity.java','utf8');
const patterns=[...java.matchAll(/path\.matches\("([^"\n]+)"\)/g)].map(m=>m[1].replaceAll('\\\\','\\'));
const literals=[...java.matchAll(/"(\/assets\/[^"\n]+)"\.equals\(path\)/g)].map(m=>m[1]);
if(!patterns.length)throw Error('无法读取 Android 资源规则');
const allowed=path=>literals.includes(path)||patterns.some(pattern=>new RegExp(pattern).test(path));
const html=readFileSync('assets/index.html','utf8'),audio=readFileSync('assets/assets/audio-manager.js','utf8'),engine=readFileSync('assets/assets/engine.js','utf8');
const skillSvgs=[...engine.matchAll(/id:\s*'([0-9]{2}_[a-z_]+)'/g)].map(m=>`/assets/skills/${m[1]}.svg`);
const required=[...[...html.matchAll(/<script\s+src="(\/assets\/[^"]+)"/g)].map(m=>m[1]),...[...audio.matchAll(/['"](\/assets\/(?:music|sfx)\/[^'"]+\.mp3)['"]/g)].map(m=>m[1]),...skillSvgs];
for(const path of required){if(!allowed(path))throw Error('Android 资源规则拦截了 '+path);try{readFileSync('assets'+path)}catch{throw Error('Android 资源不存在 '+path)}}
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('无法读取浏览器测试环境');
const guard=`if(p.startsWith('/assets/')&&!${JSON.stringify(literals)}.includes(p)&&!${JSON.stringify(patterns)}.some(x=>new RegExp(x).test(p))){res.writeHead(404).end();return}`;
const head=source.slice(0,start).replace("if(p.startsWith('/__lan/'))",guard+"if(p.startsWith('/__lan/'))").replace('awaitPromise:true,returnByValue:true','awaitPromise:true,returnByValue:true,userGesture:true');
const scenario=`try{
const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('document.readyState === "complete" && !!document.getElementById("wallet")'),'页面未加载');
assert.equal(await a.eval("document.getElementById('wallet').textContent"),'5,000','金币余额未初始化');
await a.eval("document.querySelectorAll('.bottom-nav button')[1].click()");assert.equal(await a.eval("document.getElementById('modal').hidden"),false,'陪练按钮无响应');
await a.eval("document.querySelector('#modalBody button').click()");assert.equal(await a.eval('AIPractice.active'),true,'无法进入陪练');
await a.eval('AIPractice.stop()');await a.eval("document.querySelectorAll('.bottom-nav button')[2].click()");assert.ok((await a.eval("document.getElementById('connectionBody').textContent")).includes('选择连接方式'),'联机按钮无响应');
await a.eval("chooseMusic('pixel')");await until(async()=>await a.eval('GameAudio.getCurrent()?.readyState>=2'),'像素乐园音乐加载失败');
assert.equal(await a.eval("typeof qrcode"),'function','二维码模块不可用');console.log('通过：Android 资源规则下金币、陪练、联机和像素乐园均可用。');a.ws.close();
`;
const generated='test-android-asset-policy-generated.mjs';try{writeFileSync(generated,head+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
