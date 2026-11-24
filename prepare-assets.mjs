import {readFile,writeFile,mkdir,mkdtemp,unlink,rmdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('./shared-web/assets/',import.meta.url));
const files=[
 {path:'music/happy-loop.mp3',url:'https://opengameart.org/sites/default/files/happy%20loop.mp3',sha:'7b6e22617a7a21121ce5a81b4d6cc66390d8d0e7b660bdf0f5be4f8a09af5f4e'},
 {path:'music/overworld.mp3',url:'https://opengameart.org/sites/default/files/overworld.mp3',sha:'d32949f8467ac463a52ca88ed250e505545bc98a46e4e472c1f994bf447a1beb'}
];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const item of files){const dest=join(root,item.path);let exists=false;try{exists=hash(await readFile(dest))===item.sha}catch{}if(exists)continue;console.log('下载素材：'+item.path);const response=await fetch(item.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('素材下载失败：'+item.path+' HTTP '+response.status);let bytes=Buffer.from(await response.arrayBuffer());if(item.member){const dir=await mkdtemp(join(tmpdir(),'guess-material-')),archive=join(dir,'asset.zip');try{await writeFile(archive,bytes);const r=spawnSync('tar',['-xOf',archive,item.member],{maxBuffer:8*1024*1024});if(r.status!==0)throw Error('无法解压开源素材');bytes=r.stdout}finally{await unlink(archive).catch(()=>{});await rmdir(dir).catch(()=>{})}}if(hash(bytes)!==item.sha)throw Error('素材校验不匹配：'+item.path);await mkdir(dirname(dest),{recursive:true});const tmp=dest+'.tmp';await writeFile(tmp,bytes);await rename(tmp,dest)}console.log('开源素材已就绪。');
