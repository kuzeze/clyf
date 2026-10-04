import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    let name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(name==='/')name='/clyf-forearm-battery.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep))throw Error('Forbidden');
    const info=await stat(file);if(!info.isFile())throw Error('Not found');
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(match&&(match[1]||match[2])){
        if(!match[1])start=Math.max(0,info.size-Number(match[2]));
        else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      }else start=-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;}
      headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;status=206;
    }
    res.writeHead(status,{...headers,'Content-Length':Math.max(0,end-start+1)});
    if(req.method==='HEAD'||info.size===0){res.end();return;}
    const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{if(!res.headersSent)res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(8094,'127.0.0.1',()=>console.log('CLYF: http://127.0.0.1:8094/'));
