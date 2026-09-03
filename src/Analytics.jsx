import {useState,useMemo,useEffect} from "react";
import * as XLSX from "xlsx";
import {supabase} from "./supabase.js";
import {P,GRAD,SH1,SH2,sC,sI,sB,sBS,sBGhost,sT,sPill,sA,sHeader,sBarWrap,sBar} from "./styles.js";
import {CONCEPTS,STATUS,CLS_SHORT} from "./constants.js";
import {overviewStats,claimsByMonth,byClient,byDefect,heatmap,claimDefectIds,defectLabel} from "./insights.js";

const MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function Analytics({user,onBack,onOpen}){
  const[allClaims,setAllClaims]=useState([]);
  const[clients,setClients]=useState([]);
  const[loading,setLoading]=useState(true);
  const[year,setYear]=useState(new Date().getFullYear());
  const[compareYear,setCompareYear]=useState("");
  const[fCl,setFCl]=useState("all");
  const[monthRange,setMonthRange]=useState("all");
  const[section,setSection]=useState("overview");
  const[expandedClient,setExpandedClient]=useState(null);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      supabase.from("clients").select("*").eq("active",true).order("name"),
      supabase.from("claims").select("*,clients(name)").order("claim_date",{ascending:false}),
    ]).then(([{data:cl},{data:cm}])=>{
      if(cl)setClients(cl);
      if(cm)setAllClaims(cm);
      setLoading(false);
    });
  },[]);

  /* Claims del año seleccionado, con filtros */
  const claims=useMemo(()=>allClaims.filter(c=>{
    if(c.year!==year)return false;
    if(fCl!=="all"&&c.client_id!==parseInt(fCl))return false;
    if(monthRange!=="all"){
      const m=new Date(c.claim_date||c.created_at).getMonth();
      const[from,to]=monthRange.split("-").map(Number);
      if(m<from||m>to)return false;
    }
    return true;
  }),[allClaims,year,fCl,monthRange]);

  const compareClaims=useMemo(()=>{
    if(!compareYear)return null;
    return allClaims.filter(c=>{
      if(c.year!==parseInt(compareYear))return false;
      if(fCl!=="all"&&c.client_id!==parseInt(fCl))return false;
      if(monthRange!=="all"){
        const m=new Date(c.claim_date||c.created_at).getMonth();
        const[from,to]=monthRange.split("-").map(Number);
        if(m<from||m>to)return false;
      }
      return true;
    });
  },[allClaims,compareYear,fCl,monthRange]);

  const ov=useMemo(()=>overviewStats(claims),[claims]);
  const ovCompare=useMemo(()=>compareClaims?overviewStats(compareClaims):null,[compareClaims]);
  const byMonth=useMemo(()=>claimsByMonth(claims),[claims]);
  const byMonthCompare=useMemo(()=>compareClaims?claimsByMonth(compareClaims):null,[compareClaims]);
  const clientRanking=useMemo(()=>byClient(claims),[claims]);
  const defectRanking=useMemo(()=>byDefect(claims),[claims]);
  const hm=useMemo(()=>heatmap(claims),[claims]);

  const yearsAvailable=useMemo(()=>{
    const s=new Set(allClaims.map(c=>c.year).filter(Boolean));
    return[...s].sort((a,b)=>b-a);
  },[allClaims]);

  /* Exportar analytics a Excel */
  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    // Overview
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{
      "Año":year,"Total Claims":ov.total,"Resueltos":ov.resolved,
      "% Procede":ov.procRate,"% Negociable":ov.negoRate,"% No Procede":ov.noProcRate,
      "Días promedio cierre":ov.avgClose||"—","% Impacto promedio":ov.avgImpact,
    }]),"Resumen");
    // Por mes
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(byMonth.map((b,i)=>({
      "Mes":MONTHS[i],"Total":b.count,"Procede":b.proc,"Negociable":b.nego,"No Procede":b.noProc,
    }))),"Por Mes");
    // Por cliente
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clientRanking.map(c=>({
      "Cliente":c.name,"Total":c.total,"Procede":c.proc,"Negociable":c.nego,"No Procede":c.noProc,
      "% Procede":c.procRate??"—","Días promedio cierre":c.avgClose??"—",
      "% Impacto promedio":c.avgImpact??"—","Defecto más frecuente":c.topDefect,
    }))),"Por Cliente");
    // Por defecto
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(defectRanking.map(d=>({
      "Defecto":d.name,"Total":d.total,"Procede":d.proc,"Negociable":d.nego,"No Procede":d.noProc,
      "% Procede":d.procRate??"—","Cliente principal":d.topClient,
    }))),"Por Defecto");
    XLSX.writeFile(wb,`Cartama_Analytics_${year}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  /* ── Tarjeta KPI ── */
  const KPI=({label,value,unit,color,delta,i})=>(
    <div className={`lift fade-in d${i}`} style={{background:P.w,borderRadius:14,border:`1px solid ${P.b}`,padding:"16px 18px",boxShadow:SH1}}>
      <div style={{fontSize:11.5,color:P.g,fontWeight:600,letterSpacing:".2px",textTransform:"uppercase"}}>{label}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:8}}>
        <div style={{fontSize:28,fontWeight:800,color:color||P.pD,letterSpacing:"-.5px"}}>{value}</div>
        {unit&&<div style={{fontSize:13,color:P.g,fontWeight:600}}>{unit}</div>}
      </div>
      {delta!=null&&<div style={{fontSize:11.5,marginTop:4,color:delta>0?P.p:delta<0?P.r:P.g,fontWeight:600}}>
        {delta>0?"▲":delta<0?"▼":"■"} {Math.abs(delta)}{unit||""} vs {compareYear}
      </div>}
    </div>
  );

  /* Delta helper */
  const dOf=(a,b)=>{if(a==null||b==null)return null;return Math.round((a-b)*10)/10;};

  const claimsForClient=id=>claims.filter(c=>c.client_id===id).sort((a,b)=>new Date(b.claim_date)-new Date(a.claim_date));

  return(
    <div style={{maxWidth:1240,margin:"0 auto",padding:"20px 18px 60px"}}>

      {/* HEADER */}
      <div className="fade-in" style={{...sHeader,padding:"22px 26px"}}>
        <div style={{position:"absolute",right:-40,top:-60,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none"}}/>
        <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
          <div>
            <button className="btn" onClick={onBack} style={{...sBGhost,padding:"6px 13px",fontSize:12,marginBottom:10}}>← Dashboard</button>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:2.4,opacity:.68,textTransform:"uppercase"}}>Cartama · Analytics</div>
            <div style={{fontSize:24,fontWeight:750,marginTop:5,letterSpacing:"-.4px"}}>📊 Analítica del programa de calidad</div>
            <div style={{fontSize:12.5,opacity:.82,marginTop:5}}>Tendencias, comportamiento de clientes y patrones de defectos.</div>
          </div>
          <button className="btn" onClick={exportExcel} style={{...sBGhost,background:"rgba(255,255,255,.94)",color:P.pD,fontWeight:700}}>📥 Exportar Excel</button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{...sC,padding:"14px 18px",marginBottom:16}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <label style={{fontSize:10.5,fontWeight:700,color:P.g,textTransform:"uppercase",letterSpacing:".5px"}}>Año principal</label>
            <select style={{...sI,marginTop:4,maxWidth:120,fontSize:13}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {yearsAvailable.length>0?yearsAvailable.map(y=><option key={y} value={y}>{y}</option>):<option value={year}>{year}</option>}
            </select>
          </div>
          <div>
            <label style={{fontSize:10.5,fontWeight:700,color:P.g,textTransform:"uppercase",letterSpacing:".5px"}}>Comparar con</label>
            <select style={{...sI,marginTop:4,maxWidth:130,fontSize:13}} value={compareYear} onChange={e=>setCompareYear(e.target.value)}>
              <option value="">Sin comparación</option>
              {yearsAvailable.filter(y=>y!==year).map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10.5,fontWeight:700,color:P.g,textTransform:"uppercase",letterSpacing:".5px"}}>Rango de meses</label>
            <select style={{...sI,marginTop:4,maxWidth:180,fontSize:13}} value={monthRange} onChange={e=>setMonthRange(e.target.value)}>
              <option value="all">Todo el año</option>
              <option value="0-2">Q1 (Ene-Mar)</option>
              <option value="3-5">Q2 (Abr-Jun)</option>
              <option value="6-8">Q3 (Jul-Sep)</option>
              <option value="9-11">Q4 (Oct-Dic)</option>
              <option value="0-5">Primer semestre</option>
              <option value="6-11">Segundo semestre</option>
            </select>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:10.5,fontWeight:700,color:P.g,textTransform:"uppercase",letterSpacing:".5px"}}>Cliente</label>
            <select style={{...sI,marginTop:4,fontSize:13}} value={fCl} onChange={e=>setFCl(e.target.value)}>
              <option value="all">Todos los clientes</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{alignSelf:"flex-end",fontSize:12,color:P.g,fontWeight:600}}>
            {claims.length} claim{claims.length!==1?"s":""}{compareClaims?` vs ${compareClaims.length} en ${compareYear}`:""}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:P.w,padding:5,borderRadius:12,border:`1px solid ${P.b}`,boxShadow:SH1,overflowX:"auto"}}>
        {[["overview","Vista general","📈"],["clients","Por cliente","🏢"],["defects","Por defecto","🔬"]].map(([k,l,ic])=>(
          <div key={k} onClick={()=>setSection(k)}
            style={{padding:"9px 16px",cursor:"pointer",borderRadius:9,fontSize:13.5,fontWeight:section===k?700:550,whiteSpace:"nowrap",
              color:section===k?P.w:P.g,background:section===k?GRAD:"transparent",transition:"all .16s"}}>
            <span style={{marginRight:6}}>{ic}</span>{l}
          </div>
        ))}
      </div>

      {loading?<div style={{...sC,textAlign:"center",padding:40,color:P.g}}>Cargando datos…</div>:
       claims.length===0?<div style={{...sC,textAlign:"center",padding:40,color:P.g}}>
         <div style={{fontSize:34,marginBottom:8}}>📭</div>
         <div style={{fontWeight:600,color:P.t}}>Sin datos para los filtros seleccionados</div>
       </div>:(<>

      {/* ═══ SECCIÓN 1: VISTA GENERAL ═══ */}
      {section==="overview"&&(<div key="ov" className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
          <KPI label="Total claims" value={ov.total} color={P.pD} i={1} delta={ovCompare?dOf(ov.total,ovCompare.total):null}/>
          <KPI label="% Procede" value={ov.procRate} unit="%" color={P.p} i={2} delta={ovCompare?dOf(ov.procRate,ovCompare.procRate):null}/>
          <KPI label="% Negociable" value={ov.negoRate} unit="%" color={P.oD} i={3} delta={ovCompare?dOf(ov.negoRate,ovCompare.negoRate):null}/>
          <KPI label="% No Procede" value={ov.noProcRate} unit="%" color={P.r} i={4} delta={ovCompare?dOf(ov.noProcRate,ovCompare.noProcRate):null}/>
          <KPI label="Días prom. cierre" value={ov.avgClose??"—"} unit={ov.avgClose?"d":""} color={P.bl} i={5} delta={ovCompare&&ov.avgClose!=null&&ovCompare.avgClose!=null?dOf(ov.avgClose,ovCompare.avgClose):null}/>
          <KPI label="% Impacto prom." value={ov.avgImpact} unit="%" color={P.pu} i={6} delta={ovCompare?dOf(ov.avgImpact,ovCompare.avgImpact):null}/>
        </div>

        {/* Gráfico de barras por mes */}
        <div style={sC}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,margin:0,color:P.pD,fontWeight:750}}>Claims por mes {compareYear&&<span style={{fontSize:12,color:P.g,fontWeight:500}}>· comparando con {compareYear}</span>}</h3>
            {compareYear&&<div style={{display:"flex",gap:12,fontSize:11,color:P.g}}>
              <span><span style={{display:"inline-block",width:10,height:10,background:P.p,borderRadius:2,marginRight:5,verticalAlign:"middle"}}/>{year}</span>
              <span><span style={{display:"inline-block",width:10,height:10,background:"#CBD6D0",borderRadius:2,marginRight:5,verticalAlign:"middle"}}/>{compareYear}</span>
            </div>}
          </div>
          <MonthChart data={byMonth} compare={byMonthCompare}/>
        </div>

        {/* Distribución de conceptos */}
        <div style={sC}>
          <h3 style={{fontSize:16,margin:"0 0 14px",color:P.pD,fontWeight:750}}>Distribución de conceptos</h3>
          {ov.resolved===0?<div style={{color:P.g,fontSize:13}}>Sin claims resueltos todavía</div>:(
            <div>
              <div style={{display:"flex",height:24,borderRadius:8,overflow:"hidden",border:`1px solid ${P.b}`,marginBottom:12}}>
                {ov.proc>0&&<div style={{width:`${(ov.proc/ov.resolved)*100}%`,background:P.p,color:P.w,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{(ov.proc/ov.resolved)*100>10&&`${Math.round((ov.proc/ov.resolved)*100)}%`}</div>}
                {ov.nego>0&&<div style={{width:`${(ov.nego/ov.resolved)*100}%`,background:P.oD,color:P.w,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{(ov.nego/ov.resolved)*100>10&&`${Math.round((ov.nego/ov.resolved)*100)}%`}</div>}
                {ov.noProc>0&&<div style={{width:`${(ov.noProc/ov.resolved)*100}%`,background:P.r,color:P.w,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{(ov.noProc/ov.resolved)*100>10&&`${Math.round((ov.noProc/ov.resolved)*100)}%`}</div>}
              </div>
              <div style={{display:"flex",gap:18,fontSize:12.5,flexWrap:"wrap"}}>
                <div><span style={{display:"inline-block",width:11,height:11,background:P.p,borderRadius:3,marginRight:6,verticalAlign:"middle"}}/>Procede: <strong>{ov.proc}</strong></div>
                <div><span style={{display:"inline-block",width:11,height:11,background:P.oD,borderRadius:3,marginRight:6,verticalAlign:"middle"}}/>Negociable: <strong>{ov.nego}</strong></div>
                <div><span style={{display:"inline-block",width:11,height:11,background:P.r,borderRadius:3,marginRight:6,verticalAlign:"middle"}}/>No procede: <strong>{ov.noProc}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>)}

      {/* ═══ SECCIÓN 2: POR CLIENTE ═══ */}
      {section==="clients"&&(<div key="cl" className="fade-in">
        <div style={{...sC,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:GRAD,color:P.w}}>
                  {["Cliente","# Claims","% Procede","% Nego","% No Proc","Días prom.","% Impacto","Defecto más frecuente",""].map((h,i)=>
                    <th key={i} style={{padding:"12px 14px",textAlign:i>0?"center":"left",fontWeight:650,fontSize:11.5,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {clientRanking.map(c=>(<>
                  <tr key={c.id} onClick={()=>setExpandedClient(expandedClient===c.id?null:c.id)}
                    style={{borderBottom:`1px solid ${P.b2}`,cursor:"pointer",background:expandedClient===c.id?"#F7FAF8":P.w}}>
                    <td style={{padding:"12px 14px",fontWeight:650}}>{c.name}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",fontWeight:700}}>{c.total}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:c.procRate>=50?P.r:P.p,fontWeight:600}}>{c.procRate??"—"}{c.procRate!=null&&"%"}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.oD,fontWeight:600}}>{c.total>0?Math.round((c.nego/c.total)*100):0}%</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.g,fontWeight:600}}>{c.total>0?Math.round((c.noProc/c.total)*100):0}%</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:c.avgClose>7?P.oD:P.p}}>{c.avgClose??"—"}</td>
                    <td style={{padding:"12px 14px",textAlign:"center"}}>{c.avgImpact??"—"}{c.avgImpact!=null&&"%"}</td>
                    <td style={{padding:"12px 14px",fontSize:12}}><span style={{color:P.pD,fontWeight:600}}>{c.topDefect}</span>{c.topDefectCount>0&&<span style={{color:P.g,marginLeft:5}}>({c.topDefectCount})</span>}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.a,fontSize:16}}>{expandedClient===c.id?"▲":"▼"}</td>
                  </tr>
                  {expandedClient===c.id&&(
                    <tr>
                      <td colSpan={9} style={{padding:0,background:"#FBFCFC"}}>
                        <div className="fade-in" style={{padding:"16px 20px",borderTop:`1px solid ${P.b2}`}}>
                          <div style={{fontSize:12,color:P.g,fontWeight:600,marginBottom:10,textTransform:"uppercase",letterSpacing:".4px"}}>Últimos claims de {c.name}</div>
                          {claimsForClient(c.id).slice(0,10).map(cl=>{
                            const st=STATUS[cl.status]||STATUS.open;
                            return(
                              <div key={cl.id} onClick={e=>{e.stopPropagation();onOpen&&onOpen(cl);}}
                                className="rowx" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,cursor:"pointer",fontSize:12.5,gap:12,flexWrap:"wrap"}}>
                                <div style={{minWidth:0,flex:1}}>
                                  <span style={{fontWeight:650}}>{cl.containers}</span>
                                  <span style={{color:P.g,marginLeft:10}}>{cl.claim_date?new Date(cl.claim_date).toLocaleDateString("es-ES",{day:"2-digit",month:"short"}):""}</span>
                                </div>
                                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                                  <span style={sT(P.pD,P.pL)}>{CLS_SHORT[cl.classification]||cl.classification}</span>
                                  <span style={sT(st.c,st.bg)}>{st.l}</span>
                                  {cl.concept&&<span style={sT(CONCEPTS[cl.concept]?.c,CONCEPTS[cl.concept]?.bg)}>{CONCEPTS[cl.concept]?.l}</span>}
                                  {cl.weighted_impact!=null&&<span style={{color:P.g}}>{cl.weighted_impact}%</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>))}
              </tbody>
            </table>
          </div>
        </div>
      </div>)}

      {/* ═══ SECCIÓN 3: POR DEFECTO ═══ */}
      {section==="defects"&&(<div key="df" className="fade-in">
        <div style={{...sC,padding:0,overflow:"hidden",marginBottom:16}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:GRAD,color:P.w}}>
                  {["Defecto","# Claims","% Procede","Procede","Nego","No Proc","Cliente principal"].map((h,i)=>
                    <th key={i} style={{padding:"12px 14px",textAlign:i>0?"center":"left",fontWeight:650,fontSize:11.5,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {defectRanking.map(d=>(
                  <tr key={d.id} style={{borderBottom:`1px solid ${P.b2}`}}>
                    <td style={{padding:"12px 14px",fontWeight:650}}>{d.name}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",fontWeight:700}}>{d.total}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",fontWeight:600,color:d.procRate>=50?P.r:P.p}}>{d.procRate??"—"}{d.procRate!=null&&"%"}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.p}}>{d.proc}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.oD}}>{d.nego}</td>
                    <td style={{padding:"12px 14px",textAlign:"center",color:P.g}}>{d.noProc}</td>
                    <td style={{padding:"12px 14px",fontSize:12}}><span style={{color:P.pD,fontWeight:600}}>{d.topClient}</span>{d.topClientCount>0&&<span style={{color:P.g,marginLeft:5}}>({d.topClientCount})</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heatmap */}
        {hm.clients.length>0&&hm.defects.length>0&&(
          <div style={sC}>
            <h3 style={{fontSize:16,margin:"0 0 4px",color:P.pD,fontWeight:750}}>Mapa de calor: Cliente × Defecto</h3>
            <div style={{fontSize:12,color:P.g,marginBottom:16}}>Top {hm.clients.length} clientes × Top {hm.defects.length} defectos. Cuanto más oscura la celda, más claims.</div>
            <Heatmap hm={hm}/>
          </div>
        )}
      </div>)}

      </>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════════════ */

function MonthChart({data,compare}){
  const max=Math.max(...data.map(d=>d.count),...(compare||[]).map(d=>d.count),1);
  return(
    <div style={{display:"flex",gap:6,alignItems:"flex-end",height:180,padding:"8px 0"}}>
      {data.map((b,i)=>{
        const h=(b.count/max)*140;
        const hCmp=compare?(compare[i].count/max)*140:0;
        return(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:0}}>
            <div style={{display:"flex",gap:2,alignItems:"flex-end",height:150,width:"100%",justifyContent:"center"}}>
              {compare&&<div title={`${compare[i].count} en ${MONTHS[i]}`} style={{width:compare?"40%":"70%",maxWidth:24,height:Math.max(hCmp,compare[i].count>0?4:0),background:"#CBD6D0",borderRadius:"4px 4px 0 0",transition:"height .5s"}}/>}
              <div title={`${b.count} en ${MONTHS[i]}`} style={{width:compare?"40%":"70%",maxWidth:24,height:Math.max(h,b.count>0?4:0),background:`linear-gradient(180deg,${P.a},${P.p})`,borderRadius:"4px 4px 0 0",transition:"height .5s",boxShadow:"0 2px 4px rgba(45,106,79,.15)"}}>
                {b.count>0&&<div style={{fontSize:10,color:P.pD,fontWeight:700,textAlign:"center",marginTop:-16,letterSpacing:"-.3px"}}>{b.count}</div>}
              </div>
            </div>
            <div style={{fontSize:10.5,color:P.g,fontWeight:600}}>{MONTHS[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Heatmap({hm}){
  const max=Math.max(...Object.values(hm.grid).flatMap(row=>Object.values(row)),1);
  const color=v=>{
    if(v===0)return"#F5F7F6";
    const pct=v/max;
    // Verde suave a verde intenso Cartama
    const alpha=0.15+pct*0.85;
    return`rgba(45,106,79,${alpha})`;
  };
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"separate",borderSpacing:3,fontSize:11.5}}>
        <thead>
          <tr>
            <th style={{padding:"6px 10px"}}></th>
            {hm.defects.map(d=>
              <th key={d.id} style={{padding:"6px 8px",fontWeight:600,color:P.g,fontSize:10.5,transform:"rotate(-30deg)",transformOrigin:"left bottom",whiteSpace:"nowrap",height:80,textAlign:"left"}}>{d.name}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {hm.clients.map(c=>(
            <tr key={c.id}>
              <td style={{padding:"6px 10px",fontWeight:600,color:P.pD,whiteSpace:"nowrap",fontSize:11.5,textAlign:"right"}}>{c.name}</td>
              {hm.defects.map(d=>{
                const v=hm.grid[c.id]?.[d.id]||0;
                return(
                  <td key={d.id} title={`${c.name} × ${d.name}: ${v} claims`}
                    style={{width:42,height:36,textAlign:"center",background:color(v),borderRadius:6,color:v>max*0.5?P.w:P.pD,fontWeight:700,fontSize:12}}>
                    {v||""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
