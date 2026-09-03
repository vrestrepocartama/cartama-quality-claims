import {P,sC} from "./styles.js";

const pill={display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:650,marginRight:6,marginBottom:4};
const lbl={fontSize:11,fontWeight:700,color:P.g2,letterSpacing:".5px",marginBottom:6};
const val={fontSize:14,fontWeight:700,color:P.pD};

function Stat({label,value,unit,accent}){
  return(<div style={{textAlign:"center",padding:"10px 0"}}>
    <div style={lbl}>{label}</div>
    <div style={{...val,...(accent?{color:accent}:{})}}>{value}{unit&&<span style={{fontSize:11,fontWeight:500,color:P.g,marginLeft:3}}>{unit}</span>}</div>
  </div>);
}

/* Barra de proporción por predio */
function GrowerBar({name,pct,boxes}){
  return(<div style={{marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
      <span style={{fontWeight:600,color:P.t}}>{name}</span>
      <span style={{color:P.g}}>{boxes} cajas · <strong>{pct}%</strong></span>
    </div>
    <div style={{height:6,borderRadius:3,background:P.b2,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:`linear-gradient(90deg,${P.p},${P.pD})`,transition:"width .4s ease"}}/>
    </div>
  </div>);
}

export default function ContainerInfo({data,compact}){
  if(!data||data.length===0)return null;

  return data.map(({container,summary,details})=>{
    if(!summary&&(!details||details.length===0))return(
      <div key={container} style={{...sC,padding:compact?"12px 16px":"16px 20px",background:"#FFF8F0",border:`1px solid #F0DCC0`}}>
        <span style={{fontSize:12.5,color:"#9A7B4F"}}>📦 <strong>{container}</strong> — Sin datos de despacho</span>
      </div>
    );

    const s=summary||{};
    const dm=s.avg_dry_matter??null;
    const totalBoxes=s.total_boxes??details.reduce((a,r)=>a+(r.boxes||0),0);
    const totalPallets=s.total_pallets??details.reduce((a,r)=>a+(r.pallets||0),0);
    const certs=[...new Set(details.map(r=>r.certification).filter(Boolean))];
    const packs=[...new Set(details.map(r=>r.packaging).filter(Boolean))];

    // Grower breakdown
    const byGrower={};
    details.forEach(r=>{
      const g=r.grower_name||"Sin predio";
      if(!byGrower[g])byGrower[g]={boxes:0};
      byGrower[g].boxes+=(r.boxes||0);
    });
    const growers=Object.entries(byGrower).map(([name,d])=>({name,boxes:d.boxes,pct:totalBoxes?Math.round(d.boxes/totalBoxes*100):0})).sort((a,b)=>b.boxes-a.boxes);

    return(
      <div key={container} style={{...sC,padding:compact?"12px 16px":"16px 20px",border:`1.5px solid ${P.pL}`,background:`linear-gradient(135deg,#F8FBF9,#FFFFFF)`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:compact?8:14}}>
          <span style={{fontSize:compact?16:20}}>📦</span>
          <span style={{fontSize:compact?14:16,fontWeight:750,color:P.pD,letterSpacing:"-.3px"}}>{container}</span>
          {s.week&&<span style={{...pill,background:P.pL,color:P.pD}}>Semana {s.week}</span>}
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:compact?"repeat(3,1fr)":"repeat(4,1fr)",gap:6,background:P.b,borderRadius:10,padding:"8px 4px",marginBottom:compact?8:14}}>
          {dm!==null&&<Stat label="MAT. SECA PROM" value={dm.toFixed(1)} unit="%" accent={dm>=23?"#16A34A":"#EA580C"}/>}
          {s.min_dry_matter!=null&&!compact&&<Stat label="MS RANGO" value={`${s.min_dry_matter.toFixed(1)}–${s.max_dry_matter.toFixed(1)}`} unit="%"/>}
          <Stat label="CAJAS" value={totalBoxes.toLocaleString()}/>
          <Stat label="PALLETS" value={totalPallets}/>
          {!compact&&growers.length>0&&<Stat label="PREDIOS" value={growers.length}/>}
        </div>

        {/* Certs & packaging pills */}
        {(certs.length>0||packs.length>0)&&(
          <div style={{marginBottom:compact?6:12,display:"flex",flexWrap:"wrap",gap:4}}>
            {certs.map(c=><span key={c} style={{...pill,background:"#E8F5E9",color:"#2E7D32"}}>{c}</span>)}
            {packs.map(p=><span key={p} style={{...pill,background:"#E3F2FD",color:"#1565C0"}}>{p}</span>)}
          </div>
        )}

        {/* Grower breakdown — only in full mode */}
        {!compact&&growers.length>0&&(
          <div>
            <div style={{...lbl,marginTop:4}}>DESGLOSE POR PREDIO</div>
            {growers.map(g=><GrowerBar key={g.name} {...g}/>)}
          </div>
        )}
      </div>
    );
  });
}
