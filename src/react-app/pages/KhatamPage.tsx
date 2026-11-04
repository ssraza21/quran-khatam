import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useKhatamState } from "@/hooks/useKhatamState";
import { COLORS } from "@/lib/constants";
import type { Slot } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import CampaignTabs from "@/components/layout/CampaignTabs";
import KhatamPicker from "@/components/khatam/KhatamPicker";
import { khatamLabel } from "@/lib/helpers";
import { JuzGrid, SoloGrid } from "@/components/khatam/JuzGrid";
import JuzDrawer from "@/components/khatam/JuzDrawer";
import ShareDrawer from "@/components/khatam/ShareDrawer";
import NotFoundPage from "@/pages/NotFoundPage";

const NAME_KEY = "qk_claimer";

function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Group a reader's claimed quarters by Juz for the "Your parts" list. */
function groupMine(slots: Slot[], name: string) {
  const me = name.trim().toLowerCase();
  const mine = slots.filter(s => s.status === "cl" && s.by?.trim().toLowerCase() === me);
  const byJuz = new Map<number, Slot[]>();
  for (const s of mine) byJuz.set(s.juz, [...(byJuz.get(s.juz) ?? []), s]);
  return [...byJuz.entries()].sort((a, b) => a[0] - b[0]);
}

function ProgressBar({ done, claimed }: { done: number; claimed: number }) {
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-stone-100"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={120}
      aria-valuenow={done}
      aria-label="Quarters done"
    >
      <div className="h-full transition-[width] duration-500" style={{ width: `${(done / 120) * 100}%`, background: COLORS.dn.accent }} />
      <div className="h-full transition-[width] duration-500" style={{ width: `${(claimed / 120) * 100}%`, background: COLORS.cl.accent }} />
    </div>
  );
}

