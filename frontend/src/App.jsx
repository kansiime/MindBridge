import { authAPI, chatAPI, modulesAPI, scannerAPI } from "./api";
import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0A0818",
  surface:  "rgba(255,255,255,0.05)",
  border:   "rgba(255,255,255,0.08)",
  violet:   "#7C3AED",
  violetDim:"#5B21B6",
  aqua:     "#2DD4BF",
  text:     "#F1F5F9",
  muted:    "#64748B",
  subtle:   "#94A3B8",
};

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:2px;}
  @keyframes orbPulse{0%,100%{transform:scale(1) rotate(0deg);}50%{transform:scale(1.08) rotate(180deg);}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes slide{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,0.4);}50%{box-shadow:0 0 0 8px rgba(45,212,191,0);}}
  @keyframes typeDot{0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-5px);opacity:1;}}
  @keyframes breatheIn{from{transform:scale(0.65);opacity:0.5;}to{transform:scale(1.25);opacity:1;}}
  @keyframes breatheOut{from{transform:scale(1.25);opacity:1;}to{transform:scale(0.65);opacity:0.5;}}
  @keyframes breatheHold{from,to{transform:scale(1.25);}}
  @keyframes breatheHoldOut{from,to{transform:scale(0.65);}}
  @keyframes spin{from{stroke-dashoffset:251;}to{stroke-dashoffset:0;}}
  @keyframes panicPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}  }
  .mod-card{transition:transform 0.18s,border-color 0.18s,background 0.18s;}
  .mod-card:hover{transform:translateY(-3px);}
  .nav-tab{transition:color 0.15s,border-color 0.15s;}
  .chip:hover{background:rgba(124,58,237,0.25)!important;}
  .send-btn:not([disabled]):hover{transform:scale(1.08);}
  .send-btn{transition:transform 0.15s;}
  .action-btn{transition:background 0.15s,transform 0.12s;}
  .action-btn:hover{transform:scale(1.03);}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MODULES CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const MODULES = [
  { id:"chat",       icon:"✦",  label:"Daily Check-In",      color:"#7C3AED", glow:"#A78BFA", desc:"Talk through how you're feeling right now", tag:"Core" },
  { id:"anxiety",    icon:"⚡",  label:"Anxiety & Panic",     color:"#F97316", glow:"#FED7AA", desc:"Grounding exercises & panic attack support", tag:"Acute" },
  { id:"sleep",      icon:"🌙",  label:"Sleep & Insomnia",    color:"#818CF8", glow:"#C7D2FE", desc:"Wind-down routines & sleep quality tracking", tag:"Daily" },
  { id:"grief",      icon:"🕊",  label:"Grief & Loss",        color:"#94A3B8", glow:"#E2E8F0", desc:"Gentle space to process loss at your pace", tag:"Journey" },
  { id:"social",     icon:"💬",  label:"Social Anxiety",      color:"#EC4899", glow:"#FBCFE8", desc:"Rehearse hard conversations with AI roleplay", tag:"Skills" },
  { id:"adhd",       icon:"🎯",  label:"ADHD Support",        color:"#F59E0B", glow:"#FDE68A", desc:"Focus sessions, task breakdown & body doubling", tag:"Focus" },
  { id:"recovery",   icon:"🌱",  label:"Addiction & Recovery",color:"#10B981", glow:"#A7F3D0", desc:"Daily sobriety check-ins & craving tools", tag:"Recovery" },
  { id:"trauma",     icon:"🛡",  label:"Trauma & PTSD",       color:"#6366F1", glow:"#C7D2FE", desc:"Grounding-first, safety-aware trauma support", tag:"Sensitive" },
  { id:"burnout",    icon:"🔥",  label:"Burnout & Stress",    color:"#EF4444", glow:"#FECACA", desc:"Burnout assessment & boundary-setting tools", tag:"Work" },
  { id:"postpartum", icon:"🌸",  label:"Postpartum Wellness", color:"#F0ABFC", glow:"#FAE8FF", desc:"Support for new parents navigating big changes", tag:"Perinatal" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS per module
// ─────────────────────────────────────────────────────────────────────────────
const PROMPTS = {
  chat:`You are MindBridge, a warm AI mental wellness companion. Use CBT/DBT. Keep replies 2-4 sentences, conversational. Never diagnose. If breathing exercise requested respond ONLY with JSON: {"type":"breathing","name":"Box Breathing","steps":[{"label":"Inhale","seconds":4},{"label":"Hold","seconds":4},{"label":"Exhale","seconds":4},{"label":"Hold","seconds":4}],"rounds":4}. If crisis keywords appear, urge 988.`,
  anxiety:`You are MindBridge's Anxiety & Panic specialist. You help users through anxiety and panic attacks using grounding (5-4-3-2-1), breathing, and cognitive defusion. Be calm, slow, and reassuring. For panic attacks, immediately guide a grounding exercise. Keep replies short and clear — someone panicking can't read paragraphs. Never diagnose. Urge 988 if crisis.`,
  sleep:`You are MindBridge's Sleep coach. Help users with insomnia, wind-down routines, sleep hygiene, and relaxation. Ask about their sleep patterns. Suggest progressive muscle relaxation, sleep restriction therapy basics, and stimulus control. Avoid caffeine/screen lectures unless relevant. Be soothing and gentle. Never diagnose.`,
  grief:`You are MindBridge's grief companion. Be exceptionally gentle and unhurried. Never rush stages of grief or say things like "you'll feel better soon." Validate feelings fully before offering any tools. Use narrative therapy and meaning-making approaches. Sometimes just bearing witness is the right response. Never diagnose. Urge professional support for complicated grief.`,
  social:`You are MindBridge's social confidence coach. Help users with social anxiety through cognitive reframing and conversation rehearsal. Offer to roleplay difficult conversations — job interviews, setting boundaries, confrontations. Be encouraging but realistic. Use Socratic questioning to challenge catastrophic thinking. Never diagnose.`,
  adhd:`You are MindBridge's ADHD support companion. Help with focus, task initiation, emotional regulation, and time blindness. Offer to body-double (stay present while they work). Break overwhelming tasks into tiny steps. Use the Pomodoro technique adapted for ADHD. Validate the experience of ADHD without excusing avoidance. Never diagnose.`,
  recovery:`You are MindBridge's recovery companion. Support people in addiction recovery with daily check-ins, craving urge-surfing (observe without acting), motivational interviewing, and milestone celebration. Never shame. Connect to AA/NA when human community is needed. Always remind that relapse is not failure. Urge professional addiction treatment. Never diagnose.`,
  trauma:`You are MindBridge's trauma-informed companion. Prioritize safety and grounding above all. Never push a user to recall trauma details. Use window-of-tolerance awareness, grounding exercises, and psychoeducation about trauma responses. Always move at the user's pace. Be explicit that you are NOT a trauma therapist and strongly encourage professional EMDR/somatic therapy. Urge 988 for crisis.`,
  burnout:`You are MindBridge's burnout and work stress coach. Use the Maslach Burnout Inventory framework. Help users identify exhaustion, cynicism, and efficacy dimensions. Focus on boundary-setting, value clarification, and sustainable work habits. Be direct about systemic causes without being preachy. Never diagnose clinical depression.`,
  postpartum:`You are MindBridge's perinatal mental health companion. Support new and expecting parents with the emotional landscape of early parenthood — identity shifts, sleep deprivation, relationship changes, feeding struggles. Screen gently using Edinburgh Postnatal Depression Scale questions. Be warm and non-judgmental. Strongly encourage professional support for PPD/PPA. Never diagnose. Urge 988 for crisis.`,
};

const MODULE_PROMPTS = {
  chat:["I can't quiet my thoughts","Walk me through a breathing exercise","I feel really low today","Help me reframe a negative thought"],
  anxiety:["I'm having a panic attack right now","My anxiety won't stop","I need a grounding exercise","Everything feels out of control"],
  sleep:["I can't fall asleep","I keep waking up at 3am","Build me a wind-down routine","My mind races at bedtime"],
  grief:["I lost someone recently","I feel guilty for feeling better","I don't know how to go on","Some days are harder than others"],
  social:["Help me rehearse a hard conversation","I freeze in social situations","I'm dreading a work presentation","Help me set a boundary"],
  adhd:["I can't start this task","Stay with me while I work","I'm so overwhelmed by my to-do list","I keep forgetting everything"],
  recovery:["I'm having a craving right now","I slipped and feel ashamed","Celebrate my 30 days sober","Help me urge-surf this feeling"],
  trauma:["I keep having flashbacks","I feel unsafe right now","Help me ground myself","I startle at everything"],
  burnout:["I dread going to work","I feel completely empty","Help me set boundaries with my boss","I have nothing left to give"],
  postpartum:["I don't feel like myself","I'm struggling to bond with my baby","I feel so alone in this","I'm exhausted beyond words"],
};

const MODULE_INTROS = {
  chat:"How are you feeling right now? I'm here, no rush.",
  anxiety:"You're safe here. Tell me what's happening — are you feeling anxious right now, or is this something that's been building?",
  sleep:"Let's work on your sleep. How has it been lately — trouble falling asleep, staying asleep, or waking up exhausted?",
  grief:"I'm glad you're here. There's no right way to grieve, and no timeline. What would feel helpful to talk about today?",
  social:"Social situations can feel so heavy. What's coming up for you — something specific you're dreading, or a pattern you want to work on?",
  adhd:"Let's figure this out together. Are you trying to focus on something right now, or do you need help planning your day?",
  recovery:"You showed up today — that matters. How are you doing? Any cravings, or just checking in?",
  trauma:"You're in a safe space. We go at your pace, always. What feels okay to share today?",
  burnout:"Burnout is real and it's serious. How long have you been running on empty, and what does it feel like for you right now?",
  postpartum:"Early parenthood is one of the hardest transitions there is. How are you really doing — not the Instagram version?",
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Orb({ colors, size=100 }) {
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(circle at 35% 40%,${colors[0]},${colors[1]} 50%,${colors[2]})`,animation:"orbPulse 6s ease-in-out infinite",filter:"blur(1px)"}}/>
      <div style={{position:"absolute",inset:"20%",borderRadius:"50%",background:`radial-gradient(circle at 60% 55%,${colors[2]}66,transparent)`,animation:"orbPulse 9s reverse ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:"35%",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.15),transparent 70%)"}}/>
    </div>
  );
}

function TypingDots({ elapsed=0 }) {
  return (
    <div style={{display:"flex",gap:10,alignItems:"center",animation:"fadeUp 0.3s ease"}}>
      <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#2DD4BF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>✦</div>
      <div style={{background:"rgba(124,58,237,0.12)",backdropFilter:"blur(8px)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:"16px 16px 16px 3px",padding:"11px 14px",display:"flex",gap:5,alignItems:"center"}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#7C3AED",animation:`typeDot 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
        {elapsed>5&&<span style={{marginLeft:8,fontSize:11,color:C.muted}}>thinking…</span>}
      </div>
    </div>
  );
}

function BreathingWidget({ ex, onDone }) {
  const [round,setRound]=useState(0);
  const [si,setSi]=useState(0);
  const [tl,setTl]=useState(ex.steps[0].seconds);
  const [done,setDone]=useState(false);
  const step=ex.steps[si];
  useEffect(()=>{
    if(done)return;
    if(tl<=0){
      const ns=(si+1)%ex.steps.length;
      if(ns===0){const nr=round+1;if(nr>=ex.rounds){setDone(true);return;}setRound(nr);}
      setSi(ns);setTl(ex.steps[ns].seconds);return;
    }
    const t=setTimeout(()=>setTl(v=>v-1),1000);return()=>clearTimeout(t);
  },[tl,si,round,done]);
  const anims={"Inhale":`breatheIn ${step.seconds}s ease-in-out forwards`,"Exhale":`breatheOut ${step.seconds}s ease-in-out forwards`,"Hold":si===1?`breatheHold ${step.seconds}s linear forwards`:`breatheHoldOut ${step.seconds}s linear forwards`};
  const circ=2*Math.PI*38;
  const progress=(1-tl/step.seconds)*circ;
  if(done)return(
    <div style={{background:"rgba(45,212,191,0.08)",border:"1px solid rgba(45,212,191,0.2)",borderRadius:16,padding:"20px",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div style={{fontSize:28,marginBottom:6}}>✓</div>
      <div style={{color:C.aqua,fontWeight:700,fontSize:15,marginBottom:4}}>{ex.rounds} rounds complete</div>
      <div style={{color:C.muted,fontSize:13,marginBottom:14}}>How do you feel now?</div>
      <button onClick={onDone} style={{background:"rgba(45,212,191,0.15)",border:"1px solid rgba(45,212,191,0.3)",borderRadius:50,padding:"7px 18px",color:C.aqua,fontSize:13,fontWeight:600,cursor:"pointer"}}>Continue →</button>
    </div>
  );
  return(
    <div style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:18,padding:"22px 18px",textAlign:"center",animation:"fadeUp 0.3s ease"}}>
      <div style={{fontSize:12,color:C.muted,marginBottom:14,letterSpacing:"0.05em"}}>{ex.name} · Round {round+1}/{ex.rounds}</div>
      <div style={{position:"relative",width:110,height:110,margin:"0 auto 16px"}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.4),rgba(45,212,191,0.2))",animation:anims[step.label]||anims["Hold"]}}/>
        <svg style={{position:"absolute",inset:0,transform:"rotate(-90deg)"}} viewBox="0 0 100 100" width="110" height="110">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ-progress} style={{transition:"stroke-dashoffset 1s linear"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{color:C.text,fontSize:26,fontWeight:800,fontFamily:"Georgia,serif"}}>{tl}</div>
          <div style={{color:C.muted,fontSize:10}}>sec</div>
        </div>
      </div>
      <div style={{color:"#C4B5FD",fontSize:20,fontWeight:700,fontFamily:"Georgia,serif",marginBottom:8}}>{step.label}</div>
      <div style={{display:"flex",justifyContent:"center",gap:5}}>
        {ex.steps.map((_,i)=><div key={i} style={{width:24,height:3,borderRadius:2,background:i===si?"#7C3AED":"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}
      </div>
    </div>
  );
}

function Bubble({ msg, isNew, onBreathingDone, modColor }) {
  const isUser=msg.role==="user";
  if(!isUser&&msg.breathing)return(
    <div style={{animation:isNew?"fadeUp 0.35s ease":"none"}}>
      <BreathingWidget ex={msg.breathing} onDone={onBreathingDone}/>
    </div>
  );
  return(
    <div style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",gap:9,animation:isNew?"fadeUp 0.35s ease":"none"}}>
      {!isUser&&<div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${modColor||C.violet},#2DD4BF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
      <div style={{maxWidth:"76%",background:isUser?`linear-gradient(135deg,${modColor||C.violet},${C.violetDim})`:"rgba(255,255,255,0.07)",backdropFilter:isUser?"none":"blur(10px)",border:isUser?"none":"1px solid rgba(255,255,255,0.1)",color:C.text,padding:"11px 15px",borderRadius:isUser?"16px 16px 3px 16px":"16px 16px 16px 3px",fontSize:14,lineHeight:1.65}}>
        {msg.content}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANIC BUTTON (floating, available everywhere)
// ─────────────────────────────────────────────────────────────────────────────
function PanicButton({ onClick }) {
  return(
    <button onClick={onClick} title="Panic attack support" style={{position:"fixed",bottom:24,right:24,zIndex:999,width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#EF4444,#DC2626)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",boxShadow:"0 4px 20px rgba(239,68,68,0.5)",animation:"panicPulse 3s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}} aria-label="Panic support">⚡</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUNDING 5-4-3-2-1 WIDGET
// ─────────────────────────────────────────────────────────────────────────────
const GROUNDING = [
  {n:5,sense:"See",q:"Name 5 things you can see right now. Look around slowly."},
  {n:4,sense:"Touch",q:"Name 4 things you can physically feel — your feet on the floor, clothes on your skin."},
  {n:3,sense:"Hear",q:"Name 3 sounds you can hear. Listen past the obvious ones."},
  {n:2,sense:"Smell",q:"Name 2 things you can smell, or two you like."},
  {n:1,sense:"Taste",q:"Name 1 thing you can taste right now."},
];
function GroundingWidget({ onDone }) {
  const [step,setStep]=useState(0);
  const [ans,setAns]=useState("");
  const [answers,setAnswers]=useState([]);
  const done=step>=GROUNDING.length;
  if(done)return(
    <div style={{background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:16,padding:20,textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div style={{fontSize:28,marginBottom:6}}>🌿</div>
      <div style={{color:"#FB923C",fontWeight:700,fontSize:15,marginBottom:4}}>Grounding complete</div>
      <div style={{color:C.muted,fontSize:13,marginBottom:14}}>You made it through. Your nervous system is resetting.</div>
      <button onClick={onDone} style={{background:"rgba(249,115,22,0.15)",border:"1px solid rgba(249,115,22,0.3)",borderRadius:50,padding:"7px 18px",color:"#FB923C",fontSize:13,fontWeight:600,cursor:"pointer"}}>I feel calmer →</button>
    </div>
  );
  const g=GROUNDING[step];
  return(
    <div style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.18)",borderRadius:18,padding:"20px 18px",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <span style={{fontSize:12,color:"#FB923C",fontWeight:700,letterSpacing:"0.06em"}}>5-4-3-2-1 GROUNDING</span>
        <span style={{fontSize:12,color:C.muted}}>{step+1} / {GROUNDING.length}</span>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {GROUNDING.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?"#F97316":"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}
      </div>
      <div style={{fontSize:22,fontWeight:800,color:"#FB923C",fontFamily:"Georgia,serif",marginBottom:4}}>{g.n} things you can {g.sense.toLowerCase()}</div>
      <div style={{color:C.subtle,fontSize:13,marginBottom:14,lineHeight:1.6}}>{g.q}</div>
      <input value={ans} onChange={e=>setAns(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&ans.trim()){setAnswers([...answers,ans]);setAns("");setStep(s=>s+1);}}} placeholder={`Type and press Enter…`} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
      {answers.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{answers.slice(-5).map((a,i)=><span key={i} style={{background:"rgba(249,115,22,0.12)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:50,padding:"3px 10px",fontSize:12,color:"#FB923C"}}>{a}</span>)}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BURNOUT ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────
const BURNOUT_Q = [
  {dim:"Exhaustion",q:"I feel emotionally drained by my work."},
  {dim:"Exhaustion",q:"I feel used up at the end of the workday."},
  {dim:"Cynicism",q:"I have become less interested in my work since I started this job."},
  {dim:"Cynicism",q:"I have become less enthusiastic about my work."},
  {dim:"Efficacy",q:"I can effectively solve problems that arise in my work."},
  {dim:"Efficacy",q:"I feel I am making an effective contribution at work."},
];
function BurnoutWidget({ onDone }) {
  const [qi,setQi]=useState(0);
  const [scores,setScores]=useState([]);
  const done=qi>=BURNOUT_Q.length;
  if(done){
    const exh=scores.filter((_,i)=>BURNOUT_Q[i].dim==="Exhaustion").reduce((a,b)=>a+b,0)/2;
    const cyn=scores.filter((_,i)=>BURNOUT_Q[i].dim==="Cynicism").reduce((a,b)=>a+b,0)/2;
    const eff=6-(scores.filter((_,i)=>BURNOUT_Q[i].dim==="Efficacy").reduce((a,b)=>a+b,0)/2);
    const level=Math.round((exh+cyn+eff)/3);
    const label=level<=2?"Low":level<=4?"Moderate":"High";
    const labelColor=level<=2?"#10B981":level<=4?"#F59E0B":"#EF4444";
    return(
      <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:16,padding:20,animation:"fadeUp 0.4s ease"}}>
        <div style={{fontSize:12,color:"#F87171",fontWeight:700,letterSpacing:"0.06em",marginBottom:10}}>BURNOUT ASSESSMENT RESULT</div>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          {[["Exhaustion",exh],["Cynicism",cyn],["Low Efficacy",eff]].map(([l,v])=>(
            <div key={l} style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:v>=4?"#EF4444":v>=2.5?"#F59E0B":"#10B981",fontFamily:"Georgia,serif"}}>{v.toFixed(1)}</div>
              <div style={{fontSize:11,color:C.muted}}>{l}</div>
              <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,marginTop:4}}><div style={{height:"100%",width:`${(v/6)*100}%`,background:v>=4?"#EF4444":v>=2.5?"#F59E0B":"#10B981",borderRadius:2,transition:"width 0.8s ease"}}/></div>
            </div>
          ))}
        </div>
        <div style={{color:labelColor,fontWeight:700,fontSize:14,marginBottom:4}}>{label} burnout risk</div>
        <div style={{color:C.subtle,fontSize:12,marginBottom:14,lineHeight:1.6}}>{level<=2?"You're managing well. Keep protecting what's working.":level<=4?"Burnout is building. It's time to set firmer boundaries.":"You're in burnout. Professional support is strongly recommended."}</div>
        <button onClick={onDone} style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:50,padding:"7px 18px",color:"#F87171",fontSize:13,fontWeight:600,cursor:"pointer"}}>Talk about this →</button>
      </div>
    );
  }
  const q=BURNOUT_Q[qi];
  const labels=["Never","Rarely","Sometimes","Often","Very Often","Always"];
  return(
    <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:18,padding:"18px 16px",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:11,color:"#F87171",fontWeight:700,letterSpacing:"0.06em"}}>BURNOUT CHECK · {q.dim.toUpperCase()}</span>
        <span style={{fontSize:11,color:C.muted}}>{qi+1}/{BURNOUT_Q.length}</span>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:14}}>{BURNOUT_Q.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<qi?"#EF4444":"rgba(255,255,255,0.1)"}}/>)}</div>
      <div style={{color:C.text,fontSize:15,fontWeight:600,marginBottom:16,lineHeight:1.5}}>{q.q}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {labels.map((l,i)=>(
          <button key={l} onClick={()=>{setScores([...scores,i]);setQi(qi+1);}} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:10,padding:"8px 6px",color:C.subtle,fontSize:12,cursor:"pointer",textAlign:"center"}}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOBRIETY TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function SobrietyWidget({ onDone }) {
  const [days,setDays]=useState("");
  const [saved,setSaved]=useState(null);
  if(saved!==null){
    const milestones=[1,3,7,14,30,60,90,180,365];
    const next=milestones.find(m=>m>saved)||null;
    return(
      <div style={{background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:16,padding:20,textAlign:"center",animation:"fadeUp 0.4s ease"}}>
        <div style={{fontSize:36,fontWeight:800,color:"#10B981",fontFamily:"Georgia,serif",marginBottom:2}}>{saved}</div>
        <div style={{color:C.subtle,fontSize:13,marginBottom:12}}>days of recovery. That is real courage.</div>
        {next&&<div style={{background:"rgba(16,185,129,0.1)",borderRadius:10,padding:"8px 12px",fontSize:13,color:"#6EE7B7",marginBottom:14}}>Next milestone: <strong>{next} days</strong> — {next-saved} to go</div>}
        <button onClick={onDone} style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:50,padding:"7px 18px",color:"#10B981",fontSize:13,fontWeight:600,cursor:"pointer"}}>Talk about recovery →</button>
      </div>
    );
  }
  return(
    <div style={{background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:18,padding:"18px 16px",animation:"fadeUp 0.3s ease"}}>
      <div style={{fontSize:12,color:"#10B981",fontWeight:700,letterSpacing:"0.06em",marginBottom:10}}>SOBRIETY CHECK-IN</div>
      <div style={{color:C.text,fontSize:15,marginBottom:14,lineHeight:1.5}}>How many days clean and sober are you today?</div>
      <input type="number" value={days} onChange={e=>setDays(e.target.value)} min="0" placeholder="e.g. 30" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"10px 14px",fontSize:16,color:C.text,outline:"none",fontFamily:"Georgia,serif",marginBottom:10}}/>
      <button disabled={!days} onClick={()=>setSaved(parseInt(days)||0)} style={{width:"100%",background:days?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${days?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"10px",color:days?"#10B981":C.muted,fontSize:14,fontWeight:600,cursor:days?"pointer":"default"}}>Log my days →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MODULE
// ─────────────────────────────────────────────────────────────────────────────
function ChatModule({ mod, onBack, onPanic }) {
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [error,setError]=useState(null);
  const [newIdx,setNewIdx]=useState(-1);
  const [showChips,setShowChips]=useState(true);
  const [crisisVisible,setCrisisVisible]=useState(false);
  const [showScrollBtn,setShowScrollBtn]=useState(false);
  const bottomRef=useRef(null);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  const elRef=useRef(null);

  // Init with module intro
  useEffect(()=>{
    const intro={role:"assistant",content:MODULE_INTROS[mod.id]||"How are you feeling?"};
    setMessages([intro]);setNewIdx(0);
  },[mod.id]);

  useEffect(()=>{
    if(loading){setElapsed(0);elRef.current=setInterval(()=>setElapsed(e=>e+1),1000);}
    else clearInterval(elRef.current);
    return()=>clearInterval(elRef.current);
  },[loading]);

  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    const h=()=>setShowScrollBtn(el.scrollHeight-el.scrollTop-el.clientHeight>100);
    el.addEventListener("scroll",h);return()=>el.removeEventListener("scroll",h);
  },[]);

  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    if(el.scrollHeight-el.scrollTop-el.clientHeight<200)bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages,loading]);

  useEffect(()=>{
    const last=[...messages].reverse().find(m=>m.role==="user");
    if(!last)return;
    const t=last.content.toLowerCase();
    if(["suicide","kill myself","end it","self harm","hurt myself","no reason to live"].some(k=>t.includes(k)))setCrisisVisible(true);
  },[messages]);

  async function send(text){
    if(!text.trim()||loading)return;
    setShowChips(false);
    const next=[...messages,{role:"user",content:text}];
    setMessages(next);setNewIdx(next.length-1);setInput("");
    if(inputRef.current){inputRef.current.style.height="auto";}
    setLoading(true);setError(null);

    // Special: anxiety module + panic → inject grounding widget
    if(mod.id==="anxiety"&&["panic","panicking","panic attack","can't breathe","heart racing"].some(k=>text.toLowerCase().includes(k))){
      await new Promise(r=>setTimeout(r,600));
      const w=[...next,{role:"assistant",content:"",widget:"grounding"}];
      setMessages(w);setNewIdx(w.length-1);setLoading(false);return;
    }
    // Burnout assessment trigger
    if(mod.id==="burnout"&&["assess","check","quiz","how bad","measure"].some(k=>text.toLowerCase().includes(k))){
      await new Promise(r=>setTimeout(r,600));
      const w=[...next,{role:"assistant",content:"",widget:"burnout"}];
      setMessages(w);setNewIdx(w.length-1);setLoading(false);return;
    }
    // Recovery tracker trigger
    if(mod.id==="recovery"&&["days","sober","streak","log","track","milestone"].some(k=>text.toLowerCase().includes(k))){
      await new Promise(r=>setTimeout(r,600));
      const w=[...next,{role:"assistant",content:"",widget:"sobriety"}];
      setMessages(w);setNewIdx(w.length-1);setLoading(false);return;
    }

    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:PROMPTS[mod.id]||PROMPTS.chat,messages:next.map(m=>({role:m.role,content:m.content||""}))})
      });
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const raw=data.content?.find(b=>b.type==="text")?.text||"I'm here with you.";
      let msgObj={role:"assistant",content:raw};
      try{const p=JSON.parse(raw.trim());if(p.type==="breathing")msgObj={role:"assistant",content:"",breathing:p};}catch(_){}
      const wr=[...next,msgObj];setMessages(wr);setNewIdx(wr.length-1);
    }catch(e){setError("Connection lost — your message is safe.");}
    finally{setLoading(false);setTimeout(()=>inputRef.current?.focus(),50);}
  }

  const modColor=mod.color;
  const chips=MODULE_PROMPTS[mod.id]||[];

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,position:"relative"}}>
      {/* Ambient glow */}
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:500,height:180,background:`radial-gradient(ellipse,${modColor}18 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      {/* Header */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,flexShrink:0,zIndex:2,position:"relative"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>←</button>
        <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${modColor},#2DD4BF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{mod.icon}</div>
        <div style={{flex:1}}>
          <div style={{color:C.text,fontWeight:700,fontSize:14,fontFamily:"Georgia,serif"}}>{mod.label}</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:C.aqua,display:"inline-block",animation:"pulse 2s infinite"}}/>
            <span style={{color:C.muted,fontSize:11}}>Active session</span>
          </div>
        </div>
        <button onClick={onBack} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:50,padding:"4px 12px",color:"#F87171",fontSize:11,cursor:"pointer"}}>End</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12,zIndex:1,position:"relative"}}>
        {messages.map((msg,i)=>{
          if(msg.widget==="grounding")return<div key={i} style={{animation:i===newIdx?"fadeUp 0.35s ease":"none"}}><GroundingWidget onDone={()=>send("I completed the grounding exercise.")}/></div>;
          if(msg.widget==="burnout")return<div key={i} style={{animation:i===newIdx?"fadeUp 0.35s ease":"none"}}><BurnoutWidget onDone={()=>send("I just completed the burnout assessment. Let's talk about the results.")}/></div>;
          if(msg.widget==="sobriety")return<div key={i} style={{animation:i===newIdx?"fadeUp 0.35s ease":"none"}}><SobrietyWidget onDone={()=>send("I just logged my sobriety days.")}/></div>;
          return<Bubble key={i} msg={msg} isNew={i===newIdx} modColor={modColor} onBreathingDone={()=>send("I just finished the breathing exercise.")}/>;
        })}
        {loading&&<TypingDots elapsed={elapsed}/>}
        {error&&(
          <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:12,padding:"10px 14px",color:"#FCA5A5",fontSize:13,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <span>{error}</span>
            <button onClick={()=>{setError(null);const last=[...messages].reverse().find(m=>m.role==="user");if(last)send(last.content);}} style={{background:"none",border:"none",color:"#F87171",cursor:"pointer",textDecoration:"underline",fontSize:13}}>Retry</button>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Scroll btn */}
      {showScrollBtn&&<button onClick={()=>bottomRef.current?.scrollIntoView({behavior:"smooth"})} style={{position:"absolute",bottom:110,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(124,58,237,0.6)",border:"1px solid rgba(124,58,237,0.4)",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,animation:"fadeIn 0.2s ease"}}>↓</button>}

      {/* Chips */}
      <div style={{padding:"0 14px 6px",flexShrink:0,zIndex:2}}>
        {showChips?(
          <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
            {chips.map(p=><button key={p} className="chip" onClick={()=>send(p)} style={{background:`rgba(${mod.id==="anxiety"?"249,115,22":"124,58,237"},0.12)`,border:`1px solid rgba(${mod.id==="anxiety"?"249,115,22":"124,58,237"},0.25)`,borderRadius:50,padding:"7px 12px",fontSize:12,color:modColor,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{p}</button>)}
          </div>
        ):(
          <button onClick={()=>setShowChips(true)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:0}}>+ Suggestions</button>
        )}
      </div>

      {/* Crisis banner */}
      {crisisVisible&&(
        <div style={{padding:"9px 16px",background:"rgba(239,68,68,0.1)",borderTop:"1px solid rgba(239,68,68,0.2)",display:"flex",alignItems:"center",gap:10,flexShrink:0,zIndex:2,animation:"fadeUp 0.4s ease"}}>
          <span style={{fontSize:14}}>🚨</span>
          <div style={{flex:1,fontSize:12}}><span style={{color:"#FCA5A5",fontWeight:600}}>You matter. </span><span style={{color:C.muted}}>Call or text <strong style={{color:C.subtle}}>988</strong> — free, 24/7</span></div>
          <button onClick={()=>setCrisisVisible(false)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:9,alignItems:"flex-end",flexShrink:0,zIndex:2,background:C.bg}}>
        <div style={{flex:1,position:"relative"}}>
          {!input&&<span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#334155",fontSize:14,pointerEvents:"none"}}>Say anything…</span>}
          <textarea ref={inputRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} rows={1} disabled={loading} aria-label="Your message" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1.5px solid ${C.border}`,borderRadius:18,padding:"11px 16px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"system-ui,sans-serif",lineHeight:1.5,maxHeight:100,display:"block"}}/>
        </div>
        <button className="send-btn" onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,background:loading||!input.trim()?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${modColor},${C.violetDim})`,color:loading||!input.trim()?"#334155":"#fff",cursor:loading||!input.trim()?"default":"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:loading||!input.trim()?"none":`0 0 18px ${modColor}66`}}>↑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Home({ onSelect, onPanic, onScan }) {
  const [search,setSearch]=useState("");
  const filtered=MODULES.filter(m=>m.label.toLowerCase().includes(search.toLowerCase())||m.desc.toLowerCase().includes(search.toLowerCase()));
  const featured=MODULES.slice(0,3);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",paddingBottom:80}}>
      {/* Hero */}
      <div style={{position:"relative",padding:"32px 20px 24px",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#7C3AED1A,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-60,left:-40,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,#2DD4BF12,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={52}/>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.18em",color:C.aqua,fontWeight:700,textTransform:"uppercase"}}>Mental wellness</div>
              <h1 style={{color:C.text,fontSize:26,fontWeight:800,fontFamily:"Georgia,serif",letterSpacing:"-0.5px"}}>Mind<span style={{color:C.aqua}}>Bridge</span></h1>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,background:"rgba(45,212,191,0.08)",border:"1px solid rgba(45,212,191,0.2)",borderRadius:50,padding:"5px 12px"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.aqua,animation:"pulse 2s infinite",display:"inline-block"}}/>
              <span style={{color:C.aqua,fontSize:11,fontWeight:600}}>AI Ready</span>
            </div>
          </div>
          <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:20}}>Choose a module or search for what you need. Every conversation is private.</p>
          {/* Search */}
          <div style={{position:"relative",marginBottom:10}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search modules…" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:50,padding:"10px 16px 10px 36px",fontSize:14,color:C.text,outline:"none",fontFamily:"system-ui,sans-serif"}}/>
          </div>
          {/* Scan mood CTA */}
          <button onClick={onScan} className="action-btn" style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1px solid rgba(45,212,191,0.3)`,background:"rgba(45,212,191,0.07)",color:C.aqua,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <span style={{fontSize:18}}>📷</span>
            <span>Scan my face — detect my mood</span>
            <span style={{marginLeft:"auto",fontSize:11,background:"rgba(45,212,191,0.15)",borderRadius:50,padding:"2px 8px",fontWeight:600}}>AI</span>
          </button>
        </div>
      </div>

      {/* Featured — only when not searching */}
      {!search&&(
        <div style={{padding:"0 20px 20px"}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Start here</div>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
            {featured.map(m=>(
              <button key={m.id} className="mod-card action-btn" onClick={()=>onSelect(m)} style={{flexShrink:0,width:160,background:`linear-gradient(135deg,${m.color}18,rgba(255,255,255,0.03))`,border:`1px solid ${m.color}30`,borderRadius:18,padding:"16px 14px",textAlign:"left",cursor:"pointer",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,${m.color}20,transparent 70%)`}}/>
                <div style={{fontSize:24,marginBottom:8}}>{m.icon}</div>
                <div style={{color:C.text,fontWeight:700,fontSize:13,marginBottom:4,fontFamily:"Georgia,serif"}}>{m.label}</div>
                <div style={{color:C.muted,fontSize:11,lineHeight:1.5}}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All modules */}
      <div style={{padding:"0 20px"}}>
        <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>{search?"Results":"All modules"} · {filtered.length}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(m=>(
            <button key={m.id} className="mod-card action-btn" onClick={()=>onSelect(m)} style={{background:`rgba(255,255,255,0.03)`,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,textAlign:"left",cursor:"pointer",width:"100%"}}>
              <div style={{width:44,height:44,borderRadius:14,background:`linear-gradient(135deg,${m.color}22,${m.color}11)`,border:`1px solid ${m.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{color:C.text,fontWeight:700,fontSize:14,fontFamily:"Georgia,serif"}}>{m.label}</span>
                  <span style={{fontSize:10,color:m.color,background:`${m.color}18`,border:`1px solid ${m.color}30`,borderRadius:50,padding:"1px 7px",fontWeight:600,flexShrink:0}}>{m.tag}</span>
                </div>
                <div style={{color:C.muted,fontSize:12,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.desc}</div>
              </div>
              <div style={{color:C.muted,fontSize:16,flexShrink:0}}>›</div>
            </button>
          ))}
        </div>
      </div>

      {/* Crisis footer */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 20px",background:"rgba(10,8,24,0.95)",backdropFilter:"blur(10px)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,zIndex:50}}>
        <span style={{fontSize:14}}>🚨</span>
        <span style={{fontSize:12,color:C.muted,flex:1}}>In crisis? Call or text <strong style={{color:C.subtle}}>988</strong> — free, confidential, 24/7</span>
        <button onClick={onPanic} style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:50,padding:"5px 12px",color:"#F87171",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>Panic help ⚡</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACE MOOD SCANNER
// ─────────────────────────────────────────────────────────────────────────────
const MOOD_MAP = {
  happy:      { mod:"chat",       label:"Happy",       emoji:"😊", color:"#F59E0B", desc:"You look bright — let's keep that energy going.", orb:["#7C3AED","#F59E0B","#EC4899"] },
  sad:        { mod:"grief",      label:"Sad",         emoji:"😢", color:"#818CF8", desc:"You seem heavy today. Let's talk through it gently.", orb:["#1E1B4B","#4338CA","#818CF8"] },
  angry:      { mod:"burnout",    label:"Frustrated",  emoji:"😤", color:"#EF4444", desc:"There's tension in your expression. Let's unpack it.", orb:["#431407","#991B1B","#EF4444"] },
  anxious:    { mod:"anxiety",    label:"Anxious",     emoji:"😰", color:"#F97316", desc:"Your face shows worry. Let's ground you right now.", orb:["#431407","#9A3412","#F97316"] },
  tired:      { mod:"sleep",      label:"Exhausted",   emoji:"😴", color:"#6366F1", desc:"You look worn out. Let's work on rest and recovery.", orb:["#1E1B4B","#3730A3","#818CF8"] },
  neutral:    { mod:"chat",       label:"Neutral",     emoji:"😐", color:"#94A3B8", desc:"Hard to read — let's check in and find out how you really are.", orb:["#1E293B","#475569","#7C3AED"] },
  stressed:   { mod:"burnout",    label:"Stressed",    emoji:"😓", color:"#F97316", desc:"Stress is written on your face. Let's bring it down.", orb:["#431407","#9A3412","#F97316"] },
  overwhelmed:{ mod:"anxiety",    label:"Overwhelmed", emoji:"🌊", color:"#2DD4BF", desc:"You look like you're carrying a lot. Let's lighten it.", orb:["#0F172A","#0F766E","#2DD4BF"] },
};

const SCAN_SYSTEM = `You are a compassionate facial mood analysis AI for MindBridge, a mental health app.

Analyze the person's facial expression in the image and respond ONLY with valid JSON — no extra text, no markdown.

Format:
{"mood":"happy","confidence":85,"observations":["relaxed brow","slight smile","soft eyes"],"message":"A warm one-sentence empathetic reflection directed at the person","suggestedModule":"chat"}

mood must be one of: happy, sad, angry, anxious, tired, neutral, stressed, overwhelmed
confidence: 0-100
observations: 2-4 brief facial cues you noticed
message: one warm sentence speaking directly to the person about what you see
suggestedModule: one of: chat, anxiety, sleep, grief, social, adhd, recovery, trauma, burnout, postpartum`;

function FaceMoodScanner({ onResult, onBack }) {
  const [phase, setPhase]       = useState("intro");   // intro | preview | scanning | result | error
  const [imgData, setImgData]   = useState(null);
  const [result, setResult]     = useState(null);
  const [errMsg, setErrMsg]     = useState("");
  const [scanDots, setScanDots] = useState(0);
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  // Animate scan dots
  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setScanDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Stop camera stream on unmount
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setPhase("camera");
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      setErrMsg("Camera access denied. Please upload a photo instead.");
      setPhase("error");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    streamRef.current?.getTracks().forEach(t => t.stop());
    setImgData(data);
    setPhase("preview");
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrMsg("Please select an image file."); setPhase("error"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setImgData(ev.target.result.split(",")[1]); setPhase("preview"); };
    reader.readAsDataURL(file);
  }

  async function analyse() {
    setPhase("scanning");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: SCAN_SYSTEM,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgData } },
              { type: "text",  text: "Analyse this person's mood from their facial expression and respond with JSON only." }
            ]
          }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setPhase("result");
    } catch (e) {
      setErrMsg("Couldn't analyse the image. Please try a clearer photo with good lighting.");
      setPhase("error");
    }
  }

  const moodInfo = result ? (MOOD_MAP[result.mood] || MOOD_MAP.neutral) : null;
  const confColor = result ? (result.confidence >= 75 ? "#10B981" : result.confidence >= 50 ? "#F59E0B" : "#EF4444") : "#fff";

  // ── INTRO ──
  if (phase === "intro") return (
    <div className="screen" style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:C.muted, fontSize:18, cursor:"pointer", lineHeight:1 }}>←</button>
        <div style={{ color:C.text, fontWeight:700, fontSize:15, fontFamily:"Georgia,serif" }}>Mood Scanner</div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", textAlign:"center" }}>
        {/* Animated scan icon */}
        <div style={{ position:"relative", width:130, height:130, marginBottom:28 }}>
          <Orb colors={["#7C3AED","#4F46E5","#2DD4BF"]} size={130} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>🧠</div>
          {/* scan line */}
          <div style={{ position:"absolute", left:"10%", right:"10%", height:2, background:"linear-gradient(90deg,transparent,#2DD4BF,transparent)", top:"50%", animation:"scanLine 2s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes scanLine{0%,100%{top:20%;}50%{top:80%;}}`}</style>

        <div style={{ fontSize:11, letterSpacing:"0.15em", color:C.aqua, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>AI Face Analysis</div>
        <h2 style={{ color:C.text, fontSize:24, fontWeight:800, fontFamily:"Georgia,serif", letterSpacing:"-0.5px", marginBottom:10 }}>How are you really feeling?</h2>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.7, marginBottom:32, maxWidth:320 }}>
          Take a photo or upload one. MindBridge reads your facial expression and routes you to the right support — no self-reporting needed.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:320 }}>
          <button onClick={openCamera} className="action-btn" style={{ padding:"14px", borderRadius:16, border:"none", background:`linear-gradient(135deg,${C.violet},${C.violetDim})`, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 0 24px ${C.violet}44` }}>
            📷 Take a photo
          </button>
          <button onClick={() => fileRef.current?.click()} className="action-btn" style={{ padding:"14px", borderRadius:16, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.04)", color:C.text, fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            🖼 Upload a photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }} />
        </div>

        <p style={{ color:"#334155", fontSize:11.5, marginTop:20, lineHeight:1.6 }}>
          Images are sent directly to the AI and never stored.<br/>For best results use good lighting, face the camera.
        </p>
      </div>
    </div>
  );

  // ── CAMERA ──
  if (phase === "camera") return (
    <div className="screen" style={{ height:"100vh", background:"#000", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:10, position:"absolute", top:0, left:0, right:0, zIndex:10, background:"linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
        <button onClick={() => { streamRef.current?.getTracks().forEach(t=>t.stop()); setPhase("intro"); }} style={{ background:"none", border:"none", color:"#fff", fontSize:18, cursor:"pointer" }}>←</button>
        <span style={{ color:"#fff", fontWeight:600, fontSize:14 }}>Position your face in frame</span>
      </div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      {/* face guide oval */}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <div style={{ width:200, height:260, borderRadius:"50%", border:"2px dashed rgba(45,212,191,0.6)", boxShadow:"0 0 0 4000px rgba(0,0,0,0.35)" }} />
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"24px 20px 40px", display:"flex", flexDirection:"column", alignItems:"center", gap:16, background:"linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, textAlign:"center" }}>Centre your face in the oval, then tap capture</p>
        <button onClick={capture} style={{ width:68, height:68, borderRadius:"50%", border:"4px solid #fff", background:"rgba(255,255,255,0.15)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📷</button>
      </div>
    </div>
  );

  // ── PREVIEW ──
  if (phase === "preview") return (
    <div className="screen" style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={() => setPhase("intro")} style={{ background:"none", border:"none", color:C.muted, fontSize:18, cursor:"pointer" }}>←</button>
        <span style={{ color:C.text, fontWeight:700, fontSize:15, fontFamily:"Georgia,serif" }}>Ready to scan?</span>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", gap:24 }}>
        <div style={{ position:"relative", borderRadius:20, overflow:"hidden", border:`2px solid ${C.border}`, maxWidth:280, width:"100%" }}>
          <img src={`data:image/jpeg;base64,${imgData}`} alt="Your photo" style={{ width:"100%", display:"block" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 60%, rgba(10,8,24,0.5))" }} />
        </div>
        <div style={{ textAlign:"center" }}>
          <p style={{ color:C.subtle, fontSize:14, lineHeight:1.6, marginBottom:6 }}>MindBridge will analyse your facial expression and route you to the right module.</p>
          <p style={{ color:C.muted, fontSize:12 }}>No image is stored — it's processed and discarded.</p>
        </div>
        <div style={{ display:"flex", gap:12, width:"100%", maxWidth:320 }}>
          <button onClick={() => setPhase("intro")} style={{ flex:1, padding:"13px", borderRadius:14, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.04)", color:C.subtle, fontSize:14, fontWeight:600, cursor:"pointer" }}>Retake</button>
          <button onClick={analyse} style={{ flex:2, padding:"13px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${C.violet},${C.violetDim})`, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:`0 0 20px ${C.violet}44` }}>Scan my mood →</button>
        </div>
      </div>
    </div>
  );

  // ── SCANNING ──
  if (phase === "scanning") return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", padding:32, textAlign:"center" }}>
      <div style={{ position:"relative", width:160, height:160, marginBottom:28 }}>
        <img src={`data:image/jpeg;base64,${imgData}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%", opacity:0.5 }} />
        {/* scanning ring */}
        <svg style={{ position:"absolute", inset:0, animation:"orbPulse 2s linear infinite" }} viewBox="0 0 160 160" width="160" height="160">
          <circle cx="80" cy="80" r="74" fill="none" stroke={C.violet} strokeWidth="3" strokeDasharray="12 8" strokeLinecap="round" />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:32 }}>🧠</div>
        </div>
      </div>
      <div style={{ color:C.text, fontSize:18, fontWeight:700, fontFamily:"Georgia,serif", marginBottom:8 }}>Reading your expression{".".repeat(scanDots)}</div>
      <div style={{ color:C.muted, fontSize:13, lineHeight:1.6, maxWidth:280 }}>Analysing facial muscles, micro-expressions, and emotional cues…</div>
    </div>
  );

  // ── RESULT ──
  if (phase === "result" && result && moodInfo) return (
    <div className="screen" style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", overflow:"auto" }}>
      {/* Ambient glow */}
      <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:400, height:250, background:`radial-gradient(ellipse,${moodInfo.color}22,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />

      <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.border}`, position:"relative", zIndex:1 }}>
        <button onClick={() => setPhase("intro")} style={{ background:"none", border:"none", color:C.muted, fontSize:18, cursor:"pointer" }}>←</button>
        <span style={{ color:C.text, fontWeight:700, fontSize:15, fontFamily:"Georgia,serif" }}>Mood Detected</span>
      </div>

      <div style={{ flex:1, padding:"28px 24px", display:"flex", flexDirection:"column", gap:20, position:"relative", zIndex:1 }}>
        {/* Photo + orb side by side */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <img src={`data:image/jpeg;base64,${imgData}`} alt="" style={{ width:90, height:90, objectFit:"cover", borderRadius:"50%", border:`3px solid ${moodInfo.color}66` }} />
            <div style={{ position:"absolute", bottom:-4, right:-4, width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${moodInfo.color},${C.violetDim})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, border:`2px solid ${C.bg}` }}>{moodInfo.emoji}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Detected mood</div>
            <div style={{ color:moodInfo.color, fontSize:26, fontWeight:800, fontFamily:"Georgia,serif", letterSpacing:"-0.5px", marginBottom:4 }}>{moodInfo.label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.06)", borderRadius:3 }}>
                <div style={{ height:"100%", width:`${result.confidence}%`, background:confColor, borderRadius:3, transition:"width 1s ease" }} />
              </div>
              <span style={{ fontSize:11, color:confColor, fontWeight:700, flexShrink:0 }}>{result.confidence}%</span>
            </div>
            <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>confidence</div>
          </div>
        </div>

        {/* AI message */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${moodInfo.color}30`, borderRadius:16, padding:"16px 18px", borderLeft:`3px solid ${moodInfo.color}` }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.violet},#2DD4BF)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>✦</div>
            <p style={{ color:C.text, fontSize:14, lineHeight:1.65, margin:0 }}>{result.message}</p>
          </div>
        </div>

        {/* Observations */}
        <div>
          <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>What I noticed</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {result.observations?.map((obs, i) => (
              <span key={i} style={{ background:`${moodInfo.color}12`, border:`1px solid ${moodInfo.color}28`, borderRadius:50, padding:"5px 12px", fontSize:12, color:moodInfo.color, fontWeight:500 }}>{obs}</span>
            ))}
          </div>
        </div>

        {/* Recommended module */}
        {(() => {
          const recMod = MODULES.find(m => m.id === (result.suggestedModule || moodInfo.mod)) || MODULES[0];
          return (
            <div>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Recommended for you</div>
              <div style={{ background:`linear-gradient(135deg,${recMod.color}16,rgba(255,255,255,0.02))`, border:`1px solid ${recMod.color}30`, borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${recMod.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{recMod.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:700, fontSize:14, fontFamily:"Georgia,serif" }}>{recMod.label}</div>
                  <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{moodInfo.desc}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:4 }}>
          <button onClick={() => onResult(MODULES.find(m => m.id === (result.suggestedModule || moodInfo.mod)) || MODULES[0])} style={{ padding:"14px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${moodInfo.color},${C.violetDim})`, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 0 20px ${moodInfo.color}44` }}>
            Start {MODULES.find(m=>m.id===(result.suggestedModule||moodInfo.mod))?.label || "session"} →
          </button>
          <button onClick={() => setPhase("intro")} style={{ padding:"13px", borderRadius:14, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.03)", color:C.subtle, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Scan again
          </button>
        </div>
      </div>
    </div>
  );

  // ── ERROR ──
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
      <div style={{ color:"#F87171", fontWeight:700, fontSize:16, marginBottom:8 }}>Scan failed</div>
      <div style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:24, maxWidth:280 }}>{errMsg}</div>
      <button onClick={() => setPhase("intro")} style={{ padding:"12px 24px", borderRadius:50, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.05)", color:C.text, fontSize:14, fontWeight:600, cursor:"pointer" }}>Try again</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [panicMode,    setPanicMode]    = useState(false);
  const [scanMode,     setScanMode]     = useState(false);

  const panicMod = MODULES.find(m => m.id === "anxiety");

  return (
    <div style={{ maxWidth:480, margin:"0 auto", height:"100vh", position:"relative", overflow:"hidden" }}>
      <style>{CSS}</style>
      {panicMode ? (
        <ChatModule mod={panicMod} onBack={() => setPanicMode(false)} onPanic={() => {}} />
      ) : scanMode ? (
        <FaceMoodScanner
          onBack={() => setScanMode(false)}
          onResult={mod => { setScanMode(false); setActiveModule(mod); }}
        />
      ) : activeModule ? (
        <ChatModule mod={activeModule} onBack={() => setActiveModule(null)} onPanic={() => setPanicMode(true)} />
      ) : (
        <Home onSelect={setActiveModule} onPanic={() => setPanicMode(true)} onScan={() => setScanMode(true)} />
      )}
    </div>
  );
}
