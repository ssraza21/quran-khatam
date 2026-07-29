import { useEffect, useState } from "react";
import { Users, UserPlus, X, BookOpen, Sliders, RotateCcw, Trash2, FileText, LibraryBig } from "lucide-react";
import type { ParticipantInfo } from "@/lib/api";

interface AdminSettingsPanelProps {
  participants: ParticipantInfo[];
  claimLimit: number;
  claimLimitInput: number;
  setClaimLimitInput: (n: number) => void;
  newKhatamName: string;
  setNewKhatamName: (n: string) => void;
  campaignName: string;
  campaignDescription: string | null;
  campaignSearchable: boolean;
  campaignGoal: number;
  currentKhatamCount: number;
  canAssignEntireQuran: boolean;
  locationCountry: string | null;
  showNamesOnGlobe: boolean;
  onAddParticipant: (name: string) => Promise<void>;
  onRemoveParticipant: (name: string) => Promise<void>;
  onSetParticipantLimit: (name: string, limit: number | null) => Promise<void>;
  onSaveClaimLimit: () => Promise<void>;
  onSaveCampaign: (name: string, description: string, isSearchable: boolean) => Promise<void>;
  onAssignEntireQuran: (name: string) => Promise<void>;
  onBulkCreateRounds: (targetTotal: number, namePrefix: string) => Promise<void>;
  onStartNewKhatam: () => Promise<void>;
  onToggleGlobeNames: () => Promise<void>;
  onResetAll: () => Promise<void>;
  onDeleteKhatam: () => Promise<void>;
}

