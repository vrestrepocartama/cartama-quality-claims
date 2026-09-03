import {useState} from "react";
import {supabase} from "./supabase.js";
import {P,GRAD,SH3,sB,sI,sL,sA,greeting} from "./styles.js";

export default function Login({onLogin}){
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPass,setShowPass]=useState(false);

  const submit=async(e)=>{
    e.preventDefault();setError("");setLoading(true);
    const{data:authData,error:authErr}=await supabase.auth.signInWithPassword({email,password:pass});
    if(authErr){setError("Correo o contraseña incorrectos");setLoading(false);return;}
    // Get app_user by email
    const{data:appUser}=await supabase.from("app_users").select("*").eq("email",email).eq("active",true).single();
    if(!appUser){setError("Usuario no autorizado en el sistema");setLoading(false);await supabase.auth.signOut();return;}
    // Update last login & auth_uid
    await supabase.from("app_users").update({last_login:new Date().toISOString(),auth_uid:authData.user.id}).eq("id",appUser.id);
    setLoading(false);
    onLogin(appUser);
  };

  return(
    <div style={{minHeight:"100vh",background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(600px 400px at 15% 10%, rgba(255,255,255,.12), transparent 60%), radial-gradient(700px 500px at 90% 95%, rgba(255,255,255,.09), transparent 65%)",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,position:"relative"}}>
        <div style={{textAlign:"center",color:P.w,marginBottom:24}}>
          <div style={{width:58,height:58,borderRadius:18,background:"rgba(255,255,255,.16)",border:"1px solid rgba(255,255,255,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px",backdropFilter:"blur(6px)"}}>🥑</div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:3,opacity:.72,textTransform:"uppercase"}}>Cartama</div>
          <div style={{fontSize:26,fontWeight:750,marginTop:4,letterSpacing:"-.4px"}}>Quality Claims</div>
          <div style={{fontSize:13,opacity:.8,marginTop:5}}>Departamento de Calidad · {greeting()}</div>
        </div>

        <div style={{background:P.w,borderRadius:20,padding:"28px 24px",boxShadow:SH3}}>
          <div style={{fontSize:11,fontWeight:700,color:P.g,textTransform:"uppercase",letterSpacing:".7px",marginBottom:18}}>Iniciar sesión</div>
          
          <form onSubmit={submit}>
            <div style={{marginBottom:14}}>
              <label style={sL}>Correo electrónico</label>
              <input type="email" style={sI} placeholder="tucorreo@cartama.com" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={sL}>Contraseña</label>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} style={{...sI,paddingRight:44}} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required autoComplete="current-password"/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:P.g}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>

            {error&&<div style={sA("danger")}>{error}</div>}

            <button type="submit" disabled={loading||!email||!pass} style={{...sB(!!email&&!!pass&&!loading),width:"100%",padding:"14px",marginTop:6}}>
              {loading?"Ingresando...":"Entrar →"}
            </button>
          </form>
          
          <div style={{textAlign:"center",marginTop:16,fontSize:12,color:P.g}}>
            ¿Problemas para ingresar? Contacta a tu administrador.
          </div>
        </div>

        <div style={{textAlign:"center",color:"rgba(255,255,255,.6)",fontSize:11,marginTop:18,letterSpacing:".3px"}}>
          Cartama · Quality Claims System v7
        </div>
      </div>
    </div>
  );
}
