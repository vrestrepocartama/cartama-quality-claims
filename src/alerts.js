import {supabase} from "./supabase.js";

const EMAILJS={serviceId:"service_ltrmihl",templateId:"template_gpbn7y9",publicKey:"ojpI4Oe2uwfKyLZhB"};
const EMAILS={camila:"mzuluaga@cartama.com",yuliana:"ybetancur@cartama.com"};

function daysFrom(d){if(!d)return null;const D=typeof d==="string"?d.split("T")[0]:d;return Math.floor((new Date()-new Date(D+"T00:00:00"))/864e5);}

async function sendEmail(to,subject,message){
  try{
    if(!window.emailjs)return false;
    await window.emailjs.send(EMAILJS.serviceId,EMAILJS.templateId,{to_email:to,subject,message},EMAILJS.publicKey);
    return true;
  }catch(e){console.error("EmailJS error:",e);return false;}
}

async function logAlert(claimId,type){
  await supabase.from("alerts").insert({claim_id:claimId,alert_type:type,alert_date:new Date().toISOString().split("T")[0],sent:true,sent_at:new Date().toISOString()});
}

async function wasAlertSent(claimId,type){
  const{data}=await supabase.from("alerts").select("id").eq("claim_id",claimId).eq("alert_type",type).eq("sent",true).limit(1);
  return data&&data.length>0;
}

export async function checkAndSendAlerts(claims){
  const results={sent:[],autoChanged:[]};
  
  for(const c of claims){
    const dOpen=daysFrom(c.claim_date);
    const dWait=c.date_responded_commercial?daysFrom(c.date_responded_commercial):null;

    // ═══ CLAIM SIN RESPUESTA DE CARTAMA ═══
    if(c.status==="open"&&dOpen!==null){
      
      // 3 días - advertencia
      if(dOpen>=3&&dOpen<5){
        if(!await wasAlertSent(c.id,"no_response_3d")){
          const subj=`⚠️ Claim ${c.containers} — 3 días sin respuesta`;
          const msg=`El claim del contenedor ${c.containers} (cliente: ${c.clients?.name||"N/A"}) lleva ${dOpen} días sin respuesta.\n\nQuedan ${5-dOpen} días antes de que proceda automáticamente.\n\nPor favor revisa el caso en: https://cartama-quality-claims.vercel.app`;
          await sendEmail(EMAILS.camila,subj,msg);
          await sendEmail(EMAILS.yuliana,subj,msg);
          await logAlert(c.id,"no_response_3d");
          results.sent.push({claim:c.containers,type:"3d warning"});
        }
      }
      
      // 5+ días - urgente + auto-cambio
      if(dOpen>=5){
        if(!await wasAlertSent(c.id,"no_response_5d")){
          const subj=`🚨 URGENTE: Claim ${c.containers} — PROCEDE AUTOMÁTICAMENTE`;
          const msg=`El claim del contenedor ${c.containers} (cliente: ${c.clients?.name||"N/A"}) ha cumplido ${dOpen} días sin respuesta.\n\nPor política, este claim PROCEDE AUTOMÁTICAMENTE.\n\nEl estado ha sido actualizado en el sistema.\n\nhttps://cartama-quality-claims.vercel.app`;
          await sendEmail(EMAILS.camila,subj,msg);
          await sendEmail(EMAILS.yuliana,subj,msg);
          await logAlert(c.id,"no_response_5d");
          results.sent.push({claim:c.containers,type:"5d auto-proceed"});
        }
        // Auto-cambiar estado
        await supabase.from("claims").update({
          status:"proceeds",concept:"proceeds",
          concept_description:"Procede automáticamente — sin respuesta de Cartama en 5 días",
          date_resolution:new Date().toISOString(),
          days_to_close:dOpen,
          last_modified_by:"sistema",
        }).eq("id",c.id);
        await supabase.from("claim_history").insert({claim_id:c.id,action:"auto_proceed",old_value:"open",new_value:"proceeds",changed_by:"sistema"});
        results.autoChanged.push({claim:c.containers,type:"auto_proceed"});
      }
    }

    // ═══ ESPERANDO RESPUESTA DEL CLIENTE ═══
    if(c.status==="responded_commercial"&&!c.client_responded&&dWait!==null){
      
      // 5 días - advertencia
      if(dWait>=5&&dWait<7){
        if(!await wasAlertSent(c.id,"client_silent_5d")){
          const subj=`ℹ️ Claim ${c.containers} — Cliente sin respuesta (${dWait} días)`;
          const msg=`Cartama respondió el claim del contenedor ${c.containers} hace ${dWait} días, pero el cliente no ha respondido.\n\nSi no responde en ${7-dWait} días, puede cerrarse como No Procede.\n\nhttps://cartama-quality-claims.vercel.app`;
          await sendEmail(EMAILS.camila,subj,msg);
          await logAlert(c.id,"client_silent_5d");
          results.sent.push({claim:c.containers,type:"client 5d"});
        }
      }
      
      // 7+ días - auto-cierre
      if(dWait>=7){
        if(!await wasAlertSent(c.id,"client_silent_7d")){
          const subj=`📋 Claim ${c.containers} — No procede por silencio del cliente`;
          const msg=`El cliente del contenedor ${c.containers} no respondió en ${dWait} días después de nuestra respuesta.\n\nEl claim ha sido marcado como No Procede por falta de respuesta del cliente.\n\nhttps://cartama-quality-claims.vercel.app`;
          await sendEmail(EMAILS.camila,subj,msg);
          await sendEmail(EMAILS.yuliana,subj,msg);
          await logAlert(c.id,"client_silent_7d");
          results.sent.push({claim:c.containers,type:"client 7d auto-close"});
        }
        // Auto-cambiar estado
        await supabase.from("claims").update({
          status:"not_proceeds",concept:"not_proceeds",
          concept_description:"No procede — cliente no respondió en 7 días",
          client_responded:false,
          date_resolution:new Date().toISOString(),
          days_to_close:daysFrom(c.claim_date),
          last_modified_by:"sistema",
        }).eq("id",c.id);
        await supabase.from("claim_history").insert({claim_id:c.id,action:"auto_not_proceeds",old_value:"responded_commercial",new_value:"not_proceeds",changed_by:"sistema"});
        results.autoChanged.push({claim:c.containers,type:"auto_not_proceeds"});
      }
    }
  }
  return results;
}

export async function getAlertHistory(claimId){
  const{data}=await supabase.from("alerts").select("*").eq("claim_id",claimId).order("created_at",{ascending:false});
  return data||[];
}

export async function getClaimHistory(claimId){
  const{data}=await supabase.from("claim_history").select("*").eq("claim_id",claimId).order("created_at",{ascending:false});
  return data||[];
}
