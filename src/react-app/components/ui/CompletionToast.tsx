import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Check, X } from "lucide-react";
import { supabasePublic } from "@/lib/supabase";
import { api } from "@/lib/api";
import { JUZ_NAMES, Q_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ToastData {
  id: string;
  name: string;
  juz: number;
  juzName: string;
  q: number;
}

const ToastContext = createContext<Record<string, never>>({});
// eslint-disable-next-line react-refresh/only-export-components
export function useCompletionToast() { return useContext(ToastContext); }

const COMPACT_MS = 5000;
const PROMINENT_MS = 7000;
const EXIT_MS = 250;
const SWIPE_X = 80;
const SWIPE_UP = 50;
const HISTORY_REFRESH_MS = 10_000;

// ─── One toast ───────────────────────────────────────────────────────────────

function CompletionToastCard({
  toast,
  prominent,
  onDismiss,
}: {
  toast: ToastData;
  prominent: boolean;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<"enter" | "shown" | "exit">("enter");
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const axis = useRef<"h" | "v" | null>(null);

  const exit = useCallback(() => {
    setPhase("exit");
    setTimeout(onDismiss, EXIT_MS);
  }, [onDismiss]);

  // Enter on the next frame so the transition runs.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("shown"));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss, paused while hovered or being dragged.
  useEffect(() => {
    if (paused || dragging) return;
    const timer = setTimeout(exit, prominent ? PROMINENT_MS : COMPACT_MS);
    return () => clearTimeout(timer);
  }, [exit, prominent, paused, dragging]);

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - start.current.x;
    const dy = e.touches[0].clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) axis.current = "h";
      else if (Math.abs(dy) > 5) axis.current = "v";
    }
    if (axis.current === "h") {
      setDragging(true);
      setDrag({ x: dx, y: 0 });
    } else if (axis.current === "v" && dy < 0) {
      setDragging(true);
      setDrag({ x: 0, y: dy });
    }
  };

  const onTouchEnd = () => {
    if (Math.abs(drag.x) > SWIPE_X || drag.y < -SWIPE_UP) {
      exit();
    } else {
      setDrag({ x: 0, y: 0 });
    }
    setDragging(false);
  };

  const distance = Math.max(Math.abs(drag.x) / 180, Math.abs(drag.y) / 120);
  const quarter = Q_SHORT[toast.q - 1];

  return (
    <div
      className={cn(
        "pointer-events-auto w-full transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
        phase === "shown" ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={exit}
        className={cn("cursor-pointer touch-pan-y select-none", !dragging && "transition-[opacity,transform] duration-200 motion-reduce:transition-none")}
        style={
          drag.x || drag.y
            ? { transform: `translate(${drag.x}px, ${drag.y}px)`, opacity: Math.max(0.15, 1 - distance) }
            : undefined
        }
      >
        {prominent ? (
          <div className="flex items-center gap-4 rounded-2xl bg-success px-4 py-3.5 text-white shadow-lg shadow-stone-900/10 sm:px-6 sm:py-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 sm:size-14">
              <Check className="size-5 sm:size-7" strokeWidth={2.5} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold leading-tight sm:text-2xl">{toast.name}</p>
              <p className="mt-0.5 text-sm text-white/85 sm:text-base">
                completed Juz {toast.juz} · {quarter}
                <span lang="ar" className="ml-2 font-arabic text-white/75">{toast.juzName}</span>
              </p>
            </div>
            <div className="hidden shrink-0 border-l border-white/20 pl-5 text-center sm:block">
              <p lang="ar" dir="rtl" className="font-arabic text-2xl leading-snug">بارك الله فيك</p>
              <p className="text-xs text-white/70">May Allah bless you</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white py-2.5 pl-3 pr-1.5 shadow-md shadow-stone-900/5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-light text-success">
              <Check size={16} strokeWidth={2.5} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug text-stone-600">
              <span className="font-semibold text-stone-900">{toast.name}</span> completed Juz {toast.juz} · {quarter}
              <span lang="ar" className="ml-1.5 font-arabic text-stone-500">{toast.juzName}</span>
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={e => { e.stopPropagation(); exit(); }}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CompletionToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const location = useLocation();
  const isMetrics = location.pathname.includes("/metrics");
  const seenKeys = useRef(new Set<string>());

  const slugMatch = location.pathname.match(/^\/k\/([^/]+)/);
  const currentSlug = slugMatch?.[1] ?? null;

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Live completions for khatams in the current campaign only.
  useEffect(() => {
    if (!currentSlug) return;
    let active = true;
    let khatamIds = new Set<number>();
    let lastFetch = 0;

    const refreshIds = async () => {
      lastFetch = Date.now();
      try {
        const history = await api.getHistory(currentSlug);
        if (active) khatamIds = new Set(history.map(k => k.id));
      } catch {
        /* keep the previous set */
      }
    };
    void refreshIds();

    const show = (row: { juz: number; q: number; claimed_by: string | null; done_at: string | null; claimed_at: string | null }) => {
      const key = `${row.juz}-${row.q}-${row.claimed_by ?? "anon"}-${row.done_at ?? row.claimed_at}`;
      if (seenKeys.current.has(key)) return;
      seenKeys.current.add(key);
      setToasts(prev => [
        { id: `${key}-${Date.now()}`, name: row.claimed_by || "Someone", juz: row.juz, juzName: JUZ_NAMES[row.juz - 1] ?? "", q: row.q },
        ...prev,
      ].slice(0, 2));
    };

    const channel = supabasePublic
      .channel(`completion-toasts-${currentSlug}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "khatam_public", table: "slots" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const row = payload.new;
          if (row?.status !== "dn") return;
          const id = Number(row.khatam_id);
          // A khatam added after we loaded the list: refresh once before deciding.
          if (!khatamIds.has(id) && Date.now() - lastFetch > HISTORY_REFRESH_MS) await refreshIds();
          if (active && khatamIds.has(id)) show(row);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabasePublic.removeChannel(channel);
    };
  }, [currentSlug]);

  return (
    <ToastContext.Provider value={{}}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col gap-2",
          isMetrics
            ? "items-center sm:top-5 [&>*]:max-w-[640px]"
            : "sm:left-auto sm:right-5 sm:top-5 sm:w-[340px]",
        )}
      >
        {toasts.map(t => (
          <CompletionToastCard key={t.id} toast={t} prominent={isMetrics} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
