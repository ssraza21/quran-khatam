import { useParams } from "react-router-dom";
import { useKhatamState } from "@/hooks/useKhatamState";
import type { GroupName } from "@/hooks/useKhatamState";
import { COLORS, Q_SHORT } from "@/lib/constants";
import type { StatusKey } from "@/lib/types";
import JuzRow from "@/components/khatam/JuzRow";
import SlotDrawer from "@/components/khatam/SlotDrawer";
import KhatamSelector from "@/components/khatam/KhatamSelector";

export default function KhatamPage() {
  const { group: groupParam } = useParams<{ group: string }>();
  const group: GroupName = groupParam === "sisters" ? "sisters" : "brothers";

  const state = useKhatamState(group);
  const {
    slots, khatamNum, khatams, selectedKhatamId, isLatestKhatam,
    loading, modal, setModal,
    adminMode, adminSelected, setAdminSelected,
    adminPw, setAdminPw, adminErr,
    done, prog, rem, pct, khatmComplete,
    getSlot, onBook, onComplete,
    selectKhatam,
    startNewKhatam, tryAdmin, adminSetStatus, deactivateAdmin,
    adminResetAllToAvailable, adminResetJuzToAvailable,
  } = state;

  const modalSlot = modal ? getSlot(modal.juz, modal.q) : null;

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
        {/* Pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill-opacity='0.15'/%3E%3Cpath d='M40 10l30 30-30 30L10 40z' fill='none' stroke='%23fff' stroke-opacity='0.1'/%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        <div className="relative max-w-[1200px] mx-auto">
          <h1 className="text-[40px] sm:text-[46px] mb-1 font-normal tracking-widest text-white"
            style={{ fontFamily: "Playfair Display, serif" }}>
            {group === "brothers" ? "Brothers" : "Sisters"} Khatam
          </h1>
          <div className="inline-flex items-center gap-2 bg-white/12 border border-white/20 rounded-full px-5 py-1.5 text-sm font-medium">
            Khatam #{khatamNum}
            {adminMode && (
              <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-semibold tracking-wider">
                ADMIN
              </span>
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
              {isLatestKhatam && (
                <button onClick={startNewKhatam}
                  className="bg-white text-[#8B0000] border-none px-7 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                  Begin Khatam {khatamNum + 1}
                </button>
              )}
            </div>
          )}

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

          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8B0000, #B71C1C)" }} />
          </div>
          <div className="text-xs text-gray-400 text-right pt-1.5 font-medium">{pct}% complete</div>
        </div>
      </div>

      {/* Juz List */}
      <div className="max-w-[1200px] mx-auto px-5 py-6">
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
            <JuzRow key={juz} juz={juz} slots={slots}
              adminMode={adminMode} adminSelected={adminSelected}
              onSelect={(j, q) => setAdminSelected({ juz: j, q })}
              onOpenModal={(j, q) => setModal({ juz: j, q })} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <section className="bg-white border-t border-gray-200 py-8 px-5">
        <div className="max-w-[1200px] mx-auto flex justify-center gap-8 flex-wrap">
          {(["av", "cl", "dn"] as StatusKey[]).map(k => (
            <div key={k} className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded" style={{ background: COLORS[k].accent }} />
              <span className="text-sm text-gray-500 font-medium">{COLORS[k].label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Admin CTA Section */}
      <section className="text-white text-center px-5 py-12"
        style={{ background: "linear-gradient(135deg, #5A0000, #3A0000)" }}>
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Organizer Admin
          </h2>
          <p className="opacity-60 mb-6 text-sm">Manage the Khatam, override statuses, and start new completions.</p>

          {!adminMode ? (
            <div className="flex gap-3 justify-center max-w-[400px] mx-auto">
              <input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)}
                onKeyDown={e => e.key === "Enter" && tryAdmin()}
                placeholder="Admin password"
                className="flex-1 bg-white/10 border border-white/25 text-white px-4 py-2.5 rounded-full text-sm outline-none placeholder:text-white/40 focus:border-white/50 transition-colors"
              />
              <button onClick={tryAdmin}
                className="bg-white text-[#8B0000] border-none px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                Unlock
              </button>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <p className="text-green-300 mb-4 font-medium text-sm">
                Admin active — tap any quarter above to select it
              </p>
              {adminSelected && (
                <p className="text-white/60 text-sm mb-3">
                  Selected: Juz {adminSelected.juz} {Q_SHORT[adminSelected.q - 1]} ({getSlot(adminSelected.juz, adminSelected.q)?.by || "unclaimed"})
                </p>
              )}
              <div className="flex gap-2 justify-center flex-wrap mb-3">
                {(["av", "cl", "dn"] as StatusKey[]).map(st => (
                  <button key={st} onClick={() => adminSetStatus(st)}
                    className="bg-white/10 border border-white/25 text-white px-4 py-2 rounded-full text-sm cursor-pointer hover:bg-white/20 transition-colors font-medium">
                    Set {COLORS[st].label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 items-center">
                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    onClick={startNewKhatam}
                    className="bg-white text-[#8B0000] border-none px-5 py-2 rounded-full text-sm cursor-pointer font-semibold hover:bg-gray-100 transition-colors"
                  >
                    + New Khatam
                  </button>
                  <button
                    onClick={deactivateAdmin}
                    className="bg-transparent border border-white/30 text-white/80 px-5 py-2 rounded-full text-sm cursor-pointer hover:bg-white/10 font-medium transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
                <div className="flex gap-2 justify-center flex-wrap mt-1">
                  {adminSelected && (
                    <button
                      onClick={adminResetJuzToAvailable}
                      className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-full text-xs cursor-pointer hover:bg-white/20 transition-colors font-medium"
                    >
                      Reset Juz {adminSelected.juz} to Available
                    </button>
                  )}
                  <button
                    onClick={adminResetAllToAvailable}
                    className="bg-red-600/80 border border-red-300/60 text-white px-4 py-2 rounded-full text-xs cursor-pointer hover:bg-red-600 transition-colors font-semibold"
                  >
                    Reset Entire Khatam to Available
                  </button>
                </div>
              </div>
            </div>
          )}
          {adminErr && <p className="text-red-300 mt-3 text-sm">{adminErr}</p>}
        </div>
      </section>

      {/* Drawer Modal */}
      <SlotDrawer
        slot={modalSlot}
        juz={modal?.juz ?? 0}
        q={modal?.q ?? 0}
        open={!!modal}
        onClose={() => setModal(null)}
        onBook={onBook}
        onComplete={onComplete}
      />
    </>
  );
}
