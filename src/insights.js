import {supabase} from "./supabase.js";
import {ALL_DEFECTS,URG} from "./constants.js";

/* ═══════════════════════════════════════════════════════════════
   CONFIG DE ALERTAS
   ═══════════════════════════════════════════════════════════════ */
export const DEFAULT_CONFIG={
  a1_enabled:true, a1_min_claims:3, a1_window_days:30,
  a2_enabled:true, a2_min_claims:5, a2_window_days:14,
  a3_enabled:true, a3_multiplier:2.0, a3_min_claims:3, a3_window_days:30,
  a4_enabled:true, a4_silence_days:90, a4_max_monthly_avg:1.0,
  a5_enabled:true, a5_min_cases:3, a5_min_proceed_pct:60,
};

export async function loadAlertConfig(){
  const{data,error}=await supabase.from("alert_config").select("*").eq("id",1).single();
  if(error||!data)return{...DEFAULT_CONFIG};
  return data;
}

export async function saveAlertConfig(cfg,username){
  const payload={...cfg,id:1,updated_at:new Date().toISOString(),updated_by:username};
  delete payload.created_at;
  const{error}=await supabase.from("alert_config").upsert(payload,{onConflict:"id"});
  return!error;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS DE DEFECTOS
   ═══════════════════════════════════════════════════════════════ */
export function claimDefectIds(c){
  const ids=[];
  ALL_DEFECTS.forEach(d=>{
    if(c[`${d.db}_pct`]!==null&&c[`${d.db}_pct`]!==undefined)ids.push(d.id);
  });
  (c.urgent_items||[]).forEach(u=>ids.push(u));
  return ids;
}

export function defectLabel(id){
  const d=ALL_DEFECTS.find(x=>x.id===id);
  if(d)return d.name;
  const u=URG.find(x=>x.id===id);
  if(u)return u.name;
  return id;
}

/* ═══════════════════════════════════════════════════════════════
   VENTANAS DE TIEMPO
   ═══════════════════════════════════════════════════════════════ */
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return d;}
function dateOf(c){return new Date(c.claim_date||c.created_at);}

function inWindow(c,days){
  const d=dateOf(c);
  return d>=daysAgo(days)&&d<=new Date();
}

/* ═══════════════════════════════════════════════════════════════
   MOTOR DE ALERTAS
   Devuelve array de alertas para un claim contra el histórico
   ═══════════════════════════════════════════════════════════════ */
