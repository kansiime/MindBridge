import { authAPI, chatAPI, therapistAPI } from "./api";
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#0A0818", surface:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.08)",
  violet:"#7C3AED", violetDim:"#5B21B6", aqua:"#2DD4BF",
  text:"#F1F5F9", muted:"#64748B", subtle:"#94A3B8",
  green:"#25D366",
};

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:2px;}
  @keyframes orbPulse{0%,100%{transform:scale(1) rotate(0deg);opacity:.85;}33%{transform:scale(1.08) rotate(120deg);opacity:1;}66%{transform:scale(.95) rotate(240deg);opacity:.9;}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,.4);}50%{box-shadow:0 0 0 8px rgba(45,212,191,0);}}
  @keyframes typeDot{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-5px);opacity:1;}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  .mod-card:hover{transform:translateY(-3px);transition:transform .18s;}
  .glass{background:rgba(255,255,255,.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.08);}
  .btn-primary{background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;border:none;border-radius:12px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;}
  .btn-ghost{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 18px;font-size:13px;color:#94A3B8;cursor:pointer;}
  .tab{background:none;border:none;color:#64748B;font-size:13px;font-weight:600;cursor:pointer;padding:8px 16px;border-radius:50px;}
  .tab.active{background:rgba(124,58,237,0.15);color:#A78BFA;}
`;

const MODULES = [
  {id:"chat",       icon:"✦", label:"Daily Check-In",      color:"#7C3AED", desc:"Talk through how you're feeling right now",       tag:"Core"},
  {id:"anxiety",    icon:"⚡", label:"Anxiety & Panic",     color:"#F97316", desc:"Grounding exercises & panic attack support",        tag:"Acute"},
  {id:"sleep",      icon:"🌙", label:"Sleep & Insomnia",    color:"#818CF8", desc:"Wind-down routines & sleep quality tracking",       tag:"Daily"},
  {id:"grief",      icon:"🕊", label:"Grief & Loss",        color:"#94A3B8", desc:"Gentle space to process loss at your pace",         tag:"Journey"},
  {id:"social",     icon:"💬", label:"Social Anxiety",      color:"#EC4899", desc:"Rehearse hard conversations with AI roleplay",      tag:"Skills"},
  {id:"adhd",       icon:"🎯", label:"ADHD Support",        color:"#F59E0B", desc:"Focus sessions, task breakdown & body doubling",    tag:"Focus"},
  {id:"recovery",   icon:"🌱", label:"Addiction & Recovery",color:"#10B981", desc:"Daily sobriety check-ins & craving tools",          tag:"Recovery"},
  {id:"trauma",     icon:"🛡", label:"Trauma & PTSD",       color:"#6366F1", desc:"Grounding-first, safety-aware trauma support",      tag:"Sensitive"},
  {id:"burnout",    icon:"🔥", label:"Burnout & Stress",    color:"#EF4444", desc:"Burnout assessment & boundary-setting tools",       tag:"Work"},
  {id:"postpartum", icon:"🌸", label:"Postpartum Wellness", color:"#F0ABFC", desc:"Support for new parents navigating big changes",    tag:"Perinatal"},
];

const CHIPS = {
  chat:["I can't quiet my thoughts","Walk me through a breathing exercise","I feel really low today","Help me reframe a negative thought"],
  anxiety:["I'm having a panic attack","My anxiety won't stop","I need a grounding exercise","Everything feels out of control"],
  sleep:["I can't fall asleep","I keep waking at 3am","Build me a wind-down routine","My mind races at bedtime"],
  grief:["I lost someone recently","I feel guilty for feeling better","I don't know how to go on","Some days are harder"],
  social:["Help me rehearse a hard conversation","I freeze in social situations","I'm dreading a presentation","Help me set a boundary"],
  adhd:["I can't start this task","Stay with me while I work","I'm overwhelmed by my to-do list","I keep forgetting everything"],
  recovery:["I'm having a craving","I slipped and feel ashamed","Celebrate my 30 days sober","Help me urge-surf this"],
  trauma:["I keep having flashbacks","I feel unsafe right now","Help me ground myself","I startle at everything"],
  burnout:["I dread going to work","I feel completely empty","Help me set boundaries","I have nothing left to give"],
  postpartum:["I don't feel like myself","I'm struggling to bond","I feel so alone in this","I'm exhausted beyond words"],
};

const INTROS = {
  chat:"How are you feeling right now? I'm here — no rush.",
  anxiety:"You're safe here. Tell me what's happening — are you feeling anxious right now?",
  sleep:"Let's work on your sleep. How has it been lately?",
  grief:"I'm glad you're here. There's no right way to grieve. What would feel helpful today?",
  social:"Social situations can feel so heavy. What's coming up for you?",
  adhd:"Let's figure this out together. Are you trying to focus on something right now?",
  recovery:"You showed up today — that matters. How are you doing?",
  trauma:"You're in a safe space. We go at your pace, always. What feels okay to share today?",
  burnout:"Burnout is real and serious. How long have you been running on empty?",
  postpartum:"Early parenthood is one of the hardest transitions. How are you really doing?",
};

const CRISIS_WORDS = ["suicide","kill myself","self harm","hurt myself","end it all","want to die"];

// ── Shared ────────────────────────────────────────────────────────────────────
function Orb({ colors, size = 100 }) {
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(circle at 35% 40%,${colors[0]},${colors[1]} 50%,${colors[2]})`,animation:"orbPulse 6s ease-in-out infinite",filter:"blur(1px)"}}/>
      <div style={{position:"absolute",inset:"20%",borderRadius:"50%",background:`radial-gradient(circle at 60%,${colors[2]}66,transparent)`,animation:"orbPulse 9s reverse ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:"35%",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.15),transparent 70%)"}}/>
    </div>
  );
}

