import {supabase} from "./supabase.js";

/* ── Buscar info de UN contenedor ── */
export async function lookupContainer(num){
  const clean=num.trim().toUpperCase();
  if(!clean)return null;
  const{data,error}=await supabase.from("container_summary").select("*").eq("container",clean).maybeSingle();
  if(error){console.error("lookupContainer",error);return null;}
  return data;
}

/* ── Detalle: todas las filas de un contenedor ── */
export async function getContainerDetails(num){
  const clean=num.trim().toUpperCase();
  if(!clean)return[];
  const{data,error}=await supabase.from("shipments").select("*").eq("container",clean);
  if(error){console.error("getContainerDetails",error);return[];}
  return data||[];
}

/* ── Buscar MÚLTIPLES contenedores (string separado por coma) ── */
export async function lookupContainers(str){
  if(!str||!str.trim())return[];
  const nums=[...new Set(str.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean))];
  const results=[];
  for(const n of nums){
    const summary=await lookupContainer(n);
    const details=await getContainerDetails(n);
    results.push({container:n,summary,details});
  }
  return results;
}

/* ── Importar CSV de despachos con deduplicación ── */
export async function importShipmentsCSV(csvText){
  const lines=csvText.split("\n").map(l=>l.trim()).filter(Boolean);
  if(lines.length<2)return{imported:0,skipped:0,errors:["CSV vacío o sin filas de datos"]};

  // Parse header — normalize
  const rawHeader=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^\w]/g,""));
  
  // Map common header names to DB columns
  const MAP={
    container:"container",contenedor:"container",
    grower_name:"grower_name",predio:"grower_name",finca:"grower_name",
    dry_matter:"dry_matter",materia_seca:"dry_matter",ms:"dry_matter",
    boxes:"boxes",cajas:"boxes",
    pallets:"pallets",
    certification:"certification",certificacion:"certification",
    packaging:"packaging",empaque:"packaging",
    week:"week",semana:"week",week_e:"week",
    variety:"variety",variedad:"variety",
    caliber:"caliber",calibre:"caliber",
    program:"program",programa:"program",
    booking:"booking",reserva:"booking",
    shipping_line:"shipping_line",naviera:"shipping_line",
    port_of_arrival:"port_of_arrival",puerto_destino:"port_of_arrival",
    packing_list:"packing_list",
    size:"size",tamano:"size",
    kg:"kg",peso:"kg",
    tip:"tip",tipo:"tip",
    week_b:"week_b",
    pl:"pl",
    client:"client",cliente:"client",
  };
  const header=rawHeader.map(h=>MAP[h]||h);

  const rows=[];
  const errors=[];
  for(let i=1;i<lines.length;i++){
    const vals=lines[i].split(",").map(v=>v.trim());
    if(vals.length<header.length){errors.push(`Fila ${i+1}: columnas insuficientes`);continue;}
    const row={};
    header.forEach((col,j)=>{
      let v=vals[j];
      if(col==="dry_matter"||col==="boxes"||col==="pallets"||col==="kg"){v=parseFloat(v)||null;}
      if(col==="week"){v=parseInt(v)||null;}
      if(col==="container"&&v)v=v.toUpperCase();
      row[col]=v||null;
    });
    if(!row.container){errors.push(`Fila ${i+1}: sin contenedor`);continue;}
    rows.push(row);
  }

  if(rows.length===0)return{imported:0,skipped:0,errors:errors.length?errors:["No se encontraron filas válidas"]};

  // Dedup: check existing by container+grower_name combo
  const containers=[...new Set(rows.map(r=>r.container))];
  const{data:existing}=await supabase.from("shipments").select("container,grower_name").in("container",containers);
  const existSet=new Set((existing||[]).map(e=>`${e.container}||${e.grower_name}`));

  const toInsert=rows.filter(r=>!existSet.has(`${r.container}||${r.grower_name}`));
  const skipped=rows.length-toInsert.length;

  if(toInsert.length===0)return{imported:0,skipped,errors};

  const{error}=await supabase.from("shipments").insert(toInsert);
  if(error){errors.push(error.message);return{imported:0,skipped,errors};}

  return{imported:toInsert.length,skipped,errors};
}
