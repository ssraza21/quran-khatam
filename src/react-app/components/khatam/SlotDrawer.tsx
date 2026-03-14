import { useState, useEffect, useRef } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { Slot } from "@/lib/types";
import { COLORS, Q_LABELS, JUZ_NAMES } from "@/lib/constants";
import { timeAgo } from "@/lib/helpers";

interface SlotDrawerProps {
  slot: Slot | null;
  juz: number;
  q: number;
  open: boolean;
  onClose: () => void;
  onBook: (juz: number, q: number, name: string) => Promise<{ err: string } | undefined>;
  onComplete: (juz: number, q: number, name: string) => Promise<{ err: string } | undefined>;
}

export default function SlotDrawer({ slot, juz, q, open, onClose, onBook, onComplete }: SlotDrawerProps) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && slot) {
      setName(slot.by || "");
      setErr("");
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, slot]);

  if (!slot) return null;

  const c = COLORS[slot.status];

  const doBook = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    const res = await onBook(juz, q, name.trim());
    if (res?.err) setErr(res.err);
  };

  const doComplete = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    const res = await onComplete(juz, q, name.trim());
    if (res?.err) setErr(res.err);
  };

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()} repositionInputs={false}>
      <DrawerContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col">
        <DrawerHeader className="pt-6 pb-2 flex-none">
          <DrawerTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            Juz {juz} — {Q_LABELS[q - 1]}
          </DrawerTitle>
          <DrawerDescription style={{ fontFamily: "'Amiri', serif", fontSize: 16 }}>
            {JUZ_NAMES[juz - 1]}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 flex-1 overflow-y-auto">
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4"
            style={{ background: c.accentBg, border: `1px solid ${c.border}` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: c.accent }} />
            <span className="text-[13px] font-medium" style={{ color: c.text }}>
              {c.label}{slot.by ? ` — ${slot.by}` : ""}
            </span>
          </div>

          {slot.at && (
            <p className="text-xs text-gray-400 mb-4">
              {slot.status === "dn" ? `Completed ${timeAgo(slot.done_at)}` : `Claimed ${timeAgo(slot.at)}`}
            </p>
          )}

          {/* Available state */}
          {slot.status === "av" && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Enter your name to claim this section:</p>
              <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doBook()}
                placeholder="Your name"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-[15px] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 transition-all mb-2"
              />
              {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
            </div>
          )}

          {/* Claimed state */}
          {slot.status === "cl" && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Confirm your name to mark complete:</p>
              <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doComplete()}
                placeholder={slot.by || "Your name"}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-[15px] outline-none focus:border-success focus:ring-2 focus:ring-success/10 transition-all mb-2"
              />
              {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
            </div>
          )}

          {/* Done state */}
          {slot.status === "dn" && (
            <div className="text-center py-6">
              <div className="text-4xl text-success mb-3">&#10003;</div>
              <h3
                className="text-xl mb-2"
                style={{ fontFamily: "'Amiri', serif", color: "#8B0000", fontSize: 24 }}
              >
                الحمد لله
              </h3>
              <p className="text-sm text-gray-400">May Allah accept the recitation.</p>
            </div>
          )}
          <div className="pb-32">
            <DrawerFooter className="px-0 pt-4 pb-0">
              {slot.status === "av" && (
                <Button
                  onClick={doBook}
                  className="w-full h-12 rounded-full text-[15px] font-semibold bg-primary hover:bg-primary-dark text-white cursor-pointer"
                >
                  Claim This Quarter
                </Button>
              )}
              {slot.status === "cl" && (
                <Button
                  onClick={doComplete}
                  className="w-full h-12 rounded-full text-[15px] font-semibold bg-success hover:bg-[#1B5E20] text-white cursor-pointer"
                >
                  Mark Complete
                </Button>
              )}
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-full text-sm font-medium border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
