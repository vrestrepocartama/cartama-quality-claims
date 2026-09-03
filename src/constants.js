export const CLS={FC:"fc",QA:"qa",FU:"fu",IR:"ir"};
export const CLS_LABEL={fc:"Formal Claim",qa:"Quality Alert / QC Report",fu:"Claim Follow-up",ir:"Information Request"};
export const CLS_SHORT={fc:"Formal Claim",qa:"Quality Alert",fu:"Follow-up",ir:"Info Request"};

export const ROLES={commercial:"Comercial",quality:"Calidad",admin:"Administrador"};

export const STATUS={
  open:{c:"#E76F51",bg:"#FFF3CD",l:"Abierto",order:1},
  responded_commercial:{c:"#1565C0",bg:"#E8F4FD",l:"Respondido Comercial",order:2},
  review_quality:{c:"#7B1FA2",bg:"#F3E5F5",l:"En Revisión Calidad",order:3},
  proceeds:{c:"#2D6A4F",bg:"#D8F3DC",l:"Procede",order:4},
  negotiable:{c:"#E65100",bg:"#FFF3CD",l:"Negociable",order:4},
  not_proceeds:{c:"#CC0000",bg:"#F8D7DA",l:"No Procede",order:4},
  closed:{c:"#424242",bg:"#E0E0E0",l:"Cerrado",order:5},
};

export const CONCEPTS={
  proceeds:{c:"#2D6A4F",bg:"#D8F3DC",l:"Procede"},
  negotiable:{c:"#E65100",bg:"#FFF3CD",l:"Negociable"},
  not_proceeds:{c:"#CC0000",bg:"#F8D7DA",l:"No Procede"},
};

export const DEFECT_CATEGORIES={
  cosmetic:"Defecto Cosmético",
  pulp_damage:"Daño por Pulpa",
  ripe_turning:"Virado / Madura",
  food_safety:"Inocuidad",
  no_peduncle:"Fruta sin Pedúnculo",
  packaging:"Empaque",
  cold_chain:"Cadena de Frío",
  other:"Otro",
};

export const DEFS={
  cargo:{title:"Defectos por % DE CARGA",sub:"Porcentaje del total de pallets/cajas afectadas",items:[
    {id:"browning",name:"Vascular Browning",es:"Pardeamiento Vascular",th:3,unit:"cargo",hasTh:true,ev:v=>v<2?"ok":v<3?"near":"fail",cat:"pulp_damage",db:"browning"},
    {id:"lenticel",name:"Lenticel Damage",es:"Daño por Lenticela",th:25,unit:"cargo",hasTh:true,ev:v=>v<20?"ok":v<25?"near":"urgent",cat:"cosmetic",db:"lenticel"},
    {id:"cold",name:"Cold Damage",es:"Daño por Frío",unit:"cargo",hasTh:false,ev:()=>"qr",cat:"cold_chain",db:"cold_damage"},
  ]},
  fruit:{title:"Defectos por % DE FRUTA",sub:"Porcentaje del área de cada fruta afectada",items:[
    {id:"anthra",name:"Anthracnose",es:"Antracnosis",unit:"fruit",hasTh:true,ev:v=>v<=25?"ok":v<=30?"near":v<=40?"verify":"urgent",cat:"pulp_damage",db:"anthracnose"},
    {id:"brown_sc",name:"Brown Scars",es:"Cicatrices Color Café",unit:"fruit",hasTh:true,ev:v=>v<=5?"ok":v<=10?"near":v<=40?"fail":"urgent",note:"Cat I: 5-10% | Cat II: 40%",cat:"cosmetic",db:"brown_scars"},
    {id:"thrips",name:"Thrips Damage",es:"Daño por Thrips",unit:"fruit",hasTh:true,ev:v=>v<=5?"ok":v<=15?"near":"fail",note:"Cat I: 5-15% Europa",cat:"cosmetic",db:"thrips"},
    {id:"sunburn",name:"Sunburn Damage",es:"Daño por Sol",unit:"fruit",hasTh:false,ev:()=>"qr",cat:"cosmetic",db:"sunburn"},
    {id:"pulp",name:"Pulp Damage",es:"Daño de Pulpa",unit:"fruit",hasTh:false,ev:()=>"qr",cat:"pulp_damage",db:"pulp_damage"},
    {id:"peduncle",name:"Peduncle Rot",es:"Pudrición Peduncular",unit:"fruit",hasTh:false,ev:()=>"qr",cat:"pulp_damage",db:"peduncle"},
  ]}
};

