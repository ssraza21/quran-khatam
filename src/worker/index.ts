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

type CampaignRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  is_searchable: boolean;
  is_featured?: boolean;
  goal: number;
};

type CampaignDirectoryRow = {
  slug: string;
  campaign_name: string;
  description: string | null;
  is_featured: boolean;
  goal: number;
  total_khatams: number;
  in_progress_khatams: number;
  completed_khatams: number;
  active_round_name: string;
  active_round_num: number;
  total_matching: number;
};

type KhatamHistoryRow = {
  id: number;
  slug: string;
  name: string | null;
  khatam_num: number;
  created_at: string;
  completed_at: string | null;
  is_solo: boolean;
  claim_limit: number;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  show_names_on_globe: boolean;
  campaign_id: number | null;
  done: number;
  total: number;
  started: boolean;
};

async function getCampaignForKhatam(
  db: ReturnType<typeof createServiceClient>,
  khatam: { campaign_id?: number | null; slug: string },
): Promise<CampaignRow | null> {
  const query = db
    .from("campaigns")
    .select("id, slug, name, description, is_searchable, is_featured, goal");

  const { data } = khatam.campaign_id
    ? await query.eq("id", khatam.campaign_id).maybeSingle()
    : await query.eq("slug", khatam.slug).maybeSingle();

  return (data as CampaignRow | null) ?? null;
}

function withCampaign<T extends Record<string, unknown>>(khatam: T, campaign: CampaignRow | null) {
  return {
    ...khatam,
    campaign_name: campaign?.name ?? khatam.name ?? "Khatam",
    campaign_description: campaign?.description ?? null,
    campaign_searchable: campaign?.is_searchable ?? false,
    campaign_goal: campaign?.goal ?? 1,
  };
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

// Helper: per-participant claim limit override (null = use khatam default)
async function resolveClaimLimit(
  db: ReturnType<typeof createServiceClient>,
  slug: string,
  khatam: { claim_limit?: number | null },
  name: string,
): Promise<number> {
  const { data } = await db
    .from("khatam_participants")
    .select("claim_limit")
    .eq("slug", slug)
    .ilike("name", name.trim())
    .maybeSingle();

  if (data?.claim_limit != null) return data.claim_limit;
  return khatam.claim_limit ?? 8;
}

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

// GET /api/campaigns — Searchable public directory with aggregate round counts
app.get("/api/campaigns", async (c) => {
  const db = createServiceClient(c.env);
  const rawQuery = (c.req.query("q") ?? "").trim().slice(0, 80);
  const query = rawQuery.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  const requestedLimit = Number(c.req.query("limit") ?? 24);
  const requestedOffset = Number(c.req.query("offset") ?? 0);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 48)
    : 24;
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(Math.trunc(requestedOffset), 0)
    : 0;

  const { data, error } = await db.rpc("campaign_directory", {
    p_query: query.length >= 2 ? query : "",
    p_limit: limit,
    p_offset: offset,
  });

  if (error) return c.json({ error: "Failed to load campaign directory" }, 500);

  const rows = (data ?? []) as CampaignDirectoryRow[];
  const campaigns = rows.map(campaign => ({
    slug: campaign.slug,
    campaign_name: campaign.campaign_name,
    description: campaign.description,
    is_featured: campaign.is_featured,
    goal: Number(campaign.goal),
    total_khatams: Number(campaign.total_khatams),
    in_progress_khatams: Number(campaign.in_progress_khatams),
    completed_khatams: Number(campaign.completed_khatams),
    active_round_name: campaign.active_round_name,
    active_round_num: Number(campaign.active_round_num),
  }));

  return c.json({
    campaigns,
    total: rows.length > 0 ? Number(rows[0].total_matching) : 0,
  });
});

