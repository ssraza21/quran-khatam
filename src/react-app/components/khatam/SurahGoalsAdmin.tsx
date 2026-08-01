import { useState } from "react";
import { BookOpen, CheckCircle2, Plus, Power } from "lucide-react";
import { SURAHS, getSurahName } from "@/lib/surahs";
import type { CampaignGoal } from "@/lib/types";

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

function ExistingSurahGoal({
  goal,
  onSave,
  onSetEnabled,
}: {
  goal: CampaignGoal;
  onSave: SurahGoalsAdminProps["onSave"];
  onSetEnabled: SurahGoalsAdminProps["onSetEnabled"];
}) {
  const [target, setTarget] = useState(goal.target);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;

  return (
    <div className={`rounded-xl border p-4 ${goal.is_enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-[#8B0000]" />
            <h4 className="text-sm font-semibold text-gray-800">Surah {getSurahName(goal.surah_number)}</h4>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {goal.completed.toLocaleString()} complete · {goal.in_progress.toLocaleString()} pledged · {goal.contributor_count} participants
          </p>
        </div>
        <button
          type="button"
          disabled={toggling}
          onClick={async () => {
            setToggling(true);
            await onSetEnabled(goal.id, !goal.is_enabled);
            setToggling(false);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${goal.is_enabled ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-600"}`}
        >
          <Power size={11} /> {goal.is_enabled ? "Enabled" : "Archived"}
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#8B0000]" style={{ width: `${pct}%` }} /></div>
      <div className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Target recitations</span>
          <input type="number" min={1} max={1000000} value={target} onChange={event => setTarget(Number(event.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#8B0000]" />
        </label>
        <button
          type="button"
          disabled={saving || !Number.isInteger(target) || target < goal.pledged || target > 1000000 || target === goal.target}
          onClick={async () => {
            setSaving(true);
            await onSave({ goalId: goal.id, surahNumber: goal.surah_number!, target, isEnabled: goal.is_enabled });
            setSaving(false);
          }}
          className="rounded-xl border border-[#8B0000]/20 bg-[#FFF5F5] px-4 py-2 text-xs font-semibold text-[#8B0000] disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {target < goal.pledged && <p className="mt-1 text-[10px] text-red-600">Target cannot be below {goal.pledged} already pledged.</p>}
    </div>
  );
}

export default function SurahGoalsAdmin({ goals, onSave, onSetEnabled }: SurahGoalsAdminProps) {
  const quranGoal = goals.find(goal => goal.goal_type === "quran_khatam");
  const surahGoals = goals.filter(goal => goal.goal_type === "surah_recitation");
  const [surahNumber, setSurahNumber] = useState(36);
  const [target, setTarget] = useState(100);
  const [creating, setCreating] = useState(false);
  const usedSurahs = new Set(surahGoals.map(goal => goal.surah_number));

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-[#8B0000]" />
        <h3 className="text-sm font-semibold text-gray-800">Campaign goals</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-gray-500">
        Only organizers can add or enable goals. Participants can pledge and complete recitations from the public campaign page.
      </p>

      {quranGoal && (
        <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border p-4 ${quranGoal.is_enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50"}`}>
          <div><p className="text-sm font-semibold text-gray-800">Complete Quran Khatams</p><p className="mt-0.5 text-xs text-gray-400">{quranGoal.completed} of {quranGoal.target} complete</p></div>
          <button
            type="button"
            onClick={() => onSetEnabled(quranGoal.id, !quranGoal.is_enabled)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${quranGoal.is_enabled ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-600"}`}
          >
            <Power size={11} /> {quranGoal.is_enabled ? "Enabled" : "Archived"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {surahGoals.map(goal => <ExistingSurahGoal key={goal.id} goal={goal} onSave={onSave} onSetEnabled={onSetEnabled} />)}
      </div>

      <div className="mt-5 border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2"><Plus size={15} className="text-[#8B0000]" /><h4 className="text-xs font-semibold text-gray-700">Add a Surah goal</h4></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Surah</span>
            <select value={surahNumber} onChange={event => setSurahNumber(Number(event.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#8B0000]">
              {SURAHS.map(surah => <option key={surah.number} value={surah.number} disabled={usedSurahs.has(surah.number)}>{surah.number}. {surah.name}{usedSurahs.has(surah.number) ? " — already added" : ""}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">Target</span>
            <input type="number" min={1} max={1000000} value={target} onChange={event => setTarget(Number(event.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#8B0000]" />
          </label>
          <button
            type="button"
            disabled={creating || usedSurahs.has(surahNumber) || !Number.isInteger(target) || target < 1 || target > 1000000}
            onClick={async () => {
              setCreating(true);
              const created = await onSave({ surahNumber, target, isEnabled: true });
              if (created) {
                const next = SURAHS.find(surah => !usedSurahs.has(surah.number) && surah.number !== surahNumber);
                if (next) setSurahNumber(next.number);
                setTarget(100);
              }
              setCreating(false);
            }}
            className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6B0000] disabled:opacity-40"
          >
            {creating ? "Adding..." : "Add goal"}
          </button>
        </div>
      </div>
    </section>
  );
}
