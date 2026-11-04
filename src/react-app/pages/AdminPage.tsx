import { useState } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useKhatamState } from "@/hooks/useKhatamState";
import PageHeader from "@/components/layout/PageHeader";
import CampaignTabs from "@/components/layout/CampaignTabs";
import AdminKhatamPicker from "@/components/khatam/AdminKhatamPicker";
import AdminSlotGrid from "@/components/khatam/AdminSlotGrid";
import AdminSlotDrawer from "@/components/khatam/AdminSlotDrawer";
import AdminKhatamSettings from "@/components/khatam/AdminKhatamSettings";
import AdminSettingsPanel from "@/components/khatam/AdminSettingsPanel";
import { COLORS } from "@/lib/constants";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type AdminTab = "assign" | "khatams" | "settings";
const TABS: { id: AdminTab; label: string }[] = [
  { id: "assign", label: "Assign" },
  { id: "khatams", label: "Khatams" },
  { id: "settings", label: "Settings" },
];

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
    </div>
  );
}

export default function AdminPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: AdminTab = tabParam === "khatams" || tabParam === "settings" ? tabParam : "assign";
  const setTab = (next: AdminTab) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next === "assign") params.delete("tab");
      else params.set("tab", next);
      return params;
    }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const [addOpen, setAddOpen] = useState(false);

  const state = useKhatamState(slug);
  const {
    khatamName, campaignName, campaignDescription, campaignSearchable,
    participationMode,
    slots, khatamNum, khatams, campaignGoals, selectedKhatamId,
    loading, notFound, isSolo,
    claimLimit, showNamesOnGlobe, locationCountry,
    adminMode, adminSelected, setAdminSelected,
    adminDrawer, setAdminDrawer,
    adminPin, setAdminPin, adminErr, adminRestoring,
    participants, claimLimitInput, setClaimLimitInput,
    done, prog, rem, pct, khatmComplete, isLatestKhatam,
    selectKhatam,
    tryAdmin, deactivateAdmin,
    adminSetStatus, adminAssignJuz,
    adminResetAllToAvailable, adminResetJuzToAvailable, adminDeleteKhatam,
    adminToggleGlobeNames, adminSaveClaimLimit,
    adminUpdateCampaign, adminSaveSurahGoal, adminSetCampaignGoalEnabled,
    adminAssignEntireQuran, adminCompleteEntireKhatam, adminCreateCampaignKhatams,
    adminRenameKhatam, adminSetParticipationMode, adminDuplicateKhatam, adminReorderKhatams,
    adminAddParticipant, adminRemoveParticipant, adminSetParticipantLimit,
  } = state;

  const [checking, setChecking] = useState(false);

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-2 font-heading text-2xl font-semibold text-stone-900">Campaign not found</h1>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  if (!loading && isSolo) {
    return <Navigate to={`/k/${slug}/tracker`} replace />;
  }

  if (loading && slots.length === 0) {
    return <Spinner />;
  }

  const openAddKhatams = () => {
    setTab("khatams");
    setAddOpen(true);
    window.setTimeout(() => {
      document.getElementById("admin-add-khatams")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const closeDrawer = () => {
    setAdminDrawer(null);
    setAdminSelected(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Organizer admin"
        title={campaignName || khatamName || "Khatam"}
      >
        <CampaignTabs slug={slug} hideOverview={khatams.length <= 1} />
      </PageHeader>

      {!adminMode ? (
        adminRestoring ? <Spinner /> : (
          <main className="mx-auto max-w-sm px-4 py-10 sm:py-16">
            <div className={cn(ui.card, "p-5 sm:p-6")}>
              <h2 className="text-lg font-semibold text-stone-900">Enter your organizer PIN</h2>
              <p className="mt-1 text-sm text-stone-500">
                This is the 4–6 digit PIN you chose when you created this campaign.
              </p>
              <form
                className="mt-5 space-y-3"
                onSubmit={async e => {
                  e.preventDefault();
                  setChecking(true);
                  try {
                    await tryAdmin();
                  } finally {
                    setChecking(false);
                  }
                }}
              >
                <label htmlFor="admin-pin" className="sr-only">PIN</label>
                <input
                  id="admin-pin"
                  type="password"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="current-password"
                  autoFocus
                  placeholder="PIN"
                  aria-invalid={!!adminErr}
                  aria-describedby={adminErr ? "admin-pin-error" : undefined}
                  className={cn(ui.input, "h-12 text-center text-xl tracking-[0.4em] placeholder:tracking-normal sm:text-xl")}
                />
                {adminErr && <p id="admin-pin-error" className={ui.error}>{adminErr}</p>}
                <button
                  type="submit"
                  disabled={checking || adminPin.length < 4}
                  className={cn(btn("primary", "lg"), "w-full")}
                >
                  {checking ? "Checking…" : "Unlock"}
                </button>
              </form>
            </div>
          </main>
        )
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          {/* Section switcher */}
          <div className="sticky top-14 z-30 -mx-4 border-b border-stone-200 bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Admin sections" className="grid min-w-0 max-w-md flex-1 grid-cols-3 gap-1 rounded-lg bg-stone-200/60 p-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`admin-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="admin-panel"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "h-9 rounded-md text-sm font-medium transition-colors",
                    tab === t.id ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={deactivateAdmin}
              title="Lock admin"
              aria-label="Lock admin"
              className={cn(btn("ghost", "md"), "ml-auto h-11 shrink-0 gap-1.5 px-2.5")}
            >
              <Lock size={16} />
              Lock
            </button>
            </div>
          </div>

          <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} className="pt-5">
            {tab === "assign" && (
              <div className="space-y-4">
                <div className="max-w-xl">
                  <AdminKhatamPicker khatams={khatams} selectedId={selectedKhatamId} onSelect={selectKhatam} />
                </div>

                {khatmComplete && isLatestKhatam && (
                  <div className={cn(ui.card, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
                    <p className="text-sm text-stone-700">
                      <span className="font-medium text-success">This Khatam is complete.</span>{" "}
                      Add another to keep the campaign going.
                    </p>
                    <button type="button" onClick={openAddKhatams} className={cn(btn("primary", "md"), "shrink-0")}>
                      Add Khatam
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS.dn.accent }} />
                        <span className="font-medium tabular-nums text-stone-900">{done}</span> done
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS.cl.accent }} />
                        <span className="font-medium tabular-nums text-stone-900">{prog}</span> claimed
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full border" style={{ borderColor: COLORS.av.border }} />
                        <span className="font-medium tabular-nums text-stone-900">{rem}</span> available
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {pct}% of 120 quarters done. Tap a quarter to change it, or a Juz number to change all four.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminDrawer({ juz: 0, q: 0 })}
                    className={btn("secondary", "md")}
                  >
                    Whole Khatam…
                  </button>
                </div>

                <AdminSlotGrid
                  slots={slots}
                  active={adminDrawer && adminDrawer.juz > 0 ? adminDrawer : adminSelected}
                  onSelectSlot={(juz, q) => { setAdminSelected({ juz, q }); setAdminDrawer({ juz, q }); }}
                  onSelectJuz={juz => setAdminDrawer({ juz, q: 0 })}
                />
              </div>
            )}

            {tab === "khatams" && (
              <div className="max-w-2xl">
                <AdminKhatamSettings
                  khatams={khatams}
                  selectedId={selectedKhatamId}
                  onSelect={selectKhatam}
                  khatamName={khatamName}
                  khatamNum={khatamNum}
                  participationMode={participationMode}
                  isKhatamComplete={khatmComplete}
                  claimLimit={claimLimit}
                  claimLimitInput={claimLimitInput}
                  setClaimLimitInput={setClaimLimitInput}
                  locationCountry={locationCountry}
                  showNamesOnGlobe={showNamesOnGlobe}
                  addOpen={addOpen}
                  setAddOpen={setAddOpen}
                  onSaveClaimLimit={adminSaveClaimLimit}
                  onRename={adminRenameKhatam}
                  onSetParticipationMode={adminSetParticipationMode}
                  onToggleGlobeNames={adminToggleGlobeNames}
                  onCompleteAll={adminCompleteEntireKhatam}
                  onDuplicate={adminDuplicateKhatam}
                  onCreateKhatams={adminCreateCampaignKhatams}
                  onReorder={adminReorderKhatams}
                  onResetAll={adminResetAllToAvailable}
                  onDelete={adminDeleteKhatam}
                />
              </div>
            )}

            {tab === "settings" && (
              <div className="max-w-2xl">
                <AdminSettingsPanel
                  participants={participants}
                  claimLimit={claimLimit}
                  campaignName={campaignName}
                  campaignDescription={campaignDescription}
                  campaignSearchable={campaignSearchable}
                  campaignGoals={campaignGoals}
                  onAddParticipant={adminAddParticipant}
                  onRemoveParticipant={adminRemoveParticipant}
                  onSetParticipantLimit={adminSetParticipantLimit}
                  onSaveCampaign={adminUpdateCampaign}
                  onSaveSurahGoal={adminSaveSurahGoal}
                  onSetCampaignGoalEnabled={adminSetCampaignGoalEnabled}
                />
              </div>
            )}
          </div>

          <AdminSlotDrawer
            open={!!adminDrawer}
            onClose={closeDrawer}
            juz={adminDrawer?.juz ?? 1}
            q={adminDrawer?.q ?? 0}
            slots={slots}
            participants={participants}
            onAssign={async (j, q, st, name) => {
              setAdminSelected({ juz: j, q });
              await adminSetStatus(st, name, j, q);
            }}
            onAssignJuz={adminAssignJuz}
            onResetJuz={adminResetJuzToAvailable}
            onOpenJuz={juz => setAdminDrawer({ juz, q: 0 })}
            onResetAll={adminResetAllToAvailable}
            onAssignAll={adminAssignEntireQuran}
            onCompleteAll={adminCompleteEntireKhatam}
          />
        </main>
      )}
    </div>
  );
}
