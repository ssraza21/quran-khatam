import type { Slot, StatusKey } from "@/lib/types";
import { COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AdminSlotGridProps {
  slots: Slot[];
  /** The quarter currently open in the drawer, if any. */
  active: { juz: number; q: number } | null;
  onSelectSlot: (juz: number, q: number) => void;
  onSelectJuz: (juz: number) => void;
}

const EMPTY_TEXT: Record<StatusKey, string> = { av: "Open", cl: "Claimed", dn: "Done" };
const STATUS_TEXT: Record<StatusKey, string> = { av: "available", cl: "claimed", dn: "done" };

/**
 * All 30 Juz at once, each with its four quarters as tappable cells.
 * Tapping the Juz number edits all four quarters together.
 */
export default function AdminSlotGrid({ slots, active, onSelectSlot, onSelectJuz }: AdminSlotGridProps) {
  const byJuz = new Map<number, Slot[]>();
  for (const s of slots) {
    const list = byJuz.get(s.juz) ?? [];
    list.push(s);
    byJuz.set(s.juz, list);
  }

  return (
    <div className="grid gap-x-6 gap-y-1.5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
        const quarters = (byJuz.get(juz) ?? []).sort((a, b) => a.q - b.q);
        const doneCount = quarters.filter(s => s.status === "dn").length;
        return (
          <div key={juz} className="flex items-stretch gap-1.5">
            <button
              type="button"
              onClick={() => onSelectJuz(juz)}
              aria-label={`Juz ${juz}, ${doneCount} of 4 done. Edit all 4 quarters`}
              className={cn(
                "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50",
                active?.juz === juz && active.q === 0 ? "border-primary ring-2 ring-primary/20" : "border-stone-300 bg-white",
              )}
            >
              <span className="text-[10px] leading-none text-stone-500">Juz</span>
              <span className="mt-0.5 text-base font-semibold leading-none tabular-nums">{juz}</span>
            </button>
            {quarters.map(s => {
              const c = COLORS[s.status];
              const isActive = active?.juz === juz && active.q === s.q;
              return (
                <button
                  key={s.q}
                  type="button"
                  onClick={() => onSelectSlot(juz, s.q)}
                  aria-label={`Juz ${juz} quarter ${s.q}: ${STATUS_TEXT[s.status]}${s.by ? `, ${s.by}` : ""}`}
                  className={cn(
                    "flex h-12 min-w-0 flex-1 flex-col justify-center rounded-md border px-1.5 text-left transition-[filter] hover:brightness-[0.97]",
                    isActive && "ring-2 ring-primary/40",
                  )}
                  style={{ background: c.bg, borderColor: c.border }}
                >
                  <span className="text-[10px] leading-none text-stone-500">Q{s.q}</span>
                  <span
                    className={cn("mt-1 truncate text-xs leading-none", s.by && "font-medium", s.status === "av" && !s.by && "text-stone-400")}
                    style={s.status === "av" && !s.by ? undefined : { color: c.text }}
                  >
                    {s.by ? s.by.split(" ")[0] : EMPTY_TEXT[s.status]}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
