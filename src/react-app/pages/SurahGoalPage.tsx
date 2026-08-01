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
          {campaignDescription && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{campaignDescription}</p>}
          {!goal.is_enabled && <p className="mt-4 inline-flex rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-semibold text-amber-100">This goal is currently archived.</p>}
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Collective progress</p>
              <p className="mt-2 text-4xl font-bold text-gray-900"><span className="text-[#8B0000]">{goal.completed.toLocaleString()}</span> <span className="text-xl font-medium text-gray-400">of {goal.target.toLocaleString()}</span></p>
              <p className="mt-2 text-sm text-gray-500">completed recitations</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <div className="rounded-xl bg-green-50 px-3 py-3"><CheckCircle2 size={14} className="mx-auto text-green-700" /><p className="mt-1 text-lg font-bold text-green-800">{goal.completed}</p><p className="text-[9px] uppercase text-green-700/70">Complete</p></div>
              <div className="rounded-xl bg-amber-50 px-3 py-3"><Clock3 size={14} className="mx-auto text-amber-700" /><p className="mt-1 text-lg font-bold text-amber-800">{goal.in_progress}</p><p className="text-[9px] uppercase text-amber-700/70">Pledged</p></div>
              <div className="rounded-xl bg-gray-50 px-3 py-3"><BookOpen size={14} className="mx-auto text-gray-500" /><p className="mt-1 text-lg font-bold text-gray-700">{available}</p><p className="text-[9px] uppercase text-gray-500">Available</p></div>
            </div>
          </div>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-linear-to-r from-[#8B0000] to-[#B71C1C] transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-right text-xs font-medium text-gray-400">{pct}% complete</p>
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
            <div className="mt-4 divide-y divide-gray-100">
              {contributions.map(item => {
                const remaining = item.pledged_count - item.completed_count;
                return <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{item.participant_name}</p><p className="mt-0.5 text-xs text-gray-400">{remaining > 0 ? `${remaining} still pledged` : "Pledge complete"}</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold text-green-700">{item.completed_count} complete</p><p className="text-[10px] text-gray-400">of {item.pledged_count}</p></div></div>;
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
