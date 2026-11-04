import { useMemo } from "react";
import type { Slot } from "@/lib/types";
import { Q_SHORT } from "@/lib/constants";
import { timeAgo } from "@/lib/helpers";
import { statusFill } from "./format";

export function TopReaders({ slots, limit = 8 }: { slots: Slot[]; limit?: number }) {
  const readers = useMemo(() => {
    const counts: Record<string, { completed: number; reading: number }> = {};
    for (const s of slots) {
      if (!s.by || s.status === "av") continue;
      counts[s.by] ??= { completed: 0, reading: 0 };
      if (s.status === "dn") counts[s.by].completed++;
      else counts[s.by].reading++;
    }
    return Object.entries(counts)
      .map(([name, c]) => ({ name, ...c }))
      .sort((a, b) => b.completed - a.completed || b.reading - a.reading || a.name.localeCompare(b.name));
  }, [slots]);

  if (readers.length === 0) {
    return <p className="py-2 text-sm text-stone-500">Nobody has claimed a quarter in this khatam yet.</p>;
  }

  return (
    <>
      <ol className="divide-y divide-stone-100">
        {readers.slice(0, limit).map((r, i) => (
          <li key={r.name} className="flex items-center gap-3 py-2.5">
            <span className="w-5 shrink-0 text-right text-sm tabular-nums text-stone-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{r.name}</span>
            <span className="shrink-0 text-right text-sm text-stone-500">
              {(r.completed > 0 || r.reading === 0) && (
                <><span className="font-semibold tabular-nums text-stone-900">{r.completed}</span> done</>
              )}
              {r.reading > 0 && <span className="ml-2 tabular-nums">{r.reading} claimed</span>}
            </span>
          </li>
        ))}
      </ol>
      {readers.length > limit && (
        <p className="mt-2 text-xs text-stone-500">and {readers.length - limit} more</p>
      )}
    </>
  );
}

interface ActivityGroup {
  key: string;
  by: string | null;
  juz: number;
  status: Slot["status"];
  quarters: number[];
  time: string;
}

const GROUP_WINDOW_MS = 30 * 60 * 1000;

/** Newest first; one person claiming or finishing several quarters of the same Juz together becomes one line. */
function groupActivity(slots: Slot[], limit: number): ActivityGroup[] {
  const events = slots
    .filter(s => s.status !== "av" && (s.done_at || s.at))
    .map(s => ({ slot: s, time: (s.status === "dn" ? s.done_at || s.at : s.at) as string }))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const groups: ActivityGroup[] = [];
  for (const { slot, time } of events) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.by === slot.by &&
      last.juz === slot.juz &&
      last.status === slot.status &&
      new Date(last.time).getTime() - new Date(time).getTime() < GROUP_WINDOW_MS
    ) {
      last.quarters.push(slot.q);
      continue;
    }
    if (groups.length === limit) break;
    groups.push({ key: `${slot.juz}-${slot.q}`, by: slot.by, juz: slot.juz, status: slot.status, quarters: [slot.q], time });
  }
  return groups;
}

function describeQuarters(juz: number, quarters: number[]) {
  if (quarters.length === 4) return `all of Juz ${juz}`;
  const qs = [...quarters].sort((a, b) => a - b).map(q => Q_SHORT[q - 1]);
  return `Juz ${juz} · ${qs.join(", ")}`;
}

/** Re-renders with its parent, so relative times stay fresh when the parent ticks. */
export function RecentActivity({ slots, limit = 8 }: { slots: Slot[]; limit?: number }) {
  const items = useMemo(() => groupActivity(slots, limit), [slots, limit]);

  if (items.length === 0) {
    return <p className="py-2 text-sm text-stone-500">Claims and completions will show up here as they happen.</p>;
  }

  return (
    <ul className="divide-y divide-stone-100">
      {items.map(g => (
        <li key={g.key} className="flex items-start gap-3 py-2.5">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: statusFill(g.status) }} />
          <p className="min-w-0 flex-1 text-sm text-stone-600">
            <span className="font-medium text-stone-900">{g.by || "Someone"}</span>{" "}
            {g.status === "dn" ? "completed" : "claimed"}{" "}
            <span className="whitespace-nowrap">{describeQuarters(g.juz, g.quarters)}</span>
          </p>
          <time dateTime={g.time} className="shrink-0 pt-px text-xs tabular-nums text-stone-500">
            {timeAgo(g.time)}
          </time>
        </li>
      ))}
    </ul>
  );
}
