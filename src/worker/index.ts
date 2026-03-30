import { Hono } from "hono";
import { createServiceClient } from "./lib/supabase";
import { hashPin, verifyPin } from "./lib/pin";
import { isValidSlug, isValidPin } from "./lib/validators";

const app = new Hono<{ Bindings: Env }>();

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

// Helper: verify admin pin for a slug
async function verifyAdmin(db: ReturnType<typeof createServiceClient>, slug: string, pin: string) {
  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return { valid: false, khatam: null };
  const valid = await verifyPin(pin, khatam.pin_hash);
  return { valid, khatam: valid ? khatam : null };
}

// POST /api/khatams — Create a new khatam
app.post("/api/khatams", async (c) => {
  const db = createServiceClient(c.env);
  const body = await c.req.json<{ name: string; slug: string; pin: string }>();
  const { name, slug, pin } = body;

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  if (!isValidSlug(slug)) return c.json({ error: "Invalid slug. Use 3-60 lowercase letters, numbers, and hyphens." }, 400);
  if (!isValidPin(pin)) return c.json({ error: "Pin must be 4-6 digits" }, 400);

  // Check slug uniqueness
  const { data: existing } = await db
    .from("khatams")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (existing && existing.length > 0) {
    return c.json({ error: "This slug is already taken" }, 409);
  }

  const pinHash = await hashPin(pin);

  const { data: khatam, error: kErr } = await db
    .from("khatams")
    .insert({ slug, name: name.trim(), pin_hash: pinHash, khatam_num: 1 })
    .select("id, slug, name, khatam_num, created_at")
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
    .select("id, slug, name, khatam_num, created_at, completed_at")
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
  const { juz, q, name } = await c.req.json<{ juz: number; q: number; name: string }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);

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

  // Check if all slots are done
  await checkCompletion(db, khatam.id);

  return c.json({ ok: true });
});

// POST /api/khatams/:slug/complete
app.post("/api/khatams/:slug/complete", async (c) => {
  const db = createServiceClient(c.env);
  const slug = c.req.param("slug");
  const { juz, q, name } = await c.req.json<{ juz: number; q: number; name: string }>();

  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const khatam = await getLatestKhatam(db, slug);
  if (!khatam) return c.json({ error: "Khatam not found" }, 404);

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
