import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supabasePublic } from "@/lib/supabase";
import { getSurahName } from "@/lib/surahs";
import { COLORS } from "@/lib/constants";
import type { CampaignGoal, RecitationContribution } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import CampaignTabs from "@/components/layout/CampaignTabs";
import NotFoundPage from "@/pages/NotFoundPage";

const NAME_KEY = "qk_claimer";

function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  const clamp = (n: number) => Math.max(1, Math.min(Math.max(max, 1), n));
  return (
    <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
      <button
        type="button"
        aria-label="Fewer"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
        className="flex h-11 w-11 items-center justify-center text-stone-600 disabled:opacity-30"
      >
        <Minus size={16} />
      </button>
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={e => onChange(clamp(Number(e.target.value) || 1))}
        className="h-11 w-14 border-x border-stone-200 bg-transparent text-center text-base tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="More"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="flex h-11 w-11 items-center justify-center text-stone-600 disabled:opacity-30"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function SurahGoalPage() {
  const { slug, goalId: goalIdParam } = useParams<{ slug: string; goalId: string }>();
  const goalId = Number(goalIdParam);
  const [goal, setGoal] = useState<CampaignGoal | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [contributions, setContributions] = useState<RecitationContribution[]>([]);
  const [name, setName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
  });
  const [pledgeQuantity, setPledgeQuantity] = useState(1);
  const [completeQuantity, setCompleteQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"pledge" | "complete" | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!slug || !Number.isSafeInteger(goalId) || goalId < 1) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const [goalResult, contributionResult] = await Promise.all([
        api.getCampaignGoals(slug),
        api.getSurahContributions(slug, goalId),
      ]);
      const selected = goalResult.goals.find(item => item.id === goalId && item.goal_type === "surah_recitation");
      if (!selected) throw new Error("Surah goal not found");
      setGoal(selected);
      setCampaignName(goalResult.campaign.name);
      setContributions(contributionResult.contributions);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [goalId, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!goalId || !slug) return;
    const channel = supabasePublic
      .channel(`surah-goal-${goalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "khatam_public", table: "recitation_contributions", filter: `goal_id=eq.${goalId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "khatam_public", table: "campaign_goals", filter: `id=eq.${goalId}` },
        () => void load(),
      )
      .subscribe();
    return () => { void supabasePublic.removeChannel(channel); };
  }, [goalId, load, slug]);

  const normalizedName = name.trim().toLowerCase();
  const mine = useMemo(
    () => contributions.find(item => item.participant_name.trim().toLowerCase() === normalizedName),
    [contributions, normalizedName],
  );
  const mineRemaining = mine ? mine.pledged_count - mine.completed_count : 0;
  const available = goal ? Math.max(goal.target - goal.pledged, 0) : 0;
  const surahName = getSurahName(goal?.surah_number);
  const sortedContributions = useMemo(
    () => [...contributions].sort((a, b) => b.completed_count - a.completed_count || a.participant_name.localeCompare(b.participant_name)),
    [contributions],
  );

  const saveName = () => {
    const trimmed = name.trim();
    setName(trimmed);
    try { if (trimmed) localStorage.setItem(NAME_KEY, trimmed); } catch { /* not remembered */ }
  };

  const pledge = async () => {
    if (!slug || !goal) return;
    if (!name.trim()) return toast.error("Enter your name first.");
    if (pledgeQuantity < 1 || pledgeQuantity > available) {
      return toast.error(`You can pledge between 1 and ${available}.`);
    }
    saveName();
    setSaving("pledge");
    try {
      await api.pledgeSurahRecitations(slug, goal.id, name.trim(), pledgeQuantity);
      toast.success(`Pledged ${pledgeQuantity} recitation${pledgeQuantity === 1 ? "" : "s"}`);
      setPledgeQuantity(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your pledge. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const complete = async () => {
    if (!slug || !goal || !mine) return;
    if (completeQuantity < 1 || completeQuantity > mineRemaining) {
      return toast.error(`You can mark between 1 and ${mineRemaining}.`);
    }
    saveName();
    setSaving("complete");
    try {
      await api.completeSurahRecitations(slug, goal.id, name.trim(), completeQuantity);
      toast.success(`${completeQuantity} recitation${completeQuantity === 1 ? "" : "s"} marked done. May Allah accept it.`);
      setCompleteQuantity(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !goal || !slug) {
    return <NotFoundPage title="Surah goal not found" message="It may have been removed by the organizer." />;
  }

  const goalComplete = goal.completed >= goal.target;
  const donePct = goal.target > 0 ? Math.min(100, (goal.completed / goal.target) * 100) : 0;
  const pledgedPct = goal.target > 0 ? Math.min(100 - donePct, (goal.in_progress / goal.target) * 100) : 0;

  return (
    <>
      <PageHeader eyebrow={campaignName} title={`Surah ${surahName}`}>
        <CampaignTabs slug={slug} />
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-8">
        {!goal.is_enabled && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The organizer has closed this goal to new pledges. If you pledged before, you can still mark recitations done.
          </p>
        )}

        <section className={cn(ui.card, "p-4 sm:p-5")}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-sm text-stone-600">
              <span className="text-2xl font-semibold tabular-nums text-stone-900">{goal.completed.toLocaleString()}</span>
              {" "}of {goal.target.toLocaleString()} recitations done
            </p>
            <span className="text-sm font-medium tabular-nums text-stone-600">{Math.round(donePct)}%</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full" style={{ width: `${donePct}%`, background: COLORS.dn.accent }} />
            <div className="h-full" style={{ width: `${pledgedPct}%`, background: COLORS.cl.accent }} />
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {goalComplete
              ? `Completed by ${goal.contributor_count} ${goal.contributor_count === 1 ? "person" : "people"}. Alhamdulillah.`
              : `${goal.in_progress.toLocaleString()} pledged and in progress · ${available.toLocaleString()} still open`}
          </p>
        </section>

        {(!goalComplete || mineRemaining > 0) && (
          <section className={cn(ui.card, "p-4 sm:p-5")}>
            <h2 className="text-base font-semibold text-stone-900">Your recitations</h2>
            <div className="mt-3">
              <label htmlFor="surah-name" className={ui.label}>Your name</label>
              <input
                id="surah-name"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={saveName}
                maxLength={60}
                placeholder="Use the same name each time"
                autoComplete="name"
                className={ui.input}
              />
            </div>

            {mine && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-sm text-stone-700">
                  You pledged <strong className="font-semibold">{mine.pledged_count}</strong> and have done{" "}
                  <strong className="font-semibold">{mine.completed_count}</strong>.
                </p>
                {mineRemaining > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Stepper value={completeQuantity} max={mineRemaining} onChange={setCompleteQuantity} label="Recitations finished" />
                    <button type="button" onClick={complete} disabled={saving !== null} className={btn("success", "md")}>
                      {saving === "complete" ? "Saving…" : `Mark ${completeQuantity} done`}
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-success">All your pledged recitations are done. JazakAllahu khayran.</p>
                )}
              </div>
            )}

            {!mine && (!goal.is_enabled || available === 0) && (
              <p className={ui.hint}>Enter the name you pledged with to mark your recitations done.</p>
            )}

            {goal.is_enabled && available > 0 && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-sm font-medium text-stone-700">
                  {mine ? "Pledge more" : `How many times will you recite Surah ${surahName}?`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Stepper value={pledgeQuantity} max={available} onChange={setPledgeQuantity} label="Recitations to pledge" />
                  <button type="button" onClick={pledge} disabled={saving !== null} className={btn("primary", "md")}>
                    {saving === "pledge" ? "Saving…" : `Pledge ${pledgeQuantity}`}
                  </button>
                </div>
                {!mine && <p className={ui.hint}>Come back with the same name to mark them done.</p>}
              </div>
            )}
          </section>
        )}

        <section className={cn(ui.card, "p-4 sm:p-5")}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-stone-900">Who's reciting</h2>
            <span className="text-sm text-stone-500">{goal.contributor_count} {goal.contributor_count === 1 ? "person" : "people"}</span>
          </div>
          {sortedContributions.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No pledges yet. Be the first.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {sortedContributions.map(item => {
                const finished = item.completed_count >= item.pledged_count;
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[15px] text-stone-900">{item.participant_name}</span>
                    <span className={cn("shrink-0 text-sm tabular-nums", finished ? "text-success" : "text-stone-500")}>
                      {item.completed_count} of {item.pledged_count} done
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
