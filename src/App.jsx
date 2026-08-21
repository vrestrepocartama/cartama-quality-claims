import { useState, useMemo, useCallback } from "react";

const STEPS={LANG:0,DATA:1,CLASS:2,TIMING:3,TIMING_URG:4,EVIDENCE:5,CATEGORY:6,DEFECTS:7,ALERT:8,FOLLOWUP:9,INFO:10,SUMMARY:11};
const CLS={FC:"fc",QA:"qa",FU:"fu",IR:"ir"};
const ST={
  S01:{code:"S-01",label:"Criterios Iniciales Cumplidos",color:"#2D6A4F",bg:"#D8F3DC"},
  S02:{code:"S-02",label:"Requiere Validación",color:"#E76F51",bg:"#FFF3CD"},
  S03:{code:"S-03",label:"Requiere Validación (Urgente)",color:"#CC0000",bg:"#F8D7DA"},
  S04:{code:"S-04",label:"Pendiente de Información",color:"#E76F51",bg:"#FFF3CD"},
  S05:{code:"S-05",label:"Fuera de Ventana",color:"#CC0000",bg:"#F8D7DA"},
  S06:{code:"S-06",label:"Quality Alert / QC Report",color:"#6C757D",bg:"#F8F9FA"},
  S07:{code:"S-07",label:"Follow-up",color:"#1565C0",bg:"#E8F4FD"},
  S08:{code:"S-08",label:"Solicitud de Info",color:"#6C757D",bg:"#F8F9FA"},
};

const DEFS={
  cargo:{title:"Defectos por % DE CARGA",sub:"% del total de pallets/cajas",items:[
    {id:"browning",name:"Vascular Browning",es:"Pardeamiento Vascular",th:3,nz:2,unit:"cargo",hasTh:true,ev:v=>v<2?"ok":v<3?"near":"fail"},
    {id:"lenticel",name:"Lenticel Damage",es:"Daño por Lenticela",th:25,nz:20,unit:"cargo",hasTh:true,ev:v=>v<20?"ok":v<25?"near":"urgent"},
    {id:"cold",name:"Cold Damage",es:"Daño por Frío",unit:"cargo",hasTh:false,ev:()=>"qr"},
  ]},
  fruit:{title:"Defectos por % DE FRUTA",sub:"% del área de cada fruta",items:[
    {id:"anthra",name:"Anthracnose",es:"Antracnosis",unit:"fruit",hasTh:true,ev:v=>v<=25?"ok":v<=30?"near":v<=40?"verify":"urgent"},
    {id:"brown_sc",name:"Brown Scars",es:"Cicatrices Color Café",unit:"fruit",hasTh:true,ev:v=>v<=5?"ok":v<=10?"near":v<=40?"fail":"urgent",note:"Cat I:5-10% | Cat II:40%"},
    {id:"thrips",name:"Thrips Damage",es:"Daño por Thrips",unit:"fruit",hasTh:true,ev:v=>v<=5?"ok":v<=15?"near":"fail",note:"Cat I:5-15% EU"},
    {id:"sunburn",name:"Sunburn",es:"Daño por Sol",unit:"fruit",hasTh:false,ev:()=>"qr"},
    {id:"pulp",name:"Pulp Damage",es:"Daño de Pulpa",unit:"fruit",hasTh:false,ev:()=>"qr"},
    {id:"peduncle",name:"Peduncle Rot",es:"Pudrición Peduncular",unit:"fruit",hasTh:false,ev:()=>"qr"},
  ]}
};

const URG_ITEMS=[
  {id:"fungi",name:"Fungi / Sooty Mold",es:"Hongos / Fumagina"},
  {id:"monalonion",name:"Monalonion",es:"Monalonion"},
  {id:"ripe",name:"Fruit arrived ripe/soft",es:"Fruta llegó madura/blanda"},
  {id:"atmo",name:"Controlled atmosphere issue",es:"Problema atmósfera controlada"},
  {id:"scale",name:"Scale (quarantine)",es:"Escamas (cuarentenaria)"},
  {id:"borer",name:"Fruit Borer (quarantine)",es:"Barrenadores (cuarentenaria)"},
];

const CATS=[{id:"c1",label:"Category I",desc:"Primera calidad"},{id:"c2",label:"Category II",desc:"Segunda calidad"}];
const EV_L={ok:{t:"✓ Dentro de parámetros",c:"#2D6A4F",b:"#D8F3DC"},near:{t:"⚠ Cercano — negociable",c:"#E65100",b:"#FFF3CD"},fail:{t:"✕ Fuera de parámetros",c:"#E76F51",b:"#FFF3CD"},verify:{t:"⚠ Zona verificación",c:"#E65100",b:"#FFF3CD"},urgent:{t:"🚨 Escalamiento urgente",c:"#CC0000",b:"#F8D7DA"},qr:{t:"📋 Quality verificará",c:"#6C757D",b:"#F8F9FA"}};
const FU_ST=[{id:"review",en:"Under review",es:"En revisión"},{id:"wait",en:"Waiting for client info",es:"Esperando info del cliente"},{id:"nego",en:"In negotiation",es:"En negociación"},{id:"done",en:"Resolved",es:"Resuelto"}];
const INFO_T=[{id:"trace",en:"Traceability",es:"Trazabilidad"},{id:"cert",en:"Certificates",es:"Certificados"},{id:"specs",en:"Specifications",es:"Especificaciones"},{id:"container",en:"Container/transit data",es:"Datos contenedor/tránsito"},{id:"atmo",en:"Atmosphere parameters",es:"Parámetros atmósfera"},{id:"grower",en:"Grower/productive unit",es:"Predio/UP"},{id:"other",en:"Other",es:"Otro"}];

const CL_CARDS={
  en:[
    {id:CLS.FC,title:"Formal Claim",icon:"⚠️",desc:"El cliente reclama formalmente",kw:['"claim"','"claimed"','"credit note"','"compensation"','"reject"','"not acceptable"','"below the standard"','"waste of X%"'],ex:'"We got it CLAIMED since the quality is below the standard agreed..."'},
    {id:CLS.QA,title:"Quality Alert / QC Report",icon:"📋",desc:"Información de calidad o reporte sin reclamo",kw:['"QC report"','"we expect"','"high waste expected"','"for your information"','"attached report"'],ex:'"Please find attached the QC report... We expect high waste..."'},
    {id:CLS.FU,title:"Claim Follow-up",icon:"🔄",desc:"Seguimiento de reclamo anterior",kw:['"following up"','"update on"','"status of our claim"','"any news"'],ex:'"We are following up on our previous claim..."'},
    {id:CLS.IR,title:"Information Request",icon:"📨",desc:"Piden información sin reclamar",kw:['"traceability"','"certificate"','"could you provide"'],ex:'"Could you provide the traceability details..."'},
  ],
  es:[
    {id:CLS.FC,title:"Reclamo Formal",icon:"⚠️",desc:"El cliente reclama formalmente",kw:['"reclamo"','"nota de crédito"','"compensación"','"rechazado"','"no aceptable"','"pérdidas"','"merma"'],ex:'"Hemos RECLAMADO ya que la calidad está por debajo del estándar..."'},
    {id:CLS.QA,title:"Alerta de Calidad / QC Report",icon:"📋",desc:"Información de calidad o reporte sin reclamo",kw:['"reporte de calidad"','"esperamos"','"waste esperado"','"para su información"','"reporte adjunto"'],ex:'"Adjunto el reporte... Esperamos alto waste..."'},
    {id:CLS.FU,title:"Seguimiento",icon:"🔄",desc:"Seguimiento de reclamo anterior",kw:['"seguimiento"','"actualización"','"estado del reclamo"'],ex:'"Dando seguimiento a nuestro reclamo anterior..."'},
    {id:CLS.IR,title:"Solicitud de Info",icon:"📨",desc:"Piden información sin reclamar",kw:['"trazabilidad"','"certificado"','"podrían proporcionarnos"'],ex:'"¿Podrían proporcionarnos los detalles...?"'},
  ]
};

