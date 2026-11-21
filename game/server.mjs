import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {Readable} from 'node:stream';
import worker from './dist/worker.mjs';
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1',dir=resolve(process.env.GAME_DATA_DIR||'./data');
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT 应为 1 到 65535 的整数');
mkdirSync(dir,{recursive:true});const sqlite=new DatabaseSync(resolve(dir,'game.sqlite'));
sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS game_world (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL); INSERT OR IGNORE INTO game_world (id, version, data) VALUES (1, 0, '{"players":{},"rooms":{}}');`);
const DB={prepare(query){let params=[];return {bind(...args){params=args;return this},async first(){return sqlite.prepare(query).get(...params)??null},async run(){const result=sqlite.prepare(query).run(...params);return {meta:{changes:Number(result.changes)}}}}}};
const server=http.createServer(async(req,res)=>{try{
 if(req.headers['content-length']&&Number(req.headers['content-length'])>32768){res.writeHead(413).end('Request too large');return}
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413).end('Request too large');return}chunks.push(chunk)}
 const method=req.method||'GET',headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
 const options={method,headers};if(!['GET','HEAD'].includes(method)){options.body=Buffer.concat(chunks);options.duplex='half'}
 const request=new Request('http://localhost'+(req.url||'/'),options),response=await worker.fetch(request,{DB});
 res.writeHead(response.status,Object.fromEntries(response.headers));if(!response.body){res.end();return}Readable.fromWeb(response.body).pipe(res);
 }catch(e){console.error('请求处理失败:',e.message);if(!res.headersSent)res.writeHead(500,{'content-type':'text/plain; charset=utf-8'});res.end('服务暂时不可用')}});
server.listen(port,host,()=>console.log(`游戏服务已启动：http://${host}:${port}，数据库目录：${dir}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{sqlite.close();process.exit(0)}));
