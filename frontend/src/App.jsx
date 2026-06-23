import { authAPI, chatAPI, therapistAPI, wellbeingAPI } from "./api";
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
function ChatModule({ mod, user, onBack, onOpenTherapists }) {
  const [messages, setMessages] = useState([{id:"intro",role:"assistant",content:INTROS[mod.id]||"How are you feeling?",created_at:new Date().toISOString()}]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [handoffDismissed, setHandoffDismissed] = useState(false);
  const [inAppChat, setInAppChat] = useState(null);
  const [therapistModal, setTherapistModal] = useState(null);
  const [requestSent, setRequestSent] = useState(null); // { therapistName }
  const [sendingReq, setSendingReq] = useState(null); // therapist id being requested
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
    try {
      const [conns, available, dir] = await Promise.all([
        therapistAPI.listConnections(),
        therapistAPI.getAvailable(mod.id),
        therapistAPI.directory(),
      ]);
      const allConns = Array.isArray(conns) ? conns : [];
      const accepted = allConns.filter(c => c.status === 'accepted');
      const pending  = allConns.filter(c => c.status === 'pending');
      setTherapistModal({
        loading: false,
        accepted,
        pending,
        available: available || { available: false },
        directory: Array.isArray(dir) ? dir : [],
        allConns,
      });
    } catch {
      setTherapistModal({ loading: false, accepted: [], pending: [], available: { available: false }, directory: [], allConns: [] });
    }
  }

  async function sendRequestFromModal(therapistId, therapistName) {
    setSendingReq(therapistId);
    const result = await therapistAPI.requestConnection(therapistId, '');
    setSendingReq(null);
    if (result.ok) {
      setTherapistModal(null);
      setRequestSent({ therapistName });
      setTimeout(() => setRequestSent(null), 6000);
    }
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

      {requestSent && (
        <div style={{padding:"10px 16px",background:"linear-gradient(135deg,rgba(45,212,191,0.12),rgba(124,58,237,0.08))",borderTop:"1px solid rgba(45,212,191,0.25)",display:"flex",alignItems:"center",gap:10,flexShrink:0,animation:"fadeUp .3s ease"}}>
          <span style={{fontSize:18}}>✅</span>
          <div style={{flex:1}}>
            <span style={{color:C.aqua,fontWeight:700,fontSize:13}}>Request sent to {requestSent.therapistName}! </span>
            <span style={{color:C.muted,fontSize:12}}>You'll be notified when they accept — keep chatting here.</span>
          </div>
          <button onClick={() => setRequestSent(null)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
        </div>
      )}

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
          <div onClick={e => e.stopPropagation()} style={{background:"#13102A",borderRadius:"24px 24px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:520,maxHeight:"80vh",overflowY:"auto",animation:"slideUp .25s ease"}}>
            <div style={{width:40,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
            <h3 style={{color:C.text,fontSize:17,fontWeight:800,marginBottom:4,fontFamily:"Georgia,serif"}}>Talk to a therapist</h3>

            {therapistModal.loading ? (
              <div style={{display:"flex",justifyContent:"center",padding:"30px 0"}}><Spinner/></div>
            ) : therapistModal.accepted?.length > 0 ? (
              /* ── Already connected to one or more therapists ── */
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <p style={{color:C.muted,fontSize:13,marginBottom:8}}>Open an in-app chat with your therapist</p>
                {therapistModal.accepted.map(conn => (
                  <button key={conn.id} onClick={() => { setTherapistModal(null); setInAppChat(conn); }}
                    style={{background:"linear-gradient(135deg,rgba(124,58,237,0.18),rgba(45,212,191,0.08))",border:"1px solid rgba(124,58,237,0.35)",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",width:"100%"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,overflow:"hidden",flexShrink:0}}>
                      {conn.therapist?.photo_url ? <img src={conn.therapist.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "🧑‍⚕️"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>{conn.therapist?.full_name || "Therapist"}</div>
                      <div style={{color:C.muted,fontSize:11,marginTop:1}}>{(conn.therapist?.specializations||[]).join(" · ") || "Mental Health Specialist"}</div>
                    </div>
                    <span style={{color:C.aqua,fontSize:11,fontWeight:700,background:"rgba(45,212,191,0.1)",padding:"3px 9px",borderRadius:50}}>💬 Chat</span>
                  </button>
                ))}
                {/* WhatsApp instant option */}
                {therapistModal.available?.available && (
                  <a href={therapistModal.available.whatsapp_link} target="_blank" rel="noopener noreferrer"
                    style={{background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.25)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,textDecoration:"none",marginTop:2}}>
                    <span style={{fontSize:22}}>💬</span>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:13}}>Talk on WhatsApp right now</div>
                      <div style={{color:"#4ADE80",fontSize:11}}>{therapistModal.available.therapist?.full_name} · Available</div>
                    </div>
                  </a>
                )}
                {/* Browse all */}
                <button onClick={() => { setTherapistModal(null); onOpenTherapists?.(); }}
                  style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:14,padding:"11px 16px",color:C.muted,fontSize:13,cursor:"pointer",marginTop:4}}>
                  🔍 Browse all therapists
                </button>
              </div>
            ) : (
              /* ── Not connected yet ── */
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {/* How it works */}
                <div style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:4}}>
                  <div style={{color:C.subtle,fontSize:12,fontWeight:700,marginBottom:6}}>HOW IT WORKS</div>
                  <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                    {["1 · Request","2 · They accept","3 · Chat in-app"].map((s,i) => (
                      <div key={i} style={{flex:1,textAlign:"center"}}>
                        <div style={{fontSize:18,marginBottom:3}}>["🙋","✅","💬"][i]</div>
                        <div style={{color:C.muted,fontSize:11}}>{s}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{color:C.muted,fontSize:11,marginTop:8}}>Your AI session stays open while you wait.</p>
                </div>

                {/* Top therapists from directory */}
                {therapistModal.directory.length > 0 && (
                  <>
                    <p style={{color:C.subtle,fontSize:12,fontWeight:700,letterSpacing:"0.05em"}}>AVAILABLE THERAPISTS</p>
                    {therapistModal.directory.slice(0, 3).map(t => {
                      const conn = therapistModal.allConns.find(c => c.therapist?.id === t.id);
                      const isPending = conn?.status === 'pending';
                      return (
                        <div key={t.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                            {t.photo_url ? <img src={t.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:18}}>🧑‍⚕️</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:C.text,fontWeight:700,fontSize:13}}>{t.full_name}</div>
                            <div style={{color:C.muted,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(t.specializations||[]).join(" · ")}</div>
                          </div>
                          {isPending ? (
                            <span style={{fontSize:11,color:"#FCD34D",background:"rgba(245,158,11,0.1)",borderRadius:50,padding:"4px 10px",flexShrink:0}}>⏳ Pending</span>
                          ) : (
                            <button onClick={() => sendRequestFromModal(t.id, t.full_name)} disabled={sendingReq === t.id}
                              style={{background:`linear-gradient(135deg,${C.violet},${C.violetDim})`,border:"none",borderRadius:50,padding:"6px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,opacity:sendingReq===t.id?0.6:1}}>
                              {sendingReq === t.id ? "…" : "Request"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Browse all */}
                <button onClick={() => { setTherapistModal(null); onOpenTherapists?.(); }}
                  style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",width:"100%",textAlign:"left"}}>
                  <span style={{fontSize:18}}>🔍</span>
                  <div style={{flex:1}}>
                    <div style={{color:C.text,fontWeight:700,fontSize:13}}>Browse all therapists</div>
                    <div style={{color:C.muted,fontSize:11}}>Filter by specialization · Full profiles</div>
                  </div>
                  <span style={{color:C.muted,fontSize:16}}>›</span>
                </button>

                {/* WhatsApp instant fallback */}
                {therapistModal.available?.available && (
                  <a href={therapistModal.available.whatsapp_link} target="_blank" rel="noopener noreferrer"
                    style={{background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.25)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
                    <span style={{fontSize:20}}>💬</span>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:13}}>Talk on WhatsApp right now</div>
                      <div style={{color:"#4ADE80",fontSize:11}}>Instant · No waiting for acceptance</div>
                    </div>
                  </a>
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

// ── Consent Modal ──────────────────────────────────────────────────────────────
function ConsentModal({ onAccept }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:440,width:"100%",animation:"slideUp .3s ease"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8}}>🔒</div>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:6}}>Your privacy matters</h2>
          <p style={{color:C.muted,fontSize:13}}>Before we begin, here's how MindBridge handles your data</p>
        </div>
        {[
          ["🧠","AI conversations","Your chats are processed to generate responses. They are stored securely and only visible to you and your connected therapist."],
          ["📊","Mood & assessment data","Your check-ins and PHQ scores are used only to personalize your care and track your progress over time."],
          ["🛡","Data security","All data is encrypted in transit and at rest. You can request deletion at any time."],
          ["👤","Therapist access","If you connect with a therapist, they can see your session summaries and mood trends to provide better care."],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
            <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{icon}</span>
            <div>
              <div style={{color:C.text,fontWeight:700,fontSize:13,marginBottom:2}}>{title}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.5}}>{desc}</div>
            </div>
          </div>
        ))}
        <button onClick={onAccept} className="btn-primary" style={{width:"100%",padding:"12px",marginTop:8,fontSize:15}}>
          I understand — continue →
        </button>
        <p style={{textAlign:"center",color:"#334155",fontSize:11,marginTop:12}}>
          MindBridge is a wellness support tool, not a replacement for professional care.
        </p>
      </div>
    </div>
  );
}

// ── PHQ-9 Onboarding Assessment ───────────────────────────────────────────────
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure",
  "Trouble concentrating on things",
  "Moving or speaking so slowly that other people could have noticed",
  "Thoughts that you would be better off dead or of hurting yourself",
];
const PHQ9_OPTIONS = ["Not at all","Several days","More than half the days","Nearly every day"];

function OnboardingModal({ onComplete, onSkip }) {
  const [step, setStep] = useState(0); // 0 = intro, 1-9 = questions, 10 = done
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const q = step >= 1 && step <= 9 ? PHQ9_QUESTIONS[step - 1] : null;
  const progress = Math.round((step / 9) * 100);

  async function finish() {
    setSaving(true);
    const responses = {};
    let total = 0;
    for (let i = 1; i <= 9; i++) {
      responses[`q${i}`] = answers[i] ?? 0;
      total += answers[i] ?? 0;
    }
    const severity = total <= 4 ? 'minimal' : total <= 9 ? 'mild' : total <= 14 ? 'moderate' : total <= 19 ? 'moderately_severe' : 'severe';
    await wellbeingAPI.createAssessment('phq9', responses, total, severity);
    setSaving(false);
    onComplete(total, severity);
  }

  if (step === 0) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",animation:"slideUp .3s ease",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>📋</div>
        <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:8}}>Quick wellbeing check-in</h2>
        <p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:20}}>
          The PHQ-9 is a validated 9-question screening used by clinicians worldwide. It takes under 2 minutes and helps us personalise your experience.
        </p>
        <div style={{display:"flex",gap:10,flexDirection:"column"}}>
          <button className="btn-primary" style={{padding:"11px"}} onClick={() => setStep(1)}>Start check-in →</button>
          <button onClick={onSkip} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",padding:"6px"}}>Skip for now</button>
        </div>
      </div>
    </div>
  );

  if (step >= 1 && step <= 9) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",animation:"slideUp .3s ease"}}>
        {/* Progress */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{color:C.muted,fontSize:12}}>Question {step} of 9</span>
            <span style={{color:C.muted,fontSize:12}}>{progress}%</span>
          </div>
          <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2}}>
            <div style={{height:4,background:`linear-gradient(90deg,${C.violet},${C.aqua})`,borderRadius:2,width:`${progress}%`,transition:"width .3s"}}/>
          </div>
        </div>
        <p style={{color:C.subtle,fontSize:12,marginBottom:8,fontWeight:600}}>Over the last 2 weeks, how often have you been bothered by…</p>
        <h3 style={{color:C.text,fontSize:15,fontWeight:700,marginBottom:20,lineHeight:1.5}}>{q}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {PHQ9_OPTIONS.map((opt, i) => (
            <button key={i} onClick={() => { setAnswers(a => ({...a,[step]:i})); setTimeout(() => setStep(s => s < 9 ? s+1 : 10), 120); }}
              style={{background:answers[step]===i?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.04)",border:`1px solid ${answers[step]===i?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"12px 16px",color:answers[step]===i?"#A78BFA":C.subtle,fontSize:14,cursor:"pointer",textAlign:"left",fontWeight:answers[step]===i?700:400}}>
              <span style={{color:C.muted,fontSize:12,marginRight:8}}>{i}</span>{opt}
            </button>
          ))}
        </div>
        {step > 1 && <button onClick={() => setStep(s => s-1)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginTop:12}}>← Back</button>}
      </div>
    </div>
  );

  const total = Object.values(answers).reduce((a,b) => a+b, 0);
  const severity = total <= 4 ? 'Minimal' : total <= 9 ? 'Mild' : total <= 14 ? 'Moderate' : total <= 19 ? 'Moderately severe' : 'Severe';
  const color = total <= 4 ? C.aqua : total <= 9 ? '#4ADE80' : total <= 14 ? '#FCD34D' : total <= 19 ? '#F97316' : '#EF4444';

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",animation:"slideUp .3s ease",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>✅</div>
        <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:8}}>Check-in complete</h2>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{fontSize:36,fontWeight:800,color,marginBottom:4}}>{total}/27</div>
          <div style={{color,fontSize:16,fontWeight:700}}>{severity} symptoms</div>
          {total >= 10 && <p style={{color:C.muted,fontSize:12,marginTop:8}}>Connecting with a therapist could be helpful. You'll find them in the Therapists tab.</p>}
          {total < 10 && <p style={{color:C.muted,fontSize:12,marginTop:8}}>You're doing okay. Keep using the daily check-in to track your wellbeing over time.</p>}
        </div>
        <button className="btn-primary" style={{width:"100%",padding:"11px"}} disabled={saving} onClick={finish}>
          {saving ? "Saving…" : "Continue to MindBridge →"}
        </button>
      </div>
    </div>
  );
}

