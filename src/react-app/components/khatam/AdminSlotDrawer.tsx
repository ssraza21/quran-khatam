import { useState, useEffect } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { Circle, Clock, CheckCircle2, UserCheck, RotateCcw, X, UserPlus } from "lucide-react";
import type { Slot, StatusKey } from "@/lib/types";
import { COLORS, Q_LABELS, JUZ_NAMES } from "@/lib/constants";
import { timeAgo } from "@/lib/helpers";

interface AdminSlotDrawerProps {
  open: boolean;
  onClose: () => void;
  /** juz > 0, q > 0 = single slot; q === 0 = entire Juz */
  juz: number;
  q: number;
  slots: Slot[];
  participants: string[];
  onAssign: (juz: number, q: number, status: StatusKey, name?: string) => Promise<void>;
  onAssignJuz: (juz: number, status: StatusKey, name?: string) => Promise<void>;
  onResetJuz: (juz: number) => Promise<void>;
}

const STATUS_OPTIONS: { key: StatusKey; label: string; Icon: React.ElementType; color: string; bg: string }[] = [
  { key: "av",  label: "Available",    Icon: Circle,       color: "#8B0000", bg: "#FFF5F5"  },
  { key: "cl",  label: "In Progress",  Icon: Clock,        color: "#F57F17", bg: "#FFF8E1"  },
  { key: "dn",  label: "Completed",    Icon: CheckCircle2, color: "#2E7D32", bg: "#E8F5E9"  },
];

export default function AdminSlotDrawer({
  open, onClose,
  juz, q,
  slots, participants,
  onAssign, onAssignJuz, onResetJuz,
}: AdminSlotDrawerProps) {
  const isJuzMode = q === 0;
  const slot = !isJuzMode ? slots.find(s => s.juz === juz && s.q === q) ?? null : null;
  const juzSlots = slots.filter(s => s.juz === juz);

  // Default status: "cl" when slot is available, otherwise keep current; juz mode always "cl"
  const defaultStatus: StatusKey = isJuzMode
    ? "cl"
    : (slot?.status === "av" ? "cl" : (slot?.status ?? "cl"));

  const [selectedStatus, setSelectedStatus] = useState<StatusKey>(defaultStatus);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedStatus(
        isJuzMode ? "cl"
          : (slot?.status === "av" ? "cl" : (slot?.status ?? "cl"))
      );
      setNameInput("");
      setLoading(false);
    }
  }, [open, juz, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAssign = async () => {
    setLoading(true);
    if (isJuzMode) {
      await onAssignJuz(juz, selectedStatus, nameInput.trim() || undefined);
    } else {
      await onAssign(juz, q, selectedStatus, nameInput.trim() || undefined);
    }
    setLoading(false);
    onClose();
  };

  const handleResetJuz = async () => {
    setLoading(true);
    await onResetJuz(juz);
    setLoading(false);
    onClose();
  };

  const selectParticipant = (name: string) => {
    setNameInput(name);
  };

  // Determine label: for set-available we skip the name field entirely
  const needsName = selectedStatus !== "av";

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col">
        <DrawerHeader className="pt-5 pb-2 flex-none border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle
                className="text-lg"
                style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
              >
                {isJuzMode ? `Juz ${juz} — Assign Entire Juz` : `Juz ${juz} — ${Q_LABELS[q - 1]}`}
              </DrawerTitle>
              <DrawerDescription
                className="mt-0.5"
                style={{ fontFamily: "'Amiri', serif", fontSize: 14 }}
              >
                {JUZ_NAMES[juz - 1]}
              </DrawerDescription>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-4 pt-4 pb-4 flex-1 overflow-y-auto space-y-5">

          {/* Current state summary */}
          {!isJuzMode && slot && (
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: COLORS[slot.status].accentBg, border: `1px solid ${COLORS[slot.status].border}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[slot.status].accent }} />
                <span className="text-xs font-medium" style={{ color: COLORS[slot.status].text }}>
                  {COLORS[slot.status].label}{slot.by ? ` — ${slot.by}` : ""}
                </span>
              </div>
              {slot.at && (
                <span className="text-[11px] text-gray-400">
                  {slot.status === "dn" ? `Done ${timeAgo(slot.done_at)}` : `Claimed ${timeAgo(slot.at)}`}
                </span>
              )}
            </div>
          )}

          {isJuzMode && (
            <div className="grid grid-cols-4 gap-1.5">
              {juzSlots.map(s => (
                <div
                  key={s.q}
                  className="rounded-lg px-2 py-1.5 text-center"
                  style={{ background: COLORS[s.status].accentBg, border: `1px solid ${COLORS[s.status].border}` }}
                >
                  <div className="text-[10px] font-medium text-gray-400 mb-0.5">Q{s.q}</div>
                  <div className="text-[11px] font-semibold truncate" style={{ color: COLORS[s.status].text }}>
                    {s.by ? s.by.split(" ")[0] : COLORS[s.status].label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status selector */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Set status</p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(({ key, label, Icon, color, bg }) => (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 transition-all ${
                    selectedStatus === key ? "shadow-sm" : "border-gray-100 bg-white opacity-50 hover:opacity-80"
                  }`}
                  style={selectedStatus === key ? { borderColor: color, background: bg } : {}}
                >
                  <Icon size={16} style={{ color: selectedStatus === key ? color : "#9CA3AF" }} />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: selectedStatus === key ? color : "#9CA3AF" }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Participant picker — hidden when setting to Available */}
          {needsName && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assign to</p>

              {/* Pre-set participant chips */}
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {participants.map(p => (
                    <button
                      key={p}
                      onClick={() => selectParticipant(p)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        nameInput === p
                          ? "bg-[#8B0000] text-white border-[#8B0000]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#8B0000]/40 hover:text-[#8B0000]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAssign()}
                  placeholder={participants.length > 0 ? "Or type a name..." : "Enter name (optional)"}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 pl-9 pr-4 py-2.5 rounded-lg text-[14px] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 transition-all"
                />
                {nameInput && (
                  <button
                    onClick={() => setNameInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleAssign}
              disabled={loading}
              className="w-full h-11 rounded-full text-sm font-semibold bg-[#8B0000] hover:bg-[#6B0000] text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCheck size={15} />
              {loading ? "Saving…" : isJuzMode
                ? (needsName && nameInput ? `Assign Juz ${juz} to ${nameInput}` : `Set Juz ${juz} to ${STATUS_OPTIONS.find(o => o.key === selectedStatus)?.label}`)
                : (needsName && nameInput ? `Assign to ${nameInput}` : `Set to ${STATUS_OPTIONS.find(o => o.key === selectedStatus)?.label}`)}
            </button>

            <button
              onClick={handleResetJuz}
              disabled={loading}
              className="w-full h-10 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={12} />
              Reset Juz {juz} to Available
            </button>

            <button
              onClick={onClose}
              className="w-full h-10 rounded-full text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
