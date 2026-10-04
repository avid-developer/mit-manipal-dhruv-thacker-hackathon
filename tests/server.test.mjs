import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
test('HTTP serves usable datasets, validates inputs, and reconciles stress',async()=>{
 const child=spawn(process.execPath,['src/server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'18887'},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server start timeout')),8000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exit '+code));});});
  const base='http://127.0.0.1:18887';
  const dataset=await fetch(base+'/data/training.json').then(r=>r.json());assert.ok(Array.isArray(dataset));assert.equal(dataset.length,84);
  const post=(url,data)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const r=await post('/api/analyze',{text:'Aster Bank defaults on debt and files for bankruptcy.',source_type:'news'});assert.equal(r.status,200);const data=await r.json();assert.equal(data.signal.event_classification,'Credit Event');assert.equal(data.stress.before,100000000);
  const stress=await post('/api/stress',{signal_id:data.signal.id,overrides:{rate_bps:0,spread_bps:0,equity_pct:0,credit_haircut:0}}).then(r=>r.json());assert.equal(stress.pnl,0);
  const dup=await post('/api/analyze',{text:'Aster Bank defaults on debt and files for bankruptcy.',source_type:'news'}).then(r=>r.json());assert.equal(dup.added,false);
  assert.equal((await post('/api/analyze',{text:'x',source_type:'news'})).status,400);
  assert.equal((await fetch(base+'/.git/config')).status,404);
  const evil=await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(evil.status,403);
 }finally{child.kill('SIGTERM');}
});