export function computeAlerts({cfg,clientId,defectIds,allClaims,currentClaimId=null}){
  const alerts=[];
  const history=allClaims.filter(c=>c.id!==currentClaimId);
  const clientHistory=history.filter(c=>c.client_id===clientId);
  const now=new Date();

  /* ── A1: Reincidencia del cliente por defecto ── */
  if(cfg.a1_enabled&&clientId&&defectIds.length>0){
    defectIds.forEach(did=>{
      const matches=clientHistory.filter(c=>
        claimDefectIds(c).includes(did)&&inWindow(c,cfg.a1_window_days)
      );
      if(matches.length+1>=cfg.a1_min_claims){
        alerts.push({
          key:"a1",severity:"warning",
          title:"Reincidencia del cliente",
          message:`Este cliente ya tiene ${matches.length} claim(s) por ${defectLabel(did)} en los últimos ${cfg.a1_window_days} días.`,
          metadata:{defect:did,related_ids:matches.map(m=>m.id)},
        });
      }
    });
  }

  /* ── A2: Racha de defecto (transversal) ── */
  if(cfg.a2_enabled&&defectIds.length>0){
    defectIds.forEach(did=>{
      const matches=history.filter(c=>
        claimDefectIds(c).includes(did)&&inWindow(c,cfg.a2_window_days)
      );
      if(matches.length+1>=cfg.a2_min_claims){
        alerts.push({
          key:"a2",severity:"warning",
          title:"Racha de defecto",
          message:`Es el ${matches.length+1}° claim por ${defectLabel(did)} en los últimos ${cfg.a2_window_days} días (todos los clientes). Posible tema de origen.`,
          metadata:{defect:did,related_ids:matches.map(m=>m.id)},
        });
      }
    });
  }

  /* ── A3: Cliente inusualmente activo ── */
  if(cfg.a3_enabled&&clientId&&clientHistory.length>=3){
    const inWin=clientHistory.filter(c=>inWindow(c,cfg.a3_window_days)).length;
    // Promedio del mismo tamaño de ventana sobre todo el histórico
    const first=clientHistory.map(dateOf).sort((a,b)=>a-b)[0];
    const totalDays=Math.max(1,(now-first)/86400000);
    const avg=(clientHistory.length/totalDays)*cfg.a3_window_days;
    if(inWin+1>=cfg.a3_min_claims&&(inWin+1)>=avg*cfg.a3_multiplier&&avg>0){
      alerts.push({
        key:"a3",severity:"danger",
        title:"Cliente inusualmente activo",
        message:`Este cliente lleva ${inWin+1} claims en ${cfg.a3_window_days} días. Promedio histórico: ${avg.toFixed(1)}.`,
        metadata:{recent:inWin+1,avg:parseFloat(avg.toFixed(2))},
      });
    }
  }

  /* ── A4: Cliente tranquilo que reclama ── */
  if(cfg.a4_enabled&&clientId){
    const lastClaimDate=clientHistory.length>0
      ?clientHistory.map(dateOf).sort((a,b)=>b-a)[0]
      :null;
    const daysSinceLast=lastClaimDate?(now-lastClaimDate)/86400000:9999;
    if(clientHistory.length>0){
      const first=clientHistory.map(dateOf).sort((a,b)=>a-b)[0];
      const months=Math.max(1,(now-first)/86400000/30);
      const monthlyAvg=clientHistory.length/months;
      if(daysSinceLast>=cfg.a4_silence_days&&monthlyAvg<=cfg.a4_max_monthly_avg){
        alerts.push({
          key:"a4",severity:"info",
          title:"Cliente tranquilo que reclama",
          message:`Este cliente no había reclamado en ${Math.floor(daysSinceLast)} días. Promedio: ${monthlyAvg.toFixed(1)} claim/mes. Este caso merece atención cuidadosa.`,
          metadata:{silent_days:Math.floor(daysSinceLast),monthly_avg:parseFloat(monthlyAvg.toFixed(2))},
        });
      }
    }
  }

  /* ── A5: Combinación problemática histórica ── */
  if(cfg.a5_enabled&&clientId&&defectIds.length>0){
    defectIds.forEach(did=>{
      const cases=clientHistory.filter(c=>claimDefectIds(c).includes(did));
      if(cases.length>=cfg.a5_min_cases){
        const proceeded=cases.filter(c=>c.concept==="proceeds"||c.concept==="negotiable").length;
        const pct=(proceeded/cases.length)*100;
        if(pct>=cfg.a5_min_proceed_pct){
          alerts.push({
            key:"a5",severity:"warning",
            title:"Combinación problemática histórica",
            message:`Cliente + ${defectLabel(did)}: ${proceeded} de ${cases.length} casos previos procedieron o fueron negociables (${Math.round(pct)}%).`,
            metadata:{defect:did,proceeded,total:cases.length,pct:Math.round(pct),related_ids:cases.map(c=>c.id)},
          });
        }
      }
    });
  }

  return alerts;
}

/* ═══════════════════════════════════════════════════════════════
   GUARDAR ALERTAS DEL CLAIM
   ═══════════════════════════════════════════════════════════════ */
export async function saveClaimInsights(claimId,alerts){
  if(!claimId||alerts.length===0)return;
  const rows=alerts.map(a=>({
    claim_id:claimId,alert_key:a.key,alert_title:a.title,
    alert_message:a.message,severity:a.severity,metadata:a.metadata||null,
  }));
  await supabase.from("claim_insights").insert(rows);
}

