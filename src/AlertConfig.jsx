import {useState,useEffect} from "react";
import {P,GRAD,SH1,sC,sI,sL,sB,sBS,sBGhost,sT,sA,sHeader} from "./styles.js";
import {loadAlertConfig,saveAlertConfig,DEFAULT_CONFIG} from "./insights.js";

const CARDS=[
  {
    key:"a1",title:"Reincidencia del cliente",icon:"🔁",severity:"warning",
    desc:"Se dispara cuando el mismo cliente acumula varios claims por el mismo defecto en poco tiempo.",
    params:[
      {k:"a1_min_claims",l:"Mínimo de claims",min:2,max:20},
      {k:"a1_window_days",l:"Ventana (días)",min:7,max:180},
    ],
    preview:c=>`Cuando el mismo cliente tenga ${c.a1_min_claims} o más claims por el mismo defecto en los últimos ${c.a1_window_days} días.`,
  },
  {
    key:"a2",title:"Racha de defecto (todos los clientes)",icon:"📈",severity:"warning",
    desc:"Detecta un mismo defecto apareciendo en muchos claims recientes sin importar el cliente. Suele indicar problema de origen.",
    params:[
      {k:"a2_min_claims",l:"Mínimo de claims",min:2,max:30},
      {k:"a2_window_days",l:"Ventana (días)",min:7,max:90},
    ],
    preview:c=>`Cuando aparezcan ${c.a2_min_claims} o más claims por el mismo defecto en los últimos ${c.a2_window_days} días (todos los clientes).`,
  },
  {
    key:"a3",title:"Cliente inusualmente activo",icon:"🚨",severity:"danger",
    desc:"Alerta cuando un cliente reclama mucho más que su promedio habitual — señal de cambio en la relación.",
    params:[
      {k:"a3_multiplier",l:"Multiplicador del promedio",min:1.5,max:5,step:0.5},
      {k:"a3_min_claims",l:"Mínimo de claims",min:2,max:20},
      {k:"a3_window_days",l:"Ventana (días)",min:7,max:180},
    ],
    preview:c=>`Cuando un cliente tenga al menos ${c.a3_min_claims} claims en ${c.a3_window_days} días y esto sea ${c.a3_multiplier}× o más su promedio histórico.`,
  },
  {
    key:"a4",title:"Cliente tranquilo que reclama",icon:"ℹ️",severity:"info",
    desc:"Detecta clientes que casi nunca reclaman pero acaban de hacerlo. Suele merecer atención cuidadosa.",
    params:[
      {k:"a4_silence_days",l:"Días sin claims",min:30,max:365},
      {k:"a4_max_monthly_avg",l:"Promedio máx (claim/mes)",min:0.1,max:5,step:0.1},
    ],
    preview:c=>`Cuando el cliente no haya reclamado en los últimos ${c.a4_silence_days} días y su promedio histórico sea ≤ ${c.a4_max_monthly_avg} claim/mes.`,
  },
  {
    key:"a5",title:"Combinación problemática histórica",icon:"⚠️",severity:"warning",
    desc:"Avisa cuando esta combinación cliente + defecto suele terminar procediendo o negociándose.",
    params:[
      {k:"a5_min_cases",l:"Mínimo de casos históricos",min:2,max:20},
      {k:"a5_min_proceed_pct",l:"% mínimo que procedió",min:20,max:100},
    ],
    preview:c=>`Cuando la combinación cliente + defecto tenga al menos ${c.a5_min_cases} casos previos y ${c.a5_min_proceed_pct}% o más hayan procedido o sido negociables.`,
  },
];

