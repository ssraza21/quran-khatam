import { useState, useEffect, useCallback, useRef } from "react";

const JUZ_NAMES = [
  "Alif Lam Mim","Sayaqul","Tilkar Rusul","Lan Tana Lu","Wal Muhsanat",
  "La Yuhibbullah","Wa Idha Sami'u","Wa Law Annana","Qalal Mala'u","Wa'lamu",
  "Ya'tadhiruna","Wa Ma Min Dabbah","Wa Ma Ubarri'u","Rubama","Subhanallad\u0331i",
  "Qala Alam","Iqtaraba","Qad Aflaha","Wa Qalallad\u0331ina","Amman Khalaq",
  "Utlu Ma Uhiya","Wa Man Yaqnut","Wa Ma Liya","Faman Azlam","Ilayhi Yuraddu",
  "Ha Mim","Qala Fama Khatbukum","Qad Sami'allah","Tabarak","'Amma"
];

const Q_LABELS = ["1st Quarter","2nd Quarter","3rd Quarter","4th Quarter"];
const Q_SHORT = ["Q1","Q2","Q3","Q4"];
const ADMIN_PW = "quran2025";

const COLORS = {
  av: { bg:"#FFFFFF", border:"#E0E0E0", text:"#4A4A4A", accent:"#1565C0", accentBg:"#E3F2FD", label:"Available" },
  cl: { bg:"#FFFDE7", border:"#F9A825", text:"#5D4037", accent:"#F57F17", accentBg:"#FFF8E1", label:"In Progress" },
  dn: { bg:"#E8F5E9", border:"#2E7D32", text:"#1B5E20", accent:"#2E7D32", accentBg:"#C8E6C9", label:"Completed" },
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
      position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#FFFFFF",borderRadius:16,padding:"32px 28px",
        width:"100%",maxWidth:440,
        boxShadow:"0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        animation:"modalIn 0.3s ease"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <h3 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontSize:22,color:"#2C2C2C",marginBottom:4}}>
              Juz {juz} — {Q_LABELS[q-1]}
            </h3>
            <div style={{fontSize:13,color:"#888",fontStyle:"italic"}}>{JUZ_NAMES[juz-1]}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#BBB",fontSize:24,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>×</button>
        </div>

        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:c.accentBg,border:`1px solid ${c.border}`,borderRadius:24,padding:"5px 14px",marginBottom:20}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:c.accent,display:"inline-block"}}/>
          <span style={{fontSize:13,color:c.text,fontWeight:500}}>{c.label}{slot.by ? ` — ${slot.by}` : ""}</span>
        </div>

        {slot.at && (
          <div style={{fontSize:12,color:"#999",marginBottom:16}}>
            {slot.status==="dn" ? `Completed ${timeAgo(slot.done_at)}` : `Claimed ${timeAgo(slot.at)}`}
          </div>
        )}

        {slot.status === "av" && (
          <>
            <div style={{fontSize:14,color:"#666",marginBottom:12}}>Enter your name to claim this section:</div>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doBook()}
              placeholder="Your name"
              style={{width:"100%",background:"#F8F8F8",border:"1px solid #E0E0E0",color:"#333",padding:"12px 16px",borderRadius:8,fontSize:15,outline:"none",marginBottom:8,transition:"border-color 0.2s"}}
            />
            {err && <div style={{fontSize:13,color:"#D32F2F",marginBottom:10}}>{err}</div>}
            <button onClick={doBook} style={{width:"100%",background:"#8B0000",border:"none",color:"#FFF",padding:"14px",borderRadius:24,fontSize:15,cursor:"pointer",fontWeight:600,marginTop:4,letterSpacing:0.3}}>
              Claim This Quarter
            </button>
          </>
        )}

        {slot.status === "cl" && (
          <>
            <div style={{fontSize:14,color:"#666",marginBottom:12}}>Confirm your name to mark complete:</div>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doComplete()}
              placeholder={slot.by || "Your name"}
              style={{width:"100%",background:"#F8F8F8",border:"1px solid #E0E0E0",color:"#333",padding:"12px 16px",borderRadius:8,fontSize:15,outline:"none",marginBottom:8,transition:"border-color 0.2s"}}
            />
            {err && <div style={{fontSize:13,color:"#D32F2F",marginBottom:10}}>{err}</div>}
            <button onClick={doComplete} style={{width:"100%",background:"#2E7D32",border:"none",color:"#FFF",padding:"14px",borderRadius:24,fontSize:15,cursor:"pointer",fontWeight:600,marginTop:4,letterSpacing:0.3}}>
              Mark Complete
            </button>
          </>
        )}

        {slot.status === "dn" && (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:36,marginBottom:10,color:"#2E7D32"}}>&#10003;</div>
            <h3 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",color:"#8B0000",fontSize:20,marginBottom:8}}>
              Alhamdulillah
            </h3>
            <div style={{fontSize:14,color:"#888"}}>May Allah accept the recitation.</div>
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

  const statusIcon = slot.status === "dn" ? "\u2713" : slot.status === "cl" ? "\u25CE" : "\u25CB";

  return (
    <div
      onClick={() => adminMode ? onSelect(juz, q) : onOpenModal(juz, q)}
      style={{
        background: c.bg,
        border: `1.5px solid ${isAdminSel ? "#8B0000" : stale ? "#FF8F00" : c.border}`,
        borderRadius: 10,
        padding: "14px 8px 12px",
        cursor: "pointer",
        textAlign: "center",
        position: "relative",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: isAdminSel ? "0 0 0 3px rgba(139,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
        userSelect: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isAdminSel
          ? "0 0 0 3px rgba(139,0,0,0.2), 0 6px 16px rgba(0,0,0,0.1)"
          : "0 6px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isAdminSel
          ? "0 0 0 3px rgba(139,0,0,0.2)"
          : "0 1px 3px rgba(0,0,0,0.06)";
      }}
    >
      {stale && <span style={{position:"absolute",top:4,right:6,fontSize:10,color:"#FF8F00",fontWeight:700}}>!</span>}
      <div style={{fontSize:11,color:"#999",fontWeight:500,marginBottom:4,letterSpacing:0.5}}>{Q_SHORT[q-1]}</div>
      <div style={{fontSize:20,color:c.accent,fontWeight:600}}>{statusIcon}</div>
      {slot.by && <div style={{fontSize:10,color:c.text,fontWeight:500,marginTop:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{slot.by.split(" ")[0]}</div>}
      {slot.status==="cl" && !adminMode && (
        <div
          onClick={e=>{e.stopPropagation();onOpenModal(juz,q);}}
          style={{marginTop:6,background:"#8B0000",color:"#FFF",fontSize:9,padding:"3px 6px",borderRadius:12,cursor:"pointer",lineHeight:1.3,fontWeight:600,letterSpacing:0.3}}
        >Complete</div>
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
  const allDone = done === 4;

  return (
    <div style={{
      background:"#FFFFFF",
      border:"1px solid #E8E8E8",
      borderRadius:10,
      overflow:"hidden",
      transition:"box-shadow 0.2s ease",
      boxShadow: open ? "0 4px 12px rgba(0,0,0,0.06)" : "none"
    }}>
      <div
        onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",padding:"14px 18px",cursor:"pointer",gap:12,
        background: allDone ? "#FAFFF9" : "transparent"
      }}>
        <div style={{
          fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontWeight:600,fontSize:15,
          color: allDone ? "#2E7D32" : "#8B0000",minWidth:55
        }}>Juz {juz}</div>
        <div style={{flex:1,fontSize:13,color:"#999",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {JUZ_NAMES[juz-1]}
        </div>
        <div style={{display:"flex",gap:4,marginRight:8}}>
          {jSlots.map((s,i)=>(
            <div key={i} style={{
              width:12,height:6,borderRadius:3,
              background: s.status==="dn" ? "#2E7D32" : s.status==="cl" ? "#F9A825" : "#E0E0E0"
            }}/>
          ))}
        </div>
        <div style={{fontSize:13,color:"#999",fontWeight:500,minWidth:28,textAlign:"right"}}>{done}/4</div>
        <div style={{fontSize:11,color:"#CCC",marginLeft:4,transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>&#9660;</div>
      </div>
      {open && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 14px 14px",animation:"fadeIn 0.2s ease"}}>
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
    showToast(`Barakallahu feek! Juz ${juz} ${Q_SHORT[q-1]} completed`);
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
    <div style={{minHeight:"100vh",background:"#F3F3F3"}}>
      <style>{`
        @keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(139,0,0,0.2)} 50%{box-shadow:0 0 24px 8px rgba(139,0,0,0.08)} }
        @keyframes progressGlow { 0%{box-shadow:0 0 8px rgba(139,0,0,0.3)} 50%{box-shadow:0 0 16px rgba(139,0,0,0.5)} 100%{box-shadow:0 0 8px rgba(139,0,0,0.3)} }
      `}</style>

      {/* ── HERO HEADER ── */}
      <header style={{
        background:"linear-gradient(135deg, #8B0000 0%, #5A0000 100%)",
        color:"#FFF",
        textAlign:"center",
        padding:"48px 20px 40px",
        position:"relative",
        overflow:"hidden"
      }}>
        {/* Decorative geometric pattern overlay */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents:"none"
        }}/>

        <div style={{position:"relative",maxWidth:1200,margin:"0 auto"}}>
          <div style={{fontSize:42,fontFamily:"var(--font-heading, 'Playfair Display', serif)",marginBottom:4,letterSpacing:4,fontWeight:400}}>
            &#1582;&#1578;&#1605; &#1575;&#1604;&#1602;&#1585;&#1570;&#1606;
          </div>
          <div style={{fontSize:13,letterSpacing:5,textTransform:"uppercase",opacity:0.7,fontWeight:300,marginBottom:16}}>
            Khatm al-Quran Tracker
          </div>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:8,
            background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
            borderRadius:24,padding:"6px 18px",fontSize:14,fontWeight:500
          }}>
            Khatam #{khatamNum}
            {adminMode && (
              <span style={{
                fontSize:10,background:"rgba(255,255,255,0.2)",
                padding:"2px 10px",borderRadius:10,fontWeight:600,letterSpacing:1
              }}>ADMIN</span>
            )}
          </div>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div style={{
        background:"#FFFFFF",
        borderBottom:"1px solid #E8E8E8",
        position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 8px rgba(0,0,0,0.04)"
      }}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 20px"}}>
          {khatmComplete && (
            <div style={{
              background:"linear-gradient(135deg, #5A0000, #8B0000)",
              borderRadius:12,padding:"20px 24px",marginBottom:16,textAlign:"center",color:"#FFF",
              animation:"pulse 2s infinite"
            }}>
              <h2 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontSize:22,color:"#FFF",marginBottom:6,fontWeight:600}}>
                Alhamdulillah — Khatam {khatamNum} Complete!
              </h2>
              <div style={{fontSize:14,opacity:0.8,marginBottom:14}}>May Allah accept from everyone who participated.</div>
              <button onClick={startNewKhatam} style={{
                background:"#FFF",color:"#8B0000",border:"none",
                padding:"10px 28px",borderRadius:24,fontSize:14,fontWeight:600,cursor:"pointer"
              }}>Begin Khatam {khatamNum+1}</button>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
            {[
              {label:"Completed",val:done,color:"#2E7D32",bg:"#E8F5E9"},
              {label:"In Progress",val:prog,color:"#F57F17",bg:"#FFF8E1"},
              {label:"Remaining",val:rem,color:"#1565C0",bg:"#E3F2FD"},
            ].map(s=>(
              <div key={s.label} style={{
                background:s.bg,borderRadius:10,padding:"14px 8px",textAlign:"center",
                border:`1px solid ${s.color}20`
              }}>
                <div style={{fontSize:28,color:s.color,fontWeight:700,lineHeight:1,fontFamily:"var(--font-heading, 'Playfair Display', serif)"}}>{s.val}</div>
                <div style={{fontSize:11,color:"#888",marginTop:4,textTransform:"uppercase",letterSpacing:1,fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{height:6,background:"#F0F0F0",borderRadius:3,overflow:"hidden"}}>
            <div style={{
              height:"100%",width:`${pct}%`,
              background:"linear-gradient(90deg, #8B0000, #B71C1C)",
              borderRadius:3,transition:"width 0.6s ease"
            }}/>
          </div>
          <div style={{fontSize:12,color:"#999",textAlign:"right",padding:"6px 0 0",fontWeight:500}}>{pct}% complete</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px 40px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Array.from({length:30},(_,i)=>i+1).map(juz=>(
            <JuzRow key={juz} juz={juz} slots={slots}
              adminMode={adminMode} adminSelected={adminSelected}
              onSelect={(j,q)=>setAdminSelected({juz:j,q})}
              onOpenModal={(j,q)=>setModal({juz:j,q})}/>
          ))}
        </div>
      </main>

      {/* ── HOW IT WORKS SECTION ── */}
      <section style={{background:"#FFFFFF",borderTop:"1px solid #E8E8E8",padding:"50px 20px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <h2 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontSize:26,color:"#2C2C2C",textAlign:"center",marginBottom:8}}>
            How It Works
          </h2>
          <p style={{textAlign:"center",color:"#888",marginBottom:36,fontSize:15}}>Participate in completing the Quran together as a community.</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:20}}>
            {[
              {num:"1",title:"Choose a Quarter",desc:"Tap any available quarter from the 30 Juz to claim it for recitation.",color:"#E3F2FD"},
              {num:"2",title:"Enter Your Name",desc:"Provide your name so the community can see your commitment.",color:"#FFF8E1"},
              {num:"3",title:"Recite & Complete",desc:"After reciting your portion, mark it as complete in the tracker.",color:"#E8F5E9"},
              {num:"4",title:"Track Together",desc:"Watch the community progress. Maximum 8 quarters per person at a time.",color:"#FCE4EC"},
            ].map(step=>(
              <div key={step.num} style={{
                background:step.color,borderRadius:12,padding:"28px 22px",textAlign:"center"
              }}>
                <div style={{
                  width:40,height:40,borderRadius:"50%",background:"#8B0000",color:"#FFF",
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,fontWeight:700,marginBottom:14,
                  fontFamily:"var(--font-heading, 'Playfair Display', serif)"
                }}>{step.num}</div>
                <h3 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontSize:17,color:"#2C2C2C",marginBottom:8}}>{step.title}</h3>
                <p style={{fontSize:14,color:"#666",lineHeight:1.6,margin:0}}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEGEND SECTION ── */}
      <section style={{background:"#F3F3F3",padding:"36px 20px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"center",gap:32,flexWrap:"wrap"}}>
          {(["av","cl","dn"] as StatusKey[]).map(k=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:14,height:14,borderRadius:4,background:COLORS[k].accent,border:`1px solid ${COLORS[k].border}`}}/>
              <span style={{fontSize:14,color:"#666",fontWeight:500}}>{COLORS[k].label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA / ADMIN SECTION ── */}
      <section style={{
        background:"linear-gradient(135deg, #5A0000 0%, #3A0000 100%)",
        color:"#FFF",padding:"50px 20px",textAlign:"center"
      }}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <h2 style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",fontSize:24,color:"#FFF",marginBottom:8,fontWeight:600}}>
            Organizer Admin
          </h2>
          <p style={{opacity:0.7,marginBottom:24,fontSize:14}}>Manage the Khatam, override statuses, and start new completions.</p>

          {!adminMode ? (
            <div style={{display:"flex",gap:10,justifyContent:"center",maxWidth:400,margin:"0 auto"}}>
              <input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryAdmin()}
                placeholder="Admin password"
                style={{flex:1,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.25)",color:"#FFF",padding:"11px 16px",borderRadius:24,fontSize:14,outline:"none"}}
              />
              <button onClick={tryAdmin} style={{
                background:"#FFF",color:"#8B0000",border:"none",
                padding:"11px 24px",borderRadius:24,fontSize:14,fontWeight:600,cursor:"pointer"
              }}>Unlock</button>
            </div>
          ) : (
            <div style={{animation:"fadeIn 0.2s ease"}}>
              <div style={{fontSize:14,color:"#81C784",marginBottom:16,fontWeight:500}}>
                Admin active — tap any quarter above to select it
              </div>
              {adminSelected && (
                <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginBottom:12}}>
                  Selected: Juz {adminSelected.juz} {Q_SHORT[adminSelected.q-1]} ({getSlot(adminSelected.juz,adminSelected.q)?.by || "unclaimed"})
                </div>
              )}
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
                {(["av","cl","dn"] as StatusKey[]).map(st=>(
                  <button key={st} onClick={()=>adminSetStatus(st)} style={{
                    background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.25)",
                    color:"#FFF",padding:"8px 16px",borderRadius:24,fontSize:13,cursor:"pointer",fontWeight:500
                  }}>Set {COLORS[st].label}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={startNewKhatam} style={{
                  background:"#FFF",color:"#8B0000",border:"none",
                  padding:"8px 20px",borderRadius:24,fontSize:13,cursor:"pointer",fontWeight:600
                }}>+ New Khatam</button>
                <button onClick={()=>{setAdminMode(false);setAdminSelected(null);showToast("Admin mode off");}} style={{
                  background:"transparent",border:"1px solid rgba(255,255,255,0.3)",
                  color:"rgba(255,255,255,0.8)",padding:"8px 20px",borderRadius:24,fontSize:13,cursor:"pointer",fontWeight:500
                }}>Deactivate</button>
              </div>
            </div>
          )}
          {adminErr && <div style={{fontSize:13,color:"#EF9A9A",marginTop:10}}>{adminErr}</div>}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:"#2C2C2C",color:"rgba(255,255,255,0.5)",textAlign:"center",padding:"24px 20px",fontSize:13}}>
        <span style={{fontFamily:"var(--font-heading, 'Playfair Display', serif)",color:"rgba(255,255,255,0.7)"}}>Khatm al-Quran</span>
        {" "}— A community Quran completion tracker
      </footer>

      {/* ── MODAL ── */}
      {modal && modalSlot && (
        <Modal slot={modalSlot} juz={modal.juz} q={modal.q}
          onClose={()=>setModal(null)} onBook={onBook} onComplete={onComplete}/>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
          background:"#2C2C2C",border:"none",color:"#FFF",
          padding:"12px 24px",borderRadius:24,fontSize:14,fontWeight:500,
          zIndex:500,whiteSpace:"nowrap",animation:"toastIn 0.3s ease",pointerEvents:"none",
          boxShadow:"0 4px 16px rgba(0,0,0,0.15)"
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
