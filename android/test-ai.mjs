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
 await a.eval("api('leave')");assert.equal(await a.eval('state.room'),null);
}
assert.equal(await a.eval('readHistory().length'),12);assert.equal(await a.eval("JSON.parse(localStorage.getItem('direct_coin_history_v1')||'[]').length"),0);
await a.eval('AIPractice.stop()');assert.equal(await a.eval('state.wallet'),4321);console.log('通过：三档陪练及三种玩法，十回合与独立钱包、账本隔离。');a.ws.close();
`;
const generated='test-ai-generated.mjs';try{writeFileSync(generated,source.slice(0,start)+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
