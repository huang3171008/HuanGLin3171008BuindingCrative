/* Replace assets/sfx/{click,switch,confirm}.mp3 with licensed files when available. */
window.GameAudio=(()=>{
 const tracks={warm:'/assets/music/bright-piano.mp3',adventure:'/assets/music/sunny-adventure.mp3',overworld:'/assets/music/overworld.mp3',happy:'/assets/music/happy-loop.mp3'};
 // Migrate old choices once so an update actually plays the new music.
 if(localStorage.getItem('guess_music_refresh_v2')!=='1'){
  const old=localStorage.getItem('guess_music_v1');
  if(old===null||old==='overworld')localStorage.setItem('guess_music_v1','warm');
  else if(old==='happy')localStorage.setItem('guess_music_v1','adventure');
  localStorage.setItem('guess_music_refresh_v2','1');
 }
 const effects={click:'/assets/sfx/click.mp3',switch:'/assets/sfx/switch.mp3',confirm:'/assets/sfx/confirm.mp3'};
 let ctx=null,current=null,track='off',music=Number(localStorage.getItem('guess_volume_v1')??35)/100,sfx=Number(localStorage.getItem('guess_sfx_volume_v1')??45)/100,sfxOn=localStorage.getItem('guess_sfx_on_v1')!=='false',musicOn=localStorage.getItem('guess_music_on_v1')!=='false',fade=0,resumeAfterVisibility=false;const buffers={};
 music=Number.isFinite(music)?Math.max(0,Math.min(1,music)):.35;sfx=Number.isFinite(sfx)?Math.max(0,Math.min(1,sfx)):.45;
 async function unlock(){try{const C=window.AudioContext||window.webkitAudioContext;if(C&&!ctx){ctx=new C();for(const [name,url] of Object.entries(effects))fetch(url).then(r=>{if(!r.ok)throw Error('missing');return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).then(b=>buffers[name]=b).catch(()=>{})}if(ctx?.state==='suspended')await ctx.resume()}catch{}}
 async function playEffect(name){if(!sfxOn||!sfx||document.hidden)return;await unlock();if(!ctx||ctx.state!=='running')return;try{const gain=ctx.createGain();gain.gain.setValueAtTime(sfx*.22,ctx.currentTime);gain.connect(ctx.destination);if(buffers[name]){const source=ctx.createBufferSource();source.buffer=buffers[name];source.connect(gain);source.start();return}const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(name==='confirm'?920:name==='switch'?680:790,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(name==='confirm'?660:510,ctx.currentTime+.075);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.11);o.connect(gain);o.start();o.stop(ctx.currentTime+.12)}catch{}}
 async function choose(name){if(name!=='off'&&!tracks[name])return;track=name;localStorage.setItem('guess_music_v1',name);clearInterval(fade);const old=current;if(name==='off'){current=null;if(old){old.pause();old.src=''}return}const next=new Audio(tracks[name]);next.loop=true;next.volume=0;current=next;try{if(!document.hidden&&musicOn)await next.play();let elapsed=0;fade=setInterval(()=>{elapsed+=50;const f=Math.min(1,elapsed/400);next.volume=musicOn?music*f:0;if(old)old.volume=music*(1-f);if(f>=1){clearInterval(fade);if(old){old.pause();old.src=''}}},50)}catch{if(old){old.pause();old.src=''}throw Error('音乐播放失败，请再次点击曲目')}}
 function setMusic(v){music=Math.max(0,Math.min(1,Number(v)/100||0));localStorage.setItem('guess_volume_v1',String(Math.round(music*100)));if(current)current.volume=musicOn?music:0}
 function setSfx(v){sfx=Math.max(0,Math.min(1,Number(v)/100||0));localStorage.setItem('guess_sfx_volume_v1',String(Math.round(sfx*100)))}
 function setMusicOn(on){musicOn=!!on;localStorage.setItem('guess_music_on_v1',String(musicOn));if(current){current.volume=musicOn?music:0;if(musicOn&&!document.hidden)current.play().catch(()=>{});else current.pause()}}
 function setSfxOn(on){sfxOn=!!on;localStorage.setItem('guess_sfx_on_v1',String(sfxOn))}
 document.addEventListener('pointerdown',()=>{unlock();if(track!=='off'&&musicOn&&!current)choose(track).catch(()=>{})},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeAfterVisibility=!!current&&!current.paused;current?.pause();ctx?.suspend().catch(()=>{})}else if(resumeAfterVisibility&&current&&musicOn){current.play().catch(()=>{});resumeAfterVisibility=false}});
 track=localStorage.getItem('guess_music_v1')||'off';if(!tracks[track])track='off';
 return {unlock,playEffect,choose,setMusic,setSfx,setMusicOn,setSfxOn,getMusic:()=>Math.round(music*100),getSfx:()=>Math.round(sfx*100),isMusicOn:()=>musicOn,isSfxOn:()=>sfxOn,getCurrent:()=>current};
})();
