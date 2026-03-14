import { useState, useEffect, useCallback, useRef } from "react";

const JUZ_NAMES = [
  "Alif Lām Mīm","Sayaqūl","Tilkar Rusul","Lan Tana Lu","Wal Muhsanat",
  "Lā Yuhibbullāh","Wa Idhā Sami'u","Wa Law Annanā","Qālal Mala'u","Wa'lamu",
  "Ya'tadhirūna","Wa Mā Min Dābbah","Wa Mā Ubarri'u","Rubamā","Subhānallad̲ī",
  "Qāla Alam","Iqtaraba","Qad Aflaha","Wa Qālallad̲īna","Amman Khalaq",
  "Utlu Mā Ūhiya","Wa Man Yaqnut","Wa Mā Liya","Faman Azlam","Ilayhī Yuraddu",
  "Hā Mīm","Qāla Fama Khatbukum","Qad Sami'allāh","Tabārak","'Amma"
];

const Q_LABELS = ["1st Quarter","2nd Quarter","3rd Quarter","4th Quarter"];
const Q_SHORT = ["Q1","Q2","Q3","Q4"];
const ADMIN_PW = "quran2025";

const COLORS = {
  av: { bg:"#0f2744", border:"#1e5fa8", text:"#7ab8f0", label:"Available" },
  cl: { bg:"#0f2d0f", border:"#1e7a1e", text:"#6dcc6d", label:"In Progress" },
  dn: { bg:"#2d0f0f", border:"#8a1e1e", text:"#e07070", label:"Completed" },
} as const;

type StatusKey = keyof typeof COLORS;

interface Slot {
  juz: number;
  q: number;
  status: StatusKey;
  by: string | null;
  at: string | null;
  done_at: string | null;
}