function Legend({ solo }: { solo?: boolean }) {
  const items = solo
    ? [["Done", COLORS.dn.accent]]
    : [["Available", "#D6D3D1"], ["Claimed", COLORS.cl.accent], ["Done", COLORS.dn.accent]];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function KhatamPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const state = useKhatamState(slug);
  const {
    khatamName, campaignName, campaignDescription,
    slots, khatams, campaignGoals, selectedKhatamId, isLatestKhatam,
    loading, notFound, isSolo, adminMode, quranGoalEnabled,
    newKhatamName, setNewKhatamName,
    done, prog, rem, pct, khatmComplete,
    onBook, onBookJuz, onComplete, onCompleteJuz, onSoloToggle,
    selectKhatam, startNewKhatam, soloStartNewKhatam, soloResetAll, soloDeleteKhatam,
  } = state;

  const [savedName, setSavedName] = useState(readSavedName);
  const persistName = (n: string) => {
    setSavedName(n);
    try {
      if (n) localStorage.setItem(NAME_KEY, n);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      // Private browsing: the name just isn't remembered.
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerJuz, setDrawerJuz] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [finishing, setFinishing] = useState<number | null>(null);

  const openJuz = (juz: number) => {
    setDrawerJuz(juz);
    setDrawerOpen(true);
  };

  const myParts = useMemo(() => (savedName ? groupMine(slots, savedName) : []), [slots, savedName]);
  const myDoneCount = useMemo(() => {
    const me = savedName.trim().toLowerCase();
    return me ? slots.filter(s => s.status === "dn" && s.by?.trim().toLowerCase() === me).length : 0;
  }, [slots, savedName]);

  const surahGoalsEnabled = campaignGoals.some(g => g.goal_type === "surah_recitation" && g.is_enabled);
  const selected = khatams.find(k => k.id === selectedKhatamId);
  const nextActive = khatams
    .filter(k => k.id !== selectedKhatamId && k.done < k.total)
    .sort((a, b) => Number(b.started) - Number(a.started) || a.khatam_num - b.khatam_num)[0];

  const finishJuzParts = async (juz: number, parts: Slot[]) => {
    setFinishing(juz);
    const res = parts.length === 4 ? await onCompleteJuz(juz, savedName) : await (async () => {
      for (const p of parts) {
        const r = await onComplete(juz, p.q, savedName);
        if (r?.err) return r;
      }
      return undefined;
    })();
    setFinishing(null);
    if (res?.err) toast.error(res.err);
    else toast.success(`Juz ${juz} marked done. May Allah accept it.`);
  };

  const onClaimed = (what: string) => {
    toast.success(`${what} is yours`, {
      description: "Let your group know.",
      action: { label: "Share", onClick: () => setShareOpen(true) },
    });
  };

  if (notFound) {
    return <NotFoundPage title="Khatam not found" message={`There's no khatam at /k/${slug}. Check the link with whoever shared it.`} />;
  }

  if (loading && slots.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const title = isSolo ? (khatamName || campaignName || "My khatam") : (campaignName || khatamName || "Khatam");
  const shareTitle = campaignName || khatamName || "Khatam";

  return (
    <>
      <PageHeader
        title={title}
        description={isSolo ? null : campaignDescription}
        actions={
          <button type="button" onClick={() => setShareOpen(true)} className={btn("secondary", "md")}>
            <Share2 size={16} />
            {isSolo ? "Save link" : "Invite"}
          </button>
        }
      >
        <CampaignTabs slug={slug} isSolo={isSolo} hideOverview={khatams.length <= 1 && !surahGoalsEnabled} />
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-8">
        <KhatamPicker khatams={khatams} selectedId={selectedKhatamId} onSelect={selectKhatam} />

        {!quranGoalEnabled && !isSolo && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The organizer has closed this khatam to new claims. If you already claimed a part, you can still mark it done.
          </p>
        )}

        {khatmComplete && (
          <section className="rounded-xl border border-success/30 bg-success-light px-5 py-4">
            <h2 className="text-lg font-semibold text-stone-900">This khatam is complete. Alhamdulillah.</h2>
            <p className="mt-0.5 text-sm text-stone-700">May Allah accept it from everyone who took part.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!isSolo && nextActive && (
                <button type="button" onClick={() => selectKhatam(nextActive.id)} className={btn("primary", "md")}>
                  Go to {khatamLabel(nextActive)}
                </button>
              )}
              {isLatestKhatam && (adminMode || isSolo) && (
                <button
                  type="button"
                  onClick={isSolo ? soloStartNewKhatam : startNewKhatam}
                  className={btn(nextActive && !isSolo ? "secondary" : "primary", "md")}
                >
                  Start another khatam
                </button>
              )}
            </div>
          </section>
        )}

        {/* Progress */}
        <section className={cn(ui.card, "p-4 sm:p-5")}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-sm text-stone-600">
              <span className="text-2xl font-semibold tabular-nums text-stone-900">{done}</span> of 120 quarters done
            </p>
            <span className="text-sm font-medium tabular-nums text-stone-600">{pct}%</span>
          </div>
          <ProgressBar done={done} claimed={isSolo ? 0 : prog} />
          {!isSolo && (
            <p className="mt-2 text-sm text-stone-500">
              {prog} claimed and being read · {rem} still available
            </p>
          )}
        </section>

        {/* The visitor's own claims */}
        {!isSolo && savedName && (myParts.length > 0 || myDoneCount > 0) && (
          <section className={cn(ui.card, "p-4 sm:p-5")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-stone-900">Your parts</h2>
              <span className="text-sm text-stone-500">as {savedName}</span>
            </div>
            {myParts.length > 0 ? (
              <ul className="mt-3 divide-y divide-stone-100">
                {myParts.map(([juz, parts]) => (
                  <li key={juz} className="flex items-center gap-3 py-2.5">
                    <button type="button" onClick={() => openJuz(juz)} className="min-w-0 flex-1 text-left">
                      <span className="block text-[15px] font-medium text-stone-900">Juz {juz}</span>
                      <span className="block text-sm text-stone-500">
                        {parts.length === 4 ? "Whole Juz" : parts.map(p => `Quarter ${p.q}`).join(", ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => finishJuzParts(juz, parts)}
                      disabled={finishing !== null}
                      className={btn("success", "sm")}
                    >
                      {finishing === juz ? "Saving…" : "Mark done"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-stone-600">
                You've finished everything you claimed ({myDoneCount} quarter{myDoneCount === 1 ? "" : "s"}). JazakAllahu khayran.
              </p>
            )}
          </section>
        )}

        {/* Grid */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {isSolo ? "Tick off each quarter as you read it" : "Choose a Juz to read"}
              </h2>
              {!isSolo && (
                <p className="text-sm text-stone-500">Take a whole Juz or just one of its four quarters.</p>
              )}
            </div>
            <Legend solo={isSolo} />
          </div>

          {isSolo ? (
            <SoloGrid slots={slots} onToggle={onSoloToggle} />
          ) : (
            <JuzGrid slots={slots} myName={savedName} onOpen={openJuz} />
          )}
        </section>

        {isSolo && (
          <section className={ui.card}>
            <button
              type="button"
              onClick={() => setManageOpen(v => !v)}
              aria-expanded={manageOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-stone-700"
            >
              Manage this khatam
              <ChevronDown size={16} className={cn("text-stone-400 transition-transform", manageOpen && "rotate-180")} />
            </button>
            {manageOpen && (
              <div className="space-y-5 border-t border-stone-100 px-4 py-4">
                <div>
                  <label htmlFor="new-khatam" className={ui.label}>Start another khatam</label>
                  <div className="flex gap-2">
                    <input
                      id="new-khatam"
                      value={newKhatamName}
                      onChange={e => setNewKhatamName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && soloStartNewKhatam()}
                      placeholder="Name (optional)"
                      maxLength={60}
                      className={ui.input}
                    />
                    <button type="button" onClick={soloStartNewKhatam} className={cn(btn("primary", "md"), "h-auto shrink-0")}>
                      Start
                    </button>
                  </div>
                  <p className={ui.hint}>Your current progress is kept. Switch between khatams at the top of the page.</p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                  <button type="button" onClick={soloResetAll} className={btn("danger", "sm")}>Clear all ticks</button>
                  <button type="button" onClick={soloDeleteKhatam} className={btn("danger", "sm")}>
                    Delete {selected ? khatamLabel(selected) : "this khatam"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {!isSolo && (
        <JuzDrawer
          juz={drawerJuz}
          open={drawerOpen}
          slots={slots}
          onClose={() => setDrawerOpen(false)}
          savedName={savedName}
          onNameSaved={persistName}
          claimsClosed={!quranGoalEnabled}
          onBook={onBook}
          onBookJuz={onBookJuz}
          onComplete={onComplete}
          onCompleteJuz={onCompleteJuz}
          onClaimed={onClaimed}
          onCompleted={what => toast.success(`${what} marked done. May Allah accept it.`)}
        />
      )}

      <ShareDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={shareTitle}
        slug={slug}
        path={isSolo ? `/k/${slug}/tracker` : undefined}
        slots={isSolo ? undefined : slots}
        isPrivate={isSolo}
      />
    </>
  );
}
