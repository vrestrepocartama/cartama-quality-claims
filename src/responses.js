import {CATS} from "./constants.js";
import {fmtDate} from "./styles.js";

// ═══════════════════════════════════════════
// RESPUESTA INICIAL (Yuliana / Comercial)
// ═══════════════════════════════════════════
export function buildInitialResponse(code,L,d){
  const g=L==="en"?`Dear ${d.contact||d.client},`:`Estimado/a ${d.contact||d.client},`;
  const s=L==="en"?`Best regards,\n[Name]\nQuality Department — Cartama`:`Cordialmente,\n[Nombre]\nDepartamento de Calidad — Cartama`;
  const arrF=fmtDate(d.arrival,L);
  const emF=fmtDate(d.emailDate,L);
  const cr=L==="en"?`container ${d.containers}${arrF?`, which arrived on ${arrF}`:""}`:`contenedor ${d.containers}${arrF?`, el cual llegó el ${arrF}`:""}`;
  const defNames=(d.defects||[]).map(x=>L==="en"?x.name:x.es);
  const urgT=(d.timingUrgent||[]).map(u=>L==="en"?u.name.toLowerCase():u.es.toLowerCase()).join(", ");

  if(L==="en"){
    const dl=defNames.length>0?`, noting issues related to ${defNames.join(", ")}`:"";
    const noLoss=d.noLossPct?" Should you have an estimated loss/waste percentage, please share it to support the review.":"";
    const T={
      "MSG-01":`${g}\n\nThank you for reaching out regarding ${cr}. We have received your claim along with the supporting documentation${dl}.${d.pallets?`\n\n${d.pallets}`:""}\n\nThe traceability for this container has been initiated, and our Quality team will review the case thoroughly. We will get back to you with our findings within [X] business days.${noLoss}\n\nIf there is any additional information you would like to share in the meantime, please feel free to send it our way.\n\n${s}`,
      "MSG-02":`${g}\n\nThank you for your communication regarding ${cr}${d.days!==null?` (received ${d.days} days after arrival)`:""}.${dl?` We acknowledge the reported findings${dl}.`:""}${d.pallets?`\n\n${d.pallets}`:""}\n\nWe have reviewed the initial information and identified aspects that require a more detailed assessment, including verification of transit conditions, quality parameters, and post-arrival evolution. The traceability process is underway.\n\nOur team will provide you with a comprehensive response within [X] business days.${noLoss} We appreciate your patience and collaboration.\n\n${s}`,
      "MSG-03":`${g}\n\nThank you for bringing this to our attention regarding ${cr}.${dl?` We have noted the reported concerns${dl}.`:""}${d.pallets?`\n\n${d.pallets}`:""}\n\nGiven the nature of the issues identified, this case has been escalated for priority review. Our Quality team has been notified and will be in touch with you shortly to coordinate next steps.${noLoss}\n\n${s}`,
      "MSG-04":`${g}\n\nThank you for your communication regarding ${cr}. Your message was received on ${emF||"[date]"}${d.days!==null?`, which is ${d.days} days after the container arrival`:""}, placing it outside our standard claim window of 7 days.${urgT?`\n\nThat said, we have noted concerns regarding ${urgT}, which have been flagged for priority attention regardless of the claim window.`:""}\n\nWe have forwarded the case to our Quality team for their consideration. We will follow up with you within [X] business days.\n\n${s}`,
      "MSG-05":`${g}\n\nThank you for reaching out regarding ${cr}.\n\nTo move forward with the evaluation, we would need the following:\n\n• Photographic evidence of the defects or damage observed\n\nOnce we have this, we will be able to proceed with the review. We appreciate your collaboration.\n\n${s}`,
      "MSG-06":`${g}\n\nThank you for sharing the quality findings for ${cr}.${d.alertDefects?.length>0?` We have noted the observations regarding ${d.alertDefects.join(", ")}.`:""}${d.alertWaste?` The expected waste of ${d.alertWaste}% has been registered on our end.`:""}${d.alertQC?" We also confirm receipt of the QC report attached.":""}\n\nOur team will review this information internally and monitor the situation.${d.alertWaste&&parseFloat(d.alertWaste)>=20?" Given the level of waste anticipated, we have flagged this case for closer follow-up by our Quality team.":""}\n\nPlease do not hesitate to share any further updates as they become available.\n\n${s}`,
      "MSG-07":d.fuState==="wait"?`${g}\n\nThank you for following up on your claim regarding ${cr}.\n\nThe case is currently on hold as we are still awaiting additional information to proceed with the evaluation. Specifically, we would need:\n\n${(d.fuMissing||["[Specify pending information]"]).map(i=>`• ${i}`).join("\n")}\n\nOnce we receive this, we will be able to continue with the review. We appreciate your collaboration.\n\n${s}`
        :d.fuState==="nego"?`${g}\n\nThank you for following up regarding ${cr}.\n\nAs discussed, this case is currently in the negotiation phase. Our team is working towards a resolution and will provide you with an update within [X] business days.\n\nWe value the ongoing dialogue and remain committed to reaching a fair outcome for both parties.\n\n${s}`
        :d.fuState==="done"?`${g}\n\nThank you for your message regarding ${cr}.\n\nThis case has been resolved as per our previous communication. If you have any remaining questions or need further clarification on the resolution, please do not hesitate to let us know.\n\n${s}`
        :`${g}\n\nThank you for following up on your claim regarding ${cr}.\n\nThe case is currently under review by our Quality team. We are conducting the traceability analysis and expect to have a detailed response for you within [X] business days.\n\nWe appreciate your patience.\n\n${s}`,
      "MSG-08":`${g}\n\nThank you for your request regarding ${cr}.\n\n${d.infoTypes?.length>0?`We have noted your request for the following:\n\n${d.infoTypes.map(t=>`• ${t}`).join("\n")}\n\nOur team will gather this information and respond within [X] business days.`:"Our team will gather the requested information and respond within [X] business days."}\n\nIf there is anything else you need, please let us know.\n\n${s}`,
      "MSG-09":`${g}\n\nThank you for reaching out regarding ${cr}. We have carefully reviewed the reported findings${dl}.\n\nAfter a thorough evaluation, we would like to inform you that the levels reported fall within Cartama's acceptable quality parameters, based on our Hass Avocado Grading standards. As such, this claim does not meet the criteria to proceed on our end.\n\nWe remain at your disposal for any further questions. Your feedback is always valuable to us, and we are committed to maintaining the highest quality standards in every shipment.\n\n${s}`,
    };
    return T[code]||"";
  } else {
    const dl=defNames.length>0?`, reportando temas relacionados con ${defNames.join(", ")}`:"";
    const noLoss=d.noLossPct?" Si cuenta con un porcentaje estimado de pérdida, le agradeceríamos compartirlo para apoyar la revisión.":"";
    const T={
      "MSG-01":`${g}\n\nGracias por comunicarse respecto al ${cr}. Hemos recibido su reclamo junto con la documentación de soporte${dl}.${d.pallets?`\n\n${d.pallets}`:""}\n\nLa trazabilidad de este contenedor ha sido iniciada y nuestro equipo de Calidad revisará el caso de manera detallada. Le responderemos con nuestros hallazgos dentro de [X] días hábiles.${noLoss}\n\nSi tiene información adicional que desee compartir, no dude en enviárnosla.\n\n${s}`,
      "MSG-02":`${g}\n\nGracias por su comunicación respecto al ${cr}${d.days!==null?` (recibida ${d.days} días después del arribo)`:""}.${dl?` Acusamos recibo de los hallazgos reportados${dl}.`:""}${d.pallets?`\n\n${d.pallets}`:""}\n\nHemos revisado la información inicial e identificado aspectos que requieren una evaluación más detallada, incluyendo verificación de condiciones de tránsito, parámetros de calidad y evolución post-arribo. El proceso de trazabilidad está en curso.\n\nNuestro equipo le proporcionará una respuesta completa dentro de [X] días hábiles.${noLoss} Agradecemos su paciencia y colaboración.\n\n${s}`,
      "MSG-03":`${g}\n\nGracias por informarnos sobre la situación del ${cr}.${dl?` Hemos tomado nota de las preocupaciones reportadas${dl}.`:""}${d.pallets?`\n\n${d.pallets}`:""}\n\nDada la naturaleza de los temas identificados, este caso ha sido escalado para revisión prioritaria. Nuestro equipo de Calidad ha sido notificado y se comunicará con usted a la brevedad para coordinar los siguientes pasos.${noLoss}\n\n${s}`,
      "MSG-04":`${g}\n\nGracias por su comunicación respecto al ${cr}. Su mensaje fue recibido el ${emF||"[fecha]"}${d.days!==null?`, lo cual representa ${d.days} días después del arribo del contenedor`:""}, ubicándose fuera de nuestra ventana estándar de reclamos de 7 días.${urgT?`\n\nDicho esto, hemos identificado preocupaciones respecto a ${urgT}, las cuales han sido marcadas para atención prioritaria independientemente de la ventana de reclamo.`:""}\n\nHemos remitido el caso a nuestro equipo de Calidad para su consideración. Le daremos seguimiento dentro de [X] días hábiles.\n\n${s}`,
      "MSG-05":`${g}\n\nGracias por comunicarse respecto al ${cr}.\n\nPara poder avanzar con la evaluación, necesitaríamos lo siguiente:\n\n• Evidencia fotográfica de los defectos o daños observados\n\nUna vez que contemos con esto, podremos proceder con la revisión. Agradecemos su colaboración.\n\n${s}`,
      "MSG-06":`${g}\n\nGracias por compartir los hallazgos de calidad del ${cr}.${d.alertDefects?.length>0?` Hemos tomado nota de las observaciones respecto a ${d.alertDefects.join(", ")}.`:""}${d.alertWaste?` El waste esperado del ${d.alertWaste}% ha sido registrado de nuestro lado.`:""}${d.alertQC?" Confirmamos también la recepción del QC report adjunto.":""}\n\nNuestro equipo revisará esta información internamente y monitoreará la situación.${d.alertWaste&&parseFloat(d.alertWaste)>=20?" Dado el nivel de waste anticipado, hemos marcado este caso para seguimiento cercano por parte de nuestro equipo de Calidad.":""}\n\nNo dude en compartir cualquier actualización adicional a medida que esté disponible.\n\n${s}`,
      "MSG-07":d.fuState==="wait"?`${g}\n\nGracias por dar seguimiento a su reclamo respecto al ${cr}.\n\nEl caso se encuentra en espera ya que aún necesitamos información adicional para proceder con la evaluación. Específicamente:\n\n${(d.fuMissing||["[Especificar información pendiente]"]).map(i=>`• ${i}`).join("\n")}\n\nUna vez recibida, podremos continuar con la revisión. Agradecemos su colaboración.\n\n${s}`
        :d.fuState==="nego"?`${g}\n\nGracias por su seguimiento respecto al ${cr}.\n\nComo fue conversado, este caso se encuentra en fase de negociación. Nuestro equipo está trabajando hacia una resolución y le proporcionará una actualización dentro de [X] días hábiles.\n\nValoramos el diálogo continuo y mantenemos nuestro compromiso de alcanzar un resultado justo para ambas partes.\n\n${s}`
        :d.fuState==="done"?`${g}\n\nGracias por su mensaje respecto al ${cr}.\n\nEste caso fue resuelto según nuestra comunicación previa. Si tiene preguntas pendientes o necesita aclaraciones adicionales sobre la resolución, no dude en informarnos.\n\n${s}`
        :`${g}\n\nGracias por dar seguimiento a su reclamo respecto al ${cr}.\n\nEl caso se encuentra actualmente en revisión por nuestro equipo de Calidad. Estamos realizando el análisis de trazabilidad y esperamos tener una respuesta detallada dentro de [X] días hábiles.\n\nAgradecemos su paciencia.\n\n${s}`,
      "MSG-08":`${g}\n\nGracias por su solicitud respecto al ${cr}.\n\n${d.infoTypes?.length>0?`Hemos tomado nota de su solicitud de:\n\n${d.infoTypes.map(t=>`• ${t}`).join("\n")}\n\nNuestro equipo recopilará esta información y le responderá dentro de [X] días hábiles.`:"Nuestro equipo recopilará la información solicitada y responderá dentro de [X] días hábiles."}\n\nSi necesita algo más, no dude en informarnos.\n\n${s}`,
      "MSG-09":`${g}\n\nGracias por comunicarse respecto al ${cr}. Hemos revisado detenidamente los hallazgos reportados${dl}.\n\nDespués de una evaluación cuidadosa, queremos informarle que los niveles reportados se encuentran dentro de los parámetros aceptables de calidad de Cartama, con base en nuestros estándares Hass Avocado Grading. Por lo tanto, este reclamo no cumple los criterios para proceder de nuestro lado.\n\nQuedamos a su disposición para cualquier consulta adicional. Su retroalimentación siempre es valiosa para nosotros, y mantenemos nuestro compromiso con los más altos estándares de calidad en cada despacho.\n\n${s}`,
    };
    return T[code]||"";
  }
}

