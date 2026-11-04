import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import type { Slot, StatusKey } from "@/lib/types";
import type { ParticipantInfo } from "@/lib/api";
import { COLORS, Q_LABELS, JUZ_NAMES } from "@/lib/constants";
import { timeAgo } from "@/lib/helpers";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface AdminSlotDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * juz > 0, q > 0 → one quarter
   * juz > 0, q === 0 → all four quarters of that Juz
   * juz === 0 → the whole Khatam (all 120 quarters)
   */
  juz: number;
  q: number;
  slots: Slot[];
  participants: ParticipantInfo[];
  onAssign: (juz: number, q: number, status: StatusKey, name?: string) => Promise<void>;
  onAssignJuz: (juz: number, status: StatusKey, name?: string) => Promise<void>;
  onResetJuz: (juz: number) => Promise<void>;
  /** Switch the drawer from one quarter to its whole Juz. */
  onOpenJuz?: (juz: number) => void;
  /** Whole-Khatam actions (juz === 0). */
  onResetAll?: () => Promise<void>;
  onAssignAll?: (name: string) => Promise<void>;
  onCompleteAll?: () => Promise<void>;
}

const STATUS_ORDER: StatusKey[] = ["av", "cl", "dn"];
const STATUS_LABEL: Record<StatusKey, string> = { av: "Available", cl: "Claimed", dn: "Done" };

