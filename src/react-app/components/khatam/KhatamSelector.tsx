import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, Search } from "lucide-react";
import type { KhatamInfo } from "@/hooks/useKhatamState";

interface KhatamSelectorProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onReorder?: (orderedIds: number[]) => Promise<void>;
}

type PublicFilter = "active" | "completed";

function progressPriority(khatam: KhatamInfo) {
  if (khatam.started && khatam.done < khatam.total) return 0;
  if (khatam.done < khatam.total) return 1;
  return 2;
}

export default function KhatamSelector({
  khatams,
  selectedId,
  onSelect,
  onReorder,
}: KhatamSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const hasAlignedInitialSelection = useRef(false);
  const [query, setQuery] = useState("");
  const [publicFilter, setPublicFilter] = useState<PublicFilter>("active");
  const [movingId, setMovingId] = useState<number | null>(null);

  const orderedKhatams = useMemo(() => [...khatams].sort((a, b) => {
    if (onReorder) {
      return a.display_order - b.display_order || a.khatam_num - b.khatam_num;
    }
    return progressPriority(a) - progressPriority(b) || a.khatam_num - b.khatam_num;
  }), [khatams, onReorder]);

  const activeKhatams = useMemo(
    () => orderedKhatams.filter(khatam => khatam.done < khatam.total),
    [orderedKhatams],
  );
  const completedKhatams = useMemo(
    () => orderedKhatams.filter(khatam => khatam.done === khatam.total),
    [orderedKhatams],
  );
  const filteredKhatams = onReorder
    ? orderedKhatams
    : publicFilter === "active"
      ? activeKhatams
      : completedKhatams;

  const visibleKhatams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return filteredKhatams.filter(khatam => !normalizedQuery
      || (khatam.name ?? `Khatam ${khatam.khatam_num}`).toLowerCase().includes(normalizedQuery)
      || String(khatam.khatam_num).includes(normalizedQuery));
  }, [filteredKhatams, query]);

  useEffect(() => {
    if (onReorder || hasAlignedInitialSelection.current || selectedId === null || khatams.length === 0) return;
    hasAlignedInitialSelection.current = true;
    if (activeKhatams.length > 0 && !activeKhatams.some(khatam => khatam.id === selectedId)) {
      onSelect(activeKhatams[0].id);
    }
  }, [activeKhatams, khatams.length, onReorder, onSelect, selectedId]);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const left = element.offsetLeft - container.offsetWidth / 2 + element.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [selectedId]);

  if (khatams.length <= 1) return null;

  const move = async (id: number, destination: "front" | "left" | "right") => {
    if (!onReorder || movingId !== null) return;
    const currentIndex = orderedKhatams.findIndex(khatam => khatam.id === id);
    if (currentIndex < 0) return;

    let nextIndex = destination === "front"
      ? 0
      : destination === "left"
        ? currentIndex - 1
        : currentIndex + 1;
    nextIndex = Math.max(0, Math.min(orderedKhatams.length - 1, nextIndex));
    if (nextIndex === currentIndex) return;

    const next = [...orderedKhatams];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(nextIndex, 0, moved);
    setMovingId(id);
    try {
      await onReorder(next.map(khatam => khatam.id));
    } finally {
      setMovingId(null);
    }
  };

  const selectPublicFilter = (nextFilter: PublicFilter) => {
    setPublicFilter(nextFilter);
    const nextKhatams = nextFilter === "active" ? activeKhatams : completedKhatams;
    if (nextKhatams.length > 0 && !nextKhatams.some(khatam => khatam.id === selectedId)) {
      onSelect(nextKhatams[0].id);
    }
  };

  return (
    <div className="border-b border-gray-200/80 bg-[#faf8f6]">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Campaign Khatams
          </span>
          <div className="h-px flex-1 bg-gray-200/80" />
          {onReorder && (
            <span className="text-[10px] text-gray-400">Use the arrow controls to change the admin order</span>
          )}
          <span className="text-[10px] font-medium tabular-nums text-gray-400">{khatams.length} total</span>
        </div>

        {khatams.length > 6 && (
          <label className="mb-3 flex max-w-sm items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-[#8B0000]/50">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search Khatam name"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs text-gray-700 outline-none"
            />
          </label>
        )}

        {!onReorder && (
          <div
            className="mb-3 flex w-fit items-center rounded-lg border border-gray-200 bg-white p-1"
            role="group"
            aria-label="Filter campaign Khatams by status"
          >
            {([
              { value: "active", label: "Active", count: activeKhatams.length },
              { value: "completed", label: "Completed", count: completedKhatams.length },
            ] as const).map(option => {
              const isCurrent = publicFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectPublicFilter(option.value)}
                  aria-pressed={isCurrent}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0000]/30 ${
                    isCurrent
                      ? "bg-[#8B0000] text-white"
                      : "text-gray-500 hover:bg-[#faf8f6] hover:text-gray-700"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] tabular-nums ${
                      isCurrent ? "bg-white/15 text-white/85" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {visibleKhatams.map(khatam => {
            const isSelected = khatam.id === selectedId;
            const isComplete = khatam.done === khatam.total;
            const percentage = khatam.total > 0 ? Math.round((khatam.done / khatam.total) * 100) : 0;
            const fullIndex = orderedKhatams.findIndex(item => item.id === khatam.id);
            const isMoving = movingId === khatam.id;

            return (
              <div
                key={khatam.id}
                ref={isSelected ? selectedRef : undefined}
                className={`group relative flex shrink-0 items-stretch overflow-hidden rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "border-[#8B0000] bg-gradient-to-br from-[#8B0000] to-[#5A0000] text-white shadow-lg shadow-[#8B0000]/20"
                    : isComplete
                      ? "border-green-200 bg-white text-gray-700 hover:border-green-300 hover:shadow-md"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#8B0000]/30 hover:shadow-md"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(khatam.id)}
                  className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B0000]/30"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isComplete
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {khatam.khatam_num}
                  </div>
                  <div className="flex min-w-[72px] flex-col items-start">
                    <span className={`max-w-[12rem] truncate text-[13px] font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                      {khatam.name ?? `Khatam ${khatam.khatam_num}`}
                    </span>
                    <div className="mt-1 flex w-full items-center gap-2">
                      <div className={`h-1 min-w-[48px] flex-1 overflow-hidden rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100"}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected ? "bg-white/80" : isComplete ? "bg-green-500" : "bg-[#8B0000]/60"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium tabular-nums ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                        {isComplete ? "Done" : `${percentage}%`}
                      </span>
                    </div>
                  </div>
                </button>

                {onReorder && (
                  <div className={`flex items-center border-l px-1 ${isSelected ? "border-white/15" : "border-gray-100"}`}>
                    <button
                      type="button"
                      onClick={() => move(khatam.id, "front")}
                      disabled={fullIndex === 0 || movingId !== null}
                      aria-label={`Move ${khatam.name ?? `Khatam ${khatam.khatam_num}`} to front`}
                      title="Move to front"
                      className={`rounded p-1.5 disabled:opacity-25 ${isSelected ? "hover:bg-white/15" : "hover:bg-gray-100"}`}
                    >
                      <ChevronsLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(khatam.id, "left")}
                      disabled={fullIndex === 0 || movingId !== null}
                      aria-label={`Move ${khatam.name ?? `Khatam ${khatam.khatam_num}`} left`}
                      title="Move left"
                      className={`rounded p-1.5 disabled:opacity-25 ${isSelected ? "hover:bg-white/15" : "hover:bg-gray-100"}`}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(khatam.id, "right")}
                      disabled={fullIndex === orderedKhatams.length - 1 || movingId !== null}
                      aria-label={`Move ${khatam.name ?? `Khatam ${khatam.khatam_num}`} right`}
                      title="Move right"
                      className={`rounded p-1.5 disabled:opacity-25 ${isSelected ? "hover:bg-white/15" : "hover:bg-gray-100"}`}
                    >
                      <ChevronRight size={13} />
                    </button>
                    {isMoving && <span className="sr-only">Saving order</span>}
                  </div>
                )}
              </div>
            );
          })}
          {visibleKhatams.length === 0 && (
            <p className="px-1 py-3 text-xs text-gray-400">
              {query.trim()
                ? `No ${onReorder ? "" : `${publicFilter} `}Khatam matches “${query.trim()}”.`
                : publicFilter === "completed"
                  ? "No Khatams have been completed yet."
                  : "No active Khatams right now."}
            </p>
          )}
        </div>
      </div>

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
