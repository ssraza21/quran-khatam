import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useKhatamState } from "@/hooks/useKhatamState";
import { COLORS, JUZ_NAMES } from "@/lib/constants";
import type { StatusKey } from "@/lib/types";
import JuzRow from "@/components/khatam/JuzRow";
import SlotDrawer from "@/components/khatam/SlotDrawer";
import AdminSlotDrawer from "@/components/khatam/AdminSlotDrawer";
import KhatamSelector from "@/components/khatam/KhatamSelector";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { buildWhatsAppKhatamMessage } from "@/lib/helpers";
import { toast } from "sonner";
import {
  Users, UserPlus, X, BookOpen, Lock, RotateCcw, Trash2, Sliders,
} from "lucide-react";

export default function KhatamPage() {
  const { slug } = useParams<{ slug: string }>();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [juzModal, setJuzModal] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"juz" | "quarters">("juz");

  // Persistent claimer name — remembered across sessions
  const [savedName, setSavedName] = useState<string>(() => localStorage.getItem("qk_claimer") ?? "");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const persistName = (n: string) => {
    setSavedName(n);
    if (n) localStorage.setItem("qk_claimer", n);
    else localStorage.removeItem("qk_claimer");
  };

  // Quick-claim from Juz grid (bypasses drawer when name is known)
  const [quickClaimLoading, setQuickClaimLoading] = useState<number | null>(null);
  const [shareAfterClaim, setShareAfterClaim] = useState<{ juz: number } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const handleQuickClaim = async (juz: number) => {
    if (!savedName) { setJuzModal(juz); return; }
    setQuickClaimLoading(juz);
    const res = await onBookJuz(juz, savedName);
    setQuickClaimLoading(null);
    if (res?.err) { toast.error(res.err); return; }
    setShareAfterClaim({ juz });
  };

  const [participantInput, setParticipantInput] = useState("");

  const state = useKhatamState(slug ?? "");
  const {
    khatamName, slots, khatamNum, khatams, selectedKhatamId, isLatestKhatam,
    loading, notFound, modal, setModal,
    isSolo, claimLimit,
    showNamesOnGlobe, locationCountry,
    adminMode, adminSelected, setAdminSelected,
    adminDrawer, setAdminDrawer,
    adminPin, setAdminPin, adminErr,
    newKhatamName, setNewKhatamName,
    participants, claimLimitInput, setClaimLimitInput,
    done, prog, rem, pct, khatmComplete,
    getSlot, onBook, onBookJuz, onComplete, onSoloToggle,
    selectKhatam,
    startNewKhatam, soloStartNewKhatam, soloResetAll, soloDeleteKhatam,
    tryAdmin, adminSetStatus, adminAssignJuz, deactivateAdmin,
    adminResetAllToAvailable, adminResetJuzToAvailable, adminDeleteKhatam,
    adminToggleGlobeNames,
    adminSaveClaimLimit,
    adminAddParticipant, adminRemoveParticipant,
  } = state;

  const modalSlot = modal ? getSlot(modal.juz, modal.q) : null;

  const handleShare = () => {
    const url = `${window.location.origin}/k/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const waMessage = buildWhatsAppKhatamMessage(khatamName || "Khatam", slug ?? "", slots);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  const handleWaCopy = () => {
    navigator.clipboard.writeText(waMessage).then(() => {
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    }).catch(() => toast.error("Failed to copy"));
  };

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            Khatam Not Found
          </h2>
          <p className="text-gray-500 text-sm mb-6">No khatam exists with the slug "{slug}".</p>
          <Link to="/"
            className="bg-[#8B0000] text-white px-6 py-2.5 rounded-full text-sm font-semibold no-underline hover:bg-[#6B0000] transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading && slots.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#8B0000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading Khatam...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Header */}
      <header className="relative overflow-hidden text-white text-center py-12 px-5"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill-opacity='0.15'/%3E%3Cpath d='M40 10l30 30-30 30L10 40z' fill='none' stroke='%23fff' stroke-opacity='0.1'/%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        <div className="relative max-w-[1200px] mx-auto">
          <h1 className="text-[40px] sm:text-[46px] mb-1 font-normal tracking-widest text-white"
            style={{ fontFamily: "Playfair Display, serif" }}>
            {khatamName || "Khatam"}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <button
              onClick={handleShare}
              className="bg-white/10 border border-white/25 text-white px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:bg-white/20 transition-colors"
            >
              {isSolo ? "Copy Private Link" : "Copy Link"}
            </button>
            {!isSolo && (
              <button
                onClick={() => setShowWhatsApp(true)}
                className="bg-[#25D366]/20 border border-[#25D366]/50 text-white px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[#25D366]/35 transition-colors"
              >
                📲 WhatsApp
              </button>
            )}
            {!isSolo && (
              <Link
                to={`/k/${slug}/metrics`}
                className="bg-white/10 border border-white/25 text-white px-4 py-1.5 rounded-full text-xs font-medium no-underline hover:bg-white/20 transition-colors"
              >
                View Metrics
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Khatam Selector */}
      <KhatamSelector
        khatams={khatams}
        selectedId={selectedKhatamId}
        onSelect={selectKhatam}
      />

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-5 py-4">
          {khatmComplete && (
            <div className="rounded-xl p-5 mb-4 text-center text-white animate-pulse"
              style={{ background: "linear-gradient(135deg, #5A0000, #8B0000)" }}>
              <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Alhamdulillah — Khatam {khatamNum} Complete!
              </h2>
              <p className="text-sm opacity-80 mb-4">May Allah accept from everyone who participated.</p>
              {isLatestKhatam && (adminMode || isSolo) && (
                <button onClick={isSolo ? soloStartNewKhatam : startNewKhatam}
                  className="bg-white text-[#8B0000] border-none px-7 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                  Begin Khatam {khatamNum + 1}
                </button>
              )}
            </div>
          )}

          {isSolo ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "Completed", val: done, color: "#2E7D32", bg: "#E8F5E9" },
                { label: "Remaining", val: rem, color: "#8B0000", bg: "#FFF5F5" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3.5 text-center"
                  style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                  <div className="text-3xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Playfair Display', serif" }}>
                    {s.val}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Completed", val: done, color: "#2E7D32", bg: "#E8F5E9" },
                { label: "In Progress", val: prog, color: "#F57F17", bg: "#FFF8E1" },
                { label: "Remaining", val: rem, color: "#8B0000", bg: "#FFF5F5" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3.5 text-center"
                  style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                  <div className="text-3xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Playfair Display', serif" }}>
                    {s.val}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8B0000, #B71C1C)" }} />
          </div>
          <div className="text-xs text-gray-400 text-right pt-1.5 font-medium">{pct}% complete</div>
        </div>
      </div>

      {/* View Toggle + Juz List */}
      <div className="max-w-[1200px] mx-auto px-5 py-6">
        {/* Toggle (community only — solo has no juz-level claim) */}
        {!isSolo && !adminMode && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setViewMode("juz")}
                className={`px-5 py-2 text-sm font-medium transition-colors ${viewMode === "juz" ? "bg-[#8B0000] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                By Juz
              </button>
              <button
                onClick={() => setViewMode("quarters")}
                className={`px-5 py-2 text-sm font-medium transition-colors ${viewMode === "quarters" ? "bg-[#8B0000] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                By Quarter
              </button>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              {viewMode === "juz" ? "Click a Juz to claim all 4 quarters at once" : "Expand a Juz to claim individual quarters"}
            </p>
          </div>
        )}

        {/* Juz Grid View */}
        {(viewMode === "juz" && !isSolo && !adminMode) && (
          <>
            {/* "Claiming as" identity bar */}
            <div className="mb-4 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              {editingName ? (
                <form
                  className="flex items-center gap-2 flex-1"
                  onSubmit={e => {
                    e.preventDefault();
                    const n = nameInput.trim();
                    if (n) persistName(n);
                    setEditingName(false);
                  }}
                >
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={60}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#8B0000] transition-colors"
                  />
                  <button type="submit" className="text-sm font-semibold text-[#8B0000] px-3 py-1.5 rounded-lg bg-[#FFF5F5] hover:bg-[#8B0000] hover:text-white transition-colors">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-sm text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </form>
              ) : savedName ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-[#FFF5F5] border border-[#8B0000]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#8B0000] text-sm font-bold">{savedName[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 leading-none mb-0.5">Claiming as</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{savedName}</p>
                  </div>
                  <button
                    onClick={() => { setNameInput(savedName); setEditingName(true); }}
                    className="text-xs text-gray-400 hover:text-[#8B0000] transition-colors shrink-0 font-medium"
                  >
                    Change
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-400 text-lg">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Who's claiming?</p>
                    <p className="text-xs text-gray-400">Set your name to claim Juz in one tap</p>
                  </div>
                  <button
                    onClick={() => { setNameInput(""); setEditingName(true); }}
                    className="text-xs font-semibold text-[#8B0000] bg-[#FFF5F5] border border-[#8B0000]/20 px-3 py-1.5 rounded-full hover:bg-[#8B0000] hover:text-white transition-colors shrink-0"
                  >
                    Set name
                  </button>
                </>
              )}
            </div>

            {/* Juz cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
                const juzSlots = slots.filter(s => s.juz === juz);
                const doneCount = juzSlots.filter(s => s.status === "dn").length;
                const claimedCount = juzSlots.filter(s => s.status === "cl").length;
                const allDone = doneCount === 4;
                const allAvailable = juzSlots.length === 4 && juzSlots.every(s => s.status === "av");
                const names = [...new Set(juzSlots.map(s => s.by).filter(Boolean) as string[])];
                const hasClaimed = claimedCount > 0 || (doneCount > 0 && !allDone);
                const isLoading = quickClaimLoading === juz;

                return (
                  <div
                    key={juz}
                    className={`rounded-2xl p-4 border transition-all duration-200 select-none ${allAvailable && !isLoading ? "cursor-pointer hover:shadow-md hover:border-[#8B0000]/40 hover:-translate-y-0.5 active:translate-y-0" : ""
                      }`}
                    style={{
                      background: isLoading ? "#FFF5F5" : allDone ? "#E8F5E9" : hasClaimed ? "#FFFDE7" : "white",
                      borderColor: isLoading ? "#8B0000" : allDone ? "#2E7D32" : hasClaimed ? "#F9A825" : "#E5E7EB",
                    }}
                    onClick={() => allAvailable && !isLoading && handleQuickClaim(juz)}
                  >
                    <div
                      className="text-2xl font-bold leading-none"
                      style={{ fontFamily: "'Playfair Display', serif", color: allDone ? "#2E7D32" : "#8B0000" }}
                    >
                      {isLoading ? (
                        <span className="inline-block w-5 h-5 border-2 border-[#8B0000] border-t-transparent rounded-full animate-spin align-middle" />
                      ) : juz}
                    </div>
                    <div
                      className="text-[11px] text-gray-400 italic truncate mt-0.5"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {JUZ_NAMES[juz - 1]}
                    </div>

                    <div className="flex gap-0.5 mt-2.5">
                      {juzSlots.map((s, i) => (
                        <div
                          key={i}
                          className="flex-1 h-1.5 rounded-full"
                          style={{
                            background: s.status === "dn" ? COLORS.dn.accent : s.status === "cl" ? COLORS.cl.accent : "#E0E0E0",
                          }}
                        />
                      ))}
                    </div>

                    {names.length > 0 && (
                      <p className="text-[11px] text-gray-600 mt-2 font-medium truncate leading-tight">
                        {names.join(", ")}
                      </p>
                    )}

                    {allDone && <p className="text-[11px] text-green-700 mt-2 font-semibold">✓ Complete</p>}

                    {allAvailable && !isLoading && (
                      <div className="mt-2.5 text-[11px] font-semibold text-[#8B0000] opacity-60">
                        {savedName ? `Tap to claim` : "Tap to claim →"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Quarters Accordion View */}
        {(viewMode === "quarters" || isSolo || adminMode) && (
          <>
            {isSolo && (
              <p className="text-xs text-gray-400 text-center mb-4">Tap a quarter to mark it complete. Tap again to undo.</p>
            )}
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                <JuzRow key={juz} juz={juz} slots={slots}
                  adminMode={adminMode} adminSelected={adminSelected}
                  onSelect={(j, q) => { setAdminSelected({ juz: j, q }); setAdminDrawer({ juz: j, q }); }}
                  onOpenModal={(j, q) => setModal({ juz: j, q })}
                  onClaimJuz={juzNum => setJuzModal(juzNum)}
                  onAdminClaimJuz={juzNum => setAdminDrawer({ juz: juzNum, q: 0 })}
                  isSolo={isSolo} onSoloToggle={onSoloToggle} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <section className="bg-white border-t border-gray-200 py-8 px-5">
        <div className="max-w-[1200px] mx-auto flex justify-center gap-8 flex-wrap">
          {(isSolo ? ["av", "dn"] as StatusKey[] : ["av", "cl", "dn"] as StatusKey[]).map(k => (
            <div key={k} className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded" style={{ background: COLORS[k].accent }} />
              <span className="text-sm text-gray-500 font-medium">{COLORS[k].label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Solo Controls Section */}
      {isSolo && (
        <section className="text-white text-center px-5 py-12"
          style={{ background: "linear-gradient(135deg, #5A0000, #3A0000)" }}>
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Your Khatam
            </h2>
            <p className="opacity-60 mb-6 text-sm">Manage your personal khatam progress.</p>

            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-2 justify-center flex-wrap items-center max-w-[400px] w-full">
                <input
                  type="text"
                  value={newKhatamName}
                  onChange={e => setNewKhatamName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && soloStartNewKhatam()}
                  placeholder="Khatam name (optional)"
                  maxLength={60}
                  className="flex-1 min-w-[160px] bg-white/10 border border-white/25 text-white px-4 py-2 rounded-full text-sm outline-none placeholder:text-white/35 focus:border-white/50 transition-colors"
                />
                <button
                  onClick={soloStartNewKhatam}
                  className="bg-white text-[#8B0000] border-none px-5 py-2 rounded-full text-sm cursor-pointer font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  + New Khatam
                </button>
              </div>
              <div className="flex gap-2 justify-center flex-wrap mt-1">
                <button
                  onClick={soloResetAll}
                  className="bg-red-600/80 border border-red-300/60 text-white px-4 py-2 rounded-full text-xs cursor-pointer hover:bg-red-600 transition-colors font-semibold"
                >
                  Reset Khatam to Available
                </button>
                <button
                  onClick={soloDeleteKhatam}
                  className="bg-black/60 border border-red-400/60 text-white px-4 py-2 rounded-full text-xs cursor-pointer hover:bg-black/80 transition-colors font-semibold"
                >
                  Delete This Khatam
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Admin CTA Section (community only) */}
      {!isSolo && (
        <section className="text-white px-5 py-12"
          style={{ background: "linear-gradient(135deg, #5A0000, #3A0000)" }}>
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-1 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
              Organizer Admin
            </h2>
            <p className="opacity-60 mb-6 text-sm text-center">Manage the Khatam, assign quarters, and start new completions.</p>

            {!adminMode ? (
              <div className="flex gap-3 justify-center max-w-[400px] mx-auto">
                <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && tryAdmin()}
                  placeholder="Admin pin"
                  inputMode="numeric"
                  className="flex-1 bg-white/10 border border-white/25 text-white px-4 py-2.5 rounded-full text-sm outline-none placeholder:text-white/40 focus:border-white/50 transition-colors"
                />
                <button onClick={tryAdmin}
                  className="bg-white text-[#8B0000] border-none px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                  Unlock
                </button>
              </div>
            ) : (
              <div className="animate-fadeIn space-y-5">
                <p className="text-green-300 text-center font-medium text-sm">
                  Admin active — tap any quarter or Juz to assign it
                </p>

                {/* ── Participants ───────────────────────────────── */}
                <div className="bg-white/8 border border-white/15 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-white/60" />
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Participants</span>
                  </div>

                  {/* Participant chips */}
                  {participants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map(p => (
                        <span key={p} className="flex items-center gap-1 bg-white/10 border border-white/20 text-white text-xs px-2.5 py-1 rounded-full">
                          {p}
                          <button
                            onClick={() => adminRemoveParticipant(p)}
                            className="text-white/40 hover:text-white/80 transition-colors ml-0.5"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {participants.length === 0 && (
                    <p className="text-xs text-white/40 italic">No participants added yet</p>
                  )}

                  {/* Add participant */}
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      const n = participantInput.trim();
                      if (!n) return;
                      await adminAddParticipant(n);
                      setParticipantInput("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={participantInput}
                      onChange={e => setParticipantInput(e.target.value)}
                      placeholder="Add participant name"
                      maxLength={60}
                      className="flex-1 bg-white/10 border border-white/25 text-white px-3 py-2 rounded-full text-sm outline-none placeholder:text-white/35 focus:border-white/50 transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-full text-sm cursor-pointer hover:bg-white/25 transition-colors flex items-center gap-1.5 font-medium whitespace-nowrap"
                    >
                      <UserPlus size={13} />
                      Add
                    </button>
                  </form>
                </div>

                {/* ── Khatam Management ──────────────────────────── */}
                <div className="bg-white/8 border border-white/15 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} className="text-white/60" />
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Khatam</span>
                  </div>

                  {/* New khatam */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newKhatamName}
                      onChange={e => setNewKhatamName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && startNewKhatam()}
                      placeholder="Name (optional)"
                      maxLength={60}
                      className="flex-1 bg-white/10 border border-white/25 text-white px-3 py-2 rounded-full text-sm outline-none placeholder:text-white/35 focus:border-white/50 transition-colors"
                    />
                    <button
                      onClick={startNewKhatam}
                      className="bg-white text-[#8B0000] border-none px-4 py-2 rounded-full text-sm cursor-pointer font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                      <BookOpen size={13} />
                      New Khatam
                    </button>
                  </div>

                  {/* Claim limit */}
                  <div className="flex gap-2 items-center">
                    <Sliders size={13} className="text-white/50 shrink-0" />
                    <span className="text-xs text-white/60 shrink-0">Claim limit</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={claimLimitInput}
                      onChange={e => setClaimLimitInput(Number(e.target.value))}
                      className="w-16 bg-white/10 border border-white/25 text-white px-2.5 py-1.5 rounded-lg text-sm outline-none text-center focus:border-white/50 transition-colors"
                    />
                    <span className="text-xs text-white/40 shrink-0">quarters per person</span>
                    {claimLimitInput !== claimLimit && (
                      <button
                        onClick={adminSaveClaimLimit}
                        className="ml-auto bg-white/15 border border-white/30 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/25 transition-colors font-medium"
                      >
                        Save
                      </button>
                    )}
                  </div>

                  {locationCountry && (
                    <button
                      onClick={adminToggleGlobeNames}
                      className="w-full bg-white/10 border border-white/25 text-white/80 px-4 py-2 rounded-full text-xs cursor-pointer hover:bg-white/20 transition-colors text-left flex items-center gap-2"
                    >
                      🌍 {showNamesOnGlobe ? "Hide names on World Globe" : "Show names on World Globe"}
                    </button>
                  )}
                </div>

                {/* ── Controls ───────────────────────────────────── */}
                <div className="flex justify-center">
                  <button
                    onClick={deactivateAdmin}
                    className="bg-transparent border border-white/30 text-white/80 px-6 py-2.5 rounded-full text-sm cursor-pointer hover:bg-white/10 font-medium transition-colors flex items-center gap-2"
                  >
                    <Lock size={13} />
                    Deactivate Admin
                  </button>
                </div>

                {/* ── Danger Zone ────────────────────────────────── */}
                <div className="bg-red-950/40 border border-red-400/20 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-red-300/60 uppercase tracking-wider">Danger zone</span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={adminResetAllToAvailable}
                      className="flex-1 min-w-[140px] bg-red-600/60 border border-red-300/40 text-white px-4 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-red-600/80 transition-colors font-semibold flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      Reset All Slots
                    </button>
                    <button
                      onClick={adminDeleteKhatam}
                      className="flex-1 min-w-[140px] bg-black/50 border border-red-400/40 text-white px-4 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-black/70 transition-colors font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      Delete Khatam
                    </button>
                  </div>
                </div>
              </div>
            )}
            {adminErr && <p className="text-red-300 mt-3 text-sm text-center">{adminErr}</p>}
          </div>
        </section>
      )}

      {/* Admin slot/juz assignment drawer (community only) */}
      {!isSolo && adminMode && (
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
          onResetJuz={async (j) => adminResetJuzToAvailable(j)}
        />
      )}

      {/* Quarter claim drawer (community only) */}
      {!isSolo && (
        <SlotDrawer
          slot={modalSlot}
          juz={modal?.juz ?? 0}
          q={modal?.q ?? 0}
          open={!!modal}
          onClose={() => setModal(null)}
          onBook={onBook}
          onBookJuz={onBookJuz}
          onComplete={onComplete}
          khatamName={khatamName || "Khatam"}
          slug={slug ?? ""}
          slots={slots}
          defaultName={savedName}
          onNameUsed={persistName}
        />
      )}

      {/* Entire-Juz claim drawer (community only) — fallback when no name saved */}
      {!isSolo && (
        <SlotDrawer
          slot={null}
          juz={juzModal ?? 0}
          q={0}
          open={juzModal !== null}
          onClose={() => setJuzModal(null)}
          onBook={onBook}
          onBookJuz={onBookJuz}
          onComplete={onComplete}
          khatamName={khatamName || "Khatam"}
          slug={slug ?? ""}
          slots={slots}
          defaultName={savedName}
          onNameUsed={n => { persistName(n); setJuzModal(null); setShareAfterClaim({ juz: juzModal! }); }}
        />
      )}

      {/* Floating share bar after quick-claim */}
      {shareAfterClaim && (() => {
        const shareMsg = buildWhatsAppKhatamMessage(khatamName || "Khatam", slug ?? "", slots);
        const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;
        return (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-2xl animate-slideUp">
            <div className="max-w-lg mx-auto pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Juz {shareAfterClaim.juz} claimed as <span className="text-[#8B0000]">{savedName}</span>
                </p>
                <button onClick={() => setShareAfterClaim(null)} className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareMsg).then(() => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    });
                  }}
                  className={`flex-1 h-10 rounded-full text-sm font-semibold transition-colors ${shareCopied ? "bg-green-600 text-white" : "bg-[#8B0000] hover:bg-[#6B0000] text-white"}`}
                >
                  {shareCopied ? "Copied!" : "Copy Message"}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-10 rounded-full text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white flex items-center justify-center transition-colors"
                >
                  Open in WhatsApp
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* WhatsApp share drawer (community only) */}
      {!isSolo && (
        <Drawer open={showWhatsApp} onOpenChange={o => !o && setShowWhatsApp(false)}>
          <DrawerContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col">
            <DrawerHeader className="pt-6 pb-3 flex-none">
              <DrawerTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Share to WhatsApp
              </DrawerTitle>
              <p className="text-sm text-gray-400 mt-1">
                Copy this message and paste it into your WhatsApp group. Participants can tap the link to claim their Juz.
              </p>
            </DrawerHeader>

            <div className="px-4 pb-6 flex-1 overflow-y-auto">
              <div className="bg-[#f0faf0] border border-green-200 rounded-xl px-4 py-3 mb-4 font-mono text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {waMessage}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleWaCopy}
                  className={`flex-1 h-12 rounded-full text-sm font-semibold transition-all duration-200 ${waCopied
                    ? "bg-green-600 text-white"
                    : "bg-[#8B0000] hover:bg-[#6B0000] text-white"
                    }`}
                >
                  {waCopied ? "Copied!" : "Copy Message"}
                </button>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-12 rounded-full text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white flex items-center justify-center transition-colors"
                >
                  Open in WhatsApp
                </a>
              </div>

              <DrawerClose asChild>
                <button className="w-full mt-3 h-10 rounded-full text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                  Done
                </button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
