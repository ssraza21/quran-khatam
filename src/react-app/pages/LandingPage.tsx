import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Globe } from "@/components/ui/globe";
import { api } from "@/lib/api";
import type { CampaignSearchResult } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const LANDING_SECTION_HIGHLIGHT_MS = 2600;

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createCardRef = useRef<HTMLDivElement>(null);
  const joinCardRef = useRef<HTMLDivElement>(null);
  const [highlightedCard, setHighlightedCard] = useState<null | "create" | "join">(null);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (id !== "create-khatam" && id !== "join-khatam") return;

    const el = id === "create-khatam" ? createCardRef.current : joinCardRef.current;
    if (!el) return;

    const scrollAndHighlight = () => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCard(id === "create-khatam" ? "create" : "join");
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollAndHighlight));

    const t = window.setTimeout(() => setHighlightedCard(null), LANDING_SECTION_HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [location.hash]);

  // Create form state
  const [cName, setCName] = useState("");
  const [cRoundName, setCRoundName] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cSearchable, setCSearchable] = useState(true);
  const [cSlug, setCSlug] = useState("");
  const [cSlugEdited, setCSlugEdited] = useState(false);
  const [cPin, setCPin] = useState("");
  const [cPinConfirm, setCPinConfirm] = useState("");
  const [cErr, setCErr] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [isSolo, setIsSolo] = useState(false);

  // Location state (for create form)
  const [cCountry, setCCountry] = useState("");
  const [cCity, setCCity] = useState("");
  const [cShowNames, setCShowNames] = useState(true);

  // Join form state
  const [jSlug, setJSlug] = useState("");
  const [jErr, setJErr] = useState("");
  const [jLoading, setJLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CampaignSearchResult[]>([]);

  const handleNameChange = (val: string) => {
    setCName(val);
    if (!cSlugEdited) setCSlug(nameToSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setCSlugEdited(true);
    setCSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 55));
  };

  const handleModeToggle = (solo: boolean) => {
    setIsSolo(solo);
    setCErr("");
    setCPin("");
    setCPinConfirm("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCErr("");

    if (!cName.trim()) { setCErr("Name is required"); return; }

    if (isSolo) {
      if (!cSlug || cSlug.length < 2) { setCErr("Slug must be at least 2 characters"); return; }
    } else {
      if (!cSlug || cSlug.length < 3) { setCErr("Slug must be at least 3 characters"); return; }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(cSlug)) { setCErr("Slug must start and end with a letter or number"); return; }
      if (!/^\d{4,6}$/.test(cPin)) { setCErr("Pin must be 4-6 digits"); return; }
      if (cPin !== cPinConfirm) { setCErr("Pins don't match"); return; }
    }

    setCLoading(true);
    try {
      const selectedCountry = COUNTRIES.find(c => c.code === cCountry);
      const result = await api.createKhatam(
        cName.trim(),
        cSlug,
        isSolo ? "" : cPin,
        isSolo,
        cCity.trim() || undefined,
        selectedCountry?.name,
        selectedCountry?.lat,
        selectedCountry?.lng,
        isSolo ? undefined : cShowNames,
        cRoundName.trim() || undefined,
        cDescription.trim() || undefined,
        isSolo ? false : cSearchable,
      );
      navigate(`/k/${result.slug}`);
    } catch (err: any) {
      setCErr(err.message || "Failed to create khatam");
    } finally {
      setCLoading(false);
    }
  };

  const parseSlugFromInput = (input: string): string | null => {
    const trimmed = input.trim();
    // Try to extract slug from a URL like /k/my-slug or full URL
    const urlMatch = trimmed.match(/\/k\/([a-z0-9][a-z0-9-]*[a-z0-9])/);
    if (urlMatch) return urlMatch[1];
    // A plain slug can still be opened directly. Other text becomes a search.
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(trimmed) ? trimmed.toLowerCase() : null;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJErr("");

    const query = jSlug.trim();
    if (query.length < 2) { setJErr("Enter at least 2 characters"); return; }

    setJLoading(true);
    try {
      const slug = parseSlugFromInput(query);
      if (slug) {
        try {
          await api.getKhatam(slug);
          navigate(`/k/${slug}`);
          return;
        } catch {
          // It may be a campaign name/alias rather than an exact slug.
        }
      }

      const { results } = await api.searchKhatams(query);
      setSearchResults(results);
      if (results.length === 0) {
        setJErr("No public campaigns matched. Try the exact slug or ask the organizer for the link.");
      }
    } catch {
      setJErr("Search failed. Please try again.");
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

          <p className="text-base md:text-lg text-white/70 max-w-[600px] mx-auto mb-8 leading-relaxed">
            Come together as a community to complete the recitation of the entire Quran.
            Create a khatam, share the link, and track progress together.
          </p>
        </div>
      </section>

      {/* Objective Section */}
      {/* <section className="py-16 md:py-20 px-5 bg-bg-light">
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
      </section> */}

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
            <div
              ref={createCardRef}
              id="create-khatam"
              className={cn(
                "bg-white rounded-2xl p-8 border border-gray-100 shadow-sm",
                highlightedCard === "create" && "animate-landing-card-highlight"
              )}
            >
              <h3 className="text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Create a Khatam
              </h3>
              <p className="text-sm text-gray-400 mb-5">Start a new khatam for your community or yourself</p>

              {/* Mode Toggle */}
              <div className="flex gap-0 mb-6 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleModeToggle(false)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${!isSolo
                    ? "bg-[#8B0000] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  Community
                </button>
                <button
                  type="button"
                  onClick={() => handleModeToggle(true)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${isSolo
                    ? "bg-[#8B0000] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  Personal
                </button>
              </div>

              {isSolo && (
                <div className="text-xs text-[#8B0000] bg-[#FFF5F5] border border-[#8B0000]/20 rounded-lg px-3 py-2 mb-4 leading-relaxed">
                  Track your own personal khatam. A unique code will be added to your URL — bookmark it to return anytime.
                </div>
              )}

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Khatam Name</label>
                  <input
                    type="text"
                    value={cName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder={isSolo ? "e.g. My Ramadan 2026" : "e.g. Ramadan 2026 Family"}
                    maxLength={60}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                    First round name <span className="normal-case text-gray-300">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cRoundName}
                    onChange={e => setCRoundName(e.target.value)}
                    placeholder="e.g. DarusSalam students or Smith family"
                    maxLength={80}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    The campaign title stays fixed; every later round can have a different name.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                    Description or notes <span className="normal-case text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={cDescription}
                    onChange={e => setCDescription(e.target.value)}
                    placeholder="Add a dedication, deadline, instructions, or other context"
                    maxLength={500}
                    rows={3}
                    className="w-full resize-y px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
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
                      placeholder={isSolo ? "my-ramadan-2026" : "ramadan-2026-family"}
                      maxLength={55}
                      className="flex-1 px-2 py-2.5 text-sm outline-none border-none"
                    />
                  </div>
                </div>

                {!isSolo && (
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
                )}

                {/* Location (optional) */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span>🌍</span>
                    <span>Location</span>
                    <span className="text-gray-300 normal-case font-normal tracking-normal">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={cCountry}
                        onChange={e => setCCountry(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors bg-white text-gray-700"
                      >
                        <option value="">Country</option>
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={cCity}
                        onChange={e => setCCity(e.target.value)}
                        placeholder="City (optional)"
                        maxLength={60}
                        disabled={!cCountry}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  {cCountry && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Completions from this khatam will light up the{" "}
                      <Link to="/globe" className="text-[#8B0000] hover:underline">World Globe</Link>.
                    </p>
                  )}
                </div>

                {/* Show names on globe (community only) */}
                {!isSolo && cCountry && (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cShowNames}
                      onChange={e => setCShowNames(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#8B0000]"
                    />
                    <span className="text-xs text-gray-500">Show participant names on the globe</span>
                  </label>
                )}

                {!isSolo && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cSearchable}
                      onChange={e => setCSearchable(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded accent-[#8B0000]"
                    />
                    <span>
                      <span className="block text-xs font-medium text-gray-600">Allow people to find this campaign</span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        It will appear in name and slug search. The admin PIN is never shown.
                      </span>
                    </span>
                  </label>
                )}

                {cErr && <p className="text-red-500 text-sm">{cErr}</p>}

                <button
                  type="submit"
                  disabled={cLoading}
                  className="bg-[#8B0000] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50"
                >
                  {cLoading ? "Creating..." : isSolo ? "Create Personal Khatam" : "Create Khatam"}
                </button>
              </form>
            </div>

            {/* Join a Khatam */}
            <div
              ref={joinCardRef}
              id="join-khatam"
              className={cn(
                "bg-white rounded-2xl p-8 border border-gray-100 shadow-sm",
                highlightedCard === "join" && "animate-landing-card-highlight"
              )}
            >
              <h3 className="text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Join a Khatam
              </h3>
              <p className="text-sm text-gray-400 mb-6">Search by group name or slug, or paste a link</p>

              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Campaign, slug, or URL</label>
                  <input
                    type="text"
                    value={jSlug}
                    onChange={e => { setJSlug(e.target.value); setJErr(""); setSearchResults([]); }}
                    placeholder="e.g. Qalam, DS, family-ramadan, or paste URL"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                  />
                </div>

                {jErr && <p className="text-red-500 text-sm">{jErr}</p>}

                <button
                  type="submit"
                  disabled={jLoading}
                  className="bg-white text-[#8B0000] border-2 border-[#8B0000] px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#FFF5F5] transition-colors disabled:opacity-50"
                >
                  {jLoading ? "Searching..." : "Find Khatam"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Matching campaigns
                  </p>
                  {searchResults.map(result => (
                    <button
                      key={`${result.slug}-${result.khatam_num}`}
                      type="button"
                      onClick={() => navigate(`/k/${result.slug}`)}
                      className="w-full text-left bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:border-[#8B0000]/30 hover:bg-[#FFF5F5] transition-colors"
                    >
                      <span className="block text-sm font-semibold text-gray-800">{result.campaign_name}</span>
                      {result.description && (
                        <span className="block text-xs text-gray-500 mt-1 line-clamp-2">{result.description}</span>
                      )}
                      <span className="block text-[11px] text-[#8B0000] mt-1.5">
                        {result.round_name} · /k/{result.slug}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Private campaigns will not appear in search. Use their exact slug or ask the organizer for the link.
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
