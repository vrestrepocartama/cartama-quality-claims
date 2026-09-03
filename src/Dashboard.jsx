import {useState,useMemo} from "react";
import * as XLSX from "xlsx";
import {P,GRAD,SH1,SH2,sC,sI,sBS,sBGhost,sT,sPill,sA,sHeader,sAvatar,initials,sBarWrap,sBar,sUrgencyCard,
  fmtShort,daysFromNow,greeting,todayLong,useIsMobile} from "./styles.js";
import {STATUS,CONCEPTS,CLS_SHORT,DEFECT_CATEGORIES,ROLES,ALL_DEFECTS} from "./constants.js";
import {importShipmentsCSV} from "./shipments.js";

/* Pasos del pipeline para el mini-timeline */
const STEPS=[
  {k:"open",l:"Abierto"},
  {k:"responded_commercial",l:"Resp. Comercial"},
  {k:"review_quality",l:"Rev. Calidad"},
  {k:"concept",l:"Concepto"},
  {k:"closed",l:"Cerrado"},
];
function stepIndex(c){
  if(c.status==="closed")return 4;
  if(["proceeds","negotiable","not_proceeds"].includes(c.status)||c.concept)return 3;
  if(c.status==="review_quality")return 2;
  if(c.status==="responded_commercial")return 1;
  return 0;
}
function defectSummary(c){
  return ALL_DEFECTS.filter(d=>c[`${d.db}_pct`]!==null&&c[`${d.db}_pct`]!==undefined)
    .map(d=>`${d.name} ${c[`${d.db}_pct`]}%`);
}

