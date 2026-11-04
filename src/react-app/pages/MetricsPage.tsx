import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import type { Slot, StatusKey, CampaignGoal } from "@/lib/types";
import { supabasePublic } from "@/lib/supabase";
import { api, type KhatamMeta } from "@/lib/api";
import { getSurahName } from "@/lib/surahs";
import { ui, btn } from "@/lib/ui";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import CampaignTabs from "@/components/layout/CampaignTabs";
import { QuarterProgress, JuzMap } from "@/components/metrics/KhatamProgress";
import { TopReaders, RecentActivity } from "@/components/metrics/Activity";
import { CampaignGoals, type GoalTileData } from "@/components/metrics/CampaignGoals";
import { shortDate } from "@/components/metrics/format";

interface DbSlot {
  khatam_id: string | number;
  juz: number;
  q: number;
  status: StatusKey;
  claimed_by: string | null;
  claimed_at: string | null;
  done_at: string | null;
}

function dbToSlot(d: DbSlot): Slot {
  return {
    juz: d.juz,
    q: d.q,
    status: d.status,
    by: d.claimed_by,
    at: d.claimed_at,
    done_at: d.done_at,
  };
}

function upsertSlot(prev: Slot[], next: Slot) {
  const existingIndex = prev.findIndex(s => s.juz === next.juz && s.q === next.q);
  if (existingIndex === -1) {
    return [...prev, next].sort((a, b) => a.juz - b.juz || a.q - b.q);
  }
  const updated = [...prev];
  updated[existingIndex] = next;
  return updated;
}

const isFinished = (k: KhatamMeta) => !!k.completed_at || (k.total != null && (k.done ?? 0) >= k.total);

function newestKhatam(list: KhatamMeta[]) {
  return list.reduce((newest, k) => (k.khatam_num > newest.khatam_num ? k : newest), list[0]);
}

/** Same default as the tracker: the first started, unfinished khatam, then any unfinished one, then the newest. */
function preferredKhatam(list: KhatamMeta[]) {
  const byRound = [...list].sort((a, b) => a.khatam_num - b.khatam_num);
  return byRound.find(k => k.started && !isFinished(k)) ?? byRound.find(k => !isFinished(k)) ?? newestKhatam(list);
}

