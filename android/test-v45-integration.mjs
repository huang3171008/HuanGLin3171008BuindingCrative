import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const scenario=`try{
 const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('typeof practiceModal === "function" && !!state'),'界面未加载');
 await a.eval("AIPractice.start('easy');api('create',{mode:'guessMove'})");
 await a.eval("sendEmote('快点呀')");
 await a.eval("api('leave');api('create',{mode:'guessMove'})");
 await delay(1400);assert.equal(await a.eval("document.querySelector('.chat-other')?.textContent||''"),'','上局的 AI 回复不能出现在新局');
 await a.eval("receiveGameEmote('不允许的内容')");assert.equal(await a.eval("document.querySelector('.chat-other')?.textContent||''"),'','网络快捷表情必须限制在预设列表');
 await a.eval("sendEmote('快点呀')");await until(async()=>await a.eval("document.querySelector('.chat-other')?.textContent==='马上就好！'"),'AI 没有回复预设表情');
 await a.eval("api('move',{move:'rock',stake:10})");await until(async()=>await a.eval("state.room.phase==='guess'"),'未进入竞猜');await a.eval("api('guess',{guess:'paper'})");await until(async()=>await a.eval("state.room.phase==='finished'"),'陪练未结算');
 const wallet=await a.eval('state.wallet');await a.eval("AIPractice.rematch();AIPractice.rematch();'ok'");await until(async()=>await a.eval("state.room?.phase==='move'&&state.room?.hasOpponent"),'再来一局未启动');assert.equal(await a.eval('state.room.mode'),'guessMove');assert.equal(await a.eval('state.wallet'),wallet,'再来一局不得改变已结算钱包');
 await a.eval('AIPractice.stop();document.querySelector(".app-scroll").scrollTop=300');assert.ok(await a.eval('document.querySelector(".app-scroll").scrollTop')>0,'测试需要可滚动区域');await a.eval('navHome()');assert.equal(await a.eval('document.querySelector(".app-scroll").scrollTop'),0,'返回大厅应滚动到顶部');
 console.log('通过：AI 表情隔离、重复再战、钱包与固定布局导航。');a.ws.close();
`;
const file='test-v45-integration-generated.mjs';try{writeFileSync(file,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[file],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(file)}catch{}}