// ═══════════════════════════════════════════
// RESPUESTA TÉCNICA (Camila / Calidad)
// ═══════════════════════════════════════════
export function buildTechnicalResponse(L,d){
  const g=L==="en"?`Dear ${d.contact||d.client},`:`Estimado/a ${d.contact||d.client},`;
  const s=L==="en"?`Best regards,\n[Name]\nQuality Department — Cartama`:`Cordialmente,\n[Nombre]\nDepartamento de Calidad — Cartama`;
  const arrF=fmtDate(d.arrival,L);

  const ok=[],near=[],rev=[],urg=[];
  (d.defects||[]).forEach(def=>{
    const v=d.values[def.id];const e=d.evals[def.id];
    const nm=L==="en"?def.name:def.es;
    const ul=def.unit==="cargo"?(L==="en"?"of the cargo":"de la carga"):(L==="en"?"of the fruit area":"del área de la fruta");
    const plt=d.pallets?.[def.id]?(L==="en"?`, affecting ${d.pallets[def.id]} pallets`:`, afectando ${d.pallets[def.id]} pallets`):"";
    const entry={nm,v,ul,plt,e,def};
    if(e==="ok")ok.push(entry);else if(e==="near")near.push(entry);else if(e==="urgent")urg.push(entry);else rev.push(entry);
  });
  (d.urgentItems||[]).forEach(u=>urg.push({nm:L==="en"?u.name:u.es,isFlag:true}));

  const allOk=rev.length===0&&urg.length===0&&!d.catMismatch;
  const allWithin=ok.length>0&&near.length===0&&allOk;
  const f=e=>`${e.nm.toLowerCase()}${e.v?` (${e.v}% ${e.ul})`:""}`;
  const fp=e=>`${f(e)}${e.plt}`;

  if(L==="en"){
    let b=`${g}\n\nThank you for your communication regarding container ${d.containers}${arrF?`, which arrived on ${arrF}`:""}. We have conducted the traceability and reviewed the quality findings reported.`;

    if(allWithin){
      b+=ok.length===1
        ?`\n\nIn what concerns ${fp(ok[0])}, this remains within our acceptable range for packing and does not pose a risk to the commercial viability of the fruit. The fruit meets the quality standards of our Hass Avocado Grading and is suitable for commercialization.`
        :`\n\nIn what concerns the reported findings — ${ok.map(fp).join(", ")} — all remain within our acceptable quality parameters. The fruit meets the standards of our Hass Avocado Grading and is suitable for commercialization.`;
      b+=`\n\nTherefore, the claims are not applicable.`;
    }
    else if(rev.length===0&&urg.length===0&&!d.catMismatch){
      if(ok.length>0)b+=`\n\nIn what concerns ${ok.map(fp).join(" and ")}, ${ok.length===1?"this remains":"these remain"} within our acceptable quality parameters and ${ok.length===1?"does":"do"} not compromise the commercial quality of the fruit.`;
      if(near.length>0)b+=`\n\n${ok.length>0?"That said, we":"We"} have noted that ${near.map(fp).join(" and ")} ${near.length===1?"is":"are"} within the acceptable range but approaching the established threshold. While this does not represent a deviation from our quality standards, we are open to reviewing this further as part of a collaborative assessment.`;
      b+=`\n\nWe remain available to discuss these findings in more detail should you wish to do so.`;
    }
    else{
      if(ok.length>0)b+=`\n\nIn what concerns ${ok.map(e=>e.nm.toLowerCase()).join(" and ")}, ${ok.length===1?"this remains":"these remain"} within our acceptable quality parameters.`;
      if(near.length>0)b+=`\n\n${ok.length>0?"Additionally, we":"We"} have noted that ${near.map(f).join(" and ")} ${near.length===1?"is":"are"} within range but approaching the threshold, and we are open to reviewing ${near.length===1?"this point":"these points"} further.`;
      if(rev.length>0){
        b+=`\n\n${(ok.length>0||near.length>0)?"However, we":"We"} have identified ${rev.map(fp).join(" and ")}, which ${rev.length===1?"requires":"require"} a more detailed analysis by our team.`;
        if(rev.some(r=>r.def?.id==="cold"||r.def?.id==="pulp"))b+=` This includes a review of transit temperatures, controlled atmosphere parameters, and post-arrival storage and handling conditions, as these factors can significantly influence fruit quality and shelf life.`;
      }
      if(urg.length>0)b+=`\n\n${rev.length>0?"Additionally, ":"We also want to address that "}${urg.map(u=>u.nm.toLowerCase()).join(" and ")} ${urg.length===1?"has":"have"} been reported, and ${urg.length===1?"this has":"these have"} been flagged for priority attention. Our Quality department is handling this with urgency.`;
      if(d.catMismatch)b+=`\n\nWe would also like to note that this container was packed and dispatched as ${CATS.find(c=>c.id===d.catCartama)?.label||""} in accordance with our Hass Avocado Grading standards. We have noted that it was classified as ${CATS.find(c=>c.id===d.catClient)?.label||""} on your end, and this will be considered as part of the review.`;
      if(d.notes)b+=`\n\nWe have also taken note of the reported ${d.notes.toLowerCase().replace(/\.$/,"")}, which will be considered within the overall review.`;
      b+=`\n\nWe will provide you with a detailed response once the full analysis is complete.`;
      if(d.noLossPct)b+=` If an estimated loss/waste percentage is available, it would support the review process.`;
      b+=` Should you have any additional documentation, please feel free to share it with us.`;
    }
    return b+`\n\n${s}`;
  }
  else{
    let b=`${g}\n\nGracias por su comunicación respecto al contenedor ${d.containers}${arrF?`, el cual llegó el ${arrF}`:""}. Hemos realizado la trazabilidad y revisado los hallazgos de calidad reportados.`;

    if(allWithin){
      b+=ok.length===1
        ?`\n\nEn lo que respecta a ${fp(ok[0])}, este se encuentra dentro de nuestro rango aceptable de empaque y no representa un riesgo para la viabilidad comercial de la fruta. La fruta cumple con los estándares de calidad de nuestro Hass Avocado Grading y es apta para comercialización.`
        :`\n\nEn lo que respecta a los hallazgos reportados — ${ok.map(fp).join(", ")} — todos se encuentran dentro de nuestros parámetros de calidad aceptables. La fruta cumple con los estándares de nuestro Hass Avocado Grading y es apta para comercialización.`;
      b+=`\n\nPor lo tanto, los reclamos no son aplicables.`;
    }
    else if(rev.length===0&&urg.length===0&&!d.catMismatch){
      if(ok.length>0)b+=`\n\nEn lo que respecta a ${ok.map(fp).join(" y ")}, se ${ok.length===1?"encuentra":"encuentran"} dentro de nuestros parámetros de calidad aceptables y no ${ok.length===1?"compromete":"comprometen"} la calidad comercial de la fruta.`;
      if(near.length>0)b+=`\n\n${ok.length>0?"No obstante, hemos":"Hemos"} identificado que ${near.map(fp).join(" y ")} se ${near.length===1?"encuentra":"encuentran"} dentro del rango aceptable pero próximo al umbral establecido. Si bien esto no representa una desviación de nuestros estándares de calidad, estamos abiertos a revisarlo de manera colaborativa.`;
      b+=`\n\nQuedamos a su disposición para discutir estos hallazgos en mayor detalle.`;
    }
    else{
      if(ok.length>0)b+=`\n\nEn lo que respecta a ${ok.map(e=>e.nm.toLowerCase()).join(" y ")}, se ${ok.length===1?"mantiene":"mantienen"} dentro de nuestros parámetros de calidad aceptables.`;
      if(near.length>0)b+=`\n\n${ok.length>0?"Asimismo, hemos":"Hemos"} identificado que ${near.map(f).join(" y ")} se ${near.length===1?"encuentra":"encuentran"} dentro del rango pero próximo al umbral, y estamos abiertos a revisar ${near.length===1?"este punto":"estos puntos"}.`;
      if(rev.length>0){
        b+=`\n\n${(ok.length>0||near.length>0)?"Sin embargo, hemos":"Hemos"} identificado ${rev.map(fp).join(" y ")}, lo cual requiere un análisis más detallado por parte de nuestro equipo.`;
        if(rev.some(r=>r.def?.id==="cold"||r.def?.id==="pulp"))b+=` Esto incluye la revisión de temperaturas de tránsito, parámetros de atmósfera controlada y condiciones de almacenamiento y manejo post-arribo, ya que estos factores pueden influir significativamente en la calidad de la fruta y su vida útil.`;
      }
      if(urg.length>0)b+=`\n\n${rev.length>0?"Asimismo, se":"También queremos abordar que se"} ha reportado ${urg.map(u=>u.nm.toLowerCase()).join(" y ")}, situación que ha sido marcada para atención prioritaria y que nuestro departamento de Calidad está atendiendo con urgencia.`;
      if(d.catMismatch)b+=`\n\nCabe señalar que este contenedor fue empacado y despachado como ${CATS.find(c=>c.id===d.catCartama)?.label||""} de acuerdo con nuestros estándares de Hass Avocado Grading. Hemos notado que fue clasificado como ${CATS.find(c=>c.id===d.catClient)?.label||""} de su lado, lo cual será considerado como parte de la revisión.`;
      if(d.notes)b+=`\n\nTambién hemos tomado nota del reporte de ${d.notes.toLowerCase().replace(/\.$/,"")}, lo cual será considerado dentro de la revisión.`;
      b+=`\n\nLe proporcionaremos una respuesta detallada una vez completado el análisis.`;
      if(d.noLossPct)b+=` Si cuenta con un porcentaje estimado de pérdida o documentación adicional, le agradeceríamos compartirlo para apoyar la revisión.`;
      else b+=` Si tiene documentación adicional, no dude en compartirla con nosotros.`;
    }
    return b+`\n\n${s}`;
  }
}
