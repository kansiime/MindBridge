import { authAPI, chatAPI, therapistAPI, wellbeingAPI, accountAPI } from "./api";
import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";

// ── i18n ──────────────────────────────────────────────────────────────────────
const LangCtx = createContext('en');
const useLang = () => useContext(LangCtx);

const TR = {
  en: {
    appTagline: "Mental Wellness",
    signIn: "Sign in to continue your wellness journey",
    email: "EMAIL", password: "PASSWORD",
    signInBtn: "Sign in →", createAccount: "Create account →",
    noAccount: "No account?", createFree: "Create one free",
    haveAccount: "Already have an account?", signInLink: "Sign in",
    greeting: n => `Good to see you, ${n}`,
    chooseModule: "Choose a module to start your session",
    allModules: n => `All modules · ${n}`,
    search: "Search modules…",
    tabModules: "Modules", tabWellbeing: "Wellbeing", tabTherapists: "Find Therapist",
    tabMyTherapist: "My Therapist", tabAccount: "Account",
    crisisMsg: "In crisis? Call",
    findTherapist: "Find a Therapist",
    findTherapistSub: "Connect with a licensed mental health professional",
    myTherapist: "My Therapist", myTherapistSub: "Your active connections",
    signOut: "Sign out", hi: "Hi,",
    wellbeing: "Your Wellbeing", wellbeingSub: "Track your mood, safety plan, and session history",
  },
  sw: {
    appTagline: "Afya ya Akili",
    signIn: "Ingia kuendelea na safari yako ya ustawi",
    email: "BARUA PEPE", password: "NENOSIRI",
    signInBtn: "Ingia →", createAccount: "Tengeneza akaunti →",
    noAccount: "Huna akaunti?", createFree: "Tengeneza bure",
    haveAccount: "Una akaunti tayari?", signInLink: "Ingia",
    greeting: n => `Karibu tena, ${n}`,
    chooseModule: "Chagua moduli kuanza kikao chako",
    allModules: n => `Moduli zote · ${n}`,
    search: "Tafuta moduli…",
    tabModules: "Moduli", tabWellbeing: "Ustawi", tabTherapists: "Tafuta Daktari",
    tabMyTherapist: "Daktari Wangu", tabAccount: "Akaunti",
    crisisMsg: "Uko katika msongo? Piga simu",
    findTherapist: "Tafuta Daktari",
    findTherapistSub: "Unganisha na mtaalamu wa afya ya akili aliyeidhinishwa",
    myTherapist: "Daktari Wangu", myTherapistSub: "Miunganisho yako inayotumiwa",
    signOut: "Toka", hi: "Habari,",
    wellbeing: "Ustawi Wako", wellbeingSub: "Fuatilia hali yako ya kihisia na mpango wa usalama",
  },
};

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
  *:focus-visible{outline:2px solid #7C3AED;outline-offset:2px;}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important;}}
  @media (prefers-color-scheme:light){:root{--bg:#f8f7ff;}}
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

function NavBar({ user, onLogout, tab, onTab, tabs, lang, onLangToggle }) {
  const t = TR[lang] || TR.en;
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  return (
    <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg}} role="navigation" aria-label="Main navigation">
      <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={32}/>
      <span style={{color:C.text,fontWeight:800,fontSize:17,fontFamily:"Georgia,serif"}}>Mind<span style={{color:C.aqua}}>Bridge</span></span>
      <div style={{flex:1,display:"flex",gap:4,justifyContent:"center",overflowX:"auto"}}>
        {tabs.map(tb => (
          <button key={tb.id} className={`tab${tab===tb.id?" active":""}`} onClick={() => onTab(tb.id)} aria-current={tab===tb.id?"page":undefined}>{tb.label}</button>
        ))}
      </div>
      <span style={{color:C.muted,fontSize:12}}>{t.hi} {firstName}</span>
      {onLangToggle && (
        <button onClick={onLangToggle} aria-label={`Switch to ${lang==='en'?'Swahili':'English'}`}
          style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:11,color:C.muted,cursor:"pointer",fontWeight:700,flexShrink:0}}>
          {lang==='en'?'SW':'EN'}
        </button>
      )}
      <button onClick={onLogout} className="btn-ghost" style={{padding:"5px 12px",fontSize:12}} aria-label={t.signOut}>{t.signOut}</button>
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
  const [ageGate, setAgeGate] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ageGate) { setError("You must confirm you are 18 or older"); return; }
    if (!tosAccepted) { setError("Please accept the Terms of Service to continue"); return; }
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
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:10}}>
              <input type="checkbox" checked={ageGate} onChange={e => setAgeGate(e.target.checked)} style={{marginTop:3,width:16,height:16,accentColor:C.violet,flexShrink:0}}/>
              <span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>I confirm I am <strong style={{color:C.subtle}}>18 years of age or older</strong></span>
            </label>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:16}}>
              <input type="checkbox" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)} style={{marginTop:3,width:16,height:16,accentColor:C.violet,flexShrink:0}}/>
              <span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>I agree to the <strong style={{color:C.aqua}}>Terms of Service</strong> and <strong style={{color:C.aqua}}>Privacy Policy</strong></span>
            </label>
            <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.violet},${C.violetDim})`,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 0 24px rgba(124,58,237,0.4)"}}>
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

// ── Idle timeout auto-logout ─────────────────────────────────────────────────
function useIdleTimeout(onTimeout, minutes = 20) {
  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, minutes * 60 * 1000);
    };
    const events = ["mousemove","keydown","touchstart","click","scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [onTimeout, minutes]);
}

// ── ToS Modal ─────────────────────────────────────────────────────────────────
function ToSModal({ onAccept }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="glass" style={{borderRadius:20,padding:28,maxWidth:480,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",gap:16}}>
        <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif"}}>Terms of Service & Privacy</h2>
        <div style={{flex:1,overflowY:"auto",fontSize:13,color:C.muted,lineHeight:1.7,display:"flex",flexDirection:"column",gap:10}}>
          <p><strong style={{color:C.subtle}}>MindBridge</strong> is a mental health support tool. It is <strong>not a replacement</strong> for professional care or emergency services.</p>
          <p><strong style={{color:C.subtle}}>Data we collect:</strong> Account information, mood entries, chat sessions, and assessments to provide the service. Governed by the Uganda Data Protection and Privacy Act 2019.</p>
          <p><strong style={{color:C.subtle}}>Data sharing:</strong> Therapists you connect with can see your mood trends and session summaries. We never sell your data.</p>
          <p><strong style={{color:C.subtle}}>Crisis situations:</strong> In life-threatening situations, we may contact emergency services or provide your information to crisis responders.</p>
          <p><strong style={{color:C.subtle}}>Data retention:</strong> You may export or delete your data at any time from Account Settings.</p>
          <p style={{fontSize:11,color:C.muted}}>Version 1.0 — June 2026</p>
        </div>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{marginTop:2,width:16,height:16,accentColor:C.violet}}/>
          <span style={{fontSize:13,color:C.subtle,lineHeight:1.5}}>I have read and agree to the Terms of Service and Privacy Policy. I confirm I am 18 years of age or older.</span>
        </label>
        <button onClick={onAccept} disabled={!accepted} className="btn-primary" style={{width:"100%",padding:13,opacity:accepted?1:0.4}}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Breathing Exercise ────────────────────────────────────────────────────────
function BreathingExercise({ onClose }) {
  const phases = [
    {label:"Inhale",duration:4,color:C.aqua},
    {label:"Hold",duration:4,color:"#FCD34D"},
    {label:"Exhale",duration:4,color:C.violet},
    {label:"Hold",duration:4,color:"#F97316"},
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(phases[0].duration);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          setPhaseIdx(p => {
            const next = (p + 1) % phases.length;
            setCount(phases[next].duration);
            return next;
          });
          return phases[(phaseIdx + 1) % phases.length].duration;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [running, phaseIdx]);

  const phase = phases[phaseIdx];
  const progress = 1 - (count / phase.duration);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,8,24,0.95)",zIndex:1800,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32}}>
      <h2 style={{color:C.text,fontSize:20,fontWeight:800,fontFamily:"Georgia,serif"}}>Box Breathing</h2>
      <div style={{position:"relative",width:180,height:180}}>
        <svg width={180} height={180} style={{position:"absolute",top:0,left:0}}>
          <circle cx={90} cy={90} r={80} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8}/>
          <circle cx={90} cy={90} r={80} fill="none" stroke={phase.color} strokeWidth={8}
            strokeDasharray={`${2*Math.PI*80}`}
            strokeDashoffset={`${2*Math.PI*80*(1-progress)}`}
            strokeLinecap="round"
            style={{transform:"rotate(-90deg)",transformOrigin:"90px 90px",transition:"stroke-dashoffset 0.9s linear"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:38,fontWeight:800,color:phase.color}}>{count}</div>
          <div style={{fontSize:14,color:C.muted,fontWeight:600}}>{phase.label}</div>
        </div>
      </div>
      <p style={{color:C.muted,fontSize:13,textAlign:"center",maxWidth:280}}>4-4-4-4 Box Breathing · Reduces anxiety and activates the parasympathetic nervous system</p>
      <div style={{display:"flex",gap:12}}>
        <button className="btn-primary" style={{padding:"10px 28px"}} onClick={() => setRunning(r => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn-ghost" style={{padding:"10px 20px"}} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ── Session Feedback Modal ────────────────────────────────────────────────────
function SessionFeedbackModal({ sessionId, onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (rating === 0) return;
    setSaving(true);
    await wellbeingAPI.submitSessionFeedback(sessionId, rating, comment);
    setSaving(false);
    onClose();
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1700,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="glass" style={{borderRadius:"20px 20px 0 0",padding:28,width:"100%",maxWidth:480,animation:"slideUp .3s ease"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:28,marginBottom:8}}>✦</div>
          <h3 style={{color:C.text,fontSize:17,fontWeight:800,fontFamily:"Georgia,serif"}}>How was this session?</h3>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Your feedback helps us improve</p>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16}}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)}
              style={{fontSize:28,background:"none",border:"none",cursor:"pointer",opacity:n <= rating ? 1 : 0.3,transition:"opacity .15s"}}>
              ⭐
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Any comments? (optional)" rows={2}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",marginBottom:14}}/>
        <div style={{display:"flex",gap:10}}>
          <button className="btn-primary" style={{flex:1,padding:"11px"}} onClick={submit} disabled={saving || rating===0}>
            {saving ? "Submitting…" : "Submit"}
          </button>
          <button className="btn-ghost" style={{padding:"11px 18px"}} onClick={onClose}>Skip</button>
        </div>
      </div>
    </div>
  );
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
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
    if (sessionIdRef.current) {
      await chatAPI.endSession(sessionIdRef.current);
      setShowFeedback(true);
    } else {
      onBack();
    }
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

  if (showBreathing) {
    return <BreathingExercise onClose={() => setShowBreathing(false)}/>;
  }

  const chips = CHIPS[mod.id] || [];

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"system-ui,sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      {showFeedback && sessionIdRef.current && (
        <SessionFeedbackModal sessionId={sessionIdRef.current} onClose={() => { setShowFeedback(false); onBack(); }}/>
      )}
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
        <button onClick={() => setShowBreathing(true)} style={{background:"rgba(45,212,191,0.08)",border:"1px solid rgba(45,212,191,0.15)",borderRadius:50,padding:"4px 10px",color:C.aqua,fontSize:11,cursor:"pointer"}} title="Breathing exercise">🫁</button>
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
  const [section, setSection] = useState("mood"); // mood | safety | history | assessment | gratitude | tasks
  const [moodInput, setMoodInput] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [savingMood, setSavingMood] = useState(false);
  const [safetyForm, setSafetyForm] = useState(null);
  const [savingSafety, setSavingSafety] = useState(false);
  const [safetySaved, setSafetySaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [gratitude, setGratitude] = useState([]);
  const [gratItems, setGratItems] = useState(["","",""]);
  const [savingGrat, setSavingGrat] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showBreathing, setShowBreathing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      wellbeingAPI.getMoods(),
      wellbeingAPI.getSafetyPlan(),
      wellbeingAPI.getOutcomes(),
      wellbeingAPI.getAssessments(),
      wellbeingAPI.getSessions(),
      wellbeingAPI.getGratitude(),
      wellbeingAPI.getPatientTasks(),
    ]).then(([m, sp, out, ass, sess, grat, tsk]) => {
      setMoods(Array.isArray(m) ? m.slice(0, 30) : []);
      if (sp) { setSafetyPlan(sp); setSafetyForm(sp); }
      else { const blank = {warning_signs:[],coping_strategies:[],reasons_to_live:[],support_contacts:[],professional_contacts:[],crisis_number:"+256787671827",environment_safety:""}; setSafetyPlan(blank); setSafetyForm(blank); }
      setOutcomes(out);
      setAssessments(Array.isArray(ass) ? ass : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setGratitude(Array.isArray(grat) ? grat : []);
      setTasks(Array.isArray(tsk) ? tsk : []);
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

  async function logGratitude() {
    const items = gratItems.filter(i => i.trim());
    if (items.length === 0) return;
    setSavingGrat(true);
    await wellbeingAPI.addGratitude(items);
    const g = await wellbeingAPI.getGratitude();
    setGratitude(Array.isArray(g) ? g : []);
    setGratItems(["","",""]);
    setSavingGrat(false);
  }

  async function completeTask(taskId) {
    await wellbeingAPI.completePatientTask(taskId);
    const tsk = await wellbeingAPI.getPatientTasks();
    setTasks(Array.isArray(tsk) ? tsk : []);
  }

  if (showBreathing) return <BreathingExercise onClose={() => setShowBreathing(false)}/>;

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

      {/* PHQ re-test reminder */}
      {(() => {
        const lastPhq = assessments.filter(a => a.type === "phq9")[0];
        if (!lastPhq) return null;
        const daysSince = Math.floor((Date.now() - new Date(lastPhq.created_at)) / 86400000);
        if (daysSince < 14) return null;
        return (
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span>📋</span>
            <p style={{color:"#FCD34D",fontSize:12,lineHeight:1.5,flex:1}}>
              It's been <strong>{daysSince} days</strong> since your last PHQ-9. Consider retaking it to track your progress.
            </p>
            <button onClick={() => setSection("assessment")} style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"5px 10px",color:"#FCD34D",fontSize:11,cursor:"pointer",flexShrink:0}}>View</button>
          </div>
        );
      })()}

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
        {[
          {label:"Latest mood", value: latestScore !== undefined ? `${latestScore}/10` : "—", color: latestScore !== undefined ? moodColor(latestScore) : C.muted},
          {label:"Streak 🔥", value: outcomes?.streak_days ? `${outcomes.streak_days}d` : "—", color: "#F97316"},
          {label:"Tasks pending", value: tasks.filter(t => !t.completed).length, color: C.aqua},
        ].map(s => (
          <div key={s.label} className="glass" style={{borderRadius:14,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
        {[{id:"mood",label:"Mood"},{id:"gratitude",label:"Gratitude"},{id:"tasks",label:"Tasks"},{id:"safety",label:"Safety Plan"},{id:"history",label:"Sessions"},{id:"assessment",label:"Assessments"}].map(s => (
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

          {/* Breathing exercise shortcut */}
          <button onClick={() => setShowBreathing(true)} className="glass" style={{width:"100%",borderRadius:14,padding:"12px 14px",marginTop:12,display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:`1px solid ${C.border}`,background:"rgba(45,212,191,0.04)"}}>
            <span style={{fontSize:22}}>🫁</span>
            <div style={{textAlign:"left"}}>
              <div style={{color:C.text,fontWeight:700,fontSize:13}}>Box Breathing</div>
              <div style={{color:C.muted,fontSize:11}}>4-4-4-4 exercise to reduce anxiety</div>
            </div>
            <span style={{marginLeft:"auto",color:C.aqua,fontSize:13}}>Start →</span>
          </button>
        </div>
      )}

      {/* ── Gratitude journal ── */}
      {section === "gratitude" && (
        <div>
          <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
            <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>Today's Gratitude</div>
            <p style={{color:C.muted,fontSize:12,marginBottom:12}}>List 3 things you're grateful for today</p>
            {gratItems.map((item, i) => (
              <input key={i} value={item} onChange={e => { const a = [...gratItems]; a[i] = e.target.value; setGratItems(a); }}
                placeholder={`Gratitude ${i + 1}…`}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
            ))}
            <button onClick={logGratitude} disabled={savingGrat || gratItems.every(i=>!i.trim())} className="btn-primary" style={{padding:"8px 20px",fontSize:13}}>
              {savingGrat ? "Saving…" : "Log gratitude"}
            </button>
          </div>
          {gratitude.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {gratitude.slice(0,10).map(g => (
                <div key={g.id} className="glass" style={{borderRadius:14,padding:14}}>
                  <div style={{color:C.muted,fontSize:11,marginBottom:6}}>{new Date(g.created_at).toLocaleDateString()}</div>
                  {(g.items||[]).map((item, i) => (
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}>
                      <span style={{color:C.aqua,fontSize:12,marginTop:1}}>✦</span>
                      <span style={{color:C.text,fontSize:13}}>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {gratitude.length === 0 && <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No gratitude entries yet. Log your first one above!</div>}
        </div>
      )}

      {/* ── Assigned tasks ── */}
      {section === "tasks" && (
        <div>
          <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:12}}>Tasks from Your Therapist</div>
          {tasks.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No tasks assigned yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {tasks.map(task => (
                <div key={task.id} className="glass" style={{borderRadius:14,padding:14,opacity:task.completed?0.6:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <button onClick={() => !task.completed && completeTask(task.id)}
                      style={{width:22,height:22,borderRadius:6,border:`2px solid ${task.completed?C.aqua:C.border}`,background:task.completed?"rgba(45,212,191,0.15)":"transparent",cursor:task.completed?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      {task.completed && <span style={{color:C.aqua,fontSize:13}}>✓</span>}
                    </button>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:13,textDecoration:task.completed?"line-through":"none"}}>{task.title}</div>
                      {task.description && <div style={{color:C.muted,fontSize:12,marginTop:3}}>{task.description}</div>}
                      {task.due_date && <div style={{color:"#FCD34D",fontSize:11,marginTop:4}}>Due: {new Date(task.due_date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

// ── GAD-7 Anxiety Screen ──────────────────────────────────────────────────────
const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];
const GAD7_OPTIONS = ["Not at all","Several days","More than half the days","Nearly every day"];

function GAD7Modal({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  if (step === 0) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} role="dialog" aria-modal="true" aria-labelledby="gad7-title">
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",animation:"slideUp .3s ease",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚡</div>
        <h2 id="gad7-title" style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:8}}>Anxiety check-in (GAD-7)</h2>
        <p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:20}}>
          The GAD-7 is the gold-standard 7-question anxiety screen used by clinicians worldwide. Takes under 90 seconds.
        </p>
        <div style={{display:"flex",gap:10,flexDirection:"column"}}>
          <button className="btn-primary" style={{padding:"11px"}} onClick={() => setStep(1)}>Start →</button>
          <button onClick={onSkip} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",padding:"6px"}}>Skip for now</button>
        </div>
      </div>
    </div>
  );

  if (step >= 1 && step <= 7) {
    const q = GAD7_QUESTIONS[step-1];
    const progress = Math.round((step/7)*100);
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} role="dialog" aria-modal="true">
        <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",animation:"slideUp .3s ease"}}>
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:C.muted,fontSize:12}}>Question {step} of 7</span>
              <span style={{color:C.muted,fontSize:12}}>{progress}%</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2}}>
              <div style={{height:4,background:`linear-gradient(90deg,#F97316,#EF4444)`,borderRadius:2,width:`${progress}%`,transition:"width .3s"}}/>
            </div>
          </div>
          <p style={{color:C.subtle,fontSize:12,marginBottom:8,fontWeight:600}}>Over the last 2 weeks, how often have you been bothered by…</p>
          <h3 style={{color:C.text,fontSize:15,fontWeight:700,marginBottom:20,lineHeight:1.5}}>{q}</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {GAD7_OPTIONS.map((opt, i) => (
              <button key={i} onClick={() => { setAnswers(a => ({...a,[step]:i})); setTimeout(() => setStep(s => s < 7 ? s+1 : 8), 120); }}
                style={{background:answers[step]===i?"rgba(249,115,22,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${answers[step]===i?"rgba(249,115,22,0.5)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"12px 16px",color:answers[step]===i?"#FB923C":C.subtle,fontSize:14,cursor:"pointer",textAlign:"left",fontWeight:answers[step]===i?700:400}}>
                <span style={{color:C.muted,fontSize:12,marginRight:8}}>{i}</span>{opt}
              </button>
            ))}
          </div>
          {step > 1 && <button onClick={() => setStep(s => s-1)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginTop:12}}>← Back</button>}
        </div>
      </div>
    );
  }

  const total = Object.values(answers).reduce((a,b)=>a+b,0);
  const severity = total <= 4 ? 'Minimal' : total <= 9 ? 'Mild' : total <= 14 ? 'Moderate' : 'Severe';
  const color = total <= 4 ? C.aqua : total <= 9 ? '#4ADE80' : total <= 14 ? '#FCD34D' : '#EF4444';

  async function finish() {
    setSaving(true);
    const responses = {};
    for (let i=1;i<=7;i++) responses[`q${i}`] = answers[i]??0;
    await wellbeingAPI.createAssessment('gad7', responses, total, severity.toLowerCase());
    setSaving(false);
    onComplete(total, severity);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} role="dialog" aria-modal="true">
      <div style={{background:"#13102A",borderRadius:20,padding:28,maxWidth:420,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>✅</div>
        <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:8}}>GAD-7 complete</h2>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{fontSize:36,fontWeight:800,color,marginBottom:4}}>{total}/21</div>
          <div style={{color,fontSize:16,fontWeight:700}}>{severity} anxiety</div>
          {total >= 10 && <p style={{color:C.muted,fontSize:12,marginTop:8}}>Consider speaking to a therapist. Your results will be shared with your connected therapist if you have one.</p>}
        </div>
        <button className="btn-primary" style={{width:"100%",padding:"11px"}} disabled={saving} onClick={finish}>
          {saving ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

// ── Crisis Escalation Chain ───────────────────────────────────────────────────
function CrisisChainModal({ onClose, connectedTherapist }) {
  const [step, setStep] = useState(1); // 1=safety plan, 2=contact therapist, 3=emergency
  const [notified, setNotified] = useState(false);

  async function notifyTherapist() {
    if (connectedTherapist) {
      await therapistAPI.sendDirectMessage(connectedTherapist.id,
        "🚨 I may be in crisis. I am reaching out for support right now.");
    }
    setNotified(true);
    setTimeout(() => setStep(3), 1500);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} role="dialog" aria-modal="true" aria-labelledby="crisis-title">
      <div style={{background:"#1a0a0a",border:"1px solid rgba(239,68,68,0.4)",borderRadius:20,padding:28,maxWidth:440,width:"100%",animation:"slideUp .3s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:28}}>🆘</span>
          <h2 id="crisis-title" style={{color:"#FCA5A5",fontSize:18,fontWeight:800,fontFamily:"Georgia,serif"}}>
            {step===1?"Your safety plan":step===2?"Contact your therapist":"Emergency support"}
          </h2>
        </div>

        {/* Progress steps */}
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          {[1,2,3].map(s => (
            <div key={s} style={{flex:1,height:3,borderRadius:2,background:step>=s?"#EF4444":"rgba(255,255,255,0.1)"}}/>
          ))}
        </div>

        {step === 1 && (
          <div>
            <p style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>
              Before anything else — remember your safety plan. You made it for moments like this.
            </p>
            {[
              "🛑 Notice the warning sign you're experiencing",
              "💭 Use a coping strategy from your list",
              "💛 Think of one reason to live",
              "📱 Call someone on your support contacts",
            ].map((s, i) => (
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                <span style={{fontSize:16,flexShrink:0}}></span>
                <span style={{color:C.subtle,fontSize:13}}>{s}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn-primary" style={{flex:1,padding:"10px"}} onClick={() => setStep(2)}>Next step →</button>
              <button onClick={onClose} className="btn-ghost" style={{padding:"10px 14px",fontSize:12}}>I'm okay</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>
              {connectedTherapist
                ? `Send an alert to your therapist (${connectedTherapist.therapist?.full_name || "your therapist"}) right now.`
                : "You don't have a connected therapist yet. Connect with one in the Therapists tab."}
            </p>
            {notified && (
              <div style={{background:"rgba(45,212,191,0.08)",border:"1px solid rgba(45,212,191,0.25)",borderRadius:12,padding:"10px 14px",marginBottom:16,color:C.aqua,fontSize:13}}>
                ✓ Alert sent. Your therapist has been notified.
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              {connectedTherapist && !notified && (
                <button className="btn-primary" style={{flex:1,padding:"10px",background:"linear-gradient(135deg,#EF4444,#B91C1C)"}} onClick={notifyTherapist}>
                  🚨 Alert therapist now
                </button>
              )}
              <button onClick={() => setStep(3)} className="btn-ghost" style={{padding:"10px 14px",fontSize:12}}>
                {notified ? "Continue →" : "Skip to emergency"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>
              You are not alone. Trained counsellors are available right now, free of charge.
            </p>
            {[
              {name:"Uganda Crisis Line", number:"+256787671827", color:"#EF4444"},
              {name:"International Association for Suicide Prevention", number:"www.iasp.info", color:C.violet},
              {name:"Crisis Text Line (Global)", number:"Text HOME to 741741", color:C.aqua},
            ].map(r => (
              <div key={r.name} style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
                <div style={{color:C.text,fontWeight:700,fontSize:13}}>{r.name}</div>
                <div style={{color:r.color,fontSize:14,fontWeight:700,marginTop:2}}>{r.number}</div>
              </div>
            ))}
            <button onClick={onClose} className="btn-ghost" style={{width:"100%",padding:"10px",marginTop:8}}>
              Close — I'm reaching out now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account Settings Tab ──────────────────────────────────────────────────────
function AccountSettingsTab({ user, onLogout }) {
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');

  async function exportData() {
    setExporting(true);
    await accountAPI.exportData();
    setExporting(false);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 4000);
  }

  async function deleteAccount() {
    setDeleting(true);
    const ok = await accountAPI.deleteAccount();
    if (ok) { authAPI.logout(); onLogout(); }
    setDeleting(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    setSavingPwd(true); setPwdMsg("");
    const result = await accountAPI.changePassword(oldPwd, newPwd);
    setPwdMsg(result.ok ? "Password updated ✓" : "Failed — check your current password.");
    setSavingPwd(false);
    if (result.ok) { setOldPwd(""); setNewPwd(""); }
    setTimeout(() => setPwdMsg(""), 4000);
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 80px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Account Settings</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:24}}>Manage your data and preferences</p>

      {/* Profile info */}
      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.violet},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff"}}>
            {(user?.name?.[0]||user?.email?.[0]||"?").toUpperCase()}
          </div>
          <div>
            <div style={{color:C.text,fontWeight:700,fontSize:15}}>{user?.name || "—"}</div>
            <div style={{color:C.muted,fontSize:12}}>{user?.email}</div>
            <div style={{color:C.muted,fontSize:11,marginTop:2}}>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>Push Notifications</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:12}}>Get notified when your therapist sends a message or an appointment is coming up.</div>
        {notifPermission === 'granted' ? (
          <span style={{color:C.aqua,fontSize:13,fontWeight:600}}>✓ Notifications enabled</span>
        ) : notifPermission === 'denied' ? (
          <span style={{color:"#F87171",fontSize:12}}>Notifications blocked by browser. Enable in site settings.</span>
        ) : (
          <button onClick={requestNotifications} className="btn-primary" style={{padding:"8px 18px",fontSize:13}}>Enable notifications</button>
        )}
      </div>

      {/* Change password */}
      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:12}}>Change Password</div>
        <form onSubmit={changePassword} style={{display:"flex",flexDirection:"column",gap:10}}>
          <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} placeholder="Current password" required
            style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}} aria-label="Current password"/>
          <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="New password (min 8 chars)" minLength={8} required
            style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}} aria-label="New password"/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button type="submit" disabled={savingPwd} className="btn-primary" style={{padding:"8px 18px",fontSize:13}}>{savingPwd?"Saving…":"Update"}</button>
            {pwdMsg && <span style={{color:pwdMsg.includes("✓")?C.aqua:"#F87171",fontSize:12}}>{pwdMsg}</span>}
          </div>
        </form>
      </div>

      {/* GDPR data export */}
      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>Export My Data</div>
        <p style={{color:C.muted,fontSize:12,lineHeight:1.6,marginBottom:12}}>
          Download a complete copy of all your data — sessions, moods, assessments, safety plan — as a JSON file. Your right under GDPR and Uganda's Data Protection Act 2019.
        </p>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={exportData} disabled={exporting} className="btn-primary" style={{padding:"8px 18px",fontSize:13}}>
            {exporting ? "Preparing…" : "⬇ Download my data"}
          </button>
          {exportDone && <span style={{color:C.aqua,fontSize:12,fontWeight:600}}>Download started ✓</span>}
        </div>
      </div>

      {/* Account deletion */}
      <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:16,padding:16}}>
        <div style={{color:"#FCA5A5",fontWeight:700,fontSize:14,marginBottom:4}}>Delete Account</div>
        <p style={{color:C.muted,fontSize:12,lineHeight:1.6,marginBottom:12}}>
          Permanently anonymises your account and all personal data. This action cannot be undone.
        </p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 18px",color:"#F87171",fontSize:13,cursor:"pointer",fontWeight:600}}>
            Delete my account
          </button>
        ) : (
          <div style={{display:"flex",gap:10}}>
            <button onClick={deleteAccount} disabled={deleting}
              style={{background:"#EF4444",border:"none",borderRadius:10,padding:"8px 18px",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700}}>
              {deleting?"Deleting…":"Yes, delete permanently"}
            </button>
            <button onClick={() => setDeleteConfirm(false)} className="btn-ghost" style={{padding:"8px 14px",fontSize:13}}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Audit Log Tab (Therapist) ──────────────────────────────────────────────────
function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountAPI.getAuditLog().then(data => {
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const ACTION_ICONS = {
    view_patient:'👤', view_session:'💬', view_moods:'📊',
    create_note:'📝', update_note:'✏️', resolve_flag:'✅', view_outcomes:'📈',
  };

  if (loading) return <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Audit Log</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>A record of all your data access actions — required by clinical governance standards</p>
      {logs.length === 0 ? (
        <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:30}}>No audit entries yet.</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {logs.map(log => (
            <div key={log.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18,flexShrink:0}}>{ACTION_ICONS[log.action_code]||'🔍'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:C.text,fontSize:13,fontWeight:600}}>{log.action}</div>
                {log.patient_name && <div style={{color:C.muted,fontSize:11}}>Patient: {log.patient_name}</div>}
                {log.detail && <div style={{color:C.muted,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.detail}</div>}
              </div>
              <div style={{color:C.muted,fontSize:10,flexShrink:0,textAlign:"right"}}>
                {new Date(log.created_at).toLocaleString([],{dateStyle:"short",timeStyle:"short"})}
              </div>
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

function UserDashboard({ user, onSelectModule, onLogout, initialTab = "home", lang = "en", onLangToggle }) {
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

  const t = TR[lang] || TR.en;
  const tabs = [
    {id:"home", label:t.tabModules},
    {id:"wellbeing", label:t.tabWellbeing},
    {id:"therapists", label:t.tabTherapists},
    {id:"messages", label:t.tabMyTherapist},
    {id:"account", label:t.tabAccount},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      <NavBar user={user} onLogout={onLogout} tab={tab} onTab={setTab} tabs={tabs} lang={lang} onLangToggle={onLangToggle}/>

      {/* ── Modules tab ── */}
      {tab === "home" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 80px"}}>
          <div style={{marginBottom:16}}>
            <h2 style={{color:C.text,fontSize:20,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>{t.greeting(firstName)}</h2>
            <p style={{color:C.muted,fontSize:13}}>{t.chooseModule}</p>
          </div>
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted}} aria-hidden="true">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} aria-label={t.search}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:50,padding:"10px 16px 10px 36px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          </div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>{t.allModules(filtered.length)}</div>
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
      {tab === "wellbeing" && <WellbeingTab user={user} lang={lang}/>}

      {/* ── Account tab ── */}
      {tab === "account" && <AccountSettingsTab user={user} onLogout={onLogout}/>}

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
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 20px",background:"rgba(10,8,24,0.95)",backdropFilter:"blur(12px)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,zIndex:50}} role="complementary" aria-label="Crisis support">
        <span aria-hidden="true">🚨</span>
        <span style={{color:C.muted,fontSize:12,flex:1}}>{t.crisisMsg} <strong style={{color:C.subtle}}>+256787671827</strong> — free, confidential, 24/7</span>
      </div>
    </div>
  );
}

// ── Patient Card with Warm Handoff ────────────────────────────────────────────
function PatientCard({ patient: p }) {
  const [handoff, setHandoff] = useState(null);
  const [loadingHandoff, setLoadingHandoff] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function loadHandoff() {
    if (handoff) { setExpanded(e => !e); return; }
    setLoadingHandoff(true);
    const data = await therapistAPI.getWarmHandoff(p.patient_id);
    setHandoff(data);
    setExpanded(true);
    setLoadingHandoff(false);
  }

  return (
    <div className="glass" style={{borderRadius:14,padding:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.violet},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,color:"#fff",fontWeight:700}}>
          {(p.patient_name||"?")[0].toUpperCase()}
        </div>
        <div style={{flex:1}}>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>{p.patient_name}</div>
          <div style={{color:C.muted,fontSize:11}}>{p.patient_email}</div>
        </div>
        {p.last_mood && <span style={{fontSize:11,color:C.muted}}>Mood: {p.last_mood}</span>}
        <button onClick={loadHandoff} disabled={loadingHandoff}
          style={{background:"rgba(124,58,237,0.1)",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:"#A78BFA",fontSize:11,cursor:"pointer"}}>
          {loadingHandoff ? "…" : expanded ? "Hide" : "Handoff"}
        </button>
      </div>

      {/* Warm handoff panel */}
      {expanded && handoff && (
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:11,color:C.violet,fontWeight:700,letterSpacing:"0.05em"}}>WARM HANDOFF SUMMARY</div>
          {handoff.active_crisis && (
            <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"8px 10px",display:"flex",gap:8,alignItems:"center"}}>
              <span>🚨</span>
              <span style={{color:"#FCA5A5",fontSize:12}}>Active crisis flag · severity: {handoff.active_crisis.severity}</span>
            </div>
          )}
          {handoff.latest_phq && (
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:C.muted}}>PHQ-9: <strong style={{color:C.text}}>{handoff.latest_phq.total_score}</strong> ({handoff.latest_phq.severity})</span>
              <span style={{fontSize:12,color:C.muted}}>Date: <strong style={{color:C.text}}>{new Date(handoff.latest_phq.created_at).toLocaleDateString()}</strong></span>
            </div>
          )}
          {handoff.recent_moods?.length > 0 && (
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Recent moods</div>
              <div style={{display:"flex",gap:5,alignItems:"flex-end",height:40}}>
                {handoff.recent_moods.slice(0,7).map((m, i) => {
                  const col = m.score >= 7 ? C.aqua : m.score >= 4 ? "#FCD34D" : "#EF4444";
                  return <div key={i} style={{flex:1,background:col,borderRadius:"3px 3px 0 0",height:`${(m.score/10)*36}px`,minHeight:3}}/>;
                })}
              </div>
            </div>
          )}
          {handoff.last_session?.summary && (
            <div style={{fontSize:12,color:C.muted,fontStyle:"italic",lineHeight:1.5}}>"{handoff.last_session.summary}"</div>
          )}
        </div>
      )}

      {p.recent_sessions?.length > 0 && !expanded && (
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
  );
}

