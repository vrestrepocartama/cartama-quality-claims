import {useState} from "react";
import {P,sMailWin,sMailBar,sMailField,sMailLabel,sMailBody,sT,sB} from "./styles.js";

/**
 * Ventana de correo reutilizable.
 * variant: "initial" (comercial) | "technical" (calidad)
 */
export default function MailView({
  variant="initial", title, subtitle, to, subject, body,
  lang="es", editable=false, onChange, code, footer,
}){
  const[copied,setCopied]=useState(false);
  const accent=variant==="technical"?P.pu:P.p;
  const accentL=variant==="technical"?P.puL:P.pL;

  const copy=()=>{
    navigator.clipboard.writeText(body||"").then(()=>{
      setCopied(true);setTimeout(()=>setCopied(false),2200);
    });
  };

  return(
    <div className="fade-in" style={{...sMailWin,borderTop:`3px solid ${accent}`}}>
      {/* Encabezado del bloque */}
      <div style={{...sMailBar,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{width:26,height:26,borderRadius:8,background:accentL,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
              {variant==="technical"?"🔬":"✉️"}
            </span>
            <span style={{fontSize:14.5,fontWeight:750,color:P.pD}}>{title}</span>
            {code&&<span style={sT(P.g,"#EFF3F1")}>{code}</span>}
            <span style={sT(lang==="en"?P.bl:P.oD,lang==="en"?P.bL:"#FFF3E0")}>{lang==="en"?"EN":"ES"}</span>
          </div>
          {subtitle&&<div style={{fontSize:11.5,color:P.g,marginTop:4,marginLeft:34}}>{subtitle}</div>}
        </div>
        <div style={{display:"flex",gap:5}}>
          {["#F0C0B4","#F5DFA8","#B9DFC5"].map((c,i)=><span key={i} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}
        </div>
      </div>

      {/* Campos tipo correo */}
      <div style={{padding:"11px 16px",borderBottom:`1px solid ${P.b}`,background:"#FCFDFC"}}>
        <div style={sMailField}><span style={sMailLabel}>Para</span><span style={{color:P.t,fontWeight:600}}>{to||"—"}</span></div>
        <div style={sMailField}><span style={sMailLabel}>Asunto</span><span style={{color:P.t,fontWeight:600}}>{subject}</span></div>
      </div>

      {/* Cuerpo */}
      {editable?(
        <textarea value={body} onChange={e=>onChange&&onChange(e.target.value)}
          style={{...sMailBody,width:"100%",minHeight:340,resize:"vertical",border:"none",outline:"none",background:P.w,maxHeight:"none",fontFamily:"'Segoe UI',system-ui,sans-serif"}}/>
      ):(
        <div style={sMailBody}>{body||"—"}</div>
      )}

      {/* Pie */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${P.b}`,background:"#FBFCFC",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn" onClick={copy}
          style={{...sB(),flex:1,minWidth:180,background:copied?`linear-gradient(135deg,${P.a},#52B788)`:undefined,padding:"12px 20px"}}>
          <span className={copied?"pop-in":""} style={{display:"inline-block"}}>{copied?"✓ Copiado al portapapeles":"📋 Copiar correo"}</span>
        </button>
        {footer}
      </div>
    </div>
  );
}
