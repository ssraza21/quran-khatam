import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled campaign slug — shown as a badge, not editable */
  campaignSlug: string;
  campaignName: string;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function CreateKhatamDrawer({ open, onOpenChange, campaignSlug, campaignName }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [showNames, setShowNames] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName(""); setSlug(""); setSlugEdited(false);
    setPin(""); setPinConfirm("");
    setCountry(""); setCity(""); setShowNames(true);
    setErr("");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(nameToSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 55));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!name.trim()) { setErr("Name is required"); return; }
    if (!slug || slug.length < 3) { setErr("Slug must be at least 3 characters"); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) { setErr("Slug must start and end with a letter or number"); return; }
    if (!/^\d{4,6}$/.test(pin)) { setErr("PIN must be 4-6 digits"); return; }
    if (pin !== pinConfirm) { setErr("PINs don't match"); return; }

    setLoading(true);
    try {
      const selectedCountry = COUNTRIES.find(c => c.code === country);
      const result = await api.createKhatam(
        name.trim(),
        slug,
        pin,
        false,
        city.trim() || undefined,
        selectedCountry?.name,
        selectedCountry?.lat,
        selectedCountry?.lng,
        showNames,
        campaignSlug,
      );
      reset();
      onOpenChange(false);
      navigate(`/k/${result.slug}`);
    } catch (e: any) {
      setErr(e.message || "Failed to create khatam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DrawerContent>
        <div className="overflow-y-auto max-h-[80vh] pb-6">
          <DrawerHeader className="px-6 pt-5 pb-3">
            <DrawerTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Start a Khatam
            </DrawerTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Your khatam will be added to the{" "}
              <Link
                to={`/campaigns/${campaignSlug}`}
                className="text-[#8B0000] hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {campaignName}
              </Link>
              {" "}campaign.
            </p>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="px-6 flex flex-col gap-4">
            {/* Campaign badge */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs text-green-800 font-medium">Campaign:</span>
              <span className="text-xs text-green-700">{campaignName}</span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Khatam Name</label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Ramadan 2026 Family"
                maxLength={60}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">URL Slug</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#8B0000] transition-colors">
                <span className="text-xs text-gray-400 pl-3 shrink-0">/k/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="ramadan-2026-family"
                  maxLength={55}
                  className="flex-1 px-2 py-2.5 text-sm outline-none border-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Admin PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4-6 digits"
                  inputMode="numeric"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Confirm PIN</label>
                <input
                  type="password"
                  value={pinConfirm}
                  onChange={e => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Repeat PIN"
                  inputMode="numeric"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors"
                />
              </div>
            </div>

            {/* Location */}
            <div className="border-t border-gray-100 pt-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>🌍</span>
                <span>Location</span>
                <span className="text-gray-300 normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors bg-white text-gray-700"
                >
                  <option value="">Country</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City (optional)"
                  maxLength={60}
                  disabled={!country}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#8B0000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {country && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNames}
                  onChange={e => setShowNames(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#8B0000]"
                />
                <span className="text-xs text-gray-500">Show participant names on the globe</span>
              </label>
            )}

            {err && <p className="text-red-500 text-sm">{err}</p>}

            <div className="flex gap-3 pt-1">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex-1 border border-gray-200 text-gray-500 px-4 py-3 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </DrawerClose>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#8B0000] text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-[#6B0000] transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Khatam"}
              </button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
