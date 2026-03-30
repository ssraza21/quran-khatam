import type { Slot } from "@/lib/types";
import { COLORS, Q_SHORT } from "@/lib/constants";
import { isStale } from "@/lib/helpers";

interface QCardProps {
  slot: Slot;
  juz: number;
  q: number;
  adminMode: boolean;
  adminSelected: { juz: number; q: number } | null;
  onSelect: (juz: number, q: number) => void;
  onOpenModal: (juz: number, q: number) => void;
  isSolo?: boolean;
  onSoloToggle?: (juz: number, q: number) => void;
}

export default function QCard({ slot, juz, q, adminMode, adminSelected, onSelect, onOpenModal, isSolo, onSoloToggle }: QCardProps) {
  const c = COLORS[slot.status];
  const stale = isStale(slot);
  const isAdminSel = adminMode && adminSelected?.juz === juz && adminSelected?.q === q;

  const handleClick = () => {
    if (adminMode) return onSelect(juz, q);
    if (isSolo && onSoloToggle) return onSoloToggle(juz, q);
    return onOpenModal(juz, q);
  };

  if (isSolo) {
    const isDone = slot.status === "dn";
    return (
      <div
        onClick={handleClick}
        className={`
          relative rounded-xl p-3.5 pb-3 text-center cursor-pointer select-none flex flex-col items-center
          transition-all duration-150 ease-out
          hover:-translate-y-0.5 hover:shadow-md
          shadow-sm active:scale-95
        `}
        style={{
          background: isDone ? COLORS.dn.accentBg : COLORS.av.bg,
          border: `1.5px solid ${isDone ? COLORS.dn.accent + "60" : COLORS.av.border}`,
        }}
      >
        <div className="text-[11px] text-gray-400 font-medium tracking-wide mb-1">{Q_SHORT[q - 1]}</div>
        <div className="text-xl font-semibold" style={{ color: isDone ? COLORS.dn.accent : "#D0D0D0" }}>
          {isDone ? "✓" : "○"}
        </div>
      </div>
    );
  }

  const statusIcon = slot.status === "dn" ? "\u2713" : slot.status === "cl" ? "\u25CE" : "\u25CB";

  return (
    <div
      onClick={handleClick}
      className={`
        relative rounded-xl p-3.5 pb-3 text-center cursor-pointer select-none flex flex-col items-center
        transition-all duration-200 ease-out
        hover:-translate-y-1 hover:shadow-lg
        ${isAdminSel ? "ring-2 ring-[#8B0000] shadow-md" : "shadow-sm"}
      `}
      style={{
        background: c.bg,
        border: `1.5px solid ${isAdminSel ? "#8B0000" : stale ? "#FF8F00" : c.border}`,
      }}
    >
      {stale && <span className="absolute top-1.5 right-2 text-[10px] text-orange-600 font-bold">!</span>}
      <div className="text-[11px] text-gray-400 font-medium tracking-wide mb-1">{Q_SHORT[q - 1]}</div>
      <div className="text-xl font-semibold" style={{ color: c.accent }}>{statusIcon}</div>
      {slot.by && (
        <div className="text-[10px] font-medium mt-1.5 truncate max-w-full" style={{ color: c.text }}>
          {slot.by.split(" ")[0]}
        </div>
      )}
      {slot.status === "cl" && !adminMode && (
        <button
          onClick={e => { e.stopPropagation(); onOpenModal(juz, q); }}
          className="mt-1.5 bg-[#8B0000] text-white text-[9px] font-semibold px-2 py-1 rounded-full cursor-pointer tracking-wide hover:bg-[#5A0000] transition-colors"
        >
          Complete
        </button>
      )}
    </div>
  );
}
