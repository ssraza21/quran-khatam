import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Globe, type DynamicMarker } from "@/components/ui/globe";
import { api } from "@/lib/api";
import { supabasePublic } from "@/lib/supabase";
import { timeAgo } from "@/lib/helpers";
import { Q_SHORT } from "@/lib/constants";
import type { GlobeData, GlobeCompletion } from "@/lib/types";

// ---------------------------------------------------------------------------
// Demo data — realistic spread of Muslim communities worldwide
// ---------------------------------------------------------------------------

interface DemoSpot {
  lat: number;
  lng: number;
  location: string;
  name: string;
  juz: number;
  q: number;
}

const DEMO_SPOTS: DemoSpot[] = [
  { lat: 40.7128, lng: -74.0060, location: "New York, US", name: "Ahmed", juz: 2, q: 1 },
  { lat: 51.5074, lng: -0.1278, location: "London, UK", name: "Fatima", juz: 7, q: 3 },
  { lat: 21.3891, lng: 39.8579, location: "Mecca, Saudi Arabia", name: "Muhammad", juz: 1, q: 1 },
  { lat: 24.8607, lng: 67.0011, location: "Karachi, Pakistan", name: "Sana", juz: 15, q: 2 },
  { lat: 30.0444, lng: 31.2357, location: "Cairo, Egypt", name: "Noor", juz: 18, q: 4 },
  { lat: 41.8781, lng: -87.6298, location: "Chicago, US", name: "Omar", juz: 5, q: 2 },
  { lat: 3.1390, lng: 101.6869, location: "Kuala Lumpur, Malaysia", name: "Hana", juz: 22, q: 1 },
  { lat: 43.6532, lng: -79.3832, location: "Toronto, Canada", name: "Ibrahim", juz: 29, q: 3 },
  { lat: 41.0082, lng: 28.9784, location: "Istanbul, Turkey", name: "Zainab", juz: 11, q: 4 },
  { lat: 25.2048, lng: 55.2708, location: "Dubai, UAE", name: "Ali", juz: 8, q: 2 },
  { lat: 52.4862, lng: -1.8904, location: "Birmingham, UK", name: "Yusuf", juz: 14, q: 1 },
  { lat: 6.5244, lng: 3.3792, location: "Lagos, Nigeria", name: "Umar", juz: 25, q: 3 },
  { lat: 23.8103, lng: 90.4125, location: "Dhaka, Bangladesh", name: "Ruqayyah", juz: 30, q: 4 },
  { lat: -6.2088, lng: 106.8456, location: "Jakarta, Indonesia", name: "Idris", juz: 17, q: 2 },
  { lat: 34.0522, lng: -118.2437, location: "Los Angeles, US", name: "Maryam", juz: 3, q: 3 },
  { lat: 31.5204, lng: 74.3587, location: "Lahore, Pakistan", name: "Khalid", juz: 20, q: 1 },
  { lat: 33.5731, lng: -7.5898, location: "Casablanca, Morocco", name: "Layla", juz: 9, q: 4 },
  { lat: 48.8566, lng: 2.3522, location: "Paris, France", name: "Khadija", juz: 26, q: 2 },
  { lat: 29.7604, lng: -95.3698, location: "Houston, US", name: "Bilal", juz: 12, q: 3 },
  { lat: -33.8688, lng: 151.2093, location: "Sydney, Australia", name: "Mariam", juz: 4, q: 1 },
  { lat: 24.7136, lng: 46.6753, location: "Riyadh, Saudi Arabia", name: "Dawood", juz: 23, q: 2 },
  { lat: 52.3676, lng: 4.9041, location: "Amsterdam, Netherlands", name: "Hassan", juz: 16, q: 4 },
  { lat: 28.6139, lng: 77.2090, location: "Delhi, India", name: "Amina", juz: 28, q: 1 },
  { lat: -1.2921, lng: 36.8219, location: "Nairobi, Kenya", name: "Tariq", juz: 6, q: 3 },
  { lat: 37.7749, lng: -122.4194, location: "San Francisco, US", name: "Samira", juz: 19, q: 2 },
  { lat: 53.4808, lng: -2.2426, location: "Manchester, UK", name: "Zayd", juz: 24, q: 4 },
  { lat: -37.8136, lng: 144.9631, location: "Melbourne, Australia", name: "Sulayman", juz: 10, q: 1 },
  { lat: 38.9072, lng: -77.0369, location: "Washington DC, US", name: "Rania", juz: 27, q: 3 },
];

const DEMO_INTERVAL_MS = 900;     // how fast new markers appear
const DEMO_RECENT_TTL_MS = 4200;  // how long radiating pulse lasts before settling

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDynamicMarkers(data: GlobeData): DynamicMarker[] {
  if (data.markers.length === 0) return [];
  const maxCount = Math.max(...data.markers.map(m => m.count), 1);
  return data.markers.map(m => ({
    location: [m.lat, m.lng] as [number, number],
    size: 0.04 + (Math.log(m.count + 1) / Math.log(maxCount + 1)) * 0.12,
    isRecent: m.isRecent,
  }));
}

