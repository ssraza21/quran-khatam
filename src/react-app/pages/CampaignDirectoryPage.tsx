import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";
import { api, type CampaignDirectoryItem } from "@/lib/api";
import { getSurahName } from "@/lib/surahs";

const PAGE_SIZE = 24;

export default function CampaignDirectoryPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignDirectoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadCampaigns = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const result = await api.getCampaignDirectory(query, PAGE_SIZE, offset);
      setCampaigns(previous => append ? [...previous, ...result.campaigns] : result.campaigns);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
      if (!append) setCampaigns([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query]);

  useEffect(() => {
    loadCampaigns(0, false);
  }, [loadCampaigns]);

  const refreshVisibleCampaigns = useCallback(async () => {
    const desiredCount = Math.max(campaigns.length, PAGE_SIZE);
    const refreshed: CampaignDirectoryItem[] = [];
    let offset = 0;
    let refreshedTotal = 0;

    try {
      while (offset < desiredCount) {
        const pageLimit = Math.min(48, desiredCount - offset);
        const result = await api.getCampaignDirectory(query, pageLimit, offset);
        refreshed.push(...result.campaigns);
        refreshedTotal = result.total;

        if (result.campaigns.length < pageLimit) break;
        offset += result.campaigns.length;
      }

      setCampaigns(refreshed);
      setTotal(refreshedTotal);
    } catch {
      // Keep the last successful snapshot; the next refresh will retry.
    }
  }, [campaigns.length, query]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshVisibleCampaigns();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [refreshVisibleCampaigns]);

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <section
        className="relative overflow-hidden px-5 py-14 text-white"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 60%, #360000 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1100px] text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            Community directory
          </p>
          <h1
            className="text-4xl font-normal tracking-wide text-white sm:text-5xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Find a Khatam Campaign
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Discover public campaigns, see how many khatams are underway, and join the next open round.
          </p>

          <form
            onSubmit={event => {
              event.preventDefault();
              setQuery(input.trim());
            }}
            className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/10 backdrop-blur"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3">
              <Search size={17} className="shrink-0 text-[#8B0000]" />
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Search Qalam, DarusSalam, a family name, or slug"
                className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#8B0000] transition-colors hover:bg-[#FFF5F5]"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-[1100px] px-5 py-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {query ? `Results for “${query}”` : "Public campaigns"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {total} campaign{total === 1 ? "" : "s"} available
            </p>
          </div>
          {query && (
            <button
              type="button"
              onClick={() => {
                setInput("");
                setQuery("");
              }}
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <BookOpen size={34} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">No public campaigns found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Try a different name or use the exact private link shared by the organizer.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(campaign => {
                const surahGoals = (campaign.goals ?? []).filter(
                  goal => goal.is_enabled && goal.goal_type === "surah_recitation",
                );
                const completionPct = campaign.goal > 0
                  ? Math.min(100, Math.round((campaign.completed_khatams / campaign.goal) * 100))
                  : 0;

                return (
                  <Link
                    key={`${campaign.slug}-${campaign.campaign_name}`}
                    to={`/k/${campaign.slug}`}
                    className="group flex min-h-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8B0000]/30 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5F5] text-[#8B0000]">
                        <BookOpen size={19} />
                      </div>
                      {campaign.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                          <Sparkles size={10} />
                          Featured
                        </span>
                      )}
                    </div>

                    <h3
                      className="mt-4 text-xl font-semibold leading-tight text-gray-900 transition-colors group-hover:text-[#8B0000]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {campaign.campaign_name}
                    </h3>
                    {campaign.description && (
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                        {campaign.description}
                      </p>
                    )}

                    {surahGoals.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {surahGoals.slice(0, 3).map(goal => (
                          <span key={goal.id} className="rounded-full bg-[#FFF5F5] px-2.5 py-1 text-[10px] font-medium text-[#8B0000]">
                            {getSurahName(goal.surah_number)} · {goal.completed}/{goal.target}
                          </span>
                        ))}
                        {surahGoals.length > 3 && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-500">+{surahGoals.length - 3} more</span>}
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-amber-50 px-2 py-2.5 text-center">
                        <Clock3 size={13} className="mx-auto text-amber-700" />
                        <p className="mt-1 text-lg font-bold leading-none text-amber-800">{campaign.in_progress_khatams}</p>
                        <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-amber-700/70">In progress</p>
                      </div>
                      <div className="rounded-xl bg-green-50 px-2 py-2.5 text-center">
                        <CheckCircle2 size={13} className="mx-auto text-green-700" />
                        <p className="mt-1 text-lg font-bold leading-none text-green-800">{campaign.completed_khatams}</p>
                        <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-green-700/70">Complete</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>{campaign.completed_khatams} of {campaign.goal} Khatams complete</span>
                        <span>{completionPct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-[#8B0000] to-[#B71C1C]"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="truncate text-gray-500">
                          Next: {campaign.active_round_name}
                        </span>
                        <span className="ml-3 inline-flex shrink-0 items-center gap-1 font-semibold text-[#8B0000]">
                          Open <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {campaigns.length < total && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadCampaigns(campaigns.length, true)}
                  className="rounded-full border-2 border-[#8B0000] bg-white px-6 py-2.5 text-sm font-semibold text-[#8B0000] transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more campaigns"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
