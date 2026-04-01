import { Hono } from "hono";
import { createServiceClient } from "./lib/supabase";
import { hashPin, verifyPin } from "./lib/pin";
import { isValidSlug, isValidPin } from "./lib/validators";

const app = new Hono<{ Bindings: Env }>();

// Helper: generate random hex string
function randomHex(len: number): string {
  const arr = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

// Helper: get latest khatam for a slug
async function getLatestKhatam(db: ReturnType<typeof createServiceClient>, slug: string) {
  const { data } = await db
    .from("khatams")
    .select("*")
    .eq("slug", slug)
    .order("khatam_num", { ascending: false })
    .limit(1)
    .single();
  return data;
}

// Fast path: resolve khatam by known ID (PK lookup) with slug verification, or fall back to slug scan
async function resolveKhatam(
  db: ReturnType<typeof createServiceClient>,
  slug: string,
  khatamId?: number,
) {
  if (khatamId) {
    const { data } = await db
      .from("khatams")
      .select("*")
      .eq("id", khatamId)
      .eq("slug", slug)
      .single();
    return data;
  }
  return getLatestKhatam(db, slug);
}

// Helper: verify admin pin for a slug
async function verifyAdmin(db: ReturnType<typeof createServiceClient>, slug: string, pin: string) {
  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return { valid: false, khatam: null };
  const valid = await verifyPin(pin, khatam.pin_hash);
  return { valid, khatam: valid ? khatam : null };
}

// GET /api/globe — Aggregated globe data (all khatams with location)
app.get("/api/globe", async (c) => {
  const db = createServiceClient(c.env);

  // Fetch all completed slots for khatams that have a location set, most recent first
  const { data: rows, error } = await db
    .from("slots")
    .select("juz, q, claimed_by, done_at, khatams!inner(name, location_city, location_country, location_lat, location_lng, show_names_on_globe)")
    .eq("status", "dn")
    .not("khatams.location_lat", "is", null)
    .order("done_at", { ascending: false })
    .limit(500);

  if (error) return c.json({ error: "Failed to fetch globe data" }, 500);

  type CompletionRow = {
    juz: number;
    q: number;
    claimed_by: string | null;
    done_at: string | null;
    khatams: {
      name: string;
      location_city: string | null;
      location_country: string | null;
      location_lat: number;
      location_lng: number;
      show_names_on_globe: boolean;
    };
  };
  const completions = (rows as unknown) as CompletionRow[];

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;

  // Aggregate markers by location
  const markerMap = new Map<string, { lat: number; lng: number; location: string; count: number; isRecent: boolean }>();
  for (const row of completions) {
    const k = row.khatams;
    const key = `${k.location_lat.toFixed(4)},${k.location_lng.toFixed(4)}`;
    const label = k.location_city ? `${k.location_city}, ${k.location_country}` : (k.location_country ?? "");
    const isRecent = !!row.done_at && new Date(row.done_at).getTime() > fiveMinAgo;
    const existing = markerMap.get(key);
    if (existing) {
      existing.count++;
      if (isRecent) existing.isRecent = true;
    } else {
      markerMap.set(key, { lat: k.location_lat, lng: k.location_lng, location: label, count: 1, isRecent });
    }
  }

  // Recent feed — last 30 completions
  const recent = completions.slice(0, 30).map(row => {
    const k = row.khatams;
    const label = k.location_city ? `${k.location_city}, ${k.location_country}` : (k.location_country ?? "");
    return {
      juz: row.juz,
      q: row.q,
      khatam_name: k.name,
      location: label,
      completed_at: row.done_at ?? "",
      name: k.show_names_on_globe ? (row.claimed_by ?? null) : null,
    };
  });

  return c.json({
    markers: Array.from(markerMap.values()),
    recent,
    total_completions: completions.length,
    total_locations: markerMap.size,
  });
});

// POST /api/khatams — Create a new khatam
app.post("/api/khatams", async (c) => {
  const db = createServiceClient(c.env);
  const body = await c.req.json<{
    name: string;
    slug: string;
    pin?: string;
    is_solo?: boolean;
    location_city?: string;
    location_country?: string;
    location_lat?: number;
    location_lng?: number;
    show_names_on_globe?: boolean;
  }>();
  const { name, is_solo = false, location_city, location_country, location_lat, location_lng, show_names_on_globe } = body;
  let { slug } = body;

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  let pinToHash: string;

  if (is_solo) {
    const rawSlug = (slug ?? "").trim();
    if (!rawSlug || rawSlug.length < 2) return c.json({ error: "Slug must be at least 2 characters" }, 400);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(rawSlug)) return c.json({ error: "Slug must use lowercase letters, numbers, and hyphens" }, 400);
    slug = `${rawSlug}`;
    pinToHash = randomHex(8);
  } else {
    const pin = body.pin ?? "";
    if (!isValidSlug(slug)) return c.json({ error: "Invalid slug. Use 3-60 lowercase letters, numbers, and hyphens." }, 400);
    if (!isValidPin(pin)) return c.json({ error: "Pin must be 4-6 digits" }, 400);
    pinToHash = pin;
  }

  if (!isValidSlug(slug)) return c.json({ error: "Invalid slug" }, 400);

  // Check slug uniqueness
  const { data: existing } = await db
    .from("khatams")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (existing && existing.length > 0) {
    return c.json({ error: "This slug is already taken" }, 409);
  }

  const pinHash = await hashPin(pinToHash);

  const locationFields = location_lat != null && location_lng != null
    ? {
        location_city: location_city?.trim() || null,
        location_country: location_country?.trim() || null,
        location_lat,
        location_lng,
        show_names_on_globe: show_names_on_globe ?? true,
      }
    : {};

  const { data: khatam, error: kErr } = await db
    .from("khatams")
    .insert({ slug, name: name.trim(), pin_hash: pinHash, khatam_num: 1, is_solo, ...locationFields })
    .select("id, slug, name, khatam_num, created_at, is_solo")
    .single();

  if (kErr || !khatam) return c.json({ error: "Failed to create khatam" }, 500);

  // Create 120 slots
  const slots = Array.from({ length: 120 }, (_, i) => ({
    khatam_id: khatam.id,
    juz: Math.floor(i / 4) + 1,
    q: (i % 4) + 1,
  }));

  const { error: sErr } = await db.from("slots").insert(slots);
  if (sErr) return c.json({ error: "Failed to create slots" }, 500);

  return c.json({ slug: khatam.slug, name: khatam.name, id: khatam.id }, 201);
});