function makeDummySlots(): Slot[] {
  const names = ["Ahmad","Fatima","Yusuf","Maryam","Ibrahim","Aisha","Omar","Zainab","Hassan","Noor","Bilal","Khadija"];
  const counts: Record<string, number> = {};
  return Array.from({ length: 120 }, (_, i) => {
    const juz = Math.floor(i / 4) + 1;
    const q = (i % 4) + 1;
    const r = Math.random();
    let status: StatusKey = "av", by: string | null = null, at: string | null = null, done_at: string | null = null;
    if (r < 0.3) {
      const n = names[Math.floor(Math.random() * names.length)];
      if ((counts[n] || 0) < 8) {
        status = "dn"; by = n;
        at = new Date(Date.now() - Math.random() * 3.6e6 * 4).toISOString();
        done_at = new Date(Date.now() - Math.random() * 3.6e6).toISOString();
        counts[n] = (counts[n] || 0) + 1;
      }
    } else if (r < 0.5) {
      const n = names[Math.floor(Math.random() * names.length)];
      if ((counts[n] || 0) < 8) {
        status = "cl"; by = n;
        at = new Date(Date.now() - Math.random() * 3.6e6 * 2).toISOString();
        counts[n] = (counts[n] || 0) + 1;
      }
    }
    return { juz, q, status, by, at, done_at };
  });
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function isStale(slot: Slot) {
  return slot.status === "cl" && slot.at && Date.now() - new Date(slot.at).getTime() > 36e5;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  slot: Slot;
  juz: number;
  q: number;
  onClose: () => void;
  onBook: (juz: number, q: number, name: string) => { err: string } | undefined;
  onComplete: (juz: number, q: number, name: string) => { err: string } | undefined;
}

function Modal({ slot, juz, q, onClose, onBook, onComplete }: ModalProps) {
  const [name, setName] = useState(slot.by || "");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const doBook = () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    const res = onBook(juz, q, name.trim());
    if (res?.err) setErr(res.err);
  };

  const doComplete = () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    const res = onComplete(juz, q, name.trim());
    if (res?.err) setErr(res.err);
  };

  const c = COLORS[slot.status];

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,
      display:"flex",alignItems:"flex-end",justifyContent:"center"
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#1a150d",border:"1px solid rgba(201,168,76,0.35)",
        borderRadius:"14px 14px 0 0",padding:"24px 20px 32px",
        width:"100%",maxWidth:480,
        animation:"slideUp 0.25s ease"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"'Palatino Linotype',Georgia,serif",fontSize:17,color:"#e8c96a",marginBottom:3}}>
              Juz {juz} — {Q_LABELS[q-1]}
            </div>
            <div style={{fontSize:12,color:"rgba(240,226,192,0.5)",fontFamily:"sans-serif"}}>{JUZ_NAMES[juz-1]}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(240,226,192,0.4)",fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>×</button>
        </div>

        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",border:`1px solid ${c.border}`,borderRadius:20,padding:"4px 12px",marginBottom:20}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:c.border,display:"inline-block"}}/>
          <span style={{fontSize:12,color:c.text,fontFamily:"sans-serif"}}>{c.label}{slot.by ? ` — ${slot.by}` : ""}</span>
        </div>

        {slot.at && (
          <div style={{fontSize:11,color:"rgba(240,226,192,0.35)",fontFamily:"sans-serif",marginBottom:16}}>
            {slot.status==="dn" ? `Completed ${timeAgo(slot.done_at)}` : `Claimed ${timeAgo(slot.at)}`}
          </div>
        )}

        {slot.status === "av" && (
          <>
            <div style={{fontSize:13,color:"rgba(240,226,192,0.6)",fontFamily:"sans-serif",marginBottom:10}}>Enter your name to claim this section:</div>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doBook()}
              placeholder="Your name"
              style={{width:"100%",background:"#221c10",border:"1px solid rgba(201,168,76,0.25)",color:"#f0e2c0",padding:"11px 14px",borderRadius:6,fontSize:14,outline:"none",fontFamily:"sans-serif",marginBottom:6}}/>
            {err && <div style={{fontSize:12,color:"#e07070",marginBottom:10,fontFamily:"sans-serif"}}>{err}</div>}
            <button onClick={doBook} style={{width:"100%",background:"#1e5fa8",border:"1px solid #2a7ad4",color:"#c8e4ff",padding:13,borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:"sans-serif",fontWeight:"bold",marginTop:4}}>
              Claim This Quarter
            </button>
          </>
        )}

        {slot.status === "cl" && (
          <>
            <div style={{fontSize:13,color:"rgba(240,226,192,0.6)",fontFamily:"sans-serif",marginBottom:10}}>Confirm your name to mark complete:</div>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doComplete()}
              placeholder={slot.by || "Your name"}
              style={{width:"100%",background:"#221c10",border:"1px solid rgba(201,168,76,0.25)",color:"#f0e2c0",padding:"11px 14px",borderRadius:6,fontSize:14,outline:"none",fontFamily:"sans-serif",marginBottom:6}}/>
            {err && <div style={{fontSize:12,color:"#e07070",marginBottom:10,fontFamily:"sans-serif"}}>{err}</div>}
            <button onClick={doComplete} style={{width:"100%",background:"#4a0f0f",border:"1px solid #8a1e1e",color:"#f0a0a0",padding:13,borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:"sans-serif",fontWeight:"bold",marginTop:4}}>
              ✓ Mark Complete
            </button>
          </>
        )}

        {slot.status === "dn" && (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:28,marginBottom:8}}>✨</div>
            <div style={{fontFamily:"'Palatino Linotype',Georgia,serif",color:"#e8c96a",fontSize:15,marginBottom:6}}>الحمد لله</div>
            <div style={{fontSize:13,color:"rgba(240,226,192,0.5)",fontFamily:"sans-serif"}}>May Allah accept the recitation.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quarter Card ──────────────────────────────────────────────────────────────