// POST /api/khatams — Create a new khatam
app.post("/api/khatams", async (c) => {
  const db = createServiceClient(c.env);
  const body = await c.req.json<{
    name: string;
    round_name?: string;
    description?: string;
    is_searchable?: boolean;
    slug: string;
    pin?: string;
    is_solo?: boolean;
    location_city?: string;
    location_country?: string;
    location_lat?: number;
    location_lng?: number;
    show_names_on_globe?: boolean;
  }>();
  const {
    name,
    round_name,
    description,
    is_searchable,
    is_solo = false,
    location_city,
    location_country,
    location_lat,
    location_lng,
    show_names_on_globe,
  } = body;
  let { slug } = body;

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (name.trim().length > 80) return c.json({ error: "Campaign name is too long" }, 400);
  if (round_name && round_name.trim().length > 80) return c.json({ error: "Round name is too long" }, 400);
  if (description && description.trim().length > 500) return c.json({ error: "Description is too long" }, 400);

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
  const [{ data: existing }, { data: existingCampaign }] = await Promise.all([
    db.from("khatams").select("id").eq("slug", slug).limit(1),
    db.from("campaigns").select("id").eq("slug", slug).limit(1),
  ]);

  if ((existing && existing.length > 0) || (existingCampaign && existingCampaign.length > 0)) {
    return c.json({ error: "This slug is already taken" }, 409);
  }

  const pinHash = await hashPin(pinToHash);
  const campaignName = name.trim();
  const roundName = round_name?.trim() || campaignName;

  const { data: campaign, error: campaignErr } = await db
    .from("campaigns")
    .insert({
      slug,
      name: campaignName,
      description: description?.trim() || "",
      is_featured: false,
      goal: 1,
      is_searchable: !is_solo && (is_searchable ?? true),
    })
    .select("id, slug, name, description, is_searchable, is_featured, goal")
    .single();

  if (campaignErr || !campaign) return c.json({ error: "Failed to create campaign" }, 500);

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
    .insert({
      slug,
      name: roundName,
      pin_hash: pinHash,
      khatam_num: 1,
      is_solo,
      campaign_id: campaign.id,
      ...locationFields,
    })
    .select("id, slug, name, khatam_num, created_at, is_solo")
    .single();

  if (kErr || !khatam) {
    await db.from("campaigns").delete().eq("id", campaign.id);
    return c.json({ error: "Failed to create khatam" }, 500);
  }

  // Create 120 slots
  const slots = Array.from({ length: 120 }, (_, i) => ({
    khatam_id: khatam.id,
    juz: Math.floor(i / 4) + 1,
    q: (i % 4) + 1,
  }));

  const { error: sErr } = await db.from("slots").insert(slots);
  if (sErr) {
    await db.from("khatams").delete().eq("id", khatam.id);
    await db.from("campaigns").delete().eq("id", campaign.id);
    return c.json({ error: "Failed to create slots" }, 500);
  }

  return c.json({
    slug: khatam.slug,
    name: khatam.name,
    id: khatam.id,
    campaign_name: campaign.name,
  }, 201);
});

// GET /api/khatams/search?q=... — Find opted-in community campaigns by name or slug
app.get("/api/khatams/search", async (c) => {
  const db = createServiceClient(c.env);
  const query = (c.req.query("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return c.json({ results: [] });

  const sanitizedQuery = query.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  if (sanitizedQuery.length < 2) return c.json({ results: [] });

  const { data, error } = await db.rpc("campaign_directory", {
    p_query: sanitizedQuery,
    p_limit: 8,
    p_offset: 0,
  });

  if (error) return c.json({ error: "Failed to search campaigns" }, 500);

  const results = ((data ?? []) as CampaignDirectoryRow[]).map(campaign => ({
    slug: campaign.slug,
    campaign_name: campaign.campaign_name,
    description: campaign.description,
    round_name: campaign.active_round_name,
    khatam_num: Number(campaign.active_round_num),
  }));

  return c.json({ results });
});

// GET /api/khatams/:slug — Get latest khatam metadata
app.get("/api/khatams/:slug", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);

  const campaign = await getCampaignForKhatam(db, khatam);
  const safe = { ...khatam, pin_hash: undefined };
  return c.json(withCampaign(safe, campaign));
});