export default function AdminSlotDrawer({
  open, onClose,
  juz, q,
  slots, participants,
  onAssign, onAssignJuz, onResetJuz, onOpenJuz,
  onResetAll, onAssignAll, onCompleteAll,
}: AdminSlotDrawerProps) {
  const mode: "khatam" | "juz" | "slot" = juz === 0 ? "khatam" : q === 0 ? "juz" : "slot";
  const slot = mode === "slot" ? slots.find(s => s.juz === juz && s.q === q) ?? null : null;
  const juzSlots = mode === "juz" ? slots.filter(s => s.juz === juz) : [];
  const allAvailable = slots.length > 0 && slots.every(s => s.status === "av");

  const [status, setStatus] = useState<StatusKey>("cl");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "slot" && slot) {
      setStatus(slot.status === "av" ? "cl" : slot.status);
      setName(slot.by ?? "");
    } else if (mode === "juz") {
      const owners = [...new Set(juzSlots.map(s => s.by).filter(Boolean))];
      setStatus("cl");
      setName(owners.length === 1 ? owners[0]! : "");
    } else {
      setStatus(allAvailable ? "cl" : "dn");
      setName("");
    }
    setSaving(false);
  }, [open, juz, q]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whole-Khatam "Done" keeps existing names, so no name field there.
  const showName = status !== "av" && !(mode === "khatam" && status === "dn");
  const trimmed = name.trim();
  const khatamAssignBlocked = mode === "khatam" && status === "cl" && !allAvailable;
  const nameRequired = mode === "khatam" && status === "cl";
  const canSave = !saving && !khatamAssignBlocked && (!nameRequired || !!trimmed);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (mode === "slot") {
        await onAssign(juz, q, status, trimmed || undefined);
      } else if (mode === "juz") {
        if (status === "av") await onResetJuz(juz);
        else await onAssignJuz(juz, status, trimmed || undefined);
      } else if (status === "av") {
        await onResetAll?.();
      } else if (status === "cl") {
        await onAssignAll?.(trimmed);
      } else {
        await onCompleteAll?.();
      }
    } finally {
      setSaving(false);
    }
    onClose();
  };

  const title = mode === "khatam"
    ? "Whole Khatam"
    : mode === "juz"
      ? `Juz ${juz} · all 4 quarters`
      : `Juz ${juz} · ${Q_LABELS[q - 1].toLowerCase()}`;

  const saveLabel = (() => {
    if (saving) return "Saving…";
    if (mode === "khatam") {
      if (status === "av") return "Reset all 120 quarters";
      if (status === "dn") return "Mark all 30 Juz done";
      return trimmed ? `Assign all 30 Juz to ${trimmed}` : "Assign all 30 Juz";
    }
    if (status === "av") return mode === "juz" ? `Reset Juz ${juz}` : "Mark available";
    return trimmed ? `Save · ${trimmed}` : "Save";
  })();

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col">
        <DrawerHeader className="flex-none border-b border-stone-200 px-4 pb-3 pt-3 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-lg font-semibold text-stone-900">{title}</DrawerTitle>
              <DrawerDescription className={cn("mt-0.5", mode === "khatam" ? "text-sm text-stone-500" : "font-arabic text-base text-stone-500")}>
                {mode === "khatam" ? "Applies to every quarter in this Khatam" : JUZ_NAMES[juz - 1]}
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={18} />
            </button>
          </div>
        </DrawerHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* Current state */}
          {mode === "slot" && slot && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[slot.status].accent }} />
                <span className="font-medium text-stone-800">Now: {STATUS_LABEL[slot.status]}</span>
              </span>
              {slot.by && <span>· {slot.by}</span>}
              {slot.status === "cl" && slot.at && <span className="text-stone-400">· claimed {timeAgo(slot.at)}</span>}
              {slot.status === "dn" && slot.done_at && <span className="text-stone-400">· done {timeAgo(slot.done_at)}</span>}
            </p>
          )}

          {mode === "juz" && (
            <div className="grid grid-cols-4 gap-1.5">
              {juzSlots.map(s => (
                <div
                  key={s.q}
                  className="rounded-md border px-1.5 py-1.5 text-center"
                  style={{ background: COLORS[s.status].bg, borderColor: COLORS[s.status].border }}
                >
                  <div className="text-[11px] text-stone-500">Q{s.q}</div>
                  <div className="truncate text-xs font-medium" style={{ color: COLORS[s.status].text }}>
                    {s.by ? s.by.split(" ")[0] : STATUS_LABEL[s.status]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status */}
          <fieldset>
            <legend className={ui.label}>Status</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1" role="radiogroup">
              {STATUS_ORDER.map(key => {
                const active = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(key)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                      active ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800",
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: key === "av" ? COLORS.av.border : COLORS[key].accent }}
                    />
                    {STATUS_LABEL[key]}
                  </button>
                );
              })}
            </div>
            {mode === "khatam" && status === "av" && (
              <p className={ui.hint}>Clears every name and all progress in this Khatam.</p>
            )}
            {mode === "khatam" && status === "dn" && (
              <p className={ui.hint}>Marks every unfinished quarter done. Existing names are kept.</p>
            )}
            {khatamAssignBlocked && (
              <p className="mt-1.5 text-xs text-red-700">
                Only possible while every quarter is available. Reset the Khatam first.
              </p>
            )}
          </fieldset>

          {/* Name */}
          {showName && (
            <div>
              <label htmlFor="admin-assign-name" className={ui.label}>
                Reader{!nameRequired && <span className="font-normal text-stone-400"> (optional)</span>}
              </label>
              {participants.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {participants.map(p => {
                    const active = trimmed.toLowerCase() === p.name.toLowerCase();
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setName(active ? "" : p.name)}
                        aria-pressed={active}
                        className={cn(
                          "h-9 rounded-full border px-3 text-sm transition-colors",
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
                        )}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                id="admin-assign-name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); }}
                placeholder={participants.length > 0 ? "Or type a name" : "Name"}
                maxLength={60}
                autoComplete="off"
                className={ui.input}
              />
              <p className={ui.hint}>Readers use this exact name to mark their portion done.</p>
            </div>
          )}
        </div>

        <div className="flex-none space-y-2 border-t border-stone-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={cn(btn(status === "dn" ? "success" : "primary", "lg"), "w-full")}
          >
            {saveLabel}
          </button>
          {mode === "slot" && onOpenJuz && (
            <button type="button" onClick={() => onOpenJuz(juz)} className={cn(btn("ghost", "md"), "w-full")}>
              Edit all 4 quarters of Juz {juz}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
