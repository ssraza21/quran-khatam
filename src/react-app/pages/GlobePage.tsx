import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Globe, type DynamicMarker } from "@/components/ui/globe";
import PageHeader from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/helpers";
import { supabasePublic } from "@/lib/supabase";
import { Q_SHORT } from "@/lib/constants";
import { ui, btn } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { GlobeData, GlobeCompletion } from "@/lib/types";

// ---------------------------------------------------------------------------
// Sample data for the ?demo preview — a realistic spread of communities
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
const DEMO_RECENT_TTL_MS = 4200;  // how long the radiating pulse lasts before settling
const MOBILE_FEED_LIMIT = 6;
const GROUP_WINDOW_MS = 30 * 60 * 1000;

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
      completed_at: new Date(now - (visibleCount - 1 - i) * DEMO_INTERVAL_MS).toISOString(),
      name: spot.name,
    }))
    .reverse(); // newest first
}

interface FeedGroup {
  key: string;
  name: string | null;
  location: string;
  juz: number;
  quarters: number[];
  completedAt: string;
}

/** One reader finishing several quarters of the same Juz in one sitting becomes one line. */
function groupFeed(items: GlobeCompletion[]): FeedGroup[] {
  const groups: FeedGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.name === item.name &&
      last.location === item.location &&
      last.juz === item.juz &&
      Math.abs(new Date(last.completedAt).getTime() - new Date(item.completed_at).getTime()) < GROUP_WINDOW_MS
    ) {
      last.quarters.push(item.q);
      continue;
    }
    groups.push({
      key: `${item.location}-${item.juz}-${item.q}-${item.completed_at}`,
      name: item.name,
      location: item.location,
      juz: item.juz,
      quarters: [item.q],
      completedAt: item.completed_at,
    });
  }
  return groups;
}

function describeQuarters(juz: number, quarters: number[]) {
  if (quarters.length === 4) return `all of Juz ${juz}`;
  return `Juz ${juz} · ${[...quarters].sort((a, b) => a - b).map(q => Q_SHORT[q - 1]).join(", ")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = searchParams.has("demo");

  const [data, setData] = useState<GlobeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [, setTick] = useState(0); // re-render so relative times stay fresh
  const feedRef = useRef<HTMLOListElement>(null);

  // Demo state
  const [demoVisible, setDemoVisible] = useState(0);
  const [demoRecent, setDemoRecent] = useState<Set<number>>(new Set());
  const [demoSpawnTimes, setDemoSpawnTimes] = useState<Map<number, number>>(() => new Map());
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoRecentTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ---- Live data ----
  const fetchData = useCallback(async () => {
    try {
      const result = await api.getGlobeData();
      setData(result);
    } catch {
      // Keep whatever we had; the empty state covers a first-load failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDemo) void fetchData();
    else setLoading(false);
  }, [isDemo, fetchData]);

  useEffect(() => {
    if (isDemo) return;
    const channel = supabasePublic
      .channel("globe-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "khatam_public", table: "slots" }, () => void fetchData())
      .subscribe();
    return () => { void supabasePublic.removeChannel(channel); };
  }, [isDemo, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ---- Demo animation ----
  const startDemo = useCallback(() => {
    setDemoVisible(0);
    setDemoRecent(new Set());
    setDemoSpawnTimes(new Map());
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

    tick();
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

  // Keep the newest demo item in view
  useEffect(() => {
    if (isDemo && feedRef.current) feedRef.current.scrollTop = 0;
  }, [isDemo, demoVisible]);

  // ---- Derived display data ----
  const liveMarkers = useMemo(() => (data ? buildDynamicMarkers(data) : undefined), [data]);
  const demoMarkers = useMemo(
    () => buildDemoMarkers(demoVisible, demoRecent, demoSpawnTimes),
    [demoVisible, demoRecent, demoSpawnTimes],
  );

  const feed = useMemo(
    () => groupFeed(isDemo ? makeDemoCompletions(demoVisible) : data?.recent ?? []),
    [isDemo, demoVisible, data],
  );

  const isEmpty = !isDemo && !loading && (!data || data.total_completions === 0);
  const dynamicMarkers = isDemo ? demoMarkers : isEmpty ? undefined : liveMarkers;

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

  const stats = [
    { label: "Quarters completed", value: totalCompletions },
    { label: totalLocations === 1 ? "Location" : "Locations", value: totalLocations },
  ];

  return (
    <>
      <PageHeader
        title="World map"
        description="Where people are finishing Quran quarters. Khatams appear here once their organiser adds a location."
        actions={
          <button type="button" onClick={toggleDemo} className={btn("secondary", "sm")}>
            {isDemo ? "Back to live data" : "Preview with sample data"}
          </button>
        }
      >
        <dl className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          {stats.map(s => (
            <div key={s.label}>
              <dt className="text-sm text-stone-500">{s.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums text-stone-900">
                {loading && !isDemo ? "–" : s.value.toLocaleString()}
              </dd>
            </div>
          ))}
          {isDemo && (
            <p className="mb-1 rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-[#8a5a00]">
              Showing sample data
            </p>
          )}
        </dl>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl items-start gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        {/* Globe */}
        <div className={cn(ui.card, "overflow-hidden p-4 sm:p-6")}>
          <div className="relative mx-auto -my-3 aspect-square w-full max-w-[300px] sm:-my-6 sm:max-w-[440px] lg:max-w-[540px]">
            <Globe className="relative" dynamicMarkers={dynamicMarkers} autoRotate />
            {isEmpty && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <p className="pointer-events-auto max-w-[260px] rounded-lg border border-stone-200 bg-white/95 px-4 py-3 text-center text-sm text-stone-600">
                  No khatams with a location have completed a quarter yet.
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">Bigger dots mean more completed quarters; new ones pulse. Drag to turn the globe.</p>
        </div>

        {/* Recent completions */}
        <section aria-labelledby="recent-completions" className={cn(ui.card, "p-4 sm:p-6")}>
          <h2 id="recent-completions" className="text-base font-semibold text-stone-900">Recent completions</h2>

          {loading && !isDemo ? (
            <div className="mt-3 space-y-3" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-10 rounded-md bg-stone-100" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Completions will appear here as they happen.</p>
          ) : (
            <>
              <ol ref={feedRef} className="mt-1 divide-y divide-stone-100 lg:max-h-[520px] lg:overflow-y-auto">
                {feed.map((item, i) => (
                  <li
                    key={item.key}
                    className={cn("flex items-start gap-3 py-3", !showAll && i >= MOBILE_FEED_LIMIT && "hidden lg:flex")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-600">
                        <span className="font-medium text-stone-900">{item.name || "Someone"}</span> completed{" "}
                        <span className="whitespace-nowrap">{describeQuarters(item.juz, item.quarters)}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{item.location}</span>
                      </p>
                    </div>
                    <time dateTime={item.completedAt} className="shrink-0 pt-px text-xs tabular-nums text-stone-500">
                      {timeAgo(item.completedAt)}
                    </time>
                  </li>
                ))}
              </ol>
              {!showAll && feed.length > MOBILE_FEED_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={cn(btn("ghost", "sm"), "-ml-3 mt-1 lg:hidden")}
                >
                  Show {feed.length - MOBILE_FEED_LIMIT} more
                </button>
              )}
            </>
          )}

          <div className="mt-4 border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-600">Want your community on the map? Add a location when you start a khatam.</p>
            <Link to="/new" className={cn(btn("primary", "sm"), "mt-3")}>Start a khatam</Link>
          </div>
        </section>
      </div>
    </>
  );
}
