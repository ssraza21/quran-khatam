import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import type { KhatamInfo } from "@/hooks/useKhatamState";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface AdminKhatamPickerProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

type Filter = "all" | "open" | "done";

const labelOf = (k: KhatamInfo) => k.name?.trim() || `Khatam ${k.khatam_num}`;
const pctOf = (k: KhatamInfo) => (k.total > 0 ? Math.round((k.done / k.total) * 100) : 0);

/**
 * Shows which Khatam the admin is working on and lets them switch.
 * Works for campaigns with hundreds of Khatams: prev/next stepping plus a searchable list.
 */
export default function AdminKhatamPicker({ khatams, selectedId, onSelect }: AdminKhatamPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const ordered = useMemo(
    () => [...khatams].sort((a, b) => a.display_order - b.display_order || a.khatam_num - b.khatam_num),
    [khatams],
  );
  const index = ordered.findIndex(k => k.id === selectedId);
  const selected = index >= 0 ? ordered[index] : null;

  const counts = useMemo(() => ({
    all: ordered.length,
    open: ordered.filter(k => k.done < k.total).length,
    done: ordered.filter(k => k.total > 0 && k.done >= k.total).length,
  }), [ordered]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ordered.filter(k => {
      const complete = k.total > 0 && k.done >= k.total;
      if (filter === "open" && complete) return false;
      if (filter === "done" && !complete) return false;
      return !term || labelOf(k).toLowerCase().includes(term) || String(k.khatam_num) === term;
    });
  }, [ordered, query, filter]);

  if (!selected) return null;

  const pct = pctOf(selected);
  const multiple = ordered.length > 1;

  const choose = (id: number) => {
    setOpen(false);
    setQuery("");
    if (id !== selectedId) onSelect(id);
  };

  const stepBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40";

  return (
    <div>
      <div className="flex items-stretch gap-2">
        {multiple && (
          <button
            type="button"
            className={stepBtn}
            onClick={() => choose(ordered[index - 1].id)}
            disabled={index <= 0}
            aria-label="Previous Khatam"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() => multiple && setOpen(true)}
          disabled={!multiple}
          aria-haspopup={multiple ? "dialog" : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-left transition-colors enabled:hover:bg-stone-50 disabled:cursor-default"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-stone-900">{labelOf(selected)}</span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-stone-200">
                <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
              </span>
              <span className="tabular-nums">{pct === 100 ? "Complete" : `${pct}% done`}</span>
              {multiple && <span className="tabular-nums text-stone-400">· {index + 1} of {ordered.length}</span>}
            </span>
          </span>
          {multiple && <ChevronDown size={18} className="shrink-0 text-stone-400" />}
        </button>
        {multiple && (
          <button
            type="button"
            className={stepBtn}
            onClick={() => choose(ordered[index + 1].id)}
            disabled={index >= ordered.length - 1}
            aria-label="Next Khatam"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto flex h-[85dvh] max-h-[85dvh] w-full max-w-lg flex-col">
          <DrawerHeader className="flex-none space-y-3 border-b border-stone-200 px-4 pb-3 pt-3 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DrawerTitle className="text-lg font-semibold text-stone-900">Choose a Khatam</DrawerTitle>
                <DrawerDescription className="text-sm text-stone-500">{ordered.length} in this campaign</DrawerDescription>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>
            {ordered.length > 6 && (
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or number"
                  aria-label="Search Khatams"
                  className={cn(ui.input, "pl-9")}
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1" role="group" aria-label="Filter">
              {([
                ["all", "All"],
                ["open", "In progress"],
                ["done", "Complete"],
              ] as const).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "h-9 rounded-md text-sm font-medium transition-colors",
                    filter === value ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800",
                  )}
                >
                  {text} <span className="tabular-nums text-stone-400">{counts[value]}</span>
                </button>
              ))}
            </div>
          </DrawerHeader>

          <ul className="flex-1 divide-y divide-stone-100 overflow-y-auto px-2 py-1">
            {visible.map(k => {
              const isSelected = k.id === selectedId;
              const p = pctOf(k);
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => choose(k.id)}
                    aria-current={isSelected || undefined}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-stone-50",
                      isSelected && "bg-stone-100 hover:bg-stone-100",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[15px] text-stone-900", isSelected && "font-semibold")}>
                        {labelOf(k)}
                      </span>
                      {k.participation_mode === "group" && (
                        <span className="text-xs text-stone-500">Family or group</span>
                      )}
                    </span>
                    <span className={cn("shrink-0 text-sm tabular-nums", p === 100 ? "text-success" : "text-stone-500")}>
                      {p === 100 ? "Complete" : `${p}%`}
                    </span>
                    <span className="flex w-5 shrink-0 justify-center">
                      {isSelected && <Check size={16} className="text-primary" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-stone-500">No Khatams match.</li>
            )}
          </ul>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
