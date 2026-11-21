import {readFile,writeFile,mkdir} from 'node:fs/promises';
const html=await readFile(new URL('src/index.html',import.meta.url),'utf8');
const worker=await readFile(new URL('src/worker.js',import.meta.url),'utf8');
const assets={};for(const id of ['1F98A','1F43B','1F430','1F43C'])assets[id]=await readFile(new URL('src/assets/'+id+'.svg',import.meta.url),'utf8');
if(!worker.includes('__HTML__')||!worker.includes('__ASSETS__'))throw Error('构建占位符缺失');
await mkdir(new URL('dist/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/worker.mjs',import.meta.url),worker.replace('__HTML__',()=>JSON.stringify(html)).replace('__ASSETS__',()=>JSON.stringify(assets)));
console.log('构建完成。');
