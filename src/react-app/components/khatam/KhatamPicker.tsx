import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { KhatamInfo } from "@/hooks/useKhatamState";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { khatamLabel } from "@/lib/helpers";

interface KhatamPickerProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** Shows which khatam of a campaign you're looking at, and lets you switch. Scales to hundreds of khatams. */
export default function KhatamPicker({ khatams, selectedId, onSelect }: KhatamPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const selected = khatams.find(k => k.id === selectedId);
  const active = useMemo(() => khatams.filter(k => k.done < k.total), [khatams]);
  const completed = useMemo(() => khatams.filter(k => k.done >= k.total), [khatams]);

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(filter === "active" ? active : completed)]
      .filter(k => !q || khatamLabel(k).toLowerCase().includes(q) || String(k.khatam_num) === q)
      .sort((a, b) => Number(b.started) - Number(a.started) || a.khatam_num - b.khatam_num);
  }, [active, completed, filter, query]);

  if (khatams.length <= 1 || !selected) return null;

  const pct = Math.round((selected.done / selected.total) * 100);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFilter(selected.done >= selected.total ? "completed" : "active");
          setOpen(true);
        }}
        className={cn(ui.card, "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:border-stone-300")}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-stone-500">One of {khatams.length} khatams in this campaign</p>
          <p className="truncate text-[15px] font-semibold text-stone-900">{khatamLabel(selected)}</p>
        </div>
        <span className="shrink-0 text-sm text-stone-500">{pct === 100 ? "Complete" : `${pct}%`}</span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          Switch <ChevronDown size={16} />
        </span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-h-[85vh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-heading text-xl font-semibold text-stone-900">Choose a khatam</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4">
            <div className="inline-flex w-fit rounded-lg bg-stone-100 p-1">
              {([
                ["active", `Active · ${active.length}`],
                ["completed", `Completed · ${completed.length}`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    filter === value ? "bg-white text-stone-900 shadow-xs" : "text-stone-600",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {khatams.length > 8 && (
              <label className="relative block">
                <span className="sr-only">Search khatams</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or number"
                  className={cn(ui.input, "pl-9")}
                />
              </label>
            )}
          </div>
          <ul className="mt-2 overflow-y-auto px-2 pb-6">
            {listed.map(k => {
              const isSel = k.id === selectedId;
              const kPct = Math.round((k.done / k.total) * 100);
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(k.id); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left",
                      isSel ? "bg-primary/[0.06]" : "hover:bg-stone-50",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] text-stone-900">{khatamLabel(k)}</span>
                    <span className={cn("shrink-0 text-sm tabular-nums", kPct === 100 ? "text-success" : "text-stone-500")}>
                      {kPct === 100 ? "Complete" : k.started ? `${kPct}%` : "Not started"}
                    </span>
                    {isSel && <Check size={16} className="shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
            {listed.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-stone-500">
                {query ? "No khatams match your search." : "Nothing here yet."}
              </li>
            )}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
}