// ── Wellbeing Tab (mood + safety plan + session history) ───────────────────────
function WellbeingTab({ user }) {
  const [moods, setMoods] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [safetyPlan, setSafetyPlan] = useState(null);
  const [outcomes, setOutcomes] = useState(null);
  const [section, setSection] = useState("mood"); // mood | safety | history | assessment
  const [moodInput, setMoodInput] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [savingMood, setSavingMood] = useState(false);
  const [safetyForm, setSafetyForm] = useState(null);
  const [savingSafety, setSavingSafety] = useState(false);
  const [safetySaved, setSafetySaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      wellbeingAPI.getMoods(),
      wellbeingAPI.getSafetyPlan(),
      wellbeingAPI.getOutcomes(),
      wellbeingAPI.getAssessments(),
      wellbeingAPI.getSessions(),
    ]).then(([m, sp, out, ass, sess]) => {
      setMoods(Array.isArray(m) ? m.slice(0, 30) : []);
      if (sp) { setSafetyPlan(sp); setSafetyForm(sp); }
      else { const blank = {warning_signs:[],coping_strategies:[],reasons_to_live:[],support_contacts:[],professional_contacts:[],crisis_number:"+256787671827",environment_safety:""}; setSafetyPlan(blank); setSafetyForm(blank); }
      setOutcomes(out);
      setAssessments(Array.isArray(ass) ? ass : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setLoading(false);
    });
  }, []);

  async function logMood() {
    if (moodInput === null) return;
    setSavingMood(true);
    await wellbeingAPI.addMood(moodInput, moodNote);
    const m = await wellbeingAPI.getMoods();
    setMoods(Array.isArray(m) ? m.slice(0, 30) : []);
    setMoodInput(null); setMoodNote("");
    setSavingMood(false);
  }

  async function saveSafety() {
    if (!safetyForm) return;
    setSavingSafety(true);
    await wellbeingAPI.saveSafetyPlan(safetyForm);
    setSafetySaved(true);
    setTimeout(() => setSafetySaved(false), 3000);
    setSavingSafety(false);
  }

  function ArrayField({ label, value, onChange }) {
    const [newItem, setNewItem] = useState("");
    return (
      <div style={{marginBottom:16}}>
        <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:8,letterSpacing:"0.05em"}}>{label}</label>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:6}}>
          {(value||[]).map((item, i) => (
            <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.text}}>{item}</div>
              <button onClick={() => onChange(value.filter((_,j)=>j!==i))} style={{background:"rgba(239,68,68,0.1)",border:"none",borderRadius:6,padding:"6px 8px",color:"#F87171",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newItem.trim()){onChange([...(value||[]),newItem.trim()]);setNewItem("");}}} placeholder="Add item…"
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          <button onClick={()=>{if(newItem.trim()){onChange([...(value||[]),newItem.trim()]);setNewItem("");}}} style={{background:`${C.violet}22`,border:`1px solid ${C.violet}44`,borderRadius:8,padding:"8px 12px",color:"#A78BFA",fontSize:13,cursor:"pointer"}}>+</button>
        </div>
      </div>
    );
  }

  // Mini bar chart for moods (last 7 days)
  const last7 = moods.slice(0, 7).reverse();
  const moodColor = s => s >= 7 ? C.aqua : s >= 4 ? "#FCD34D" : "#EF4444";
  const latestScore = moods[0]?.score;

  if (loading) return <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 80px"}}>
      {/* Summary header */}
      <div style={{marginBottom:16}}>
        <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Your Wellbeing</h2>
        <p style={{color:C.muted,fontSize:13}}>Track your mood, safety plan, and session history</p>
      </div>

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
        {[
          {label:"Latest mood", value: latestScore !== undefined ? `${latestScore}/10` : "—", color: latestScore !== undefined ? moodColor(latestScore) : C.muted},
          {label:"Sessions", value: sessions.length, color: C.violet},
          {label:"Assessments", value: assessments.length, color: C.aqua},
        ].map(s => (
          <div key={s.label} className="glass" style={{borderRadius:14,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
        {[{id:"mood",label:"Mood"},{ id:"safety",label:"Safety Plan"},{id:"history",label:"Sessions"},{id:"assessment",label:"Assessments"}].map(s => (
          <button key={s.id} onClick={()=>setSection(s.id)}
            style={{flexShrink:0,borderRadius:50,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid",
              background:section===s.id?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)",
              borderColor:section===s.id?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",
              color:section===s.id?"#A78BFA":C.muted}}>{s.label}</button>
        ))}
      </div>

      {/* ── Mood section ── */}
      {section === "mood" && (
        <div>
          {/* Log mood */}
          <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
            <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:10}}>How are you feeling right now?</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={()=>setMoodInput(n)}
                  style={{width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                    background:moodInput===n?moodColor(n):"rgba(255,255,255,0.06)",
                    color:moodInput===n?"#fff":C.muted,transition:"all .15s"}}>
                  {n}
                </button>
              ))}
            </div>
            {moodInput !== null && (
              <div style={{animation:"fadeUp .2s ease"}}>
                <textarea value={moodNote} onChange={e=>setMoodNote(e.target.value)} placeholder="Optional note about your mood…" rows={2}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
                <button onClick={logMood} disabled={savingMood} className="btn-primary" style={{padding:"8px 20px",fontSize:13}}>
                  {savingMood?"Saving…":"Log mood"}
                </button>
              </div>
            )}
          </div>

          {/* 7-day trend */}
          {last7.length > 0 && (
            <div className="glass" style={{borderRadius:16,padding:16}}>
              <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:14}}>7-day trend</div>
              <div style={{display:"flex",gap:8,alignItems:"flex-end",height:80}}>
                {last7.map((m, i) => (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:"100%",borderRadius:"4px 4px 0 0",background:moodColor(m.score),height:`${(m.score/10)*70}px`,minHeight:4,transition:"height .4s"}}/>
                    <div style={{fontSize:9,color:C.muted,textAlign:"center"}}>{new Date(m.created_at).toLocaleDateString([],{weekday:"short"})}</div>
                  </div>
                ))}
              </div>
              {outcomes && (
                <div style={{marginTop:12,display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[
                    {label:"Avg mood (30d)", value: outcomes.avg_mood ? outcomes.avg_mood.toFixed(1) : "—"},
                    {label:"Best day", value: outcomes.max_mood || "—"},
                    {label:"Total moods logged", value: outcomes.mood_count || 0},
                  ].map(s => (
                    <div key={s.label} style={{fontSize:12,color:C.muted}}><strong style={{color:C.subtle}}>{s.value}</strong> {s.label}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {last7.length === 0 && <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No mood entries yet. Log your first one above!</div>}
        </div>
      )}

      {/* ── Safety plan section ── */}
      {section === "safety" && safetyForm && (
        <div>
          <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:14,padding:"12px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:16}}>🚨</span>
            <p style={{color:C.muted,fontSize:12,lineHeight:1.6}}>
              Your personal safety plan. In a crisis, call <strong style={{color:C.subtle}}>+256787671827</strong> immediately.
            </p>
          </div>
          <ArrayField label="WARNING SIGNS (thoughts/feelings/situations)" value={safetyForm.warning_signs} onChange={v=>setSafetyForm(f=>({...f,warning_signs:v}))}/>
          <ArrayField label="COPING STRATEGIES (things I can do alone)" value={safetyForm.coping_strategies} onChange={v=>setSafetyForm(f=>({...f,coping_strategies:v}))}/>
          <ArrayField label="REASONS TO LIVE" value={safetyForm.reasons_to_live} onChange={v=>setSafetyForm(f=>({...f,reasons_to_live:v}))}/>
          <ArrayField label="PEOPLE I CAN REACH OUT TO" value={safetyForm.support_contacts} onChange={v=>setSafetyForm(f=>({...f,support_contacts:v}))}/>
          <ArrayField label="PROFESSIONAL CONTACTS" value={safetyForm.professional_contacts} onChange={v=>setSafetyForm(f=>({...f,professional_contacts:v}))}/>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:8,letterSpacing:"0.05em"}}>ENVIRONMENT SAFETY STEPS</label>
            <textarea value={safetyForm.environment_safety||""} onChange={e=>setSafetyForm(f=>({...f,environment_safety:e.target.value}))} rows={3} placeholder="Steps I've taken to make my environment safer…"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={saveSafety} disabled={savingSafety} className="btn-primary" style={{padding:"10px 24px"}}>
              {savingSafety?"Saving…":"Save plan"}
            </button>
            {safetySaved && <span style={{color:C.aqua,fontSize:13,fontWeight:600}}>Saved ✓</span>}
          </div>
        </div>
      )}

      {/* ── Session history ── */}
      {section === "history" && (
        <div>
          {sessions.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No sessions yet. Start a module to begin.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {sessions.map(s => {
                const mod = MODULES.find(m => m.id === s.module);
                return (
                  <div key={s.id} className="glass" style={{borderRadius:14,padding:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:s.summary?8:0}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${mod?.color||C.violet}18`,border:`1px solid ${mod?.color||C.violet}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{mod?.icon||"✦"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:C.text,fontWeight:700,fontSize:13}}>{mod?.label||s.module}</div>
                        <div style={{color:C.muted,fontSize:11}}>{new Date(s.created_at).toLocaleDateString()} · {s.message_count||0} messages</div>
                      </div>
                      {s.crisis_flag && <span style={{fontSize:10,color:"#F87171",background:"rgba(239,68,68,0.1)",borderRadius:50,padding:"2px 8px"}}>⚠ Crisis</span>}
                    </div>
                    {s.summary && <div style={{color:C.muted,fontSize:12,lineHeight:1.5,borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>{s.summary}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Assessments ── */}
      {section === "assessment" && (
        <div>
          {assessments.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No assessments yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {assessments.map(a => {
                const col = a.total_score <= 4 ? C.aqua : a.total_score <= 9 ? '#4ADE80' : a.total_score <= 14 ? '#FCD34D' : '#EF4444';
                return (
                  <div key={a.id} className="glass" style={{borderRadius:14,padding:14,display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:`${col}18`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:col,fontWeight:800,fontSize:16}}>{a.total_score}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:13}}>{a.type.toUpperCase()} · <span style={{color:col}}>{a.severity}</span></div>
                      <div style={{color:C.muted,fontSize:11}}>{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Clinical Notes Tab (Therapist) ─────────────────────────────────────────────
function ClinicalNotesTab({ user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState({patient:"",session_date:new Date().toISOString().split("T")[0],subjective:"",objective:"",assessment:"",plan:""});
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    Promise.all([therapistAPI.getClinicalNotes(), therapistAPI.listConnections()]).then(([n, c]) => {
      setNotes(Array.isArray(n) ? n : []);
      setConnections(Array.isArray(c) ? c.filter(x=>x.status==="accepted") : []);
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    if (editNote) {
      await therapistAPI.updateClinicalNote(editNote.id, form);
    } else {
      await therapistAPI.createClinicalNote(form);
    }
    const n = await therapistAPI.getClinicalNotes();
    setNotes(Array.isArray(n) ? n : []);
    setShowForm(false); setEditNote(null);
    setForm({patient:"",session_date:new Date().toISOString().split("T")[0],subjective:"",objective:"",assessment:"",plan:""});
    setSaving(false);
  }

  if (loading) return <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>;

  if (showForm || editNote) return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>{setShowForm(false);setEditNote(null);}} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button>
        <h2 style={{color:C.text,fontSize:16,fontWeight:800,fontFamily:"Georgia,serif"}}>{editNote?"Edit note":"New clinical note"}</h2>
      </div>
      <div style={{background:"rgba(124,58,237,0.06)",border:"1px solid rgba(124,58,237,0.15)",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.muted}}>
        SOAP format: <strong style={{color:C.subtle}}>S</strong>ubjective · <strong style={{color:C.subtle}}>O</strong>bjective · <strong style={{color:C.subtle}}>A</strong>ssessment · <strong style={{color:C.subtle}}>P</strong>lan
      </div>
      {!editNote && (
        <div style={{marginBottom:14}}>
          <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>PATIENT</label>
          <select value={form.patient} onChange={e=>setForm(f=>({...f,patient:e.target.value}))}
            style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:form.patient?C.text:C.muted,outline:"none",fontFamily:"system-ui,sans-serif"}}>
            <option value="">Select patient…</option>
            {connections.map(c => <option key={c.id} value={c.patient_email}>{c.patient_name}</option>)}
          </select>
        </div>
      )}
      <div style={{marginBottom:14}}>
        <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>SESSION DATE</label>
        <input type="date" value={form.session_date} onChange={e=>setForm(f=>({...f,session_date:e.target.value}))}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
      </div>
      {[["SUBJECTIVE (patient's perspective)","subjective"],["OBJECTIVE (observations/tests)","objective"],["ASSESSMENT (diagnosis/formulation)","assessment"],["PLAN (next steps)","plan"]].map(([lbl,key]) => (
        <div key={key} style={{marginBottom:14}}>
          <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>{lbl}</label>
          <textarea value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} rows={3}
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
        </div>
      ))}
      <div style={{display:"flex",gap:10}}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{padding:"10px 24px"}}>{saving?"Saving…":"Save note"}</button>
        <button onClick={()=>{setShowForm(false);setEditNote(null);}} className="btn-ghost" style={{padding:"10px 16px"}}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:2}}>Clinical Notes</h2>
          <p style={{color:C.muted,fontSize:13}}>SOAP-format session notes</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn-primary" style={{padding:"8px 16px",fontSize:12}}>+ New note</button>
      </div>
      {notes.length === 0 ? (
        <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:40}}>No notes yet. Create your first clinical note.</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {notes.map(n => (
            <div key={n.id} className="glass" style={{borderRadius:14,padding:14}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                <div>
                  <div style={{color:C.text,fontWeight:700,fontSize:13}}>{n.patient_name || "Patient"}</div>
                  <div style={{color:C.muted,fontSize:11}}>{n.session_date} · {n.therapist_name}</div>
                </div>
                <button onClick={()=>{setEditNote(n);setForm({patient:n.patient,session_date:n.session_date,subjective:n.subjective,objective:n.objective,assessment:n.assessment,plan:n.plan});}}
                  style={{background:"rgba(124,58,237,0.1)",border:"none",borderRadius:8,padding:"4px 10px",color:"#A78BFA",fontSize:11,cursor:"pointer"}}>Edit</button>
              </div>
              {n.subjective && <div style={{fontSize:12,color:C.subtle,marginBottom:4}}><strong style={{color:C.muted}}>S:</strong> {n.subjective}</div>}
              {n.plan && <div style={{fontSize:12,color:C.subtle}}><strong style={{color:C.muted}}>P:</strong> {n.plan}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Risk Flags Tab (Therapist) ──────────────────────────────────────────────────
function RiskFlagsTab() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const f = await therapistAPI.getRiskFlags();
    setFlags(Array.isArray(f) ? f : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function resolve(id) {
    await therapistAPI.resolveRiskFlag(id);
    load();
  }

  if (loading) return <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Risk Dashboard</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Patients who have triggered crisis keywords or high-risk flags</p>
      {flags.length === 0 ? (
        <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:40}}>
          <div style={{fontSize:36,marginBottom:10}}>✅</div>
          No active risk flags. All patients appear safe.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {flags.map(f => (
            <div key={f.id} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:14}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <span style={{fontSize:20}}>🚨</span>
                <div style={{flex:1}}>
                  <div style={{color:"#FCA5A5",fontWeight:700,fontSize:13}}>{f.user_name || f.user_email}</div>
                  <div style={{color:C.muted,fontSize:11}}>{new Date(f.created_at).toLocaleString()}</div>
                </div>
                <span style={{fontSize:10,color:"#F87171",background:"rgba(239,68,68,0.1)",borderRadius:50,padding:"2px 8px",fontWeight:600}}>{f.flag_type}</span>
              </div>
              {f.message && <div style={{background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px 10px",fontSize:12,color:C.subtle,marginBottom:10,fontStyle:"italic"}}>"{f.message}"</div>}
              <button onClick={() => resolve(f.id)} style={{background:"rgba(45,212,191,0.1)",border:"1px solid rgba(45,212,191,0.25)",borderRadius:8,padding:"6px 14px",color:C.aqua,fontSize:12,cursor:"pointer",fontWeight:600}}>
                Mark resolved
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User Dashboard ─────────────────────────────────────────────────────────────
const SPECS = ['anxiety','trauma','grief','burnout','adhd','recovery','sleep','postpartum','social'];
const SPEC_LABELS = {anxiety:'Anxiety',trauma:'Trauma',grief:'Grief',burnout:'Burnout',adhd:'ADHD',recovery:'Recovery',sleep:'Sleep',postpartum:'Postpartum',social:'Social'};

function UserDashboard({ user, onSelectModule, onLogout, initialTab = "home" }) {
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [therapists, setTherapists] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [requesting, setRequesting] = useState(null);
  const [reqMsg, setReqMsg] = useState("");
  const [loadingDir, setLoadingDir] = useState(false);
  const [specFilter, setSpecFilter] = useState("");

  const filtered = MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()));
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (tab === "therapists") {
      setLoadingDir(true);
      Promise.all([therapistAPI.directory(specFilter), therapistAPI.listConnections()]).then(([dir, conns]) => {
        setTherapists(Array.isArray(dir) ? dir : []);
        setConnections(Array.isArray(conns) ? conns : []);
        setLoadingDir(false);
      });
    }
    if (tab === "messages") {
      therapistAPI.listConnections().then(data => setConnections(Array.isArray(data) ? data : []));
    }
  }, [tab, specFilter]);

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
    {id:"wellbeing", label:"Wellbeing"},
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

      {/* ── Wellbeing tab ── */}
      {tab === "wellbeing" && <WellbeingTab user={user}/>}

      {/* ── Find Therapist tab ── */}
      {tab === "therapists" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Find a Therapist</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:12}}>Connect with a licensed mental health professional</p>
          {/* Specialization filter chips */}
          <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:16,WebkitOverflowScrolling:"touch"}}>
            <button onClick={() => setSpecFilter("")}
              style={{flexShrink:0,borderRadius:50,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid",
                background:specFilter===""?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)",
                borderColor:specFilter===""?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",
                color:specFilter===""?"#A78BFA":C.muted}}>All</button>
            {SPECS.map(s => (
              <button key={s} onClick={() => setSpecFilter(s === specFilter ? "" : s)}
                style={{flexShrink:0,borderRadius:50,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid",
                  background:specFilter===s?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)",
                  borderColor:specFilter===s?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",
                  color:specFilter===s?"#A78BFA":C.muted}}>{SPEC_LABELS[s]}</button>
            ))}
          </div>
          {loadingDir ? (
            <div style={{display:"flex",justifyContent:"center",paddingTop:40}}><Spinner/></div>
          ) : therapists.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:14,paddingTop:40}}>
              {specFilter ? `No therapists found for "${SPEC_LABELS[specFilter]}".` : "No therapists available right now."}
              {specFilter && <div style={{marginTop:10}}><button onClick={() => setSpecFilter("")} style={{background:"none",border:"none",color:C.aqua,cursor:"pointer",fontSize:13}}>Clear filter</button></div>}
            </div>
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
    {id:"notes", label:"Notes"},
    {id:"risk", label:"Risk"},
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

      {!loading && tab === "notes" && <ClinicalNotesTab user={user}/>}
      {!loading && tab === "risk" && <RiskFlagsTab/>}

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
  const [defaultUserTab, setDefaultUserTab] = useState("home");
  const [showConsent, setShowConsent] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (authAPI.isLoggedIn()) {
      authAPI.me().then(data => {
        if (data) {
          setUser(data);
          setScreen("home");
          // Show consent once
          if (!localStorage.getItem('mb_consent') && data.role !== 'therapist' && data.role !== 'admin') {
            setShowConsent(true);
          }
        }
        setLoading(false);
      });
    } else { setLoading(false); }
  }, []);

  function handleConsentAccept() {
    localStorage.setItem('mb_consent', '1');
    setShowConsent(false);
    // Check if we should show onboarding (only for regular users)
    if (user?.role !== 'therapist' && user?.role !== 'admin') {
      wellbeingAPI.getAssessments().then(a => {
        if (!Array.isArray(a) || a.length === 0) setShowOnboarding(true);
      });
    }
  }

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
    return <ChatModule
      mod={activeModule} user={user}
      onBack={() => { setActiveModule(null); setScreen("home"); }}
      onOpenTherapists={() => { setDefaultUserTab("therapists"); setActiveModule(null); setScreen("home"); }}
    />;
  }

  if (screen === "home") {
    if (user?.role === "therapist" || user?.role === "admin") {
      return <TherapistDashboard user={user} onLogout={handleLogout}/>;
    }
    return (
      <>
        {showConsent && <ConsentModal onAccept={handleConsentAccept}/>}
        {!showConsent && showOnboarding && (
          <OnboardingModal
            onComplete={(score, severity) => { setShowOnboarding(false); }}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
        <UserDashboard
          user={user}
          initialTab={defaultUserTab}
          onSelectModule={mod => { setDefaultUserTab("home"); setActiveModule(mod); setScreen("module"); }}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return null;
}
