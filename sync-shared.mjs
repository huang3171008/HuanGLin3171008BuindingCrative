import './prepare-assets.mjs';
import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const source=join(root,'shared-web');
for(const target of ['android/assets','desktop/app-assets','ios/GuessingArena/web']){
 const dest=join(root,target);await mkdir(dest,{recursive:true});await cp(source,dest,{recursive:true,force:true});
 // Remove only the two retired generated textures; preserve every other asset.
 for(const name of ['clouds.jpg','marble.jpg'])await rm(join(dest,'assets','themes',name),{force:true});
 for(const name of ['overworld.mp3','happy-loop.mp3'])await rm(join(dest,'assets','music',name),{force:true});
}
console.log('shared-web 已同步至 Android、Windows 与 iOS。');