export default function AlertConfig({user,onBack}){
  const[cfg,setCfg]=useState(null);
  const[dirty,setDirty]=useState(false);
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(false);

  useEffect(()=>{loadAlertConfig().then(setCfg);},[]);

  const update=(k,v)=>{setCfg(p=>({...p,[k]:v}));setDirty(true);setSaved(false);};

  const save=async()=>{
    setSaving(true);
    const ok=await saveAlertConfig(cfg,user.username);
    setSaving(false);
    if(ok){setDirty(false);setSaved(true);setTimeout(()=>setSaved(false),2500);}
    else alert("Error al guardar. Intenta de nuevo.");
  };

  const reset=async()=>{
    if(!confirm("¿Restaurar los valores por defecto?"))return;
    setCfg({...DEFAULT_CONFIG});setDirty(true);setSaved(false);
  };

  if(!cfg)return<div style={{textAlign:"center",padding:60,color:P.g}}>Cargando configuración…</div>;

  const sevColor={info:P.bl,warning:P.oD,danger:P.r}[cfg]||P.p;

  return(
    <div style={{maxWidth:920,margin:"0 auto",padding:"20px 18px 60px"}}>

      {/* HEADER */}
      <div className="fade-in" style={{...sHeader,padding:"22px 26px"}}>
        <div style={{position:"absolute",right:-40,top:-60,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none"}}/>
        <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div>
            <button className="btn" onClick={onBack} style={{...sBGhost,padding:"6px 13px",fontSize:12,marginBottom:10}}>← Dashboard</button>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:2.4,opacity:.68,textTransform:"uppercase"}}>Cartama · Admin</div>
            <div style={{fontSize:22,fontWeight:750,marginTop:4,letterSpacing:"-.3px"}}>⚙️ Configuración de alertas</div>
            <div style={{fontSize:12.5,opacity:.82,marginTop:4}}>Ajusta cuándo se dispara cada alerta al crear un nuevo claim.</div>
          </div>
        </div>
      </div>

      <div style={sA("info")}>Las alertas se muestran en el formulario cuando el usuario selecciona un cliente y defectos. Los cálculos usan el histórico del año en curso.</div>

      {CARDS.map((card,i)=>{
        const enabled=cfg[`${card.key}_enabled`];
        const sev={info:{c:P.bl,bg:"#EAF4FC"},warning:{c:P.oD,bg:"#FFF8E6"},danger:{c:P.r,bg:"#FDEDEE"}}[card.severity];
        return(
          <div key={card.key} className={`fade-in d${i+1}`} style={{...sC,borderLeft:`4px solid ${sev.c}`,opacity:enabled?1:0.6,transition:"opacity .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:12,flex:1,minWidth:0}}>
                <div style={{width:40,height:40,borderRadius:11,background:sev.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{card.icon}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:15.5,fontWeight:750,color:P.pD}}>{card.title}</div>
                  <div style={{fontSize:12.5,color:P.g,marginTop:4,lineHeight:1.5}}>{card.desc}</div>
                </div>
              </div>
              {/* Toggle */}
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <span style={{fontSize:12,fontWeight:600,color:enabled?P.p:P.g}}>{enabled?"Activada":"Desactivada"}</span>
                <div onClick={()=>update(`${card.key}_enabled`,!enabled)}
                  style={{width:42,height:24,borderRadius:99,background:enabled?P.p:"#CFD8D4",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:P.w,position:"absolute",top:3,left:enabled?21:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
              </label>
            </div>

            {/* Parámetros */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginTop:16}}>
              {card.params.map(p=>(
                <div key={p.k}>
                  <label style={sL}>{p.l}</label>
                  <input type="number" min={p.min} max={p.max} step={p.step||1}
                    disabled={!enabled}
                    value={cfg[p.k]??""} onChange={e=>update(p.k,parseFloat(e.target.value)||0)}
                    style={{...sI,background:enabled?P.w:"#F5F7F6"}}/>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={{marginTop:14,padding:"11px 14px",background:sev.bg,borderRadius:10,fontSize:12.5,color:sev.c,fontWeight:500,lineHeight:1.5}}>
              <strong>Vista previa:</strong> {card.preview(cfg)}
            </div>
          </div>
        );
      })}

      {/* Barra de acciones sticky */}
      <div style={{position:"sticky",bottom:16,marginTop:20,padding:"14px 18px",background:P.w,borderRadius:14,border:`1px solid ${P.b}`,boxShadow:"0 -4px 16px rgba(0,0,0,.06)",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,fontSize:13,color:dirty?P.oD:P.g,fontWeight:600}}>
          {saved?"✓ Configuración guardada":dirty?"Hay cambios sin guardar":"Sin cambios pendientes"}
        </div>
        <button className="btn" onClick={reset} style={{...sBS,fontSize:13}}>Restaurar valores por defecto</button>
        <button className="btn" onClick={save} disabled={!dirty||saving} style={{...sB(dirty&&!saving),padding:"12px 24px"}}>
          {saving?"Guardando…":"💾 Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
