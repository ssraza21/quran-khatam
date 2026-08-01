import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supabasePublic } from "@/lib/supabase";
import { getSurahName } from "@/lib/surahs";
import type { CampaignGoal, RecitationContribution } from "@/lib/types";

export default function SurahGoalPage() {
  const { slug, goalId: goalIdParam } = useParams<{ slug: string; goalId: string }>();
  const goalId = Number(goalIdParam);
  const [goal, setGoal] = useState<CampaignGoal | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState<string | null>(null);
  const [contributions, setContributions] = useState<RecitationContribution[]>([]);
  const [name, setName] = useState(() => localStorage.getItem("qk_claimer") ?? "");
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
      setCampaignDescription(goalResult.campaign.description);
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
  const pct = goal && goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;
  const inProgressPct = goal && goal.target > 0 ? Math.min(100, Math.round((goal.in_progress / goal.target) * 100)) : 0;
  const surahName = getSurahName(goal?.surah_number);

  const saveName = () => {
    const trimmed = name.trim();
    setName(trimmed);
    if (trimmed) localStorage.setItem("qk_claimer", trimmed);
  };

  const pledge = async () => {
    if (!slug || !goal || !name.trim()) return toast.error("Enter your name first");
    if (!Number.isInteger(pledgeQuantity) || pledgeQuantity < 1 || pledgeQuantity > available) {
      return toast.error(`Choose between 1 and ${available} recitations`);
    }
    saveName();
    setSaving("pledge");
    try {
      await api.pledgeSurahRecitations(slug, goal.id, name.trim(), pledgeQuantity);
      toast.success(`${pledgeQuantity} recitation${pledgeQuantity === 1 ? "" : "s"} pledged`);
      setPledgeQuantity(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save pledge");
    } finally {
      setSaving(null);
    }
  };

  const complete = async () => {
    if (!slug || !goal || !name.trim()) return toast.error("Enter the same name used for your pledge");
    if (!Number.isInteger(completeQuantity) || completeQuantity < 1 || completeQuantity > mineRemaining) {
      return toast.error(`Choose between 1 and ${mineRemaining} recitations`);
    }
    saveName();
    setSaving("complete");
    try {
      await api.completeSurahRecitations(slug, goal.id, name.trim(), completeQuantity);
      toast.success(`${completeQuantity} recitation${completeQuantity === 1 ? "" : "s"} completed — Alhamdulillah`);
      setCompleteQuantity(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete recitations");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent" /></div>;
  }

  if (notFound || !goal || !slug) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
        <div><h1 className="text-2xl font-semibold">Surah goal not found</h1><Link to={`/k/${slug ?? ""}`} className="mt-3 inline-block text-sm text-[#8B0000] hover:underline">Return to campaign</Link></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="bg-linear-to-br from-[#8B0000] via-[#5A0000] to-[#360000] px-5 py-10 text-white">
        <div className="mx-auto max-w-[1000px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to={`/k/${slug}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white"><ArrowLeft size={14} /> Campaign overview</Link>
            <Link to={`/k/${slug}/admin`} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white"><Shield size={12} /> Organizer admin</Link>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">{campaignName}</p>
          <h1 className="mt-2 text-4xl font-normal tracking-wide text-white sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif" }}>Surah {surahName}</h1>
          {campaignDescription && <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70">{campaignDescription}</p>}
          {!goal.is_enabled && <p className="mt-4 inline-flex rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-semibold text-amber-100">This goal is currently archived.</p>}
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Collective progress</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">Every recitation brings the community closer</h2>
            </div>
            <p className="text-sm text-gray-500"><strong className="text-lg text-gray-900">{goal.target.toLocaleString()}</strong> recitations</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-green-200/80 bg-green-50/70 p-5 transition-colors hover:border-green-300 hover:bg-green-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100"><CheckCircle2 size={16} /></span>
                  <span className="text-sm font-semibold">Completed</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-green-700">{pct}%</span>
              </div>
              <p className="mt-5 text-3xl font-semibold tabular-nums text-green-950">{goal.completed.toLocaleString()}</p>
              <p className="mt-1 text-xs text-green-800/70">recitations finished</p>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-green-100"
                role="progressbar"
                aria-label="Completed recitations"
                aria-valuemin={0}
                aria-valuemax={goal.target}
                aria-valuenow={goal.completed}
              >
                <div className="h-full rounded-full bg-green-700 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 transition-colors hover:border-amber-300 hover:bg-amber-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100"><Clock3 size={16} /></span>
                  <span className="text-sm font-semibold">In progress</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-amber-700">{inProgressPct}%</span>
              </div>
              <p className="mt-5 text-3xl font-semibold tabular-nums text-amber-950">{goal.in_progress.toLocaleString()}</p>
              <p className="mt-1 text-xs text-amber-800/70">pledged and awaiting completion</p>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100"
                role="progressbar"
                aria-label="Recitations in progress"
                aria-valuemin={0}
                aria-valuemax={goal.target}
                aria-valuenow={goal.in_progress}
              >
                <div className="h-full rounded-full bg-amber-600 transition-[width] duration-500" style={{ width: `${inProgressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5"><BookOpen size={14} className="text-[#8B0000]" />{available.toLocaleString()} still available to pledge</span>
            <span className="font-semibold tabular-nums text-[#8B0000]">{pct}% complete overall</span>
          </div>
        </section>

        {((goal.is_enabled && goal.completed < goal.target) || goal.in_progress > 0) && (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Make a pledge</h2>
              {goal.is_enabled ? <>
                <p className="mt-1 text-sm text-gray-500">Choose how many times you intend to recite Surah {surahName}.</p>
                <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Your name</label>
                <input value={name} onChange={event => setName(event.target.value)} maxLength={60} placeholder="Enter your name" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]" />
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Number of recitations</label>
                <input type="number" min={1} max={available} value={pledgeQuantity} onChange={event => setPledgeQuantity(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]" />
                <button type="button" disabled={saving !== null || available < 1} onClick={pledge} className="mt-4 w-full rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-50">{saving === "pledge" ? "Saving pledge..." : "Pledge recitations"}</button>
              </> : <p className="mt-4 rounded-xl bg-amber-50 px-4 py-5 text-sm text-amber-800">This goal is archived and is not accepting new pledges.</p>}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Mark recitations complete</h2>
              {!goal.is_enabled && (
                <>
                  <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Name used for the pledge</label>
                  <input value={name} onChange={event => setName(event.target.value)} maxLength={60} placeholder="Enter your name" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]" />
                </>
              )}
              {mine ? (
                <>
                  <p className="mt-1 text-sm text-gray-500">{mine.completed_count} of your {mine.pledged_count} pledged recitations are complete.</p>
                  <div className="mt-4 rounded-xl bg-[#FFF5F5] px-4 py-3 text-sm"><strong className="text-[#8B0000]">{mineRemaining}</strong> remaining for {mine.participant_name}</div>
                  <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Completed now</label>
                  <input type="number" min={1} max={mineRemaining} value={completeQuantity} onChange={event => setCompleteQuantity(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]" />
                  <button type="button" disabled={saving !== null || mineRemaining < 1} onClick={complete} className="mt-4 w-full rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">{saving === "complete" ? "Saving completion..." : "Mark complete"}</button>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">Enter the same name used for a pledge to see and complete it.</div>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Users size={18} className="text-[#8B0000]" /> Community pledges</h2><p className="mt-1 text-sm text-gray-500">{goal.contributor_count} participant{goal.contributor_count === 1 ? "" : "s"}</p></div></div>
          {contributions.length === 0 ? <p className="mt-5 border-t border-gray-100 py-8 text-center text-sm text-gray-400">No pledges yet. Be the first to participate.</p> : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {contributions.map(item => {
                const remaining = item.pledged_count - item.completed_count;
                const participantPct = item.pledged_count > 0
                  ? Math.min(100, Math.round((item.completed_count / item.pledged_count) * 100))
                  : 0;
                const isComplete = remaining === 0;
                return (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-[#FAFAF9] p-4 transition-colors hover:border-[#8B0000]/20 hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{item.participant_name}</p>
                        <p className="mt-1 text-xs text-gray-400">{item.completed_count} of {item.pledged_count} completed</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isComplete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {isComplete ? "Completed" : "In progress"}
                      </span>
                    </div>
                    <div
                      className="mt-4 flex h-2 overflow-hidden rounded-full bg-amber-100"
                      role="progressbar"
                      aria-label={`${item.participant_name}'s completed recitations`}
                      aria-valuemin={0}
                      aria-valuemax={item.pledged_count}
                      aria-valuenow={item.completed_count}
                    >
                      <div className="h-full bg-green-700 transition-[width] duration-500" style={{ width: `${participantPct}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px]">
                      <span className="font-medium text-green-700">{participantPct}% complete</span>
                      {!isComplete && <span className="text-amber-700">{remaining} remaining</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