// Shared with the tracker so both tabs show the same khatam.
const storageKey = (slug: string) => `selectedKhatamId:${slug}`;
function readStoredKhatam(slug: string): number | null {
  try {
    const v = localStorage.getItem(storageKey(slug));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function storeKhatam(slug: string, id: number) {
  try {
    localStorage.setItem(storageKey(slug), String(id));
  } catch {
    /* storage unavailable */
  }
}

export default function MetricsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsKhatamId, setSlotsKhatamId] = useState<number | null>(null);
  const [, setTick] = useState(0); // re-render so relative times stay fresh
  const [khatams, setKhatams] = useState<KhatamMeta[]>([]);
  const [selectedKhatamId, setSelectedKhatamId] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoals, setCampaignGoals] = useState<CampaignGoal[]>([]);
  const [notFound, setNotFound] = useState(false);
  const newestIdRef = useRef<number | null>(null);

  const loadKhatams = useCallback(async () => {
    try {
      const history = await api.getHistory(slug);
      if (history.length === 0) throw new Error("Not found");
      const list = [...history].sort(
        (a, b) => (a.display_order ?? a.khatam_num) - (b.display_order ?? b.khatam_num) || a.khatam_num - b.khatam_num,
      );
      const newest = newestKhatam(list);
      const prevNewest = newestIdRef.current;
      newestIdRef.current = newest.id;

      setKhatams(list);
      setCampaignName(newest.campaign_name ?? newest.name ?? "");
      setNotFound(false);
      setSelectedKhatamId(prev => {
        if (prev != null && list.some(k => k.id === prev)) {
          // A screen left on the newest round follows the organiser into the next one.
          if (prevNewest != null && prev === prevNewest && newest.id !== prevNewest) return newest.id;
          return prev;
        }
        const stored = readStoredKhatam(slug);
        return list.find(k => k.id === stored)?.id ?? preferredKhatam(list).id;
      });
    } catch {
      setKhatams([]);
      setSelectedKhatamId(null);
      setSlots([]);
      setNotFound(true);
    }
  }, [slug]);

  useEffect(() => { void loadKhatams(); }, [loadKhatams]);

  // Slots for the selected khatam
  useEffect(() => {
    if (!selectedKhatamId) return;
    let cancelled = false;
    void supabasePublic
      .from("slots")
      .select("*")
      .eq("khatam_id", selectedKhatamId)
      .order("juz")
      .order("q")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSlots((data as DbSlot[]).map(dbToSlot));
        setSlotsKhatamId(selectedKhatamId);
      });
    return () => { cancelled = true; };
  }, [selectedKhatamId]);

  // Campaign goals (Surah goals + the khatam count goal), live
  useEffect(() => {
    if (!slug) return;
    const loadGoals = () => api.getCampaignGoals(slug).then(result => setCampaignGoals(result.goals)).catch(() => {});
    void loadGoals();
    const channel = supabasePublic
      .channel(`metrics-campaign-goals-${slug}`)
      .on("postgres_changes", { event: "*", schema: "khatam_public", table: "campaign_goals" }, loadGoals)
      .on("postgres_changes", { event: "*", schema: "khatam_public", table: "recitation_contributions" }, loadGoals)
      .subscribe();
    return () => { void supabasePublic.removeChannel(channel); };
  }, [slug]);

  // Realtime: refresh the khatam list
  useEffect(() => {
    if (!slug) return;
    const channel = supabasePublic
      .channel(`metrics-khatams-${slug}`)
      .on("postgres_changes", { event: "*", schema: "khatam_public", table: "khatams" }, () => {
        void loadKhatams();
      })
      .subscribe();
    return () => { void supabasePublic.removeChannel(channel); };
  }, [slug, loadKhatams]);

  // Realtime: apply slot changes immediately
  useEffect(() => {
    if (!selectedKhatamId) return;
    const channel = supabasePublic
      .channel(`metrics-slots-${selectedKhatamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "khatam_public", table: "slots", filter: `khatam_id=eq.${selectedKhatamId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as DbSlot;
            setSlots(prev => prev.filter(s => !(s.juz === oldRow.juz && s.q === oldRow.q)));
            return;
          }
          setSlots(prev => upsertSlot(prev, dbToSlot(payload.new as DbSlot)));
        },
      )
      .subscribe();
    return () => { void supabasePublic.removeChannel(channel); };
  }, [selectedKhatamId]);

  // Keep relative times fresh
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const selectKhatam = (id: number) => {
    if (id === selectedKhatamId) return;
    setSlots([]);
    setSelectedKhatamId(id);
    storeKhatam(slug, id);
  };

  const selected = khatams.find(k => k.id === selectedKhatamId) ?? null;
  const isSolo = !!selected?.is_solo;
  const slotsReady = selectedKhatamId != null && slotsKhatamId === selectedKhatamId;
  const done = slots.filter(s => s.status === "dn").length;
  const inProgress = slots.filter(s => s.status === "cl").length;
  const pct = Math.round((done / 120) * 100);

  const surahGoals = campaignGoals.filter(g => g.goal_type === "surah_recitation" && g.is_enabled);
  const hideOverview = khatams.length <= 1 && surahGoals.length === 0;

  const goalTiles = useMemo<GoalTileData[]>(() => {
    const tiles: GoalTileData[] = [];
    if (khatams.length > 1) {
      const khatamGoal = campaignGoals.find(g => g.goal_type === "quran_khatam" && g.is_enabled);
      tiles.push({
        key: "khatams",
        label: "Khatams completed",
        unit: "khatams",
        completed: khatamGoal?.completed ?? khatams.filter(isFinished).length,
        target: khatamGoal?.target ?? khatams.length,
      });
    }
    for (const g of campaignGoals) {
      if (g.goal_type !== "surah_recitation" || !g.is_enabled) continue;
      tiles.push({
        key: `surah-${g.id}`,
        label: `Surah ${getSurahName(g.surah_number)}`,
        unit: "recitations",
        completed: g.completed,
        target: g.target,
        to: `/k/${slug}/goals/${g.id}`,
      });
    }
    return tiles;
  }, [campaignGoals, khatams, slug]);

  // Group the khatam picker so long campaigns stay scannable.
  const khatamGroups = useMemo(() => {
    const label = (k: KhatamMeta) => {
      if (isFinished(k)) return `${k.name} · completed`;
      const d = k.id === selectedKhatamId ? done : (k.done ?? 0);
      return `${k.name} · ${d}/120`;
    };
    const groups = [
      { label: "In progress", items: khatams.filter(k => !isFinished(k) && k.started !== false) },
      { label: "Not started", items: khatams.filter(k => !isFinished(k) && k.started === false) },
      { label: "Completed", items: khatams.filter(isFinished) },
    ].filter(g => g.items.length > 0);
    return groups.map(g => ({ ...g, items: g.items.map(k => ({ id: k.id, text: label(k) })) }));
  }, [khatams, selectedKhatamId, done]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold text-stone-900">Campaign not found</h1>
        <p className="mt-2 text-sm text-stone-600">There is no khatam at “{slug}”. Check the link or start a new one.</p>
        <Link to="/" className={cn(btn("primary", "md"), "mt-6")}>Go to home page</Link>
      </div>
    );
  }

  const finishedOn = selected?.completed_at ? shortDate(selected.completed_at) : null;
  const status =
    done === 120
      ? finishedOn ? `Completed ${finishedOn}` : "Completed"
      : done === 0 && inProgress === 0
        ? "Not started yet"
        : "In progress";

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Live progress
          </span>
        }
        title={campaignName || "Progress"}
        back={isSolo ? { to: `/k/${slug}/tracker`, label: "Back to tracker" } : undefined}
      >
        <CampaignTabs slug={slug} hideOverview={hideOverview} isSolo={isSolo} />
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {goalTiles.length > 0 && (
          <section aria-labelledby="campaign-goals">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id="campaign-goals" className="text-base font-semibold text-stone-900">Campaign goals</h2>
              {khatams.length > 1 && <p className="text-sm text-stone-500">Across all {khatams.length} khatams</p>}
            </div>
            <CampaignGoals goals={goalTiles} />
          </section>
        )}

        <section aria-labelledby="khatam-progress" className="space-y-4">
          <div className={cn(ui.card, "p-4 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {khatams.length > 1 ? (
                <div className="w-full sm:max-w-sm">
                  <label htmlFor="khatam-picker" className={ui.label}>
                    <span id="khatam-progress">Khatam</span>
                  </label>
                  <select
                    id="khatam-picker"
                    className={ui.input}
                    value={selectedKhatamId ?? ""}
                    onChange={e => selectKhatam(Number(e.target.value))}
                  >
                    {khatamGroups.length === 1
                      ? khatamGroups[0].items.map(o => <option key={o.id} value={o.id}>{o.text}</option>)
                      : khatamGroups.map(g => (
                          <optgroup key={g.label} label={`${g.label} (${g.items.length})`}>
                            {g.items.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
                          </optgroup>
                        ))}
                  </select>
                </div>
              ) : (
                <h2
                  id="khatam-progress"
                  className={cn("text-base font-semibold text-stone-900", selected?.name === campaignName && "sr-only")}
                >
                  {selected?.name ?? "Khatam"}
                </h2>
              )}
              {selected && slotsReady && status !== "In progress" && (
                <span
                  className={cn(
                    "inline-flex h-7 w-fit shrink-0 items-center rounded-full px-2.5 text-xs font-medium sm:mb-1.5",
                    done === 120 ? "bg-success-light text-success" : "bg-stone-100 text-stone-600",
                  )}
                >
                  {status}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-5xl font-semibold tabular-nums leading-none tracking-tight text-stone-900 sm:text-6xl">
                {slotsReady ? `${pct}%` : "–"}
              </span>
              <span className="text-[15px] text-stone-600">
                <span className="font-semibold tabular-nums text-stone-900">{done}</span> of 120 quarters done
              </span>
            </div>
            <div className="mt-4">
              <QuarterProgress done={done} inProgress={inProgress} />
            </div>
          </div>

          <div className={cn(ui.card, "p-4 sm:p-6")}>
            <h3 className="text-base font-semibold text-stone-900">Juz map</h3>
            <p className="mb-4 mt-0.5 text-sm text-stone-500">Each block is one Juz. Its four bars are the quarters, in order.</p>
            <JuzMap slots={slots} />
          </div>

          <div className={cn("grid gap-4", !isSolo && "lg:grid-cols-2")}>
            {!isSolo && (
              <div className={cn(ui.card, "p-4 sm:p-6")}>
                <h3 className="mb-1 text-base font-semibold text-stone-900">Top readers</h3>
                <TopReaders slots={slots} />
              </div>
            )}
            <div className={cn(ui.card, "p-4 sm:p-6")}>
              <h3 className="mb-1 text-base font-semibold text-stone-900">Recent activity</h3>
              <RecentActivity slots={slots} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