// ─── RESPONSE BUILDERS ───
function buildResp(code,L,d){
  const g=L==="en"?`Dear ${d.cl},`:`Estimado/a ${d.cl},`;
  const s=L==="en"?`Best regards,\n[Name]\nQuality Department — Cartama`:`Cordialmente,\n[Nombre]\nDepartamento de Calidad — Cartama`;
  const arrF=fmtDate(d.arr,L);const emF=fmtDate(d.em,L);
  const cr=L==="en"?`container ${d.ct}${arrF?`, which arrived on ${arrF}`:""}`:`contenedor ${d.ct}${arrF?`, el cual llegó el ${arrF}`:""}`;
  const dn=(d.sD||[]).map(x=>L==="en"?x.name:x.es);
  const dl=dn.length>0?(L==="en"?`, noting issues related to ${dn.join(", ")}`:", reportando temas relacionados con "+dn.join(", ")):"";
  const noLoss=d.noLoss?(L==="en"?"\n\nShould you have an estimated loss/waste percentage, please share it to support the review.":"\n\nSi cuenta con un porcentaje estimado de pérdida/waste, le agradeceríamos compartirlo para apoyar la revisión."):"";
  const pallInfo=d.pallText||"";
  if(L==="en"){return({"MSG-01":`${g}\n\nThank you for reaching out regarding ${cr}. We have received your claim along with the supporting documentation${dl}.${pallInfo}\n\nThe traceability has been initiated and our Quality team will review the case thoroughly. We will get back to you within [X] business days.${noLoss}\n\nIf there is any additional information, please feel free to share it.\n\n${s}`,
    "MSG-02":`${g}\n\nThank you for your communication regarding ${cr}${d.days!==null?` (received ${d.days} days after arrival)`:""}.${dl?` We acknowledge the reported findings${dl}.`:""}${pallInfo}\n\nWe have reviewed the initial information and identified aspects that require a more detailed assessment, including verification of transit conditions, quality parameters, and post-arrival evolution.${noLoss}\n\nOur team will provide you with a comprehensive response within [X] business days.\n\n${s}`,
    "MSG-03":`${g}\n\nThank you for bringing this to our attention regarding ${cr}.${dl?` We have noted the reported concerns${dl}.`:""}${pallInfo}\n\nGiven the nature of the issues identified, this case has been escalated for priority review. Our Quality team will be in touch shortly.${noLoss}\n\n${s}`,
    "MSG-04":`${g}\n\nThank you for your communication regarding ${cr}. Your message was received on ${emF||"[date]"}${d.days!==null?`, which is ${d.days} days after arrival`:""}, placing it outside our standard claim window of 7 days.${d.timingUrg?`\n\nHowever, we have noted concerns regarding ${d.timingUrg} which have been flagged for priority attention regardless of the claim window.`:""}\n\nWe have forwarded the case to our Quality team for their consideration. We will follow up within [X] business days.\n\n${s}`,
    "MSG-05":`${g}\n\nThank you for reaching out regarding ${cr}.\n\nTo move forward with the evaluation, we would need:\n\n• Photographic evidence of the defects/damage\n\nOnce we have this, we will proceed with the review.\n\n${s}`,
    "MSG-06":`${g}\n\nThank you for sharing the quality findings for ${cr}.${d.aD?.length>0?`\n\nWe have noted the reported observations regarding ${d.aD.join(", ")}.`:""}${d.aW?` The expected waste of ${d.aW}% has been registered.`:""}${d.aQC?" We confirm receipt of the QC report.":""}\n\nOur team will review this internally and monitor the situation.${d.aW&&parseFloat(d.aW)>=20?` Given the expected waste level, we have flagged this for closer follow-up.`:""}\n\nPlease share any updates as they become available.\n\n${s}`,
    "MSG-07":d.fuSt==="wait"?`${g}\n\nThank you for following up regarding ${cr}.\n\nThe case is on hold as we still need additional information:\n\n${(d.fuM||["[Specify pending info]"]).map(i=>i.startsWith("•")?i:`• ${i}`).join("\n")}\n\nOnce received, we will proceed. We appreciate your collaboration.\n\n${s}`:d.fuSt==="nego"?`${g}\n\nThank you for following up regarding ${cr}.\n\nAs discussed, this case is in the negotiation phase. We will provide an update within [X] business days.\n\nWe value the ongoing dialogue and are committed to a fair outcome.\n\n${s}`:d.fuSt==="done"?`${g}\n\nThank you for your message regarding ${cr}.\n\nThis case has been resolved per our previous communication. If you have remaining questions, please let us know.\n\n${s}`:`${g}\n\nThank you for following up regarding ${cr}.\n\nThe case is under review. We expect to have a detailed response within [X] business days.\n\nWe appreciate your patience.\n\n${s}`,
    "MSG-08":`${g}\n\nThank you for your request regarding ${cr}.\n\n${d.iT?.length>0?`We have noted your request for:\n\n${d.iT.map(t=>`• ${t}`).join("\n")}\n\nOur team will gather this and respond within [X] business days.`:"Our team will respond within [X] business days."}\n\n${s}`,
  })[code]||"";}
  else{return({"MSG-01":`${g}\n\nGracias por comunicarse respecto al ${cr}. Hemos recibido su reclamo junto con la documentación${dl}.${pallInfo}\n\nLa trazabilidad ha sido iniciada y nuestro equipo de Calidad revisará el caso. Le responderemos dentro de [X] días hábiles.${noLoss}\n\nSi tiene información adicional, no dude en enviarla.\n\n${s}`,
    "MSG-02":`${g}\n\nGracias por su comunicación respecto al ${cr}${d.days!==null?` (recibida ${d.days} días después del arribo)`:""}.${dl?` Acusamos recibo${dl}.`:""}${pallInfo}\n\nHemos identificado aspectos que requieren evaluación más detallada.${noLoss}\n\nNuestro equipo responderá dentro de [X] días hábiles.\n\n${s}`,
    "MSG-03":`${g}\n\nGracias por informarnos sobre el ${cr}.${dl?` Hemos tomado nota${dl}.`:""}${pallInfo}\n\nEste caso ha sido escalado para revisión prioritaria. Nuestro equipo se comunicará a la brevedad.${noLoss}\n\n${s}`,
    "MSG-04":`${g}\n\nGracias por su comunicación respecto al ${cr}. Su mensaje fue recibido el ${emF||"[fecha]"}${d.days!==null?`, ${d.days} días después del arribo`:""}, fuera de nuestra ventana de 7 días.${d.timingUrg?`\n\nSin embargo, hemos identificado preocupaciones respecto a ${d.timingUrg} que han sido marcadas para atención prioritaria independientemente de la ventana.`:""}\n\nHemos remitido el caso a Quality. Seguimiento dentro de [X] días hábiles.\n\n${s}`,
    "MSG-05":`${g}\n\nGracias por comunicarse respecto al ${cr}.\n\nPara avanzar necesitaríamos:\n\n• Evidencia fotográfica de los defectos/daño\n\nUna vez recibida, procederemos con la revisión.\n\n${s}`,
    "MSG-06":`${g}\n\nGracias por compartir los hallazgos del ${cr}.${d.aD?.length>0?`\n\nHemos tomado nota respecto a ${d.aD.join(", ")}.`:""}${d.aW?` El waste esperado del ${d.aW}% ha sido registrado.`:""}${d.aQC?" Confirmamos recepción del QC report.":""}\n\nNuestro equipo revisará internamente.${d.aW&&parseFloat(d.aW)>=20?` Dado el nivel de waste, hemos marcado esto para seguimiento cercano.`:""}\n\nNo dude en compartir actualizaciones.\n\n${s}`,
    "MSG-07":d.fuSt==="wait"?`${g}\n\nGracias por el seguimiento respecto al ${cr}.\n\nEl caso está en espera, necesitamos:\n\n${(d.fuM||["[Info pendiente]"]).map(i=>i.startsWith("•")?i:`• ${i}`).join("\n")}\n\nAgradecemos su colaboración.\n\n${s}`:d.fuSt==="nego"?`${g}\n\nGracias por el seguimiento respecto al ${cr}.\n\nEl caso está en negociación. Actualización dentro de [X] días hábiles.\n\n${s}`:d.fuSt==="done"?`${g}\n\nGracias por su mensaje respecto al ${cr}.\n\nEste caso fue resuelto. Si tiene preguntas, no dude en contactarnos.\n\n${s}`:`${g}\n\nGracias por el seguimiento respecto al ${cr}.\n\nEl caso está en revisión. Responderemos dentro de [X] días hábiles.\n\n${s}`,
    "MSG-08":`${g}\n\nGracias por su solicitud respecto al ${cr}.\n\n${d.iT?.length>0?`Hemos tomado nota:\n\n${d.iT.map(t=>`• ${t}`).join("\n")}\n\nResponderemos dentro de [X] días hábiles.`:"Responderemos dentro de [X] días hábiles."}\n\n${s}`,
  })[code]||"";}
}

