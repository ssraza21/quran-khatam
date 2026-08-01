import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BookCopy,
  BookOpen,
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { ParticipantInfo } from "@/lib/api";
import type { CampaignGoal, ParticipationMode } from "@/lib/types";
import SurahGoalsAdmin from "@/components/khatam/SurahGoalsAdmin";

interface CreateKhatamsOptions {
  count: number;
  name?: string;
  namePrefix?: string;
  participationMode: ParticipationMode;
  completed: boolean;
}

interface AdminSettingsPanelProps {
  scope: "campaign" | "khatam";
  participants: ParticipantInfo[];
  claimLimit: number;
  claimLimitInput: number;
  setClaimLimitInput: (n: number) => void;
  campaignName: string;
  campaignDescription: string | null;
  campaignSearchable: boolean;
  campaignGoals: CampaignGoal[];
  currentKhatamCount: number;
  currentKhatamName: string;
  participationMode: ParticipationMode;
  isKhatamComplete: boolean;
  locationCountry: string | null;
  showNamesOnGlobe: boolean;
  onAddParticipant: (name: string) => Promise<void>;
  onRemoveParticipant: (name: string) => Promise<void>;
  onSetParticipantLimit: (name: string, limit: number | null) => Promise<void>;
  onSaveClaimLimit: () => Promise<void>;
  onSaveCampaign: (name: string, description: string, isSearchable: boolean) => Promise<void>;
  onSaveSurahGoal: (options: {
    goalId?: number;
    surahNumber: number;
    target: number;
    isEnabled?: boolean;
  }) => Promise<boolean>;
  onSetCampaignGoalEnabled: (goalId: number, isEnabled: boolean) => Promise<boolean>;
  onCreateKhatams: (options: CreateKhatamsOptions) => Promise<boolean>;
  onRenameKhatam: (name: string) => Promise<void>;
  onSetParticipationMode: (mode: ParticipationMode) => Promise<void>;
  onDuplicateKhatam: () => Promise<void>;
  onCompleteEntireKhatam: () => Promise<void>;
  onToggleGlobeNames: () => Promise<void>;
  onResetAll: () => Promise<void>;
  onDeleteKhatam: () => Promise<void>;
}

