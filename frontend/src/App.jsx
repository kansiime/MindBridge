import { authAPI, chatAPI } from "./api";
import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#0A0818", surface:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.08)",
  violet:"#7C3AED", violetDim:"#5B21B6", aqua:"#2DD4BF",
  text:"#F1F5F9", muted:"#64748B", subtle:"#94A3B8",
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

// ── Shared ───────────────────────────────────────────────────────────────────
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

// ── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await authAPI.login(email, password);
    if (result.ok) {
      onLogin(result.user);
    } else {
      const err = result.error;
      setError(err?.detail || err?.non_field_errors?.[0] || err?.email?.[0] || "Invalid email or password");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}} className="animate-slide-up">
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

// ── Register ─────────────────────────────────────────────────────────────────
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
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}} className="animate-slide-up">
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

// ── Chat ─────────────────────────────────────────────────────────────────────
function ChatModule({ mod, user, onBack }) {
  const [messages, setMessages] = useState([{id:"intro",role:"assistant",content:INTROS[mod.id]||"How are you feeling?",created_at:new Date().toISOString()}]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionIdRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    chatAPI.createSession(mod.id).then(data => {
      const sid = data?.data?.id || data?.id;
      if (sid) {
        sessionIdRef.current = sid;
        console.log('[APP] session ready:', sid);
        if (pendingRef.current) {
          const msg = pendingRef.current;
          pendingRef.current = null;
          sendMsg(msg);
        }
      } else {
        console.error('[APP] session create failed:', data);
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

  const chips = CHIPS[mod.id] || [];

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"system-ui,sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:500,height:180,background:`radial-gradient(ellipse,${mod.color}14,transparent 70%)`,pointerEvents:"none"}}/>

      {/* Header */}
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

      {/* Messages */}
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

      {/* Chips */}
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
          <button onClick={() => setShowChips(true)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer"}}>+ Suggestions</button>
        )}
      </div>

      {/* Crisis */}
      {crisisVisible && (
        <div style={{padding:"9px 16px",background:"rgba(239,68,68,0.1)",borderTop:"1px solid rgba(239,68,68,0.2)",display:"flex",alignItems:"center",gap:10,flexShrink:0,zIndex:2}}>
          <span>🚨</span>
          <div style={{flex:1,fontSize:12}}><span style={{color:"#FCA5A5",fontWeight:600}}>You matter. </span><span style={{color:C.muted}}>Call <strong style={{color:C.subtle}}>+256787671827</strong> — 24/7</span></div>
          <button onClick={() => setCrisisVisible(false)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
        </div>
      )}

      {/* Input */}
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
    </div>
  );
}

// ── Home Dashboard ────────────────────────────────────────────────────────────
function Home({ user, onSelect, onLogout }) {
  const [search, setSearch] = useState("");
  const filtered = MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()));
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  async function handleLogout() { await authAPI.logout(); onLogout(); }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",paddingBottom:80}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{position:"relative",padding:"28px 20px 20px",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.1),transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={48}/>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.18em",color:C.aqua,fontWeight:700,textTransform:"uppercase"}}>Mental wellness</div>
              <h1 style={{color:C.text,fontSize:22,fontWeight:800,fontFamily:"Georgia,serif"}}>Mind<span style={{color:C.aqua}}>Bridge</span></h1>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:C.muted,fontSize:13}}>Hi, {firstName}</span>
              <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:50,padding:"5px 12px",color:C.muted,fontSize:12,cursor:"pointer"}}>Sign out</button>
            </div>
          </div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted}}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:50,padding:"10px 16px 10px 36px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div style={{padding:"0 20px"}}>
        <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>All modules · {filtered.length}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(mod => (
            <button key={mod.id} className="mod-card" onClick={() => onSelect(mod)}
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

      {/* Crisis footer */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 20px",background:"rgba(10,8,24,0.95)",backdropFilter:"blur(12px)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,zIndex:50}}>
        <span>🚨</span>
        <span style={{color:C.muted,fontSize:12,flex:1}}>In crisis? Call <strong style={{color:C.subtle}}>+256787671827</strong> — free, confidential, 24/7</span>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
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

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={80}/>
    </div>
  );

  if (screen === "register") return <RegisterScreen onLogin={u => { setUser(u); setScreen("home"); }} onGoLogin={() => setScreen("login")}/>;
  if (screen === "login")    return <LoginScreen    onLogin={u => { setUser(u); setScreen("home"); }} onGoRegister={() => setScreen("register")}/>;
  if (screen === "module" && activeModule) return <ChatModule mod={activeModule} user={user} onBack={() => { setActiveModule(null); setScreen("home"); }}/>;

  return <Home user={user} onSelect={mod => { setActiveModule(mod); setScreen("module"); }} onLogout={() => { setUser(null); setScreen("login"); }}/>;
}
