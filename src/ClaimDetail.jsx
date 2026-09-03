import {useState,useMemo,useEffect} from "react";
import {supabase} from "./supabase.js";
import {P,GRAD,SH1,sC,sI,sL,sB,sBS,sBD,sBGhost,sT,sPill,sA,sHeader,sBarWrap,sBar,
  fmtShort,daysBetween,daysFromNow,emailSubject} from "./styles.js";
import {STATUS,CONCEPTS,CLS_LABEL,DEFECT_CATEGORIES,ALL_DEFECTS,URG,CATS,EV_L} from "./constants.js";
import {buildTechnicalResponse} from "./responses.js";
import MailView from "./MailView.jsx";
import {SCENARIOS,buildScenarioResponse} from "./scenarios.js";
import {lookupContainers} from "./shipments.js";
import ContainerInfo from "./ContainerInfo.jsx";

const STEPS=[
  {k:"open",l:"Abierto"},{k:"responded_commercial",l:"Resp. Comercial"},
  {k:"review_quality",l:"Rev. Calidad"},{k:"concept",l:"Concepto"},{k:"closed",l:"Cerrado"},
];
function stepIndex(c){
  if(c.status==="closed")return 4;
  if(["proceeds","negotiable","not_proceeds"].includes(c.status)||c.concept)return 3;
  if(c.status==="review_quality")return 2;
  if(c.status==="responded_commercial")return 1;
  return 0;
}

