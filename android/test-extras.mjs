import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
const scenario=`try{
const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('typeof claimDaily === "function" && !!state'),'界面未加载');
assert.equal(await a.eval('state.wallet'),5000);await a.eval('claimDaily()');assert.equal(await a.eval('state.wallet'),5100);await a.eval('claimDaily()');assert.equal(await a.eval('state.wallet'),5100,'24 小时内不能重复领取');
await a.eval("shopModal();buyTheme('sunset');'ok'");assert.equal(await a.eval("document.getElementById('modalTitle').textContent"),'解锁天幕');await a.eval("document.getElementById('confirmYes').click()");await until(async()=>await a.eval("ownedCosmetics().includes('sunset')"),'天幕购买失败');assert.equal(await a.eval('state.wallet'),4900);await a.eval("buyTheme('sunset');'ok'");assert.equal(await a.eval('state.wallet'),4900,'已拥有的天幕不能重复扣款');assert.equal(await a.eval("document.body.dataset.theme"),'sunset');
assert.equal(await a.eval("readHistory().filter(x=>x.mode==='extra').length"),2,'领取和购买都应记账');
await a.eval('closeModal();AIPractice.start("easy");api("create",{mode:"normal"})');await a.eval('claimDaily()');assert.equal(await a.eval("Number(localStorage.getItem('direct_wallet_v1'))"),4900,'陪练不能改动直连钱包');
console.log('通过：每日领取间隔、商店扣费与重复购买、金币记录、陪练钱包隔离。');a.ws.close();
`;
const generated='test-extras-generated.mjs';try{writeFileSync(generated,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
