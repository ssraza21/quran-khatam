import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Globe, type DynamicMarker } from "@/components/ui/globe";
import { api } from "@/lib/api";
import { supabasePublic } from "@/lib/supabase";
import { timeAgo } from "@/lib/helpers";
import { Q_SHORT } from "@/lib/constants";
import type { GlobeData } from "@/lib/types";

function buildDynamicMarkers(data: GlobeData): DynamicMarker[] {
  if (data.markers.length === 0) return [];
  const maxCount = Math.max(...data.markers.map(m => m.count), 1);
  return data.markers.map(m => ({
    location: [m.lat, m.lng] as [number, number],
    size: 0.04 + (Math.log(m.count + 1) / Math.log(maxCount + 1)) * 0.12,
    isRecent: m.isRecent,
  }));
}

export default function GlobePage() {
  const [data, setData] = useState<GlobeData | null>(null);
  const [loading, setLoading] = useState(true);
  const dynamicMarkers = data ? buildDynamicMarkers(data) : undefined;
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getGlobeData();
      setData(result);
    } catch {
      // Silently fail — globe just shows empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: refetch when any slot is completed
  useEffect(() => {
    const channel = supabasePublic
      .channel("globe-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "khatam_public", table: "slots" },
        () => fetchData()
      )
      .subscribe();
    return () => { supabasePublic.removeChannel(channel); };
  }, [fetchData]);

  const isEmpty = !loading && (!data || data.total_completions === 0);

  return (
    <div style={{ background: "linear-gradient(160deg, #1a0000 0%, #3A0000 40%, #5A0000 100%)" }}
      className="min-h-screen text-white">

      {/* Header */}
      <div className="max-w-[1200px] mx-auto px-5 pt-10 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[4px] text-white/40 mb-2">Live</p>
            <h1 className="text-3xl md:text-5xl font-normal tracking-wide text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Quran Around the World
            </h1>
            <p className="text-white/50 mt-2 text-sm md:text-base">
              Every glowing dot is a community reading the Quran right now.
            </p>
          </div>

          <Link
            to="/"
            className="text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
          >
            ← Back to home
          </Link>
        </div>

        {/* Stats */}
        {!loading && data && data.total_completions > 0 && (
          <div className="mt-6 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-white/70 text-sm">
                <span className="text-white font-semibold text-base">{data.total_completions.toLocaleString()}</span>
                {" "}sections completed
              </span>
            </div>
            <div className="text-white/30">·</div>
            <div className="text-white/70 text-sm">
              <span className="text-white font-semibold text-base">{data.total_locations}</span>
              {" "}{data.total_locations === 1 ? "location" : "locations"} worldwide
            </div>
          </div>
        )}
      </div>

      {/* Main content: Globe + Feed */}
      <div className="max-w-[1200px] mx-auto px-5 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* Globe */}
          <div className="relative" style={{ height: "min(70vw, 600px)" }}>
            <Globe
              className="relative w-full h-full"
              dynamicMarkers={isEmpty ? undefined : dynamicMarkers}
              autoRotate={true}
            />

            {/* Empty state overlay */}
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 text-center max-w-[280px] mx-auto">
                  <p className="text-white/80 text-sm leading-relaxed mb-1">
                    No locations yet
                  </p>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Add a location when creating your khatam to appear on this globe.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent completions feed */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-[3px]">
              Recent Completions
            </h2>

            {loading && (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && data && data.recent.length > 0 && (
              <div
                ref={feedRef}
                className="space-y-2 overflow-y-auto"
                style={{ maxHeight: "min(70vw, 600px)" }}
              >
                {data.recent.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl px-4 py-3 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm font-medium truncate">
                          {item.name ? (
                            <>{item.name} <span className="text-white/40 font-normal">completed</span></>
                          ) : (
                            <span className="text-white/50 italic">Someone</span>
                          )}
                          {" "}
                          <span className="text-yellow-300/80">Juz {item.juz} {Q_SHORT[item.q - 1]}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-white/30 text-xs">📍</span>
                          <span className="text-white/50 text-xs truncate">{item.location}</span>
                        </div>
                      </div>
                      <span className="text-white/30 text-xs shrink-0 mt-0.5">
                        {timeAgo(item.completed_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && (!data || data.recent.length === 0) && (
              <div className="text-white/30 text-sm text-center py-8">
                Completions will appear here in real time.
              </div>
            )}

            {/* CTA */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs mb-3">
                Start your own khatam and add your location to appear on this globe.
              </p>
              <Link
                to="/"
                className="inline-block bg-[#8B0000] hover:bg-[#6B0000] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
              >
                Create a Khatam
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
