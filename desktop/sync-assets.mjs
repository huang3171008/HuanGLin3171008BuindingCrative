await import('../prepare-assets.mjs');
import {cp,mkdir} from 'node:fs/promises';await mkdir('app-assets',{recursive:true});await cp('../android/assets','app-assets',{recursive:true});console.log('已同步共享界面和素材。');
