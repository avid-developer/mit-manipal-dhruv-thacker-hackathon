/** Deterministic, first-order scenario sensitivities; all amounts USD. */
export const SCENARIOS={
  'Geopolitical':{name:'Trade disruption',rate_bps:75,spread_bps:150,equity_pct:-12,credit_haircut:0.04},
  'Macroeconomic':{name:'Inflation and tightening',rate_bps:200,spread_bps:75,equity_pct:-10,credit_haircut:0.02},
  'Credit Event':{name:'Issuer credit deterioration',rate_bps:25,spread_bps:300,equity_pct:-20,credit_haircut:0.12},
  'Cyber/Operational':{name:'Operational disruption',rate_bps:0,spread_bps:100,equity_pct:-8,credit_haircut:0.03},
  'Merger/Acquisition':{name:'Integration stress',rate_bps:0,spread_bps:50,equity_pct:-5,credit_haircut:0.01},
  'Product Launch':{name:'Execution risk',rate_bps:0,spread_bps:25,equity_pct:-3,credit_haircut:0.005},
  'Other':{name:'No mapped event',rate_bps:0,spread_bps:0,equity_pct:0,credit_haircut:0}
};
export function stressPortfolio(portfolio,signal,overrides={}) {
  const base=SCENARIOS[signal.event_classification]||SCENARIOS.Other;
  const shock={...base,...overrides};
  for(const [k,lo,hi] of [['rate_bps',-500,500],['spread_bps',-500,1000],['equity_pct',-100,100],['credit_haircut',0,1]]) if(!Number.isFinite(shock[k])||shock[k]<lo||shock[k]>hi) throw new Error('Invalid scenario parameter: '+k);
  const scale=signal.impact_score/10;
  const issuerScope=['Credit Event','Cyber/Operational','Merger/Acquisition','Product Launch'].includes(signal.event_classification);
  const unmatchedIssuer=issuerScope&&!signal.entities.length;
  const positions=portfolio.map(p=>{
    for(const k of ['market_value','rate_dv01','spread_dv01','equity_exposure','credit_exposure']) if(!Number.isFinite(p[k])) throw new Error('Invalid position '+p.id);
    const exposed=!issuerScope||signal.entities.includes(p.issuer);
    const components={
      rates:exposed?-p.rate_dv01*shock.rate_bps*scale:0,
      spreads:exposed?-p.spread_dv01*shock.spread_bps*scale:0,
      equity:exposed?p.equity_exposure*shock.equity_pct/100*scale:0,
      credit:exposed?-p.credit_exposure*shock.credit_haircut*scale:0
    };
    const pnl=Object.values(components).reduce((a,b)=>a+b,0);
    return {...p,exposed,components,pnl,stressed_value:p.market_value+pnl};
  });
  const before=positions.reduce((s,p)=>s+p.market_value,0),pnl=positions.reduce((s,p)=>s+p.pnl,0);
  return {scenario:shock.name,signal_id:signal.id,shock,scale,before,after:before+pnl,pnl,loss_pct:before? -100*pnl/before:0,
    positions,scope:issuerScope?'Matched issuer only':'Portfolio wide',unmatched_issuer:unmatchedIssuer,
    warning:unmatchedIssuer?'No synthetic issuer matches this event. No issuer shock applied.':null,
    method:'First-order DV01, equity exposure, and separate loan credit haircut. Scenarios are independent, not compounded.'};
}
