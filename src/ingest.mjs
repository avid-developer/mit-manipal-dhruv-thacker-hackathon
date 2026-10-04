import {stripVTControlCharacters} from 'node:util';
export const SOURCES={
 fed:{name:'Federal Reserve press releases',type:'news',url:'https://www.federalreserve.gov/feeds/press_all.xml'},
 hn:{name:'Hacker News community stories',type:'social',url:'https://hn.algolia.com/api/v1/search_by_date?query=bank&tags=story&hitsPerPage=12'}
};
export function clean(text='') {
 return stripVTControlCharacters(String(text).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(+n,0x10ffff))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()).slice(0,12000);
}
export function parseFeed(id,payload) {
 const s=SOURCES[id]; if(!s) throw new Error('Unknown source');
 if(id==='hn') {
  const data=JSON.parse(payload); if(!Array.isArray(data.hits)) throw new Error('Unexpected HN response');
  return data.hits.filter(h=>h.title).map(h=>({text:clean(h.title),source:s.name,source_type:s.type,source_url:'https://news.ycombinator.com/item?id='+encodeURIComponent(h.objectID),published_at:h.created_at,synthetic:false}));
 }
 const items=[...payload.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].slice(0,12);
 if(!items.length) throw new Error('No RSS items returned');
 return items.map(([item])=>{
  const get=tag=>clean((item.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'))||[])[1]||'');
  return {text:[get('title'),get('description')].filter(Boolean).join('. ').slice(0,12000),source:s.name,source_type:s.type,source_url:get('link'),published_at:get('pubDate'),synthetic:false};
 });
}
async function fetchBounded(url) {
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'SignalHarbor/1.0 (educational research prototype)'}});
 if(!response.ok) throw new Error('Source returned HTTP '+response.status);
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000)throw new Error('Source response exceeds 1.5 MB limit');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function pollSources() {
 return Promise.all(Object.entries(SOURCES).map(async([id,s])=>{
  const checked_at=new Date().toISOString();
  try {const records=parseFeed(id,await fetchBounded(s.url));return {id,name:s.name,status:'ok',checked_at,records};}
  catch(e){return {id,name:s.name,status:'error',checked_at,error:e.message,records:[]};}
 }));
}
