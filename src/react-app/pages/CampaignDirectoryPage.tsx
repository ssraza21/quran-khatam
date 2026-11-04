import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api, type CampaignDirectoryItem } from "@/lib/api";
import { getSurahName } from "@/lib/surahs";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";

const PAGE_SIZE = 24;

/** Pull a campaign slug out of a pasted link like https://qurankhatam.com/k/my-khatam/tracker. */
function slugFromLink(input: string): string | null {
  const match = input.trim().match(/\/k\/([a-z0-9][a-z0-9-]*[a-z0-9])/i);
  return match ? match[1].toLowerCase() : null;
}

function looksLikeSlug(input: string) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(input.trim());
}

function CampaignCard({ campaign }: { campaign: CampaignDirectoryItem }) {
  const surahGoals = (campaign.goals ?? []).filter(
    goal => goal.is_enabled && goal.goal_type === "surah_recitation",
  );
  const goal = Math.max(campaign.goal, 1);
  const pct = Math.min(100, Math.round((campaign.completed_khatams / goal) * 100));
  const single = goal === 1;

  let status: string;
  if (single) {
    status = campaign.completed_khatams > 0 ? "Completed" : campaign.in_progress_khatams > 0 ? "In progress" : "Not started yet";
  } else {
    status = `${campaign.completed_khatams.toLocaleString()} of ${goal.toLocaleString()} khatams complete`;
  }

  return (
    <Link
      to={`/k/${campaign.slug}`}
      className={cn(ui.card, "group flex min-w-0 flex-col p-4 transition-colors hover:border-stone-300 sm:p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-[17px] font-semibold leading-snug text-stone-900 group-hover:text-primary">
          {campaign.campaign_name}
        </h3>
        {campaign.is_featured && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Featured</span>
        )}
      </div>
      {campaign.description && (
        <p className="mt-1.5 line-clamp-2 break-words text-sm leading-relaxed text-stone-600">{campaign.description}</p>
      )}

      {surahGoals.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          Also reciting {surahGoals.map(g => getSurahName(g.surah_number)).join(", ")}
        </p>
      )}

      <div className="mt-auto pt-4">
        {!single && (
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className={cn("text-stone-600", single && campaign.completed_khatams > 0 && "text-success")}>{status}</span>
          {!single && campaign.in_progress_khatams > 0 && (
            <span className="shrink-0 text-xs text-stone-500">{campaign.in_progress_khatams} in progress</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CampaignDirectoryPage() {
  const navigate = useNavigate();
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

      // Nothing public matched — the search might be the exact link name of a private khatam.
      if (!append && query && result.total === 0 && looksLikeSlug(query)) {
        try {
          const slug = query.toLowerCase();
          await api.getKhatam(slug);
          navigate(`/k/${slug}`);
        } catch {
          // Not a slug either; show the empty state.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load khatams. Please try again.");
      if (!append) setCampaigns([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, navigate]);

  useEffect(() => {
    loadCampaigns(0, false);
  }, [loadCampaigns]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const fromLink = slugFromLink(input);
    if (fromLink) {
      navigate(`/k/${fromLink}`);
      return;
    }
    setQuery(input.trim());
  };

  return (
    <>
      <PageHeader
        title="Find a khatam"
        description="Join a public khatam, or paste a link someone shared with you."
      >
        <form onSubmit={onSubmit} className="mt-5 flex max-w-xl gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search by name or paste a link</span>
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Name or link"
              enterKeyHint="search"
              className={cn(ui.input, "pl-10")}
            />
          </label>
          <button type="submit" className={cn(btn("primary", "md"), "h-auto")}>
            Search
          </button>
        </form>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <p className="text-sm text-stone-600">
            {loading
              ? "Loading…"
              : query
                ? `${total} result${total === 1 ? "" : "s"} for “${query}”`
                : `${total} public khatam${total === 1 ? "" : "s"}`}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => { setInput(""); setQuery(""); }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-xl border border-stone-200 bg-white" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className={cn(ui.card, "px-6 py-12 text-center")}>
            <h2 className="text-base font-semibold text-stone-900">No khatams found</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
              Private khatams don't appear here. Ask the organizer for the link, or start your own.
            </p>
            <Link to="/new" className={cn(btn("secondary", "md"), "mt-5")}>Start a khatam</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(campaign => (
                <CampaignCard key={campaign.slug} campaign={campaign} />
              ))}
            </div>

            {campaigns.length < total && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadCampaigns(campaigns.length, true)}
                  className={btn("secondary", "md")}
                >
                  {loadingMore ? "Loading…" : "Show more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
