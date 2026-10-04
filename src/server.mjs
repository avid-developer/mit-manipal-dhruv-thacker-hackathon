import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EventModel,analyze,SignalStore} from './engine.mjs';
import {stressPortfolio} from './stress.mjs';
import {pollSources} from './ingest.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const load=async name=>JSON.parse(await readFile(path.join(root,'data',name+'.json'),'utf8'));
const model=new EventModel(await load('training')),portfolio=await load('portfolio'),store=new SignalStore();
let liveStatus=[],lastPoll=0,pendingPoll=null;
const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.mp4':'video/mp4','.md':'text/plain'};
function send(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(type==='application/json'&&!Buffer.isBuffer(body)?JSON.stringify(body):body);}
async function body(req){let text='';for await(const c of req){text+=c;if(text.length>100000)throw new Error('Request too large');}return JSON.parse(text||'{}');}
const server=http.createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(req.method==='POST'){
   if(req.headers.origin && !['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return send(res,403,{error:'Origin not allowed'});
   if(!(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'Use application/json'});
  }
  if(pathname==='/api/health')return send(res,200,{status:'ok',engine:'SignalHarbor 1.0.0',training_rows:model.rows,live_sources:2});
  if(pathname==='/api/signals'&&req.method==='GET')return send(res,200,{signals:store.signals,duplicates:store.duplicates,sources:liveStatus});
  if(pathname==='/api/analyze'&&req.method==='POST'){const data=await body(req);const signal=analyze(model,data);const added=store.add(signal);return send(res,200,{signal,added,stress:signal.stress_triggered?stressPortfolio(portfolio,signal):null});}
  if(pathname==='/api/stress'&&req.method==='POST'){const data=await body(req);const signal=store.signals.find(s=>s.id===data.signal_id);if(!signal)throw new Error('Unknown signal_id');return send(res,200,stressPortfolio(portfolio,signal,data.overrides||{}));}
  if(pathname==='/api/poll'&&req.method==='POST'){
   if(!pendingPoll&&Date.now()-lastPoll>=60000){lastPoll=Date.now();pendingPoll=pollSources().then(results=>{liveStatus=results.map(({records,...r})=>({...r,count:records.length}));for(const source of results)for(const record of source.records){try{store.add(analyze(model,record));}catch(e){liveStatus.find(s=>s.id===source.id).validation_error=e.message;}}}).finally(()=>{pendingPoll=null;});}
   if(pendingPoll)await pendingPoll;
   return send(res,200,{signals:store.signals,sources:liveStatus,duplicates:store.duplicates,next_poll_seconds:Math.max(0,Math.ceil((60000-Date.now()+lastPoll)/1000))});
  }
  if(pathname.startsWith('/api/'))return send(res,404,{error:'Unknown API route'});
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
  const relative=decodeURIComponent(pathname==='/'?'/index.html':pathname).slice(1);
  if(!/^(index\.html|styles\.css|app\.mjs|src\/(engine|stress)\.mjs|data\/[a-z_-]+\.json|docs\/[a-z0-9_.-]+\.(pdf|png|svg|mp4|md))$/.test(relative))return send(res,404,{error:'Not found'});
  const data=await readFile(path.join(root,relative));return send(res,200,data,mime[path.extname(relative)]||'application/octet-stream');
 }catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Not found':e.message});}
});
server.listen(port,host,()=>console.log('SignalHarbor running at http://'+host+':'+port+' (synthetic replay by default)'));
