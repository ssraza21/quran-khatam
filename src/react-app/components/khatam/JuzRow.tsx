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
  isSolo?: boolean;
  onSoloToggle?: (juz: number, q: number) => void;
}

export default function JuzRow({ juz, slots, adminMode, adminSelected, onSelect, onOpenModal, isSolo, onSoloToggle }: JuzRowProps) {
  const [open, setOpen] = useState(false);
  const jSlots = slots.filter(s => s.juz === juz);
  const done = jSlots.filter(s => s.status === "dn").length;
  const allDone = done === 4;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow duration-200 ${open ? "shadow-md" : "shadow-sm hover:shadow-md"}`}>
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center px-5 py-3.5 cursor-pointer gap-3 ${allDone ? "bg-green-50/50" : ""}`}
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
