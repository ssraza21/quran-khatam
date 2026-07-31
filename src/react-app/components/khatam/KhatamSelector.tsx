import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { KhatamInfo } from "@/hooks/useKhatamState";

interface KhatamSelectorProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function KhatamSelector({ khatams, selectedId, onSelect }: KhatamSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");

  const visibleKhatams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...khatams]
      .filter(khatam => !normalizedQuery
        || (khatam.name ?? `Khatam ${khatam.khatam_num}`).toLowerCase().includes(normalizedQuery)
        || String(khatam.khatam_num).includes(normalizedQuery))
      .sort((a, b) => {
        const priority = (khatam: KhatamInfo) => {
          if (khatam.started && khatam.done < khatam.total) return 0;
          if (khatam.done < khatam.total) return 1;
          return 2;
        };
        return priority(a) - priority(b) || a.khatam_num - b.khatam_num;
      });
  }, [khatams, query]);

  // Scroll active khatam into view on mount
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [selectedId]);

  if (khatams.length <= 1) return null;

  return (
    <div className="bg-[#faf8f6] border-b border-gray-200/80">
      <div className="max-w-[1200px] mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 mb-2.5 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Campaign khatams
          </span>
          <div className="flex-1 h-px bg-gray-200/80" />
          <span className="text-[10px] text-gray-400 font-medium tabular-nums">
            {khatams.length} total
          </span>
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

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {visibleKhatams.map(k => {
            const isSelected = k.id === selectedId;
            const isComplete = k.done === k.total;
            const pct = k.total > 0 ? Math.round((k.done / k.total) * 100) : 0;

            return (
              <button
                key={k.id}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onSelect(k.id)}
                className={`
                  relative flex-shrink-0 group
                  rounded-xl px-4 py-2.5
                  transition-all duration-300 ease-out
                  cursor-pointer border
                  ${isSelected
                    ? "bg-gradient-to-br from-[#8B0000] to-[#5A0000] text-white border-[#8B0000] shadow-lg shadow-[#8B0000]/20"
                    : isComplete
                      ? "bg-white text-gray-700 border-green-200 hover:border-green-300 hover:shadow-md"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#8B0000]/30 hover:shadow-md"
                  }
                `}
              >
                {/* Khatam number + label */}
                <div className="flex items-center gap-2.5">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold
                    ${isSelected
                      ? "bg-white/20 text-white"
                      : isComplete
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }
                  `}
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {k.khatam_num}
                  </div>

                  <div className="flex flex-col items-start min-w-[60px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                        {k.name ?? `Khatam ${k.khatam_num}`}
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="flex items-center gap-2 mt-1 w-full">
                      <div className={`h-1 rounded-full flex-1 min-w-[48px] overflow-hidden ${isSelected ? "bg-white/20" : "bg-gray-100"}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected
                              ? "bg-white/80"
                              : isComplete
                                ? "bg-green-500"
                                : "bg-[#8B0000]/60"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium tabular-nums ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                        {isComplete ? (
                          <span className={isSelected ? "text-green-200" : "text-green-600"}>Done</span>
                        ) : (
                          `${pct}%`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {visibleKhatams.length === 0 && (
            <p className="px-1 py-3 text-xs text-gray-400">No Khatam matches “{query.trim()}”.</p>
          )}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
