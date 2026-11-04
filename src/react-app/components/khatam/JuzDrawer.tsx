import { useState } from "react";
import { Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Slot } from "@/lib/types";
import { COLORS, JUZ_NAMES, Q_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/helpers";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Result = Promise<{ err: string } | undefined>;

interface JuzDrawerProps {
  /** Juz shown in the sheet. Kept set while closing so the content doesn't vanish mid-animation. */
  juz: number | null;
  open: boolean;
  slots: Slot[];
  onClose: () => void;
  savedName: string;
  onNameSaved: (name: string) => void;
  claimsClosed?: boolean;
  onBook: (juz: number, q: number, name: string) => Result;
  onBookJuz: (juz: number, name: string) => Result;
  onComplete: (juz: number, q: number, name: string) => Result;
  onCompleteJuz: (juz: number, name: string) => Result;
  /** Called after a successful claim so the page can offer to share an update. */
  onClaimed?: (description: string) => void;
  onCompleted?: (description: string) => void;
}

const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export default function JuzDrawer({
  juz,
  open,
  slots,
  onClose,
  savedName,
  onNameSaved,
  claimsClosed,
  onBook,
  onBookJuz,
  onComplete,
  onCompleteJuz,
  onClaimed,
  onCompleted,
}: JuzDrawerProps) {
  const [name, setName] = useState(savedName);
  const [editingName, setEditingName] = useState(!savedName);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Reset the form each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(savedName);
      setEditingName(!savedName);
      setError("");
      setBusy(null);
    }
  }

  const qs = juz ? slots.filter(s => s.juz === juz).sort((a, b) => a.q - b.q) : [];
  const allAvailable = qs.length === 4 && qs.every(s => s.status === "av");
  const owners = [...new Set(qs.map(s => s.by?.trim().toLowerCase()).filter(Boolean))];
  const wholeJuzClaimedByOne = qs.length === 4 && qs.every(s => s.status === "cl") && owners.length === 1;
  const juzOwner = wholeJuzClaimedByOne ? qs[0].by! : null;
  const anyAvailable = qs.some(s => s.status === "av");
  const trimmed = name.trim();

  const requireName = () => {
    if (!trimmed) {
      setEditingName(true);
      setError("Enter your name first, so others know this part is taken.");
      return false;
    }
    return true;
  };

  const run = async (key: string, action: () => Result, onOk?: () => void) => {
    setBusy(key);
    setError("");
    const res = await action();
    setBusy(null);
    if (res?.err) {
      setError(res.err);
      return;
    }
    onOk?.();
  };

  const claimJuz = () => {
    if (!juz || !requireName()) return;
    run("juz", () => onBookJuz(juz, trimmed), () => {
      onNameSaved(trimmed);
      onClaimed?.(`Juz ${juz}`);
      onClose();
    });
  };

  const claimQuarter = (q: number) => {
    if (!juz || !requireName()) return;
    run(`claim-${q}`, () => onBook(juz, q, trimmed), () => {
      onNameSaved(trimmed);
      setEditingName(false);
      onClaimed?.(`Juz ${juz}, quarter ${q}`);
    });
  };

  const completeQuarter = (s: Slot) => {
    if (!juz || !s.by) return;
    run(`done-${s.q}`, () => onComplete(juz, s.q, s.by!), () => onCompleted?.(`Juz ${juz}, quarter ${s.q}`));
  };

  const completeJuz = () => {
    if (!juz || !juzOwner) return;
    run("juz-done", () => onCompleteJuz(juz, juzOwner), () => {
      onCompleted?.(`Juz ${juz}`);
      onClose();
    });
  };

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()} repositionInputs={false}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
        {juz && (
          <>
            <DrawerHeader className="flex-row items-baseline justify-between gap-3 text-left">
              <DrawerTitle className="font-heading text-2xl font-semibold text-stone-900">Juz {juz}</DrawerTitle>
              <DrawerDescription dir="rtl" className="font-arabic text-lg text-stone-500">{JUZ_NAMES[juz - 1]}</DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto px-4 pb-8">
              {anyAvailable && !claimsClosed && (
                <div className="mb-4">
                  {editingName ? (
                    <>
                      <label htmlFor="reader-name" className={ui.label}>Your name</label>
                      <input
                        id="reader-name"
                        value={name}
                        onChange={e => { setName(e.target.value); setError(""); }}
                        placeholder="So others know who is reading"
                        maxLength={60}
                        autoComplete="name"
                        className={ui.input}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-stone-600">
                      Reading as <span className="font-medium text-stone-900">{trimmed}</span>
                      {" · "}
                      <button type="button" onClick={() => setEditingName(true)} className="font-medium text-primary hover:underline">
                        Change
                      </button>
                    </p>
                  )}
                </div>
              )}

              {claimsClosed && anyAvailable && (
                <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  The organizer has closed this khatam to new claims.
                </p>
              )}

              {allAvailable && !claimsClosed && (
                <button
                  type="button"
                  onClick={claimJuz}
                  disabled={busy !== null}
                  className={cn(btn("primary", "lg"), "mb-2 w-full")}
                >
                  {busy === "juz" ? "Claiming…" : "Read the whole Juz"}
                </button>
              )}

              {wholeJuzClaimedByOne && (
                <button
                  type="button"
                  onClick={completeJuz}
                  disabled={busy !== null}
                  className={cn(btn("success", "lg"), "mb-2 w-full")}
                >
                  {busy === "juz-done" ? "Saving…" : same(juzOwner, savedName) ? "I finished the whole Juz" : `Mark whole Juz done for ${juzOwner}`}
                </button>
              )}

              {(allAvailable || wholeJuzClaimedByOne) && (
                <p className="mb-2 mt-4 text-sm text-stone-500">Or one quarter at a time:</p>
              )}

              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {qs.map(s => {
                  const mine = same(s.by, savedName);
                  return (
                    <li key={s.q} className="flex items-center gap-3 px-3 py-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.status === "av" ? "#D6D3D1" : COLORS[s.status].accent }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-stone-900">{Q_LABELS[s.q - 1]}</p>
                        <p className="truncate text-sm text-stone-500">
                          {s.status === "av" && "Available"}
                          {s.status === "cl" && <>{mine ? "You" : s.by} · claimed {timeAgo(s.at)}</>}
                          {s.status === "dn" && <>Done by {mine ? "you" : s.by}{s.done_at ? ` · ${timeAgo(s.done_at)}` : ""}</>}
                        </p>
                      </div>
                      {s.status === "av" && !claimsClosed && (
                        <button
                          type="button"
                          onClick={() => claimQuarter(s.q)}
                          disabled={busy !== null}
                          className={btn("secondary", "sm")}
                        >
                          {busy === `claim-${s.q}` ? "…" : "Claim"}
                        </button>
                      )}
                      {s.status === "cl" && (
                        <button
                          type="button"
                          onClick={() => completeQuarter(s)}
                          disabled={busy !== null}
                          className={btn(mine ? "success" : "ghost", "sm")}
                        >
                          {busy === `done-${s.q}` ? "…" : "Mark done"}
                        </button>
                      )}
                      {s.status === "dn" && <Check size={18} className="shrink-0 text-success" />}
                    </li>
                  );
                })}
              </ul>

              {error && <p role="alert" className={cn(ui.error, "mt-3")}>{error}</p>}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
