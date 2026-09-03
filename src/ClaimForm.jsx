import {useState,useEffect,useRef,useMemo} from "react";
import {supabase} from "./supabase.js";
import {P,SH1,sC,sI,sL,sB,sBS,sBGhost,sT,sA,sO,sYN,sCk,sBx,sHeader,
  daysBetween,emailSubject} from "./styles.js";
import {CLS,CL_CARDS,DEFS,URG,CATS,EV_L,FU_ST,INFO_T,ALL_DEFECTS} from "./constants.js";
import {buildInitialResponse} from "./responses.js";
import MailView from "./MailView.jsx";
import {computeAlerts,saveClaimInsights} from "./insights.js";
import {lookupContainers} from "./shipments.js";
import ContainerInfo from "./ContainerInfo.jsx";

const S={LANG:0,DATA:1,CLASS:2,TIMING:3,TURG:4,EVID:5,CAT:6,DEF:7,ALERT:8,FU:9,INFO:10,SUM:11};

const STEP_NAME={
  [S.LANG]:"Idioma",[S.DATA]:"Datos del caso",[S.CLASS]:"Clasificación",
  [S.TIMING]:"Temporalidad",[S.TURG]:"Escalamiento",[S.EVID]:"Evidencia",
  [S.CAT]:"Categoría",[S.DEF]:"Defectos",[S.ALERT]:"Alerta de calidad",
  [S.FU]:"Seguimiento",[S.INFO]:"Información",[S.SUM]:"Respuesta",
};

/* Ruta de pasos según la clasificación, para la barra de progreso */
function pathFor(cls,inWin,photos){
  const base=[S.LANG,S.DATA,S.CLASS];
  if(cls===CLS.QA)return[...base,S.ALERT,S.SUM];
  if(cls===CLS.FU)return[...base,S.FU,S.SUM];
  if(cls===CLS.IR)return[...base,S.INFO,S.SUM];
  if(cls===CLS.FC){
    if(inWin===false)return[...base,S.TIMING,S.TURG,S.SUM];
    if(photos===false)return[...base,S.TIMING,S.EVID,S.SUM];
    return[...base,S.TIMING,S.EVID,S.CAT,S.DEF,S.SUM];
  }
  return[...base,S.SUM];
}