export default function Dashboard({user,claims,clients,loading,onNew,onOpen,onLogout,year,setYear,onRefresh,alertResults,onDismissAlerts,onAnalytics,onConfig}){
  const[search,setSearch]=useState("");
  const[fSt,setFSt]=useState("all");
  const[fCl,setFCl]=useState("all");
  const[fCon,setFCon]=useState("all");
  const[showPend,setShowPend]=useState(true);
  const[showFilters,setShowFilters]=useState(false);
  const[tip,setTip]=useState(null);
  const[shipMsg,setShipMsg]=useState(null);const[shipUploading,setShipUploading]=useState(false);
  const shipRef=useState(null)[1];
  const isMobile=useIsMobile(720);

  /* Handler para subir CSV de despachos */
  async function handleShipmentCSV(e){
    const file=e.target.files?.[0];if(!file)return;
    setShipUploading(true);setShipMsg(null);
    try{
      const text=await file.text();
      const res=await importShipmentsCSV(text);
      setShipMsg({ok:true,text:`✅ ${res.imported} filas importadas, ${res.skipped} duplicadas ignoradas${res.errors.length?` · ${res.errors.length} errores`:""}`});
    }catch(err){setShipMsg({ok:false,text:`❌ Error: ${err.message}`});}
    finally{setShipUploading(false);e.target.value="";}
  }

  const filtered=useMemo(()=>claims.filter(c=>{
    if(fSt!=="all"&&c.status!==fSt)return false;
    if(fCl!=="all"&&c.client_id!==parseInt(fCl))return false;
    if(fCon!=="all"&&c.concept!==fCon)return false;
    if(search){const s=search.toLowerCase();return c.containers?.toLowerCase().includes(s)||c.clients?.name?.toLowerCase().includes(s)||c.contact_name?.toLowerCase().includes(s)||c.invoice?.toLowerCase().includes(s);}
    return true;
  }),[claims,fSt,fCl,fCon,search]);

  const activeFilters=[fSt!=="all",fCl!=="all",fCon!=="all",!!search].filter(Boolean).length;

  const stats=useMemo(()=>({
    open:claims.filter(c=>c.status==="open").length,
    inProg:claims.filter(c=>["responded_commercial","review_quality"].includes(c.status)).length,
    proc:claims.filter(c=>c.concept==="proceeds").length,
    nego:claims.filter(c=>c.concept==="negotiable").length,
    noProc:claims.filter(c=>c.concept==="not_proceeds").length,
    closed:claims.filter(c=>c.status==="closed").length,
  }),[claims]);
  const total=claims.length||1;

  const myPending=useMemo(()=>{
    const sorter=(a,b)=>daysFromNow(b.claim_date)-daysFromNow(a.claim_date);
    if(user.role==="commercial")return claims.filter(c=>c.status==="open").sort(sorter);
    if(user.role==="quality")return claims.filter(c=>["responded_commercial","review_quality"].includes(c.status)).sort(sorter);
    return claims.filter(c=>!["closed","proceeds","not_proceeds"].includes(c.status)).sort(sorter);
  },[claims,user.role]);

  const urgentClaims=useMemo(()=>claims.filter(c=>c.status==="open"&&daysFromNow(c.claim_date)>=5),[claims]);
  const crit7=urgentClaims.filter(c=>daysFromNow(c.claim_date)>=7);
  const warn5=urgentClaims.filter(c=>{const d=daysFromNow(c.claim_date);return d>=5&&d<7;});

  const clientWaiting=useMemo(()=>claims.filter(c=>{
    if(c.status!=="responded_commercial"||c.client_responded)return false;
    const d=c.date_responded_commercial?daysFromNow(c.date_responded_commercial):null;
    return d!==null&&d>=5;
  }),[claims]);

  const exportExcel=()=>{
    const rows=filtered.map(c=>({
      "Año":c.year,"Contenedor":c.containers,"Factura":c.invoice||"",
      "Cliente":c.clients?.name||"","Contacto":c.contact_name||"",
      "ETD":fmtShort(c.etd),"ETA":fmtShort(c.eta),"Fecha Llegada":fmtShort(c.arrival_date),"Fecha Reclamo":fmtShort(c.claim_date),
      "Días Ventana":c.days_to_claim??"","Dentro Ventana":c.within_window?"Sí":"No",
      "Clasificación":CLS_SHORT[c.classification]||c.classification,
      "Categoría Defecto":(c.defect_category||[]).map(x=>DEFECT_CATEGORIES[x]||x).join(", "),
      "Estado":STATUS[c.status]?.l||c.status,
      "Concepto":CONCEPTS[c.concept]?.l||"",
      "Descripción Concepto":c.concept_description||"",
      "% Impacto":c.weighted_impact??"",
      "Browning %":c.browning_pct??"","Lenticela %":c.lenticel_pct??"","Daño Frío %":c.cold_damage_pct??"",
      "Antracnosis %":c.anthracnose_pct??"","Cicatrices %":c.brown_scars_pct??"","Thrips %":c.thrips_pct??"",
      "Sol %":c.sunburn_pct??"","Pulpa %":c.pulp_damage_pct??"","Pedúnculo %":c.peduncle_pct??"",
      "Urgentes":(c.urgent_items||[]).join(", "),
      "Fecha Resp. Comercial":fmtShort(c.date_responded_commercial),
      "Fecha Rev. Calidad":fmtShort(c.date_review_quality),
      "Fecha Resolución":fmtShort(c.date_resolution),
      "Fecha Cierre":fmtShort(c.date_closed),
      "Días para Cerrar":c.days_to_close??"",
      "Notas":c.notes||"","Creado por":c.created_by||"",
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    ws["!cols"]=Object.keys(rows[0]||{}).map(k=>({wch:Math.max(k.length+2,14)}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,`Claims ${year}`);
    XLSX.writeFile(wb,`Cartama_Claims_${year}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  /* ── Tarjeta de estadística ── */
  const SC=({n,l,c,icon,i})=>(
    <div className={`lift fade-in d${i}`} style={{background:P.w,borderRadius:14,border:`1px solid ${P.b}`,boxShadow:SH1,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:26,fontWeight:800,color:c,lineHeight:1,letterSpacing:"-.5px"}}>{n}</div>
        <div style={{width:30,height:30,borderRadius:9,background:`${c}14`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{icon}</div>
      </div>
      <div style={{fontSize:11.5,color:P.g,marginTop:6,fontWeight:600,letterSpacing:".2px"}}>{l}</div>
      <div style={sBarWrap}><div style={sBar((n/total)*100,c)}/></div>
    </div>
  );

  /* ── Mini timeline de pasos ── */
  const MiniSteps=({c})=>{
    const idx=stepIndex(c);
    return(
      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:7}}>
        {STEPS.map((s,i)=>(
          <div key={s.k} style={{display:"flex",alignItems:"center",gap:3}} title={s.l}>
            <div style={{width:8,height:8,borderRadius:"50%",background:i<=idx?P.a:"#E1E7E4",border:i===idx?`2px solid ${P.p}`:"none",boxSizing:"content-box"}}/>
            {i<STEPS.length-1&&<div style={{width:14,height:2,background:i<idx?P.a:"#E9EEEB",borderRadius:2}}/>}
          </div>
        ))}
        <span style={{fontSize:10.5,color:P.g,marginLeft:6,fontWeight:600}}>{STEPS[idx].l}</span>
      </div>
    );
  };

  const pendingTitle=user.role==="commercial"?"Mis pendientes — por responder":user.role==="quality"?"Mis pendientes — por revisar":"Pendientes — claims activos";

  /* ── Fila de tabla / card móvil ── */
  const ImpactBar=({v})=>{
    const val=v??0;
    const col=val>=25?P.r:val>=10?P.oD:P.p;
    return(
      <div style={{minWidth:78}}>
        <div style={{fontSize:13,fontWeight:700,color:col}}>{v?`${v}%`:"—"}</div>
        {v?<div style={{...sBarWrap,marginTop:5,height:4}}><div style={sBar(Math.min(val,100),col)}/></div>:null}
      </div>
    );
  };

  const ClaimCard=({c})=>{
    const d=daysFromNow(c.claim_date);
    const critical=c.status==="open"&&d>=7;const late=c.status==="open"&&d>=5&&d<7;
    const st=STATUS[c.status]||STATUS.open;
    return(
      <div className="lift fade-in" onClick={()=>onOpen(c)}
        style={{background:P.w,border:`1px solid ${P.b}`,borderLeft:`4px solid ${critical?P.r:late?P.oD:P.a}`,borderRadius:12,padding:"13px 15px",marginBottom:10,cursor:"pointer",boxShadow:SH1}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14.5}}>{c.containers}</div>
            <div style={{fontSize:12,color:P.g,marginTop:2}}>{c.clients?.name||"—"}{c.invoice?` · Fac ${c.invoice}`:""}</div>
          </div>
          <span style={sT(st.c,st.bg)}>{st.l}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,flexWrap:"wrap"}}>
          <span style={sT(P.pD,P.pL)}>{CLS_SHORT[c.classification]||c.classification}</span>
          {c.concept&&<span style={sT(CONCEPTS[c.concept]?.c,CONCEPTS[c.concept]?.bg)}>{CONCEPTS[c.concept]?.l}</span>}
          <span style={{fontSize:12,color:P.g}}>{fmtShort(c.claim_date)} · {c.days_to_claim??"—"}d</span>
          <div style={{marginLeft:"auto"}}><ImpactBar v={c.weighted_impact}/></div>
        </div>
      </div>
    );
  };

  return(
    <div style={{maxWidth:1240,margin:"0 auto",padding:"20px 18px 60px"}}>

      {/* ═══ HEADER ═══ */}
      <div className="fade-in" style={{...sHeader,padding:"24px 28px"}}>
        <div style={{position:"absolute",right:-40,top:-60,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none"}}/>
        <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:2.4,opacity:.68,textTransform:"uppercase"}}>Cartama · Quality Claims</div>
            <div style={{fontSize:24,fontWeight:750,marginTop:6,letterSpacing:"-.4px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              {greeting()}, {(user.full_name||"").split(" ")[0]}
              {myPending.length>0&&(
                <span className={crit7.length>0?"pulse":""} style={{fontSize:11.5,fontWeight:700,padding:"4px 11px",borderRadius:20,background:crit7.length>0?"rgba(255,255,255,.95)":"rgba(255,255,255,.2)",color:crit7.length>0?P.r:P.w,border:"1px solid rgba(255,255,255,.35)"}}>
                  {crit7.length>0?`🚨 ${crit7.length} urgente${crit7.length>1?"s":""}`:`${myPending.length} pendiente${myPending.length>1?"s":""}`}
                </span>
              )}
            </div>
            <div style={{fontSize:12.5,opacity:.78,marginTop:5,textTransform:"capitalize"}}>{todayLong()}</div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="hide-sm" style={{position:"relative",width:38,height:38,borderRadius:11,background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}} title={`${crit7.length+warn5.length+clientWaiting.length} alertas activas`}>
              🔔
              {(crit7.length+warn5.length+clientWaiting.length)>0&&
                <span style={{position:"absolute",top:-5,right:-5,minWidth:18,height:18,borderRadius:9,background:P.o,color:P.w,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",border:"2px solid rgba(27,67,50,.9)"}}>
                  {crit7.length+warn5.length+clientWaiting.length}
                </span>}
            </div>
            <div className="hide-sm" style={{display:"flex",alignItems:"center",gap:9,padding:"6px 12px 6px 6px",borderRadius:30,background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.22)"}}>
              <div style={sAvatar(user.full_name||user.username,32)}>{initials(user.full_name||user.username)}</div>
              <div style={{fontSize:12,lineHeight:1.3}}>
                <div style={{fontWeight:700}}>{user.full_name}</div>
                <div style={{opacity:.78,fontSize:11}}>{ROLES[user.role]}</div>
              </div>
            </div>
            <button className="btn hide-sm" onClick={onAnalytics} style={sBGhost} title="Analytics">📊 <span className="hide-sm" style={{marginLeft:4}}>Analytics</span></button>
            {user.role==="admin"&&<>
              <button className="btn hide-sm" onClick={onConfig} style={sBGhost} title="Configuración de alertas">⚙️</button>
              <label className="btn hide-sm" style={{...sBGhost,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}} title="Actualizar despachos">
                📤{!isMobile&&<span style={{marginLeft:2}}>Despachos</span>}
                <input type="file" accept=".csv,.txt" onChange={handleShipmentCSV} style={{display:"none"}} disabled={shipUploading}/>
              </label>
            </>}
            {(user.role==="commercial"||user.role==="admin")&&
              <button className="btn" onClick={onNew} style={{...sBGhost,background:"rgba(255,255,255,.94)",color:P.pD,fontWeight:700,padding:"11px 18px"}}>+ Nuevo Claim</button>}
            <button className="btn" onClick={onLogout} style={sBGhost}>Salir</button>
          </div>
        </div>
      </div>

      {/* Resultado de subida de despachos */}
      {shipMsg&&(
        <div className="fade-in" style={{...sA(shipMsg.ok?"success":"danger"),display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13}}>{shipMsg.text}</span>
          <button onClick={()=>setShipMsg(null)} style={{background:"transparent",border:"none",fontSize:19,cursor:"pointer",padding:"0 4px"}}>×</button>
        </div>
      )}
      {shipUploading&&<div style={{...sA("info"),fontSize:13}}>⏳ Importando despachos…</div>}

      {/* Resultado de alertas automáticas */}
      {alertResults&&(alertResults.sent.length>0||alertResults.autoChanged.length>0)&&(
        <div className="fade-in" style={{...sA("warning"),display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <strong>📬 Alertas procesadas al cargar</strong>
            {alertResults.sent.map((a,i)=><div key={i} style={{fontSize:12,marginTop:4}}>• Correo enviado: {a.claim} ({a.type})</div>)}
            {alertResults.autoChanged.map((a,i)=><div key={i} style={{fontSize:12,marginTop:4}}>• Auto-cambio: {a.claim} → {a.type}</div>)}
          </div>
          <button onClick={onDismissAlerts} style={{background:"transparent",border:"none",fontSize:19,cursor:"pointer",color:P.oD,padding:"0 4px"}}>×</button>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:11,marginBottom:18}}>
        <SC n={stats.open} l="Abiertos" c={P.o} icon="📂" i={1}/>
        <SC n={stats.inProg} l="En Proceso" c={P.bl} icon="⏳" i={2}/>
        <SC n={stats.proc} l="Procede" c={P.p} icon="✅" i={3}/>
        <SC n={stats.nego} l="Negociable" c={P.oD} icon="⚖️" i={4}/>
        <SC n={stats.noProc} l="No Procede" c={P.r} icon="🚫" i={5}/>
        <SC n={stats.closed} l="Cerrados" c="#455A64" icon="🗄️" i={6}/>
      </div>

      {/* ═══ MIS PENDIENTES ═══ */}
      {myPending.length>0&&showPend&&(
        <div className="fade-in" style={{...sC,padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:P.oL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📌</div>
              <div>
                <div style={{fontSize:15,fontWeight:750,color:P.pD}}>{pendingTitle}</div>
                <div style={{fontSize:11.5,color:P.g}}>{myPending.length} claim{myPending.length>1?"s":""} en tu bandeja</div>
              </div>
            </div>
            <button onClick={()=>setShowPend(false)} style={{background:"transparent",border:"none",fontSize:12.5,cursor:"pointer",color:P.g,fontWeight:600}}>Ocultar ▲</button>
          </div>

          {myPending.slice(0,5).map((c,i)=>{
            const d=daysFromNow(c.claim_date);
            const critical=d>=7;const late=d>=5&&d<7;
            const rem=Math.max(0,7-d);
            return(
              <div key={c.id} className={`lift fade-in d${Math.min(i+1,5)}`} onClick={()=>onOpen(c)}
                style={sUrgencyCard(critical?"critical":late?"late":"normal")}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:14.5}}>{c.containers}</span>
                      <span style={sT(P.pD,P.pL)}>{CLS_SHORT[c.classification]||c.classification}</span>
                    </div>
                    <div style={{fontSize:12,color:P.g,marginTop:3}}>{c.clients?.name||""}{c.contact_name?` · ${c.contact_name}`:""}</div>
                    <MiniSteps c={c}/>
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                    {critical
                      ?<span style={sPill(P.r,"#FDEDEE")}>🚨 {d}d — procede hoy</span>
                      :late
                        ?<span style={sPill(P.oD,"#FFF8E6")}>⏱ quedan {rem}d</span>
                        :<span style={sPill(P.p,P.pL)}>⏱ quedan {rem}d</span>}
                    <span style={{fontSize:11,color:P.g2}}>Reclamo {fmtShort(c.claim_date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {myPending.length>5&&<div style={{textAlign:"center",fontSize:12,color:P.g,marginTop:6}}>+ {myPending.length-5} pendiente(s) más en la tabla</div>}
        </div>
      )}
      {!showPend&&myPending.length>0&&
        <button className="btn" onClick={()=>setShowPend(true)} style={{...sBS,width:"100%",marginBottom:16,padding:"11px",fontSize:13}}>Mostrar mis pendientes ({myPending.length}) ▼</button>}

      {/* ═══ ALERTAS DEL SISTEMA ═══ */}
      {crit7.length>0&&<div style={sA("danger")}><strong>🚨 {crit7.length} claim(s) con 7+ días sin respuesta.</strong> Proceden automáticamente por política. Los correos de notificación han sido enviados.</div>}
      {warn5.length>0&&<div style={sA("warning")}><strong>⚠️ {warn5.length} claim(s) con 5-6 días sin respuesta.</strong> Responder pronto para evitar que procedan automáticamente.</div>}
      {clientWaiting.length>0&&<div style={sA("info")}><strong>ℹ️ {clientWaiting.length} claim(s) esperando respuesta del cliente 5+ días.</strong>{clientWaiting.filter(c=>daysFromNow(c.date_responded_commercial)>=7).length>0&&" Los de 7+ días se cierran como No Procede automáticamente."}</div>}

      {/* ═══ FILTROS ═══ */}
      <div style={{...sC,padding:"14px 18px",marginBottom:14}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <input style={{...sI,maxWidth:isMobile?"100%":240,fontSize:13.5}} placeholder="🔍 Contenedor, cliente, factura…" value={search} onChange={e=>setSearch(e.target.value)}/>

          <button className="btn only-sm" onClick={()=>setShowFilters(!showFilters)}
            style={{...sBS,padding:"10px 16px",fontSize:13,width:"100%"}}>
            ⚙ Filtros{activeFilters>0?` (${activeFilters})`:""} {showFilters?"▲":"▼"}
          </button>

          <div className={showFilters?"":"hide-sm"} style={{display:"flex",gap:10,flexWrap:"wrap",flex:1,marginTop:showFilters&&isMobile?4:0}}>
            <select style={{...sI,maxWidth:isMobile?"100%":172,fontSize:13}} value={fSt} onChange={e=>setFSt(e.target.value)}>
              <option value="all">Todos los estados</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
            </select>
            <select style={{...sI,maxWidth:isMobile?"100%":150,fontSize:13}} value={fCon} onChange={e=>setFCon(e.target.value)}>
              <option value="all">Todo concepto</option>{Object.entries(CONCEPTS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
            </select>
            <select style={{...sI,maxWidth:isMobile?"100%":210,fontSize:13}} value={fCl} onChange={e=>setFCl(e.target.value)}>
              <option value="all">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={{...sI,maxWidth:isMobile?"100%":96,fontSize:13}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {[2026,2027,2028].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:isMobile?0:"auto"}}>
            <span style={{fontSize:12,color:P.g,fontWeight:600}}>{filtered.length}/{claims.length}</span>
            <button className="btn" onClick={exportExcel} style={{...sBS,padding:"9px 14px",fontSize:12}} disabled={filtered.length===0}>📥 Excel</button>
            <button className="btn" onClick={onRefresh} style={{...sBS,padding:"9px 13px",fontSize:12}} title="Recargar">↻</button>
          </div>
        </div>
      </div>

      {/* ═══ LISTADO ═══ */}
      {loading?(
        <div style={{...sC,textAlign:"center",color:P.g,padding:36}}>Cargando claims…</div>
      ):filtered.length===0?(
        <div style={{...sC,textAlign:"center",color:P.g,padding:40}}>
          <div style={{fontSize:34,marginBottom:8}}>📭</div>
          <div style={{fontWeight:600,color:P.t}}>No hay claims con estos filtros</div>
          <div style={{fontSize:13,marginTop:4}}>Ajusta la búsqueda o crea un nuevo claim.</div>
        </div>
      ):isMobile?(
        <div>{filtered.map(c=><ClaimCard key={c.id} c={c}/>)}</div>
      ):(
        <div style={{...sC,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
              <thead>
                <tr style={{background:GRAD,color:P.w}}>
                  {["Contenedor","Cliente","Reclamo","Días","Tipo","Estado","Concepto","Impacto",""].map((h,i)=>
                    <th key={i} style={{padding:"13px 14px",textAlign:"left",fontWeight:650,fontSize:11.5,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".6px"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>{
                  const d=daysFromNow(c.claim_date);
                  const late=c.status==="open"&&d>=5;const critical=c.status==="open"&&d>=7;
                  const st=STATUS[c.status]||STATUS.open;
                  const bg=critical?"#FEF7F7":late?"#FFFCF3":P.w;
                  return(
                    <tr key={c.id} className="rowx" onClick={()=>onOpen(c)}
                      onMouseEnter={e=>setTip({id:c.id,x:e.clientX,y:e.clientY,c})}
                      onMouseMove={e=>setTip(t=>t&&t.id===c.id?{...t,x:e.clientX,y:e.clientY}:t)}
                      onMouseLeave={()=>setTip(null)}
                      style={{borderBottom:`1px solid ${P.b2}`,background:bg,cursor:"pointer",borderLeft:`3px solid ${critical?P.r:late?P.oD:"transparent"}`}}>
                      <td style={{padding:"15px 14px",fontWeight:650}}>{c.containers}{c.invoice&&<div style={{fontSize:11,color:P.g,fontWeight:400,marginTop:2}}>Fac: {c.invoice}</div>}</td>
                      <td style={{padding:"15px 14px"}}>{c.clients?.name||"—"}{c.contact_name&&<div style={{fontSize:11,color:P.g,marginTop:2}}>{c.contact_name}</div>}</td>
                      <td style={{padding:"15px 14px",fontSize:12.5,whiteSpace:"nowrap",color:P.g}}>{fmtShort(c.claim_date)}</td>
                      <td style={{padding:"15px 14px"}}>
                        <span style={{fontWeight:700,color:c.days_to_claim>7?P.r:c.days_to_claim>5?P.oD:P.p}}>{c.days_to_claim??"—"}</span>
                        {critical&&<div style={{fontSize:9,color:P.r,fontWeight:800,letterSpacing:".4px"}}>VENCIDO</div>}
                      </td>
                      <td style={{padding:"15px 14px"}}><span style={sT(P.pD,P.pL)}>{CLS_SHORT[c.classification]||c.classification}</span></td>
                      <td style={{padding:"15px 14px"}}><span style={sT(st.c,st.bg)}>{st.l}</span></td>
                      <td style={{padding:"15px 14px"}}>{c.concept?<span style={sT(CONCEPTS[c.concept]?.c,CONCEPTS[c.concept]?.bg)}>{CONCEPTS[c.concept]?.l}</span>:<span style={{color:P.g2}}>—</span>}</td>
                      <td style={{padding:"15px 14px"}}><ImpactBar v={c.weighted_impact}/></td>
                      <td style={{padding:"15px 14px",color:P.a,fontSize:17}}>›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TOOLTIP DE PREVIEW ═══ */}
      {tip&&!isMobile&&(()=>{
        const defs=defectSummary(tip.c);
        const urg=(tip.c.urgent_items||[]).length;
        return(
          <div className="fade-soft" style={{position:"fixed",left:Math.min(tip.x+16,window.innerWidth-310),top:Math.min(tip.y+16,window.innerHeight-190),
            width:290,background:"rgba(27,32,30,.96)",color:"#F3F6F4",borderRadius:12,padding:"12px 14px",fontSize:12,lineHeight:1.55,
            boxShadow:SH2,pointerEvents:"none",zIndex:60,backdropFilter:"blur(6px)"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:5}}>{tip.c.containers}</div>
            <div style={{opacity:.75,marginBottom:7}}>{tip.c.clients?.name||"—"} · {STATUS[tip.c.status]?.l}</div>
            {defs.length>0?(
              <div>
                <div style={{opacity:.6,fontSize:10.5,textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>Defectos</div>
                {defs.slice(0,5).map((x,i)=><div key={i}>• {x}</div>)}
                {defs.length>5&&<div style={{opacity:.6}}>+{defs.length-5} más</div>}
              </div>
            ):<div style={{opacity:.6}}>Sin defectos con % registrado</div>}
            {urg>0&&<div style={{marginTop:6,color:"#FF9C85",fontWeight:600}}>🚨 {urg} item(s) de escalamiento urgente</div>}
            {tip.c.weighted_impact!=null&&<div style={{marginTop:6,opacity:.85}}>Impacto ponderado: <strong>{tip.c.weighted_impact}%</strong></div>}
          </div>
        );
      })()}
    </div>
  );
}
