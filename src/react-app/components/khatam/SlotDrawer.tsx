import { useState, useEffect, useRef } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { Slot } from "@/lib/types";
import { COLORS, Q_LABELS, JUZ_NAMES } from "@/lib/constants";
import { timeAgo, buildWhatsAppKhatamMessage, juzReadyToComplete, juzOwnerName } from "@/lib/helpers";
import { toast } from "sonner";

interface SlotDrawerProps {
  slot: Slot | null;
  juz: number;
  /** q === 0 means "claim entire Juz" mode */
  q: number;
  open: boolean;
  onClose: () => void;
  onBook: (juz: number, q: number, name: string) => Promise<{ err: string } | undefined>;
  onBookJuz: (juz: number, name: string) => Promise<{ err: string } | undefined>;
  onComplete: (juz: number, q: number, name: string) => Promise<{ err: string } | undefined>;
  onCompleteJuz: (juz: number, name: string) => Promise<{ err: string } | undefined>;
  khatamName: string;
  slug: string;
  slots: Slot[];
  defaultName?: string;
  onNameUsed?: (name: string) => void;
}

type SuccessType = "claimed" | "completed" | null;

export default function SlotDrawer({
  slot, juz, q, open, onClose,
  onBook, onBookJuz, onComplete, onCompleteJuz,
  khatamName, slug, slots,
  defaultName = "",
  onNameUsed,
}: SlotDrawerProps) {
  const [name, setName] = useState(defaultName);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessType>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isJuzMode = q === 0;
  const juzSlots = slots.filter(s => s.juz === juz);
  const juzCanClaim = isJuzMode && juzSlots.length === 4 && juzSlots.every(s => s.status === "av");
  const juzCanComplete = isJuzMode && juzReadyToComplete(slots, juz);

  useEffect(() => {
    if (open) {
      let initialName = defaultName;
      if (!isJuzMode && slot?.status === "cl" && slot.by) {
        initialName = slot.by;
      } else if (isJuzMode && juzCanComplete) {
        initialName = juzOwnerName(slots, juz) ?? defaultName;
      }
      setName(initialName);
      setErr("");
      setSuccess(null);
      setCopied(false);
      setLoading(false);
      // Only auto-focus the input if there's no name pre-filled (otherwise button is the focus target)
      if (!defaultName && !initialName) setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, defaultName, isJuzMode, slot, juz, slots, juzCanComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isJuzMode && !slot) return null;

  const c = slot ? COLORS[slot.status] : COLORS.av;

  const whatsAppMessage = buildWhatsAppKhatamMessage(khatamName, slug, slots);
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Failed to copy"));
  };

  const doBook = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    setLoading(true);
    const res = await onBook(juz, q, name.trim());
    setLoading(false);
    if (res?.err) { setErr(res.err); return; }
    onNameUsed?.(name.trim());
    setSuccess("claimed");
  };

  const doBookJuz = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    setLoading(true);
    const res = await onBookJuz(juz, name.trim());
    setLoading(false);
    if (res?.err) { setErr(res.err); return; }
    onNameUsed?.(name.trim());
    setSuccess("claimed");
  };

  const doComplete = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    setLoading(true);
    const res = await onComplete(juz, q, name.trim());
    setLoading(false);
    if (res?.err) { setErr(res.err); return; }
    onNameUsed?.(name.trim());
    setSuccess("completed");
  };

  const doCompleteJuz = async () => {
    if (!name.trim()) { setErr("Please enter your name"); return; }
    setLoading(true);
    const res = await onCompleteJuz(juz, name.trim());
    setLoading(false);
    if (res?.err) { setErr(res.err); return; }
    onNameUsed?.(name.trim());
    setSuccess("completed");
  };

  const handleClose = () => {
    setSuccess(null);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={o => !o && handleClose()} repositionInputs={false}>
      <DrawerContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col">
        <DrawerHeader className="pt-6 pb-2 flex-none">
          <DrawerTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            {isJuzMode
              ? juzCanComplete
                ? `Juz ${juz} — Mark Complete`
                : `Juz ${juz} — Entire Juz`
              : `Juz ${juz} — ${Q_LABELS[q - 1]}`}
          </DrawerTitle>
          <DrawerDescription style={{ fontFamily: "'Amiri', serif", fontSize: 16 }}>
            {JUZ_NAMES[juz - 1]}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 flex-1 overflow-y-auto">
          {/* Success state */}
          {success && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-lg">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {success === "claimed" ? "Claimed!" : "Completed! الحمد لله"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {success === "claimed"
                      ? isJuzMode
                        ? `Juz ${juz} reserved for ${name}`
                        : `Juz ${juz} Q${q} reserved for ${name}`
                      : "May Allah accept your recitation."}
                  </p>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Share with your WhatsApp group
              </p>

              <div
                className="bg-[#f0faf0] border border-green-200 rounded-xl px-3 py-3 mb-4 font-mono text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto"
              >
                {whatsAppMessage}
              </div>

              <div className="flex gap-2 pb-4">
                <button
                  onClick={handleCopy}
                  className={`flex-1 h-11 rounded-full text-sm font-semibold transition-all duration-200 ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-[#8B0000] hover:bg-[#6B0000] text-white"
                  }`}
                >
                  {copied ? "Copied!" : "Copy Message"}
                </button>
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-full text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white flex items-center justify-center transition-colors"
                >
                  Open in WhatsApp
                </a>
              </div>

              <button
                onClick={handleClose}
                className="w-full h-10 rounded-full text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Normal state */}
          {!success && (
            <>
              {/* Juz mode */}
              {isJuzMode && juzCanClaim && (
                <div>
                  <div className="flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 w-fit"
                    style={{ background: COLORS.av.accentBg, border: `1px solid ${COLORS.av.border}` }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.av.accent }} />
                    <span className="text-[13px] font-medium" style={{ color: COLORS.av.text }}>
                      All 4 quarters available
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Enter your name to claim all 4 quarters of Juz {juz}:</p>
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doBookJuz()}
                    placeholder="Your name"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-[15px] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 transition-all mb-2"
                  />
                  {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                </div>
              )}

              {isJuzMode && juzCanComplete && (
                <div>
                  <div className="flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 w-fit"
                    style={{ background: COLORS.cl.accentBg, border: `1px solid ${COLORS.cl.border}` }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.cl.accent }} />
                    <span className="text-[13px] font-medium" style={{ color: COLORS.cl.text }}>
                      All 4 quarters in progress — {juzOwnerName(slots, juz)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Confirm your name to mark the entire Juz complete:</p>
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doCompleteJuz()}
                    placeholder="Your name"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-[15px] outline-none focus:border-success focus:ring-2 focus:ring-success/10 transition-all mb-2"
                  />
                  {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                </div>
              )}

              {isJuzMode && !juzCanClaim && !juzCanComplete && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  This Juz is partially claimed or already complete. Open individual quarters from the list view.
                </p>
              )}

              {/* Quarter mode */}
              {!isJuzMode && slot && (
                <>
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

                  {slot.status === "cl" && (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">Confirm your name to mark complete:</p>
                      <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && doComplete()}
                        placeholder="Your name"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-[15px] outline-none focus:border-success focus:ring-2 focus:ring-success/10 transition-all mb-2"
                      />
                      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                    </div>
                  )}

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
                </>
              )}

              <div className="pb-32">
                <DrawerFooter className="px-0 pt-4 pb-0">
                  {isJuzMode && juzCanClaim && (
                    <Button
                      onClick={doBookJuz}
                      disabled={loading}
                      className="w-full h-12 rounded-full text-[15px] font-semibold bg-primary hover:bg-primary-dark text-white cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Claiming..." : "Claim Entire Juz"}
                    </Button>
                  )}
                  {isJuzMode && juzCanComplete && (
                    <Button
                      onClick={doCompleteJuz}
                      disabled={loading}
                      className="w-full h-12 rounded-full text-[15px] font-semibold bg-success hover:bg-[#1B5E20] text-white cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Mark Entire Juz Complete"}
                    </Button>
                  )}
                  {!isJuzMode && slot?.status === "av" && (
                    <Button
                      onClick={doBook}
                      disabled={loading}
                      className="w-full h-12 rounded-full text-[15px] font-semibold bg-primary hover:bg-primary-dark text-white cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Claiming..." : "Claim This Quarter"}
                    </Button>
                  )}
                  {!isJuzMode && slot?.status === "cl" && (
                    <Button
                      onClick={doComplete}
                      disabled={loading}
                      className="w-full h-12 rounded-full text-[15px] font-semibold bg-success hover:bg-[#1B5E20] text-white cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Mark Complete"}
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
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