// GET /api/khatams/:slug — Get latest khatam metadata
app.get("/api/khatams/:slug", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);

  const { pin_hash: _, ...safe } = khatam;
  return c.json(safe);
});

// GET /api/khatams/:slug/history — All khatams for this slug
app.get("/api/khatams/:slug/history", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const { data, error } = await db
    .from("khatams")
    .select("id, slug, name, khatam_num, created_at, completed_at, is_solo")
    .eq("slug", slug)
    .order("khatam_num", { ascending: false });

  if (error) return c.json({ error: "Failed to fetch history" }, 500);
  return c.json(data ?? []);
});

// POST /api/khatams/:slug/verify-pin
app.post("/api/khatams/:slug/verify-pin", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin } = await c.req.json<{ pin: string }>();

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ valid: false }, 404);

  const valid = await verifyPin(pin, khatam.pin_hash);
  return c.json({ valid });
});

// POST /api/khatams/:slug/claim
app.post("/api/khatams/:slug/claim", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, q, name, khatam_id } = await c.req.json<{ juz: number; q: number; name: string; khatam_id?: number }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const khatam = await resolveKhatam(db, slug, khatam_id);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (khatam.is_solo) return c.json({ error: "Use solo-toggle for solo khatams" }, 400);

  // Check 8-active limit
  const { count } = await db
    .from("slots")
    .select("*", { count: "exact", head: true })
    .eq("khatam_id", khatam.id)
    .eq("status", "cl")
    .ilike("claimed_by", name.trim());

  if ((count ?? 0) >= 8) {
    return c.json({ error: "You've reached the limit of 8 quarters. Complete your current portions first." }, 400);
  }

  const { error, data } = await db
    .from("slots")
    .update({ status: "cl", claimed_by: name.trim(), claimed_at: new Date().toISOString() })
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q)
    .eq("status", "av")
    .select();

  if (error) return c.json({ error: "Failed to claim" }, 500);
  if (!data || data.length === 0) return c.json({ error: "This quarter was just claimed. Please choose another." }, 409);

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/claim-juz — Claim all available quarters of a Juz atomically
app.post("/api/khatams/:slug/claim-juz", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, name, khatam_id } = await c.req.json<{ juz: number; name: string; khatam_id?: number }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (!juz || juz < 1 || juz > 30) return c.json({ error: "Invalid Juz number" }, 400);

  const khatam = await resolveKhatam(db, slug, khatam_id);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (khatam.is_solo) return c.json({ error: "Use solo-toggle for solo khatams" }, 400);

  // Check active-claim limit in parallel with the update to save a round-trip
  const { count: activeCount } = await db
    .from("slots")
    .select("*", { count: "exact", head: true })
    .eq("khatam_id", khatam.id)
    .eq("status", "cl")
    .ilike("claimed_by", name.trim());

  if ((activeCount ?? 0) + 4 > 8) {
    return c.json({ error: "Claiming a full Juz would exceed the limit of 8 active quarters." }, 400);
  }

  // Claim all available quarters in one UPDATE — the affected row count tells us if any were already taken.
  // No separate availability pre-check needed (eliminates one DB round-trip).
  const { data, error } = await db
    .from("slots")
    .update({ status: "cl", claimed_by: name.trim(), claimed_at: new Date().toISOString() })
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("status", "av")
    .select();

  if (error) return c.json({ error: "Failed to claim" }, 500);
  if (!data || data.length === 0) return c.json({ error: "Some quarters in this Juz are no longer available." }, 409);
  if (data.length < 4) {
    // Race: partial claim — undo and tell the user to retry
    await db
      .from("slots")
      .update({ status: "av", claimed_by: null, claimed_at: null })
      .eq("khatam_id", khatam.id)
      .eq("juz", juz)
      .eq("status", "cl")
      .ilike("claimed_by", name.trim());
    return c.json({ error: "Some quarters were just claimed. Please try again." }, 409);
  }

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true, claimed: data.length });
});

