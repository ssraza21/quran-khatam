import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Search, Share2 } from "lucide-react";
import { api, type KhatamMeta } from "@/lib/api";
import { getSurahName } from "@/lib/surahs";
import type { CampaignGoal } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { khatamLabel } from "@/lib/helpers";
import PageHeader from "@/components/layout/PageHeader";
import CampaignTabs from "@/components/layout/CampaignTabs";
import ShareDrawer from "@/components/khatam/ShareDrawer";
import NotFoundPage from "@/pages/NotFoundPage";

const isDone = (k: KhatamMeta) => (k.done ?? 0) >= (k.total ?? 120);

/** The khatam a new visitor should be sent to: one already underway, else the first unstarted one. */
function nextKhatam(khatams: KhatamMeta[]) {
  const ordered = [...khatams].sort((a, b) => a.khatam_num - b.khatam_num);
  const open = ordered.filter(k => (k.participation_mode ?? "open") === "open");
  const pool = open.length > 0 ? open : ordered;
  return pool.find(k => k.started && !isDone(k)) ?? pool.find(k => !isDone(k)) ?? null;
}

function KhatamRow({ khatam, onOpen }: { khatam: KhatamMeta; onOpen: (k: KhatamMeta) => void }) {
  const done = khatam.done ?? 0;
  const total = khatam.total ?? 120;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(khatam)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-stone-900">{khatamLabel(khatam)}</span>
            {khatam.participation_mode === "group" && (
              <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">Group</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className={"h-full rounded-full bg-success"} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn("w-20 shrink-0 text-right text-xs tabular-nums", complete ? "text-success" : "text-stone-500")}>
              {complete ? "Complete" : `${done}/${total} done`}
            </span>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-stone-400" />
      </button>
    </li>
  );
}

export default function CampaignOverviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [khatams, setKhatams] = useState<KhatamMeta[]>([]);
  const [goals, setGoals] = useState<CampaignGoal[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([api.getHistory(slug), api.getCampaignGoals(slug).catch(() => ({ goals: [] as CampaignGoal[] }))])
      .then(([history, goalResult]) => {
        setKhatams(history);
        setGoals(goalResult.goals);
        setNotFound(history.length === 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const quranGoal = goals.find(goal => goal.goal_type === "quran_khatam");
  const surahGoals = goals.filter(goal => goal.goal_type === "surah_recitation" && goal.is_enabled);
  const quranEnabled = quranGoal?.is_enabled ?? true;
  const campaign = khatams[0];

  const active = useMemo(() => khatams.filter(k => !isDone(k)), [khatams]);
  const completed = useMemo(() => khatams.filter(isDone), [khatams]);
  const next = useMemo(() => nextKhatam(khatams), [khatams]);

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filter === "active" ? active : completed;
    return [...base]
      .filter(k => !q || khatamLabel(k).toLowerCase().includes(q) || String(k.khatam_num) === q)
      .sort((a, b) => Number(Boolean(b.started)) - Number(Boolean(a.started)) || a.khatam_num - b.khatam_num);
  }, [active, completed, filter, query]);

  const openTracker = (khatam: KhatamMeta) => {
    if (!slug) return;
    localStorage.setItem(`selectedKhatamId:${slug}`, String(khatam.id));
    navigate(`/k/${slug}/tracker`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !campaign || !slug) {
    return <NotFoundPage title="Khatam not found" message={`There's no khatam at /k/${slug}. Check the link with whoever shared it.`} />;
  }

  // Personal khatams and simple single-khatam campaigns don't need an overview.
  if (khatams.every(k => k.is_solo) || (khatams.length === 1 && surahGoals.length === 0)) {
    return <Navigate to={`/k/${slug}/tracker`} replace />;
  }

  const title = campaign.campaign_name || campaign.name || "Khatam";
  const showSearch = khatams.length > 8;

  return (
    <>
      <PageHeader
        title={title}
        description={campaign.campaign_description}
        actions={
          <button type="button" onClick={() => setShareOpen(true)} className={btn("secondary", "md")}>
            <Share2 size={16} />
            Invite
          </button>
        }
      >
        <CampaignTabs slug={slug} />
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {quranEnabled && (
          <section className={cn(ui.card, "p-5 sm:p-6")}>
            {next ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-stone-500">Ready for readers</p>
                  <h2 className="mt-0.5 text-xl font-semibold text-stone-900">{khatamLabel(next)}</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {120 - (next.done ?? 0)} of 120 quarters still to read
                  </p>
                </div>
                <button type="button" onClick={() => openTracker(next)} className={cn(btn("primary", "lg"), "w-full sm:w-auto")}>
                  Pick a part to read
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Every khatam is complete</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Alhamdulillah. The organizer can start another one from the admin page.
                </p>
              </div>
            )}
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4 text-center sm:max-w-md sm:text-left">
              <div>
                <dt className="text-xs text-stone-500">Completed</dt>
                <dd className="text-lg font-semibold tabular-nums text-stone-900">{completed.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Underway</dt>
                <dd className="text-lg font-semibold tabular-nums text-stone-900">{active.filter(k => k.started).length}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Goal</dt>
                <dd className="text-lg font-semibold tabular-nums text-stone-900">{Math.max(campaign.campaign_goal ?? 0, khatams.length)}</dd>
              </div>
            </dl>
          </section>
        )}

        {surahGoals.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-stone-900">Surah recitations</h2>
            <p className="mt-0.5 text-sm text-stone-600">Pledge how many times you'll recite a surah, then mark them done.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {surahGoals.map(goal => {
                const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;
                const done = goal.completed >= goal.target;
                return (
                  <Link
                    key={goal.id}
                    to={`/k/${slug}/goals/${goal.id}`}
                    className={cn(ui.card, "group block p-4 transition-colors hover:border-stone-300")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-semibold text-stone-900 group-hover:text-primary">
                        Surah {getSurahName(goal.surah_number)}
                      </h3>
                      <ChevronRight size={18} className="text-stone-400" />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-stone-600">
                      {done
                        ? `All ${goal.target.toLocaleString()} recitations complete`
                        : `${goal.completed.toLocaleString()} of ${goal.target.toLocaleString()} recited · ${goal.contributor_count} ${goal.contributor_count === 1 ? "person" : "people"}`}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {quranEnabled && khatams.length > 1 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">All khatams</h2>
              <div className="inline-flex rounded-lg bg-stone-100 p-1" role="tablist">
                {([
                  ["active", `Active · ${active.length}`],
                  ["completed", `Completed · ${completed.length}`],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      filter === value ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {showSearch && (
              <label className="relative mt-3 block max-w-sm">
                <span className="sr-only">Search khatams</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or number"
                  className={cn(ui.input, "pl-9")}
                />
              </label>
            )}

            {listed.length > 0 ? (
              <ul className={cn(ui.card, "mt-3 divide-y divide-stone-100 overflow-hidden")}>
                {listed.map(k => <KhatamRow key={k.id} khatam={k} onOpen={openTracker} />)}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                {query ? "No khatams match your search." : filter === "completed" ? "None completed yet." : "No active khatams."}
              </p>
            )}
          </section>
        )}
      </div>

      <ShareDrawer open={shareOpen} onClose={() => setShareOpen(false)} title={title} slug={slug} />
    </>
  );
}
