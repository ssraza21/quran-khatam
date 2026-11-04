import { useState, type ReactNode } from "react";
import type { KhatamInfo } from "@/hooks/useKhatamState";
import type { ParticipationMode } from "@/lib/types";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import AdminKhatamPicker from "@/components/khatam/AdminKhatamPicker";
import AdminKhatamOrder from "@/components/khatam/AdminKhatamOrder";
import { AdminDisclosure, AdminOptions, AdminSection, AdminSwitch } from "@/components/khatam/AdminSection";

export interface CreateKhatamsOptions {
  count: number;
  name?: string;
  namePrefix?: string;
  participationMode: ParticipationMode;
  completed: boolean;
}

interface AdminKhatamSettingsProps {
  khatams: KhatamInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  khatamName: string;
  khatamNum: number;
  participationMode: ParticipationMode;
  isKhatamComplete: boolean;
  claimLimit: number;
  claimLimitInput: number;
  setClaimLimitInput: (n: number) => void;
  locationCountry: string | null;
  showNamesOnGlobe: boolean;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  onSaveClaimLimit: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onSetParticipationMode: (mode: ParticipationMode) => Promise<void>;
  onToggleGlobeNames: () => Promise<void>;
  onCompleteAll: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onCreateKhatams: (options: CreateKhatamsOptions) => Promise<boolean>;
  onReorder: (orderedIds: number[]) => Promise<void>;
  onResetAll: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const MODE_OPTIONS: { value: ParticipationMode; title: string; hint: string }[] = [
  { value: "open", title: "Open", hint: "Anyone with the link picks quarters" },
  { value: "group", title: "Family or institution", hint: "One group reads the whole Khatam" },
];

function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

/** Row with a label/hint on the left and an action on the right (stacks on narrow screens). */
function ActionRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function AdminKhatamSettings(props: AdminKhatamSettingsProps) {
  const {
    khatams, selectedId, onSelect, khatamName, khatamNum, participationMode, isKhatamComplete,
    claimLimit, claimLimitInput, setClaimLimitInput, locationCountry, showNamesOnGlobe,
    addOpen, setAddOpen,
    onSaveClaimLimit, onRename, onSetParticipationMode, onToggleGlobeNames, onCompleteAll,
    onDuplicate, onCreateKhatams, onReorder, onResetAll, onDelete,
  } = props;
  const { busy, run } = useBusy();
  const label = khatamName || `Khatam ${khatamNum}`;

  const [nameInput, setNameInput] = useState(khatamName);
  const [syncedName, setSyncedName] = useState(khatamName);
  if (syncedName !== khatamName) {
    setSyncedName(khatamName);
    setNameInput(khatamName);
  }
  const nameChanged = nameInput.trim() !== khatamName && !!nameInput.trim();

  const [orderOpen, setOrderOpen] = useState(false);

  // Add Khatams form
  const [count, setCount] = useState("1");
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<ParticipationMode>("open");
  const [newCompleted, setNewCompleted] = useState(false);
  const countNum = Number(count);
  const countValid = Number.isInteger(countNum) && countNum >= 1 && countNum <= 100;
  const single = countNum === 1;
  const canCreate = countValid && (!single || !!newName.trim()) && busy !== "create";

  const create = () => run("create", async () => {
    if (!single) {
      const what = `${countNum} ${newCompleted ? "completed" : "new"} Khatams`;
      if (!window.confirm(`Add ${what} to this campaign?`)) return;
    }
    const ok = await onCreateKhatams({
      count: countNum,
      name: single ? newName.trim() : undefined,
      namePrefix: !single ? newName.trim() || undefined : undefined,
      participationMode: newMode,
      completed: newCompleted,
    });
    if (ok) {
      setNewName("");
      setCount("1");
      setAddOpen(false);
    }
  });

  return (
    <div className="space-y-4">
      <AdminKhatamPicker khatams={khatams} selectedId={selectedId} onSelect={onSelect} />

      <AdminSection title="Details" description="These apply only to the Khatam selected above.">
        <div className="space-y-5">
          <div>
            <label htmlFor="admin-khatam-name" className={ui.label}>Name</label>
            <div className="flex gap-2">
              <input
                id="admin-khatam-name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={`Khatam ${khatamNum}`}
                maxLength={80}
                className={cn(ui.input, "min-w-0 flex-1")}
              />
              {nameChanged && (
                <button
                  type="button"
                  className={cn(btn("primary", "md"), "h-auto shrink-0")}
                  disabled={busy === "rename"}
                  onClick={() => run("rename", () => onRename(nameInput.trim()))}
                >
                  {busy === "rename" ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className={ui.label}>Who takes part</p>
            <AdminOptions
              label="Who takes part"
              value={participationMode}
              onChange={mode => mode !== participationMode && run("mode", () => onSetParticipationMode(mode))}
              options={MODE_OPTIONS}
              disabled={busy === "mode"}
            />
          </div>

          <div>
            <label htmlFor="admin-claim-limit" className={ui.label}>Quarters per person</label>
            <div className="flex items-center gap-2">
              <input
                id="admin-claim-limit"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={claimLimitInput}
                onChange={e => setClaimLimitInput(Number(e.target.value))}
                className={cn(ui.input, "w-24 text-center")}
              />
              {claimLimitInput !== claimLimit && (
                <button
                  type="button"
                  className={cn(btn("primary", "md"), "h-auto self-stretch")}
                  disabled={busy === "limit" || !Number.isInteger(claimLimitInput) || claimLimitInput < 1 || claimLimitInput > 120}
                  onClick={() => run("limit", onSaveClaimLimit)}
                >
                  {busy === "limit" ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            <p className={ui.hint}>
              The most quarters one person can have claimed at once. Set a different limit for
              someone under Settings → Participants.
            </p>
          </div>

          {locationCountry && (
            <AdminSwitch
              label="Show reader names on the world globe"
              hint="When off, completions still appear on the globe without names."
              checked={showNamesOnGlobe}
              disabled={busy === "globe"}
              onChange={() => run("globe", onToggleGlobeNames)}
            />
          )}

          <div className="border-t border-stone-200 pt-4">
            <ActionRow
              title="Mark the whole Khatam done"
              hint="Completes every unfinished quarter. Names already assigned are kept."
            >
              <button
                type="button"
                className={btn("secondary", "md")}
                disabled={isKhatamComplete || busy === "complete"}
                onClick={() => run("complete", onCompleteAll)}
              >
                {isKhatamComplete ? "Already complete" : busy === "complete" ? "Saving…" : "Mark all done"}
              </button>
            </ActionRow>
          </div>
        </div>
      </AdminSection>

      <AdminDisclosure
        id="admin-add-khatams"
        title="Add Khatams"
        description={`${khatams.length} in this campaign`}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[5.5rem_1fr] gap-3">
            <div>
              <label htmlFor="admin-add-count" className={ui.label}>How many</label>
              <input
                id="admin-add-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={count}
                onChange={e => setCount(e.target.value)}
                className={cn(ui.input, "text-center")}
              />
            </div>
            <div>
              <label htmlFor="admin-add-name" className={ui.label}>
                {single ? "Name" : <>Name prefix <span className="font-normal text-stone-400">(optional)</span></>}
              </label>
              <input
                id="admin-add-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={single ? "e.g. Ahmed family" : "e.g. Masjid Khatam"}
                maxLength={single ? 80 : 60}
                className={ui.input}
              />
            </div>
          </div>
          {!countValid && count !== "" && <p className={ui.error}>Enter a number from 1 to 100.</p>}
          {!single && countValid && (
            <p className="-mt-2 text-xs text-stone-500">
              They'll be numbered automatically{newName.trim() ? ` (“${newName.trim()} 1”, “${newName.trim()} 2”…)` : ""}.
            </p>
          )}

          <div>
            <p className={ui.label}>Who takes part</p>
            <AdminOptions label="Who takes part" value={newMode} onChange={setNewMode} options={MODE_OPTIONS} />
          </div>

          <div>
            <p className={ui.label}>Starting state</p>
            <AdminOptions
              label="Starting state"
              value={newCompleted}
              onChange={setNewCompleted}
              options={[
                { value: false, title: "Not started", hint: "Readers claim quarters as usual" },
                { value: true, title: "Already completed", hint: "Record a Khatam read offline" },
              ]}
            />
          </div>

          <button type="button" className={cn(btn("primary", "lg"), "w-full")} disabled={!canCreate} onClick={create}>
            {busy === "create"
              ? "Adding…"
              : `Add ${countValid ? countNum : ""} ${newCompleted ? "completed " : ""}Khatam${single ? "" : "s"}`.replace(/\s+/g, " ")}
          </button>

          <div className="border-t border-stone-200 pt-4">
            <ActionRow
              title={`Duplicate “${label}”`}
              hint="Creates an empty copy with the same name and settings."
            >
              <button
                type="button"
                className={btn("secondary", "md")}
                disabled={busy === "duplicate"}
                onClick={() => run("duplicate", onDuplicate)}
              >
                {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
              </button>
            </ActionRow>
          </div>
        </div>
      </AdminDisclosure>

      {khatams.length > 1 && (
        <AdminDisclosure
          title="Change order"
          description="The order Khatams are listed in"
          open={orderOpen}
          onOpenChange={setOrderOpen}
        >
          <AdminKhatamOrder khatams={khatams} selectedId={selectedId} onReorder={onReorder} />
        </AdminDisclosure>
      )}

      <AdminSection title="Danger zone" description={`Affects only “${label}”. These can't be undone.`} danger>
        <div className="divide-y divide-stone-100">
          <ActionRow title="Reset all quarters" hint="Clears every name and all progress in this Khatam.">
            <button type="button" className={btn("danger", "md")} onClick={() => run("reset", onResetAll)} disabled={busy === "reset"}>
              Reset quarters
            </button>
          </ActionRow>
          <ActionRow title="Delete this Khatam" hint="Removes it and its progress from the campaign.">
            <button
              type="button"
              className={cn(btn("danger", "md"), "border-red-700 bg-red-700 text-white hover:bg-red-800")}
              onClick={() => run("delete", onDelete)}
              disabled={busy === "delete"}
            >
              Delete Khatam
            </button>
          </ActionRow>
        </div>
      </AdminSection>
    </div>
  );
}