export default function ClaimDetail({claim,user,onBack,onRefresh,clients}){
  const[tab,setTab]=useState("info");
  const[history,setHistory]=useState([]);
  const[alertHist,setAlertHist]=useState([]);
  const[insights,setInsights]=useState([]);
  useEffect(()=>{
    import("./alerts.js").then(({getAlertHistory,getClaimHistory})=>{
      getClaimHistory(claim.id).then(setHistory);
      getAlertHistory(claim.id).then(setAlertHist);
    });
    import("./insights.js").then(({getClaimInsights})=>{
      getClaimInsights(claim.id).then(setInsights);
    });
  },[claim.id]);
  const[shipData,setShipData]=useState([]);
  useEffect(()=>{
    if(claim.containers){lookupContainers(claim.containers).then(setShipData).catch(()=>{});}
  },[claim.containers]);
  const[editing,setEditing]=useState(false);
  const[saving,setSaving]=useState(false);
  const[techResp,setTechResp]=useState(claim.technical_response||"");
  const[showTech,setShowTech]=useState(!!claim.technical_response);
  const[scenario,setScenario]=useState("");
  const[concept,setConcept]=useState(claim.concept||"");
  const[conceptDesc,setConceptDesc]=useState(claim.concept_description||"");
  const[edit,setEdit]=useState({...claim});
  const[confirmDel,setConfirmDel]=useState(false);

  const canEdit=["admin","commercial","quality"].includes(user.role);
  const canQuality=["quality","admin"].includes(user.role);
  const canDelete=user.role==="admin";

  const defectData=useMemo(()=>{
    const sel=[],vals={},evals={},palls={};
    ALL_DEFECTS.forEach(d=>{
      const pct=claim[`${d.db}_pct`];
      if(pct!==null&&pct!==undefined){
        sel.push(d);vals[d.id]=pct;
        evals[d.id]=claim[`${d.db}_eval`]||(d.ev?d.ev(pct):"qr");
        const pl=claim[`${d.db}_pallets`];if(pl)palls[d.id]=pl;
      }
    });
    const urgSel=URG.filter(u=>(claim.urgent_items||[]).includes(u.id));
    return{sel,vals,evals,palls,urgSel};
  },[claim]);

  const genTech=(scId)=>{
    const sid=scId||scenario;
    if(!sid)return;
    const t=buildScenarioResponse(sid,claim.language||"es",{
      client:claim.clients?.name||"[Client]",contact:claim.contact_name,
      containers:claim.containers,arrival:claim.arrival_date,
      defects:defectData.sel,
      catMismatch:claim.category_mismatch,catCartama:claim.category_cartama,catClient:claim.category_client,
    });
    setTechResp(t);setShowTech(true);
    // Auto-set concept based on scenario
    const sc=SCENARIOS.find(s=>s.id===sid);
    if(sc?.concept)setConcept(sc.concept);
  };

  const saveTech=async()=>{
    setSaving(true);
    await supabase.from("claims").update({
      technical_response:techResp,technical_response_generated_by:user.username,
      technical_response_date:new Date().toISOString(),
      status:claim.status==="open"||claim.status==="responded_commercial"?"review_quality":claim.status,
      date_review_quality:claim.date_review_quality||new Date().toISOString(),
      last_modified_by:user.username,
    }).eq("id",claim.id);
    setSaving(false);onRefresh();
  };

  const saveConcept=async()=>{
    setSaving(true);
    const dClose=daysBetween(claim.claim_date,new Date().toISOString().split("T")[0]);
    await supabase.from("claims").update({
      concept,concept_description:conceptDesc,status:concept,
      date_resolution:new Date().toISOString(),days_to_close:dClose,
      last_modified_by:user.username,
    }).eq("id",claim.id);
    await supabase.from("claim_history").insert({claim_id:claim.id,action:"concept_set",new_value:concept,changed_by:user.username});
    setSaving(false);onRefresh();
  };

  const changeStatus=async(newSt)=>{
    setSaving(true);
    const up={status:newSt,last_modified_by:user.username};
    if(newSt==="responded_commercial"&&!claim.date_responded_commercial)up.date_responded_commercial=new Date().toISOString();
    if(newSt==="review_quality"&&!claim.date_review_quality)up.date_review_quality=new Date().toISOString();
    if(newSt==="closed"){up.date_closed=new Date().toISOString();up.days_to_close=daysBetween(claim.claim_date,new Date().toISOString().split("T")[0]);}
    await supabase.from("claims").update(up).eq("id",claim.id);
    await supabase.from("claim_history").insert({claim_id:claim.id,action:"status_change",old_value:claim.status,new_value:newSt,changed_by:user.username});
    setSaving(false);onRefresh();
  };

  const markClientResponded=async(did)=>{
    setSaving(true);
    await supabase.from("claims").update({
      client_responded:did,date_client_response:did?new Date().toISOString():null,
      days_client_response:did?daysFromNow(claim.date_responded_commercial):null,
      last_modified_by:user.username,
    }).eq("id",claim.id);
    setSaving(false);onRefresh();
  };

  const saveEdit=async()=>{
    setSaving(true);
    const days=daysBetween(edit.arrival_date,edit.claim_date);
    await supabase.from("claims").update({
      containers:edit.containers,invoice:edit.invoice,client_id:edit.client_id,contact_name:edit.contact_name,
      arrival_date:edit.arrival_date,claim_date:edit.claim_date,etd:edit.etd,eta:edit.eta,pickup_date:edit.pickup_date,
      days_to_claim:days,within_window:days!==null?days<=7:null,notes:edit.notes,
      last_modified_by:user.username,
    }).eq("id",claim.id);
    setSaving(false);setEditing(false);onRefresh();
  };

  const doDelete=async()=>{
    await supabase.from("claims").delete().eq("id",claim.id);
    onBack();onRefresh();
  };

  const st=STATUS[claim.status]||STATUS.open;
  const daysOpen=daysFromNow(claim.claim_date);
  const daysWaitClient=claim.date_responded_commercial?daysFromNow(claim.date_responded_commercial):null;
  const idx=stepIndex(claim);
  const impact=claim.weighted_impact??0;
  const impactColor=impact>=25?P.r:impact>=10?P.oD:P.p;

  const Row=({l,v})=>(
    <div style={{display:"flex",padding:"9px 0",borderBottom:`1px solid ${P.b2}`,fontSize:13.5,gap:12}}>
      <span style={{color:P.g,minWidth:168,flexShrink:0}}>{l}</span>
      <span style={{fontWeight:650}}>{v||"—"}</span>
    </div>
  );

  /* ── Timeline vertical con íconos ── */
  const TL_ITEMS=[
    {i:"📥",l:"Reclamo recibido",d:claim.claim_date},
    {i:"✉️",l:"Respondido comercial",d:claim.date_responded_commercial},
    {i:"🔬",l:"Revisión calidad",d:claim.date_review_quality},
    {i:"💬",l:"Respuesta del cliente",d:claim.client_responded===true?claim.date_client_response:null,
      alt:claim.client_responded===false?"Cliente no respondió":null},
    {i:"⚖️",l:"Resolución",d:claim.date_resolution},
    {i:"🗄️",l:"Cierre",d:claim.date_closed},
  ];

  const Timeline=()=>(
    <div style={{position:"relative",paddingLeft:4}}>
      {TL_ITEMS.map((t,i)=>{
        const done=!!t.d||!!t.alt;
        const last=i===TL_ITEMS.length-1;
        return(
          <div key={i} className={`fade-in d${Math.min(i+1,6)}`} style={{display:"flex",gap:14,position:"relative",paddingBottom:last?0:18}}>
            {!last&&<div style={{position:"absolute",left:15,top:34,bottom:0,width:2,background:done?P.a:"#E9EEEB",borderRadius:2}}/>}
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,zIndex:1,
              background:done?`linear-gradient(135deg,${P.p},${P.a})`:"#F2F5F3",
              border:done?"none":`2px solid ${P.b}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
              boxShadow:done?"0 3px 10px rgba(45,106,79,.24)":"none",filter:done?"none":"grayscale(1) opacity(.55)"}}>{t.i}</div>
            <div style={{paddingTop:5}}>
              <div style={{fontSize:13.5,fontWeight:done?700:500,color:done?P.t:P.g2}}>{t.l}</div>
              <div style={{fontSize:12,color:done?P.g:"#B7C0BC",marginTop:2}}>{t.d?fmtShort(t.d):t.alt||"Pendiente"}</div>
            </div>
          </div>
        );
      })}
      {claim.days_to_close&&<div style={{marginTop:14,padding:"10px 14px",background:P.pL,borderRadius:10,fontSize:13,fontWeight:650,color:P.p}}>
        Cerrado en {claim.days_to_close} días desde el reclamo
      </div>}
    </div>
  );

  return(
    <div style={{maxWidth:1180,margin:"0 auto",padding:"20px 18px 60px"}}>

      {/* ═══ HEADER ═══ */}
      <div className="fade-in" style={{...sHeader,padding:"22px 26px"}}>
        <div style={{position:"absolute",right:-40,top:-60,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none"}}/>
        <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
          <div>
            <button className="btn" onClick={onBack} style={{...sBGhost,padding:"6px 13px",fontSize:12,marginBottom:10}}>← Dashboard</button>
            <div style={{fontSize:24,fontWeight:750,letterSpacing:"-.4px"}}>{claim.containers}</div>
            <div style={{fontSize:13,opacity:.85,marginTop:3}}>{claim.clients?.name}{claim.contact_name?` — ${claim.contact_name}`:""}</div>
          </div>
          <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:7}}>
            <span style={sPill(st.c,st.bg)}>{st.l}</span>
            {claim.concept&&<span style={sPill(CONCEPTS[claim.concept]?.c,CONCEPTS[claim.concept]?.bg)}>{CONCEPTS[claim.concept]?.l}</span>}
          </div>
        </div>
      </div>

      {/* ═══ ALERTAS ═══ */}
      {claim.status==="open"&&daysOpen>=7&&<div style={sA("danger")}><strong>🚨 {daysOpen} días sin respuesta.</strong> Por política, este claim procede automáticamente.</div>}
      {claim.status==="open"&&daysOpen>=3&&daysOpen<5&&<div style={sA("warning")}><strong>⚠️ {daysOpen} días sin respuesta.</strong> Quedan {5-daysOpen} días antes de que proceda automáticamente.</div>}
      {claim.status==="responded_commercial"&&daysWaitClient>=7&&<div style={sA("info")}><strong>ℹ️ {daysWaitClient} días esperando al cliente.</strong> Puede cerrarse como No Procede por falta de respuesta.</div>}

      <div className="detail-grid">
        {/* ═══ SIDEBAR RESUMEN ═══ */}
        <aside className="sticky-side">
          <div className="fade-in" style={{...sC,padding:"18px 20px"}}>
            <div style={{fontSize:10.5,fontWeight:700,color:P.g2,textTransform:"uppercase",letterSpacing:".8px",marginBottom:14}}>Resumen rápido</div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:11.5,color:P.g,marginBottom:5}}>Estado</div>
              <span style={sPill(st.c,st.bg)}>{st.l}</span>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:11.5,color:P.g,marginBottom:5}}>Concepto de Calidad</div>
              {claim.concept
                ?<span style={sPill(CONCEPTS[claim.concept]?.c,CONCEPTS[claim.concept]?.bg)}>{CONCEPTS[claim.concept]?.l}</span>
                :<span style={{fontSize:13,color:P.g2}}>Sin definir</span>}
            </div>

            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{fontSize:11.5,color:P.g}}>Impacto ponderado</span>
                <span style={{fontSize:19,fontWeight:800,color:impactColor,letterSpacing:"-.4px"}}>{impact}%</span>
              </div>
              <div style={sBarWrap}><div style={sBar(Math.min(impact,100),impactColor)}/></div>
            </div>

            <div className="grid-2" style={{gap:10,marginBottom:16}}>
              <div style={{background:"#F7FAF8",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:19,fontWeight:800,color:daysOpen>=7?P.r:daysOpen>=5?P.oD:P.p}}>{daysOpen??"—"}</div>
                <div style={{fontSize:10.5,color:P.g,marginTop:2}}>días abierto</div>
              </div>
              <div style={{background:"#F7FAF8",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:19,fontWeight:800,color:claim.within_window?P.p:P.o}}>{claim.days_to_claim??"—"}</div>
                <div style={{fontSize:10.5,color:P.g,marginTop:2}}>días ventana</div>
              </div>
            </div>

            {/* Progreso de pasos */}
            <div style={{fontSize:11.5,color:P.g,marginBottom:8}}>Progreso</div>
            {STEPS.map((s,i)=>(
              <div key={s.k} style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:i<=idx?P.a:"#E1E7E4",border:i===idx?`2px solid ${P.p}`:"none",boxSizing:"content-box",flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:i===idx?700:500,color:i<=idx?P.t:P.g2}}>{s.l}</span>
              </div>
            ))}

            <div style={{borderTop:`1px solid ${P.b2}`,marginTop:14,paddingTop:12,fontSize:11.5,color:P.g,lineHeight:1.7}}>
              <div>Tipo: <strong style={{color:P.t}}>{CLS_LABEL[claim.classification]||"—"}</strong></div>
              <div>Idioma: <strong style={{color:P.t}}>{claim.language==="en"?"English":"Español"}</strong></div>
              <div>Creado por: <strong style={{color:P.t}}>{claim.created_by||"—"}</strong></div>
            </div>
          </div>
        </aside>

        {/* ═══ CONTENIDO PRINCIPAL ═══ */}
        <main style={{minWidth:0}}>
          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginBottom:16,background:P.w,padding:5,borderRadius:12,border:`1px solid ${P.b}`,boxShadow:SH1,overflowX:"auto"}}>
            {[["info","Información","📄"],["emails","Correos","✉️"],["actions","Acciones","⚡"],["history","Historial","🕓"]].map(([k,l,ic])=>(
              <div key={k} className="tabx" onClick={()=>setTab(k)}
                style={{padding:"9px 16px",cursor:"pointer",borderRadius:9,fontSize:13.5,fontWeight:tab===k?700:550,whiteSpace:"nowrap",
                  color:tab===k?P.w:P.g,background:tab===k?GRAD:"transparent"}}>
                <span style={{marginRight:6}}>{ic}</span>{l}
              </div>
            ))}
          </div>

          {/* TAB: INFO */}
          {tab==="info"&&(<div key="info" className="fade-in">
            <div style={sC}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h3 style={{fontSize:16.5,margin:0,color:P.pD,fontWeight:750}}>Datos del caso</h3>
                {canEdit&&!editing&&<button className="btn" onClick={()=>{setEdit({...claim});setEditing(true);}} style={{...sBS,padding:"7px 15px",fontSize:12.5}}>✏️ Editar</button>}
              </div>
              {!editing?(<>
                <Row l="Contenedor(es)" v={claim.containers}/>
                <Row l="Factura" v={claim.invoice}/>
                <Row l="Empresa" v={claim.clients?.name}/>
                <Row l="Contacto" v={claim.contact_name}/>
                <Row l="ETD" v={fmtShort(claim.etd)}/>
                <Row l="ETA" v={fmtShort(claim.eta)}/>
                <Row l="Fecha llegada" v={fmtShort(claim.arrival_date)}/>
                <Row l="Fecha reclamo" v={fmtShort(claim.claim_date)}/>
                <Row l="Días ventana" v={claim.days_to_claim!==null?`${claim.days_to_claim} días ${claim.within_window?"(dentro)":"(fuera)"}`:null}/>
                <Row l="Clasificación" v={CLS_LABEL[claim.classification]}/>
                <Row l="Cat. Cartama" v={CATS.find(c=>c.id===claim.category_cartama)?.label}/>
                <Row l="Cat. Cliente" v={CATS.find(c=>c.id===claim.category_client)?.label}/>
                <Row l="Evidencia fotográfica" v={claim.has_photos===true?"Sí":claim.has_photos===false?"No":null}/>
                <Row l="% pérdida reportado" v={claim.has_loss_pct===true?"Sí":claim.has_loss_pct===false?"No":null}/>
                <Row l="Notas" v={claim.notes}/>
              </>):(<div style={{display:"grid",gap:12}}>
                <div><label style={sL}>Contenedor(es)</label><input style={sI} value={edit.containers||""} onChange={e=>setEdit({...edit,containers:e.target.value})}/></div>
                <div><label style={sL}>Factura</label><input style={sI} value={edit.invoice||""} onChange={e=>setEdit({...edit,invoice:e.target.value})}/></div>
                <div className="grid-2">
                  <div><label style={sL}>Empresa</label><select style={sI} value={edit.client_id||""} onChange={e=>setEdit({...edit,client_id:parseInt(e.target.value)})}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label style={sL}>Contacto</label><input style={sI} value={edit.contact_name||""} onChange={e=>setEdit({...edit,contact_name:e.target.value})}/></div>
                </div>
                <div className="grid-2">
                  <div><label style={sL}>Fecha llegada</label><input type="date" style={sI} value={edit.arrival_date?.split("T")[0]||""} onChange={e=>setEdit({...edit,arrival_date:e.target.value})}/></div>
                  <div><label style={sL}>Fecha reclamo</label><input type="date" style={sI} value={edit.claim_date?.split("T")[0]||""} onChange={e=>setEdit({...edit,claim_date:e.target.value})}/></div>
                </div>
                <div className="grid-3">
                  <div><label style={{...sL,fontSize:10}}>ETD</label><input type="date" style={{...sI,fontSize:13}} value={edit.etd?.split("T")[0]||""} onChange={e=>setEdit({...edit,etd:e.target.value})}/></div>
                  <div><label style={{...sL,fontSize:10}}>ETA</label><input type="date" style={{...sI,fontSize:13}} value={edit.eta?.split("T")[0]||""} onChange={e=>setEdit({...edit,eta:e.target.value})}/></div>
                  <div><label style={{...sL,fontSize:10}}>Recogida</label><input type="date" style={{...sI,fontSize:13}} value={edit.pickup_date?.split("T")[0]||""} onChange={e=>setEdit({...edit,pickup_date:e.target.value})}/></div>
                </div>
                <div><label style={sL}>Notas</label><textarea style={{...sI,minHeight:60,resize:"vertical"}} value={edit.notes||""} onChange={e=>setEdit({...edit,notes:e.target.value})}/></div>
                <div style={{display:"flex",gap:10}}>
                  <button className="btn" onClick={saveEdit} disabled={saving} style={{...sB(!saving),flex:1}}>{saving?"Guardando…":"Guardar cambios"}</button>
                  <button className="btn" onClick={()=>setEditing(false)} style={sBS}>Cancelar</button>
                </div>
              </div>)}
            </div>

            {shipData.length>0&&(
              <div style={sC}>
                <h3 style={{fontSize:16.5,margin:"0 0 14px",color:P.pD,fontWeight:750}}>📦 Datos de despacho</h3>
                <ContainerInfo data={shipData}/>
              </div>
            )}

            <div style={sC}>
              <h3 style={{fontSize:16.5,margin:"0 0 14px",color:P.pD,fontWeight:750}}>Defectos reportados</h3>
              {defectData.sel.length===0&&defectData.urgSel.length===0?<div style={{color:P.g,fontSize:13}}>Sin defectos registrados</div>:(<>
                {defectData.sel.map(d=>{const ev=defectData.evals[d.id];const evl=EV_L[ev];return(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${P.b2}`,fontSize:13.5,flexWrap:"wrap"}}>
                    <span style={{flex:1,minWidth:170}}><strong>{d.name}</strong> <span style={{color:P.g}}>/ {d.es}</span></span>
                    <span style={{fontWeight:700}}>{defectData.vals[d.id]}% <span style={{color:P.g,fontWeight:500,fontSize:12}}>{d.unit==="cargo"?"carga":"fruta"}</span></span>
                    {defectData.palls[d.id]&&<span style={{color:P.g,fontSize:12}}>{defectData.palls[d.id]} pallets</span>}
                    {evl&&<span style={sT(evl.c,evl.b)}>{evl.t}</span>}
                  </div>);})}
                {defectData.urgSel.map(u=>(
                  <div key={u.id} style={{padding:"10px 12px",marginTop:8,borderRadius:10,background:"#FDEDEE",fontSize:13,color:P.r,fontWeight:650,borderLeft:`3px solid ${P.r}`}}>🚨 {u.name} / {u.es}</div>))}
                <div style={{marginTop:16,padding:"14px 18px",background:`linear-gradient(135deg,${P.pL},#EDF9F1)`,borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:650,color:P.p}}>% Impacto Ponderado</div>
                    <div style={{fontSize:11,color:P.a,marginTop:2}}>Carga ×1.0 · Fruta ×0.5</div>
                  </div>
                  <span style={{fontSize:26,fontWeight:800,color:P.p,letterSpacing:"-.6px"}}>{impact}%</span>
                </div>
                {(claim.defect_category||[]).length>0&&<div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>{(claim.defect_category||[]).map(c=><span key={c} style={sT(P.pD,"#EFF3F1")}>{DEFECT_CATEGORIES[c]||c}</span>)}</div>}
              </>)}
            </div>

            {insights.length>0&&(
              <div style={sC}>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}>
                  <span style={{fontSize:16}}>💡</span>
                  <h3 style={{fontSize:16.5,margin:0,color:P.pD,fontWeight:750}}>Alertas al momento de crear el claim</h3>
                </div>
                <div style={{fontSize:12.5,color:P.g,marginBottom:14}}>Patrones detectados en el histórico cuando se creó este claim.</div>
                {insights.map(ins=>{
                  const sev={info:{c:P.bl,bg:"#EAF4FC"},warning:{c:P.oD,bg:"#FFF8E6"},danger:{c:P.r,bg:"#FDEDEE"}}[ins.severity]||{c:P.g,bg:"#F5F7F6"};
                  const acertada=claim.concept==="proceeds"||claim.concept==="negotiable";
                  const showJudge=claim.concept&&(ins.alert_key==="a5"||ins.alert_key==="a1");
                  return(
                    <div key={ins.id} style={{padding:"11px 14px",background:sev.bg,borderRadius:10,marginBottom:8,borderLeft:`3px solid ${sev.c}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:sev.c}}>{ins.alert_title}</div>
                        {showJudge&&<span style={{...sT(acertada?P.p:P.g,acertada?P.pL:"#F0F3F1"),fontSize:10.5}}>
                          {acertada?"✓ Alerta acertada":"○ No procedió"}
                        </span>}
                      </div>
                      <div style={{fontSize:12.5,color:P.t,marginTop:4,lineHeight:1.5}}>{ins.alert_message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={sC}>
              <h3 style={{fontSize:16.5,margin:"0 0 18px",color:P.pD,fontWeight:750}}>Línea de tiempo</h3>
              <Timeline/>
            </div>
          </div>)}

          {/* TAB: CORREOS */}
          {tab==="emails"&&(<div key="emails" className="fade-in">
            <MailView
              variant="initial"
              title="Respuesta inicial"
              subtitle="Generada por Comercial"
              lang={claim.language}
              to={claim.contact_name?`${claim.contact_name} — ${claim.clients?.name||""}`:claim.clients?.name}
              subject={emailSubject(claim.language,claim.containers,claim.clients?.name,claim.classification)}
              body={claim.initial_response||"Sin respuesta inicial registrada"}
            />

            {/* Separador visual entre correos */}
            <div style={{display:"flex",alignItems:"center",gap:12,margin:"22px 0"}}>
              <div style={{flex:1,height:1,background:P.b}}/>
              <span style={{fontSize:10.5,fontWeight:700,color:P.g2,letterSpacing:"1.2px",textTransform:"uppercase"}}>Posición de Calidad</span>
              <div style={{flex:1,height:1,background:P.b}}/>
            </div>

            {!showTech?(
              <div style={{...sC,padding:"24px"}}>
                {canQuality?(<>
                  <div style={{fontSize:14,color:P.t,fontWeight:650,marginBottom:5}}>Selecciona el escenario que mejor describe el caso</div>
                  <div style={{fontSize:12.5,color:P.g,marginBottom:16}}>El sistema genera un correo concluyente basado en el escenario elegido.</div>
                  <div style={{display:"grid",gap:9,marginBottom:18}}>
                    {SCENARIOS.map(sc=>(
                      <div key={sc.id} onClick={()=>setScenario(sc.id)}
                        style={{display:"flex",alignItems:"center",gap:13,padding:"14px 16px",borderRadius:12,cursor:"pointer",
                          border:`2px solid ${scenario===sc.id?sc.color:P.b}`,
                          background:scenario===sc.id?`${sc.color}0D`:P.w,
                          boxShadow:scenario===sc.id?`0 3px 12px ${sc.color}22`:"none"}}>
                        <div style={{width:40,height:40,borderRadius:10,background:`${sc.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{sc.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:scenario===sc.id?sc.color:P.t}}>{sc.label}</div>
                          <div style={{fontSize:12,color:P.g,marginTop:1}}>{sc.desc}</div>
                        </div>
                        {sc.concept&&<span style={sT(
                          sc.concept==="proceeds"?P.r:sc.concept==="negotiable"?P.oD:P.p,
                          sc.concept==="proceeds"?P.rL:sc.concept==="negotiable"?P.oL:P.pL
                        )}>{sc.concept==="proceeds"?"Procede":sc.concept==="negotiable"?"Negociable":"No Procede"}</span>}
                        <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${scenario===sc.id?sc.color:P.b}`,
                          background:scenario===sc.id?sc.color:P.w,display:"flex",alignItems:"center",justifyContent:"center",
                          color:P.w,fontSize:12,fontWeight:700,flexShrink:0}}>{scenario===sc.id?"✓":""}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn" onClick={()=>genTech(scenario)} disabled={!scenario}
                    style={{...sB(!!scenario),width:"100%",padding:"14px"}}>
                    {scenario?"Generar correo técnico →":"Selecciona un escenario"}
                  </button>
                </>):(
                  <div style={{textAlign:"center",padding:"20px",color:P.g,fontSize:13.5}}>
                    <div style={{fontSize:32,marginBottom:10}}>🔬</div>
                    Aún no se ha generado la respuesta técnica
                  </div>
                )}
              </div>
            ):(<>
              {canQuality&&<div style={sA("info")}><strong>ℹ️ Borrador editable.</strong> Ajusta el texto según tu análisis antes de enviar. Escenario: <strong>{SCENARIOS.find(s=>s.id===scenario)?.label||"Personalizado"}</strong></div>}
              <MailView
                variant="technical"
                title="Respuesta técnica"
                subtitle={`Posición de Calidad${claim.technical_response_generated_by?` — ${claim.technical_response_generated_by}`:""}${claim.technical_response_date?` · ${fmtShort(claim.technical_response_date)}`:""}`}
                lang={claim.language}
                to={claim.contact_name?`${claim.contact_name} — ${claim.clients?.name||""}`:claim.clients?.name}
                subject={emailSubject(claim.language,claim.containers,claim.clients?.name,claim.classification)}
                body={techResp}
                editable={canQuality}
                onChange={setTechResp}
                footer={canQuality?(<>
                  <button className="btn" onClick={saveTech} disabled={saving} style={{...sBS,flex:1,minWidth:150}}>{saving?"Guardando…":"💾 Guardar en el claim"}</button>
                  <button className="btn" onClick={()=>genTech(scenario)} style={{...sBS,padding:"12px 16px"}} title="Regenerar borrador">↻</button>
                </>):null}
              />
            </>)}
          </div>)}

          {/* TAB: ACCIONES */}
          {tab==="actions"&&(<div key="actions" className="fade-in">
            <div style={sC}>
              <h3 style={{fontSize:16.5,margin:"0 0 4px",color:P.pD,fontWeight:750}}>Cambiar estado</h3>
              <div style={{fontSize:12.5,color:P.g,marginBottom:14}}>Avanza el claim en el flujo operativo.</div>
              <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                {Object.entries(STATUS).filter(([k])=>!["proceeds","negotiable","not_proceeds"].includes(k)).map(([k,v])=>(
                  <button key={k} className="btn" onClick={()=>changeStatus(k)} disabled={saving||claim.status===k}
                    style={{padding:"11px 17px",borderRadius:10,border:`2px solid ${claim.status===k?v.c:P.b}`,background:claim.status===k?v.bg:P.w,
                      color:claim.status===k?v.c:P.t,fontWeight:claim.status===k?700:550,fontSize:13,cursor:claim.status===k?"default":"pointer"}}>
                    {claim.status===k?"● ":""}{v.l}
                  </button>
                ))}
              </div>
            </div>

            {claim.status==="responded_commercial"&&(
              <div style={sC}>
                <h3 style={{fontSize:16.5,margin:"0 0 4px",color:P.pD,fontWeight:750}}>¿El cliente respondió?</h3>
                <div style={{fontSize:12.5,color:P.g,marginBottom:14}}>Si el cliente no responde en 7 días, el claim no procede.{daysWaitClient!==null&&` Han pasado ${daysWaitClient} días.`}</div>
                <div style={{display:"flex",gap:10}} className="stack-sm">
                  <button className="btn" onClick={()=>markClientResponded(true)} disabled={saving} style={{...sB(),flex:1}}>✓ Sí respondió</button>
                  <button className="btn" onClick={()=>markClientResponded(false)} disabled={saving} style={{...sBD,flex:1,padding:"12px"}}>✕ No respondió</button>
                </div>
              </div>
            )}

            {canQuality&&(
              <div style={sC}>
                <h3 style={{fontSize:16.5,margin:"0 0 4px",color:P.pD,fontWeight:750}}>Concepto final de Calidad</h3>
                <div style={{fontSize:12.5,color:P.g,marginBottom:14}}>Define el resultado del claim después de la revisión.</div>
                <div className="grid-3" style={{marginBottom:14}}>
                  {Object.entries(CONCEPTS).map(([k,v])=>(
                    <div key={k} className="opt" onClick={()=>setConcept(k)}
                      style={{padding:"16px",borderRadius:12,border:`2px solid ${concept===k?v.c:P.b}`,background:concept===k?v.bg:P.w,cursor:"pointer",
                        textAlign:"center",fontWeight:concept===k?750:550,color:concept===k?v.c:P.t,fontSize:14}}>
                      {v.l}
                    </div>
                  ))}
                </div>
                <label style={sL}>Descripción del concepto</label>
                <textarea style={{...sI,minHeight:86,resize:"vertical"}} placeholder="Explicación de la decisión…" value={conceptDesc} onChange={e=>setConceptDesc(e.target.value)}/>
                <button className="btn" onClick={saveConcept} disabled={saving||!concept} style={{...sB(!!concept&&!saving),width:"100%",marginTop:12}}>{saving?"Guardando…":"Guardar concepto"}</button>
              </div>
            )}

            {canDelete&&(
              <div style={{...sC,border:`1px solid #F3C9CD`}}>
                <h3 style={{fontSize:16.5,margin:"0 0 12px",color:P.r,fontWeight:750}}>Zona de peligro</h3>
                {!confirmDel?
                  <button className="btn" onClick={()=>setConfirmDel(true)} style={{...sBD,width:"100%"}}>🗑 Eliminar este claim</button>
                  :<div className="fade-in">
                    <div style={sA("danger")}><strong>¿Seguro?</strong> Esta acción no se puede deshacer.</div>
                    <div style={{display:"flex",gap:10}}>
                      <button className="btn" onClick={doDelete} style={{...sB(),flex:1,background:P.r}}>Sí, eliminar</button>
                      <button className="btn" onClick={()=>setConfirmDel(false)} style={{...sBS,flex:1}}>Cancelar</button>
                    </div>
                  </div>}
              </div>
            )}
          </div>)}

          {/* TAB: HISTORIAL */}
          {tab==="history"&&(<div key="history" className="fade-in">
            <div style={sC}>
              <h3 style={{fontSize:16.5,margin:"0 0 14px",color:P.pD,fontWeight:750}}>Historial de cambios</h3>
              {history.length===0?<div style={{color:P.g,fontSize:13}}>Sin cambios registrados</div>
              :history.map(h=>(
                <div key={h.id} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${P.b2}`,fontSize:13,alignItems:"flex-start"}}>
                  <span style={{color:P.g2,fontSize:11.5,minWidth:78,paddingTop:2}}>{fmtShort(h.created_at)}</span>
                  <span style={{flex:1}}>
                    <strong>{h.action==="status_change"?"Cambio de estado":h.action==="concept_set"?"Concepto definido":h.action==="auto_proceed"?"Auto-procede (7d sin respuesta)":h.action==="auto_not_proceeds"?"Auto no procede (cliente no respondió)":h.action}</strong>
                    {h.old_value&&h.new_value&&<span style={{color:P.g}}> — {STATUS[h.old_value]?.l||h.old_value} → {STATUS[h.new_value]?.l||CONCEPTS[h.new_value]?.l||h.new_value}</span>}
                    {!h.old_value&&h.new_value&&<span style={{color:P.g}}> — {CONCEPTS[h.new_value]?.l||h.new_value}</span>}
                  </span>
                  <span style={{color:P.g,fontSize:12}}>{h.changed_by==="sistema"?"🤖 Sistema":h.changed_by}</span>
                </div>
              ))}
            </div>
            <div style={sC}>
              <h3 style={{fontSize:16.5,margin:"0 0 14px",color:P.pD,fontWeight:750}}>Alertas enviadas</h3>
              {alertHist.length===0?<div style={{color:P.g,fontSize:13}}>Sin alertas enviadas</div>
              :alertHist.map(a=>(
                <div key={a.id} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${P.b2}`,fontSize:13,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:P.g2,fontSize:11.5,minWidth:78}}>{fmtShort(a.sent_at||a.created_at)}</span>
                  <span style={{flex:1,minWidth:180}}>
                    {a.alert_type==="no_response_3d"&&"⚠️ Advertencia: 3 días sin respuesta"}
                    {a.alert_type==="no_response_5d"&&"🚨 Urgente: 5 días — procede automáticamente"}
                    {a.alert_type==="client_silent_5d"&&"ℹ️ Cliente sin respuesta: 5 días"}
                    {a.alert_type==="client_silent_7d"&&"📋 Cliente no respondió: 7 días — no procede"}
                  </span>
                  <span style={sT(a.sent?P.p:P.o,a.sent?P.pL:P.oL)}>{a.sent?"Enviado":"Pendiente"}</span>
                </div>
              ))}
            </div>
          </div>)}
        </main>
      </div>
    </div>
  );
}