function fmtDate(d,L){if(!d)return"";try{const p=new Date(d+"T00:00:00");const mo_en=["January","February","March","April","May","June","July","August","September","October","November","December"];const mo_es=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];return L==="en"?`${mo_en[p.getMonth()]} ${p.getDate()}, ${p.getFullYear()}`:`${p.getDate()} de ${mo_es[p.getMonth()]} de ${p.getFullYear()}`;}catch(e){return d;}}

function buildTech(L,d){
  const g=L==="en"?`Dear ${d.cl},`:`Estimado/a ${d.cl},`;
  const s=L==="en"?`Best regards,\n[Name]\nQuality Department — Cartama`:`Cordialmente,\n[Nombre]\nDepartamento de Calidad — Cartama`;
  const arrF=fmtDate(d.arr,L);
  const ok=[],near=[],rev=[],urg=[];
  (d.sD||[]).forEach(def=>{const v=d.dV[def.id];const e=d.dE[def.id];const nm=L==="en"?def.name:def.es;const ul=def.unit==="cargo"?(L==="en"?"of the cargo":"de la carga"):(L==="en"?"of the fruit area":"del área de la fruta");const plt=d.dP?.[def.id]?(L==="en"?`, affecting ${d.dP[def.id]} pallets`:", afectando "+d.dP[def.id]+" pallets"):"";const entry={nm,v,ul,plt,e,def};if(e==="ok")ok.push(entry);else if(e==="near")near.push(entry);else if(e==="urgent")urg.push(entry);else rev.push(entry);});
  (d.sU||[]).forEach(u=>urg.push({nm:L==="en"?u.name:u.es,isF:true}));
  const allOk=rev.length===0&&urg.length===0&&!d.catM;const allW=ok.length>0&&near.length===0&&allOk;

  if(L==="en"){
    let b=`${g}\n\nThank you for your communication regarding container ${d.ct}${arrF?`, which arrived on ${arrF}`:""}. We have conducted the traceability and reviewed the quality findings reported.`;

    // ALL WITHIN PARAMETERS
    if(allW){
      if(ok.length===1){const p=ok[0];b+=`\n\nIn what concerns ${p.nm.toLowerCase()}${p.v?` (${p.v}% ${p.ul})`:""}, this remains within our acceptable quality parameters and does not pose a risk to the commercial viability of the fruit. The fruit meets the standards of our Hass Avocado Grading and is suitable for commercialization.`;}
      else{b+=`\n\nIn what concerns the reported findings — ${ok.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(", ")} — all remain within our acceptable quality parameters. The fruit meets our Hass Avocado Grading standards and is suitable for commercialization.`;}
      b+=`\n\nTherefore, the claims are not applicable.`;
    }
    // WITHIN + NEAR (negotiable, no hard fails)
    else if(rev.length===0&&urg.length===0&&!d.catM){
      if(ok.length>0){b+=`\n\nIn what concerns ${ok.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(" and ")}, ${ok.length===1?"this remains":"these remain"} within our acceptable quality parameters and ${ok.length===1?"does":"do"} not compromise the commercial quality of the fruit.`;}
      if(near.length>0){b+=`\n\n${ok.length>0?"That said, we":"We"} have noted that ${near.map(e=>`${e.nm.toLowerCase()}${e.v?` at ${e.v}% ${e.ul}`:""}${e.plt}`).join(" and ")} ${near.length===1?"is":"are"} within the acceptable range but approaching the established threshold. While this does not represent a deviation from our quality standards, we are open to reviewing this further as part of a collaborative assessment.`;}
      b+=`\n\nWe remain available to discuss these findings in more detail should you wish to do so.`;
    }
    // MIXED: some ok, some fail, some urgent
    else{
      // OK items - brief, natural
      if(ok.length>0){b+=`\n\nIn what concerns ${ok.map(e=>e.nm.toLowerCase()).join(" and ")}, ${ok.length===1?"this remains":"these remain"} within our acceptable quality parameters.`;}
      // Near items - connected with transition
      if(near.length>0){b+=`\n\n${ok.length>0?"Additionally, we":"We"} have noted that ${near.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(" and ")} ${near.length===1?"is":"are"} within range but approaching the threshold, and we are open to reviewing ${near.length===1?"this":"these"} further.`;}
      // Review items - grouped naturally with "however"
      if(rev.length>0){const trans=(ok.length>0||near.length>0)?"However, we":"We";b+=`\n\n${trans} have identified ${rev.map(e=>`${e.nm.toLowerCase()}${e.v?` at ${e.v}% ${e.ul}`:""}${e.plt}`).join(" and ")}, which ${rev.length===1?"requires":"require"} a more detailed analysis by our team.`;const hasCold=rev.some(r=>r.def?.id==="cold"||r.def?.id==="pulp");if(hasCold)b+=` This includes a review of transit temperatures, controlled atmosphere parameters, and post-arrival storage and handling conditions, as these factors can significantly influence fruit quality and shelf life.`;}
      // Urgent items - connected with "asimismo" / "additionally"
      if(urg.length>0){const trans=(rev.length>0)?"Asimismo":"Additionally";b+=`\n\n${rev.length>0?"Additionally":"We also want to address that"} ${urg.map(u=>u.nm.toLowerCase()).join(" and ")} ${urg.length===1?"has":"have"} been reported, and ${urg.length===1?"this has":"these have"} been flagged for priority attention. Our Quality department is handling this with urgency.`;}
      // Category mismatch - integrated naturally
      if(d.catM){b+=`\n\nWe would also like to note that this container was packed and dispatched as ${CATS.find(c=>c.id===d.catC)?.label||""} in accordance with our Hass Avocado Grading standards. We have noted that it was classified as ${CATS.find(c=>c.id===d.catCl)?.label||""} on your end, and this will be considered as part of the review.`;}
      // Notes - integrated naturally
      if(d.notes){b+=`\n\nWe have also taken note of the reported ${d.notes.toLowerCase().replace(/\.$/,"")}, which will be considered within the overall review.`;}
      // Closing - includes loss request if needed
      b+=`\n\nWe will provide you with a detailed response once the full analysis is complete.`;
      if(d.noLoss)b+=` If an estimated loss/waste percentage is available, it would support the review process.`;
      b+=` Should you have any additional documentation, please feel free to share it with us.`;
    }
    if(!d.notes&&allW&&d.notes){}// handled above
    return b+`\n\n${s}`;
  }
  // ─── SPANISH ───
  else{
    let b=`${g}\n\nGracias por su comunicación respecto al contenedor ${d.ct}${arrF?`, el cual llegó el ${arrF}`:""}. Hemos realizado la trazabilidad y revisado los hallazgos de calidad reportados.`;

    if(allW){
      if(ok.length===1){const p=ok[0];b+=`\n\nEn lo que respecta a ${p.nm.toLowerCase()}${p.v?` (${p.v}% ${p.ul})`:""}, este se encuentra dentro de nuestros parámetros de calidad aceptables y no representa un riesgo para la viabilidad comercial de la fruta. La fruta cumple con los estándares de nuestro Hass Avocado Grading y es apta para comercialización.`;}
      else{b+=`\n\nEn lo que respecta a los hallazgos reportados — ${ok.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(", ")} — todos se encuentran dentro de nuestros parámetros de calidad aceptables. La fruta es apta para comercialización.`;}
      b+=`\n\nPor lo tanto, los reclamos no son aplicables.`;
    }
    else if(rev.length===0&&urg.length===0&&!d.catM){
      if(ok.length>0){b+=`\n\nEn lo que respecta a ${ok.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(" y ")}, se ${ok.length===1?"encuentra":"encuentran"} dentro de nuestros parámetros de calidad aceptables y no ${ok.length===1?"compromete":"comprometen"} la calidad comercial de la fruta.`;}
      if(near.length>0){b+=`\n\n${ok.length>0?"No obstante, hemos":"Hemos"} identificado que ${near.map(e=>`${e.nm.toLowerCase()}${e.v?` en ${e.v}% ${e.ul}`:""}${e.plt}`).join(" y ")} se ${near.length===1?"encuentra":"encuentran"} dentro del rango aceptable pero próximo al umbral establecido. Si bien esto no representa una desviación de nuestros estándares, estamos abiertos a revisarlo de manera colaborativa.`;}
      b+=`\n\nQuedamos a su disposición para discutir estos hallazgos en mayor detalle.`;
    }
    else{
      if(ok.length>0){b+=`\n\nEn lo que respecta a ${ok.map(e=>e.nm.toLowerCase()).join(" y ")}, se ${ok.length===1?"mantiene":"mantienen"} dentro de nuestros parámetros de calidad aceptables.`;}
      if(near.length>0){b+=`\n\n${ok.length>0?"Asimismo, hemos":"Hemos"} identificado que ${near.map(e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`).join(" y ")} se ${near.length===1?"encuentra":"encuentran"} dentro del rango pero próximo al umbral, y estamos abiertos a revisarlo.`;}
      if(rev.length>0){const trans=(ok.length>0||near.length>0)?"Sin embargo, hemos":"Hemos";b+=`\n\n${trans} identificado ${rev.map(e=>`${e.nm.toLowerCase()}${e.v?` en el ${e.v}% ${e.ul}`:""}${e.plt}`).join(" y ")}, lo cual requiere un análisis más detallado por parte de nuestro equipo.`;const hasCold=rev.some(r=>r.def?.id==="cold"||r.def?.id==="pulp");if(hasCold)b+=` Esto incluye la revisión de temperaturas de tránsito, parámetros de atmósfera controlada y condiciones de almacenamiento y manejo post-arribo, ya que estos factores pueden influir significativamente en la calidad de la fruta.`;}
      if(urg.length>0){b+=`\n\n${rev.length>0?"Asimismo":"También queremos abordar que"}, se ha reportado presencia de ${urg.map(u=>u.nm.toLowerCase()).join(" y ")}, situación que ha sido marcada para atención prioritaria y que nuestro departamento de Calidad está atendiendo con urgencia.`;}
      if(d.catM){b+=`\n\nCabe señalar que este contenedor fue empacado y despachado como ${CATS.find(c=>c.id===d.catC)?.label||""} de acuerdo con nuestros estándares de Hass Avocado Grading. Hemos notado que fue clasificado como ${CATS.find(c=>c.id===d.catCl)?.label||""} de su lado, lo cual será considerado como parte de la revisión.`;}
      if(d.notes){b+=`\n\nTambién hemos tomado nota del reporte de ${d.notes.toLowerCase().replace(/\.$/,"")}, lo cual será considerado dentro de la revisión.`;}
      b+=`\n\nLe proporcionaremos una respuesta detallada una vez completado el análisis.`;
      if(d.noLoss)b+=` Si cuenta con un porcentaje estimado de pérdida o documentación adicional, le agradeceríamos compartirlo para apoyar la revisión.`;
      else b+=` Si tiene documentación adicional, no dude en compartirla.`;
    }
    return b+`\n\n${s}`;
  }
}

// ─── STYLES ───
const C={p:"#2D6A4F",pL:"#D8F3DC",pD:"#1A1A2E",a:"#40916C",o:"#E76F51",oL:"#FFF3CD",r:"#CC0000",rL:"#F8D7DA",g:"#6C757D",gL:"#F8F9FA",w:"#FFFFFF",t:"#333333",b:"#E0E0E0",bl:"#1565C0",bL:"#E8F4FD"};
const sC={background:C.w,borderRadius:12,padding:"28px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",border:`1px solid ${C.b}`,marginBottom:16};
const sL={display:"block",fontSize:13,fontWeight:600,color:C.g,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"};
const sI={width:"100%",padding:"10px 14px",border:`1.5px solid ${C.b}`,borderRadius:8,fontSize:15,color:C.t,outline:"none",boxSizing:"border-box",background:C.w};
const sB=ok=>({background:ok?C.p:"#CCC",color:C.w,border:"none",borderRadius:8,padding:"12px 28px",fontSize:15,fontWeight:600,cursor:ok?"pointer":"not-allowed",display:"inline-flex",alignItems:"center",gap:8});
const sBS={background:"transparent",color:C.p,border:`1.5px solid ${C.p}`,borderRadius:8,padding:"12px 28px",fontSize:15,fontWeight:600,cursor:"pointer"};
const sBE={background:"transparent",color:C.a,border:`1px solid ${C.b}`,borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"};
const sT=(c,bg)=>({display:"inline-block",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,color:c,background:bg});
const sA=t=>{const m={info:{bg:C.bL,b:"#90CAF9",c:C.bl},warning:{bg:C.oL,b:"#FFE082",c:"#E65100"},success:{bg:C.pL,b:"#A5D6A7",c:C.p},danger:{bg:C.rL,b:"#EF9A9A",c:C.r}};const v=m[t]||m.info;return{background:v.bg,border:`1px solid ${v.b}`,borderRadius:10,padding:"14px 18px",marginBottom:14,color:v.c,fontSize:14,lineHeight:1.6};};
const sO=sel=>({border:`2px solid ${sel?C.p:C.b}`,borderRadius:10,padding:"16px 18px",cursor:"pointer",background:sel?C.pL:C.w,marginBottom:10});
const sYN=(sel,y)=>({flex:1,padding:"14px 20px",border:`2px solid ${sel?(y?C.p:C.o):C.b}`,borderRadius:10,background:sel?(y?C.pL:C.oL):C.w,cursor:"pointer",fontSize:15,fontWeight:sel?700:500,color:sel?(y?C.p:C.o):C.t,textAlign:"center"});
const sChk=(sel,col)=>({display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",marginBottom:8,border:`2px solid ${sel?col:C.b}`,borderRadius:8,background:sel?(col===C.r?C.rL:C.pL):C.w});
const sBox=(sel,col)=>({width:22,height:22,borderRadius:4,border:`2px solid ${sel?col:C.b}`,background:sel?col:C.w,display:"flex",alignItems:"center",justifyContent:"center",color:C.w,fontSize:14,fontWeight:700,flexShrink:0});

export default function App(){
  const [step,setStep]=useState(STEPS.LANG);
  const [lang,setLang]=useState("");
  const [dt,setDt]=useState({ct:"",cl:"",arr:"",em:"",etd:"",eta:"",pk:""});
  const [cls,setCls]=useState("");
  const [hasPhotos,setHasPhotos]=useState(null);
  const [hasLoss,setHasLoss]=useState(null);
  const [catC,setCatC]=useState("");const [catCl,setCatCl]=useState("");
  const [dChk,setDChk]=useState({});const [dVal,setDVal]=useState({});const [dPall,setDPall]=useState({});
  const [uChk,setUChk]=useState({});
  const [showPall,setShowPall]=useState(false);
  const [notes,setNotes]=useState("");
  // Alert
  const [aChk,setAChk]=useState({});const [aW,setAW]=useState("");const [aQC,setAQC]=useState(null);
  // Followup
  const [fuSt,setFuSt]=useState("");const [fuM,setFuM]=useState("");
  // Info
  const [iChk,setIChk]=useState({});
  // Timing urgent
  const [tUChk,setTUChk]=useState({});
  // UI
  const [copied,setCopied]=useState({i:false,t:false});const [log,setLog]=useState([]);const [showTech,setShowTech]=useState(false);

  const days=useMemo(()=>{if(!dt.arr||!dt.em)return null;return Math.floor((new Date(dt.em+"T00:00:00")-new Date(dt.arr+"T00:00:00"))/864e5);},[dt.arr,dt.em]);
  const inWin=days!==null?days<=7:null;
  const addLog=(s,r)=>setLog(p=>[...p,{step:s,result:r}]);

  const allI=[...DEFS.cargo.items,...DEFS.fruit.items];
  const sD=allI.filter(d=>dChk[d.id]);const sU=URG_ITEMS.filter(u=>uChk[u.id]);const hasU=sU.length>0;
  const tU=URG_ITEMS.filter(u=>tUChk[u.id]);const hasTU=tU.length>0;
  const dE=useMemo(()=>{const e={};sD.forEach(def=>{const v=parseFloat(dVal[def.id]);if(!isNaN(v)&&def.ev)e[def.id]=def.ev(v);else if(!def.hasTh&&def.ev)e[def.id]=def.ev(0);});return e;},[sD,dVal]);
  const hasF=Object.values(dE).some(e=>e==="fail"||e==="verify");
  const hasUD=Object.values(dE).some(e=>e==="urgent");
  const catM=catC&&catCl&&catC!==catCl;
  const aD=useMemo(()=>allI.filter(d=>aChk[d.id]).map(d=>lang==="en"?d.name:d.es),[aChk,lang]);
  const iT=INFO_T.filter(t=>iChk[t.id]).map(t=>lang==="en"?t.en:t.es);

  const getSt=useCallback(()=>{
    if(cls===CLS.QA)return ST.S06;if(cls===CLS.FU)return ST.S07;if(cls===CLS.IR)return ST.S08;
    if(inWin===false)return hasTU?ST.S03:ST.S05;
    if(hasPhotos===false)return ST.S04;
    if(hasU||hasUD)return ST.S03;
    if(hasF||catM||Object.values(dE).some(e=>e==="near"||e==="verify"))return ST.S02;
    return ST.S01;
  },[cls,inWin,hasTU,hasPhotos,hasU,hasUD,hasF,catM,dE]);

  const getMsg=useCallback(()=>{
    if(cls===CLS.QA)return"MSG-06";if(cls===CLS.FU)return"MSG-07";if(cls===CLS.IR)return"MSG-08";
    if(inWin===false)return"MSG-04";if(hasPhotos===false)return"MSG-05";
    if(hasU||hasUD)return"MSG-03";
    if(hasF||catM||Object.values(dE).some(e=>e==="near"||e==="verify"))return"MSG-02";
    return"MSG-01";
  },[cls,inWin,hasPhotos,hasU,hasUD,hasF,catM,dE]);

  const pallText=useMemo(()=>{
    if(!showPall)return"";const parts=sD.filter(d=>dPall[d.id]).map(d=>`${lang==="en"?d.name:d.es}: ${dPall[d.id]} pallets`);
    return parts.length>0?(lang==="en"?`\n\nAffected pallets reported: ${parts.join(", ")}.`:"\n\nPallets afectados reportados: "+parts.join(", ")+"."):"";},[showPall,sD,dPall,lang]);
  const timingUrgText=useMemo(()=>tU.map(u=>lang==="en"?u.name.toLowerCase():u.es.toLowerCase()).join(", "),[tU,lang]);

  const iR=useCallback(()=>buildResp(getMsg(),lang||"en",{cl:dt.cl||"[Client]",ct:dt.ct||"[Container]",arr:dt.arr,em:dt.em,days,sD,noLoss:hasLoss===false,pallText,timingUrg:timingUrgText,aD,aW,aQC:aQC===true,fuSt,fuM:fuM?fuM.split("\n").filter(Boolean):[],iT}),[getMsg,lang,dt,days,sD,hasLoss,pallText,timingUrgText,aD,aW,aQC,fuSt,fuM,iT]);
  const tR=useCallback(()=>buildTech(lang||"en",{cl:dt.cl||"[Client]",ct:dt.ct||"[Container]",arr:dt.arr,sD,sU,dV:dVal,dE,dP:showPall?dPall:null,catM,catC,catCl,noLoss:hasLoss===false,notes}),[lang,dt,sD,sU,dVal,dE,showPall,dPall,catM,catC,catCl,hasLoss,notes]);

  const hCopy=t=>{const tx=t==="t"?tR():iR();navigator.clipboard.writeText(tx).then(()=>{setCopied({...copied,[t]:true});setTimeout(()=>setCopied({...copied,[t]:false}),2500);});};
  const restart=()=>{setStep(STEPS.LANG);setLang("");setDt({ct:"",cl:"",arr:"",em:"",etd:"",eta:"",pk:""});setCls("");setHasPhotos(null);setHasLoss(null);setCatC("");setCatCl("");setDChk({});setDVal({});setDPall({});setUChk({});setShowPall(false);setNotes("");setAChk({});setAW("");setAQC(null);setFuSt("");setFuM("");setIChk({});setTUChk({});setCopied({i:false,t:false});setLog([]);setShowTech(false);};
  const goTo=s=>setStep(s);

  const canDt=dt.ct.trim()&&dt.cl.trim()&&dt.arr&&dt.em;
  const canDef=sD.length>0||sU.length>0;

  const nextCls=()=>{addLog("Clasificación",cls);if(cls===CLS.FC)setStep(STEPS.TIMING);else if(cls===CLS.QA)setStep(STEPS.ALERT);else if(cls===CLS.FU)setStep(STEPS.FOLLOWUP);else setStep(STEPS.INFO);};

  const stMap={[CLS.FC]:8,[CLS.QA]:4,[CLS.FU]:4,[CLS.IR]:4};const totS=stMap[cls]||4;
  const curS=step<=STEPS.CLASS?step+1:cls===CLS.FC?(step===STEPS.TIMING?4:step===STEPS.TIMING_URG?5:step===STEPS.EVIDENCE?5:step===STEPS.CATEGORY?6:step===STEPS.DEFECTS?7:8):step===STEPS.SUMMARY?4:4;

  const renderDG=(grp,ck,setCk,vl,setVl,showEv)=>(
    <div style={{marginBottom:20}}><div style={{fontSize:14,fontWeight:700,color:C.pD,marginBottom:4}}>{grp.title}</div><div style={{fontSize:12,color:C.g,marginBottom:12}}>{grp.sub}</div>
      {grp.items.map(item=>(
        <div key={item.id} style={{marginBottom:ck[item.id]&&showEv?16:8}}>
          <div onClick={()=>setCk(p=>({...p,[item.id]:!p[item.id]}))} style={sChk(ck[item.id],C.p)}><div style={sBox(ck[item.id],C.p)}>{ck[item.id]?"✓":""}</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:ck[item.id]?C.p:C.t}}>{item.name} <span style={{color:C.g,fontWeight:400}}>/ {item.es}</span></div>{item.note&&<div style={{fontSize:11,color:C.g,marginTop:2}}>{item.note}</div>}</div>
            {showEv&&<div style={sT(C.g,C.gL)}>% {item.unit==="cargo"?"carga":"fruta"}</div>}
          </div>
          {ck[item.id]&&showEv&&(<div style={{marginLeft:36,marginTop:8,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div><label style={{fontSize:12,color:C.g}}>% reportado{!item.hasTh?" (opcional)":""}:</label><input type="number" step="0.1" min="0" max="100" style={{...sI,width:100,padding:"8px 10px",fontSize:14,marginTop:4}} placeholder={item.hasTh?"Ej: 5":"Opcional"} value={vl[item.id]||""} onChange={e=>setVl(p=>({...p,[item.id]:e.target.value}))}/></div>
            {vl[item.id]&&dE[item.id]&&<div style={{padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:600,background:EV_L[dE[item.id]]?.b,color:EV_L[dE[item.id]]?.c}}>{EV_L[dE[item.id]]?.t}</div>}
            {item.hasTh&&item.th&&<div style={{fontSize:11,color:C.g}}>Umbral: {item.th}%</div>}
            {showPall&&<div><label style={{fontSize:12,color:C.g}}>Pallets:</label><input type="number" min="0" style={{...sI,width:80,padding:"8px 10px",fontSize:14,marginTop:4}} placeholder="#" value={dPall[item.id]||""} onChange={e=>setDPall(p=>({...p,[item.id]:e.target.value}))}/></div>}
          </div>)}
        </div>
      ))}
    </div>
  );

  const editBtn=(label,target)=><button onClick={()=>goTo(target)} style={sBE}>✏️ {label}</button>;

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:720,margin:"0 auto",color:C.t,lineHeight:1.5}}>
      <div style={{background:`linear-gradient(135deg,${C.p},${C.a})`,borderRadius:12,padding:"20px 24px",marginBottom:20,color:C.w}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,opacity:0.7,textTransform:"uppercase"}}>Cartama</div><div style={{fontSize:20,fontWeight:700,marginTop:2}}>Quality Claim Response Assistant</div></div>{step>0&&<div onClick={restart} style={{fontSize:12,opacity:0.8,cursor:"pointer",padding:"4px 12px",border:"1px solid rgba(255,255,255,0.4)",borderRadius:6}}>Reiniciar</div>}</div>
        <div style={{fontSize:13,marginTop:8,opacity:0.85}}>Paso {curS} de {totS}</div>
        <div style={{display:"flex",gap:6,marginTop:12}}>{Array.from({length:totS}).map((_,i)=><div key={i} style={{width:28,height:4,borderRadius:2,background:i+1<curS?"rgba(255,255,255,0.9)":i+1===curS?C.w:"rgba(255,255,255,0.3)"}}/>)}</div>
      </div>

      {step===STEPS.LANG&&(<div style={sC}><p style={{fontSize:14,color:C.g,marginTop:0}}>Idioma de la respuesta al cliente.</p><div style={{display:"flex",gap:12,marginTop:20}}>{[{id:"en",l:"English",f:"🇬🇧"},{id:"es",l:"Español",f:"🇪🇸"}].map(o=><div key={o.id} onClick={()=>setLang(o.id)} style={{...sO(lang===o.id),flex:1,textAlign:"center",padding:"24px 18px"}}><div style={{fontSize:28,marginBottom:8}}>{o.f}</div><div style={{fontSize:17,fontWeight:700,color:lang===o.id?C.p:C.t}}>{o.l}</div></div>)}</div><div style={{marginTop:24,textAlign:"right"}}><button onClick={()=>{addLog("Idioma",lang);setStep(STEPS.DATA);}} style={sB(!!lang)} disabled={!lang}>Continuar →</button></div></div>)}

      {step===STEPS.DATA&&(<div style={sC}><div style={{display:"grid",gap:16}}><div><label style={sL}>Contenedor(es) *</label><input style={sI} placeholder="Ej: CGMU7027881" value={dt.ct} onChange={e=>setDt({...dt,ct:e.target.value})}/></div><div><label style={sL}>Cliente *</label><input style={sI} placeholder="Nombre" value={dt.cl} onChange={e=>setDt({...dt,cl:e.target.value})}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={sL}>Fecha llegada *</label><input type="date" style={sI} value={dt.arr} onChange={e=>setDt({...dt,arr:e.target.value})}/></div><div><label style={sL}>Fecha correo *</label><input type="date" style={sI} value={dt.em} onChange={e=>setDt({...dt,em:e.target.value})}/></div></div>{days!==null&&<div style={sA(days<=7?"success":"warning")}><strong>{days} días</strong>{days<=7?" — Dentro de ventana":" — Fuera de ventana"}</div>}<div style={{borderTop:`1px solid ${C.b}`,paddingTop:16}}><div style={{fontSize:13,fontWeight:600,color:C.g,marginBottom:12}}>OPCIONALES</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>{[["etd","ETD"],["eta","ETA"],["pk","Recogida"]].map(([f,l])=><div key={f}><label style={{...sL,fontSize:11}}>{l}</label><input type="date" style={{...sI,fontSize:13,padding:"8px 10px"}} value={dt[f]} onChange={e=>setDt({...dt,[f]:e.target.value})}/></div>)}</div></div></div><div style={{marginTop:24,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.LANG)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Datos",`${dt.ct}|${dt.cl}`);setStep(STEPS.CLASS);}} style={sB(canDt)} disabled={!canDt}>Continuar →</button></div></div>)}

      {step===STEPS.CLASS&&(<div style={sC}><p style={{fontSize:14,color:C.g,marginTop:0,marginBottom:8}}>¿Qué tipo de correo recibiste?</p>{(CL_CARDS[lang]||CL_CARDS.en).map(c=><div key={c.id} onClick={()=>setCls(c.id)} style={sO(cls===c.id)}><div style={{display:"flex",alignItems:"flex-start",gap:12}}><div style={{fontSize:22,flexShrink:0}}>{c.icon}</div><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:cls===c.id?C.p:C.t}}>{c.title}</div><div style={{fontSize:13,color:C.g,marginTop:2}}>{c.desc}</div>{c.kw.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{c.kw.map((k,i)=><span key={i} style={sT(C.p,C.pL)}>{k}</span>)}</div>}{c.ex&&<div style={{marginTop:8,padding:"8px 12px",background:C.gL,borderRadius:6,fontSize:12,color:C.g,fontStyle:"italic",borderLeft:`3px solid ${C.b}`}}>{c.ex}</div>}</div></div></div>)}<div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.DATA)} style={sBS}>← Atrás</button><button onClick={nextCls} style={sB(!!cls)} disabled={!cls}>Continuar →</button></div></div>)}

      {step===STEPS.TIMING&&(<div style={sC}><div style={sT(C.w,C.p)}>COMPUERTA 1 DE 3</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Temporalidad</h3><div style={{...sA(inWin?"success":"danger"),padding:"20px",textAlign:"center"}}><div style={{fontSize:32,fontWeight:800}}>{days} días</div><div style={{marginTop:8,fontSize:15,fontWeight:700}}>{inWin?"✓ DENTRO":"✕ FUERA"} de ventana</div></div>{!inWin&&<div style={sA("warning")}><strong>Fuera de ventana.</strong> Antes de generar la respuesta, verifica si hay algún escalamiento urgente.</div>}<div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.CLASS)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Temporalidad",inWin?`Dentro (${days}d)`:`Fuera (${days}d)`);inWin?setStep(STEPS.EVIDENCE):setStep(STEPS.TIMING_URG);}} style={sB(true)}>{inWin?"Continuar →":"Verificar urgentes →"}</button></div></div>)}

      {step===STEPS.TIMING_URG&&(<div style={sC}><div style={sT(C.w,C.r)}>FUERA DE VENTANA — VERIFICAR URGENTES</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>¿Hay algún escalamiento urgente?</h3><p style={{fontSize:14,color:C.g,marginTop:0,marginBottom:20}}>Aunque el claim esté fuera de ventana, si hay algún tema urgente debe incluirse en la respuesta.</p>
        {URG_ITEMS.map(item=><div key={item.id} onClick={()=>setTUChk(p=>({...p,[item.id]:!p[item.id]}))} style={sChk(tUChk[item.id],C.r)}><div style={sBox(tUChk[item.id],C.r)}>{tUChk[item.id]?"✓":""}</div><div style={{fontSize:14,fontWeight:600,color:tUChk[item.id]?C.r:C.t}}>{item.name} / {item.es}</div></div>)}
        {hasTU&&<div style={sA("danger")}><strong>🚨 Se incluirá nota de escalamiento urgente en la respuesta MSG-04.</strong></div>}
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.TIMING)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Urgentes ventana",hasTU?tU.map(u=>u.name).join(", "):"Ninguno");setStep(STEPS.SUMMARY);}} style={sB(true)}>Generar respuesta →</button></div>
      </div>)}

      {step===STEPS.EVIDENCE&&(<div style={sC}><div style={sT(C.w,C.p)}>COMPUERTA 2 DE 3</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Evidencia</h3>
        <div style={{marginBottom:20}}><label style={{...sL,marginBottom:10}}>¿Incluye evidencia fotográfica? (obligatorio)</label><div style={{display:"flex",gap:12}}><div onClick={()=>setHasPhotos(true)} style={sYN(hasPhotos===true,true)}>✓ Sí</div><div onClick={()=>setHasPhotos(false)} style={sYN(hasPhotos===false,false)}>✕ No</div></div></div>
        <div style={{marginBottom:20}}><label style={{...sL,marginBottom:10}}>¿Incluye % de pérdida/waste?</label><div style={{display:"flex",gap:12}}><div onClick={()=>setHasLoss(true)} style={sYN(hasLoss===true,true)}>✓ Sí</div><div onClick={()=>setHasLoss(false)} style={sYN(hasLoss===false,false)}>✕ No</div></div>{hasLoss===false&&<div style={{...sA("info"),marginTop:12}}>Sin % de pérdida — se incluirá solicitud en la respuesta. El pipeline continúa.</div>}</div>
        {hasPhotos===false&&<div style={sA("danger")}><strong>Sin fotos no se puede evaluar.</strong> Se generará MSG-05 solicitando evidencia fotográfica.</div>}
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.TIMING)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Evidencia",hasPhotos===false?"Sin fotos":`Fotos: sí, Loss: ${hasLoss?"sí":"no"}`);hasPhotos===false?setStep(STEPS.SUMMARY):setStep(STEPS.CATEGORY);}} style={sB(hasPhotos!==null)} disabled={hasPhotos===null}>{hasPhotos===false?"Ver resultado →":"Continuar →"}</button></div>
      </div>)}

      {step===STEPS.CATEGORY&&(<div style={sC}><div style={sT(C.w,C.a)}>CLASIFICACIÓN DE FRUTA</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Categoría</h3><p style={{fontSize:14,color:C.g,marginTop:0}}>Compara clasificación Cartama vs. cliente. Si no aplica, puedes saltar.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}><div><label style={sL}>Cartama:</label>{CATS.map(c=><div key={c.id} onClick={()=>setCatC(c.id)} style={{...sO(catC===c.id),padding:"10px 14px",marginBottom:6}}><div style={{fontSize:14,fontWeight:600,color:catC===c.id?C.p:C.t}}>{c.label}</div><div style={{fontSize:11,color:C.g}}>{c.desc}</div></div>)}</div><div><label style={sL}>Cliente:</label>{CATS.map(c=><div key={c.id} onClick={()=>setCatCl(c.id)} style={{...sO(catCl===c.id),padding:"10px 14px",marginBottom:6}}><div style={{fontSize:14,fontWeight:600,color:catCl===c.id?C.p:C.t}}>{c.label}</div></div>)}</div></div>{catM&&<div style={sA("warning")}><strong>⚠ Discrepancia:</strong> Cartama: {CATS.find(c=>c.id===catC)?.label} → Cliente: {CATS.find(c=>c.id===catCl)?.label}</div>}<div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.EVIDENCE)} style={sBS}>← Atrás</button><div style={{display:"flex",gap:12}}><button onClick={()=>{addLog("Categoría","Saltado");setStep(STEPS.DEFECTS);}} style={{...sBS,color:C.g,borderColor:C.b}}>Saltar →</button><button onClick={()=>{addLog("Categoría",catM?`${catC}→${catCl}`:catC||"N/A");setStep(STEPS.DEFECTS);}} style={sB(true)}>Continuar →</button></div></div></div>)}

      {step===STEPS.DEFECTS&&(<div style={sC}><div style={sT(C.w,C.p)}>COMPUERTA 3 DE 3</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Defectos reclamados</h3>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"10px 14px",background:C.gL,borderRadius:8}}><input type="checkbox" checked={showPall} onChange={e=>setShowPall(e.target.checked)} style={{width:18,height:18,cursor:"pointer"}}/><label style={{fontSize:14,color:C.t,cursor:"pointer"}} onClick={()=>setShowPall(!showPall)}>Especificar pallets por defecto (opcional)</label></div>
        {renderDG(DEFS.cargo,dChk,setDChk,dVal,setDVal,true)}{renderDG(DEFS.fruit,dChk,setDChk,dVal,setDVal,true)}
        <div style={{marginBottom:20,borderTop:`2px solid ${C.r}`,paddingTop:16}}><div style={{fontSize:14,fontWeight:700,color:C.r,marginBottom:4}}>🚨 Escalamiento Urgente</div><div style={{fontSize:12,color:C.g,marginBottom:12}}>Se escala inmediatamente</div>{URG_ITEMS.map(item=><div key={item.id} onClick={()=>setUChk(p=>({...p,[item.id]:!p[item.id]}))} style={sChk(uChk[item.id],C.r)}><div style={sBox(uChk[item.id],C.r)}>{uChk[item.id]?"✓":""}</div><div style={{fontSize:14,fontWeight:600,color:uChk[item.id]?C.r:C.t}}>{item.name} / {item.es}</div></div>)}</div>
        {hasU&&<div style={sA("danger")}><strong>🚨 ESCALAMIENTO URGENTE</strong></div>}
        <div style={{marginTop:12}}><label style={sL}>Notas adicionales (opcional)</label><textarea style={{...sI,minHeight:60,resize:"vertical"}} placeholder="Ej: Some boxes collapsed, condensation observed..." value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.CATEGORY)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Defectos",`${sD.length}def+${sU.length}urg`);setStep(STEPS.SUMMARY);}} style={sB(canDef)} disabled={!canDef}>Ver resultado →</button></div>
      </div>)}

      {step===STEPS.ALERT&&(<div style={sC}><div style={sT(C.w,C.a)}>QUALITY ALERT / QC REPORT</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Detalles de la alerta</h3>
        {renderDG(DEFS.cargo,aChk,setAChk,{},()=>{},false)}{renderDG(DEFS.fruit,aChk,setAChk,{},()=>{},false)}
        <div style={{marginTop:16}}><label style={sL}>% waste esperado</label><input style={{...sI,maxWidth:200}} placeholder="Ej: 25" value={aW} onChange={e=>setAW(e.target.value)}/></div>
        {aW&&parseFloat(aW)>=20&&<div style={{marginTop:12,...sA("warning")}}><strong>Waste alto ({aW}%).</strong> Se incluirá nota.</div>}
        <div style={{marginTop:16}}><label style={{...sL,marginBottom:10}}>¿QC report adjunto?</label><div style={{display:"flex",gap:12}}><div onClick={()=>setAQC(true)} style={sYN(aQC===true,true)}>✓ Sí</div><div onClick={()=>setAQC(false)} style={sYN(aQC===false,false)}>✕ No</div></div></div>
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.CLASS)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Alerta",`${aD.length}def, waste:${aW||"N/A"}`);setStep(STEPS.SUMMARY);}} style={sB(true)}>Generar respuesta →</button></div>
      </div>)}

      {step===STEPS.FOLLOWUP&&(<div style={sC}><div style={sT(C.w,C.bl)}>FOLLOW-UP</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Estado del claim</h3>
        {FU_ST.map(f=><div key={f.id} onClick={()=>setFuSt(f.id)} style={sO(fuSt===f.id)}><div style={{fontSize:14,fontWeight:600,color:fuSt===f.id?C.p:C.t}}>{f.en}</div><div style={{fontSize:12,color:C.g}}>{f.es}</div></div>)}
        {fuSt==="wait"&&<div style={{marginTop:12}}><label style={sL}>¿Qué información está pendiente?</label><textarea style={{...sI,minHeight:80,resize:"vertical"}} placeholder="Una línea por item" value={fuM} onChange={e=>setFuM(e.target.value)}/></div>}
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.CLASS)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Follow-up",fuSt);setStep(STEPS.SUMMARY);}} style={sB(!!fuSt)} disabled={!fuSt}>Generar respuesta →</button></div>
      </div>)}

      {step===STEPS.INFO&&(<div style={sC}><div style={sT(C.w,C.g)}>SOLICITUD DE INFORMACIÓN</div><h3 style={{fontSize:18,marginTop:12,color:C.pD}}>Información solicitada</h3>
        {INFO_T.map(it=><div key={it.id} onClick={()=>setIChk(p=>({...p,[it.id]:!p[it.id]}))} style={sChk(iChk[it.id],C.p)}><div style={sBox(iChk[it.id],C.p)}>{iChk[it.id]?"✓":""}</div><div style={{fontSize:14,fontWeight:600,color:iChk[it.id]?C.p:C.t}}>{it.en} / {it.es}</div></div>)}
        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(STEPS.CLASS)} style={sBS}>← Atrás</button><button onClick={()=>{addLog("Info",`${iT.length}tipos`);setStep(STEPS.SUMMARY);}} style={sB(iT.length>0)} disabled={iT.length===0}>Generar respuesta →</button></div>
      </div>)}

      {step===STEPS.SUMMARY&&(()=>{
        const st=getSt();const mc=getMsg();const htd=cls===CLS.FC&&(sD.length>0||sU.length>0||catM);
        return(<>
          <div style={sC}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:18,marginTop:0,color:C.pD}}>Resumen</h3><div style={{display:"flex",gap:8}}>{editBtn("Datos",STEPS.DATA)}{cls===CLS.FC&&editBtn("Defectos",STEPS.DEFECTS)}{cls===CLS.FC&&editBtn("Categoría",STEPS.CATEGORY)}{cls===CLS.QA&&editBtn("Alerta",STEPS.ALERT)}{cls===CLS.FU&&editBtn("Estado",STEPS.FOLLOWUP)}{cls===CLS.IR&&editBtn("Info",STEPS.INFO)}</div></div>
            {st&&<div style={{background:st.bg,border:`2px solid ${st.color}`,borderRadius:10,padding:"16px 20px",textAlign:"center",marginTop:16,marginBottom:20}}><div style={{fontSize:12,fontWeight:700,color:st.color,textTransform:"uppercase",letterSpacing:1}}>Estado</div><div style={{fontSize:20,fontWeight:800,color:st.color,marginTop:4}}>{st.code} — {st.label}</div>{mc&&<div style={{fontSize:13,color:C.g,marginTop:6}}>Código: <strong>{mc}</strong></div>}</div>}
            <div style={{background:C.gL,borderRadius:8,padding:"14px 18px",fontSize:13,marginBottom:16}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px"}}><div><span style={{color:C.g}}>Contenedor:</span> <strong>{dt.ct}</strong></div><div><span style={{color:C.g}}>Cliente:</span> <strong>{dt.cl}</strong></div><div><span style={{color:C.g}}>Llegada:</span> <strong>{dt.arr}</strong></div><div><span style={{color:C.g}}>Correo:</span> <strong>{dt.em}</strong></div>{days!==null&&<div><span style={{color:C.g}}>Días:</span> <strong>{days}</strong></div>}<div><span style={{color:C.g}}>Tipo:</span> <strong>{cls}</strong></div></div></div>
            {log.filter(e=>e.step!=="Idioma"&&e.step!=="Datos").length>0&&<div style={{fontSize:13}}><div style={{fontWeight:700,marginBottom:8,color:C.pD}}>LOG</div>{log.filter(e=>e.step!=="Idioma"&&e.step!=="Datos").map((e,i)=><div key={i} style={{display:"flex",gap:10,padding:"4px 0",borderBottom:`1px solid ${C.b}`}}><span style={{color:C.g,minWidth:100}}>{e.step}:</span><span style={{fontWeight:600}}>{e.result}</span></div>)}</div>}
          </div>

          {mc&&(<div style={sC}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontSize:18,margin:0,color:C.pD}}>{cls===CLS.FC?"Respuesta inicial":"Respuesta al cliente"}</h3><span style={sT(lang==="en"?C.bl:"#E65100",lang==="en"?C.bL:"#FFF3E0")}>{lang==="en"?"EN":"ES"}</span></div>
            <div style={sA("warning")}><strong>⚠️ Revisa datos y [corchetes] antes de enviar.</strong></div>
            <div style={{background:C.gL,borderRadius:8,padding:"20px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${C.b}`}}>{iR()}</div>
            <button onClick={()=>hCopy("i")} style={{...sB(true),width:"100%",justifyContent:"center",marginTop:16}}>{copied.i?"✓ Copiado":"📋 Copiar respuesta"}</button>
          </div>)}

          {htd&&(<div style={sC}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontSize:18,margin:0,color:C.pD}}>Posición técnica</h3><span style={sT(C.a,C.pL)}>OPCIONAL</span></div>
            {!showTech?<button onClick={()=>setShowTech(true)} style={{...sBS,width:"100%",textAlign:"center"}}>Generar borrador técnico</button>:(
              <><div style={sA("info")}><strong>ℹ️ Revisa antes de enviar.</strong></div>
              <div style={{background:C.gL,borderRadius:8,padding:"20px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${C.b}`}}>{tR()}</div>
              <button onClick={()=>hCopy("t")} style={{...sB(true),width:"100%",justifyContent:"center",marginTop:16}}>{copied.t?"✓ Copiado":"📋 Copiar técnica"}</button></>
            )}
          </div>)}

          <div style={{display:"flex",gap:12,marginBottom:40}}><button onClick={restart} style={{...sBS,flex:1,textAlign:"center"}}>🔄 Nuevo correo</button></div>
        </>);
      })()}
    </div>
  );
}
