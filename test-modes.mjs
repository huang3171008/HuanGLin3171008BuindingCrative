import {webcrypto as crypto} from 'node:crypto';
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({crypto});let source=readFileSync(process.env.GAME_ENGINE||'android/assets/assets/engine.js','utf8');if(source.includes('async function hash('))source=source.slice(source.indexOf('const MOVE ='),source.indexOf('async function hash('));vm.runInContext(source+'\nthis.engine={mutate,sanitize,wins};',ctx);const {mutate,sanitize}=ctx.engine;
let now=Date.now();function init(mode){const world={players:{},rooms:{}};function act(id,body){return mutate(world,id,body,++now)}act('a',{action:'state'});act('b',{action:'state'});act('a',{action:'create',mode});const code=world.players.a.room;act('b',{action:'join',code});return {world,room:world.rooms[code],act}}
{
 const {world,room,act}=init('normal');
 act('a',{action:'move',round:1,move:'rock',tier:10,stake:10});act('b',{action:'move',round:1,move:'scissors',tier:10,stake:10});
 assert.equal(room.round,2);assert.throws(()=>act('a',{action:'move',round:1,move:'rock',tier:10,stake:10}),/回合/,'旧回合的重复出拳不能进入下一回合');
}
console.log('旧回合重复请求保护通过。');
const all=['rock','scissors','paper'],wins=(a,b)=>a===b?0:({rock:'scissors',scissors:'paper',paper:'rock'}[a]===b?1:-1);
for(const a of all)for(const b of all){const {world,room,act}=init('normal');act('a',{action:'move',round:1,move:a,tier:20,stake:25});act('b',{action:'move',round:1,move:b,tier:10,stake:10});let outcome=wins(a,b);assert.equal(world.players.a.wallet,5000-20+outcome*50);assert.equal(world.players.b.wallet,5000-10-outcome*10);assert.deepEqual(Array.from(room.last.fees),[20,10]);}
for(const a of all)for(const b of all)for(const ga of all)for(const gb of all){const {world,room,act}=init('guessMove');act('a',{action:'move',round:1,move:a,stake:10});assert.equal(sanitize(world,'b').room.players[0].move,undefined);act('b',{action:'move',round:1,move:b,stake:20});act('a',{action:'guess',round:1,guess:ga});assert.equal(sanitize(world,'b').room.players[0].guess,undefined);act('b',{action:'guess',round:1,guess:gb});let ca=ga===b,cb=gb===a,o=wins(a,b),da=o*20,db=-o*40;if(ca!==cb){if(ca){da+=20;db-=20}else{da-=10;db+=10}}else{da-=10;db-=20}assert.equal(world.players.a.wallet,5000+da);assert.equal(world.players.b.wallet,5000+db);assert.equal(room.phase,'finished');assert.equal(room.last.handChanges[0]+room.last.guessChanges[0],da)}
for(const a of all)for(const b of all)for(const ga of ['win','lose'])for(const gb of ['win','lose']){const {world,room,act}=init('guessOutcome');act('a',{action:'move',round:1,move:a,stake:10});act('b',{action:'move',round:1,move:b,stake:20});act('a',{action:'guess',round:1,guess:ga});act('b',{action:'guess',round:1,guess:gb});const o=wins(a,b);let da=o*20,db=-o*40;if(o){let ca=ga===(o===1?'win':'lose'),cb=gb===(o===-1?'win':'lose');if(ca!==cb){if(ca){da+=20;db-=20}else{da-=10;db+=10}}else{da-=10;db-=20}}assert.equal(world.players.a.wallet,5000+da);assert.equal(world.players.b.wallet,5000+db);if(!o)assert.equal(room.last.correct,null)}
{
 const {world,room,act}=init('normal');for(let i=0;i<2;i++){act('a',{action:'move',round:i+1,move:'rock',tier:30,stake:1});act('b',{action:'move',round:i+1,move:'rock',tier:10,stake:1})}assert.throws(()=>act('a',{action:'move',round:3,move:'rock',tier:30,stake:1}),/最多选择两次/);assert.throws(()=>act('a',{action:'move',round:3,move:'rock',tier:10,stake:999999}),/投入过高/);
}
console.log('通过：普通模式9种手势、竞猜手势81种组合、竞猜输赢36种组合、保密与投注边界。');
// Final-round settlement: positive winner, mixed sign, both negative and tie.
for(const c of [
 {a:100,b:40,bonus:[20,-20]}, {a:0,b:0,bonus:[0,0]}, {a:100,b:-30,bonus:[100,0]},
 {a:-30,b:70,bonus:[0,70]}, {a:-30,b:-70,bonus:[0,0]}, {a:70,b:70,bonus:[0,0]}
]){const world={players:{a:{wallet:5000},b:{wallet:5000}}},room={players:[{id:'a',net:c.a},{id:'b',net:c.b}],last:{}};vm.runInContext('this.finish=finishNormal',ctx);ctx.finish(world,room);assert.deepEqual(Array.from(room.last.final.bonus),c.bonus);assert.equal(world.players.a.wallet,5000+c.bonus[0]);assert.equal(world.players.b.wallet,5000+c.bonus[1]);assert.equal(room.phase,'finished')}
console.log('通过：10 回合最终结算的正数、负数、平局与奖励分支。');
