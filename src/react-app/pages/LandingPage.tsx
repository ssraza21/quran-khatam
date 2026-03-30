import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe } from "@/components/ui/globe";
import { api } from "@/lib/api";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function LandingPage() {
  const navigate = useNavigate();

  // Create form state
  const [cName, setCName] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cSlugEdited, setCSlugEdited] = useState(false);
  const [cPin, setCPin] = useState("");
  const [cPinConfirm, setCPinConfirm] = useState("");
  const [cErr, setCErr] = useState("");
  const [cLoading, setCLoading] = useState(false);

  // Join form state
  const [jSlug, setJSlug] = useState("");
  const [jErr, setJErr] = useState("");
  const [jLoading, setJLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setCName(val);
    if (!cSlugEdited) setCSlug(nameToSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setCSlugEdited(true);
    setCSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCErr("");

    if (!cName.trim()) { setCErr("Name is required"); return; }
    if (!cSlug || cSlug.length < 3) { setCErr("Slug must be at least 3 characters"); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(cSlug)) { setCErr("Slug must start and end with a letter or number"); return; }
    if (!/^\d{4,6}$/.test(cPin)) { setCErr("Pin must be 4-6 digits"); return; }
    if (cPin !== cPinConfirm) { setCErr("Pins don't match"); return; }

    setCLoading(true);
    try {
      await api.createKhatam(cName.trim(), cSlug, cPin);
      navigate(`/k/${cSlug}`);
    } catch (err: any) {
      setCErr(err.message || "Failed to create khatam");
    } finally {
      setCLoading(false);
    }
  };

  const parseSlugFromInput = (input: string): string => {
    const trimmed = input.trim();
    // Try to extract slug from a URL like /k/my-slug or full URL
    const urlMatch = trimmed.match(/\/k\/([a-z0-9][a-z0-9-]*[a-z0-9])/);
    if (urlMatch) return urlMatch[1];
    // Otherwise treat as raw slug
    return trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJErr("");

    const slug = parseSlugFromInput(jSlug);
    if (!slug) { setJErr("Please enter a valid slug or URL"); return; }

    setJLoading(true);
    try {
      await api.getKhatam(slug);
      navigate(`/k/${slug}`);
    } catch {
      setJErr("Khatam not found. Check the slug and try again.");
    } finally {
      setJLoading(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white text-center"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 50%, #3A0000 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.06,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpolygon points='60,5 95,30 95,75 60,100 25,75 25,30'/%3E%3Cpolygon points='60,20 82,35 82,70 60,85 38,70 38,35'/%3E%3Cline x1='60' y1='5' x2='60' y2='20'/%3E%3Cline x1='95' y1='30' x2='82' y2='35'/%3E%3Cline x1='95' y1='75' x2='82' y2='70'/%3E%3Cline x1='60' y1='100' x2='60' y2='85'/%3E%3Cline x1='25' y1='75' x2='38' y2='70'/%3E%3Cline x1='25' y1='30' x2='38' y2='35'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center z-0 opacity-40 translate-y-60 md:translate-y-48 pointer-events-none md:pointer-events-auto">
          <Globe className="relative w-[500px] h-[500px] md:w-[700px] md:h-[700px]" />
        </div>

        <div className="relative max-w-[900px] mx-auto px-5 pt-16 pb-24 md:pt-20 md:pb-32 z-10">
          <h1 className="text-5xl md:text-7xl mb-4 font-normal tracking-wider text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Quran Khatam
          </h1>

          <p className="text-base md:text-lg text-white/70 max-w-[600px] mx-auto mb-10 leading-relaxed">
            Come together as a community to complete the recitation of the entire Quran.
            Create a khatam, share the link, and track progress together.
          </p>
        </div>
      </section>

      {/* Objective Section */}
      <section className="py-16 md:py-20 px-5 bg-bg-light">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-3xl md:text-4xl mb-6"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            Complete the Quran Together
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed max-w-[700px] mx-auto">
            The Quran Khatam is a beautiful tradition where community members divide the 30 Juz (sections) of the
            Quran among themselves, each reading their assigned portion. Together, the entire Quran is completed
            as a collective act of worship — strengthening bonds and earning shared reward.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-[4px] text-[#8B0000] font-medium mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Create a Khatam", desc: "Start a new khatam for your community, family, or friends with a simple form.", icon: "📖" },
              { num: "2", title: "Share the Link", desc: "Share the unique link with your group so everyone can participate.", icon: "🔗" },
              { num: "3", title: "Claim & Recite", desc: "Each person claims a quarter of a Juz and recites it at their own pace.", icon: "🤲" },
              { num: "4", title: "Complete Together", desc: "Mark your portion as complete. Together, you complete the entire Quran!", icon: "✅" },
            ].map(step => (
              <div key={step.num} className="bg-[#FAFAFA] rounded-2xl p-7 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#8B0000] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}>
                  {step.num}
                </div>
                <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create / Join Section */}
      <section className="py-16 md:py-20 px-5 bg-bg-light">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create a Khatam */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Create a Khatam
              </h3>
              <p className="text-sm text-gray-400 mb-6">Start a new khatam for your community</p>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Khatam Name</label>
                  <input
                    type="text"
                    value={cName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Ramadan 2026 Family"
                    maxLength={60}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">URL Slug</label>
                  <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#8B0000] transition-colors">
                    <span className="text-xs text-gray-400 pl-3 shrink-0">/k/</span>
                    <input
                      type="text"
                      value={cSlug}
                      onChange={e => handleSlugChange(e.target.value)}
                      placeholder="ramadan-2026-family"
                      maxLength={60}
                      className="flex-1 px-2 py-2.5 text-sm outline-none border-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Admin Pin</label>
                    <input
                      type="password"
                      value={cPin}
                      onChange={e => setCPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="4-6 digits"
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Confirm Pin</label>
                    <input
                      type="password"
                      value={cPinConfirm}
                      onChange={e => setCPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Repeat pin"
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                    />
                  </div>
                </div>

                {cErr && <p className="text-red-500 text-sm">{cErr}</p>}

                <button
                  type="submit"
                  disabled={cLoading}
                  className="bg-[#8B0000] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50"
                >
                  {cLoading ? "Creating..." : "Create Khatam"}
                </button>
              </form>
            </div>

            {/* Join a Khatam */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Join a Khatam
              </h3>
              <p className="text-sm text-gray-400 mb-6">Enter a slug or paste a link to join</p>

              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Khatam Slug or URL</label>
                  <input
                    type="text"
                    value={jSlug}
                    onChange={e => { setJSlug(e.target.value); setJErr(""); }}
                    placeholder="e.g. ramadan-2026-family or paste URL"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                  />
                </div>

                {jErr && <p className="text-red-500 text-sm">{jErr}</p>}

                <button
                  type="submit"
                  disabled={jLoading}
                  className="bg-white text-[#8B0000] border-2 border-[#8B0000] px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#FFF5F5] transition-colors disabled:opacity-50"
                >
                  {jLoading ? "Looking up..." : "Join Khatam"}
                </button>
              </form>

              <div className="mt-10 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Don't have a link? Ask your group organizer for the khatam slug.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-white text-center px-5 py-20"
        style={{ background: "linear-gradient(135deg, #5A0000, #3A0000)" }}>
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Ready to Begin?
          </h2>
          <p className="text-white/60 mb-8 text-base leading-relaxed">
            Create a khatam for your community in seconds. Every verse counts, every reader matters.
          </p>
        </div>
      </section>
    </>
  );
}