// GET /api/khatams/:slug/history — All khatams for this slug
app.get("/api/khatams/:slug/history", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");

  const { data, error } = await db.rpc("khatam_history", { p_slug: slug });

  if (error) return c.json({ error: "Failed to fetch history" }, 500);
  const history = (data ?? []) as KhatamHistoryRow[];
  if (history.length === 0) return c.json([]);

  const campaign = await getCampaignForKhatam(db, history[0]);
  return c.json(history.map(khatam => ({
    ...withCampaign(khatam, campaign),
    done: Number(khatam.done),
    total: Number(khatam.total),
  })));
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

  const claimLimit = await resolveClaimLimit(db, slug, khatam, name.trim());

  const { count } = await db
    .from("slots")
    .select("*", { count: "exact", head: true })
    .eq("khatam_id", khatam.id)
    .eq("status", "cl")
    .ilike("claimed_by", name.trim());

  if ((count ?? 0) >= claimLimit) {
    return c.json({ error: `You've reached the limit of ${claimLimit} quarters. Complete your current portions first.` }, 400);
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

  const claimLimit = await resolveClaimLimit(db, slug, khatam, name.trim());

  // Check active-claim limit
  const { count: activeCount } = await db
    .from("slots")
    .select("*", { count: "exact", head: true })
    .eq("khatam_id", khatam.id)
    .eq("status", "cl")
    .ilike("claimed_by", name.trim());

  if ((activeCount ?? 0) + 4 > claimLimit) {
    return c.json({ error: `Claiming a full Juz would exceed the limit of ${claimLimit} active quarters.` }, 400);
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

// POST /api/khatams/:slug/complete-juz — Mark all 4 quarters of a Juz done (must be claimed by same person)
app.post("/api/khatams/:slug/complete-juz", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, name, khatam_id } = await c.req.json<{ juz: number; name: string; khatam_id?: number }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (!juz || juz < 1 || juz > 30) return c.json({ error: "Invalid Juz number" }, 400);

  const khatam = await resolveKhatam(db, slug, khatam_id);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (khatam.is_solo) return c.json({ error: "Use solo-toggle for solo khatams" }, 400);

  const { data: juzSlots, error: fetchErr } = await db
    .from("slots")
    .select("*")
    .eq("khatam_id", khatam.id)
    .eq("juz", juz);

  if (fetchErr || !juzSlots || juzSlots.length !== 4) {
    return c.json({ error: "Juz not found" }, 404);
  }

  if (!juzSlots.every(s => s.status === "cl")) {
    return c.json({ error: "All 4 quarters must be in progress before completing the Juz." }, 400);
  }

  const owners = [...new Set(juzSlots.map(s => s.claimed_by?.toLowerCase()).filter(Boolean))];
  if (owners.length !== 1) {
    return c.json({ error: "All 4 quarters must be claimed by the same person." }, 400);
  }

  if (name.trim().toLowerCase() !== owners[0]) {
    return c.json({ error: `This Juz was claimed by ${juzSlots[0].claimed_by}. Names don't match.` }, 400);
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("slots")
    .update({ status: "dn", claimed_by: name.trim(), done_at: now })
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("status", "cl")
    .select();

  if (error) return c.json({ error: "Failed to complete Juz" }, 500);
  if (!data || data.length < 4) {
    return c.json({ error: "Some quarters changed while completing. Please try again." }, 409);
  }

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true, completed: data.length });
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
    .insert({
      slug,
      name: khatamName,
      pin_hash: khatam.pin_hash,
      khatam_num: newNum,
      is_solo: true,
      campaign_id: khatam.campaign_id,
      location_city: khatam.location_city,
      location_country: khatam.location_country,
      location_lat: khatam.location_lat,
      location_lng: khatam.location_lng,
      show_names_on_globe: khatam.show_names_on_globe,
    })
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

  const { data: deleted, error } = await db.rpc("delete_khatam_round", {
    p_khatam_id: khatam.id,
  });

  if (error || !deleted) return c.json({ error: "Failed to delete" }, 500);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/set-status
app.post("/api/khatams/:slug/admin/set-status", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, juz, q, status, name } = await c.req.json<{ pin: string; juz: number; q: number; status: string; name?: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  // Get current slot for preserving claimed_by when no name override provided
  const { data: currentSlot } = await db
    .from("slots")
    .select("claimed_by")
    .eq("khatam_id", khatam.id)
    .eq("juz", juz)
    .eq("q", q)
    .single();

  const assignedName = name?.trim() || currentSlot?.claimed_by || "Admin";
  const now = new Date().toISOString();

  const updates = status === "av"
    ? { status: "av" as const, claimed_by: null, claimed_at: null, done_at: null }
    : status === "cl"
      ? { status: "cl" as const, claimed_by: assignedName, claimed_at: now }
      : { status: "dn" as const, claimed_by: assignedName, done_at: now };

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

// POST /api/khatams/:slug/admin/assign-juz — Assign all 4 quarters of a Juz to a name
app.post("/api/khatams/:slug/admin/assign-juz", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, juz, status, name } = await c.req.json<{ pin: string; juz: number; status: string; name?: string }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  if (!juz || juz < 1 || juz > 30) return c.json({ error: "Invalid Juz number" }, 400);

  const assignedName = name?.trim() || "Admin";
  const now = new Date().toISOString();

  const updates = status === "av"
    ? { status: "av" as const, claimed_by: null, claimed_at: null, done_at: null }
    : status === "cl"
      ? { status: "cl" as const, claimed_by: assignedName, claimed_at: now }
      : { status: "dn" as const, claimed_by: assignedName, done_at: now };

  const { error } = await db
    .from("slots")
    .update(updates)
    .eq("khatam_id", khatam.id)
    .eq("juz", juz);

  if (error) return c.json({ error: "Failed to assign Juz" }, 500);

  await checkCompletion(db, khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/set-claim-limit — Update the per-person claim limit
app.post("/api/khatams/:slug/admin/set-claim-limit", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, limit } = await c.req.json<{ pin: string; limit: number }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);

  if (typeof limit !== "number" || limit < 1 || limit > 120) {
    return c.json({ error: "Limit must be between 1 and 120" }, 400);
  }

  // Apply to all khatams in this slug so the setting feels global to the group
  const { error } = await db
    .from("khatams")
    .update({ claim_limit: limit })
    .eq("slug", slug);

  if (error) return c.json({ error: "Failed to update claim limit" }, 500);

  return c.json({ ok: true, claim_limit: limit });
});

// POST /api/khatams/:slug/admin/campaign — Update stable campaign details
app.post("/api/khatams/:slug/admin/campaign", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name, description, is_searchable } = await c.req.json<{
    pin: string;
    name: string;
    description?: string;
    is_searchable?: boolean;
  }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);
  if (!name?.trim()) return c.json({ error: "Campaign name is required" }, 400);
  if (name.trim().length > 80) return c.json({ error: "Campaign name is too long" }, 400);
  if (description && description.trim().length > 500) {
    return c.json({ error: "Description is too long" }, 400);
  }

  let campaign = await getCampaignForKhatam(db, khatam);

  if (!campaign) {
    const { data, error } = await db
      .from("campaigns")
      .insert({
        slug,
        name: name.trim(),
        description: description?.trim() || "",
        is_featured: false,
        goal: 1,
        is_searchable: is_searchable ?? false,
      })
      .select("id, slug, name, description, is_searchable, is_featured, goal")
      .single();

    if (error || !data) return c.json({ error: "Failed to create campaign details" }, 500);
    campaign = data as CampaignRow;
    await db.from("khatams").update({ campaign_id: campaign.id }).eq("slug", slug);
  } else {
    const { data, error } = await db
      .from("campaigns")
      .update({
        name: name.trim(),
        description: description?.trim() || "",
        is_searchable: is_searchable ?? campaign.is_searchable,
      })
      .eq("id", campaign.id)
      .select("id, slug, name, description, is_searchable, is_featured, goal")
      .single();

    if (error || !data) return c.json({ error: "Failed to update campaign details" }, 500);
    campaign = data as CampaignRow;
  }

  return c.json({
    ok: true,
    campaign_name: campaign.name,
    campaign_description: campaign.description,
    campaign_searchable: campaign.is_searchable,
  });
});

