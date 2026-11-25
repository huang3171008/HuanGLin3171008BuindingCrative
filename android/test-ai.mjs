import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const scenario=`try{
const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('typeof practiceModal === "function"'),'页面未加载');
await a.eval("localStorage.setItem('direct_wallet_v1','4321');p2pApi('state',{},true);AIPractice.start('easy')");
assert.equal(await a.eval('state.wallet'),5000);assert.equal(await a.eval("Number(localStorage.getItem('direct_wallet_v1'))"),4321);
for(const [difficulty,mode] of [['easy','normal'],['normal','guessMove'],['hard','guessOutcome']]){
 if(difficulty!=='easy'){await a.eval('AIPractice.stop()');await a.eval(\`AIPractice.start('\${difficulty}')\`)}
 await a.eval(\`api('create',{mode:'\${mode}'})\`);assert.equal(await a.eval('state.room.phase'),'move');
 const rounds=mode==='normal'?10:1;
 for(let i=0;i<rounds;i++){
  await a.eval("api('move',{move:'rock',stake:10,tier:10})");
  if(mode==='normal')await until(async()=>await a.eval(\`state.room.phase==='finished'||state.room.round>\${i+1}\`),'陪练回合未完成');
  else {await until(async()=>await a.eval("state.room.phase==='guess'"),'未进入竞猜');await a.eval(\`api('guess',{guess:'\${mode==='guessMove'?'paper':'win'}'})\`);await until(async()=>await a.eval("state.room.phase==='finished'"),'竞猜未结束')}
 }
 assert.equal(await a.eval("state.room.phase"),'finished');assert.equal(await a.eval("Number(localStorage.getItem('direct_wallet_v1'))"),4321,'陪练不能改变直连钱包');
 if(mode==='normal'){assert.equal(await a.eval("[...document.querySelectorAll('#app button')].some(b=>b.textContent==='生成战绩卡')"),true,'十回合后应显示战绩卡');assert.equal(await a.eval('recap.rounds.length'),10,'战绩卡应记录十个已揭晓回合');await a.eval("HTMLAnchorElement.prototype.click=function(){window.cardDownloaded=this.download};saveRecap();'ok'");await until(async()=>await a.eval("window.cardDownloaded==='猜拳战绩.png'"),'战绩图没有生成');await a.eval("window.AppShare={sharePng(data){window.cardShared=data.startsWith('data:image/png;base64,');return 'ok'}};saveRecap();'ok'");await until(async()=>await a.eval('window.cardShared===true'),'原生分享桥接未收到图片')}
 await a.eval("api('leave')");assert.equal(await a.eval('state.room'),null);
}
assert.equal(await a.eval('readHistory().length'),12);assert.equal(await a.eval("JSON.parse(localStorage.getItem('direct_coin_history_v1')||'[]').length"),0);
const walletBeforeSkill=await a.eval('state.wallet');
for(const diff of ['easy','normal','hard']){
 await a.eval('AIPractice.stop()');await a.eval(\`AIPractice.start('\${diff}')\`);
 await a.eval("setMode('normal');setVariant('skill');createRoom()");
 assert.equal(await a.eval('state.room.variant'),'skill');
 while(await a.eval("state.room.phase!=='finished'")){
  const r=await a.eval('state.room.round');
  await a.eval("(()=>{const me=state.room.players.find(p=>p.isMe),pen=me.sealCost>0?1:0,c=me.hand.find(id=>(SKILL_MAP[id].cost+pen)<=me.energy&&(id!=='16_phantom_swap'||me.hand.length>=2));if(c)toggleSkillCard(c);selectMove('rock');sendMove()})()");
  await until(async()=>await a.eval(\`state.room.phase==='finished'||state.room.round>\${r}\`),'技能陪练回合未完成');
 }
 assert.equal(await a.eval('state.wallet'),walletBeforeSkill,'技能陪练不得修改练习钱包');
 assert.equal(await a.eval('readHistory().length'),12,'技能陪练不得写入金币账本');
 await a.eval("api('leave')");
}
await a.eval('AIPractice.stop()');assert.equal(await a.eval('state.wallet'),4321);console.log('通过：三档陪练及三种经典玩法+技能对战，十回合与独立钱包、账本隔离。');a.ws.close();
`;
const generated='test-ai-generated.mjs';try{writeFileSync(generated,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