function buildDemoMarkers(
  visibleCount: number,
  recentSet: Set<number>,
  spawnTimes: Map<number, number>,
): DynamicMarker[] {
  return DEMO_SPOTS.slice(0, visibleCount).map((spot, i) => ({
    location: [spot.lat, spot.lng] as [number, number],
    size: 0.07,
    isRecent: recentSet.has(i),
    spawnedAt: spawnTimes.get(i),
  }));
}

function makeDemoCompletions(visibleCount: number): GlobeCompletion[] {
  const now = Date.now();
  return DEMO_SPOTS
    .slice(0, visibleCount)
    .map((spot, i) => ({
      juz: spot.juz,
      q: spot.q,
      khatam_name: "Ramadan 2026 Khatam",
      location: spot.location,
      completed_at: new Date(now - i * DEMO_INTERVAL_MS).toISOString(),
      name: spot.name,
    }))
    .reverse(); // newest first
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = searchParams.has("demo");

  const [data, setData] = useState<GlobeData | null>(null);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  // Demo state
  const [demoVisible, setDemoVisible] = useState(0);
  const [demoRecent, setDemoRecent] = useState<Set<number>>(new Set());
  const [demoSpawnTimes, setDemoSpawnTimes] = useState<Map<number, number>>(() => new Map());
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoRecentTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ---- Live data fetching ----
  const fetchData = useCallback(async () => {
    try {
      const result = await api.getGlobeData();
      setData(result);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDemo) fetchData();
    else setLoading(false);
  }, [isDemo, fetchData]);

  useEffect(() => {
    if (isDemo) return;
    const channel = supabasePublic
      .channel("globe-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "khatam_public", table: "slots" }, () => fetchData())
      .subscribe();
    return () => { supabasePublic.removeChannel(channel); };
  }, [isDemo, fetchData]);

  // ---- Demo animation ----
  const startDemo = useCallback(() => {
    setDemoVisible(0);
    setDemoRecent(new Set());
    setDemoSpawnTimes(new Map());
    // clear any pending timers
    demoRecentTimers.current.forEach(clearTimeout);
    demoRecentTimers.current = [];

    let idx = 0;
    const tick = () => {
      const currentIdx = idx;
      const spawnedAt = Date.now();
      setDemoVisible(currentIdx + 1);
      setDemoRecent(prev => new Set([...prev, currentIdx]));
      setDemoSpawnTimes(prev => new Map(prev).set(currentIdx, spawnedAt));

      const t = setTimeout(() => {
        setDemoRecent(prev => {
          const next = new Set(prev);
          next.delete(currentIdx);
          return next;
        });
        setDemoSpawnTimes(prev => {
          const next = new Map(prev);
          next.delete(currentIdx);
          return next;
        });
      }, DEMO_RECENT_TTL_MS);
      demoRecentTimers.current.push(t);

      idx = (idx + 1) % DEMO_SPOTS.length;
    };

    tick(); // first one immediately
    demoTimerRef.current = setInterval(tick, DEMO_INTERVAL_MS);
  }, []);

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current) { clearInterval(demoTimerRef.current); demoTimerRef.current = null; }
    demoRecentTimers.current.forEach(clearTimeout);
    demoRecentTimers.current = [];
  }, []);

  useEffect(() => {
    if (isDemo) {
      startDemo();
    } else {
      stopDemo();
      setDemoVisible(0);
      setDemoRecent(new Set());
      setDemoSpawnTimes(new Map());
    }
    return stopDemo;
  }, [isDemo, startDemo, stopDemo]);

  // Scroll feed to top on new demo item
  useEffect(() => {
    if (isDemo && feedRef.current) feedRef.current.scrollTop = 0;
  }, [isDemo, demoVisible]);

  // ---- Derived display data ----
  const liveMarkers = data ? buildDynamicMarkers(data) : undefined;
  const demoMarkers = buildDemoMarkers(demoVisible, demoRecent, demoSpawnTimes);
  const dynamicMarkers = isDemo ? demoMarkers : liveMarkers;

  const liveRecent = data?.recent ?? [];
  const demoFeed = makeDemoCompletions(demoVisible);
  const feed = isDemo ? demoFeed : liveRecent;

  const liveEmpty = !loading && (!data || data.total_completions === 0);
  const isEmpty = !isDemo && liveEmpty;

  const totalCompletions = isDemo ? demoVisible : (data?.total_completions ?? 0);
  const totalLocations = isDemo
    ? new Set(DEMO_SPOTS.slice(0, demoVisible).map(s => s.location)).size
    : (data?.total_locations ?? 0);

  const toggleDemo = () => {
    const next = new URLSearchParams(searchParams);
    if (isDemo) next.delete("demo");
    else next.set("demo", "");
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      style={{ background: "linear-gradient(160deg, #1a0000 0%, #3A0000 40%, #5A0000 100%)" }}
      className="min-h-screen text-white"
    >
      {/* Header */}
      <div className="max-w-[1200px] mx-auto px-5 pt-10 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs uppercase tracking-[4px] text-white/40">
                {isDemo ? "Preview" : "Live"}
              </p>
              {isDemo && (
                <span className="text-[10px] font-bold tracking-widest uppercase bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded-full">
                  Demo
                </span>
              )}
            </div>
            <h1
              className="text-3xl md:text-5xl font-normal tracking-wide text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Quran Around the World
            </h1>
            <p className="text-white/50 mt-2 text-sm md:text-base">
              Every glowing dot is a community reading the Quran right now.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDemo}
              className={`text-xs font-medium px-4 py-2 rounded-full border transition-all duration-200 ${isDemo
                  ? "bg-yellow-400/15 border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/25"
                  : "bg-white/8 border-white/20 text-white/60 hover:text-white/90 hover:bg-white/15"
                }`}
            >
              {isDemo ? "⏹ Exit Demo" : "▶ Preview Demo"}
            </button>
            <Link
              to="/"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Stats */}
        {(isDemo || (!loading && data && data.total_completions > 0)) && (
          <div className="mt-6 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isDemo ? "bg-yellow-400" : "bg-yellow-400 animate-pulse"}`}
                style={isDemo ? { animation: "pulse 1s ease-in-out infinite" } : undefined}
              />
              <span className="text-white/70 text-sm">
                <span className="text-white font-semibold text-base tabular-nums">
                  {totalCompletions.toLocaleString()}
                </span>
                {" "}sections completed
              </span>
            </div>
            <div className="text-white/30">·</div>
            <div className="text-white/70 text-sm">
              <span className="text-white font-semibold text-base tabular-nums">{totalLocations}</span>
              {" "}{totalLocations === 1 ? "location" : "locations"} worldwide
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
              dynamicMarkers={isDemo ? dynamicMarkers : (isEmpty ? undefined : dynamicMarkers)}
              autoRotate={true}
            />

            {/* Empty state overlay */}
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 text-center max-w-[300px] mx-auto">
                  <p className="text-white/80 text-sm mb-1">No locations yet</p>
                  <p className="text-white/40 text-xs leading-relaxed mb-3">
                    Add a location when creating your khatam to appear on this globe.
                  </p>
                  <button
                    onClick={toggleDemo}
                    className="text-xs text-yellow-300/80 hover:text-yellow-300 border border-yellow-400/30 px-3 py-1.5 rounded-full transition-colors"
                  >
                    ▶ Preview Demo
                  </button>
                </div>
              </div>
            )}

            {/* Demo start overlay */}
            {isDemo && demoVisible === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/30 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/50 uppercase tracking-[3px]">
                Recent Completions
              </h2>
              {isDemo && (
                <span className="text-xs text-yellow-400/60 tabular-nums">
                  {demoVisible} / {DEMO_SPOTS.length}
                </span>
              )}
            </div>

            {/* Skeleton (live loading) */}
            {loading && !isDemo && (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {/* Feed items */}
            {(isDemo ? demoVisible > 0 : feed.length > 0) && (
              <div
                ref={feedRef}
                className="space-y-2 overflow-y-auto"
                style={{ maxHeight: "min(70vw, 600px)" }}
              >
                {feed.map((item, i) => {
                  const isNewItem = isDemo && i === 0;
                  return (
                    <div
                      key={isDemo ? `${item.location}-${item.juz}-${item.q}` : i}
                      className="bg-white/5 border border-white/8 rounded-xl px-4 py-3"
                      style={{
                        animation: isNewItem
                          ? "feedSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both"
                          : `fadeIn 0.3s ease ${Math.min(i, 8) * 0.04}s both`,
                      }}
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
                          {isDemo && i === 0 ? "just now" : timeAgo(item.completed_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !isDemo && feed.length === 0 && !liveEmpty && (
              <div className="text-white/30 text-sm text-center py-8">
                Completions will appear here in real time.
              </div>
            )}

            {/* CTA */}
            <div className="mt-4 pt-4 border-t border-white/10">
              {isDemo ? (
                <p className="text-yellow-300/50 text-xs mb-3">
                  This is a preview. Real completions will appear when your community reads.
                </p>
              ) : (
                <p className="text-white/40 text-xs mb-3">
                  Start your own khatam and add your location to appear on this globe.
                </p>
              )}
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

      {/* Branding watermark for demo screenshots */}
      {isDemo && (
        <div className="fixed bottom-5 right-5 text-white/20 text-xs tracking-widest uppercase pointer-events-none">
          qurankhatam.com
        </div>
      )}

      <style>{`
        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
