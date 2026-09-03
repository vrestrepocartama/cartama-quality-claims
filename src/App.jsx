import {useState,useEffect,useCallback} from "react";
import {supabase} from "./supabase.js";
import {checkAndSendAlerts} from "./alerts.js";
import {loadAlertConfig} from "./insights.js";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import ClaimForm from "./ClaimForm.jsx";
import ClaimDetail from "./ClaimDetail.jsx";
import Analytics from "./Analytics.jsx";
import AlertConfig from "./AlertConfig.jsx";

const V={LOGIN:0,DASH:1,FORM:2,DETAIL:3,ANALYTICS:4,CONFIG:5};

export default function App(){
  const[user,setUser]=useState(null);
  const[view,setView]=useState(V.LOGIN);
  const[clients,setClients]=useState([]);
  const[claims,setClaims]=useState([]);
  const[allClaims,setAllClaims]=useState([]);
  const[alertConfig,setAlertConfig]=useState(null);
  const[loading,setLoading]=useState(true);
  const[year,setYear]=useState(new Date().getFullYear());
  const[sel,setSel]=useState(null);
  const[alertResults,setAlertResults]=useState(null);
  const[authChecked,setAuthChecked]=useState(false);

  // Check existing session on mount
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user?.email){
        const{data:appUser}=await supabase.from("app_users").select("*").eq("email",session.user.email).eq("active",true).single();
        if(appUser){setUser(appUser);setView(V.DASH);}
      }
      setAuthChecked(true);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_OUT"){setUser(null);setView(V.LOGIN);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const load=useCallback(async()=>{
    setLoading(true);
    const[{data:cl},{data:cm},{data:allCm},cfg]=await Promise.all([
      supabase.from("clients").select("*").eq("active",true).order("name"),
      supabase.from("claims").select("*,clients(name)").eq("year",year).order("created_at",{ascending:false}),
      supabase.from("claims").select("*,clients(name)").eq("year",new Date().getFullYear()).order("claim_date",{ascending:false}),
      loadAlertConfig(),
    ]);
    if(cl)setClients(cl);
    if(allCm)setAllClaims(allCm);
    if(cfg)setAlertConfig(cfg);
    if(cm){
      setClaims(cm);
      const results=await checkAndSendAlerts(cm);
      if(results.sent.length>0||results.autoChanged.length>0){
        setAlertResults(results);
        const{data:updated}=await supabase.from("claims").select("*,clients(name)").eq("year",year).order("created_at",{ascending:false});
        if(updated)setClaims(updated);
      }
    }
    setLoading(false);
  },[year]);

  useEffect(()=>{if(user)load();},[user,load]);

  const login=u=>{setUser(u);setView(V.DASH);};
  const logout=async()=>{await supabase.auth.signOut();setUser(null);setView(V.LOGIN);};
  const openClaim=c=>{setSel(c);setView(V.DETAIL);};
  const refresh=async()=>{await load();if(sel){const{data}=await supabase.from("claims").select("*,clients(name)").eq("id",sel.id).single();if(data)setSel(data);}};
  const dismissAlerts=()=>setAlertResults(null);

  if(!authChecked)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#6C757D"}}>Cargando...</div>;
  if(!user||view===V.LOGIN)return <Login onLogin={login}/>;
  if(view===V.FORM)return <ClaimForm user={user} clients={clients} allClaims={allClaims} alertConfig={alertConfig} onBack={()=>{setView(V.DASH);load();}} onSaved={load}/>;
  if(view===V.DETAIL&&sel)return <ClaimDetail claim={sel} user={user} clients={clients} onBack={()=>{setView(V.DASH);setSel(null);}} onRefresh={refresh}/>;
  if(view===V.ANALYTICS)return <Analytics user={user} onBack={()=>setView(V.DASH)} onOpen={openClaim}/>;
  if(view===V.CONFIG)return <AlertConfig user={user} onBack={()=>{setView(V.DASH);load();}}/>;
  return <Dashboard user={user} claims={claims} clients={clients} loading={loading} year={year} setYear={setYear}
    onNew={()=>setView(V.FORM)} onOpen={openClaim} onLogout={logout} onRefresh={load}
    onAnalytics={()=>setView(V.ANALYTICS)} onConfig={()=>setView(V.CONFIG)}
    alertResults={alertResults} onDismissAlerts={dismissAlerts}/>;
}