// POST /api/khatams/:slug/complete
app.post("/api/khatams/:slug/complete", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, q, name, khatam_id } = await c.req.json<{ juz: number; q: number; name: string; khatam_id?: number }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const khatam = await resolveKhatam(db, slug, khatam_id);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (khatam.is_solo) return c.json({ error: "Use solo-toggle for solo khatams" }, 400);

  // Check name match
  const { data: slot } = await db
    .from("slots")
    .select("*")
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q)
    .single();

  if (!slot) return c.json({ error: "Slot not found" }, 404);
  if (slot.claimed_by && name.trim().toLowerCase() !== slot.claimed_by.toLowerCase()) {
    return c.json({ error: `This was claimed by ${slot.claimed_by}. Names don't match.` }, 400);
  }

  const { error } = await db
    .from("slots")
    .update({ status: "dn", claimed_by: name.trim() || slot.claimed_by, done_at: new Date().toISOString() })
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q);

  if (error) return c.json({ error: "Failed to complete" }, 500);

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/solo-toggle — Toggle a slot av↔dn for solo khatams
app.post("/api/khatams/:slug/solo-toggle", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, q } = await c.req.json<{ juz: number; q: number }>();

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (!khatam.is_solo) return c.json({ error: "Not a solo khatam" }, 403);

  const { data: slot } = await db
    .from("slots")
    .select("status")
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q)
    .single();

  if (!slot) return c.json({ error: "Slot not found" }, 404);

  const newStatus = slot.status === "dn" ? "av" : "dn";
  const updates = newStatus === "dn"
    ? { status: "dn" as const, done_at: new Date().toISOString(), claimed_by: null, claimed_at: null }
    : { status: "av" as const, done_at: null, claimed_by: null, claimed_at: null };

  const { error } = await db
    .from("slots")
    .update(updates)
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q);

  if (error) return c.json({ error: "Failed to toggle" }, 500);

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true, status: newStatus });
});

