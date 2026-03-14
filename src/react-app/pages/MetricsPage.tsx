import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Slot, StatusKey } from "@/lib/types";
import { JUZ_NAMES, COLORS } from "@/lib/constants";
import { makeDummySlots } from "@/lib/helpers";

function CircularProgress({ value, size = 200, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={radius}
        stroke="url(#progressGradient)" strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out" />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function MetricsPage() {
  const [slots, setSlots] = useState<Slot[]>(makeDummySlots);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-refresh time display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate live updates (in production, this would poll an API)
  useEffect(() => {
    const interval = setInterval(() => setSlots(makeDummySlots()), 30000);
    return () => clearInterval(interval);
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
      return { juz, done: jDone, prog: jProg, total: 4, name: JUZ_NAMES[i] };
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

  const juzStatusColor = (d: number) => {
    if (d === 4) return "#2E7D32";
    if (d >= 2) return "#66BB6A";
    if (d >= 1) return "#F9A825";
    return "rgba(255,255,255,0.08)";
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/50 hover:text-white transition-colors no-underline text-sm">
            &larr; Back
          </Link>
          <div className="w-px h-5 bg-white/20" />
          <h1 className="text-lg font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
            Live Metrics Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-white/40 font-mono">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-6">

          {/* Center: Circular Progress */}
          <div className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
            <p className="text-sm text-white/40 uppercase tracking-widest mb-6 font-medium">Overall Progress</p>
            <div className="relative">
              <CircularProgress value={pct} size={220} stroke={14} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {pct}
                </span>
                <span className="text-sm text-white/40 -mt-1">percent</span>
              </div>
            </div>
            <p className="text-sm text-white/30 mt-6" style={{ fontFamily: "'Amiri', serif", fontSize: 18 }}>
              &#1576;&#1587;&#1605; &#1575;&#1604;&#1604;&#1607;
            </p>
          </div>

          {/* Right: Stat Cards */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-3 gap-5">
            {[
              { label: "Completed", val: done, sub: `of 120 quarters`, color: "#66BB6A", icon: "&#10003;" },
              { label: "In Progress", val: prog, sub: `being recited`, color: "#FFB74D", icon: "&#9678;" },
              { label: "Remaining", val: rem, sub: `waiting for readers`, color: "#90CAF9", icon: "&#9675;" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-medium">{s.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl lg:text-6xl font-bold" style={{ color: s.color, fontFamily: "'Playfair Display', serif" }}>
                      {s.val}
                    </span>
                    <span className="text-lg" style={{ color: s.color }} dangerouslySetInnerHTML={{ __html: s.icon }} />
                  </div>
                </div>
                <p className="text-xs text-white/30 mt-3">{s.sub}</p>
              </div>
            ))}

            {/* Juz Heatmap */}
            <div className="col-span-3 bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-4 font-medium">Juz Completion Map</p>
              <div className="grid grid-cols-10 gap-2">
                {juzData.map(j => (
                  <div key={j.juz} className="group relative">
                    <div
                      className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 cursor-default"
                      style={{ background: juzStatusColor(j.done), color: j.done > 0 ? "white" : "rgba(255,255,255,0.3)" }}
                    >
                      {j.juz}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <span className="font-semibold">Juz {j.juz}</span>
                      <span className="text-white/50 ml-1" style={{ fontFamily: "'Amiri', serif" }}>{j.name}</span>
                      <span className="text-white/70 ml-2">{j.done}/4</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-[10px] text-white/30">0/4</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#F9A825" }} />
                  <span className="text-[10px] text-white/30">1/4</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#66BB6A" }} />
                  <span className="text-[10px] text-white/30">2-3/4</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#2E7D32" }} />
                  <span className="text-[10px] text-white/30">4/4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Left: Leaderboard */}
          <div className="col-span-12 lg:col-span-6 bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-5 font-medium">Top Participants</p>
            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-500/20 text-amber-400" :
                    i === 1 ? "bg-gray-400/20 text-gray-300" :
                    i === 2 ? "bg-orange-600/20 text-orange-400" :
                    "bg-white/5 text-white/30"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white/80">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-green-400">{p.completed}</span>
                    <span className="text-[10px] text-white/20">done</span>
                    {p.inProgress > 0 && (
                      <>
                        <span className="text-sm font-medium text-amber-400">{p.inProgress}</span>
                        <span className="text-[10px] text-white/20">active</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Right: Recent Activity */}
          <div className="col-span-12 lg:col-span-6 bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-5 font-medium">Recent Activity</p>
            <div className="space-y-2">
              {recentActivity.map((s, i) => {
                const isComplete = s.status === "dn";
                const time = s.done_at || s.at;
                const mins = time ? Math.floor((Date.now() - new Date(time).getTime()) / 60000) : 0;
                const timeStr = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

                return (
                  <div key={`${s.juz}-${s.q}-${i}`}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${isComplete ? "bg-green-400" : "bg-amber-400"}`} />
                    <div className="flex-1">
                      <span className="text-sm text-white/70">
                        <span className="font-medium text-white/90">{s.by}</span>
                        {" "}{isComplete ? "completed" : "claimed"}{" "}
                        <span className="text-white/50">Juz {s.juz} Q{s.q}</span>
                      </span>
                    </div>
                    <span className="text-xs text-white/25 font-mono">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Bar (full width) */}
          <div className="col-span-12 bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Quarter-by-Quarter Progress</p>
              <p className="text-sm text-white/40">{done} / 120</p>
            </div>
            <div className="flex gap-[2px]">
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="h-4 flex-1 first:rounded-l-md last:rounded-r-md transition-colors"
                  style={{
                    background: s.status === "dn" ? "#2E7D32" : s.status === "cl" ? "#F9A825" : "rgba(255,255,255,0.06)",
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
