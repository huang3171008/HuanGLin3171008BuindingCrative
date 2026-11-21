await import('../prepare-assets.mjs');
import {cp,mkdir} from 'node:fs/promises';
await mkdir('GuessingArena/web',{recursive:true});await cp('../android/assets','GuessingArena/web',{recursive:true});console.log('已同步共享游戏界面和素材。');