// POST /api/khatams/:slug/admin/bulk-new-khatams — Fill campaign up to a target
app.post("/api/khatams/:slug/admin/bulk-new-khatams", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, target_total, name_prefix } = await c.req.json<{
    pin: string;
    target_total: number;
    name_prefix?: string;
  }>();

  const { valid, khatam } = await verifyAdmin(db, slug, pin);
  if (!valid || !khatam) return c.json({ error: "Invalid pin" }, 403);
  if (!Number.isInteger(target_total) || target_total < 1 || target_total > 5000) {
    return c.json({ error: "Campaign target must be between 1 and 5000" }, 400);
  }
  if (name_prefix && name_prefix.trim().length > 60) {
    return c.json({ error: "Round name prefix is too long" }, 400);
  }

  const { data: created, error } = await db.rpc("create_khatam_rounds", {
    p_source_khatam_id: khatam.id,
    p_target_total: target_total,
    p_name_prefix: name_prefix?.trim() ?? "",
  });

  if (error) {
    if (
      error.message.includes("lower than the current") ||
      error.message.includes("between 1 and 5000")
    ) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to create campaign rounds" }, 500);
  }

  return c.json({
    ok: true,
    created: Number(created),
    target_total,
  }, Number(created) > 0 ? 201 : 200);
});

