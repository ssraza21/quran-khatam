import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { JUZ_NAMES, Q_SHORT } from "@/lib/constants";

interface ToastData {
  id: string;
  name: string;
  juz: number;
  juzName: string;
  q: number;
  group: string;
}

const ToastContext = createContext<Record<string, never>>({});
export function useCompletionToast() { return useContext(ToastContext); }

const COMPACT_MS = 5000;
const PROMINENT_MS = 7000;

// ─── Compact toast (non-metrics pages) ───────────────────────────────────────

function CompactToast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockAxis = useRef<"h" | "v" | null>(null);

  const exit = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 380);
  }, [onDismiss]);

  useEffect(() => {
    const t0 = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - t0) / COMPACT_MS) * 100));
    }, 40);
    const timer = setTimeout(exit, COMPACT_MS);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [exit]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lockAxis.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!lockAxis.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) lockAxis.current = "h";
      else if (Math.abs(dy) > 5) lockAxis.current = "v";
    }
    if (lockAxis.current === "h" && dx > 0) {
      e.preventDefault();
      setIsDragging(true);
      setDragX(dx);
    }
  };

  const handleTouchEnd = () => {
    if (dragX > 80) {
      exit();
    } else {
      setDragX(0);
      setIsDragging(false);
    }
  };

  const isBrothers = toast.group === "brothers";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${dragX}px)`,
        opacity: isDragging ? Math.max(0.1, 1 - dragX / 180) : 1,
        transition: !isDragging ? "transform 0.3s ease, opacity 0.3s ease" : "none",
      }}
    >
      <div
        onClick={exit}
        style={{
          width: 320,
          background: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E8F5E9",
          boxShadow: "0 8px 28px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)",
          overflow: "hidden",
          cursor: "pointer",
          animation: exiting
            ? "ctSlideOut 0.38s cubic-bezier(0.4,0,1,1) forwards"
            : "ctSlideIn 0.44s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 14px 12px 16px" }}>
          {/* Check badge */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 1,
            background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5L5.2 9.5L11 3.5" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14, fontWeight: 700,
                color: "#1A1A1A", overflow: "hidden",
                whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>
                {toast.name}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", flexShrink: 0,
                padding: "2px 7px", borderRadius: 100,
                background: isBrothers ? "#EFF6FF" : "#FDF4FF",
                color: isBrothers ? "#1D4ED8" : "#7C3AED",
              }}>
                {toast.group}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>
              Completed{" "}
              <strong style={{ color: "#374151" }}>Juz {toast.juz}</strong>
              {" · "}{Q_SHORT[toast.q - 1]}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: "'Amiri', serif" }}>
              {toast.juzName}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: "#F3F4F6" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg, #66BB6A, #2E7D32)",
            transition: "width 40ms linear",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Prominent toast (MetricsPage) ───────────────────────────────────────────

function ProminentToast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockAxis = useRef<"h" | "v" | null>(null);

  const exit = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 480);
  }, [onDismiss]);

  useEffect(() => {
    const t0 = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - t0) / PROMINENT_MS) * 100));
    }, 40);
    const timer = setTimeout(exit, PROMINENT_MS);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [exit]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lockAxis.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!lockAxis.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) lockAxis.current = "v";
      else if (Math.abs(dx) > 5) lockAxis.current = "h";
    }
    if (lockAxis.current === "v" && dy < 0) {
      e.preventDefault();
      setIsDragging(true);
      setDragY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (dragY < -60) {
      exit();
    } else {
      setDragY(0);
      setIsDragging(false);
    }
  };

  const isBrothers = toast.group === "brothers";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${dragY}px)`,
        opacity: isDragging ? Math.max(0.1, 1 - Math.abs(dragY) / 120) : 1,
        transition: !isDragging ? "transform 0.3s ease, opacity 0.3s ease" : "none",
      }}
    >
      <div
        onClick={exit}
        style={{
          position: "relative",
          width: "min(620px, calc(100vw - 2.5rem))",
          borderRadius: 20,
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: "0 24px 64px rgba(27,94,32,0.38), 0 4px 18px rgba(0,0,0,0.18)",
          background: "linear-gradient(130deg, #1B5E20 0%, #2E7D32 55%, #388E3C 100%)",
          animation: exiting
            ? "ptSlideOut 0.48s cubic-bezier(0.4,0,1,1) forwards"
            : "ptSlideDown 0.58s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        {/* Subtle pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.035, borderRadius: 20,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill-opacity='0.3'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div style={{ position: "relative", padding: "18px 22px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

            {/* Animated check circle */}
            <div style={{
              width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "checkPop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.18s both",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3.5 11L9 16.5L18.5 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Name + details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontWeight: 700, color: "white",
                  lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {toast.name}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 9px", borderRadius: 100, flexShrink: 0,
                  background: isBrothers ? "rgba(96,165,250,0.25)" : "rgba(240,171,252,0.25)",
                  color: "rgba(255,255,255,0.9)",
                  border: `1px solid ${isBrothers ? "rgba(96,165,250,0.35)" : "rgba(240,171,252,0.35)"}`,
                }}>
                  {toast.group}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                Completed{" "}
                <strong style={{ color: "white" }}>Juz {toast.juz}</strong>
                {" · "}{Q_SHORT[toast.q - 1]}
                {" · "}
                <span style={{ fontFamily: "'Amiri', serif", fontSize: 14 }}>{toast.juzName}</span>
              </p>
            </div>

            {/* Arabic blessing */}
            <div style={{
              flexShrink: 0, textAlign: "center",
              paddingLeft: 18,
              borderLeft: "1px solid rgba(255,255,255,0.18)",
            }}>
              <p style={{
                fontFamily: "'Amiri', serif",
                fontSize: 22, color: "rgba(255,255,255,0.92)",
                margin: 0, lineHeight: 1.5,
              }}>
                بارك الله فيك
              </p>
              <p style={{
                fontSize: 9, color: "rgba(255,255,255,0.45)",
                margin: 0, letterSpacing: "0.09em", textTransform: "uppercase",
              }}>
                May Allah bless you
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.12)" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "rgba(255,255,255,0.55)",
            transition: "width 40ms linear",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CompletionToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [khatamGroupMap, setKhatamGroupMap] = useState<Record<string, string>>({});
  const location = useLocation();
  const isMetrics = location.pathname.startsWith("/metrics");
  const seenKeys = useRef(new Set<string>());

  // Build khatam_id → group_name lookup
  useEffect(() => {
    supabase
      .from("khatams")
      .select("id, group_name")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((k: { id: string; group_name: string }) => { map[k.id] = k.group_name; });
          setKhatamGroupMap(map);
        }
      });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("completion-toasts-global")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "qurankhatam", table: "slots" },
        (payload: any) => {
          const row = payload.new;
          if (row.status !== "dn") return;

          // Deduplicate: same juz+q+claimer+done_at
          const key = `${row.juz}-${row.q}-${row.claimed_by ?? "anon"}-${row.done_at ?? row.claimed_at}`;
          if (seenKeys.current.has(key)) return;
          seenKeys.current.add(key);

          const toast: ToastData = {
            id: `${key}-${Date.now()}`,
            name: row.claimed_by || "Someone",
            juz: row.juz,
            juzName: JUZ_NAMES[row.juz - 1] ?? "",
            q: row.q,
            group: khatamGroupMap[row.khatam_id] ?? "brothers",
          };

          setToasts(prev => [toast, ...prev].slice(0, 2));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [khatamGroupMap]);

  return (
    <ToastContext.Provider value={{}}>
      <style>{`
        @keyframes ctSlideIn {
          from { opacity: 0; transform: translateX(110%); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes ctSlideOut {
          from { opacity: 1; transform: translateX(0);    }
          to   { opacity: 0; transform: translateX(110%); }
        }
        @keyframes ptSlideDown {
          from { opacity: 0; transform: translateY(-110%) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes ptSlideOut {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(-70%) scale(0.97); }
        }
        @keyframes checkPop {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1);   }
        }
      `}</style>

      {children}

      {/* Compact stack — top-right, non-metrics */}
      {!isMetrics && (
        <div style={{
          position: "fixed", top: 20, right: 20,
          display: "flex", flexDirection: "column", gap: 10,
          zIndex: 9999, pointerEvents: "none",
          alignItems: "flex-end",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <CompactToast toast={t} onDismiss={() => dismiss(t.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Prominent stack — top-center, MetricsPage */}
      {isMetrics && (
        <div style={{
          position: "fixed", top: 20,
          left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", gap: 10,
          zIndex: 9999, pointerEvents: "none",
          alignItems: "center",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ProminentToast toast={t} onDismiss={() => dismiss(t.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
