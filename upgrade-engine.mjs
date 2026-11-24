import fs from 'node:fs';
for(const p of ['android/assets/assets/engine.js','game/src/worker.js']){
 let s=fs.readFileSync(p,'utf8');s=s.replace("const NAMES = ['小狐狸','小熊','小兔子','小熊猫'];", "const NAMES = ['小狐狸','小熊','小兔子','小熊猫','机器人','外星人','宇航员','魔法师','小猫','画家'];");
 s=s.replace(" r.last={round:r.round,moves:[a.move,b.move],outcome,changes};", " r.last={round:r.round,moves:[a.move,b.move],outcome,changes,fees:[a.tier,b.tier],stakes:[a.stake,b.stake]};");
 s=s.replace(" let correct;\n if(r.mode==='guessMove')", " const handChanges=[...changes];\n let correct;\n if(r.mode==='guessMove')");
 s=s.replace("r.last={round:1,moves:[a.move,b.move],outcome,guesses:[a.guess,b.guess],correct,stakes:[a.stake,b.stake],changes};", "r.last={round:1,moves:[a.move,b.move],outcome,guesses:[a.guess,b.guess],correct,stakes:[a.stake,b.stake],handChanges,guessChanges:changes.map((v,i)=>v-handChanges[i]),changes};");
 s=s.replace(" if(action==='move'){\n  if(r.phase", " if(action==='move'){\n  if(body.round!==undefined&&body.round!==r.round)err('回合已变化，请重新选择');\n  if(r.phase");
 s=s.replace(" if(action==='guess'){\n  if(r.phase", " if(action==='guess'){\n  if(body.round!==undefined&&body.round!==r.round)err('回合已变化，请重新选择');\n  if(r.phase");
 fs.writeFileSync(p,s);
}
let p='android/assets/assets/p2p.js',s=fs.readFileSync(p,'utf8');s=s.replace("try{if(!peer.ready){", "try{if((action==='move'||action==='guess')&&Number.isInteger(state?.room?.round))data={...data,round:state.room.round};if(!peer.ready){");s=s.replace('m.character>3','m.character>=NAMES.length');s=s.replace("'GUESS1.'+btoa", "'GUESS2.'+btoa");s=s.replace("if(!s.startsWith('GUESS1.')||s.length>20000)throw Error('连接信息格式不正确');", "if(s.startsWith('GUESS1.'))throw Error('双方需要安装新版应用才能连接');if(!s.startsWith('GUESS2.')||s.length>20000)throw Error('连接信息格式不正确');");fs.writeFileSync(p,s);
p='android/src/com/huanglin1008/guessing/LanBridge.java';s=fs.readFileSync(p,'utf8').replaceAll('GUESS1.','GUESS2.');fs.writeFileSync(p,s);
p='android/test-peer.mjs';s=fs.readFileSync(p,'utf8').replaceAll('GUESS1.','GUESS2.');fs.writeFileSync(p,s);
