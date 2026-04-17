import { useState } from "react";
import type { Slot } from "@/lib/types";
import { JUZ_NAMES, COLORS } from "@/lib/constants";
import QCard from "./QCard";

interface JuzRowProps {
  juz: number;
  slots: Slot[];
  adminMode: boolean;
  adminSelected: { juz: number; q: number } | null;
  onSelect: (juz: number, q: number) => void;
  onOpenModal: (juz: number, q: number) => void;
  onClaimJuz?: (juz: number) => void;
  onAdminClaimJuz?: (juz: number) => void;
  isSolo?: boolean;
  onSoloToggle?: (juz: number, q: number) => void;
}

export default function JuzRow({ juz, slots, adminMode, adminSelected, onSelect, onOpenModal, onClaimJuz, onAdminClaimJuz, isSolo, onSoloToggle }: JuzRowProps) {
  const [open, setOpen] = useState(false);
  const jSlots = slots.filter(s => s.juz === juz);
  const done = jSlots.filter(s => s.status === "dn").length;
  const allDone = done === 4;
  const allAvailable = jSlots.length === 4 && jSlots.every(s => s.status === "av");

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow duration-200 ${open ? "shadow-md" : "shadow-sm hover:shadow-md"}`}>
      <div
        className={`flex items-center px-5 py-3.5 gap-3 ${allDone ? "bg-green-50/50" : ""}`}
      >
        <div
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className="font-semibold text-[15px] min-w-[55px]"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: allDone ? "#2E7D32" : "#8B0000"
            }}
          >
            Juz {juz}
          </div>
          <div
            className="flex-1 text-[13px] text-gray-400 italic truncate"
            style={{ fontFamily: "'Amiri', serif", fontSize: 15 }}
          >
            {JUZ_NAMES[juz - 1]}
          </div>
          <div className="flex gap-1 mr-2">
            {jSlots.map((s, i) => (
              <div
                key={i}
                className="w-3 h-1.5 rounded-full transition-colors"
                style={{
                  background: s.status === "dn" ? COLORS.dn.accent : s.status === "cl" ? COLORS.cl.accent : "#E0E0E0"
                }}
              />
            ))}
          </div>
          <div className="text-[13px] text-gray-400 font-medium min-w-[28px] text-right">{done}/4</div>
          <div className={`text-[11px] text-gray-300 ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            &#9660;
          </div>
        </div>
        {!isSolo && !adminMode && allAvailable && onClaimJuz && (
          <button
            onClick={e => { e.stopPropagation(); onClaimJuz(juz); }}
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full border border-[#8B0000]/30 text-[#8B0000] bg-[#FFF5F5] hover:bg-[#8B0000] hover:text-white transition-colors duration-150"
          >
            Claim Juz
          </button>
        )}
        {!isSolo && adminMode && onAdminClaimJuz && (
          <button
            onClick={e => { e.stopPropagation(); onAdminClaimJuz(juz); }}
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full border border-[#8B0000]/40 text-[#8B0000] bg-[#FFF5F5] hover:bg-[#8B0000] hover:text-white transition-colors duration-150"
          >
            Assign Juz
          </button>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-4 gap-2.5 px-4 pb-4 animate-fadeIn">
          {jSlots.map(s => (
            <QCard key={s.q} slot={s} juz={juz} q={s.q}
              adminMode={adminMode} adminSelected={adminSelected}
              onSelect={onSelect} onOpenModal={onOpenModal}
              isSolo={isSolo} onSoloToggle={onSoloToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