// POST /api/khatams/:slug/solo/reset-all — Reset all slots (solo, no PIN required)
app.post("/api/khatams/:slug/solo/reset-all", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (!khatam.is_solo) return c.json({ error: "Not a solo khatam" }, 403);

  const { error } = await db
    .from("slots")
    .update({ status: "av", claimed_by: null, claimed_at: null, done_at: null })
    .eq("khatam_id", khatam.id);

  if (error) return c.json({ error: "Failed to reset" }, 500);

  await db.from("khatams").update({ completed_at: null }).eq("id", khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/solo/new-khatam — Start new khatam in series (solo, no PIN required)
app.post("/api/khatams/:slug/solo/new-khatam", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const body = await c.req.json<{ name?: string }>().catch(() => ({} as { name?: string }));

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (!khatam.is_solo) return c.json({ error: "Not a solo khatam" }, 403);

  const newNum = khatam.khatam_num + 1;
  const khatamName = body.name?.trim() || khatam.name;

  const { data: newKhatam, error: kErr } = await db
    .from("khatams")
    .insert({ slug, name: khatamName, pin_hash: khatam.pin_hash, khatam_num: newNum, is_solo: true })
    .select("id, slug, name, khatam_num, created_at, is_solo")
    .single();

  if (kErr || !newKhatam) return c.json({ error: "Failed to create new khatam" }, 500);

  const slots = Array.from({ length: 120 }, (_, i) => ({
    khatam_id: newKhatam.id,
    juz: Math.floor(i / 4) + 1,
    q: (i % 4) + 1,
  }));

  const { error: sErr } = await db.from("slots").insert(slots);
  if (sErr) return c.json({ error: "Failed to create slots" }, 500);

  return c.json(newKhatam, 201);
});

// DELETE /api/khatams/:slug/solo/delete — Delete khatam (solo, no PIN required)
app.delete("/api/khatams/:slug/solo/delete", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (!khatam.is_solo) return c.json({ error: "Not a solo khatam" }, 403);

  await db.from("slots").delete().eq("khatam_id", khatam.id);
  const { error } = await db.from("khatams").delete().eq("id", khatam.id);

  if (error) return c.json({ error: "Failed to delete" }, 500);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/set-status
app.post("/api/khatams/:slug/admin/set-status", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, juz, q, status } = await c.req.json<{ pin: string; juz: number; q: number; status: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  // Get current slot for preserving claimed_by
  const { data: currentSlot } = await db
    .from("slots")
    .select("claimed_by")
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q)
    .single();

  const updates = status === "av"
    ? { status: "av" as const, claimed_by: null, claimed_at: null, done_at: null }
    : status === "cl"
      ? { status: "cl" as const, claimed_by: currentSlot?.claimed_by || "Admin", claimed_at: new Date().toISOString() }
      : { status: "dn" as const, claimed_by: currentSlot?.claimed_by || "Admin", done_at: new Date().toISOString() };

  const { error } = await db
    .from("slots")
    .update(updates)
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q);

  if (error) return c.json({ error: "Failed to update status" }, 500);

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/reset-all
app.post("/api/khatams/:slug/admin/reset-all", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin } = await c.req.json<{ pin: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  const { error } = await db
    .from("slots")
    .update({ status: "av", claimed_by: null, claimed_at: null, done_at: null })
    .eq("khatam_id", khatam.id);

  if (error) return c.json({ error: "Failed to reset" }, 500);

  // Clear completed_at
  await db.from("khatams").update({ completed_at: null }).eq("id", khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/reset-juz
app.post("/api/khatams/:slug/admin/reset-juz", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, juz } = await c.req.json<{ pin: string; juz: number }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  const { error } = await db
    .from("slots")
    .update({ status: "av", claimed_by: null, claimed_at: null, done_at: null })
    .eq("khatam_id", khatam.id)
    .eq("juz", juz);

  if (error) return c.json({ error: "Failed to reset juz" }, 500);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/new-khatam
app.post("/api/khatams/:slug/admin/new-khatam", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name } = await c.req.json<{ pin: string; name?: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  const newNum = khatam.khatam_num + 1;
  const khatamName = name?.trim() || khatam.name;

  const { data: newKhatam, error: kErr } = await db
    .from("khatams")
    .insert({ slug, name: khatamName, pin_hash: khatam.pin_hash, khatam_num: newNum })
    .select("id, slug, name, khatam_num, created_at")
    .single();

  if (kErr || !newKhatam) return c.json({ error: "Failed to create new khatam" }, 500);

  const slots = Array.from({ length: 120 }, (_, i) => ({
    khatam_id: newKhatam.id,
    juz: Math.floor(i / 4) + 1,
    q: (i % 4) + 1,
  }));

  const { error: sErr } = await db.from("slots").insert(slots);
  if (sErr) return c.json({ error: "Failed to create slots" }, 500);

  return c.json(newKhatam, 201);
});

// DELETE /api/khatams/:slug/admin/delete
app.delete("/api/khatams/:slug/admin/delete", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin } = await c.req.json<{ pin: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  // Delete slots first (cascade should handle this, but be explicit)
  await db.from("slots").delete().eq("khatam_id", khatam.id);
  const { error } = await db.from("khatams").delete().eq("id", khatam.id);

  if (error) return c.json({ error: "Failed to delete" }, 500);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/toggle-globe-names
app.post("/api/khatams/:slug/admin/toggle-globe-names", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin } = await c.req.json<{ pin: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  const newValue = !(khatam.show_names_on_globe ?? true);
  const { error } = await db
    .from("khatams")
    .update({ show_names_on_globe: newValue })
    .eq("id", khatam.id);

  if (error) return c.json({ error: "Failed to update" }, 500);

  return c.json({ ok: true, show_names_on_globe: newValue });
});

// Helper: check if all 120 slots are done and mark khatam complete
async function checkCompletion(db: ReturnType<typeof createServiceClient>, khatamId: number) {
  const { count } = await db
    .from("slots")
    .select("*", { count: "exact", head: true })
    .eq("khatam_id", khatamId)
    .eq("status", "dn");

  if (count === 120) {
    await db.from("khatams").update({ completed_at: new Date().toISOString() }).eq("id", khatamId);
  }
}

export default app;
