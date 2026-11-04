import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ParticipantInfo } from "@/lib/api";
import type { CampaignGoal } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import SurahGoalsAdmin from "@/components/khatam/SurahGoalsAdmin";
import DescriptionEditor from "@/components/ui/DescriptionEditor";
import { AdminSection, AdminSwitch } from "@/components/khatam/AdminSection";

interface AdminSettingsPanelProps {
  participants: ParticipantInfo[];
  /** Default claim limit of the selected Khatam, shown as the placeholder for personal limits. */
  claimLimit: number;
  campaignName: string;
  campaignDescription: string | null;
  campaignSearchable: boolean;
  campaignGoals: CampaignGoal[];
  onAddParticipant: (name: string) => Promise<void>;
  onRemoveParticipant: (name: string) => Promise<void>;
  onSetParticipantLimit: (name: string, limit: number | null) => Promise<void>;
  onSaveCampaign: (name: string, description: string, isSearchable: boolean) => Promise<void>;
  onSaveSurahGoal: (options: {
    goalId?: number;
    surahNumber: number;
    target: number;
    isEnabled?: boolean;
  }) => Promise<boolean>;
  onSetCampaignGoalEnabled: (goalId: number, isEnabled: boolean) => Promise<boolean>;
}

/** Campaign-wide settings: details, goals and participants. */
export default function AdminSettingsPanel({
  participants,
  claimLimit,
  campaignName,
  campaignDescription,
  campaignSearchable,
  campaignGoals,
  onAddParticipant,
  onRemoveParticipant,
  onSetParticipantLimit,
  onSaveCampaign,
  onSaveSurahGoal,
  onSetCampaignGoalEnabled,
}: AdminSettingsPanelProps) {
  const [nameInput, setNameInput] = useState(campaignName);
  const [descriptionInput, setDescriptionInput] = useState(campaignDescription ?? "");
  const [searchableInput, setSearchableInput] = useState(campaignSearchable);
  const [savingCampaign, setSavingCampaign] = useState(false);

  useEffect(() => {
    setNameInput(campaignName);
    setDescriptionInput(campaignDescription ?? "");
    setSearchableInput(campaignSearchable);
  }, [campaignName, campaignDescription, campaignSearchable]);

  const campaignChanged =
    nameInput.trim() !== campaignName ||
    descriptionInput.trim() !== (campaignDescription ?? "") ||
    searchableInput !== campaignSearchable;

  const [participantInput, setParticipantInput] = useState("");
  const [limitEdits, setLimitEdits] = useState<Record<string, string>>({});

  const saveLimit = async (name: string) => {
    const raw = limitEdits[name]?.trim() ?? "";
    const limit = raw ? Number(raw) : null;
    if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 120)) return;
    await onSetParticipantLimit(name, limit);
    setLimitEdits(previous => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <AdminSection title="Campaign details">
        <form
          className="space-y-4"
          onSubmit={async e => {
            e.preventDefault();
            if (!campaignChanged || !nameInput.trim()) return;
            setSavingCampaign(true);
            try {
              await onSaveCampaign(nameInput.trim(), descriptionInput.trim(), searchableInput);
            } finally {
              setSavingCampaign(false);
            }
          }}
        >
          <div>
            <label htmlFor="admin-campaign-name" className={ui.label}>Title</label>
            <input
              id="admin-campaign-name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              maxLength={80}
              className={ui.input}
            />
          </div>
          <div>
            <label htmlFor="admin-campaign-description" className={ui.label}>
              Description <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <DescriptionEditor
              id="admin-campaign-description"
              value={descriptionInput}
              onChange={setDescriptionInput}
              placeholder="Who it's dedicated to, a deadline, or instructions for readers"
              maxLength={500}
              minRows={4}
            />
          </div>
          <AdminSwitch
            label="Show in campaign search"
            hint="Lets people find this campaign by name. The PIN stays private."
            checked={searchableInput}
            onChange={setSearchableInput}
          />
          {campaignChanged && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={btn("ghost", "md")}
                onClick={() => {
                  setNameInput(campaignName);
                  setDescriptionInput(campaignDescription ?? "");
                  setSearchableInput(campaignSearchable);
                }}
              >
                Discard
              </button>
              <button type="submit" className={btn("primary", "md")} disabled={savingCampaign || !nameInput.trim()}>
                {savingCampaign ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </AdminSection>

      <SurahGoalsAdmin goals={campaignGoals} onSave={onSaveSurahGoal} onSetEnabled={onSetCampaignGoalEnabled} />

      <AdminSection
        title="Participants"
        description="Their names appear as quick picks when you assign quarters. Leave a limit blank to use the Khatam's default."
      >
        {participants.length > 0 ? (
          <ul className="mb-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
            <li aria-hidden="true" className="flex items-center gap-2 bg-stone-50 py-1.5 pl-3 pr-1 text-xs text-stone-500">
              <span className="flex-1">Name</span>
              <span className="w-[7.5rem] pl-1">Quarter limit</span>
              <span className="w-10" />
            </li>
            {participants.map(p => {
              const current = p.claim_limit?.toString() ?? "";
              const value = limitEdits[p.name] ?? current;
              const changed = limitEdits[p.name] !== undefined && limitEdits[p.name] !== current;
              return (
                <li key={p.name} className="flex items-center gap-2 py-1.5 pl-3 pr-1">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.name}</span>
                  <label className="sr-only" htmlFor={`limit-${p.name}`}>Quarter limit for {p.name}</label>
                  <input
                    id={`limit-${p.name}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    placeholder={String(claimLimit)}
                    value={value}
                    onChange={e => setLimitEdits(prev => ({ ...prev, [p.name]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") saveLimit(p.name); }}
                    title={p.claim_limit == null ? `Uses the default (${claimLimit})` : "Personal limit"}
                    className={cn(ui.input, "h-10 w-16 px-2 py-0 text-center")}
                  />
                  <span className="w-[3.25rem]">
                    {changed && (
                      <button type="button" className={cn(btn("secondary", "sm"), "px-2.5")} onClick={() => saveLimit(p.name)}>
                        Save
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${p.name} from the quick-pick list? Their claimed quarters are not affected.`)) {
                        onRemoveParticipant(p.name);
                      }
                    }}
                    aria-label={`Remove ${p.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-stone-500">No participants yet.</p>
        )}
        <form
          onSubmit={async e => {
            e.preventDefault();
            const name = participantInput.trim();
            if (!name) return;
            await onAddParticipant(name);
            setParticipantInput("");
          }}
          className="flex gap-2"
        >
          <label htmlFor="admin-add-participant" className="sr-only">Participant name</label>
          <input
            id="admin-add-participant"
            value={participantInput}
            onChange={e => setParticipantInput(e.target.value)}
            placeholder="Add a name"
            maxLength={60}
            autoComplete="off"
            className={cn(ui.input, "min-w-0 flex-1")}
          />
          <button type="submit" className={cn(btn("secondary", "md"), "h-auto shrink-0")} disabled={!participantInput.trim()}>
            Add
          </button>
        </form>
      </AdminSection>
    </div>
  );
}
