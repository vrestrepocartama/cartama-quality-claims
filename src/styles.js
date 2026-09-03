import {useState,useEffect} from "react";

/* ═══════════════════════════════════════════
   PALETA — verde Cartama como primario
   ═══════════════════════════════════════════ */
export const P={
  p:"#2D6A4F", pL:"#D8F3DC", pD:"#1B4332", a:"#40916C", aL:"#EDF7F1",
  o:"#E76F51", oL:"#FFF3CD", oD:"#E65100",
  r:"#CC0000", rL:"#F8D7DA",
  g:"#6C757D", gL:"#F6F8F7", g2:"#9AA5A0",
  w:"#FFFFFF", t:"#2B3230", b:"#E6EAE8", b2:"#F0F3F1",
  bl:"#1565C0", bL:"#E8F4FD", pu:"#7B1FA2", puL:"#F3E5F5",
};

export const GRAD=`linear-gradient(135deg,${P.pD} 0%,${P.p} 52%,${P.a} 100%)`;
export const GRAD_SOFT=`linear-gradient(135deg,#FFFFFF 0%,${P.aL} 100%)`;
export const SH1="0 1px 2px rgba(16,40,30,.05), 0 2px 8px rgba(16,40,30,.05)";
export const SH2="0 4px 12px rgba(16,40,30,.08), 0 12px 32px rgba(16,40,30,.07)";
export const SH3="0 18px 46px rgba(16,40,30,.16)";

/* ═══════════════════════════════════════════
   BLOQUES BASE
   ═══════════════════════════════════════════ */
export const sC={background:P.w,borderRadius:16,padding:"22px 24px",boxShadow:SH1,border:`1px solid ${P.b}`,marginBottom:16};
export const sCFlat={background:P.w,borderRadius:14,padding:"16px 18px",border:`1px solid ${P.b}`,marginBottom:12};