interface QCardProps {
  slot: Slot;
  juz: number;
  q: number;
  adminMode: boolean;
  adminSelected: { juz: number; q: number } | null;
  onSelect: (juz: number, q: number) => void;
  onOpenModal: (juz: number, q: number) => void;
}

function QCard({ slot, juz, q, adminMode, adminSelected, onSelect, onOpenModal }: QCardProps) {
  const c = COLORS[slot.status];
  const stale = isStale(slot);
  const isAdminSel = adminMode && adminSelected?.juz===juz && adminSelected?.q===q;

  return (
    <div
      onClick={() => adminMode ? onSelect(juz, q) : onOpenModal(juz, q)}
      style={{
        background: c.bg,
        border: `1px solid ${isAdminSel ? "#e8c96a" : stale ? "rgba(255,140,0,0.5)" : c.border}`,
        borderRadius: 8,
        padding: "10px 6px 8px",
        cursor: "pointer",
        textAlign: "center",
        position: "relative",
        transition: "transform 0.12s, border-color 0.15s",
        boxShadow: isAdminSel ? "0 0 0 2px rgba(232,201,106,0.4)" : "none",
        userSelect: "none",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"}
    >
      {stale && <span style={{position:"absolute",top:3,right:5,fontSize:9,color:"orange",fontFamily:"sans-serif"}}>!</span>}
      <div style={{fontSize:10,color:c.text,opacity:0.7,fontFamily:"sans-serif",marginBottom:3}}>{Q_SHORT[q-1]}</div>
      <div style={{fontSize:16,color:c.text}}>{slot.status==="dn"?"✓":slot.status==="cl"?"◎":"◌"}</div>
      {slot.by && <div style={{fontSize:8,color:c.text,opacity:0.75,marginTop:3,fontFamily:"sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{slot.by.split(" ")[0]}</div>}
      {slot.status==="cl" && !adminMode && (
        <div
          onClick={e=>{e.stopPropagation();onOpenModal(juz,q);}}
          style={{marginTop:5,background:"rgba(139,30,30,0.5)",border:"1px solid #8a1e1e",color:"#f08080",fontSize:8,padding:"3px 4px",borderRadius:3,cursor:"pointer",fontFamily:"sans-serif",lineHeight:1.2}}
        >Mark Complete</div>
      )}
    </div>
  );
}

// ── Juz Row ───────────────────────────────────────────────────────────────────
interface JuzRowProps {
  juz: number;
  slots: Slot[];
  adminMode: boolean;
  adminSelected: { juz: number; q: number } | null;
  onSelect: (juz: number, q: number) => void;
  onOpenModal: (juz: number, q: number) => void;
}

function JuzRow({ juz, slots, adminMode, adminSelected, onSelect, onOpenModal }: JuzRowProps) {
  const [open, setOpen] = useState(false);
  const jSlots = slots.filter(s=>s.juz===juz);
  const done = jSlots.filter(s=>s.status==="dn").length;

  return (
    <div style={{background:"#1a150d",border:"1px solid rgba(201,168,76,0.15)",borderRadius:8,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",padding:"10px 14px",cursor:"pointer",gap:10}}>
        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:"#c9a84c",minWidth:50}}>Juz {juz}</div>
        <div style={{flex:1,fontSize:11,color:"rgba(240,226,192,0.45)",fontFamily:"sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{JUZ_NAMES[juz-1]}</div>
        <div style={{display:"flex",gap:3,marginRight:8}}>
          {jSlots.map((s,i)=>(
            <div key={i} style={{width:10,height:5,borderRadius:2,background:s.status==="dn"?COLORS.dn.border:s.status==="cl"?COLORS.cl.border:"rgba(255,255,255,0.1)"}}/>
          ))}
        </div>
        <div style={{fontSize:11,color:"rgba(240,226,192,0.4)",fontFamily:"sans-serif",minWidth:28,textAlign:"right"}}>{done}/4</div>
        <div style={{fontSize:10,color:"rgba(240,226,192,0.3)",marginLeft:4}}>{open?"▲":"▼"}</div>
      </div>
      {open && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:"0 10px 10px"}}>
          {jSlots.map(s=>(
            <QCard key={s.q} slot={s} juz={juz} q={s.q}
              adminMode={adminMode} adminSelected={adminSelected}
              onSelect={onSelect} onOpenModal={onOpenModal}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [slots, setSlots] = useState<Slot[]>(makeDummySlots);
  const [khatamNum, setKhatamNum] = useState(1);
  const [modal, setModal] = useState<{ juz: number; q: number } | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSelected, setAdminSelected] = useState<{ juz: number; q: number } | null>(null);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastRef.current);
    setToast(msg);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const getSlot = useCallback((juz: number, q: number) => slots.find(s=>s.juz===juz&&s.q===q)!, [slots]);
  const countActive = useCallback((name: string) => slots.filter(s=>s.by===name&&s.status==="cl").length, [slots]);

  const done = slots.filter(s=>s.status==="dn").length;
  const prog = slots.filter(s=>s.status==="cl").length;
  const rem = 120 - done - prog;
  const pct = Math.round((done/120)*100);
  const khatmComplete = done === 120;

  const updateSlot = (juz: number, q: number, updates: Partial<Slot>) => {
    setSlots(prev => prev.map(s => s.juz===juz&&s.q===q ? {...s,...updates} : s));
  };

  const onBook = (juz: number, q: number, name: string): { err: string } | undefined => {
    const slot = getSlot(juz, q);
    if (slot.status !== "av") return { err: "This quarter was just claimed. Please choose another." };
    if (countActive(name) >= 8) return { err: "You've reached the limit of 8 quarters. Complete your current portions first." };
    updateSlot(juz, q, { status:"cl", by:name, at:new Date().toISOString(), done_at:null });
    setModal(null);
    showToast(`Juz ${juz} ${Q_SHORT[q-1]} claimed by ${name}`);
  };

  const onComplete = (juz: number, q: number, name: string): { err: string } | undefined => {
    const slot = getSlot(juz, q);
    if (slot.by && name.toLowerCase() !== slot.by.toLowerCase()) return { err: `This was claimed by ${slot.by}. Names don't match.` };
    updateSlot(juz, q, { status:"dn", by:name||slot.by, done_at:new Date().toISOString() });
    setModal(null);
    showToast(`Barakallahu feek! Juz ${juz} ${Q_SHORT[q-1]} completed ✓`);
  };

  const startNewKhatam = () => {
    setKhatamNum(k => k+1);
    setSlots(Array.from({length:120},(_,i)=>({juz:Math.floor(i/4)+1,q:(i%4)+1,status:"av" as StatusKey,by:null,at:null,done_at:null})));
    setAdminSelected(null);
    showToast(`Khatam ${khatamNum+1} has begun — Bismillah!`);
  };

  const tryAdmin = () => {
    if (adminPw === ADMIN_PW) { setAdminMode(true); setAdminErr(""); showToast("Admin mode active"); }
    else setAdminErr("Incorrect password");
  };

  const adminSetStatus = (st: StatusKey) => {
    if (!adminSelected) return;
    const {juz, q} = adminSelected;
    const slot = getSlot(juz, q);
    const updates: Partial<Slot> = st==="av" ? {status:"av",by:null,at:null,done_at:null}
      : st==="cl" ? {status:"cl",by:slot.by||"Admin",at:new Date().toISOString()}
      : {status:"dn",by:slot.by||"Admin",done_at:new Date().toISOString()};
    updateSlot(juz, q, updates);
    showToast(`Set to ${COLORS[st].label}`);
  };

  const modalSlot = modal ? getSlot(modal.juz, modal.q) : null;

  return (
    <div style={{minHeight:"100vh",background:"#13100a",color:"#f0e2c0",fontFamily:"'Palatino Linotype',Georgia,serif"}}>
      <style>{`
        @keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.3)} 50%{box-shadow:0 0 20px 6px rgba(201,168,76,0.15)} }
        * { box-sizing: border-box; }
        input { font-family: sans-serif; }
        button { font-family: sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #13100a; } ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
      `}</style>

      {/* ── TOP ── */}
      <div style={{background:"#1a150d",borderBottom:"1px solid rgba(201,168,76,0.2)",padding:"20px 16px 0",position:"sticky",top:0,zIndex:100}}>
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:24,color:"#e8c96a",letterSpacing:3,marginBottom:2}}>ختم القرآن</div>
          <div style={{fontFamily:"sans-serif",fontSize:10,color:"rgba(240,226,192,0.35)",letterSpacing:4}}>KHATM AL-QURAN TRACKER</div>
          <div style={{fontFamily:"sans-serif",fontSize:12,color:"rgba(201,168,76,0.7)",marginTop:6,letterSpacing:1}}>
            Khatam #{khatamNum} {adminMode && <span style={{color:"#e8c96a",marginLeft:6,fontSize:10,background:"rgba(232,201,106,0.1)",border:"1px solid rgba(232,201,106,0.3)",padding:"1px 8px",borderRadius:10}}>ADMIN</span>}
          </div>
        </div>

        {khatmComplete && (
          <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.4)",borderRadius:8,padding:"14px 16px",marginBottom:14,textAlign:"center",animation:"pulse 2s infinite"}}>
            <div style={{fontSize:18,color:"#e8c96a",marginBottom:4}}>الحمد لله — Khatam {khatamNum} Complete!</div>
            <div style={{fontSize:12,color:"rgba(240,226,192,0.5)",fontFamily:"sans-serif",marginBottom:10}}>May Allah accept from everyone who participated.</div>
            <button onClick={startNewKhatam} style={{background:"#c9a84c",color:"#1a1000",border:"none",padding:"9px 20px",borderRadius:6,fontSize:13,fontWeight:"bold",cursor:"pointer"}}>Begin Khatam {khatamNum+1}</button>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[
            {label:"Completed",val:done,color:COLORS.dn.text},
            {label:"In Progress",val:prog,color:COLORS.cl.text},
            {label:"Remaining",val:rem,color:COLORS.av.text},
          ].map(s=>(
            <div key={s.label} style={{background:"#221c10",border:"1px solid rgba(201,168,76,0.1)",borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:24,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:"sans-serif",fontSize:9,color:"rgba(240,226,192,0.4)",marginTop:3,textTransform:"uppercase",letterSpacing:1}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{height:4,background:"#221c10",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#8b6914,#c9a84c,#e8c96a)",borderRadius:2,transition:"width 0.6s ease"}}/>
        </div>
        <div style={{fontFamily:"sans-serif",fontSize:10,color:"rgba(240,226,192,0.35)",textAlign:"right",padding:"4px 0 12px"}}>{pct}% complete</div>
      </div>

      {/* ── MIDDLE ── */}
      <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {Array.from({length:30},(_,i)=>i+1).map(juz=>(
          <JuzRow key={juz} juz={juz} slots={slots}
            adminMode={adminMode} adminSelected={adminSelected}
            onSelect={(j,q)=>setAdminSelected({juz:j,q})}
            onOpenModal={(j,q)=>setModal({juz:j,q})}/>
        ))}
      </div>

      {/* ── BOTTOM ── */}
      <div style={{padding:"16px 12px",borderTop:"1px solid rgba(201,168,76,0.12)"}}>

        {/* Legend */}
        <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
          {(["av","cl","dn"] as StatusKey[]).map(k=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:7,fontFamily:"sans-serif",fontSize:12,color:"rgba(240,226,192,0.6)"}}>
              <div style={{width:12,height:12,borderRadius:3,background:COLORS[k].border}}/>
              {COLORS[k].label}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div style={{background:"#1a150d",border:"1px solid rgba(201,168,76,0.12)",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
          <div style={{fontFamily:"sans-serif",fontSize:12,color:"rgba(240,226,192,0.5)",lineHeight:1.8}}>
            <span style={{color:"#c9a84c"}}>1.</span> Tap any <span style={{color:COLORS.av.text}}>blue</span> quarter to claim it.<br/>
            <span style={{color:"#c9a84c"}}>2.</span> Enter your name — it turns <span style={{color:COLORS.cl.text}}>green</span> for everyone.<br/>
            <span style={{color:"#c9a84c"}}>3.</span> After reciting, tap <span style={{color:COLORS.dn.text}}>"Mark Complete"</span> on your quarter.<br/>
            <span style={{color:"#c9a84c"}}>4.</span> Maximum <span style={{color:"#e8c96a"}}>8 quarters</span> per person at a time.
          </div>
        </div>

        {/* Admin */}
        <div style={{background:"#1a150d",border:"1px solid rgba(201,168,76,0.2)",borderRadius:8,padding:"14px"}}>
          <div style={{fontFamily:"sans-serif",fontSize:10,color:"#c9a84c",letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Organizer Admin</div>
          {!adminMode ? (
            <div style={{display:"flex",gap:8}}>
              <input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryAdmin()}
                placeholder="Admin password"
                style={{flex:1,background:"#221c10",border:"1px solid rgba(201,168,76,0.2)",color:"#f0e2c0",padding:"9px 12px",borderRadius:6,fontSize:13,outline:"none"}}/>
              <button onClick={tryAdmin} style={{background:"#c9a84c",color:"#1a1000",border:"none",padding:"9px 16px",borderRadius:6,fontSize:12,fontWeight:"bold",cursor:"pointer"}}>Unlock</button>
            </div>
          ) : (
            <div style={{animation:"fadeIn 0.2s ease"}}>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:COLORS.cl.text,marginBottom:12}}>✓ Admin active — tap any quarter to select it</div>
              {adminSelected && (
                <div style={{fontFamily:"sans-serif",fontSize:11,color:"rgba(240,226,192,0.5)",marginBottom:10}}>
                  Selected: Juz {adminSelected.juz} {Q_SHORT[adminSelected.q-1]} ({getSlot(adminSelected.juz,adminSelected.q)?.by || "unclaimed"})
                </div>
              )}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {(["av","cl","dn"] as StatusKey[]).map(st=>(
                  <button key={st} onClick={()=>adminSetStatus(st)} style={{background:COLORS[st].bg,border:`1px solid ${COLORS[st].border}`,color:COLORS[st].text,padding:"7px 12px",borderRadius:6,fontSize:11,cursor:"pointer"}}>{`Set ${COLORS[st].label}`}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={startNewKhatam} style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.3)",color:"#c9a84c",padding:"7px 14px",borderRadius:6,fontSize:11,cursor:"pointer"}}>+ New Khatam</button>
                <button onClick={()=>{setAdminMode(false);setAdminSelected(null);showToast("Admin mode off");}} style={{background:"none",border:"1px solid rgba(255,100,100,0.3)",color:"rgba(255,130,130,0.7)",padding:"7px 14px",borderRadius:6,fontSize:11,cursor:"pointer"}}>Deactivate</button>
              </div>
            </div>
          )}
          {adminErr && <div style={{fontSize:11,color:COLORS.dn.text,marginTop:6,fontFamily:"sans-serif"}}>{adminErr}</div>}
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && modalSlot && (
        <Modal slot={modalSlot} juz={modal.juz} q={modal.q}
          onClose={()=>setModal(null)} onBook={onBook} onComplete={onComplete}/>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#221c10",border:"1px solid rgba(201,168,76,0.4)",color:"#f0e2c0",padding:"10px 20px",borderRadius:20,fontFamily:"sans-serif",fontSize:13,zIndex:500,whiteSpace:"nowrap",animation:"toastIn 0.3s ease",pointerEvents:"none"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
