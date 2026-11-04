import { useState } from "react";
import { SURAHS, getSurahName } from "@/lib/surahs";
import type { CampaignGoal } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { AdminSection, AdminSwitch } from "@/components/khatam/AdminSection";

interface SurahGoalsAdminProps {
  goals: CampaignGoal[];
  onSave: (options: {
    goalId?: number;
    surahNumber: number;
    target: number;
    isEnabled?: boolean;
  }) => Promise<boolean>;
  onSetEnabled: (goalId: number, isEnabled: boolean) => Promise<boolean>;
}

function GoalProgress({ completed, target }: { completed: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ExistingSurahGoal({
  goal,
  onSave,
  onSetEnabled,
}: {
  goal: CampaignGoal;
  onSave: SurahGoalsAdminProps["onSave"];
  onSetEnabled: SurahGoalsAdminProps["onSetEnabled"];
}) {
  const [target, setTarget] = useState(String(goal.target));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const targetNum = Number(target);
  const tooLow = Number.isInteger(targetNum) && targetNum < goal.pledged;
  const canSave = !saving && Number.isInteger(targetNum) && targetNum >= Math.max(1, goal.pledged)
    && targetNum <= 1000000 && targetNum !== goal.target;
  const inputId = `surah-goal-target-${goal.id}`;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <AdminSwitch
        label={`Surah ${getSurahName(goal.surah_number)}`}
        hint={`${goal.completed.toLocaleString()} recited · ${goal.in_progress.toLocaleString()} pledged · ${goal.contributor_count} ${goal.contributor_count === 1 ? "person" : "people"}${goal.is_enabled ? "" : " · archived"}`}
        checked={goal.is_enabled}
        disabled={toggling}
        onChange={async next => {
          setToggling(true);
          await onSetEnabled(goal.id, next);
          setToggling(false);
        }}
      />
      <GoalProgress completed={goal.completed} target={goal.target} />
      <div className="mt-3 flex items-end gap-2">
        <div className="w-32">
          <label htmlFor={inputId} className={ui.label}>Target</label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={Math.max(1, goal.pledged)}
            max={1000000}
            value={target}
            onChange={e => setTarget(e.target.value)}
            className={ui.input}
          />
        </div>
        {targetNum !== goal.target && (
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              setSaving(true);
              await onSave({ goalId: goal.id, surahNumber: goal.surah_number!, target: targetNum, isEnabled: goal.is_enabled });
              setSaving(false);
            }}
            className={cn(btn("secondary", "md"), "h-[46px] sm:h-[42px]")}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      {tooLow && <p className={cn(ui.error, "mt-1.5")}>Can't be lower than the {goal.pledged.toLocaleString()} already pledged.</p>}
    </li>
  );
}

export default function SurahGoalsAdmin({ goals, onSave, onSetEnabled }: SurahGoalsAdminProps) {
  const quranGoal = goals.find(goal => goal.goal_type === "quran_khatam");
  const surahGoals = goals.filter(goal => goal.goal_type === "surah_recitation");
  const usedSurahs = new Set(surahGoals.map(goal => goal.surah_number));
  const [adding, setAdding] = useState(false);
  const [surahNumber, setSurahNumber] = useState(() => (usedSurahs.has(36) ? SURAHS.find(s => !usedSurahs.has(s.number))?.number ?? 1 : 36));
  const [target, setTarget] = useState("100");
  const [creating, setCreating] = useState(false);
  const targetNum = Number(target);
  const canCreate = !creating && !usedSurahs.has(surahNumber) && Number.isInteger(targetNum) && targetNum >= 1 && targetNum <= 1000000;

  return (
    <AdminSection
      title="Goals"
      description="What this campaign works toward. Turn a goal off to archive it and hide it from readers."
    >
      <ul className="divide-y divide-stone-100">
        {quranGoal && (
          <li className="pb-4 last:pb-0">
            <AdminSwitch
              label="Complete Quran Khatams"
              hint={`${quranGoal.completed.toLocaleString()} of ${quranGoal.target.toLocaleString()} complete${quranGoal.is_enabled ? "" : " · archived, no new claims"}`}
              checked={quranGoal.is_enabled}
              onChange={next => onSetEnabled(quranGoal.id, next)}
            />
            <GoalProgress completed={quranGoal.completed} target={quranGoal.target} />
          </li>
        )}
        {surahGoals.map(goal => (
          <ExistingSurahGoal key={goal.id} goal={goal} onSave={onSave} onSetEnabled={onSetEnabled} />
        ))}
      </ul>

      <div className="mt-4 border-t border-stone-200 pt-4">
        {!adding ? (
          <button type="button" className={btn("secondary", "md")} onClick={() => setAdding(true)}>
            Add a Surah goal
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-800">New Surah goal</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div>
                <label htmlFor="new-surah-goal-surah" className={ui.label}>Surah</label>
                <select
                  id="new-surah-goal-surah"
                  value={surahNumber}
                  onChange={e => setSurahNumber(Number(e.target.value))}
                  className={ui.input}
                >
                  {SURAHS.map(surah => (
                    <option key={surah.number} value={surah.number} disabled={usedSurahs.has(surah.number)}>
                      {surah.number}. {surah.name}{usedSurahs.has(surah.number) ? " (added)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-surah-goal-target" className={ui.label}>Target</label>
                <input
                  id="new-surah-goal-target"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000000}
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  className={ui.input}
                />
              </div>
            </div>
            <p className="text-xs text-stone-500">Readers pledge and log recitations on the campaign page.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={btn("ghost", "md")} onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={btn("primary", "md")}
                disabled={!canCreate}
                onClick={async () => {
                  setCreating(true);
                  const created = await onSave({ surahNumber, target: targetNum, isEnabled: true });
                  setCreating(false);
                  if (created) {
                    const next = SURAHS.find(s => !usedSurahs.has(s.number) && s.number !== surahNumber);
                    if (next) setSurahNumber(next.number);
                    setTarget("100");
                    setAdding(false);
                  }
                }}
              >
                {creating ? "Adding…" : "Add goal"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminSection>
  );
}