function Spinner() {
  return <div style={{width:18,height:18,border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>;
}

function Field({ label, type, value, onChange, placeholder, required = true }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:C.subtle,fontSize:12,fontWeight:600,marginBottom:6,letterSpacing:"0.05em"}}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"11px 16px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
    </div>
  );
}

function NavBar({ user, onLogout, tab, onTab, tabs }) {
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  return (
    <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg}}>
      <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={32}/>
      <span style={{color:C.text,fontWeight:800,fontSize:17,fontFamily:"Georgia,serif"}}>Mind<span style={{color:C.aqua}}>Bridge</span></span>
      <div style={{flex:1,display:"flex",gap:4,justifyContent:"center"}}>
        {tabs.map(t => (
          <button key={t.id} className={`tab${tab===t.id?" active":""}`} onClick={() => onTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <span style={{color:C.muted,fontSize:12}}>Hi, {firstName}</span>
      <button onClick={onLogout} className="btn-ghost" style={{padding:"5px 12px",fontSize:12}}>Sign out</button>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await authAPI.login(email, password);
    if (result.ok) { onLogin(result.user); }
    else {
      const err = result.error;
      setError(err?.detail || err?.non_field_errors?.[0] || err?.email?.[0] || "Invalid email or password");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={72}/></div>
          <div style={{fontSize:11,letterSpacing:"0.18em",color:C.aqua,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Mental Wellness</div>
          <h1 style={{color:C.text,fontSize:30,fontWeight:800,fontFamily:"Georgia,serif"}}>Mind<span style={{color:C.aqua}}>Bridge</span></h1>
          <p style={{color:C.muted,fontSize:14,marginTop:6}}>Sign in to continue your wellness journey</p>
        </div>
        <div className="glass" style={{borderRadius:20,padding:28}}>
          {error && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 14px",color:"#FCA5A5",fontSize:13,marginBottom:16}}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/>
            <Field label="PASSWORD" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
            <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.violet},${C.violetDim})`,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 0 24px rgba(124,58,237,0.4)"}}>
              {loading ? <Spinner/> : "Sign in →"}
            </button>
          </form>
          <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:16}}>
            No account?{" "}
            <button onClick={onGoRegister} style={{background:"none",border:"none",color:C.aqua,cursor:"pointer",fontSize:13,fontWeight:600}}>Create one free</button>
          </p>
        </div>
        <p style={{textAlign:"center",color:"#334155",fontSize:11.5,marginTop:14}}>Not a replacement for professional care · Crisis: call <strong style={{color:C.muted}}>+256787671827</strong></p>
      </div>
    </div>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
function RegisterScreen({ onLogin, onGoLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== password2) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    const result = await authAPI.register(email, password, password2, name);
    if (result.ok) { onLogin(result.user); }
    else {
      const err = result.error;
      setError(err?.email?.[0] || err?.password?.[0] || err?.detail || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={72}/></div>
          <h1 style={{color:C.text,fontSize:30,fontWeight:800,fontFamily:"Georgia,serif"}}>Create account</h1>
          <p style={{color:C.muted,fontSize:14,marginTop:6}}>Free forever · No credit card needed</p>
        </div>
        <div className="glass" style={{borderRadius:20,padding:28}}>
          {error && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 14px",color:"#FCA5A5",fontSize:13,marginBottom:16}}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <Field label="FULL NAME" type="text" value={name} onChange={setName} placeholder="Your name" required={false}/>
            <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/>
            <Field label="PASSWORD" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters"/>
            <Field label="CONFIRM PASSWORD" type="password" value={password2} onChange={setPassword2} placeholder="Repeat password"/>
            <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.violet},${C.violetDim})`,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:6,boxShadow:"0 0 24px rgba(124,58,237,0.4)"}}>
              {loading ? <Spinner/> : "Create account →"}
            </button>
          </form>
          <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:16}}>
            Already have an account?{" "}
            <button onClick={onGoLogin} style={{background:"none",border:"none",color:C.aqua,cursor:"pointer",fontSize:13,fontWeight:600}}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Notification sound ────────────────────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0, 0.12], [1100, 0.13, 0.18]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + end);
    });
  } catch { /* browser blocked audio */ }
}

