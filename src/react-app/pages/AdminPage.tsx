import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  Shield, Lock, ArrowLeft, LayoutGrid, Settings, CheckCircle2, Clock, Circle, Building2,
} from "lucide-react";
import { useKhatamState } from "@/hooks/useKhatamState";
import KhatamSelector from "@/components/khatam/KhatamSelector";
import JuzRow from "@/components/khatam/JuzRow";
import AdminSlotDrawer from "@/components/khatam/AdminSlotDrawer";
import AdminSettingsPanel from "@/components/khatam/AdminSettingsPanel";

type AdminTab = "slots" | "khatam" | "campaign";

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<AdminTab>("slots");

  const state = useKhatamState(slug ?? "");
  const {
    khatamName, campaignName, campaignDescription, campaignSearchable, campaignGoal,
    participationMode,
    slots, khatamNum, khatams, selectedKhatamId,
    loading, notFound, isSolo,
    claimLimit, showNamesOnGlobe, locationCountry,
    adminMode, adminSelected, setAdminSelected,
    adminDrawer, setAdminDrawer,
    adminPin, setAdminPin, adminErr,
    newKhatamName, setNewKhatamName,
    participants, claimLimitInput, setClaimLimitInput,
    done, prog, rem, pct, khatmComplete, isLatestKhatam,
    selectKhatam,
    tryAdmin, deactivateAdmin,
    adminSetStatus, adminAssignJuz,
    adminResetAllToAvailable, adminResetJuzToAvailable, adminDeleteKhatam,
    adminToggleGlobeNames, adminSaveClaimLimit,
    adminUpdateCampaign, adminAssignEntireQuran, adminBulkCreateRounds,
    adminRenameKhatam, adminSetParticipationMode, adminDuplicateKhatam, adminRecordCompletedKhatam,
    adminAddParticipant, adminRemoveParticipant, adminSetParticipantLimit,
    startNewKhatam,
  } = state;

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Khatam Not Found
          </h2>
          <Link to="/" className="text-[#8B0000] text-sm font-medium hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!loading && isSolo) {
    return <Navigate to={`/k/${slug}/tracker`} replace />;
  }

  if (loading && slots.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#8B0000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Admin header */}
      <header
        className="text-white px-5 py-8 border-b border-white/10"
        style={{ background: "linear-gradient(135deg, #3A0000 0%, #5A0000 50%, #8B0000 100%)" }}
      >
        <div className="max-w-[1200px] mx-auto">
          <Link
            to={`/k/${slug}/tracker`}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            Back to tracker
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <Shield size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-white/50 font-medium mb-0.5">
                  Organizer admin
                </p>
                <h1
                  className="text-2xl sm:text-3xl font-normal text-white"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {campaignName || khatamName || "Khatam"}
                </h1>
                <p className="text-sm text-white/60 mt-0.5">
                  Round {khatamNum}{khatamName ? ` · ${khatamName}` : ""} · {pct}% complete
                </p>
              </div>
            </div>

            {adminMode && (
              <button
                type="button"
                onClick={deactivateAdmin}
                className="self-start sm:self-center flex items-center gap-2 bg-white/10 border border-white/25 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <Lock size={14} />
                Lock admin
              </button>
            )}
          </div>
        </div>
      </header>

      {!adminMode ? (
        /* PIN gate */
        <div className="max-w-md mx-auto px-5 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF5F5] border border-[#8B0000]/15 flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-[#8B0000]" />
            </div>
            <h2
              className="text-xl font-semibold text-gray-900 mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Enter admin PIN
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Only organizers with the PIN can assign quarters, update names, and manage this khatam.
            </p>
            <form
              onSubmit={e => { e.preventDefault(); tryAdmin(); }}
              className="space-y-3"
            >
              <input
                type="password"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                placeholder="4–6 digit PIN"
                inputMode="numeric"
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-xl text-center text-lg tracking-widest outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
              />
              {adminErr && <p className="text-red-600 text-sm">{adminErr}</p>}
              <button
                type="submit"
                className="w-full bg-[#8B0000] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#6B0000] transition-colors"
              >
                Unlock admin panel
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <KhatamSelector khatams={khatams} selectedId={selectedKhatamId} onSelect={selectKhatam} />

          {/* Stats strip */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-[1200px] mx-auto px-5 py-4">
              {khatmComplete && isLatestKhatam && (
                <div className="rounded-xl p-4 mb-4 text-center text-white"
                  style={{ background: "linear-gradient(135deg, #5A0000, #8B0000)" }}>
                  <p className="text-sm font-medium mb-2">Alhamdulillah — this khatam is complete!</p>
                  <button
                    type="button"
                    onClick={startNewKhatam}
                    className="bg-white text-[#8B0000] px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Begin Khatam {khatamNum + 1}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: "Done", val: done, Icon: CheckCircle2, color: "#2E7D32", bg: "#E8F5E9" },
                  { label: "In progress", val: prog, Icon: Clock, color: "#F57F17", bg: "#FFF8E1" },
                  { label: "Available", val: rem, Icon: Circle, color: "#8B0000", bg: "#FFF5F5" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                    <s.Icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
                    <div className="text-2xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Playfair Display', serif" }}>
                      {s.val}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8B0000, #B71C1C)" }}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="sticky top-16 z-30 bg-[#FAFAF9]/95 backdrop-blur border-b border-gray-200">
            <div className="max-w-[1200px] mx-auto px-5 py-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("slots")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === "slots"
                    ? "bg-[#8B0000] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#8B0000]/30"
                }`}
              >
                <LayoutGrid size={15} />
                Manage slots
              </button>
              <button
                type="button"
                onClick={() => setTab("khatam")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === "khatam"
                    ? "bg-[#8B0000] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#8B0000]/30"
                }`}
              >
                <Settings size={15} />
                This Khatam
              </button>
              <button
                type="button"
                onClick={() => setTab("campaign")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === "campaign"
                    ? "bg-[#8B0000] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#8B0000]/30"
                }`}
              >
                <Building2 size={15} />
                Campaign
              </button>
            </div>
          </div>

          <div className="max-w-[1200px] mx-auto px-5 py-6">
            {tab === "slots" ? (
              <div>
                <div className="bg-[#FFF5F5] border border-[#8B0000]/15 rounded-2xl px-4 py-3 mb-5">
                  <p className="text-sm text-[#8B0000] font-medium">How to assign</p>
                  <ul className="text-xs text-[#8B0000]/80 mt-1 space-y-0.5 list-disc list-inside">
                    <li>Tap a <strong>quarter</strong> to change one slot’s status and name</li>
                    <li>Use <strong>Assign Juz</strong> to set all 4 quarters at once (claim or mark complete)</li>
                    <li>Pick a participant name or type a new one in the drawer</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                    <JuzRow
                      key={juz}
                      juz={juz}
                      slots={slots}
                      adminMode
                      adminSelected={adminSelected}
                      onSelect={(j, q) => { setAdminSelected({ juz: j, q }); setAdminDrawer({ juz: j, q }); }}
                      onOpenModal={() => {}}
                      onAdminClaimJuz={juzNum => setAdminDrawer({ juz: juzNum, q: 0 })}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl">
                <AdminSettingsPanel
                  scope={tab}
                  participants={participants}
                  claimLimit={claimLimit}
                  claimLimitInput={claimLimitInput}
                  setClaimLimitInput={setClaimLimitInput}
                  newKhatamName={newKhatamName}
                  setNewKhatamName={setNewKhatamName}
                  campaignName={campaignName}
                  campaignDescription={campaignDescription}
                  campaignSearchable={campaignSearchable}
                  campaignGoal={campaignGoal}
                  currentKhatamCount={khatams.length}
                  currentKhatamName={khatamName}
                  participationMode={participationMode}
                  canAssignEntireQuran={rem === 120}
                  locationCountry={locationCountry}
                  showNamesOnGlobe={showNamesOnGlobe}
                  onAddParticipant={adminAddParticipant}
                  onRemoveParticipant={adminRemoveParticipant}
                  onSetParticipantLimit={adminSetParticipantLimit}
                  onSaveClaimLimit={adminSaveClaimLimit}
                  onSaveCampaign={adminUpdateCampaign}
                  onAssignEntireQuran={adminAssignEntireQuran}
                  onBulkCreateRounds={adminBulkCreateRounds}
                  onRenameKhatam={adminRenameKhatam}
                  onSetParticipationMode={adminSetParticipationMode}
                  onDuplicateKhatam={adminDuplicateKhatam}
                  onRecordCompletedKhatam={adminRecordCompletedKhatam}
                  onStartNewKhatam={startNewKhatam}
                  onToggleGlobeNames={adminToggleGlobeNames}
                  onResetAll={adminResetAllToAvailable}
                  onDeleteKhatam={adminDeleteKhatam}
                />
              </div>
            )}
          </div>

          <AdminSlotDrawer
            open={!!adminDrawer}
            onClose={() => { setAdminDrawer(null); setAdminSelected(null); }}
            juz={adminDrawer?.juz ?? 1}
            q={adminDrawer?.q ?? 0}
            slots={slots}
            participants={participants}
            onAssign={async (j, q, st, name) => {
              setAdminSelected({ juz: j, q });
              await adminSetStatus(st, name, j, q);
            }}
            onAssignJuz={async (j, st, name) => adminAssignJuz(j, st, name)}
            onResetJuz={async j => adminResetJuzToAvailable(j)}
          />
        </>
      )}
    </div>
  );
}
