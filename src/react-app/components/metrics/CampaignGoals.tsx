import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

export interface GoalTileData {
  key: string;
  label: string;
  unit: string;
  completed: number;
  target: number;
  to?: string;
}

function GoalTile({ goal }: { goal: GoalTileData }) {
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;
  const reached = goal.target > 0 && goal.completed >= goal.target;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-stone-700">{goal.label}</p>
        <span className={cn("shrink-0 text-sm font-medium tabular-nums", reached ? "text-success" : "text-stone-600")}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none", reached ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm text-stone-500">
        <p>
          <span className="font-semibold tabular-nums text-stone-900">{goal.completed.toLocaleString()}</span> of{" "}
          {goal.target.toLocaleString()} {goal.unit}
        </p>
        {goal.to && <ChevronRight size={16} className="shrink-0 text-stone-400" aria-hidden />}
      </div>
    </>
  );

  return goal.to ? (
    <Link to={goal.to} className={cn(ui.card, "block p-3.5 transition-colors sm:p-4 hover:border-stone-300 hover:bg-stone-50")}>
      {body}
    </Link>
  ) : (
    <div className={cn(ui.card, "p-3.5 sm:p-4")}>{body}</div>
  );
}

export function CampaignGoals({ goals }: { goals: GoalTileData[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {goals.map(goal => (
        <GoalTile key={goal.key} goal={goal} />
      ))}
    </div>
  );
}