// ── Therapist Tasks Tab ────────────────────────────────────────────────────────
function TherapistTasksTab({ connections }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [form, setForm] = useState({title:"",description:"",due_date:""});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    therapistAPI.getTasks().then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  async function createTask() {
    if (!form.title || !patientId) return;
    setSaving(true);
    const result = await therapistAPI.createTask({...form, patient: patientId});
    if (result.ok) {
      const data = await therapistAPI.getTasks();
      setTasks(Array.isArray(data) ? data : []);
      setForm({title:"",description:"",due_date:""});
    }
    setSaving(false);
  }

  async function markComplete(id) {
    await therapistAPI.completeTask(id);
    const data = await therapistAPI.getTasks();
    setTasks(Array.isArray(data) ? data : []);
  }

  if (loading) return <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner/></div>;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Between-Session Tasks</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Assign therapeutic tasks to patients</p>

      {/* Create task */}
      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:20}}>
        <div style={{fontWeight:700,color:C.text,fontSize:14,marginBottom:12}}>Assign New Task</div>
        <select value={patientId} onChange={e => setPatientId(e.target.value)}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:patientId?C.text:C.muted,outline:"none",marginBottom:8,fontFamily:"system-ui,sans-serif"}}>
          <option value="">Select patient…</option>
          {connections.map(c => <option key={c.id} value={c.id}>{c.patient_name}</option>)}
        </select>
        <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Task title…"
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",marginBottom:8,fontFamily:"system-ui,sans-serif"}}/>
        <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Description (optional)…" rows={2}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",marginBottom:8}}/>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))}
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          <button className="btn-primary" onClick={createTask} disabled={saving||!form.title||!patientId} style={{padding:"9px 20px"}}>
            {saving?"Saving…":"Assign"}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tasks.map(task => (
          <div key={task.id} className="glass" style={{borderRadius:14,padding:14,opacity:task.completed?0.6:1}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${task.completed?C.aqua:C.border}`,background:task.completed?"rgba(45,212,191,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                {task.completed && <span style={{color:C.aqua,fontSize:13}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:700,fontSize:13}}>{task.title}</div>
                <div style={{color:C.muted,fontSize:11,marginTop:1}}>Patient: {task.patient_name}</div>
                {task.description && <div style={{color:C.muted,fontSize:12,marginTop:3}}>{task.description}</div>}
                {task.due_date && <div style={{color:"#FCD34D",fontSize:11,marginTop:4}}>Due: {new Date(task.due_date).toLocaleDateString()}</div>}
              </div>
              {!task.completed && (
                <button onClick={() => markComplete(task.id)}
                  style={{background:"rgba(45,212,191,0.1)",border:`1px solid rgba(45,212,191,0.2)`,borderRadius:8,padding:"5px 10px",color:C.aqua,fontSize:11,cursor:"pointer",flexShrink:0}}>
                  Mark done
                </button>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>No tasks yet.</div>}
      </div>
    </div>
  );
}

// ── Treatment Plan Tab ────────────────────────────────────────────────────────
function TreatmentPlanTab({ connections }) {
  const [selectedConn, setSelectedConn] = useState(null);
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({goals:[],interventions:"",strengths:"",review_date:""});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadPlan(conn) {
    setSelectedConn(conn);
    const data = await therapistAPI.getTreatmentPlan(conn.id);
    if (data) { setPlan(data); setForm(data); }
    else { setForm({goals:[],interventions:"",strengths:"",review_date:""}); }
  }

  async function savePlan() {
    if (!selectedConn) return;
    setSaving(true);
    const result = await therapistAPI.saveTreatmentPlan(selectedConn.id, {
      patient: selectedConn.id,
      goals: form.goals,
      interventions: form.interventions,
      strengths: form.strengths,
      review_date: form.review_date || null,
    });
    if (result.ok) { setPlan(result.data); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  function addGoal() {
    setForm(f => ({...f, goals: [...f.goals, {goal:"",target_date:"",status:"active"}]}));
  }

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Treatment Plans</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Individualized care plans per patient</p>

      {/* Patient selector */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12,marginBottom:16,WebkitOverflowScrolling:"touch"}}>
        {connections.map(c => (
          <button key={c.id} onClick={() => loadPlan(c)}
            style={{flexShrink:0,borderRadius:50,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid",
              background:selectedConn?.id===c.id?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)",
              borderColor:selectedConn?.id===c.id?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",
              color:selectedConn?.id===c.id?"#A78BFA":C.muted}}>
            {c.patient_name}
          </button>
        ))}
      </div>

      {!selectedConn && <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>Select a patient to view or create their treatment plan.</div>}

      {selectedConn && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Goals */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <label style={{color:C.subtle,fontSize:11,fontWeight:600,letterSpacing:"0.05em"}}>GOALS</label>
              <button onClick={addGoal} style={{background:"rgba(124,58,237,0.1)",border:`1px solid rgba(124,58,237,0.2)`,borderRadius:8,padding:"4px 10px",color:"#A78BFA",fontSize:11,cursor:"pointer"}}>+ Add goal</button>
            </div>
            {form.goals.length === 0 && <p style={{color:C.muted,fontSize:12}}>No goals yet. Click + Add goal.</p>}
            {form.goals.map((g, i) => (
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <input value={g.goal} onChange={e => setForm(f => { const goals=[...f.goals]; goals[i]={...goals[i],goal:e.target.value}; return {...f,goals}; })}
                  placeholder="Goal description…" style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
                <input type="date" value={g.target_date||""} onChange={e => setForm(f => { const goals=[...f.goals]; goals[i]={...goals[i],target_date:e.target.value}; return {...f,goals}; })}
                  style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 8px",fontSize:12,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
                <button onClick={() => setForm(f => ({...f,goals:f.goals.filter((_,j)=>j!==i)}))} style={{background:"rgba(239,68,68,0.1)",border:"none",borderRadius:6,padding:"7px 9px",color:"#F87171",cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            ))}
          </div>

          <div>
            <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:"0.05em"}}>INTERVENTIONS</label>
            <textarea value={form.interventions||""} onChange={e => setForm(f=>({...f,interventions:e.target.value}))} rows={3} placeholder="Therapeutic interventions planned…"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
          </div>

          <div>
            <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:"0.05em"}}>CLIENT STRENGTHS</label>
            <textarea value={form.strengths||""} onChange={e => setForm(f=>({...f,strengths:e.target.value}))} rows={2} placeholder="Patient strengths and resources…"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
          </div>

          <div>
            <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:"0.05em"}}>REVIEW DATE</label>
            <input type="date" value={form.review_date||""} onChange={e => setForm(f=>({...f,review_date:e.target.value}))}
              style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          </div>

          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <button className="btn-primary" onClick={savePlan} disabled={saving} style={{padding:"10px 24px"}}>
              {saving?"Saving…":"Save plan"}
            </button>
            {saved && <span style={{color:C.aqua,fontSize:13,fontWeight:600}}>Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Discharge Notes Tab ───────────────────────────────────────────────────────
function DischargeTab({ connections }) {
  const [selectedConn, setSelectedConn] = useState(null);
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({presenting_problem:"",treatment_provided:"",outcome:"",recommendations:"",discharge_date:""});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadNotes(conn) {
    setSelectedConn(conn);
    const data = await therapistAPI.getDischargeNotes(conn.id);
    setNotes(Array.isArray(data) ? data : []);
  }

  async function createNote() {
    if (!selectedConn) return;
    setSaving(true);
    const result = await therapistAPI.createDischargeNote(selectedConn.id, {...form, patient: selectedConn.id});
    if (result.ok) {
      const data = await therapistAPI.getDischargeNotes(selectedConn.id);
      setNotes(Array.isArray(data) ? data : []);
      setForm({presenting_problem:"",treatment_provided:"",outcome:"",recommendations:"",discharge_date:""});
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Discharge Summaries</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Clinical discharge documentation</p>

      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12,marginBottom:16,WebkitOverflowScrolling:"touch"}}>
        {connections.map(c => (
          <button key={c.id} onClick={() => loadNotes(c)}
            style={{flexShrink:0,borderRadius:50,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid",
              background:selectedConn?.id===c.id?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)",
              borderColor:selectedConn?.id===c.id?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",
              color:selectedConn?.id===c.id?"#A78BFA":C.muted}}>
            {c.patient_name}
          </button>
        ))}
      </div>

      {!selectedConn && <div style={{textAlign:"center",color:C.muted,fontSize:13,paddingTop:20}}>Select a patient to create or view discharge summaries.</div>}

      {selectedConn && (
        <>
          {notes.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {notes.map(n => (
                <div key={n.id} className="glass" style={{borderRadius:14,padding:14}}>
                  <div style={{color:C.text,fontWeight:700,fontSize:13,marginBottom:4}}>Discharge — {new Date(n.discharge_date||n.created_at).toLocaleDateString()}</div>
                  <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}><strong style={{color:C.subtle}}>Problem:</strong> {n.presenting_problem}</div>
                  <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}><strong style={{color:C.subtle}}>Outcome:</strong> {n.outcome}</div>
                  <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}><strong style={{color:C.subtle}}>Recommendations:</strong> {n.recommendations}</div>
                </div>
              ))}
            </div>
          )}

          <div className="glass" style={{borderRadius:16,padding:16}}>
            <div style={{fontWeight:700,color:C.text,fontSize:14,marginBottom:12}}>New Discharge Summary</div>
            {[
              {key:"presenting_problem",label:"PRESENTING PROBLEM",rows:2},
              {key:"treatment_provided",label:"TREATMENT PROVIDED",rows:3},
              {key:"outcome",label:"OUTCOME",rows:2},
              {key:"recommendations",label:"RECOMMENDATIONS",rows:2},
            ].map(({key,label,rows}) => (
              <div key={key} style={{marginBottom:10}}>
                <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>{label}</label>
                <textarea value={form[key]||""} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} rows={rows}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"system-ui,sans-serif"}}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{display:"block",color:C.subtle,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.05em"}}>DISCHARGE DATE</label>
              <input type="date" value={form.discharge_date||""} onChange={e => setForm(f=>({...f,discharge_date:e.target.value}))}
                style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <button className="btn-primary" onClick={createNote} disabled={saving} style={{padding:"10px 24px"}}>
                {saving?"Saving…":"Save summary"}
              </button>
              {saved && <span style={{color:C.aqua,fontSize:13,fontWeight:600}}>Saved ✓</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Monthly Report Tab ────────────────────────────────────────────────────────
function MonthlyReportTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);
    const data = await therapistAPI.getMonthlyReport(year, month);
    setReport(data);
    setLoading(false);
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      <h2 style={{color:C.text,fontSize:18,fontWeight:800,fontFamily:"Georgia,serif",marginBottom:4}}>Monthly Reports</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Clinical activity summary for your practice</p>

      <div className="glass" style={{borderRadius:16,padding:16,marginBottom:20}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}>
            {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={fetchReport} disabled={loading} style={{padding:"9px 20px"}}>
            {loading ? "Loading…" : "Generate"}
          </button>
        </div>
      </div>

      {report && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Summary stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[
              {label:"Sessions", value: report.total_sessions ?? 0, color: C.violet},
              {label:"Notes", value: report.total_notes ?? 0, color: C.aqua},
              {label:"Avg PHQ-9", value: report.avg_phq9 ? report.avg_phq9.toFixed(1) : "—", color: "#FCD34D"},
            ].map(s => (
              <div key={s.label} className="glass" style={{borderRadius:14,padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Appointments */}
          {report.appointments?.length > 0 && (
            <div className="glass" style={{borderRadius:14,padding:14}}>
              <div style={{color:C.text,fontWeight:700,fontSize:13,marginBottom:10}}>Appointments ({report.appointments.length})</div>
              {report.appointments.map((a, i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<report.appointments.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:12,color:C.subtle}}>{a.patient_name}</span>
                  <span style={{fontSize:11,color:C.muted}}>{new Date(a.scheduled_at).toLocaleDateString()} · {a.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {report.notes?.length > 0 && (
            <div className="glass" style={{borderRadius:14,padding:14}}>
              <div style={{color:C.text,fontWeight:700,fontSize:13,marginBottom:10}}>Clinical Notes ({report.notes.length})</div>
              {report.notes.slice(0,5).map((n, i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<Math.min(report.notes.length,5)-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:12,color:C.subtle}}>Patient {i+1}</span>
                  <span style={{fontSize:11,color:C.muted}}>{new Date(n.session_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
    {id:"tasks", label:"Tasks"},
    {id:"treatment", label:"Plans"},
    {id:"discharge", label:"Discharge"},
    {id:"reports", label:"Reports"},
    {id:"risk", label:"Risk"},
    {id:"audit", label:"Audit"},
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
                <PatientCard key={p.patient_id} patient={p}/>
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
      {!loading && tab === "tasks" && <TherapistTasksTab connections={accepted}/>}
      {!loading && tab === "treatment" && <TreatmentPlanTab connections={accepted}/>}
      {!loading && tab === "discharge" && <DischargeTab connections={accepted}/>}
      {!loading && tab === "reports" && <MonthlyReportTab/>}
      {!loading && tab === "risk" && <RiskFlagsTab/>}
      {!loading && tab === "audit" && <AuditLogTab/>}

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
  const [showGAD7, setShowGAD7] = useState(false);
  const [showCrisisChain, setShowCrisisChain] = useState(false);
  const [crisisConnection, setCrisisConnection] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('mb_lang') || 'en');

  function toggleLang() {
    const next = lang === 'en' ? 'sw' : 'en';
    setLang(next);
    localStorage.setItem('mb_lang', next);
  }

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (authAPI.isLoggedIn()) {
      authAPI.me().then(data => {
        if (data) {
          setUser(data);
          setScreen("home");
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
    if (user?.role !== 'therapist' && user?.role !== 'admin') {
      wellbeingAPI.getAssessments().then(a => {
        if (!Array.isArray(a) || a.length === 0) setShowOnboarding(true);
      });
    }
  }

  function handleOnboardingComplete(score) {
    setShowOnboarding(false);
    // After PHQ-9, offer GAD-7
    setShowGAD7(true);
  }

  function handleLogout() { authAPI.logout(); setUser(null); setScreen("login"); }

  // Auto-logout after 20 minutes of inactivity (only when logged in)
  useIdleTimeout(handleLogout, 20);

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={80}/>
    </div>
  );

  if (screen === "register") return <RegisterScreen onLogin={u => { setUser(u); setScreen("home"); }} onGoLogin={() => setScreen("login")}/>;
  if (screen === "login")    return <LoginScreen    onLogin={u => { setUser(u); setScreen("home"); }} onGoRegister={() => setScreen("register")}/>;

  if (screen === "module" && activeModule) {
    return (
      <LangCtx.Provider value={lang}>
        <ChatModule
          mod={activeModule} user={user}
          onBack={() => { setActiveModule(null); setScreen("home"); }}
          onOpenTherapists={() => { setDefaultUserTab("therapists"); setActiveModule(null); setScreen("home"); }}
        />
      </LangCtx.Provider>
    );
  }

  if (screen === "home") {
    if (user?.role === "therapist" || user?.role === "admin") {
      return (
        <LangCtx.Provider value={lang}>
          <TherapistDashboard user={user} onLogout={handleLogout}/>
        </LangCtx.Provider>
      );
    }
    return (
      <LangCtx.Provider value={lang}>
        {showConsent && <ConsentModal onAccept={handleConsentAccept}/>}
        {!showConsent && showOnboarding && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
        {!showConsent && !showOnboarding && showGAD7 && (
          <GAD7Modal
            onComplete={() => setShowGAD7(false)}
            onSkip={() => setShowGAD7(false)}
          />
        )}
        {showCrisisChain && (
          <CrisisChainModal
            onClose={() => setShowCrisisChain(false)}
            connectedTherapist={crisisConnection}
          />
        )}
        <UserDashboard
          user={user}
          initialTab={defaultUserTab}
          lang={lang}
          onLangToggle={toggleLang}
          onSelectModule={mod => { setDefaultUserTab("home"); setActiveModule(mod); setScreen("module"); }}
          onLogout={handleLogout}
        />
      </LangCtx.Provider>
    );
  }

  return null;
}
