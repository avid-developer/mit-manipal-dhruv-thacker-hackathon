import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {EventModel,analyze} from './engine.mjs';
const root=new URL('../',import.meta.url);
const training=JSON.parse(await readFile(new URL('data/training.json',root),'utf8'));
const evaluation=JSON.parse(await readFile(new URL('data/evaluation.json',root),'utf8'));
const model=new EventModel(training);let correct=0;const confusion={};const predictions=[];
for(const item of evaluation){const p=model.predict(item.text);correct+=p.event===item.event;confusion[item.event]??={};confusion[item.event][p.event]=(confusion[item.event][p.event]||0)+1;predictions.push({id:item.id,text:item.text,expected:item.event,predicted:p.event,confidence:p.confidence});}
const times=[];for(let i=0;i<1000;i++){const t=performance.now();analyze(model,{text:evaluation[i%evaluation.length].text,source_type:'news',synthetic:true});times.push(performance.now()-t);}times.sort((a,b)=>a-b);
const perClass=model.classes.map(c=>{const tp=confusion[c]?.[c]||0,fp=Object.entries(confusion).filter(([k])=>k!==c).reduce((s,[,v])=>s+(v[c]||0),0),fn=Object.entries(confusion[c]||{}).filter(([k])=>k!==c).reduce((s,[,v])=>s+v,0);return {event:c,precision:tp/(tp+fp)||0,recall:tp/(tp+fn)||0,f1:2*tp/(2*tp+fp+fn)||0};});
const report={evaluated_at:new Date().toISOString(),training_examples:training.length,evaluation_examples:evaluation.length,correct,accuracy:correct/evaluation.length,macro_f1:perClass.reduce((s,x)=>s+x.f1,0)/perClass.length,majority_class_baseline:1/model.classes.length,latency_ms:{median:times[500],p95:times[950],runs:times.length},environment:{node:process.version,platform:process.platform,arch:process.arch},limitations:'Small synthetic diagnostic set authored for this project; not evidence of real-world predictive accuracy. Latency excludes network, UI, and training. Impact scores and sentiment lack a labeled external benchmark.',per_class:perClass,confusion,predictions};
await writeFile(new URL('data/evaluation_results.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,predictions:undefined,confusion:undefined,per_class:undefined},null,2));
