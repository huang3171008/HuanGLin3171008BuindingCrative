import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

// Reuse the browser harness and close the real data channel before it connects.
const original=readFileSync('test-peer.mjs','utf8');
const start=original.indexOf('try{const [u1,u2]');
const end=original.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const scenario=`try{
const u1=await spawnBrowser(39281);
const a=await connect(u1);
await until(async()=>await a.eval('typeof startHost === "function"'),'页面未加载');
await a.eval("remoteMenu();startHost('remote')");
await a.eval('peer.dc.close()');
await until(async()=>await a.eval("document.getElementById('connectionBody').innerText.includes('重新连接')"),'未能模拟连接失败');
const message=await a.eval("document.getElementById('connectionBody').innerText");
console.log('模拟连接从未建立时的提示：',message.replace(/\\s+/g,' '));
assert.ok(message.includes('尚未建立'), '建立连接之前失败应明确说明尚未连接');
assert.ok(!message.includes('已结算金币'), '从未进入游戏时不应显示对局中断的提示');
a.ws.close();
`;
const path=join(process.cwd(),'test-unreachable-generated.mjs');
writeFileSync(path,original.slice(0,start)+scenario+original.slice(end));
const r=spawnSync(process.execPath,[path],{stdio:'inherit'});
try{(await import('node:fs')).unlinkSync(path)}catch{}
process.exitCode=r.status??1;
