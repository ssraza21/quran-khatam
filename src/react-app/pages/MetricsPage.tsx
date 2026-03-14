import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import type { Slot, StatusKey } from "@/lib/types";
import { JUZ_NAMES, COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

function CircularProgress({ value, size = 200, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius}
        stroke="#E0E0E0" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={radius}
        stroke="url(#progressGradient)" strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out" />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B0000" />
          <stop offset="100%" stopColor="#B71C1C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type GroupName = "brothers" | "sisters";

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

export default function MetricsPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const groupParam = searchParams.get("group");
  const group: GroupName = groupParam === "sisters" ? "sisters" : "brothers";
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [khatams, setKhatams] = useState<{ id: string | number; khatam_num: number }[]>([]);
  const [selectedKhatamId, setSelectedKhatamId] = useState<string | number | null>(null);

  const khatamNum = khatams.find(k => k.id === selectedKhatamId)?.khatam_num ?? 1;
  const latestKhatamId = khatams.length > 0 ? khatams[khatams.length - 1].id : null;

  const loadKhatams = useCallback(async () => {
    const { data } = await supabase
      .from("khatams")
      .select("id, khatam_num")
      .eq("group_name", group)
      .order("khatam_num", { ascending: true });
    if (data && data.length > 0) {
      const newestKhatamId = data[data.length - 1].id;
      setKhatams(data);
      setSelectedKhatamId(prev => {
        if (prev == null) return newestKhatamId;

        const stillExists = data.some(k => k.id === prev);
        if (!stillExists) return newestKhatamId;

        // Keep following the newest khatam unless the user explicitly switched away.
        return prev === latestKhatamId ? newestKhatamId : prev;
      });
    } else {
      setKhatams([]);
      setSelectedKhatamId(null);
      setSlots([]);
    }
  }, [group, latestKhatamId]);

  const loadSlots = useCallback(async () => {
    if (!selectedKhatamId) return;
    const { data } = await supabase
      .from("slots")
      .select("*")
      .eq("khatam_id", selectedKhatamId)
      .order("juz")
      .order("q");
    if (data) {
      setSlots((data as DbSlot[]).map(dbToSlot));
    }
  }, [selectedKhatamId]);

  useEffect(() => { loadKhatams(); }, [loadKhatams]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Realtime: refresh the khatam list for this group.
  useEffect(() => {
    const channel = supabase
      .channel(`metrics-khatams-${group}`)
      .on("postgres_changes", { event: "*", schema: "qurankhatam", table: "khatams", filter: `group_name=eq.${group}` }, () => {
        loadKhatams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [group, loadKhatams]);

  // Realtime: apply slot changes immediately for the selected khatam.
  useEffect(() => {
    if (!selectedKhatamId) return;

    const channel = supabase
      .channel(`metrics-slots-${selectedKhatamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "qurankhatam", table: "slots", filter: `khatam_id=eq.${selectedKhatamId}` },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as DbSlot;
            setSlots(prev => prev.filter(s => !(s.juz === oldRow.juz && s.q === oldRow.q)));
            return;
          }

          const row = payload.new as DbSlot;
          setSlots(prev => upsertSlot(prev, dbToSlot(row)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedKhatamId]);

  // Auto-refresh time display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const done = slots.filter(s => s.status === "dn").length;
  const prog = slots.filter(s => s.status === "cl").length;
  const rem = 120 - done - prog;
  const pct = Math.round((done / 120) * 100);

  // Juz completion data for heatmap
  const juzData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const juz = i + 1;
      const jSlots = slots.filter(s => s.juz === juz);
      const jDone = jSlots.filter(s => s.status === "dn").length;
      const jProg = jSlots.filter(s => s.status === "cl").length;
      const quarters = [1, 2, 3, 4].map(q => {
        const slot = jSlots.find(s => s.q === q);
        return slot ? slot.status : "av";
      });
      return { juz, done: jDone, prog: jProg, total: 4, name: JUZ_NAMES[i], quarters };
    });
  }, [slots]);

  // Participant leaderboard
  const leaderboard = useMemo(() => {
    const counts: Record<string, { completed: number; inProgress: number }> = {};
    slots.forEach(s => {
      if (s.by) {
        if (!counts[s.by]) counts[s.by] = { completed: 0, inProgress: 0 };
        if (s.status === "dn") counts[s.by].completed++;
        else if (s.status === "cl") counts[s.by].inProgress++;
      }
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.completed - a.completed || b.inProgress - a.inProgress);
  }, [slots]);

  // Recent activity (completed slots, sorted by time)
  const recentActivity = useMemo(() => {
    return slots
      .filter(s => s.done_at || s.at)
      .sort((a, b) => {
        const ta = new Date(a.done_at || a.at || 0).getTime();
        const tb = new Date(b.done_at || b.at || 0).getTime();
        return tb - ta;
      })
      .slice(0, 8);
  }, [slots]);

  const quarterColor = (status: string) => {
    if (status === "dn") return "#43A047";
    if (status === "cl") return "#F9A825";
    return "#EEEEEE";
  };

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Hero Header — matches KhatamPage */}
      <header className="relative overflow-hidden text-white text-center py-10 px-5"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 100%)" }}>
        {/* Islamic geometric pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill-opacity='0.15'/%3E%3Cpath d='M40 10l30 30-30 30L10 40z' fill='none' stroke='%23fff' stroke-opacity='0.1'/%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        <div className="relative max-w-[1200px] mx-auto">
          <h1 className="text-[42px] mb-1 font-normal tracking-widest text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            {group === "brothers" ? "Brothers" : "Sisters"} Live Metrics
          </h1>

          <div className="inline-flex items-center gap-3 bg-white/12 border border-white/20 rounded-full px-5 py-1.5 text-sm font-medium">
            <span>Khatam #{khatamNum}</span>
            <div className="w-px h-3.5 bg-white/30" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs text-white/70">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar — matches KhatamPage style */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-5 py-4">

          {/* Khatam switcher */}
          {khatams.length > 1 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium shrink-0 mr-1">Khatam</span>
              {khatams.map(k => {
                const isSelected = k.id === selectedKhatamId;
                const isLatest = k.id === latestKhatamId;
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKhatamId(k.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                    style={isSelected
                      ? { background: "#8B0000", color: "#fff", boxShadow: "0 1px 4px rgba(139,0,0,0.25)" }
                      : { background: "#F5F5F5", color: "#777" }
                    }
                  >
                    #{k.khatam_num}
                    {isLatest && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? "rgba(255,255,255,0.7)" : "#4CAF50" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: "Completed", val: done, color: "#2E7D32", bg: "#E8F5E9" },
              { label: "In Progress", val: prog, color: "#F57F17", bg: "#FFF8E1" },
              { label: "Remaining", val: rem, color: "#8B0000", bg: "#FFF5F5" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3.5 text-center"
                style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <div className="text-3xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Playfair Display', serif" }}>
                  {s.val}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8B0000, #B71C1C)" }} />
          </div>
          <div className="text-xs text-gray-400 text-right pt-1.5 font-medium">{pct}% complete</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-5 py-8">
        <div className="grid grid-cols-12 gap-5">

          {/* Circular Progress Card */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-[3px] mb-6 font-medium">Overall Progress</p>
            <div className="relative">
              <CircularProgress value={pct} size={200} stroke={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#8B0000" }}>
                  {pct}
                </span>
                <span className="text-xs text-gray-400 mt-4 uppercase tracking-wider">percent</span>
              </div>
            </div>
          </div>

          {/* Juz Completion Heatmap */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-[3px] mb-5 font-medium">Juz Completion Map</p>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {juzData.map(j => (
                <div key={j.juz} className="group relative flex flex-col items-center gap-1">
                  {/* Quarter-fill cell — number lives below, not overlaid */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-default"
                    style={{ border: "1.5px solid #D8D8D8" }}>
                    {/* 1px white cross-hair between quadrants via gap-px + bg-white */}
                    <div className="grid grid-cols-2 w-full h-full gap-px bg-white">
                      {j.quarters.map((status, qi) => (
                        <div
                          key={qi}
                          className="transition-colors duration-500"
                          style={{ background: quarterColor(status) }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold leading-none text-gray-400 tabular-nums">
                    {j.juz}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-1.5 bg-text-heading text-white rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <span className="font-semibold">Juz {j.juz}</span>
                    <span className="text-white/60 ml-1" style={{ fontFamily: "'Amiri', serif" }}>{j.name}</span>
                    <span className="text-white/80 ml-2">{j.done}/4</span>
                    {j.prog > 0 && <span className="text-amber-300 ml-1">({j.prog} active)</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-100">
              {[
                {
                  quarters: ["av", "av", "av", "av"],
                  label: "None",
                },
                {
                  quarters: ["cl", "av", "av", "av"],
                  label: "In progress",
                },
                {
                  quarters: ["dn", "av", "av", "av"],
                  label: "1 done",
                },
                {
                  quarters: ["dn", "dn", "dn", "dn"],
                  label: "Complete",
                },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md overflow-hidden shrink-0"
                    style={{ border: "1.5px solid #D8D8D8" }}>
                    <div className="grid grid-cols-2 w-full h-full gap-px bg-white">
                      {l.quarters.map((s, i) => (
                        <div key={i} style={{ background: quarterColor(s) }} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-[3px] mb-5 font-medium">Top Participants</p>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-300 italic py-6 text-center">No participants yet</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.slice(0, 8).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-gray-100 text-gray-500" :
                        i === 2 ? "bg-orange-100 text-orange-600" :
                          "bg-gray-50 text-gray-400"
                      }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text-heading truncate block">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-success">{p.completed}</span>
                        <span className="text-[10px] text-gray-300">done</span>
                      </div>
                      {p.inProgress > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-warning">{p.inProgress}</span>
                          <span className="text-[10px] text-gray-300">active</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-[3px] mb-5 font-medium">Recent Activity</p>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-300 italic py-6 text-center">No activity yet</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((s, i) => {
                  const isComplete = s.status === "dn";
                  const time = s.done_at || s.at;
                  const mins = time ? Math.floor((Date.now() - new Date(time).getTime()) / 60000) : 0;
                  const timeStr = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

                  return (
                    <div key={`${s.juz}-${s.q}-${i}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? "bg-success" : "bg-warning"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-600">
                          <span className="font-medium text-text-heading">{s.by}</span>
                          {" "}{isComplete ? "completed" : "claimed"}{" "}
                          <span className="text-gray-400">Juz {s.juz} Q{s.q}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-300 font-mono shrink-0">{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quarter-by-Quarter Strip */}
          <div className="col-span-12 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-[3px] font-medium">Quarter-by-Quarter Progress</p>
              <p className="text-sm text-gray-400 font-medium">{done} / 120</p>
            </div>
            <div className="flex gap-[2px]">
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="h-5 flex-1 first:rounded-l-md last:rounded-r-md transition-colors"
                  style={{
                    background: s.status === "dn" ? "#2E7D32" : s.status === "cl" ? "#F9A825" : "#F0F0F0",
                    minWidth: 1,
                  }}
                  title={`Juz ${s.juz} Q${s.q}: ${COLORS[s.status as StatusKey].label}${s.by ? ` (${s.by})` : ""}`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
