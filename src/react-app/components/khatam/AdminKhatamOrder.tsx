import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp, Search } from "lucide-react";
import type { KhatamInfo } from "@/hooks/useKhatamState";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface AdminKhatamOrderProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onReorder: (orderedIds: number[]) => Promise<void>;
}

const labelOf = (k: KhatamInfo) => k.name?.trim() || `Khatam ${k.khatam_num}`;

/** Move Khatams up/down to change the order they are listed in. */
export default function AdminKhatamOrder({ khatams, selectedId, onReorder }: AdminKhatamOrderProps) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const ordered = useMemo(
    () => [...khatams].sort((a, b) => a.display_order - b.display_order || a.khatam_num - b.khatam_num),
    [khatams],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ordered
      .map((k, index) => ({ k, index }))
      .filter(({ k }) => !term || labelOf(k).toLowerCase().includes(term));
  }, [ordered, query]);

  const move = async (index: number, to: number) => {
    if (busy) return;
    const target = Math.max(0, Math.min(ordered.length - 1, to));
    if (target === index) return;
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setBusy(true);
    try {
      await onReorder(next.map(k => k.id));
    } finally {
      setBusy(false);
    }
  };

  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div>
      {ordered.length > 10 && (
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a Khatam"
            aria-label="Find a Khatam"
            className={cn(ui.input, "pl-9")}
          />
        </div>
      )}
      <ol className="max-h-[28rem] divide-y divide-stone-100 overflow-y-auto rounded-lg border border-stone-200" aria-busy={busy}>
        {visible.map(({ k, index }) => (
          <li key={k.id} className={cn("flex items-center gap-1 py-1 pl-3 pr-1", k.id === selectedId && "bg-stone-50")}>
            <span className="w-7 shrink-0 text-xs tabular-nums text-stone-400">{index + 1}</span>
            <span className={cn("min-w-0 flex-1 truncate text-sm text-stone-800", k.id === selectedId && "font-semibold")}>
              {labelOf(k)}
            </span>
            <button type="button" className={iconBtn} disabled={busy || index === 0} onClick={() => move(index, 0)} aria-label={`Move ${labelOf(k)} to the top`} title="Move to top">
              <ChevronsUp size={16} />
            </button>
            <button type="button" className={iconBtn} disabled={busy || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${labelOf(k)} up`} title="Move up">
              <ArrowUp size={16} />
            </button>
            <button type="button" className={iconBtn} disabled={busy || index === ordered.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${labelOf(k)} down`} title="Move down">
              <ArrowDown size={16} />
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="px-3 py-4 text-sm text-stone-500">No Khatams match.</li>}
      </ol>
    </div>
  );
}
