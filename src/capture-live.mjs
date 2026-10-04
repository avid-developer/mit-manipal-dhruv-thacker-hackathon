import {writeFile} from 'node:fs/promises';
import {pollSources} from './ingest.mjs';
const sources=await pollSources();
const snapshot={captured_at:new Date().toISOString(),purpose:'Public-source ingestion audit; default replay uses separate fictional fixtures.',sources};
await writeFile(new URL('../data/live_snapshot.json',import.meta.url),JSON.stringify(snapshot,null,2));
for(const s of sources)console.log(s.id+': '+s.status+', '+s.records.length+' records'+(s.error?' ('+s.error+')':''));
if(sources.some(s=>s.status!=='ok'))process.exitCode=1;
