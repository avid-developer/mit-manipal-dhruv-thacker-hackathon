/** Shared browser/Node NLP engine. No network calls or generated prose. */
export const VERSION = '1.0.0';
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = (x, n=3) => Number(x.toFixed(n));
const STOP = new Set('a an the and or of to in on at by for with from is are was were be been this that as it its have has will company says said new'.split(' '));
export function tokens(text) {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []).filter(t => !STOP.has(t));
}
function features(text) {
  const t=tokens(text); return [...t, ...t.slice(1).map((v,i)=>t[i]+' '+v)];
}
export class EventModel {
  constructor(rows) {
    this.classes=[...new Set(rows.map(r=>r.event))].sort(); this.vocab=new Set(); this.stats={};
    for(const c of this.classes) this.stats[c]={count:0, total:0, words:{}};
    for(const row of rows) {
      const s=this.stats[row.event]; s.count++;
      for(const word of features(row.text)) {this.vocab.add(word); s.words[word]=(s.words[word]||0)+1; s.total++;}
    }
    this.rows=rows.length;
  }
  predict(text) {
    const observed=features(text).filter(t=>this.vocab.has(t));
    const scored=this.classes.map(event=>{
      const s=this.stats[event]; const denominator=s.total+this.vocab.size*0.5;
      const contributions=observed.map(token=>({token, logp:Math.log(((s.words[token]||0)+0.5)/denominator)}));
      const score=Math.log(s.count/this.rows)+contributions.reduce((a,x)=>a+x.logp,0);
      return {event,score};
    }).sort((a,b)=>b.score-a.score);
    const max=scored[0].score;
    const total=scored.reduce((s,x)=>s+Math.exp(x.score-max),0);
    const distribution=scored.map(x=>({event:x.event, probability:round(Math.exp(x.score-max)/total)}));
    const best=scored[0].event, competitor=scored[1].event;
    const evidence=[...new Set(observed)].map(token=>{
      const a=this.stats[best], b=this.stats[competitor];
      return {token, contribution:round(Math.log(((a.words[token]||0)+0.5)/(a.total+this.vocab.size*0.5))-Math.log(((b.words[token]||0)+0.5)/(b.total+this.vocab.size*0.5)))};
    }).filter(x=>x.contribution>0).sort((a,b)=>b.contribution-a.contribution).slice(0,5);
    const known=tokens(text).filter(t=>this.vocab.has(t)).length;
    const coverage=known/Math.max(tokens(text).length,1);
    const confidence=distribution[0].probability;
    return {event:observed.length<2 || confidence<0.45 || coverage<0.15 ? 'Other':best,confidence,coverage:round(coverage),distribution,evidence};
  }
}
const VALENCE={
  default:-3, defaults:-3, defaulted:-3, bankruptcy:-3, insolvent:-3, insolvency:-3,
  sanctions:-2, war:-3, invasion:-3, conflict:-2, blockade:-3, embargo:-2,
  breach:-2, ransomware:-3, outage:-2, attack:-2, fraud:-3, loss:-2, losses:-2,
  downgrade:-2, downgraded:-2, recession:-2, layoffs:-2, contraction:-2, disruption:-2,
  missed:-2, crisis:-3, halt:-2, halted:-2, plunges:-2, slump:-2, shock:-2,
  inflation:-1, hike:-1, hikes:-1, tightening:-1, fallen:-1, decline:-1,
  growth:1, gains:2, gain:2, profit:2, profits:2, beat:2, beats:2, upgrade:2,
  upgraded:2, strong:1, improves:2, improved:2, approval:1, approved:1, recovery:2,
  launch:1, launches:1, innovation:1, expansion:1, success:2, rises:1, record:1,
  acquisition:0, merger:0, stable:0, unchanged:0
};
const NEGATION=new Set(['not','no','never','without','denies','denied','deny']);
export function sentiment(text) {
  const t=text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?|[.!?;,]/g)||[];
  let sum=0; const evidence=[];
  for(let i=0;i<t.length;i++) {
    if(!(t[i] in VALENCE) || VALENCE[t[i]]===0) continue;
    const context=t.slice(Math.max(0,i-3),i);
    const boundary=context.findLastIndex(v=>/[.!?;,]/.test(v));
    const negated=context.slice(boundary+1).some(v=>NEGATION.has(v)||v.endsWith("n't"));
    const weight=VALENCE[t[i]]*(negated?-0.6:1); sum+=weight;
    evidence.push({token:t[i], weight, negated});
  }
  return {score:round(sum/Math.sqrt(sum*sum+15)),evidence};
}
export const ENTITIES={
  'ASTER':['aster bank','aster'], 'CEDAR':['cedar energy','cedar'],
  'MERIDIAN':['meridian manufacturing','meridian'], 'HARBOR':['harbor logistics','harbor'],
  'ATLAS':['atlas technology','atlas']
};
export function normalizeText(text) {return text.toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
export function fingerprint(text) {
  let h=2166136261; for(const c of normalizeText(text)) {h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return (h>>>0).toString(16).padStart(8,'0');
}
const BASE={'Geopolitical':6,'Macroeconomic':5,'Credit Event':6,'Merger/Acquisition':3,'Product Launch':2,'Cyber/Operational':5,'Other':1};
const SEVERE=new Set(['default','defaults','defaulted','bankruptcy','insolvency','war','invasion','blockade','ransomware','crisis']);
export function analyze(model, record, now=new Date()) {
  if(!record || typeof record.text!=='string' || record.text.trim().length<3 || record.text.length>12000) throw new Error('Text must contain 3 to 12,000 characters.');
  if(!['news','social','manual'].includes(record.source_type)) throw new Error('source_type must be news, social, or manual.');
  const text=record.text.trim(), prediction=model.predict(text), tone=sentiment(text), lower=text.toLowerCase();
  const entities=Object.entries(ENTITIES).filter(([,aliases])=>aliases.some(a=>new RegExp('\\b'+a+'\\b').test(lower))).map(([id])=>id);
  const uncertain=/\b(rumou?r|unconfirmed|alleged|reportedly|might|could|possibly|denies|denied|hypothetical)\b/i.test(text);
  const severe=tone.evidence.some(x=>SEVERE.has(x.token)&&!x.negated);
  let impact=clamp(Math.round(BASE[prediction.event]+Math.abs(tone.score)*2+(severe?2:0)),1,10);
  if(uncertain) impact=Math.min(impact,7);
  const published=new Date(record.published_at||now);
  if(Number.isNaN(published.valueOf())) throw new Error('published_at must be a valid date.');
  const ageHours=(now-published)/36e5;
  const stale=ageHours>72, future=ageHours< -0.1;
  const review=uncertain||prediction.confidence<0.6||prediction.coverage<0.25||record.source_type==='social'||stale||future||prediction.event==='Other';
  const reasons=[];
  if(uncertain) reasons.push('Unconfirmed or qualified wording');
  if(record.source_type==='social') reasons.push('Social source requires independent confirmation');
  if(stale) reasons.push('Older than 72 hours'); if(future) reasons.push('Future publication time');
  if(prediction.confidence<0.6||prediction.coverage<0.25) reasons.push('Limited model evidence');
  if(prediction.event==='Other') reasons.push('No supported risk event identified');
  const trigger=impact>7&&tone.score< -0.15&&!review;
  return {
    id:'sig-'+fingerprint(text), text, source:record.source||record.source_type,
    source_type:record.source_type, source_url:record.source_url||null,
    synthetic:record.synthetic===true, published_at:published.toISOString(), processed_at:now.toISOString(),
    entities, sentiment_score:tone.score, event_classification:prediction.event, impact_score:impact,
    model_confidence:prediction.confidence, vocabulary_coverage:prediction.coverage,
    confidence_note:'Uncalibrated model score; not a probability of a market outcome.',
    review_required:review, review_reasons:reasons, stress_triggered:trigger,
    event_evidence:prediction.evidence, sentiment_evidence:tone.evidence,
    event_distribution:prediction.distribution, model_version:VERSION,
    impact_method:'Transparent severity heuristic; not a trained return or loss prediction.'
  };
}
export class SignalStore {
  constructor(limit=500){this.limit=limit;this.signals=[];this.keys=new Set();this.duplicates=0;}
  add(signal){const key=normalizeText(signal.text);if(this.keys.has(key)){this.duplicates++;return false;}this.keys.add(key);this.signals.unshift(signal);if(this.signals.length>this.limit){const removed=this.signals.pop();this.keys.delete(normalizeText(removed.text));}return true;}
}
