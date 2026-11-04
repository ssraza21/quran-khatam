import { Check } from "lucide-react";
import type { Slot } from "@/lib/types";
import { COLORS, JUZ_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const segmentColor = (s: Slot) =>
  s.status === "dn" ? COLORS.dn.accent : s.status === "cl" ? COLORS.cl.accent : "#E7E5E4";

function firstNames(names: string[]) {
  const short = names.map(n => n.trim().split(/\s+/)[0]);
  return short.length > 2 ? `${short.slice(0, 2).join(", ")} +${short.length - 2}` : short.join(", ");
}

interface JuzGridProps {
  slots: Slot[];
  /** Name the visitor reads as; their Juz get a subtle highlight. */
  myName?: string;
  onOpen: (juz: number) => void;
}

/** 30 Juz cards for a group khatam. Each shows its 4 quarters; tapping opens the Juz sheet. */
export function JuzGrid({ slots, myName, onOpen }: JuzGridProps) {
  const me = myName?.trim().toLowerCase();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
        const qs = slots.filter(s => s.juz === juz).sort((a, b) => a.q - b.q);
        const done = qs.filter(s => s.status === "dn").length;
        const open = qs.filter(s => s.status === "av").length;
        const allDone = qs.length === 4 && done === 4;
        const names = [...new Set(qs.map(s => s.by).filter(Boolean) as string[])];
        const mine = !!me && qs.some(s => s.by?.toLowerCase() === me && s.status === "cl");

        let status: string;
        if (allDone) status = "Done";
        else if (open === 4) status = "Available";
        else if (names.length) status = firstNames(names);
        else status = `${open} of 4 open`;

        return (
          <button
            key={juz}
            type="button"
            onClick={() => onOpen(juz)}
            className={cn(
              "flex min-w-0 flex-col rounded-xl border bg-white p-3 text-left transition-colors hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              allDone ? "border-success/30 bg-success-light/60" : mine ? "border-primary/40 ring-1 ring-primary/20" : "border-stone-200",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-stone-900">Juz {juz}</span>
              <span dir="rtl" className="truncate font-arabic text-sm text-stone-500">{JUZ_NAMES[juz - 1]}</span>
            </div>
            <div className="mt-2.5 flex gap-1" aria-hidden="true">
              {qs.map(s => (
                <span key={s.q} className="h-1.5 flex-1 rounded-full" style={{ background: segmentColor(s) }} />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[13px]">
              {allDone && <Check size={14} className="text-success" />}
              <span
                className={cn(
                  "truncate",
                  allDone ? "font-medium text-success" : open === 4 ? "text-stone-500" : "text-stone-700",
                )}
              >
                {status}
              </span>
            </div>
            {mine && !allDone && <span className="mt-1 text-xs font-medium text-primary">You're reading this</span>}
          </button>
        );
      })}
    </div>
  );
}

interface SoloGridProps {
  slots: Slot[];
  onToggle: (juz: number, q: number) => void;
}

/** Personal khatam: every quarter is a checkbox. */
export function SoloGrid({ slots, onToggle }: SoloGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
        const qs = slots.filter(s => s.juz === juz).sort((a, b) => a.q - b.q);
        const allDone = qs.length === 4 && qs.every(s => s.status === "dn");
        return (
          <div
            key={juz}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5",
              allDone ? "border-success/30 bg-success-light/60" : "border-stone-200",
            )}
          >
            <div className="w-16 shrink-0">
              <span className="block text-[15px] font-semibold text-stone-900">Juz {juz}</span>
              <span dir="rtl" className="block truncate text-left font-arabic text-xs text-stone-500">{JUZ_NAMES[juz - 1]}</span>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {qs.map(s => {
                const isDone = s.status === "dn";
                return (
                  <button
                    key={s.q}
                    type="button"
                    aria-pressed={isDone}
                    aria-label={`Juz ${juz}, quarter ${s.q}${isDone ? ", done" : ""}`}
                    onClick={() => onToggle(juz, s.q)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                      isDone
                        ? "border-success bg-success text-white"
                        : "border-stone-300 bg-white text-stone-500 hover:border-stone-400",
                    )}
                  >
                    {isDone ? <Check size={16} /> : `Q${s.q}`}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