export const URG=[
  {id:"fungi",name:"Fungi / Sooty Mold",es:"Hongos / Fumagina",cat:"food_safety"},
  {id:"monalonion",name:"Monalonion / Sucking Bugs",es:"Monalonion",cat:"food_safety"},
  {id:"ripe",name:"Fruit arrived ripe/soft",es:"Fruta llegó madura/blanda",cat:"ripe_turning"},
  {id:"atmo",name:"Controlled atmosphere issue",es:"Problema atmósfera controlada",cat:"cold_chain"},
  {id:"scale",name:"Scale (quarantine pest)",es:"Escamas (plaga cuarentenaria)",cat:"food_safety"},
  {id:"borer",name:"Fruit Borer (quarantine)",es:"Barrenadores (cuarentenaria)",cat:"food_safety"},
  {id:"no_peduncle",name:"Stem-less fruit",es:"Fruta sin pedúnculo",cat:"no_peduncle"},
  {id:"packaging",name:"Packaging damage",es:"Daños en empaque",cat:"packaging"},
];

export const CATS=[{id:"c1",label:"Category I"},{id:"c2",label:"Category II"}];

export const EV_L={
  ok:{t:"✓ Dentro de parámetros",c:"#2D6A4F",b:"#D8F3DC"},
  near:{t:"⚠ Cercano — negociable",c:"#E65100",b:"#FFF3CD"},
  fail:{t:"✕ Fuera de parámetros",c:"#E76F51",b:"#FFF3CD"},
  verify:{t:"⚠ Zona de verificación",c:"#E65100",b:"#FFF3CD"},
  urgent:{t:"🚨 Escalamiento urgente",c:"#CC0000",b:"#F8D7DA"},
  qr:{t:"📋 Quality verificará",c:"#6C757D",b:"#F8F9FA"},
};

export const FU_ST=[
  {id:"review",en:"Under review by Quality",es:"En revisión por Calidad"},
  {id:"wait",en:"Waiting for client info",es:"Esperando info del cliente"},
  {id:"nego",en:"In negotiation",es:"En negociación"},
  {id:"done",en:"Resolved",es:"Resuelto"},
];

export const INFO_T=[
  {id:"trace",en:"Traceability details",es:"Trazabilidad"},
  {id:"cert",en:"Quality certificates",es:"Certificados de calidad"},
  {id:"specs",en:"Product specifications",es:"Especificaciones"},
  {id:"container",en:"Container / transit data",es:"Datos de contenedor / tránsito"},
  {id:"atmo",en:"Atmosphere parameters",es:"Parámetros de atmósfera"},
  {id:"grower",en:"Grower / productive unit",es:"Predio / unidad productiva"},
  {id:"other",en:"Other",es:"Otro"},
];

export const CL_CARDS={
  en:[
    {id:CLS.FC,title:"Formal Claim",icon:"⚠️",desc:"El cliente reclama formalmente",kw:['"claim"','"claimed"','"credit note"','"compensation"','"reject"','"not acceptable"','"below the standard"','"waste of X%"'],ex:'"We got it CLAIMED since the quality is below the standard agreed..."'},
    {id:CLS.QA,title:"Quality Alert / QC Report",icon:"📋",desc:"Información de calidad sin reclamo",kw:['"QC report"','"we expect"','"high waste expected"','"for your information"','"attached report"'],ex:'"Please find attached the QC report... We expect high waste..."'},
    {id:CLS.FU,title:"Claim Follow-up",icon:"🔄",desc:"Seguimiento de reclamo anterior",kw:['"following up"','"update on"','"status of our claim"','"any news"'],ex:'"We are following up on our previous claim..."'},
    {id:CLS.IR,title:"Information Request",icon:"📨",desc:"Piden información sin reclamar",kw:['"traceability"','"certificate"','"could you provide"'],ex:'"Could you provide the traceability details..."'},
  ],
  es:[
    {id:CLS.FC,title:"Reclamo Formal",icon:"⚠️",desc:"El cliente reclama formalmente",kw:['"reclamo"','"nota de crédito"','"compensación"','"rechazado"','"no aceptable"','"pérdidas"','"merma"'],ex:'"Hemos RECLAMADO ya que la calidad está por debajo del estándar..."'},
    {id:CLS.QA,title:"Alerta de Calidad / QC Report",icon:"📋",desc:"Información de calidad sin reclamo",kw:['"reporte de calidad"','"esperamos"','"waste esperado"','"para su información"'],ex:'"Adjunto el reporte... Esperamos alto waste..."'},
    {id:CLS.FU,title:"Seguimiento de Claim",icon:"🔄",desc:"Seguimiento de reclamo anterior",kw:['"seguimiento"','"actualización"','"estado del reclamo"'],ex:'"Dando seguimiento a nuestro reclamo anterior..."'},
    {id:CLS.IR,title:"Solicitud de Información",icon:"📨",desc:"Piden información sin reclamar",kw:['"trazabilidad"','"certificado"','"podrían proporcionarnos"'],ex:'"¿Podrían proporcionarnos los detalles...?"'},
  ]
};

export const ALL_DEFECTS=[...DEFS.cargo.items,...DEFS.fruit.items];
