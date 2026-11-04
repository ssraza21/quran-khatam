import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Lock, Users, User } from "lucide-react";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { btn, ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import DescriptionEditor from "@/components/ui/DescriptionEditor";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

/** Server errors talk about "slugs"; the UI calls it the link. */
function friendlyError(message: string) {
  return message.replace(/\bslug\b/gi, "link");
}

type Mode = "group" | "personal";

export default function CreateKhatamPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "personal" ? "personal" : "group");
  const isSolo = mode === "personal";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const [showMore, setShowMore] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [showNames, setShowNames] = useState(true);
  const [searchable, setSearchable] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const effectiveSlug = slugEdited ? slug : nameToSlug(name);

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 55));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Give your khatam a name.");
    if (effectiveSlug.length < 3) return setError("The link needs at least 3 letters or numbers.");
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(effectiveSlug)) {
      return setError("The link must start and end with a letter or number.");
    }
    if (!isSolo) {
      if (!/^\d{4,6}$/.test(pin)) return setError("Choose an admin PIN of 4–6 digits.");
      if (pin !== pinConfirm) return setError("The two PINs don't match.");
    }

    // Personal khatams have no PIN, so make the link hard to guess.
    const finalSlug = isSolo ? `${effectiveSlug.slice(0, 50)}-${randomSuffix()}` : effectiveSlug;

    setLoading(true);
    try {
      const selectedCountry = COUNTRIES.find(c => c.code === country);
      const result = await api.createKhatam(
        name.trim(),
        finalSlug,
        isSolo ? "" : pin,
        isSolo,
        city.trim() || undefined,
        selectedCountry?.name,
        selectedCountry?.lat,
        selectedCountry?.lng,
        isSolo ? undefined : showNames,
        roundName.trim() || undefined,
        description.trim() || undefined,
        isSolo ? false : searchable,
      );
      navigate(`/k/${result.slug}/tracker`);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "Could not create the khatam. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const modes: { value: Mode; title: string; desc: string; Icon: typeof Users }[] = [
    { value: "group", title: "With a group", desc: "Share a link. Everyone claims a part.", Icon: Users },
    { value: "personal", title: "Just for me", desc: "Track your own reading.", Icon: User },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-semibold text-stone-900">Start a khatam</h1>
      <p className="mt-2 text-[15px] text-stone-600">
        The Quran is split into 30 Juz and 120 quarters. People pick the parts they'll read and mark them done.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <fieldset>
          <legend className={ui.label}>Who is reading?</legend>
          <div className="grid grid-cols-2 gap-2">
            {modes.map(({ value, title, desc, Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setMode(value); setError(""); }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    active ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "border-stone-300 bg-white hover:border-stone-400",
                  )}
                >
                  <Icon size={18} className={active ? "text-primary" : "text-stone-500"} />
                  <span className="mt-2 block text-sm font-semibold text-stone-900">{title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-stone-500">{desc}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className={ui.label}>Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={isSolo ? "My Ramadan khatam" : "Khatam for our grandmother"}
            maxLength={80}
            className={ui.input}
            autoComplete="off"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 text-xs text-stone-500">
            {editingSlug ? (
              <div className="mt-1 flex w-full items-center rounded-lg border border-stone-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <span className="shrink-0 pl-3 text-sm text-stone-400">qurankhatam.com/k/</span>
                <input
                  aria-label="Link"
                  value={effectiveSlug}
                  onChange={e => handleSlugChange(e.target.value)}
                  maxLength={55}
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-base outline-none sm:text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <span>Link:</span>
                <span className="break-all font-medium text-stone-700">
                  qurankhatam.com/k/{effectiveSlug || "…"}{isSolo && effectiveSlug ? "-xxxx" : ""}
                </span>
                <button type="button" onClick={() => setEditingSlug(true)} className="font-medium text-primary hover:underline">
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {!isSolo && (
          <div>
            <label htmlFor="description" className={ui.label}>
              Description <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <DescriptionEditor
              id="description"
              value={description}
              onChange={setDescription}
              placeholder="Who it's dedicated to, a deadline, or instructions for readers"
              maxLength={500}
              minRows={3}
            />
          </div>
        )}

        {!isSolo ? (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pin" className={ui.label}>Admin PIN</label>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4–6 digits"
                  inputMode="numeric"
                  autoComplete="new-password"
                  className={ui.input}
                />
              </div>
              <div>
                <label htmlFor="pin2" className={ui.label}>Repeat PIN</label>
                <input
                  id="pin2"
                  type="password"
                  value={pinConfirm}
                  onChange={e => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="new-password"
                  className={ui.input}
                />
              </div>
            </div>
            <p className={cn(ui.hint, "flex gap-1.5")}>
              <Lock size={13} className="mt-0.5 shrink-0" />
              You'll use this PIN to assign parts, fix names and add more khatams. It can't be recovered, so keep it somewhere safe.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-stone-100 px-3 py-2.5 text-sm text-stone-600">
            There's no PIN for a personal khatam: anyone with the link can update it. Bookmark the page after it's created.
          </p>
        )}

        <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => setShowMore(v => !v)}
              aria-expanded={showMore}
              className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
            >
              More options
              <ChevronDown size={16} className={cn("text-stone-400 transition-transform", showMore && "rotate-180")} />
            </button>

            {showMore && (
              <div className="mt-4 space-y-5">
                {!isSolo && <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={searchable}
                    onChange={e => setSearchable(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-stone-800">List in the public directory</span>
                    <span className="block text-xs text-stone-500">Others can find it by name. Turn off to share by link only.</span>
                  </span>
                </label>}

                <div>
                  <label htmlFor="round" className={ui.label}>
                    Name of the first khatam <span className="font-normal text-stone-400">(optional)</span>
                  </label>
                  <input
                    id="round"
                    type="text"
                    value={roundName}
                    onChange={e => setRoundName(e.target.value)}
                    placeholder="e.g. Khatam 1 or Smith family"
                    maxLength={80}
                    className={ui.input}
                  />
                  <p className={ui.hint}>You can run several khatams under one link. Each can have its own name.</p>
                </div>

                <div>
                  <span className={ui.label}>Location <span className="font-normal text-stone-400">(optional)</span></span>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      aria-label="Country"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className={ui.input}
                    >
                      <option value="">Country</option>
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      aria-label="City"
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="City"
                      maxLength={60}
                      disabled={!country}
                      className={ui.input}
                    />
                  </div>
                  <p className={ui.hint}>
                    Completed parts will appear on the <Link to="/globe" className="text-primary hover:underline">world map</Link>.
                  </p>
                  {country && !isSolo && (
                    <label className="mt-3 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={showNames}
                        onChange={e => setShowNames(e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className="text-sm text-stone-700">Show readers' first names on the map</span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

        {error && <p role="alert" className={ui.error}>{error}</p>}

        <button type="submit" disabled={loading} className={cn(btn("primary", "lg"), "w-full")}>
          {loading ? "Creating…" : "Create khatam"}
        </button>
      </form>
    </div>
  );
}