export default function ClaimForm({user,clients,onBack,onSaved,allClaims=[],alertConfig=null}){
  const[step,setStep]=useState(S.LANG);
  const[lang,setLang]=useState("");
  const[dt,setDt]=useState({ct:"",clientId:"",contact:"",inv:"",arr:"",em:"",etd:"",eta:"",pk:""});
  const[cls,setCls]=useState("");
  const[photos,setPhotos]=useState(null);const[loss,setLoss]=useState(null);
  const[catC,setCatC]=useState("");const[catCl,setCatCl]=useState("");
  const[dChk,setDChk]=useState({});const[dVal,setDVal]=useState({});const[dPall,setDPall]=useState({});
  const[uChk,setUChk]=useState({});const[showPall,setShowPall]=useState(false);const[notes,setNotes]=useState("");
  const[pkgQty,setPkgQty]=useState("");const[pkgType,setPkgType]=useState("");const[pkgFruit,setPkgFruit]=useState("");
  const[aChk,setAChk]=useState({});const[aW,setAW]=useState("");const[aQC,setAQC]=useState(null);
  const[fuSt,setFuSt]=useState("");const[fuM,setFuM]=useState("");const[iChk,setIChk]=useState({});const[tUChk,setTUChk]=useState({});
  const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);
  const[shipData,setShipData]=useState([]);const[shipLoading,setShipLoading]=useState(false);
  const shipTimer=useRef(null);

  /* Auto-lookup contenedor con debounce 800ms */
  useEffect(()=>{
    clearTimeout(shipTimer.current);
    const v=dt.ct.trim();
    if(!v||v.length<8){setShipData([]);return;}
    setShipLoading(true);
    shipTimer.current=setTimeout(async()=>{
      try{const r=await lookupContainers(v);setShipData(r);}
      catch(e){console.error(e);setShipData([]);}
      finally{setShipLoading(false);}
    },800);
    return()=>clearTimeout(shipTimer.current);
  },[dt.ct]);

  const days=useMemo(()=>daysBetween(dt.arr,dt.em),[dt.arr,dt.em]);
  const inWin=days!==null?days<=7:null;
  const sD=ALL_DEFECTS.filter(d=>dChk[d.id]);
  const sU=URG.filter(u=>uChk[u.id]);const hasU=sU.length>0;
  const tU=URG.filter(u=>tUChk[u.id]);
  const dE=useMemo(()=>{const e={};sD.forEach(d=>{const v=parseFloat(dVal[d.id]);if(!isNaN(v)&&d.ev)e[d.id]=d.ev(v);else if(!d.hasTh&&d.ev)e[d.id]=d.ev(0);});return e;},[sD,dVal]);
  const hasF=Object.values(dE).some(e=>e==="fail"||e==="verify");
  const hasUD=Object.values(dE).some(e=>e==="urgent");
  const catM=catC&&catCl&&catC!==catCl;
  const aD=useMemo(()=>ALL_DEFECTS.filter(d=>aChk[d.id]).map(d=>lang==="en"?d.name:d.es),[aChk,lang]);
  const iT=INFO_T.filter(t=>iChk[t.id]).map(t=>lang==="en"?t.en:t.es);
  const clientName=clients.find(c=>c.id===parseInt(dt.clientId))?.name||"[Client]";

  /* Alertas inteligentes en vivo */
  const liveAlerts=useMemo(()=>{
    if(!alertConfig||!dt.clientId)return[];
    const defectIds=[...sD.map(d=>d.id),...sU.map(u=>u.id),...tU.map(u=>u.id),...aD.map(x=>{const f=ALL_DEFECTS.find(d=>(lang==="en"?d.name:d.es)===x);return f?.id;}).filter(Boolean)];
    if(defectIds.length===0)return[];
    return computeAlerts({cfg:alertConfig,clientId:parseInt(dt.clientId),defectIds,allClaims});
  },[alertConfig,dt.clientId,sD,sU,tU,aD,lang,allClaims]);

  /* Progreso */
  const path=useMemo(()=>pathFor(cls,inWin,photos),[cls,inWin,photos]);
  const stepIdx=Math.max(0,path.indexOf(step));
  const pct=Math.round(((stepIdx+1)/path.length)*100);

  const msgCode=useMemo(()=>{
    /* MSG-09: defectos reportados TODOS dentro de parámetros → rechazo cortés (aplica a FC, QA, FU) */
    if(cls!==CLS.IR){
      const evalDefects=sD.filter(d=>d.hasTh&&d.ev);
      const allOk=evalDefects.length>0&&evalDefects.every(d=>{const v=parseFloat(dVal[d.id]);return!isNaN(v)&&d.ev(v)==="ok";});
      if(allOk&&sU.length===0&&tU.length===0&&!hasU&&!hasUD)return"MSG-09";
    }
    if(cls===CLS.QA)return"MSG-06";if(cls===CLS.FU)return"MSG-07";if(cls===CLS.IR)return"MSG-08";
    if(inWin===false)return"MSG-04";if(photos===false)return"MSG-05";
    if(hasU||hasUD)return"MSG-03";if(hasF||catM||Object.values(dE).some(e=>e==="near"||e==="verify"))return"MSG-02";
    return"MSG-01";
  },[cls,inWin,photos,hasU,hasUD,hasF,catM,dE,sD,sU,tU,dVal]);

  const pallText=useMemo(()=>{
    if(!showPall)return"";
    const p=sD.filter(d=>dPall[d.id]).map(d=>`${lang==="en"?d.name:d.es}: ${dPall[d.id]} pallets`);
    return p.length>0?(lang==="en"?`Affected pallets reported: ${p.join(", ")}.`:`Pallets afectados reportados: ${p.join(", ")}.`):"";
  },[showPall,sD,dPall,lang]);

  const response=useMemo(()=>buildInitialResponse(msgCode,lang||"en",{
    client:clientName,contact:dt.contact,containers:dt.ct||"[Container]",arrival:dt.arr,emailDate:dt.em,days,
    defects:sD,noLossPct:loss===false,pallets:pallText,timingUrgent:tU,
    alertDefects:aD,alertWaste:aW,alertQC:aQC===true,fuState:fuSt,fuMissing:fuM?fuM.split("\n").filter(Boolean):null,infoTypes:iT,
  }),[msgCode,lang,clientName,dt,days,sD,loss,pallText,tU,aD,aW,aQC,fuSt,fuM,iT]);

  const save=async()=>{
    setSaving(true);
    const cats=new Set();sD.forEach(d=>{if(d.cat)cats.add(d.cat);});
    sU.concat(tU).forEach(u=>{if(u.cat)cats.add(u.cat);});
    const row={
      year:new Date().getFullYear(),market:"Europe",
      client_id:parseInt(dt.clientId)||null,contact_name:dt.contact||null,containers:dt.ct,invoice:dt.inv||null,
      etd:dt.etd||null,eta:dt.eta||null,arrival_date:dt.arr||null,pickup_date:dt.pk||null,
      classification:cls,language:lang,category_cartama:catC||null,category_client:catCl||null,category_mismatch:!!catM,
      defect_category:Array.from(cats),
      claim_date:dt.em||null,days_to_claim:days,within_window:inWin,
      has_photos:photos,has_loss_pct:loss,
      urgent_items:sU.map(u=>u.id).concat(tU.map(u=>u.id)),
      packaging_qty:pkgQty||null,packaging_type:pkgType||null,packaging_fruit_damaged:pkgFruit||null,
      status:"open",initial_response:response,notes:notes?notes+(uChk.packaging?`\n[Empaque] Cant: ${pkgQty||"—"}, Tipo: ${pkgType||"—"}, Fruta dañada: ${pkgFruit||"—"}`:""):uChk.packaging?`[Empaque] Cant: ${pkgQty||"—"}, Tipo: ${pkgType||"—"}, Fruta dañada: ${pkgFruit||"—"}`:null,
      created_by:user.username,last_modified_by:user.username,
    };
    ALL_DEFECTS.forEach(d=>{
      row[`${d.db}_pct`]=dVal[d.id]?parseFloat(dVal[d.id]):null;
      row[`${d.db}_pallets`]=dPall[d.id]?parseInt(dPall[d.id]):null;
      row[`${d.db}_eval`]=dE[d.id]||null;
    });
    const{data:inserted,error}=await supabase.from("claims").insert(row).select().single();
    if(!error&&inserted&&liveAlerts.length>0){
      await saveClaimInsights(inserted.id,liveAlerts);
    }
    setSaving(false);
    if(!error){setSaved(true);onSaved();}else alert("Error: "+error.message);
  };

  const canDt=dt.ct.trim()&&dt.clientId&&dt.arr&&dt.em;
  const canDef=sD.length>0||sU.length>0;
  const next=()=>{if(cls===CLS.FC)setStep(S.TIMING);else if(cls===CLS.QA)setStep(S.ALERT);else if(cls===CLS.FU)setStep(S.FU);else setStep(S.INFO);};

  /* Grupo de defectos en grid de 2 columnas */
  const DG=(grp,ck,setCk,vl,setVl,ev)=>(
    <div style={{marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:750,color:P.pD,marginBottom:2}}>{grp.title}</div>
      <div style={{fontSize:11.5,color:P.g,marginBottom:11}}>{grp.sub}</div>
      <div className="defect-grid">
        {grp.items.map(it=>(
          <div key={it.id} style={{marginBottom:ck[it.id]&&ev?10:2}}>
            <div className="opt" onClick={()=>setCk(p=>({...p,[it.id]:!p[it.id]}))} style={sCk(ck[it.id],P.p)}>
              <div style={sBx(ck[it.id],P.p)}>{ck[it.id]?"✓":""}</div>
              <div style={{flex:1,fontSize:13,minWidth:0}}>
                <strong>{it.name}</strong> <span style={{color:P.g}}>/ {it.es}</span>
                {it.note&&<div style={{fontSize:10.5,color:P.g2,marginTop:1}}>{it.note}</div>}
              </div>
              {ev&&<span style={sT(P.g,"#EFF3F1")}>%{it.unit==="cargo"?"carga":"fruta"}</span>}
            </div>
            {ck[it.id]&&ev&&vl&&(
              <div className="fade-in" style={{marginLeft:30,marginTop:6,display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
                <input type="number" step="0.1" min="0" max="100" style={{...sI,width:92,padding:"7px 10px",fontSize:13}} placeholder={it.hasTh?"%":"% opc"}
                  value={vl[it.id]||""} onChange={e=>setVl(p=>({...p,[it.id]:e.target.value}))}/>
                {vl[it.id]&&dE[it.id]&&<span className="pop-in" style={sT(EV_L[dE[it.id]]?.c,EV_L[dE[it.id]]?.b)}>{EV_L[dE[it.id]]?.t}</span>}
                {it.hasTh&&it.th&&<span style={{fontSize:11,color:P.g2}}>Umbral {it.th}%</span>}
                {showPall&&<input type="number" min="0" style={{...sI,width:86,padding:"7px 10px",fontSize:13}} placeholder="Pallets"
                  value={dPall[it.id]||""} onChange={e=>setDPall(p=>({...p,[it.id]:e.target.value}))}/>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const Nav=({back,children})=>(
    <div style={{marginTop:20,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <button className="btn" onClick={back} style={sBS}>← Atrás</button>
      <div style={{display:"flex",gap:10}}>{children}</div>
    </div>
  );

  const Gate=({n,label,color})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <span style={{...sT(P.w,color||P.p),background:color||P.p,border:"none",fontSize:10.5,padding:"5px 12px",letterSpacing:".8px"}}>{n}</span>
      <h3 style={{fontSize:18,margin:0,color:P.pD,fontWeight:750,letterSpacing:"-.3px"}}>{label}</h3>
    </div>
  );

  return(
    <div style={{maxWidth:780,margin:"0 auto",padding:"20px 18px 60px"}}>
      {/* HEADER */}
      <div className="fade-in" style={{...sHeader,padding:"20px 24px"}}>
        <div style={{position:"absolute",right:-30,top:-50,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none"}}/>
        <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:2.4,opacity:.68,textTransform:"uppercase"}}>Cartama · Quality Claims</div>
            <div style={{fontSize:21,fontWeight:750,marginTop:5,letterSpacing:"-.3px"}}>Nuevo Claim</div>
          </div>
          <button className="btn" onClick={onBack} style={sBGhost}>← Dashboard</button>
        </div>

        {/* BARRA DE PROGRESO */}
        <div style={{position:"relative",marginTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,opacity:.9,marginBottom:7}}>
            <span style={{fontWeight:650}}>Paso {stepIdx+1} de {path.length} · {STEP_NAME[step]}</span>
            <span style={{fontWeight:700}}>{pct}%</span>
          </div>
          <div style={{height:6,borderRadius:99,background:"rgba(255,255,255,.22)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:"rgba(255,255,255,.92)",borderRadius:99,transition:"width .45s cubic-bezier(.2,.8,.3,1)"}}/>
          </div>
          <div className="hide-sm" style={{display:"flex",gap:6,marginTop:9,flexWrap:"wrap"}}>
            {path.map((s,i)=>(
              <span key={s} style={{fontSize:10.5,padding:"3px 9px",borderRadius:20,fontWeight:600,
                background:i<=stepIdx?"rgba(255,255,255,.9)":"rgba(255,255,255,.14)",
                color:i<=stepIdx?P.pD:"rgba(255,255,255,.75)"}}>{STEP_NAME[s]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO DEL PASO */}
      <div key={step} className="fade-in">

        {step===S.LANG&&(<div style={sC}>
          <h3 style={{fontSize:18,margin:"0 0 4px",color:P.pD,fontWeight:750}}>Idioma de la respuesta</h3>
          <p style={{fontSize:13.5,color:P.g,margin:"0 0 16px"}}>¿En qué idioma responderemos al cliente?</p>
          <div style={{display:"flex",gap:12}}>
            {[{id:"en",l:"English",f:"🇬🇧",s:"Clientes Europa / USA"},{id:"es",l:"Español",f:"🇪🇸",s:"Clientes LatAm / España"}].map(o=>(
              <div key={o.id} className="opt" onClick={()=>setLang(o.id)} style={{...sO(lang===o.id),flex:1,textAlign:"center",padding:"26px 16px",marginBottom:0}}>
                <div style={{fontSize:34}}>{o.f}</div>
                <div style={{fontSize:16.5,fontWeight:750,color:lang===o.id?P.p:P.t,marginTop:8}}>{o.l}</div>
                <div style={{fontSize:11.5,color:P.g,marginTop:3}}>{o.s}</div>
              </div>))}
          </div>
          <div style={{marginTop:20,textAlign:"right"}}><button className="btn" onClick={()=>setStep(S.DATA)} style={sB(!!lang)} disabled={!lang}>Continuar →</button></div>
        </div>)}

        {step===S.DATA&&(<div style={sC}>
          <h3 style={{fontSize:18,margin:"0 0 16px",color:P.pD,fontWeight:750}}>Datos del caso</h3>
          <div style={{display:"grid",gap:14}}>
            <div><label style={sL}>Contenedor(es) *</label><input style={sI} placeholder="CGMU7027881, CGMU6969441" value={dt.ct} onChange={e=>setDt({...dt,ct:e.target.value})}/></div>
            {shipLoading&&<div style={{fontSize:12,color:P.g,padding:"6px 0"}}>🔍 Buscando datos de despacho…</div>}
            {!shipLoading&&shipData.length>0&&<ContainerInfo data={shipData} compact/>}
            <div className="grid-2">
              <div><label style={sL}>Empresa *</label><select style={sI} value={dt.clientId} onChange={e=>setDt({...dt,clientId:e.target.value})}><option value="">Seleccionar…</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={sL}>Contacto (persona)</label><input style={sI} placeholder="Nombre" value={dt.contact} onChange={e=>setDt({...dt,contact:e.target.value})}/></div>
            </div>
            <div><label style={sL}>Factura</label><input style={sI} placeholder="# Factura" value={dt.inv} onChange={e=>setDt({...dt,inv:e.target.value})}/></div>
            <div className="grid-2">
              <div><label style={sL}>Fecha llegada *</label><input type="date" style={sI} value={dt.arr} onChange={e=>setDt({...dt,arr:e.target.value})}/></div>
              <div><label style={sL}>Fecha del correo *</label><input type="date" style={sI} value={dt.em} onChange={e=>setDt({...dt,em:e.target.value})}/></div>
            </div>
            {days!==null&&<div className="fade-in" style={sA(days<=7?"success":"warning")}><strong>{days} días</strong>{days<=7?" — Dentro de la ventana de 7 días":" — Fuera de la ventana de 7 días"}</div>}
            <div style={{borderTop:`1px solid ${P.b}`,paddingTop:14}}>
              <div style={{fontSize:10.5,fontWeight:700,color:P.g2,marginBottom:9,letterSpacing:".6px"}}>OPCIONALES</div>
              <div className="grid-3">{[["etd","ETD"],["eta","ETA"],["pk","Recogida"]].map(([f,l])=>
                <div key={f}><label style={{...sL,fontSize:10}}>{l}</label><input type="date" style={{...sI,fontSize:13,padding:"9px 11px"}} value={dt[f]} onChange={e=>setDt({...dt,[f]:e.target.value})}/></div>)}
              </div>
            </div>
          </div>
          <Nav back={()=>setStep(S.LANG)}><button className="btn" onClick={()=>setStep(S.CLASS)} style={sB(canDt)} disabled={!canDt}>Continuar →</button></Nav>
        </div>)}

        {step===S.CLASS&&(<div style={sC}>
          <h3 style={{fontSize:18,margin:"0 0 4px",color:P.pD,fontWeight:750}}>¿Qué tipo de correo recibiste?</h3>
          <p style={{fontSize:13.5,color:P.g,margin:"0 0 16px"}}>La clasificación define el flujo de evaluación.</p>
          {(CL_CARDS[lang]||CL_CARDS.en).map((c,i)=>{
            const on=cls===c.id;
            return(
              <div key={c.id} className={`opt fade-in d${i+1}`} onClick={()=>setCls(c.id)} style={{...sO(on),padding:"18px 18px"}}>
                <div style={{display:"flex",gap:15,alignItems:"flex-start"}}>
                  <div style={{width:46,height:46,borderRadius:14,background:on?P.w:"#F2F6F4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:23,flexShrink:0,boxShadow:on?SH1:"none"}}>{c.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:15.5,fontWeight:750,color:on?P.pD:P.t}}>{c.title}</span>
                      {on&&<span className="pop-in" style={{width:20,height:20,borderRadius:"50%",background:P.p,color:P.w,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:12.5,color:P.g,marginTop:3}}>{c.desc}</div>
                    {c.kw.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:9}}>{c.kw.map((k,j)=><span key={j} style={sT(P.p,P.pL)}>{k}</span>)}</div>}
                    {c.ex&&<div style={{marginTop:9,padding:"8px 12px",background:"#F7FAF8",borderRadius:9,fontSize:11.5,color:P.g,fontStyle:"italic",borderLeft:`3px solid ${P.b}`}}>{c.ex}</div>}
                  </div>
                </div>
              </div>);
          })}
          <Nav back={()=>setStep(S.DATA)}><button className="btn" onClick={next} style={sB(!!cls)} disabled={!cls}>Continuar →</button></Nav>
        </div>)}

        {step===S.TIMING&&(<div style={sC}>
          <Gate n="COMPUERTA 1 DE 3" label="Temporalidad"/>
          <div style={{...sA(inWin?"success":"danger"),padding:22,textAlign:"center",borderRadius:14}}>
            <div style={{fontSize:36,fontWeight:800,letterSpacing:"-1px"}}>{days} días</div>
            <div style={{marginTop:6,fontWeight:700,fontSize:14}}>{inWin?"✓ DENTRO de la ventana de reclamo":"✕ FUERA de la ventana de 7 días"}</div>
          </div>
          {!inWin&&<div style={sA("warning")}>Antes de generar la respuesta, verifica si hay escalamiento urgente.</div>}
          <Nav back={()=>setStep(S.CLASS)}><button className="btn" onClick={()=>inWin?setStep(S.EVID):setStep(S.TURG)} style={sB()}>{inWin?"Continuar →":"Verificar urgentes →"}</button></Nav>
        </div>)}

        {step===S.TURG&&(<div style={sC}>
          <Gate n="FUERA DE VENTANA" label="¿Hay escalamiento urgente?" color={P.r}/>
          <p style={{fontSize:13,color:P.g,margin:"0 0 14px"}}>Aunque esté fuera de ventana, si hay algo urgente debe incluirse.</p>
          <div className="defect-grid">
            {URG.map(u=><div key={u.id} className="opt" onClick={()=>setTUChk(p=>({...p,[u.id]:!p[u.id]}))} style={sCk(tUChk[u.id],P.r)}>
              <div style={sBx(tUChk[u.id],P.r)}>{tUChk[u.id]?"✓":""}</div>
              <span style={{fontSize:13}}><strong>{u.name}</strong> <span style={{color:P.g}}>/ {u.es}</span></span></div>)}
          </div>
          {tU.length>0&&<div className="fade-in" style={sA("danger")}><strong>🚨 Se incluirá nota de escalamiento urgente.</strong></div>}
          <Nav back={()=>setStep(S.TIMING)}><button className="btn" onClick={()=>setStep(S.SUM)} style={sB()}>Generar respuesta →</button></Nav>
        </div>)}

        {step===S.EVID&&(<div style={sC}>
          <Gate n="COMPUERTA 2 DE 3" label="Evidencia"/>
          <div style={{marginBottom:18}}>
            <label style={{...sL,marginBottom:9}}>¿Incluye evidencia fotográfica? (obligatorio)</label>
            <div style={{display:"flex",gap:12}}>
              <div className="opt" onClick={()=>setPhotos(true)} style={sYN(photos===true,true)}>✓ Sí</div>
              <div className="opt" onClick={()=>setPhotos(false)} style={sYN(photos===false,false)}>✕ No</div>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{...sL,marginBottom:9}}>¿Incluye % de pérdida/waste?</label>
            <div style={{display:"flex",gap:12}}>
              <div className="opt" onClick={()=>setLoss(true)} style={sYN(loss===true,true)}>✓ Sí</div>
              <div className="opt" onClick={()=>setLoss(false)} style={sYN(loss===false,false)}>✕ No</div>
            </div>
            {loss===false&&<div className="fade-in" style={{...sA("info"),marginTop:11}}>Sin % de pérdida — se solicitará en la respuesta. El pipeline continúa.</div>}
          </div>
          {photos===false&&<div className="fade-in" style={sA("danger")}><strong>Sin fotos no se puede evaluar.</strong> Se generará MSG-05.</div>}
          <Nav back={()=>setStep(S.TIMING)}><button className="btn" onClick={()=>photos===false?setStep(S.SUM):setStep(S.CAT)} style={sB(photos!==null)} disabled={photos===null}>{photos===false?"Ver resultado →":"Continuar →"}</button></Nav>
        </div>)}

        {step===S.CAT&&(<div style={sC}>
          <Gate n="CATEGORÍA DE FRUTA" label="Clasificación" color={P.a}/>
          <p style={{fontSize:13,color:P.g,margin:"0 0 14px"}}>Compara Cartama vs. cliente. Puedes saltar si no aplica.</p>
          <div className="grid-2" style={{marginBottom:12}}>
            <div><label style={sL}>Cartama</label>{CATS.map(c=><div key={c.id} className="opt" onClick={()=>setCatC(c.id)} style={{...sO(catC===c.id),padding:"12px 15px",marginBottom:7}}><span style={{fontSize:14,fontWeight:650,color:catC===c.id?P.p:P.t}}>{c.label}</span></div>)}</div>
            <div><label style={sL}>Cliente</label>{CATS.map(c=><div key={c.id} className="opt" onClick={()=>setCatCl(c.id)} style={{...sO(catCl===c.id),padding:"12px 15px",marginBottom:7}}><span style={{fontSize:14,fontWeight:650,color:catCl===c.id?P.p:P.t}}>{c.label}</span></div>)}</div>
          </div>
          {catM&&<div className="fade-in" style={sA("warning")}><strong>⚠ Discrepancia:</strong> Cartama {CATS.find(c=>c.id===catC)?.label} → Cliente {CATS.find(c=>c.id===catCl)?.label}</div>}
          <Nav back={()=>setStep(S.EVID)}>
            <button className="btn" onClick={()=>setStep(S.DEF)} style={{...sBS,color:P.g}}>Saltar</button>
            <button className="btn" onClick={()=>setStep(S.DEF)} style={sB()}>Continuar →</button>
          </Nav>
        </div>)}

        {step===S.DEF&&(<div style={sC}>
          <Gate n="COMPUERTA 3 DE 3" label="Defectos reclamados"/>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:16,padding:"10px 14px",background:"#F7FAF8",borderRadius:10,fontSize:13,border:`1px solid ${P.b}`}}>
            <input type="checkbox" checked={showPall} onChange={e=>setShowPall(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:P.p}}/>
            <span onClick={()=>setShowPall(!showPall)} style={{cursor:"pointer"}}>Especificar pallets afectados por defecto</span>
          </div>
          {DG(DEFS.cargo,dChk,setDChk,dVal,setDVal,true)}
          {DG(DEFS.fruit,dChk,setDChk,dVal,setDVal,true)}
          <div style={{borderTop:`2px solid ${P.rL}`,paddingTop:14,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:750,color:P.r,marginBottom:10}}>🚨 Escalamiento Urgente</div>
            <div className="defect-grid">
              {URG.map(u=><div key={u.id} className="opt" onClick={()=>setUChk(p=>({...p,[u.id]:!p[u.id]}))} style={sCk(uChk[u.id],P.r)}>
                <div style={sBx(uChk[u.id],P.r)}>{uChk[u.id]?"✓":""}</div>
                <span style={{fontSize:13}}><strong>{u.name}</strong> <span style={{color:P.g}}>/ {u.es}</span></span></div>)}
            </div>
          </div>
          {uChk.packaging&&(
            <div className="fade-in" style={{padding:"14px 18px",borderRadius:12,background:"#FFF8F0",border:"1px solid #F0DCC0",marginTop:4,display:"grid",gap:10}}>
              <div style={{fontSize:12.5,fontWeight:700,color:"#9A7B4F"}}>📦 Detalle de daño de empaque</div>
              <div className="grid-2">
                <div><label style={{...sL,fontSize:11}}>Cantidad dañada (pallets/cajas)</label><input style={sI} placeholder="Ej: 3 pallets" value={pkgQty} onChange={e=>setPkgQty(e.target.value)}/></div>
                <div><label style={{...sL,fontSize:11}}>Tipo de daño</label><select style={sI} value={pkgType} onChange={e=>setPkgType(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <option value="collapsed">Colapsadas</option>
                  <option value="wet">Húmedas</option>
                  <option value="broken">Rotas</option>
                  <option value="plastic_damaged">Plástico dañado</option>
                </select></div>
              </div>
              <div><label style={{...sL,fontSize:11}}>¿La fruta se dañó?</label>
                <div style={{display:"flex",gap:10}}>
                  {[["yes","Sí"],["no","No"],["partial","Parcialmente"]].map(([v,l])=>
                    <div key={v} className="opt" onClick={()=>setPkgFruit(v)} style={{...sO(pkgFruit===v),padding:"8px 16px",fontSize:13}}>{l}</div>)}
                </div>
              </div>
            </div>
          )}
          {hasU&&<div className="fade-in" style={sA("danger")}><strong>🚨 ESCALAMIENTO URGENTE</strong> — el caso se marcará para revisión prioritaria.</div>}
          <div><label style={sL}>Notas adicionales</label><textarea style={{...sI,minHeight:60,resize:"vertical",fontSize:13.5}} placeholder="Ej: cajas colapsadas, condensación…" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
          <Nav back={()=>setStep(S.CAT)}><button className="btn" onClick={()=>setStep(S.SUM)} style={sB(canDef)} disabled={!canDef}>Ver resultado →</button></Nav>
        </div>)}

        {step===S.ALERT&&(<div style={sC}>
          <Gate n="QUALITY ALERT / QC REPORT" label="Detalles de la alerta" color={P.a}/>
          <p style={{fontSize:13,color:P.g,margin:"0 0 16px"}}>Selecciona qué menciona el correo. No se evalúan umbrales.</p>
          {DG(DEFS.cargo,aChk,setAChk,null,null,false)}
          {DG(DEFS.fruit,aChk,setAChk,null,null,false)}
          <div style={{marginTop:12}}><label style={sL}>% waste esperado</label><input style={{...sI,maxWidth:170}} placeholder="Ej: 25" value={aW} onChange={e=>setAW(e.target.value)}/></div>
          {aW&&parseFloat(aW)>=20&&<div className="fade-in" style={{...sA("warning"),marginTop:11}}><strong>Waste alto ({aW}%)</strong> — se incluirá nota de seguimiento.</div>}
          <div style={{marginTop:14}}><label style={{...sL,marginBottom:9}}>¿QC report adjunto?</label>
            <div style={{display:"flex",gap:12}}>
              <div className="opt" onClick={()=>setAQC(true)} style={sYN(aQC===true,true)}>✓ Sí</div>
              <div className="opt" onClick={()=>setAQC(false)} style={sYN(aQC===false,false)}>✕ No</div>
            </div></div>
          <Nav back={()=>setStep(S.CLASS)}><button className="btn" onClick={()=>setStep(S.SUM)} style={sB()}>Generar respuesta →</button></Nav>
        </div>)}

        {step===S.FU&&(<div style={sC}>
          <Gate n="CLAIM FOLLOW-UP" label="Estado del claim original" color={P.bl}/>
          {FU_ST.map(f=><div key={f.id} className="opt" onClick={()=>setFuSt(f.id)} style={sO(fuSt===f.id)}>
            <div style={{fontSize:14.5,fontWeight:650,color:fuSt===f.id?P.pD:P.t}}>{f.en}</div>
            <div style={{fontSize:12,color:P.g,marginTop:2}}>{f.es}</div></div>)}
          {fuSt==="wait"&&<div className="fade-in" style={{marginTop:12}}><label style={sL}>¿Qué información está pendiente?</label>
            <textarea style={{...sI,minHeight:74,resize:"vertical"}} placeholder="Una línea por item" value={fuM} onChange={e=>setFuM(e.target.value)}/></div>}
          <Nav back={()=>setStep(S.CLASS)}><button className="btn" onClick={()=>setStep(S.SUM)} style={sB(!!fuSt)} disabled={!fuSt}>Generar respuesta →</button></Nav>
        </div>)}

        {step===S.INFO&&(<div style={sC}>
          <Gate n="SOLICITUD DE INFORMACIÓN" label="¿Qué información piden?" color={P.g}/>
          <div className="defect-grid">
            {INFO_T.map(it=><div key={it.id} className="opt" onClick={()=>setIChk(p=>({...p,[it.id]:!p[it.id]}))} style={sCk(iChk[it.id],P.p)}>
              <div style={sBx(iChk[it.id],P.p)}>{iChk[it.id]?"✓":""}</div>
              <span style={{fontSize:13}}><strong>{it.en}</strong> <span style={{color:P.g}}>/ {it.es}</span></span></div>)}
          </div>
          <Nav back={()=>setStep(S.CLASS)}><button className="btn" onClick={()=>setStep(S.SUM)} style={sB(iT.length>0)} disabled={iT.length===0}>Generar respuesta →</button></Nav>
        </div>)}

        {/* ═══ RESUMEN / RESPUESTA ═══ */}
        {step===S.SUM&&(<>
          <div style={{...sA("warning"),marginBottom:14}}><strong>⚠️ Revisa los datos y reemplaza los [corchetes] antes de enviar.</strong></div>

          {/* Panel de alertas inteligentes */}
          {liveAlerts.length>0&&(
            <div style={{...sC,padding:"16px 18px",borderLeft:`4px solid ${P.oD}`}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                <span style={{fontSize:16}}>💡</span>
                <div style={{fontSize:14.5,fontWeight:750,color:P.pD}}>Alertas del histórico</div>
                <span style={{...sT(P.oD,"#FFF8E6"),marginLeft:"auto"}}>{liveAlerts.length}</span>
              </div>
              <div style={{fontSize:12,color:P.g,marginBottom:12}}>Patrones detectados en claims anteriores. Se guardarán junto al claim.</div>
              {liveAlerts.map((a,i)=>{
                const sev={info:{c:P.bl,bg:"#EAF4FC"},warning:{c:P.oD,bg:"#FFF8E6"},danger:{c:P.r,bg:"#FDEDEE"}}[a.severity];
                return(
                  <div key={i} className="fade-in" style={{padding:"10px 12px",background:sev.bg,borderRadius:9,marginBottom:7,borderLeft:`3px solid ${sev.c}`}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:sev.c,marginBottom:2}}>{a.title}</div>
                    <div style={{fontSize:12.5,color:P.t,lineHeight:1.5}}>{a.message}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{marginBottom:16}}>
            <MailView
              variant="initial"
              title="Respuesta inicial"
              subtitle={`Generada por Comercial · ${clientName}`}
              code={msgCode}
              lang={lang}
              to={dt.contact?`${dt.contact} — ${clientName}`:clientName}
              subject={emailSubject(lang,dt.ct,clientName,cls)}
              body={response}
            />
          </div>

          {!saved?(
            <div style={sC}>
              <button className="btn" onClick={save} disabled={saving} style={{...sB(!saving),width:"100%",padding:"15px",fontSize:15}}>
                {saving?"Guardando…":"💾 Guardar claim en base de datos"}
              </button>
              <div style={{fontSize:12,color:P.g,textAlign:"center",marginTop:9}}>Calidad podrá generar la respuesta técnica desde el detalle del claim</div>
            </div>
          ):(
            <div className="pop-in" style={{...sA("success"),padding:"16px 18px",fontSize:14}}>
              <strong>✓ Claim guardado exitosamente.</strong> Ya aparece en el dashboard.
            </div>
          )}

          <div style={{display:"flex",gap:12,marginTop:4}}>
            <button className="btn" onClick={onBack} style={{...sBS,flex:1,textAlign:"center"}}>← Ir al Dashboard</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
