import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('test-peer.mjs','utf8'),start=source.indexOf('try{const [u1,u2]'),end=source.indexOf('}finally{for(const p of processes)',start);
if(start<0||end<0)throw Error('Cannot locate browser harness');
const head=source.slice(0,start).replace("awaitPromise:true,returnByValue:true","awaitPromise:true,returnByValue:true,userGesture:true");
const scenario=`try{
const a=await connect(await spawnBrowser(39281));await until(async()=>await a.eval('typeof musicModal === "function"'),'界面未加载');
assert.equal(await a.eval("localStorage.getItem('guess_music_v1')"),'warm','新用户应默认新钢琴曲');
await a.eval("chooseMusic('pixel')");await until(async()=>await a.eval('GameAudio.getCurrent()?.readyState>=2'),'像素曲未加载');assert.ok((await a.eval('GameAudio.getCurrent().src')).endsWith('/pixel-menu.mp3'));
await a.eval("chooseMusic('warm')");await until(async()=>await a.eval('GameAudio.getCurrent()?.readyState>=2'),'钢琴曲未加载');
assert.ok((await a.eval('GameAudio.getCurrent().src')).endsWith('/bright-piano.mp3'));
await a.eval("chooseMusic('adventure')");await until(async()=>await a.eval('GameAudio.getCurrent()?.readyState>=2'),'冒险曲未加载');
assert.ok((await a.eval('GameAudio.getCurrent().src')).endsWith('/sunny-adventure.mp3'));
await a.eval("localStorage.setItem('guess_music_v1','overworld');localStorage.removeItem('guess_music_refresh_v2');localStorage.setItem('guess_volume_v1','23');setTimeout(()=>location.reload(),20);'ok'");
await until(async()=>await a.eval("localStorage.getItem('guess_music_refresh_v2')==='1' && localStorage.getItem('guess_music_v1')==='warm'"),'旧音乐未迁移');
assert.equal(await a.eval("localStorage.getItem('guess_volume_v1')"),'23','更新不能更改音量');
await a.eval("localStorage.setItem('guess_music_v1','happy');localStorage.removeItem('guess_music_refresh_v2');setTimeout(()=>location.reload(),20);'ok'");
await until(async()=>await a.eval("localStorage.getItem('guess_music_refresh_v2')==='1' && localStorage.getItem('guess_music_v1')==='adventure'"),'第二首旧音乐未迁移');
await a.eval("localStorage.setItem('guess_music_v1','off');localStorage.removeItem('guess_music_refresh_v2');setTimeout(()=>location.reload(),20);'ok'");
await until(async()=>await a.eval("localStorage.getItem('guess_music_refresh_v2')==='1' && localStorage.getItem('guess_music_v1')==='off'"),'关闭音乐的用户不应自动开启');
console.log('通过：两首新音乐实际加载、旧选择迁移、关闭状态和音量保留。');a.ws.close();
`;
const generated='test-music-generated.mjs';try{writeFileSync(generated,head+scenario+source.slice(end));const r=spawnSync(process.execPath,[generated],{stdio:'inherit'});process.exitCode=r.status??1}finally{try{unlinkSync(generated)}catch{}}