// ── AI Chat Module ─────────────────────────────────────────────────────────────
function ChatModule({ mod, user, onBack }) {
  const [messages, setMessages] = useState([{id:"intro",role:"assistant",content:INTROS[mod.id]||"How are you feeling?",created_at:new Date().toISOString()}]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [handoffDismissed, setHandoffDismissed] = useState(false);
  const [inAppChat, setInAppChat] = useState(null);
  const [therapistModal, setTherapistModal] = useState(null); // {accepted?, available}
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionIdRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    chatAPI.createSession(mod.id).then(data => {
      const sid = data?.id;
      if (sid) {
        sessionIdRef.current = sid;
        if (pendingRef.current) {
          const msg = pendingRef.current;
          pendingRef.current = null;
          sendMsg(msg);
        }
      }
    });
  }, [mod.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, streaming]);

  async function sendMsg(text) {
    if (!text.trim() || streaming) return;
    const sid = sessionIdRef.current;
    if (!sid) { pendingRef.current = text; return; }

    setShowChips(false);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    if (CRISIS_WORDS.some(k => text.toLowerCase().includes(k))) setCrisisVisible(true);

    const userMsg = {id:Date.now().toString(),role:"user",content:text,created_at:new Date().toISOString()};
    if (!handoffDismissed && sessionIdRef.current) {
      therapistAPI.checkHandoff(sessionIdRef.current, mod.id, messages, text).then(result => {
        if (result.trigger && result.available && !handoffDismissed) setHandoff(result);
      });
    }
    setMessages(prev => [...prev, userMsg]);

    setStreaming(true);
    const pid = Date.now().toString() + "_ai";
    setMessages(prev => [...prev, {id:pid,role:"assistant",content:"",created_at:new Date().toISOString()}]);

    try {
      const res = await chatAPI.streamMessage(sid, text);
      if (!res?.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data:")) continue;
          const d = line.slice(5).trim();
          if (d === "[DONE]") break;
          try {
            const p = JSON.parse(d);
            if (p.text) { full += p.text; setMessages(prev => prev.map(m => m.id === pid ? {...m,content:full} : m)); }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === pid ? {...m,content:"Connection issue. Please try again."} : m));
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function endSession() {
    if (sessionIdRef.current) await chatAPI.endSession(sessionIdRef.current);
    onBack();
  }

  async function handleTalkToTherapist() {
    setTherapistModal({ loading: true });
    const [conns, available] = await Promise.all([
      therapistAPI.listConnections(),
      therapistAPI.getAvailable(mod.id),
    ]);
    const accepted = (Array.isArray(conns) ? conns : []).find(c => c.status === 'accepted');
    setTherapistModal({ accepted: accepted || null, available });
  }

  if (inAppChat) {
    return <DirectChat connection={inAppChat} currentUser={user} onBack={() => setInAppChat(null)}/>;
  }

  const chips = CHIPS[mod.id] || [];

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"system-ui,sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:500,height:180,background:`radial-gradient(ellipse,${mod.color}14,transparent 70%)`,pointerEvents:"none"}}/>

      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,flexShrink:0,zIndex:2,position:"relative"}}>
        <button onClick={endSession} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",lineHeight:1}}>←</button>
        <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${mod.color},#2DD4BF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{mod.icon}</div>
        <div style={{flex:1}}>
          <div style={{color:C.text,fontWeight:700,fontSize:14,fontFamily:"Georgia,serif"}}>{mod.label}</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:C.aqua,display:"inline-block",animation:"pulse 2s infinite"}}/>
            <span style={{color:C.muted,fontSize:11}}>Active · {user?.name || user?.email}</span>
          </div>
        </div>
        <button onClick={endSession} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:50,padding:"4px 12px",color:"#F87171",fontSize:11,cursor:"pointer"}}>End</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12,zIndex:1,position:"relative"}}>
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={i === messages.length - 1 ? "animate-fade-up" : ""} style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",gap:9}}>
              {!isUser && <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${mod.color},#2DD4BF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
              <div style={{maxWidth:"76%",padding:"11px 15px",fontSize:14,lineHeight:1.65,color:C.text,background:isUser?`linear-gradient(135deg,${mod.color},${C.violetDim})`:"rgba(255,255,255,0.07)",backdropFilter:isUser?"none":"blur(10px)",border:isUser?"none":"1px solid rgba(255,255,255,0.1)",borderRadius:isUser?"16px 16px 3px 16px":"16px 16px 16px 3px"}}>
                {!msg.content && !isUser ? (
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:"50%",background:mod.color,animation:`typeDot 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
                  </div>
                ) : msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      <div style={{padding:"0 14px 6px",flexShrink:0,zIndex:2}}>
        {showChips ? (
          <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
            {chips.map(p => (
              <button key={p} onClick={() => sendMsg(p)}
                style={{background:`${mod.color}16`,border:`1px solid ${mod.color}28`,borderRadius:50,padding:"7px 12px",fontSize:12,color:mod.color,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {p}
              </button>
            ))}
          </div>
        ) : (
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={() => setShowChips(true)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer"}}>+ Suggestions</button>
            <button onClick={handleTalkToTherapist} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:50,padding:"5px 12px",color:"#A78BFA",fontSize:11,cursor:"pointer",fontWeight:600}}>🧑‍⚕️ Talk to therapist</button>
          </div>
        )}
      </div>

      {crisisVisible && (
        <div style={{padding:"9px 16px",background:"rgba(239,68,68,0.1)",borderTop:"1px solid rgba(239,68,68,0.2)",display:"flex",alignItems:"center",gap:10,flexShrink:0,zIndex:2}}>
          <span>🚨</span>
          <div style={{flex:1,fontSize:12}}><span style={{color:"#FCA5A5",fontWeight:600}}>You matter. </span><span style={{color:C.muted}}>Call <strong style={{color:C.subtle}}>+256787671827</strong> — 24/7</span></div>
          <button onClick={() => setCrisisVisible(false)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
        </div>
      )}

      {handoff && !handoffDismissed && (
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(45,212,191,0.1))",borderTop:"1px solid rgba(124,58,237,0.3)",flexShrink:0,zIndex:3,animation:"fadeUp .4s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,overflow:"hidden"}}>
              {handoff.therapist?.photo_url ? <img src={handoff.therapist.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "🧑‍⚕️"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#F1F5F9",fontWeight:700,fontSize:13}}>{handoff.therapist?.full_name || "A therapist"} is available</div>
              <div style={{color:"#94A3B8",fontSize:11,marginTop:2}}>{handoff.therapist?.specializations?.join(" · ") || "Mental Health Specialist"} · Online now</div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <a href={handoff.whatsapp_link} target="_blank" rel="noopener noreferrer"
                  style={{background:C.green,borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
                  💬 Connect on WhatsApp
                </a>
                <button onClick={() => setHandoffDismissed(true)}
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",color:"#64748B",fontSize:12,cursor:"pointer"}}>
                  Continue with AI
                </button>
              </div>
            </div>
            <button onClick={() => setHandoffDismissed(true)} style={{background:"none",border:"none",color:"#334155",fontSize:16,cursor:"pointer",flexShrink:0}}>×</button>
          </div>
        </div>
      )}

      <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:9,alignItems:"flex-end",flexShrink:0,zIndex:2,background:C.bg}}>
        <div style={{flex:1,position:"relative"}}>
          {!input && <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#334155",fontSize:14,pointerEvents:"none"}}>Say anything…</span>}
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); e.currentTarget.style.height="auto"; e.currentTarget.style.height=Math.min(e.currentTarget.scrollHeight,100)+"px"; }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(input); } }}
            rows={1} disabled={streaming} aria-label="Your message"
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${C.border}`,borderRadius:18,padding:"11px 16px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",lineHeight:1.5,maxHeight:100,display:"block"}}/>
        </div>
        <button onClick={() => sendMsg(input)} disabled={streaming || !input.trim()} aria-label="Send"
          style={{width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",cursor:streaming||!input.trim()?"default":"pointer",background:streaming||!input.trim()?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${mod.color},${C.violetDim})`,color:streaming||!input.trim()?"#334155":"#fff",boxShadow:streaming||!input.trim()?"none":`0 0 18px ${mod.color}55`}}>↑</button>
      </div>

      {/* ── Therapist modal ── */}
      {therapistModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={() => setTherapistModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{background:"#13102A",borderRadius:"24px 24px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:480,animation:"slideUp .25s ease"}}>
            <div style={{width:40,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
            <h3 style={{color:C.text,fontSize:17,fontWeight:800,marginBottom:6,fontFamily:"Georgia,serif"}}>Talk to a therapist</h3>
            <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Choose how you'd like to connect</p>

            {therapistModal.loading ? (
              <div style={{display:"flex",justifyContent:"center",padding:"20px 0"}}><Spinner/></div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {/* In-app chat if already connected */}
                {therapistModal.accepted && (
                  <button onClick={() => { setTherapistModal(null); setInAppChat(therapistModal.accepted); }}
                    style={{background:"linear-gradient(135deg,rgba(124,58,237,0.2),rgba(45,212,191,0.1))",border:"1px solid rgba(124,58,237,0.4)",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",width:"100%"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,overflow:"hidden",flexShrink:0}}>
                      {therapistModal.accepted.therapist?.photo_url ? <img src={therapistModal.accepted.therapist.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "🧑‍⚕️"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>Chat with {therapistModal.accepted.therapist?.full_name || "your therapist"}</div>
                      <div style={{color:C.aqua,fontSize:11,marginTop:2}}>💬 In-app · Private & secure</div>
                    </div>
                    <span style={{color:C.aqua,fontSize:18}}>›</span>
                  </button>
                )}

                {/* WhatsApp if therapist available */}
                {therapistModal.available?.available && (
                  <a href={therapistModal.available.whatsapp_link} target="_blank" rel="noopener noreferrer"
                    style={{background:`rgba(37,211,102,0.1)`,border:"1px solid rgba(37,211,102,0.3)",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textDecoration:"none"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>Connect via WhatsApp</div>
                      <div style={{color:"#4ADE80",fontSize:11,marginTop:2}}>{therapistModal.available.therapist?.full_name || "Therapist"} · Available now</div>
                    </div>
                    <span style={{color:"#4ADE80",fontSize:18}}>›</span>
                  </a>
                )}

                {/* Request connection if not yet connected */}
                {!therapistModal.accepted && (
                  <button onClick={() => { setTherapistModal(null); onBack(); }}
                    style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",width:"100%"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(124,58,237,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🔍</div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>Find & connect with a therapist</div>
                      <div style={{color:C.muted,fontSize:11,marginTop:2}}>Browse licensed professionals</div>
                    </div>
                    <span style={{color:C.muted,fontSize:18}}>›</span>
                  </button>
                )}

                {!therapistModal.accepted && !therapistModal.available?.available && (
                  <p style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>No therapists available right now — try again later or connect in-app.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Direct Chat (user ↔ therapist) ─────────────────────────────────────────────
function DirectChat({ connection, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notif, setNotif] = useState(null); // {text, from}
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const msgCountRef = useRef(0);

  const isTherapist = currentUser?.role === 'therapist' || currentUser?.role === 'admin';
  const therapistName = connection.therapist?.full_name || "Therapist";
  const therapistPhoto = connection.therapist?.photo_url;
  const patientName = connection.patient_name || "Patient";
  const waNumber = connection.therapist?.whatsapp_number?.replace(/[^0-9]/g, "");

  // Header shows who you're chatting WITH
  const partnerName = isTherapist ? patientName : therapistName;
  const partnerPhoto = isTherapist ? null : therapistPhoto;
  const partnerSubs = isTherapist
    ? (connection.patient_email || "")
    : (connection.therapist?.specializations?.join(" · ") || "Mental Health Specialist");

  const myName = isTherapist
    ? (currentUser?.name || currentUser?.email?.split("@")[0])
    : patientName;
  const waLink = (!isTherapist && waNumber)
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'm ${myName} — connecting from MindBridge`)}`
    : null;

  const fetchMessages = useCallback(async () => {
    const data = await therapistAPI.getDirectMessages(connection.id);
    if (!Array.isArray(data)) return;
    const prev = msgCountRef.current;
    if (prev > 0 && data.length > prev) {
      // New message(s) arrived from the other person
      const newest = data[data.length - 1];
      if (!newest.is_mine) {
        playNotifSound();
        setNotif({ text: newest.content, from: newest.sender_name });
        setTimeout(() => setNotif(null), 4000);
      }
    }
    msgCountRef.current = data.length;
    setMessages(data);
  }, [connection.id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  async function sendMsg() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    await therapistAPI.sendDirectMessage(connection.id, text);
    await fetchMessages();
    setSending(false);
  }

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"system-ui,sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      {/* Header */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
          {partnerPhoto ? <img src={partnerPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (isTherapist ? "👤" : "🧑‍⚕️")}
        </div>
        <div style={{flex:1}}>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>{partnerName}</div>
          <div style={{color:C.muted,fontSize:11}}>{partnerSubs}</div>
        </div>
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{background:C.green,borderRadius:50,padding:"6px 12px",color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            💬 WhatsApp
          </a>
        )}
      </div>

      {/* Notification toast */}
      {notif && (
        <div style={{position:"absolute",top:70,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"linear-gradient(135deg,#7C3AED,#4F46E5)",borderRadius:12,padding:"10px 16px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",animation:"fadeUp .3s ease",maxWidth:"90%",pointerEvents:"none"}}>
          <span style={{fontSize:14}}>💬</span>
          <div>
            <div style={{color:"#fff",fontSize:12,fontWeight:700}}>{notif.from}</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{notif.text}</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length === 0 && (
          <div style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:40}}>
            Say hello to {partnerName} 👋
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.is_mine ?? (msg.sender === currentUser?.id);
          return (
            <div key={msg.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8}}>
              {!isMe && (
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginTop:2}}>
                  {partnerPhoto ? <img src={partnerPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/> : (isTherapist ? "👤" : "🧑‍⚕️")}
                </div>
              )}
              <div style={{maxWidth:"75%"}}>
                <div style={{padding:"10px 14px",fontSize:14,lineHeight:1.6,color:C.text,background:isMe?`linear-gradient(135deg,${C.violet},${C.violetDim})`:"rgba(255,255,255,0.07)",border:isMe?"none":"1px solid rgba(255,255,255,0.1)",borderRadius:isMe?"16px 16px 3px 16px":"16px 16px 16px 3px"}}>
                  {msg.content}
                </div>
                <div style={{color:C.muted,fontSize:10,marginTop:3,textAlign:isMe?"right":"left"}}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:9,alignItems:"flex-end",background:C.bg,flexShrink:0}}>
        <div style={{flex:1,position:"relative"}}>
          {!input && <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#334155",fontSize:14,pointerEvents:"none"}}>Message {partnerName}…</span>}
          <textarea value={input}
            onChange={e => { setInput(e.target.value); e.currentTarget.style.height="auto"; e.currentTarget.style.height=Math.min(e.currentTarget.scrollHeight,100)+"px"; }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
            rows={1}
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${C.border}`,borderRadius:18,padding:"11px 16px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",lineHeight:1.5,maxHeight:100,display:"block"}}/>
        </div>
        <button onClick={sendMsg} disabled={sending || !input.trim()}
          style={{width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",cursor:sending||!input.trim()?"default":"pointer",background:sending||!input.trim()?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${C.violet},${C.violetDim})`,color:sending||!input.trim()?"#334155":"#fff"}}>↑</button>
      </div>
    </div>
  );
}

// ── User Dashboard ─────────────────────────────────────────────────────────────
function UserDashboard({ user, onSelectModule, onLogout }) {
  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [therapists, setTherapists] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [requesting, setRequesting] = useState(null);
  const [reqMsg, setReqMsg] = useState("");
  const [loadingDir, setLoadingDir] = useState(false);

  const filtered = MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()));
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (tab === "therapists") {
      setLoadingDir(true);
      Promise.all([therapistAPI.directory(), therapistAPI.listConnections()]).then(([dir, conns]) => {
        setTherapists(Array.isArray(dir) ? dir : []);
        setConnections(Array.isArray(conns) ? conns : []);
        setLoadingDir(false);
      });
    }
    if (tab === "messages") {
      therapistAPI.listConnections().then(data => setConnections(Array.isArray(data) ? data : []));
    }
  }, [tab]);

  async function sendRequest(therapistId) {
    const result = await therapistAPI.requestConnection(therapistId, reqMsg);
    if (result.ok) {
      setRequesting(null);
      setReqMsg("");
      const conns = await therapistAPI.listConnections();
      setConnections(Array.isArray(conns) ? conns : []);
      setTab("messages");
    }
  }

  if (activeConnection) {
    return <DirectChat connection={activeConnection} currentUser={user} onBack={() => { setActiveConnection(null); setTab("messages"); }}/>;
  }

  const tabs = [
    {id:"home", label:"Modules"},
    {id:"therapists", label:"Find Therapist"},
    {id:"messages", label:"My Therapist"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      <NavBar user={user} onLogout={onLogout} tab={tab} onTab={setTab} tabs={tabs}/>

      {/* ── Modules tab ── */}
      {tab === "home" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 80px"}}>
          <div style={{marginBottom:16}}>
            <h2 style={{color:C.text,fontSize:20,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Good to see you, {firstName}</h2>
            <p style={{color:C.muted,fontSize:13}}>Choose a module to start your session</p>
          </div>
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted}}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:50,padding:"10px 16px 10px 36px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          </div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>All modules · {filtered.length}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map(mod => (
              <button key={mod.id} className="mod-card" onClick={() => onSelectModule(mod)}
                style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,textAlign:"left",cursor:"pointer",width:"100%"}}>
                <div style={{width:44,height:44,borderRadius:14,background:`${mod.color}16`,border:`1px solid ${mod.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{mod.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{color:C.text,fontWeight:700,fontSize:14,fontFamily:"Georgia,serif"}}>{mod.label}</span>
                    <span style={{fontSize:10,color:mod.color,background:`${mod.color}14`,border:`1px solid ${mod.color}28`,borderRadius:50,padding:"1px 7px",fontWeight:600,flexShrink:0}}>{mod.tag}</span>
                  </div>
                  <div style={{color:C.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mod.desc}</div>
                </div>
                <span style={{color:C.muted,fontSize:16,flexShrink:0}}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Find Therapist tab ── */}
      {tab === "therapists" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Find a Therapist</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Connect with a licensed mental health professional</p>
          {loadingDir ? (
            <div style={{display:"flex",justifyContent:"center",paddingTop:40}}><Spinner/></div>
          ) : therapists.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:14,paddingTop:40}}>No therapists available right now.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {therapists.map(t => {
                const alreadyConnected = connections.find(c => c.therapist?.id === t.id);
                return (
                  <div key={t.id} className="glass" style={{borderRadius:16,padding:16}}>
                    <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                      <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                        {t.photo_url ? <img src={t.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:22}}>🧑‍⚕️</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:C.text,fontWeight:700,fontSize:15}}>{t.full_name}</div>
                        <div style={{color:C.muted,fontSize:12,marginTop:2}}>{t.credentials}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                          {(t.specializations||[]).map(s => (
                            <span key={s} style={{fontSize:10,background:"rgba(124,58,237,0.12)",color:"#A78BFA",borderRadius:50,padding:"2px 8px"}}>{s}</span>
                          ))}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8}}>
                          <span style={{color:C.muted,fontSize:11}}>⭐ {t.rating} · {t.years_experience}yr exp</span>
                          {t.is_currently_available && <span style={{fontSize:10,color:C.aqua,background:"rgba(45,212,191,0.1)",borderRadius:50,padding:"2px 8px"}}>● Available now</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:12}}>
                      {alreadyConnected ? (
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{fontSize:12,color:alreadyConnected.status==="accepted"?C.aqua:C.muted,background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"6px 12px"}}>
                            {alreadyConnected.status === "accepted" ? "✓ Connected" : alreadyConnected.status === "pending" ? "⏳ Request pending" : "✗ Declined"}
                          </span>
                          {alreadyConnected.status === "accepted" && (
                            <button className="btn-primary" style={{padding:"6px 14px",fontSize:12}} onClick={() => setActiveConnection(alreadyConnected)}>
                              Open chat →
                            </button>
                          )}
                        </div>
                      ) : requesting === t.id ? (
                        <div>
                          <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)} placeholder="Say a bit about what you're looking for (optional)…" rows={2}
                            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
                          <div style={{display:"flex",gap:8}}>
                            <button className="btn-primary" style={{padding:"7px 14px",fontSize:12}} onClick={() => sendRequest(t.id)}>Send request</button>
                            <button className="btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={() => setRequesting(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn-primary" style={{padding:"7px 14px",fontSize:12}} onClick={() => setRequesting(t.id)}>
                          Connect with {t.full_name.split(" ")[0]}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── My Therapist / messages tab ── */}
      {tab === "messages" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>My Therapist</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Your active connections</p>
          {connections.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>🧑‍⚕️</div>
              <p style={{color:C.muted,fontSize:14}}>No connections yet.</p>
              <button className="btn-primary" style={{marginTop:16}} onClick={() => setTab("therapists")}>Find a therapist</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {connections.map(conn => {
                const t = conn.therapist;
                const lastMsg = conn.messages?.[conn.messages.length - 1];
                return (
                  <button key={conn.id} onClick={() => conn.status === "accepted" ? setActiveConnection(conn) : null}
                    style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${conn.status==="accepted"?C.border:"rgba(255,255,255,0.05)"}`,borderRadius:16,padding:14,display:"flex",gap:12,alignItems:"center",textAlign:"left",cursor:conn.status==="accepted"?"pointer":"default",width:"100%",opacity:conn.status==="declined"?0.5:1}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                      {t?.photo_url ? <img src={t.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "🧑‍⚕️"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{color:C.text,fontWeight:700,fontSize:14}}>{t?.full_name || "Therapist"}</span>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:50,fontWeight:600,
                          background:conn.status==="accepted"?"rgba(45,212,191,0.1)":conn.status==="pending"?"rgba(245,158,11,0.1)":"rgba(239,68,68,0.1)",
                          color:conn.status==="accepted"?C.aqua:conn.status==="pending"?"#FCD34D":"#F87171"}}>
                          {conn.status}
                        </span>
                      </div>
                      <div style={{color:C.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {lastMsg ? lastMsg.content : conn.message || "No messages yet"}
                      </div>
                    </div>
                    {conn.status === "accepted" && <span style={{color:C.muted,fontSize:16}}>›</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Crisis footer */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 20px",background:"rgba(10,8,24,0.95)",backdropFilter:"blur(12px)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,zIndex:50}}>
        <span>🚨</span>
        <span style={{color:C.muted,fontSize:12,flex:1}}>In crisis? Call <strong style={{color:C.subtle}}>+256787671827</strong> — free, confidential, 24/7</span>
      </div>
    </div>
  );
}

// ── Therapist Dashboard ────────────────────────────────────────────────────────
function TherapistDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("patients");
  const [portal, setPortal] = useState(null);
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, conns, prof] = await Promise.all([therapistAPI.portal(), therapistAPI.listConnections(), therapistAPI.getProfile()]);
    setPortal(p);
    setConnections(Array.isArray(conns) ? conns : []);
    if (prof) { setProfile(prof); setProfileForm(prof); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function respond(connId, action) {
    await therapistAPI.respondConnection(connId, action);
    loadData();
  }

  if (activeConnection) {
    return <DirectChat connection={activeConnection} currentUser={user} onBack={() => { setActiveConnection(null); loadData(); }}/>;
  }

  const pending = connections.filter(c => c.status === "pending");
  const accepted = connections.filter(c => c.status === "accepted");

  async function saveProfile() {
    if (!profileForm) return;
    setProfileSaving(true); setProfileMsg("");
    const result = await therapistAPI.updateProfile({
      bio: profileForm.bio,
      credentials: profileForm.credentials,
      years_experience: profileForm.years_experience,
      specializations: profileForm.specializations,
      whatsapp_number: profileForm.whatsapp_number,
      phone_number: profileForm.phone_number,
      photo_url: profileForm.photo_url,
      working_hours: profileForm.working_hours,
      timezone: profileForm.timezone,
      max_patients: profileForm.max_patients,
      is_available: profileForm.is_available,
    });
    if (result.ok) { setProfile(result.data); setProfileMsg("Saved!"); }
    else setProfileMsg("Save failed. Please try again.");
    setProfileSaving(false);
    setTimeout(() => setProfileMsg(""), 3000);
  }

  const tabs = [
    {id:"patients", label:"Patients"},
    {id:"requests", label:`Requests${pending.length ? ` (${pending.length})` : ""}`},
    {id:"messages", label:"Messages"},
    {id:"profile", label:"My Profile"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      <NavBar user={user} onLogout={onLogout} tab={tab} onTab={setTab} tabs={tabs}/>

      {loading && (
        <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>
      )}

      {/* ── Patients tab ── */}
      {!loading && tab === "patients" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <div style={{marginBottom:20}}>
            <h2 style={{color:C.text,fontSize:20,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Welcome, {firstName}</h2>
            <p style={{color:C.muted,fontSize:13}}>Your active patients and sessions</p>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
            {[
              {label:"Active patients", value: portal?.active_patients ?? 0, color:C.aqua},
              {label:"Pending requests", value: pending.length, color:"#FCD34D"},
              {label:"Open chats", value: accepted.length, color:C.violet},
            ].map(s => (
              <div key={s.label} className="glass" style={{borderRadius:14,padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {(!portal?.patients || portal.patients.length === 0) ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:14,paddingTop:30}}>No active patients yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {portal.patients.map(p => (
                <div key={p.patient_id} className="glass" style={{borderRadius:14,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.violet},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,color:"#fff",fontWeight:700}}>
                      {(p.patient_name||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>{p.patient_name}</div>
                      <div style={{color:C.muted,fontSize:11}}>{p.patient_email}</div>
                    </div>
                    {p.last_mood && <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>Mood: {p.last_mood}</span>}
                  </div>
                  {p.recent_sessions?.length > 0 && (
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Recent sessions</div>
                      {p.recent_sessions.slice(0,2).map(s => (
                        <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          {s.crisis_flag && <span style={{fontSize:10,color:"#F87171"}}>🚨</span>}
                          <span style={{fontSize:11,color:C.subtle,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.summary || s.module}</span>
                          <span style={{fontSize:10,color:C.muted}}>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Requests tab ── */}
      {!loading && tab === "requests" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Connection Requests</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Patients who want to connect with you</p>
          {pending.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:14,paddingTop:30}}>No pending requests.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pending.map(conn => (
                <div key={conn.id} className="glass" style={{borderRadius:14,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:conn.message?8:12}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.violet},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"#fff",fontWeight:700,flexShrink:0}}>
                      {(conn.patient_name||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>{conn.patient_name}</div>
                      <div style={{color:C.muted,fontSize:11}}>{conn.patient_email}</div>
                    </div>
                    <span style={{marginLeft:"auto",color:C.muted,fontSize:11}}>{new Date(conn.created_at).toLocaleDateString()}</span>
                  </div>
                  {conn.message && (
                    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",fontSize:13,color:C.subtle,marginBottom:10,fontStyle:"italic"}}>
                      "{conn.message}"
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn-primary" style={{padding:"7px 14px",fontSize:12}} onClick={() => respond(conn.id, "accept")}>Accept</button>
                    <button className="btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={() => respond(conn.id, "decline")}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Messages tab ── */}
      {!loading && tab === "messages" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Messages</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Your active patient conversations</p>
          {accepted.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:14,paddingTop:30}}>No active conversations. Accept requests to start chatting.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {accepted.map(conn => {
                const lastMsg = conn.messages?.[conn.messages.length - 1];
                return (
                  <button key={conn.id} onClick={() => setActiveConnection(conn)}
                    style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:14,display:"flex",gap:12,alignItems:"center",textAlign:"left",cursor:"pointer",width:"100%"}}>
                    <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${C.violet},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:700,flexShrink:0}}>
                      {(conn.patient_name||"?")[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:2}}>{conn.patient_name}</div>
                      <div style={{color:C.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {lastMsg ? lastMsg.content : "No messages yet"}
                      </div>
                    </div>
                    <span style={{color:C.muted,fontSize:16}}>›</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "profile" && profileForm && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>My Profile</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Update your information and availability</p>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Availability toggle */}
            <div className="glass" style={{borderRadius:14,padding:14,display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:700,fontSize:14}}>Available for new patients</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>Toggle off to pause incoming requests</div>
              </div>
              <button onClick={() => setProfileForm(f => ({...f, is_available: !f.is_available}))}
                style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:profileForm.is_available?C.aqua:"rgba(255,255,255,0.1)",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:profileForm.is_available?23:3,transition:"left 0.2s"}}/>
              </button>
            </div>

            {/* Bio */}
            <div>
              <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>BIO</label>
              <textarea value={profileForm.bio||""} onChange={e => setProfileForm(f=>({...f,bio:e.target.value}))} rows={3}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
            </div>

            {/* Credentials */}
            <div>
              <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>CREDENTIALS</label>
              <textarea value={profileForm.credentials||""} onChange={e => setProfileForm(f=>({...f,credentials:e.target.value}))} rows={2}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
            </div>

            {/* Two columns */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>YEARS EXPERIENCE</label>
                <input type="number" min={0} value={profileForm.years_experience||0} onChange={e => setProfileForm(f=>({...f,years_experience:parseInt(e.target.value)||0}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
              </div>
              <div>
                <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>MAX PATIENTS</label>
                <input type="number" min={1} value={profileForm.max_patients||10} onChange={e => setProfileForm(f=>({...f,max_patients:parseInt(e.target.value)||10}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
              </div>
            </div>

            {/* Contact */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>WHATSAPP NUMBER</label>
                <input type="text" value={profileForm.whatsapp_number||""} onChange={e => setProfileForm(f=>({...f,whatsapp_number:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
              </div>
              <div>
                <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>PHONE NUMBER</label>
                <input type="text" value={profileForm.phone_number||""} onChange={e => setProfileForm(f=>({...f,phone_number:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
              </div>
            </div>

            {/* Photo URL */}
            <div>
              <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>PHOTO URL</label>
              <input type="url" value={profileForm.photo_url||""} onChange={e => setProfileForm(f=>({...f,photo_url:e.target.value}))}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
            </div>

            {/* Working Hours */}
            <div>
              <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:8,letterSpacing:"0.05em"}}>WORKING HOURS</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {["mon","tue","wed","thu","fri","sat","sun"].map(day => {
                  const hours = profileForm.working_hours?.[day];
                  return (
                    <div key={day} style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 40px",gap:8,alignItems:"center"}}>
                      <span style={{color:C.subtle,fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{day}</span>
                      <input type="time" value={hours?.start||""} disabled={!hours}
                        onChange={e => setProfileForm(f=>({...f,working_hours:{...f.working_hours,[day]:{...f.working_hours[day],start:e.target.value}}}))}
                        style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 8px",fontSize:12,color:hours?C.text:C.muted,outline:"none",width:"100%",opacity:hours?1:0.4}}/>
                      <input type="time" value={hours?.end||""} disabled={!hours}
                        onChange={e => setProfileForm(f=>({...f,working_hours:{...f.working_hours,[day]:{...f.working_hours[day],end:e.target.value}}}))}
                        style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 8px",fontSize:12,color:hours?C.text:C.muted,outline:"none",width:"100%",opacity:hours?1:0.4}}/>
                      <button onClick={() => setProfileForm(f => {
                        const wh = {...f.working_hours};
                        if (wh[day]) { delete wh[day]; } else { wh[day] = {start:"09:00",end:"17:00"}; }
                        return {...f, working_hours:wh};
                      })} style={{background:hours?"rgba(239,68,68,0.1)":"rgba(45,212,191,0.1)",border:`1px solid ${hours?"rgba(239,68,68,0.2)":"rgba(45,212,191,0.2)"}`,borderRadius:8,padding:"5px",fontSize:12,color:hours?"#F87171":C.aqua,cursor:"pointer",textAlign:"center"}}>
                        {hours ? "✕" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p style={{color:C.muted,fontSize:11,marginTop:6}}>Click + to add a day, ✕ to remove it</p>
            </div>

            {/* Save */}
            <div style={{display:"flex",alignItems:"center",gap:12,paddingTop:4}}>
              <button className="btn-primary" onClick={saveProfile} disabled={profileSaving} style={{padding:"10px 24px"}}>
                {profileSaving ? "Saving…" : "Save changes"}
              </button>
              {profileMsg && <span style={{color:profileMsg==="Saved!"?C.aqua:"#F87171",fontSize:13,fontWeight:600}}>{profileMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authAPI.isLoggedIn()) {
      authAPI.me().then(data => { if (data) { setUser(data); setScreen("home"); } setLoading(false); });
    } else { setLoading(false); }
  }, []);

  function handleLogout() { authAPI.logout(); setUser(null); setScreen("login"); }

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={80}/>
    </div>
  );

  if (screen === "register") return <RegisterScreen onLogin={u => { setUser(u); setScreen("home"); }} onGoLogin={() => setScreen("login")}/>;
  if (screen === "login")    return <LoginScreen    onLogin={u => { setUser(u); setScreen("home"); }} onGoRegister={() => setScreen("register")}/>;

  if (screen === "module" && activeModule) {
    return <ChatModule mod={activeModule} user={user} onBack={() => { setActiveModule(null); setScreen("home"); }}/>;
  }

  if (screen === "home") {
    if (user?.role === "therapist" || user?.role === "admin") {
      return <TherapistDashboard user={user} onLogout={handleLogout}/>;
    }
    return (
      <UserDashboard
        user={user}
        onSelectModule={mod => { setActiveModule(mod); setScreen("module"); }}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}
