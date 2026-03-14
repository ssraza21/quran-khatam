import { useRef, useEffect } from "react";
import type { KhatamInfo } from "@/hooks/useKhatamState";

interface KhatamSelectorProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function KhatamSelector({ khatams, selectedId, onSelect }: KhatamSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

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
        {/* Label */}
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Khatam History
          </span>
          <div className="flex-1 h-px bg-gray-200/80" />
          <span className="text-[10px] text-gray-400 font-medium tabular-nums">
            {khatams.length} total
          </span>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {[...khatams].reverse().map(k => {
            const isSelected = k.id === selectedId;
            const isComplete = k.done === k.total;
            const pct = k.total > 0 ? Math.round((k.done / k.total) * 100) : 0;
            const isLatest = k.id === khatams[0]?.id;

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
                      {isLatest && !isSelected && (
                        <span className="text-[8px] font-bold uppercase tracking-wider bg-[#8B0000]/10 text-[#8B0000] px-1.5 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                      {isLatest && isSelected && (
                        <span className="text-[8px] font-bold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
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
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
