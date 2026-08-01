import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Search,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { api, type KhatamMeta } from "@/lib/api";
import { getSurahName } from "@/lib/surahs";
import type { CampaignGoal } from "@/lib/types";

function roundPriority(khatam: KhatamMeta) {
  const done = khatam.done ?? 0;
  const total = khatam.total ?? 120;
  if (khatam.started && done < total) return 0;
  if (done < total) return 1;
  return 2;
}

function KhatamCard({
  khatam,
  onOpen,
}: {
  khatam: KhatamMeta;
  onOpen: (khatam: KhatamMeta) => void;
}) {
  const done = khatam.done ?? 0;
  const total = khatam.total ?? 120;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done === total;
  const inProgress = Boolean(khatam.started) && !complete;

  return (
    <button
      type="button"
      onClick={() => onOpen(khatam)}
      className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-all hover:border-[#8B0000]/25 hover:bg-[#FFF9F7] focus-visible:ring-2 focus-visible:ring-[#8B0000]/25 sm:grid-cols-[auto_minmax(10rem,1fr)_minmax(10rem,0.8fr)_auto] sm:px-4"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
        complete ? "bg-green-50 text-green-700" : inProgress ? "bg-amber-50 text-amber-700" : "bg-[#FFF5F5] text-[#8B0000]"
      }`}>
        {complete ? <CheckCircle2 size={16} /> : inProgress ? <Clock3 size={16} /> : <BookOpen size={16} />}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">Khatam {khatam.khatam_num}</p>
        <h3 className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-[#8B0000]">
          {khatam.name || `Khatam ${khatam.khatam_num}`}
        </h3>
      </div>

      <div className="col-span-3 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:col-span-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${complete ? "bg-green-600" : "bg-[#8B0000]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-gray-400">{pct}%</span>
        <span className="col-span-2 text-[10px] text-gray-400">{done} of {total} quarters complete</span>
      </div>

      <div className="col-start-3 row-start-1 flex items-center gap-2 sm:col-start-4">
        <span className={`hidden text-[10px] font-semibold sm:inline ${
          complete ? "text-green-700" : inProgress ? "text-amber-700" : "text-gray-500"
        }`}>
          {complete ? "Complete" : inProgress ? "In progress" : "Ready"}
        </span>
        <ArrowRight size={14} className="text-[#8B0000] transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export default function CampaignOverviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [khatams, setKhatams] = useState<KhatamMeta[]>([]);
  const [goals, setGoals] = useState<CampaignGoal[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([api.getHistory(slug), api.getCampaignGoals(slug)])
      .then(([history, goalResult]) => {
        setKhatams(history);
        setGoals(goalResult.goals);
        setNotFound(history.length === 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const sorted = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...khatams]
      .filter(khatam => !normalized
        || (khatam.name ?? `Khatam ${khatam.khatam_num}`).toLowerCase().includes(normalized)
        || String(khatam.khatam_num).includes(normalized))
      .sort((a, b) => roundPriority(a) - roundPriority(b) || a.khatam_num - b.khatam_num);
  }, [khatams, query]);

  const openKhatams = sorted.filter(khatam => (khatam.participation_mode ?? "open") === "open");
  const groupKhatams = sorted.filter(khatam => khatam.participation_mode === "group");
  const quranGoal = goals.find(goal => goal.goal_type === "quran_khatam");
  const surahGoals = goals.filter(goal => goal.goal_type === "surah_recitation" && goal.is_enabled);
  const quranEnabled = quranGoal?.is_enabled ?? true;
  const enabledGoalCount = goals.filter(goal => goal.is_enabled).length;
  const campaign = khatams[0];
  const completed = khatams.filter(khatam => (khatam.done ?? 0) === (khatam.total ?? 120)).length;
  const active = khatams.filter(khatam => khatam.started && (khatam.done ?? 0) < (khatam.total ?? 120)).length;

  const openTracker = (khatam: KhatamMeta) => {
    if (!slug) return;
    localStorage.setItem(`selectedKhatamId:${slug}`, String(khatam.id));
    navigate(`/k/${slug}/tracker`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent" />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaign not found</h1>
          <Link to="/" className="mt-3 inline-block text-sm font-medium text-[#8B0000] hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (khatams.every(khatam => khatam.is_solo)) {
    return <Navigate to={`/k/${slug}/tracker`} replace />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header
        className="relative overflow-hidden px-5 py-12 text-white"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 68%, #3A0000 100%)" }}
      >
        <div className="relative mx-auto max-w-[1100px]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Campaign overview</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1
                className="text-4xl font-normal tracking-wide text-white sm:text-5xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {campaign.campaign_name || campaign.name || "Khatam campaign"}
              </h1>
              {campaign.campaign_description && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                  {campaign.campaign_description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/k/${slug}/metrics`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                <BarChart3 size={13} />
                Detailed dashboard
              </Link>
              <Link
                to={`/k/${slug}/admin`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                <Shield size={13} />
                Organizer admin
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-sm text-white/70">
            <span><strong className="text-xl text-white">{enabledGoalCount}</strong> goal{enabledGoalCount === 1 ? "" : "s"}</span>
            {quranEnabled && <span><strong className="text-xl text-white">{active}</strong> Khatams in progress</span>}
            {quranEnabled && <span><strong className="text-xl text-white">{completed}</strong> Khatams complete</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8">
        {quranEnabled && <label className="flex max-w-xl items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 shadow-sm focus-within:border-[#8B0000]/50">
          <Search size={17} className="shrink-0 text-[#8B0000]" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search a family, institution, or Khatam number"
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-gray-800 outline-none"
          />
        </label>}
        {quranEnabled && <p className="mt-2 text-xs text-gray-400">
          Khatams with unfinished portions appear first.
        </p>}

        {surahGoals.length > 0 && (
          <section className="mt-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#8B0000]"><Target size={17} /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Surah recitations</p></div>
                <h2 className="mt-1 text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Collective Surah goals</h2>
                <p className="mt-1 text-sm text-gray-500">Pledge a number of recitations, then return to mark them complete.</p>
              </div>
              <span className="text-xs font-medium text-gray-400">{surahGoals.length}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {surahGoals.map(goal => {
                const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;
                return (
                  <Link key={goal.id} to={`/k/${slug}/goals/${goal.id}`} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#8B0000]/25 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">Surah {goal.surah_number}</p><h3 className="mt-1 text-xl font-semibold text-gray-900 group-hover:text-[#8B0000]">{getSurahName(goal.surah_number)}</h3></div><BookOpen size={20} className="text-[#8B0000]" /></div>
                    <div className="mt-5 flex items-end justify-between gap-4"><p className="text-sm text-gray-500"><strong className="text-2xl text-[#8B0000]">{goal.completed.toLocaleString()}</strong> of {goal.target.toLocaleString()} complete</p><span className="text-xs font-semibold text-[#8B0000]">Open <ArrowRight size={13} className="inline" /></span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#8B0000]" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-2 text-[10px] text-gray-400">{goal.in_progress.toLocaleString()} currently pledged · {goal.contributor_count} participants</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {quranEnabled && <section className="mt-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#8B0000]">
                <Users size={17} />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Open participation</p>
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Individual portions
              </h2>
              <p className="mt-1 text-sm text-gray-500">Anyone with the link can select a quarter or Juz.</p>
            </div>
            <span className="text-xs font-medium text-gray-400">{openKhatams.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {openKhatams.map(khatam => <KhatamCard key={khatam.id} khatam={khatam} onOpen={openTracker} />)}
          </div>
          {openKhatams.length === 0 && (
            <p className="mt-5 border-t border-gray-200 py-6 text-sm text-gray-400">
              No open-participation Khatams match this search.
            </p>
          )}
        </section>}

        {quranEnabled && <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#8B0000]">
                <Building2 size={17} />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Families & institutions</p>
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Group Khatams
              </h2>
              <p className="mt-1 text-sm text-gray-500">Whole-Quran commitments coordinated by a family, class, or institution.</p>
            </div>
            <span className="text-xs font-medium text-gray-400">{groupKhatams.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {groupKhatams.map(khatam => <KhatamCard key={khatam.id} khatam={khatam} onOpen={openTracker} />)}
          </div>
          {groupKhatams.length === 0 && (
            <p className="mt-5 border-t border-gray-200 py-6 text-sm text-gray-400">
              {query ? "No group Khatams match this search." : "No family or institution Khatams have been added yet."}
            </p>
          )}
        </section>}
      </main>
    </div>
  );
}
