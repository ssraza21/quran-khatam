import { useMemo } from "react";
import { Check } from "lucide-react";
import type { Slot, StatusKey } from "@/lib/types";
import { COLORS, JUZ_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { statusFill } from "./format";

const TOTAL_QUARTERS = 120;

/** Stacked bar (completed / in progress / available) with the one status legend used on the page. */
export function QuarterProgress({ done, inProgress }: { done: number; inProgress: number }) {
  const available = Math.max(0, TOTAL_QUARTERS - done - inProgress);
  const parts: { key: StatusKey; value: number; label: string }[] = [
    { key: "dn", value: done, label: COLORS.dn.label },
    { key: "cl", value: inProgress, label: COLORS.cl.label },
    { key: "av", value: available, label: COLORS.av.label },
  ];

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100 sm:h-4"
        role="img"
        aria-label={`${done} done, ${inProgress} claimed, ${available} available out of ${TOTAL_QUARTERS} quarters`}
      >
        {parts.map(p =>
          p.value > 0 ? (
            <div
              key={p.key}
              className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${(p.value / TOTAL_QUARTERS) * 100}%`, background: statusFill(p.key) }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-stone-600">
        {parts.map(p => (
          <li key={p.key} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn("size-3 rounded-sm", p.key === "av" && "ring-1 ring-inset ring-stone-300")}
              style={{ background: statusFill(p.key) }}
            />
            {p.label}
            <span className="font-semibold tabular-nums text-stone-900">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 30 Juz blocks; each block shows its four quarters left to right. */
export function JuzMap({ slots }: { slots: Slot[] }) {
  const juzData = useMemo(() => {
    const byKey = new Map(slots.map(s => [`${s.juz}-${s.q}`, s.status] as const));
    return Array.from({ length: 30 }, (_, i) => {
      const juz = i + 1;
      const quarters = [1, 2, 3, 4].map(q => byKey.get(`${juz}-${q}`) ?? "av") as StatusKey[];
      return {
        juz,
        name: JUZ_NAMES[i],
        quarters,
        done: quarters.filter(s => s === "dn").length,
        reading: quarters.filter(s => s === "cl").length,
      };
    });
  }, [slots]);

  return (
    <ol className="grid grid-cols-5 gap-1.5 min-[380px]:grid-cols-6 sm:grid-cols-10 sm:gap-2">
      {juzData.map(j => {
        const complete = j.done === 4;
        const summary = `Juz ${j.juz} (${j.name}): ${j.done} of 4 quarters done${j.reading ? `, ${j.reading} claimed` : ""}`;
        return (
          <li
            key={j.juz}
            title={summary}
            aria-label={summary}
            className={cn(
              "rounded-lg border px-1.5 pb-1.5 pt-1 sm:px-2 sm:pb-2",
              complete ? "border-success/30 bg-success-light/60" : "border-stone-200 bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={cn("text-xs font-semibold tabular-nums sm:text-sm", complete ? "text-success" : "text-stone-700")}>
                {j.juz}
              </span>
              {complete && <Check size={12} strokeWidth={3} className="text-success" aria-hidden />}
            </div>
            <p dir="rtl" className="hidden truncate font-arabic text-[13px] leading-6 text-stone-500 lg:block">
              {j.name}
            </p>
            <div className="mt-1 grid grid-cols-4 gap-0.5" aria-hidden>
              {j.quarters.map((status, qi) => (
                <span
                  key={qi}
                  className="h-2 rounded-[2px] transition-colors duration-500 motion-reduce:transition-none sm:h-2.5"
                  style={{ background: statusFill(status) }}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