function ModeChoices({
  value,
  onChange,
}: {
  value: ParticipationMode;
  onChange: (mode: ParticipationMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("open")}
        aria-pressed={value === "open"}
        className={`rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#8B0000]/30 ${
          value === "open"
            ? "border-[#8B0000] bg-[#FFF5F5] text-[#8B0000]"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        <span className="block text-xs font-semibold">Open participation</span>
        <span className="mt-0.5 block text-[10px] opacity-70">People select portions online</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("group")}
        aria-pressed={value === "group"}
        className={`rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#8B0000]/30 ${
          value === "group"
            ? "border-[#8B0000] bg-[#FFF5F5] text-[#8B0000]"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        <span className="block text-xs font-semibold">Family or institution</span>
        <span className="mt-0.5 block text-[10px] opacity-70">A group owns the whole Khatam</span>
      </button>
    </div>
  );
}

function StatusChoices({
  completed,
  onChange,
}: {
  completed: boolean;
  onChange: (completed: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!completed}
        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
          !completed
            ? "border-[#8B0000] bg-[#FFF5F5] text-[#8B0000]"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        <span className="block text-xs font-semibold">Leave open</span>
        <span className="mt-0.5 block text-[10px] opacity-70">Starts at 0 of 30</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={completed}
        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
          completed
            ? "border-green-700 bg-green-50 text-green-800"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        <span className="block text-xs font-semibold">Mark complete</span>
        <span className="mt-0.5 block text-[10px] opacity-70">Records all 30 Juz done</span>
      </button>
    </div>
  );
}

export default function AdminSettingsPanel({
  scope,
  participants,
  claimLimit,
  claimLimitInput,
  setClaimLimitInput,
  campaignName,
  campaignDescription,
  campaignSearchable,
  campaignGoals,
  currentKhatamCount,
  currentKhatamName,
  participationMode,
  isKhatamComplete,
  locationCountry,
  showNamesOnGlobe,
  onAddParticipant,
  onRemoveParticipant,
  onSetParticipantLimit,
  onSaveClaimLimit,
  onSaveCampaign,
  onSaveSurahGoal,
  onSetCampaignGoalEnabled,
  onCreateKhatams,
  onRenameKhatam,
  onSetParticipationMode,
  onDuplicateKhatam,
  onCompleteEntireKhatam,
  onToggleGlobeNames,
  onResetAll,
  onDeleteKhatam,
}: AdminSettingsPanelProps) {
  const [participantInput, setParticipantInput] = useState("");
  const [limitEdits, setLimitEdits] = useState<Record<string, string>>({});
  const [campaignNameInput, setCampaignNameInput] = useState(campaignName);
  const [descriptionInput, setDescriptionInput] = useState(campaignDescription ?? "");
  const [searchableInput, setSearchableInput] = useState(campaignSearchable);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [khatamNameInput, setKhatamNameInput] = useState(currentKhatamName);
  const [renamingKhatam, setRenamingKhatam] = useState(false);
  const [duplicatingKhatam, setDuplicatingKhatam] = useState(false);
  const [completingKhatam, setCompletingKhatam] = useState(false);

  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<ParticipationMode>("open");
  const [newCompleted, setNewCompleted] = useState(false);
  const [creatingOne, setCreatingOne] = useState(false);

  const [bulkCount, setBulkCount] = useState(1);
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkMode, setBulkMode] = useState<ParticipationMode>("group");
  const [bulkCompleted, setBulkCompleted] = useState(true);
  const [creatingBulk, setCreatingBulk] = useState(false);

  useEffect(() => {
    setCampaignNameInput(campaignName);
    setDescriptionInput(campaignDescription ?? "");
    setSearchableInput(campaignSearchable);
    setKhatamNameInput(currentKhatamName);
  }, [campaignName, campaignDescription, campaignSearchable, currentKhatamName]);

  const campaignChanged =
    campaignNameInput.trim() !== campaignName ||
    descriptionInput.trim() !== (campaignDescription ?? "") ||
    searchableInput !== campaignSearchable;

  if (scope === "campaign") {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={16} className="text-[#8B0000]" />
            <h3 className="text-sm font-semibold text-gray-800">Campaign details</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            These details apply to the whole campaign and appear across every Khatam.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Campaign title
              </label>
              <input
                value={campaignNameInput}
                onChange={event => setCampaignNameInput(event.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Description or notes
              </label>
              <textarea
                value={descriptionInput}
                onChange={event => setDescriptionInput(event.target.value)}
                placeholder="Optional context, dedication, deadline, or instructions"
                maxLength={500}
                rows={4}
                className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{descriptionInput.length}/500</p>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={searchableInput}
                onChange={event => setSearchableInput(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[#8B0000]"
              />
              <span>
                <span className="block text-xs font-medium text-gray-700">List this campaign in search</span>
                <span className="mt-0.5 block text-[11px] text-gray-400">
                  People can find it by campaign name or slug. The admin PIN remains private.
                </span>
              </span>
            </label>
            {campaignChanged && (
              <button
                type="button"
                disabled={savingCampaign || !campaignNameInput.trim()}
                onClick={async () => {
                  setSavingCampaign(true);
                  try {
                    await onSaveCampaign(campaignNameInput.trim(), descriptionInput.trim(), searchableInput);
                  } finally {
                    setSavingCampaign(false);
                  }
                }}
                className="w-full rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6B0000] disabled:opacity-50"
              >
                {savingCampaign ? "Saving..." : "Save campaign details"}
              </button>
            )}
          </div>
        </section>

        <SurahGoalsAdmin
          goals={campaignGoals}
          onSave={onSaveSurahGoal}
          onSetEnabled={onSetCampaignGoalEnabled}
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Plus size={16} className="text-[#8B0000]" />
            <h3 className="text-sm font-semibold text-gray-800">Add a Khatam</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            Name the Khatam, choose who will participate, and decide whether it starts open or is recorded as complete.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Khatam name
              </label>
              <input
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder="Family or institution name"
                maxLength={80}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000]"
              />
            </div>
            <ModeChoices value={newMode} onChange={setNewMode} />
            <StatusChoices completed={newCompleted} onChange={setNewCompleted} />
            <button
              type="button"
              disabled={creatingOne || !newName.trim()}
              onClick={async () => {
                setCreatingOne(true);
                try {
                  const created = await onCreateKhatams({
                    count: 1,
                    name: newName.trim(),
                    participationMode: newMode,
                    completed: newCompleted,
                  });
                  if (created) setNewName("");
                } finally {
                  setCreatingOne(false);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-50"
            >
              <BookOpen size={14} />
              {creatingOne ? "Adding..." : newCompleted ? "Add completed Khatam" : "Add open Khatam"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BadgeCheck size={16} className="text-green-700" />
            <h3 className="text-sm font-semibold text-gray-800">Bulk add Khatams</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            Add up to 100 at once. This is useful for recording a batch completed offline.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkCount}
                  onChange={event => setBulkCount(Number(event.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Name prefix (optional)
                </label>
                <input
                  value={bulkPrefix}
                  onChange={event => setBulkPrefix(event.target.value)}
                  placeholder="e.g. Masjid Khatam"
                  maxLength={60}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000]"
                />
              </div>
            </div>
            <ModeChoices value={bulkMode} onChange={setBulkMode} />
            <StatusChoices completed={bulkCompleted} onChange={setBulkCompleted} />
            <p className="text-[11px] text-gray-400">
              {currentKhatamCount} currently in this campaign · {bulkCount > 0 ? currentKhatamCount + bulkCount : currentKhatamCount} after this action
            </p>
            <button
              type="button"
              disabled={
                creatingBulk ||
                !Number.isInteger(bulkCount) ||
                bulkCount < 1 ||
                bulkCount > 100
              }
              onClick={async () => {
                const label = `${bulkCount} ${bulkCompleted ? "completed" : "open"} Khatam${bulkCount === 1 ? "" : "s"}`;
                if (!window.confirm(`Add ${label} to this campaign?`)) return;
                setCreatingBulk(true);
                try {
                  await onCreateKhatams({
                    count: bulkCount,
                    namePrefix: bulkPrefix.trim() || undefined,
                    participationMode: bulkMode,
                    completed: bulkCompleted,
                  });
                } finally {
                  setCreatingBulk(false);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              <BadgeCheck size={14} />
              {creatingBulk ? "Adding batch..." : `Add ${bulkCount || 0} Khatam${bulkCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BookCopy size={16} className="text-[#8B0000]" />
            <h3 className="text-sm font-semibold text-gray-800">Duplicate selected Khatam</h3>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Creates a fresh, empty Khatam using the selected Khatam’s name, participation type, and settings.
          </p>
          <button
            type="button"
            disabled={duplicatingKhatam}
            onClick={async () => {
              setDuplicatingKhatam(true);
              try {
                await onDuplicateKhatam();
              } finally {
                setDuplicatingKhatam(false);
              }
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <BookCopy size={14} />
            {duplicatingKhatam ? "Duplicating..." : "Duplicate selected Khatam"}
          </button>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-[#8B0000]" />
            <h3 className="text-sm font-semibold text-gray-800">Campaign participants</h3>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Participant quick-picks and personal claim limits are shared across this campaign.
          </p>
          {participants.length > 0 ? (
            <div className="mb-3 space-y-2">
              {participants.map(participant => {
                const editValue = limitEdits[participant.name] ?? (participant.claim_limit?.toString() ?? "");
                const changed = limitEdits[participant.name] !== undefined
                  && limitEdits[participant.name] !== (participant.claim_limit?.toString() ?? "");
                return (
                  <div key={participant.name} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="min-w-[80px] text-sm font-medium text-gray-800">{participant.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Limit</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder={String(claimLimit)}
                      value={editValue}
                      onChange={event => setLimitEdits(previous => ({ ...previous, [participant.name]: event.target.value }))}
                      className="w-14 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs text-gray-800 outline-none focus:border-[#8B0000]"
                    />
                    {changed && (
                      <button
                        type="button"
                        onClick={async () => {
                          const raw = limitEdits[participant.name]?.trim();
                          const limit = raw ? Number(raw) : null;
                          if (raw && (Number.isNaN(limit) || limit! < 1 || limit! > 120)) return;
                          await onSetParticipantLimit(participant.name, limit);
                          setLimitEdits(previous => {
                            const next = { ...previous };
                            delete next[participant.name];
                            return next;
                          });
                        }}
                        className="text-[10px] font-semibold text-[#8B0000] hover:underline"
                      >
                        Save
                      </button>
                    )}
                    {participant.claim_limit != null && limitEdits[participant.name] === undefined && (
                      <button
                        type="button"
                        onClick={() => onSetParticipantLimit(participant.name, null)}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Use default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveParticipant(participant.name)}
                      className="ml-auto text-gray-300 transition-colors hover:text-red-500"
                      aria-label={`Remove ${participant.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-xs italic text-gray-400">No participants added yet</p>
          )}
          <form
            onSubmit={async event => {
              event.preventDefault();
              const name = participantInput.trim();
              if (!name) return;
              await onAddParticipant(name);
              setParticipantInput("");
            }}
            className="flex gap-2"
          >
            <input
              value={participantInput}
              onChange={event => setParticipantInput(event.target.value)}
              placeholder="Add participant name"
              maxLength={60}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000]"
            />
            <button type="submit" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#8B0000] px-3 py-2 text-sm font-medium text-white hover:bg-[#6B0000]">
              <UserPlus size={14} />
              Add
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-[#8B0000]" />
          <h3 className="text-sm font-semibold text-gray-800">This Khatam’s settings</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500">Changes here affect only the selected Khatam.</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Khatam name
            </label>
            <div className="flex gap-2">
              <input
                value={khatamNameInput}
                onChange={event => setKhatamNameInput(event.target.value)}
                maxLength={80}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#8B0000]"
              />
              <button
                type="button"
                disabled={renamingKhatam || !khatamNameInput.trim() || khatamNameInput.trim() === currentKhatamName}
                onClick={async () => {
                  setRenamingKhatam(true);
                  try {
                    await onRenameKhatam(khatamNameInput.trim());
                  } finally {
                    setRenamingKhatam(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B0000] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Pencil size={12} />
                {renamingKhatam ? "Saving..." : "Rename"}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Participation</p>
            <ModeChoices value={participationMode} onChange={onSetParticipationMode} />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <Sliders size={14} className="shrink-0 text-gray-400" />
            <span className="shrink-0 text-xs text-gray-600">Default claim limit</span>
            <input
              type="number"
              min={1}
              max={120}
              value={claimLimitInput}
              onChange={event => setClaimLimitInput(Number(event.target.value))}
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-center text-sm text-gray-800 outline-none focus:border-[#8B0000]"
            />
            <span className="shrink-0 text-xs text-gray-400">quarters per person</span>
            {claimLimitInput !== claimLimit && (
              <button
                type="button"
                onClick={onSaveClaimLimit}
                className="ml-auto rounded-full bg-[#8B0000] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6B0000]"
              >
                Save
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-1.5 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-700" />
              <span className="text-xs font-semibold text-gray-700">Mark entire 30 complete</span>
            </div>
            <p className="mb-2 text-[11px] text-gray-400">
              Completes every unfinished portion in this Khatam. Existing participant names are preserved.
            </p>
            <button
              type="button"
              disabled={isKhatamComplete || completingKhatam}
              onClick={async () => {
                setCompletingKhatam(true);
                try {
                  await onCompleteEntireKhatam();
                } finally {
                  setCompletingKhatam(false);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              <BadgeCheck size={14} />
              {isKhatamComplete ? "All 30 Juz complete" : completingKhatam ? "Completing..." : "Mark all 30 complete"}
            </button>
          </div>

          {locationCountry && (
            <button
              type="button"
              onClick={onToggleGlobeNames}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              🌍 {showNamesOnGlobe ? "Hide names on World Globe" : "Show names on World Globe"}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Danger zone</span>
        <p className="mb-3 mt-1 text-xs text-red-600/80">These actions affect only this Khatam and cannot be undone.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResetAll}
            className="flex min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            <RotateCcw size={12} />
            Reset all slots
          </button>
          <button
            type="button"
            onClick={onDeleteKhatam}
            className="flex min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-800 bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            <Trash2 size={12} />
            Delete Khatam
          </button>
        </div>
      </section>
    </div>
  );
}