export const sL={display:"block",fontSize:11,fontWeight:700,color:P.g,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.6px"};
export const sI={width:"100%",padding:"11px 14px",border:`1.5px solid ${P.b}`,borderRadius:10,fontSize:14.5,color:P.t,outline:"none",boxSizing:"border-box",background:P.w,fontFamily:"inherit",transition:"border-color .16s ease, box-shadow .16s ease"};

export const sB=(ok=true)=>({background:ok?GRAD:"#C9D2CE",color:P.w,border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:650,cursor:ok?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:ok?"0 2px 8px rgba(45,106,79,.22)":"none",letterSpacing:".2px"});
export const sBS={background:P.w,color:P.p,border:`1.5px solid ${P.b}`,borderRadius:10,padding:"12px 22px",fontSize:14,fontWeight:650,cursor:"pointer",fontFamily:"inherit"};
export const sBD={background:P.w,color:P.r,border:`1.5px solid ${P.rL}`,borderRadius:10,padding:"11px 18px",fontSize:13,fontWeight:650,cursor:"pointer",fontFamily:"inherit"};
export const sBSm={background:P.w,color:P.a,border:`1px solid ${P.b}`,borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:650,cursor:"pointer",fontFamily:"inherit"};
export const sBGhost={background:"rgba(255,255,255,.16)",color:P.w,border:"1px solid rgba(255,255,255,.32)",borderRadius:10,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",backdropFilter:"blur(4px)"};

/* Pill badge */
export const sT=(c,bg)=>({display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:700,color:c,background:bg,whiteSpace:"nowrap",border:`1px solid ${c}22`,letterSpacing:".2px"});
export const sPill=(c,bg)=>({...sT(c,bg),fontSize:12.5,padding:"6px 14px"});

export const sA=t=>{
  const m={info:{bg:P.bL,b:"#B9DDF7",c:P.bl},warning:{bg:"#FFF8E6",b:"#FFE0A3",c:P.oD},success:{bg:P.pL,b:"#A5D6A7",c:P.p},danger:{bg:"#FDEDEE",b:"#F3B7BC",c:P.r}};
  const v=m[t]||m.info;
  return{background:v.bg,border:`1px solid ${v.b}`,borderLeft:`4px solid ${v.c}`,borderRadius:12,padding:"12px 16px",marginBottom:12,color:v.c,fontSize:13,lineHeight:1.55};
};

export const sO=sel=>({border:`2px solid ${sel?P.p:P.b}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",background:sel?`linear-gradient(135deg,${P.pL} 0%,#EAF7EF 100%)`:P.w,marginBottom:9,boxShadow:sel?"0 3px 12px rgba(45,106,79,.14)":"none"});
export const sYN=(sel,y)=>({flex:1,padding:"13px",border:`2px solid ${sel?(y?P.p:P.o):P.b}`,borderRadius:12,background:sel?(y?P.pL:P.oL):P.w,cursor:"pointer",fontSize:14,fontWeight:sel?700:500,color:sel?(y?P.p:P.oD):P.t,textAlign:"center",transition:"all .16s ease"});
export const sCk=(sel,col)=>({display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"11px 14px",marginBottom:7,border:`2px solid ${sel?col:P.b}`,borderRadius:11,background:sel?(col===P.r?P.rL:P.pL):P.w,transition:"all .16s ease"});
export const sBx=(sel,col)=>({width:20,height:20,borderRadius:6,border:`2px solid ${sel?col:"#CFD8D4"}`,background:sel?col:P.w,display:"flex",alignItems:"center",justifyContent:"center",color:P.w,fontSize:12,fontWeight:700,flexShrink:0,transition:"all .16s ease"});

export const sEmail={background:P.gL,borderRadius:10,padding:"20px 22px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${P.b}`,fontFamily:"'Segoe UI',system-ui,sans-serif"};

export const sHeader={background:GRAD,borderRadius:18,padding:"22px 26px",marginBottom:20,color:P.w,boxShadow:"0 8px 26px rgba(27,67,50,.22)",position:"relative",overflow:"hidden"};

/* ═══════════════════════════════════════════
   COMPONENTES DE DISEÑO NUEVOS
   ═══════════════════════════════════════════ */

/* Avatar circular con iniciales */
export function initials(name=""){
  const parts=String(name).trim().split(/\s+/).filter(Boolean);
  if(parts.length===0)return"?";
  if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[1][0]).toUpperCase();
}
const AV=["#2D6A4F","#40916C","#1565C0","#7B1FA2","#E65100","#00796B","#5D4037"];
export function avatarColor(seed=""){
  let h=0;for(let i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))%997;
  return AV[h%AV.length];
}
export const sAvatar=(seed,size=44)=>{
  const c=avatarColor(seed);
  return{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c} 0%,${c}CC 100%)`,color:P.w,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,flexShrink:0,letterSpacing:".5px",boxShadow:`0 3px 10px ${c}44`};
};

/* Mini barra de progreso */
export const sBarWrap={height:5,borderRadius:99,background:"#EDF1EF",overflow:"hidden",marginTop:10};
export const sBar=(pct,color)=>({height:"100%",width:`${Math.max(0,Math.min(100,pct))}%`,background:color,borderRadius:99,transition:"width .5s cubic-bezier(.2,.8,.3,1)"});

/* Barra lateral de urgencia */
export const sUrgencyCard=level=>{
  const m={critical:{c:P.r,bg:"#FEF7F7"},late:{c:P.oD,bg:"#FFFCF3"},normal:{c:P.a,bg:P.w}};
  const v=m[level]||m.normal;
  return{borderLeft:`4px solid ${v.c}`,background:v.bg,border:`1px solid ${P.b}`,borderLeftWidth:4,borderRadius:12,padding:"13px 16px",marginBottom:9,cursor:"pointer"};
};

/* Timeline vertical */
export const sTLDot=(done,color)=>({width:11,height:11,borderRadius:"50%",background:done?color:P.w,border:`2px solid ${done?color:"#D6DEDA"}`,flexShrink:0,zIndex:1});
export const sTLLine=done=>({position:"absolute",left:5,top:12,bottom:-14,width:2,background:done?P.a:"#E6EAE8"});

/* Ventana tipo correo */
export const sMailWin={border:`1px solid ${P.b}`,borderRadius:14,overflow:"hidden",background:P.w,boxShadow:SH1};
export const sMailBar={background:"linear-gradient(180deg,#FAFCFB 0%,#F2F6F4 100%)",borderBottom:`1px solid ${P.b}`,padding:"12px 16px"};
export const sMailField={display:"flex",gap:8,fontSize:12.5,padding:"3px 0",alignItems:"baseline"};
export const sMailLabel={color:P.g2,fontWeight:600,minWidth:52,textTransform:"uppercase",fontSize:10.5,letterSpacing:".6px"};
export const sMailBody={padding:"22px 26px",fontSize:14.5,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#33403B",maxHeight:520,overflow:"auto"};

/* Barra de progreso del formulario */
export const sProgWrap={height:6,borderRadius:99,background:"#E9EEEB",overflow:"hidden"};
export const sProgFill=pct=>({height:"100%",width:`${pct}%`,background:GRAD,borderRadius:99,transition:"width .45s cubic-bezier(.2,.8,.3,1)"});

/* ═══════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════ */
export function useIsMobile(bp=720){
  const[m,setM]=useState(()=>typeof window!=="undefined"&&window.innerWidth<=bp);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<=bp);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[bp]);
  return m;
}

export function greeting(){
  const h=new Date().getHours();
  if(h<12)return"Buenos días";
  if(h<19)return"Buenas tardes";
  return"Buenas noches";
}

export function todayLong(){
  const d=new Date();
  const ds=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const ms=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${ds[d.getDay()]}, ${d.getDate()} de ${ms[d.getMonth()]} de ${d.getFullYear()}`;
}

export function emailSubject(lang,containers,client,cls){
  const c=containers||"[Container]";
  const map={fc:{en:"Quality Claim",es:"Reclamo de Calidad"},qa:{en:"Quality Alert",es:"Alerta de Calidad"},fu:{en:"Claim Follow-up",es:"Seguimiento de Reclamo"},ir:{en:"Information Request",es:"Solicitud de Información"}};
  const t=(map[cls]||map.fc)[lang==="en"?"en":"es"];
  return `RE: ${t} — ${c}${client?` — ${client}`:""}`;
}

export function fmtDate(d,L="es"){if(!d)return"";try{const s=typeof d==="string"?d.split("T")[0]:d;const p=new Date(s+"T12:00:00");const me=["January","February","March","April","May","June","July","August","September","October","November","December"];const ms=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];return L==="en"?`${me[p.getMonth()]} ${p.getDate()}, ${p.getFullYear()}`:`${p.getDate()} de ${ms[p.getMonth()]} de ${p.getFullYear()}`;}catch{return d;}}
export function fmtShort(d){if(!d)return"—";try{const s=typeof d==="string"?d.split("T")[0]:d;const p=new Date(s+"T12:00:00");return `${String(p.getDate()).padStart(2,"0")}/${String(p.getMonth()+1).padStart(2,"0")}/${p.getFullYear()}`;}catch{return d;}}
export function daysBetween(a,b){if(!a||!b)return null;const A=typeof a==="string"?a.split("T")[0]:a;const B=typeof b==="string"?b.split("T")[0]:b;return Math.floor((new Date(B+"T00:00:00")-new Date(A+"T00:00:00"))/864e5);}
export function daysFromNow(d){if(!d)return null;const D=typeof d==="string"?d.split("T")[0]:d;return Math.floor((new Date()-new Date(D+"T00:00:00"))/864e5);}