export async function getClaimInsights(claimId){
  const{data}=await supabase.from("claim_insights").select("*").eq("claim_id",claimId).order("triggered_at",{ascending:true});
  return data||[];
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS — Cálculos globales
   ═══════════════════════════════════════════════════════════════ */

/* Vista general */
export function overviewStats(claims){
  const total=claims.length;
  const withConcept=claims.filter(c=>c.concept);
  const proc=claims.filter(c=>c.concept==="proceeds").length;
  const nego=claims.filter(c=>c.concept==="negotiable").length;
  const noProc=claims.filter(c=>c.concept==="not_proceeds").length;
  const closed=claims.filter(c=>c.days_to_close!=null);
  const avgClose=closed.length>0
    ?closed.reduce((s,c)=>s+c.days_to_close,0)/closed.length
    :null;
  const avgImpact=claims.filter(c=>c.weighted_impact).reduce((s,c,_,a)=>s+c.weighted_impact/a.length,0);
  return{
    total,
    procRate:withConcept.length>0?Math.round((proc/withConcept.length)*100):0,
    negoRate:withConcept.length>0?Math.round((nego/withConcept.length)*100):0,
    noProcRate:withConcept.length>0?Math.round((noProc/withConcept.length)*100):0,
    avgClose:avgClose?Math.round(avgClose*10)/10:null,
    avgImpact:Math.round(avgImpact*10)/10,
    proc,nego,noProc,resolved:withConcept.length,
  };
}

/* Claims por mes */
export function claimsByMonth(claims){
  const map={};
  for(let m=0;m<12;m++)map[m]={m,count:0,proc:0,nego:0,noProc:0};
  claims.forEach(c=>{
    const d=new Date(c.claim_date||c.created_at);
    const m=d.getMonth();
    if(map[m]){
      map[m].count++;
      if(c.concept==="proceeds")map[m].proc++;
      else if(c.concept==="negotiable")map[m].nego++;
      else if(c.concept==="not_proceeds")map[m].noProc++;
    }
  });
  return Object.values(map);
}

/* Ranking por cliente */
export function byClient(claims){
  const map={};
  claims.forEach(c=>{
    const key=c.client_id||"unknown";
    if(!map[key])map[key]={id:key,name:c.clients?.name||"Sin cliente",total:0,proc:0,nego:0,noProc:0,defects:{},closeDays:[],impact:[]};
    const b=map[key];
    b.total++;
    if(c.concept==="proceeds")b.proc++;
    else if(c.concept==="negotiable")b.nego++;
    else if(c.concept==="not_proceeds")b.noProc++;
    if(c.days_to_close!=null)b.closeDays.push(c.days_to_close);
    if(c.weighted_impact!=null)b.impact.push(c.weighted_impact);
    claimDefectIds(c).forEach(d=>{b.defects[d]=(b.defects[d]||0)+1;});
  });
  return Object.values(map).map(b=>{
    const resolved=b.proc+b.nego+b.noProc;
    const topDef=Object.entries(b.defects).sort((a,b)=>b[1]-a[1])[0];
    return{
      ...b,
      procRate:resolved>0?Math.round((b.proc/resolved)*100):null,
      avgClose:b.closeDays.length>0?Math.round((b.closeDays.reduce((s,x)=>s+x,0)/b.closeDays.length)*10)/10:null,
      avgImpact:b.impact.length>0?Math.round((b.impact.reduce((s,x)=>s+x,0)/b.impact.length)*10)/10:null,
      topDefect:topDef?defectLabel(topDef[0]):"—",
      topDefectCount:topDef?topDef[1]:0,
    };
  }).sort((a,b)=>b.total-a.total);
}

/* Ranking por defecto */
export function byDefect(claims){
  const map={};
  claims.forEach(c=>{
    claimDefectIds(c).forEach(d=>{
      if(!map[d])map[d]={id:d,name:defectLabel(d),total:0,proc:0,nego:0,noProc:0,clients:{}};
      const b=map[d];b.total++;
      if(c.concept==="proceeds")b.proc++;
      else if(c.concept==="negotiable")b.nego++;
      else if(c.concept==="not_proceeds")b.noProc++;
      const cn=c.clients?.name||"—";
      b.clients[cn]=(b.clients[cn]||0)+1;
    });
  });
  return Object.values(map).map(b=>{
    const resolved=b.proc+b.nego+b.noProc;
    const topClient=Object.entries(b.clients).sort((a,b)=>b[1]-a[1])[0];
    return{
      ...b,
      procRate:resolved>0?Math.round((b.proc/resolved)*100):null,
      topClient:topClient?topClient[0]:"—",
      topClientCount:topClient?topClient[1]:0,
    };
  }).sort((a,b)=>b.total-a.total);
}

/* Heatmap cliente × defecto — top N clientes y defectos */
export function heatmap(claims,topN=8){
  const bc=byClient(claims).slice(0,topN);
  const bd=byDefect(claims).slice(0,topN);
  const grid={};
  bc.forEach(c=>{
    grid[c.id]={};
    bd.forEach(d=>grid[c.id][d.id]=0);
  });
  claims.forEach(c=>{
    if(!grid[c.client_id])return;
    claimDefectIds(c).forEach(d=>{
      if(grid[c.client_id][d]!==undefined)grid[c.client_id][d]++;
    });
  });
  return{clients:bc,defects:bd,grid};
}
