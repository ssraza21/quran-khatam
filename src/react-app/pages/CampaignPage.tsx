import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { CampaignPublic } from "@/lib/types";
import CreateKhatamDrawer from "@/components/khatam/CreateKhatamDrawer";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignPublic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.getCampaign(slug)
      .then(setCampaign)
      .catch(() => setError("Campaign not found."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading campaign...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || "Campaign not found."}</p>
        <button onClick={() => navigate("/")} className="text-sm text-[#8B0000] hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  const { stats } = campaign;

  return (
    <>
      {/* Hero */}
      <section
        className="text-white px-5 py-14 md:py-20"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #052e16 100%)" }}
      >
        <div className="max-w-[900px] mx-auto">
          <p className="text-xs uppercase tracking-[4px] text-green-300 font-medium mb-3">Campaign</p>
          <h1 className="text-4xl md:text-5xl text-white mb-4 font-normal" style={{ fontFamily: "'Playfair Display', serif" }}>
            {campaign.name}
          </h1>
          <p className="text-green-100/80 text-base leading-relaxed max-w-[640px] mb-8">
            {campaign.description}
          </p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            Start a Khatam for This Campaign
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100 px-5 py-8">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2C2C2C]">{stats.total_khatams}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Khatams Started</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2E7D32]">{stats.completed_khatams}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2C2C2C]">{stats.slots_done.toLocaleString()}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Portions Done</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8B0000]">{stats.pct}%</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Overall Progress</div>
            </div>
          </div>

          {stats.total_slots > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{stats.slots_done.toLocaleString()} of {stats.total_slots.toLocaleString()} total portions complete</span>
                <span>{stats.pct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2E7D32] rounded-full transition-all duration-700"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Khatam List */}
      <section className="px-5 py-12 bg-[#FAFAFA]">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
              Khatams in this Campaign
            </h2>
            <button
              onClick={() => setDrawerOpen(true)}
              className="bg-[#8B0000] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#6B0000] transition-colors"
            >
              + Add Yours
            </button>
          </div>

          {campaign.khatams.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-400 mb-4">No khatams yet. Be the first to join this campaign.</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="bg-[#8B0000] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#6B0000] transition-colors"
              >
                Start a Khatam
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campaign.khatams.map(k => {
                const isComplete = !!k.completed_at;
                return (
                  <Link
                    key={k.id}
                    to={`/k/${k.slug}`}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-medium text-[#2C2C2C] group-hover:text-[#8B0000] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {k.name}
                        </h3>
                        {(k.location_city || k.location_country) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {[k.location_city, k.location_country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      {isComplete ? (
                        <span className="shrink-0 text-xs bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/20 px-2 py-0.5 rounded-full font-medium">
                          Complete
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs bg-[#FFF5F5] text-[#8B0000] border border-[#8B0000]/20 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">Started {timeAgo(k.created_at)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="text-white text-center px-5 py-16"
        style={{ background: "linear-gradient(135deg, #14532d, #052e16)" }}
      >
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-3xl md:text-4xl text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Join the Campaign
          </h2>
          <p className="text-green-100/70 mb-8 text-base leading-relaxed">
            Create your own khatam and add it to this campaign. Every Quran completed is a prayer answered.
          </p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            Start a Khatam
          </button>
        </div>
      </section>

      <CreateKhatamDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        campaignSlug={campaign.slug}
        campaignName={campaign.name}
      />
    </>
  );
}
