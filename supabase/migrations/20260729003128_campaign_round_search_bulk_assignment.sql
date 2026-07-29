-- Separate the stable campaign/group identity from individual khatam rounds.
-- This migration is intentionally compatible with the existing featured
-- campaigns table in production and with a fresh database built from
-- supabase/migration.sql.

CREATE TABLE IF NOT EXISTS khatam_public.campaigns (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  goal          INT NOT NULL DEFAULT 1
);

ALTER TABLE khatam_public.campaigns
  ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN NOT NULL DEFAULT FALSE;

-- The first production campaigns migration did not include goal. CREATE TABLE
-- IF NOT EXISTS does not add missing columns to an existing table, so add it
-- explicitly before any backfill or Worker query references it.
ALTER TABLE khatam_public.campaigns
  ADD COLUMN IF NOT EXISTS goal INT NOT NULL DEFAULT 1;

UPDATE khatam_public.campaigns
SET is_searchable = TRUE
WHERE is_featured = TRUE;

UPDATE khatam_public.campaigns
SET description = ''
WHERE description IS NULL;

ALTER TABLE khatam_public.campaigns
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN description SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_slug_key
  ON khatam_public.campaigns(slug);

ALTER TABLE khatam_public.khatams
  ADD COLUMN IF NOT EXISTS campaign_id BIGINT;

-- These columns/table are already present in the repository's consolidated
-- schema, but are included here because the live project predates them.
ALTER TABLE khatam_public.khatams
  ADD COLUMN IF NOT EXISTS claim_limit INT NOT NULL DEFAULT 8;

CREATE TABLE IF NOT EXISTS khatam_public.khatam_participants (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_limit INT,
  UNIQUE(slug, name)
);

ALTER TABLE khatam_public.khatam_participants
  ADD COLUMN IF NOT EXISTS claim_limit INT;

CREATE INDEX IF NOT EXISTS idx_participants_slug
  ON khatam_public.khatam_participants(slug);

ALTER TABLE khatam_public.khatam_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_participants"
  ON khatam_public.khatam_participants;
CREATE POLICY "anon_select_participants"
  ON khatam_public.khatam_participants
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "service_all_participants"
  ON khatam_public.khatam_participants;
CREATE POLICY "service_all_participants"
  ON khatam_public.khatam_participants
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE khatam_public.khatam_participants TO service_role;
GRANT SELECT ON TABLE khatam_public.khatam_participants TO anon, authenticated;
GRANT ALL ON SEQUENCE khatam_public.khatam_participants_id_seq TO service_role;
GRANT USAGE ON SEQUENCE khatam_public.khatam_participants_id_seq TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'khatams_campaign_id_fkey'
      AND conrelid = 'khatam_public.khatams'::regclass
  ) THEN
    ALTER TABLE khatam_public.khatams
      ADD CONSTRAINT khatams_campaign_id_fkey
      FOREIGN KEY (campaign_id)
      REFERENCES khatam_public.campaigns(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_khatams_campaign_id
  ON khatam_public.khatams(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_searchable_name
  ON khatam_public.campaigns(is_searchable, lower(name));

-- Preserve privacy for existing trackers: backfill their campaign records but
-- do not list them in public search until an organizer explicitly opts in.
INSERT INTO khatam_public.campaigns (
  slug,
  name,
  description,
  is_featured,
  goal,
  is_searchable
)
SELECT DISTINCT ON (k.slug)
  k.slug,
  k.name,
  '',
  FALSE,
  1,
  FALSE
FROM khatam_public.khatams k
WHERE k.campaign_id IS NULL
ORDER BY k.slug, k.khatam_num ASC
ON CONFLICT (slug) DO NOTHING;

UPDATE khatam_public.khatams k
SET campaign_id = c.id
FROM khatam_public.campaigns c
WHERE k.campaign_id IS NULL
  AND c.slug = k.slug;

ALTER TABLE khatam_public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaign discovery is served by the PIN-aware Worker API. The browser does
-- not need direct table access.
REVOKE ALL ON TABLE khatam_public.campaigns FROM anon, authenticated;
GRANT ALL ON TABLE khatam_public.campaigns TO service_role;
GRANT ALL ON SEQUENCE khatam_public.campaigns_id_seq TO service_role;

-- Lock and assign all 120 rows in one database transaction so a concurrent
-- claim can never leave a partial "whole Quran" assignment behind.
CREATE OR REPLACE FUNCTION khatam_public.assign_entire_khatam(
  p_khatam_id BIGINT,
  p_claimed_by TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_total INT;
  v_available INT;
  v_updated INT;
BEGIN
  IF btrim(p_claimed_by) = '' THEN
    RAISE EXCEPTION 'A person or group name is required';
  END IF;

  PERFORM 1
  FROM khatam_public.slots
  WHERE khatam_id = p_khatam_id
  FOR UPDATE;

  SELECT
    count(*)::INT,
    count(*) FILTER (WHERE status = 'av')::INT
  INTO v_total, v_available
  FROM khatam_public.slots
  WHERE khatam_id = p_khatam_id;

  IF v_total <> 120 OR v_available <> 120 THEN
    RAISE EXCEPTION 'All 30 Juz must be available before assigning the entire Quran.';
  END IF;

  UPDATE khatam_public.slots
  SET
    status = 'cl',
    claimed_by = btrim(p_claimed_by),
    claimed_at = now(),
    done_at = NULL
  WHERE khatam_id = p_khatam_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.assign_entire_khatam(BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.assign_entire_khatam(BIGINT, TEXT)
  TO service_role;