export default function AdminSettingsPanel({
  participants,
  claimLimit,
  claimLimitInput,
  setClaimLimitInput,
  newKhatamName,
  setNewKhatamName,
  campaignName,
  campaignDescription,
  campaignSearchable,
  campaignGoal,
  currentKhatamCount,
  canAssignEntireQuran,
  locationCountry,
  showNamesOnGlobe,
  onAddParticipant,
  onRemoveParticipant,
  onSetParticipantLimit,
  onSaveClaimLimit,
  onSaveCampaign,
  onAssignEntireQuran,
  onBulkCreateRounds,
  onStartNewKhatam,
  onToggleGlobeNames,
  onResetAll,
  onDeleteKhatam,
}: AdminSettingsPanelProps) {
  const [participantInput, setParticipantInput] = useState("");
  const [limitEdits, setLimitEdits] = useState<Record<string, string>>({});
  const [campaignNameInput, setCampaignNameInput] = useState(campaignName);
  const [descriptionInput, setDescriptionInput] = useState(campaignDescription ?? "");
  const [searchableInput, setSearchableInput] = useState(campaignSearchable);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [assigningAll, setAssigningAll] = useState(false);
  const [targetInput, setTargetInput] = useState(campaignGoal);
  const [roundPrefix, setRoundPrefix] = useState("");
  const [creatingRounds, setCreatingRounds] = useState(false);

  useEffect(() => {
    setCampaignNameInput(campaignName);
    setDescriptionInput(campaignDescription ?? "");
    setSearchableInput(campaignSearchable);
    setTargetInput(Math.max(campaignGoal, currentKhatamCount));
  }, [campaignName, campaignDescription, campaignSearchable, campaignGoal, currentKhatamCount]);

  const campaignChanged =
    campaignNameInput.trim() !== campaignName ||
    descriptionInput.trim() !== (campaignDescription ?? "") ||
    searchableInput !== campaignSearchable;

  return (
    <div className="space-y-4">
      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-[#8B0000]" />
          <h3 className="text-sm font-semibold text-gray-800">Campaign details</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          The campaign title and notes stay the same across every round. Each new khatam can still have its own round name.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
              Campaign title
            </label>
            <input
              value={campaignNameInput}
              onChange={e => setCampaignNameInput(e.target.value)}
              maxLength={80}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
              Description or notes
            </label>
            <textarea
              value={descriptionInput}
              onChange={e => setDescriptionInput(e.target.value)}
              placeholder="Optional context, dedication, deadline, or instructions"
              maxLength={500}
              rows={4}
              className="w-full resize-y bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{descriptionInput.length}/500</p>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={searchableInput}
              onChange={e => setSearchableInput(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-[#8B0000]"
            />
            <span>
              <span className="block text-xs font-medium text-gray-700">List this campaign in search</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">
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
              className="w-full bg-[#8B0000] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50"
            >
              {savingCampaign ? "Saving..." : "Save campaign details"}
            </button>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-[#8B0000]" />
          <h3 className="text-sm font-semibold text-gray-800">Participants</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Quick-picks when assigning. You can give someone a higher personal claim limit than the group default.
        </p>

        {participants.length > 0 ? (
          <div className="space-y-2 mb-3">
            {participants.map(p => {
              const editVal = limitEdits[p.name] ?? (p.claim_limit?.toString() ?? "");
              const effective = p.claim_limit ?? claimLimit;
              return (
                <div
                  key={p.name}
                  className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-800 min-w-[80px]">{p.name}</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Limit</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder={String(claimLimit)}
                      value={editVal}
                      onChange={e => setLimitEdits(prev => ({ ...prev, [p.name]: e.target.value }))}
                      className="w-14 bg-white border border-gray-200 text-gray-800 px-2 py-1 rounded-lg text-xs text-center outline-none focus:border-[#8B0000]"
                    />
                    <span className="text-[10px] text-gray-400">
                      {p.claim_limit ? "custom" : `default (${claimLimit})`}
                    </span>
                    {(limitEdits[p.name] !== undefined
                      ? limitEdits[p.name] !== (p.claim_limit?.toString() ?? "")
                      : false) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const raw = limitEdits[p.name]?.trim();
                          const limit = raw ? Number(raw) : null;
                          if (raw && (Number.isNaN(limit) || limit! < 1 || limit! > 120)) return;
                          await onSetParticipantLimit(p.name, limit);
                          setLimitEdits(prev => {
                            const next = { ...prev };
                            delete next[p.name];
                            return next;
                          });
                        }}
                        className="text-[10px] font-semibold text-[#8B0000] hover:underline"
                      >
                        Save
                      </button>
                    )}
                    {p.claim_limit != null && limitEdits[p.name] === undefined && (
                      <button
                        type="button"
                        onClick={() => onSetParticipantLimit(p.name, null)}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 ml-auto">active max: {effective}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(p.name)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic mb-3">No participants added yet</p>
        )}

        <form
          onSubmit={async e => {
            e.preventDefault();
            const n = participantInput.trim();
            if (!n) return;
            await onAddParticipant(n);
            setParticipantInput("");
          }}
          className="flex gap-2"
        >
          <input
            value={participantInput}
            onChange={e => setParticipantInput(e.target.value)}
            placeholder="Add participant name"
            maxLength={60}
            className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
          />
          <button
            type="submit"
            className="bg-[#8B0000] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#6B0000] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <UserPlus size={14} />
            Add
          </button>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-[#8B0000]" />
          <h3 className="text-sm font-semibold text-gray-800">Khatam settings</h3>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={newKhatamName}
              onChange={e => setNewKhatamName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onStartNewKhatam()}
              placeholder="Name for next khatam (optional)"
              maxLength={60}
              className="flex-1 min-w-[160px] bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
            <button
              type="button"
              onClick={onStartNewKhatam}
              className="bg-[#8B0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#6B0000] transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <BookOpen size={13} />
              Start new khatam
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div>
                <p className="text-xs font-semibold text-gray-700">Campaign khatam goal</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {currentKhatamCount} created · {Math.max(targetInput - currentKhatamCount, 0)} remaining
                </p>
              </div>
              <input
                type="number"
                min={currentKhatamCount}
                max={5000}
                value={targetInput}
                onChange={e => setTargetInput(Number(e.target.value))}
                className="w-24 bg-gray-50 border border-gray-200 text-gray-800 px-2.5 py-2 rounded-lg text-sm outline-none text-center focus:border-[#8B0000]"
                aria-label="Total khatam goal"
              />
            </div>
            <input
              value={roundPrefix}
              onChange={e => setRoundPrefix(e.target.value)}
              placeholder="Round name prefix, e.g. DarusSalam Khatam"
              maxLength={60}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] mb-2"
            />
            <button
              type="button"
              disabled={
                creatingRounds ||
                !Number.isInteger(targetInput) ||
                targetInput <= currentKhatamCount ||
                targetInput > 5000
              }
              onClick={async () => {
                const batchSize = Math.min(targetInput - currentKhatamCount, 100);
                const confirmed = window.confirm(
                  `Create ${batchSize} new khatam${batchSize === 1 ? "" : "s"} now? Each will include all 120 quarter slots.`
                );
                if (!confirmed) return;
                setCreatingRounds(true);
                try {
                  await onBulkCreateRounds(targetInput, roundPrefix.trim());
                } finally {
                  setCreatingRounds(false);
                }
              }}
              className="w-full bg-[#8B0000] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50"
            >
              {creatingRounds
                ? "Creating rounds..."
                : targetInput > currentKhatamCount
                  ? `Create next ${Math.min(targetInput - currentKhatamCount, 100)} khatam${Math.min(targetInput - currentKhatamCount, 100) === 1 ? "" : "s"}`
                  : "Campaign goal reached"}
            </button>
            {targetInput - currentKhatamCount > 100 && (
              <p className="text-[10px] text-gray-400 mt-2">
                Large goals are created 100 at a time to keep each operation reliable.
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center flex-wrap pt-1">
            <Sliders size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600 shrink-0">Default claim limit</span>
            <input
              type="number"
              min={1}
              max={120}
              value={claimLimitInput}
              onChange={e => setClaimLimitInput(Number(e.target.value))}
              className="w-16 bg-gray-50 border border-gray-200 text-gray-800 px-2.5 py-1.5 rounded-lg text-sm outline-none text-center focus:border-[#8B0000]"
            />
            <span className="text-xs text-gray-400 shrink-0">quarters per person</span>
            {claimLimitInput !== claimLimit && (
              <button
                type="button"
                onClick={onSaveClaimLimit}
                className="ml-auto bg-[#8B0000] text-white text-xs px-3 py-1.5 rounded-full hover:bg-[#6B0000] transition-colors font-medium"
              >
                Save
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 mb-1.5">
              <LibraryBig size={14} className="text-[#8B0000]" />
              <span className="text-xs font-semibold text-gray-700">Assign the entire Quran</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              One action assigns all 30 Juz (120 quarters) to a family, class, or other group.
            </p>
            <div className="flex gap-2">
              <input
                value={bulkAssignee}
                onChange={e => setBulkAssignee(e.target.value)}
                list="bulk-assignee-options"
                placeholder="Family or group name"
                maxLength={60}
                disabled={!canAssignEntireQuran || assigningAll}
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#8B0000] disabled:opacity-50"
              />
              <datalist id="bulk-assignee-options">
                {participants.map(participant => (
                  <option key={participant.name} value={participant.name} />
                ))}
              </datalist>
              <button
                type="button"
                disabled={!canAssignEntireQuran || !bulkAssignee.trim() || assigningAll}
                onClick={async () => {
                  setAssigningAll(true);
                  try {
                    await onAssignEntireQuran(bulkAssignee.trim());
                  } finally {
                    setAssigningAll(false);
                  }
                }}
                className="bg-[#8B0000] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {assigningAll ? "Assigning..." : "Assign all 30"}
              </button>
            </div>
            {!canAssignEntireQuran && (
              <p className="text-[10px] text-amber-700 mt-2">
                Available only before any portion in this round has been claimed or completed.
              </p>
            )}
          </div>

          {locationCountry && (
            <button
              type="button"
              onClick={onToggleGlobeNames}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-xs hover:bg-gray-100 transition-colors text-left"
            >
              🌍 {showNamesOnGlobe ? "Hide names on World Globe" : "Show names on World Globe"}
            </button>
          )}
        </div>
      </section>

      <section className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Danger zone</span>
        <p className="text-xs text-red-600/80 mt-1 mb-3">These actions cannot be undone.</p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={onResetAll}
            className="flex-1 min-w-[140px] bg-white border border-red-300 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={12} />
            Reset all slots
          </button>
          <button
            type="button"
            onClick={onDeleteKhatam}
            className="flex-1 min-w-[140px] bg-red-700 border border-red-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={12} />
            Delete khatam
          </button>
        </div>
      </section>
    </div>
  );
}