// POST /api/khatams/:slug/admin/assign-all — Assign all 30 Juz to one person/group
app.post("/api/khatams/:slug/admin/assign-all", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name, khatam_id } = await c.req.json<{
    pin: string;
    name: string;
    khatam_id?: number;
  }>();

  const { valid } = await verifyAdmin(db, slug, pin);
  if (!valid) return c.json({ error: "Invalid pin" }, 403);
  if (!name?.trim()) return c.json({ error: "A person or group name is required" }, 400);
  if (name.trim().length > 60) return c.json({ error: "Name is too long" }, 400);

  const khatam = await resolveKhatam(db, slug, khatam_id);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);
  if (khatam.is_solo) return c.json({ error: "Not available for personal khatams" }, 400);

  const { data: assigned, error } = await db.rpc("assign_entire_khatam", {
    p_khatam_id: khatam.id,
    p_claimed_by: name.trim(),
  });

  if (error) {
    if (error.message.includes("All 30 Juz must be available")) {
      return c.json({ error: "All 30 Juz must be available before assigning the entire Quran." }, 409);
    }
    return c.json({ error: "Failed to assign the Quran" }, 500);
  }

  await db
    .from("khatam_participants")
    .upsert(
      { slug, name: name.trim() },
      { onConflict: "slug,name", ignoreDuplicates: true },
    );

  return c.json({ ok: true, assigned: Number(assigned) });
});

// GET /api/khatams/:slug/admin/participants — List participant names for a slug
app.get("/api/khatams/:slug/admin/participants", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const pin = c.req.query("pin") ?? "";

  const { valid } = await verifyAdmin(db, slug, pin);
  if (!valid) return c.json({ error: "Invalid pin" }, 403);

  const { data, error } = await db
    .from("khatam_participants")
    .select("name, claim_limit")
    .eq("slug", slug)
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: "Failed to fetch participants" }, 500);

  return c.json({
    participants: (data ?? []).map((r: { name: string; claim_limit: number | null }) => ({
      name: r.name,
      claim_limit: r.claim_limit,
    })),
  });
});

// POST /api/khatams/:slug/admin/participants — Add a participant name
app.post("/api/khatams/:slug/admin/participants", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name } = await c.req.json<{ pin: string; name: string }>();

  const { valid } = await verifyAdmin(db, slug, pin);
  if (!valid) return c.json({ error: "Invalid pin" }, 403);

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (name.trim().length > 60) return c.json({ error: "Name too long" }, 400);

  const { error } = await db
    .from("khatam_participants")
    .insert({ slug, name: name.trim() });

  // Unique constraint — silently ignore duplicates
  if (error && !error.message.includes("duplicate")) {
    return c.json({ error: "Failed to add participant" }, 500);
  }

  return c.json({ ok: true });
});

// DELETE /api/khatams/:slug/admin/participants — Remove a participant name
app.delete("/api/khatams/:slug/admin/participants", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name } = await c.req.json<{ pin: string; name: string }>();

  const { valid } = await verifyAdmin(db, slug, pin);
  if (!valid) return c.json({ error: "Invalid pin" }, 403);

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const { error } = await db
    .from("khatam_participants")
    .delete()
    .eq("slug", slug)
    .eq("name", name.trim());

  if (error) return c.json({ error: "Failed to remove participant" }, 500);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/admin/set-participant-limit — Per-person claim limit override for this slug
app.post("/api/khatams/:slug/admin/set-participant-limit", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { pin, name, limit } = await c.req.json<{ pin: string; name: string; limit: number | null }>();

  const { valid } = await verifyAdmin(db, slug, pin);
  if (!valid) return c.json({ error: "Invalid pin" }, 403);

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (limit !== null && (typeof limit !== "number" || limit < 1 || limit > 120)) {
    return c.json({ error: "Limit must be between 1 and 120, or null for default" }, 400);
  }

  const { error } = await db
    .from("khatam_participants")
    .update({ claim_limit: limit })
    .eq("slug", slug)
    .ilike("name", name.trim());

  if (error) return c.json({ error: "Failed to update participant limit" }, 500);

  return c.json({ ok: true, name: name.trim(), claim_limit: limit });
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

  await checkCompletion(db, khatam.id);

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
    .insert({
      slug,
      name: khatamName,
      pin_hash: khatam.pin_hash,
      khatam_num: newNum,
      campaign_id: khatam.campaign_id,
      is_solo: false,
      claim_limit: khatam.claim_limit,
      location_city: khatam.location_city,
      location_country: khatam.location_country,
      location_lat: khatam.location_lat,
      location_lng: khatam.location_lng,
      show_names_on_globe: khatam.show_names_on_globe,
    })
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

  const { data: deleted, error } = await db.rpc("delete_khatam_round", {
    p_khatam_id: khatam.id,
  });

  if (error || !deleted) return c.json({ error: "Failed to delete" }, 500);

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

  await db
    .from("khatams")
    .update({ completed_at: count === 120 ? new Date().toISOString() : null })
    .eq("id", khatamId);
}

export default app;
