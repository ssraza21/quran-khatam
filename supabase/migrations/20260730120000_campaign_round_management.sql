-- Add explicit campaign-round categories and atomic organizer actions.

ALTER TABLE khatam_public.khatams
  ADD COLUMN IF NOT EXISTS participation_mode TEXT NOT NULL DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'khatams_participation_mode_check'
      AND conrelid = 'khatam_public.khatams'::regclass
  ) THEN
    ALTER TABLE khatam_public.khatams
      ADD CONSTRAINT khatams_participation_mode_check
      CHECK (participation_mode IN ('open', 'group'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_khatams_campaign_participation_mode
  ON khatam_public.khatams(campaign_id, participation_mode);

-- Return the complete round history as one JSON value so large campaigns are
-- not truncated by PostgREST's maximum rows setting.
CREATE OR REPLACE FUNCTION khatam_public.khatam_history(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(to_jsonb(round_history) ORDER BY round_history.khatam_num DESC),
    '[]'::JSONB
  )
  FROM (
    SELECT
      round.id,
      round.slug,
      round.name,
      round.khatam_num,
      round.created_at,
      round.completed_at,
      round.is_solo,
      round.claim_limit,
      round.location_city,
      round.location_country,
      round.location_lat,
      round.location_lng,
      round.show_names_on_globe,
      round.campaign_id,
      round.participation_mode,
      count(slot.id) FILTER (WHERE slot.status = 'dn') AS done,
      count(slot.id) AS total,
      count(slot.id) FILTER (WHERE slot.status <> 'av') > 0 AS started
    FROM khatam_public.khatams round
    LEFT JOIN khatam_public.slots slot ON slot.khatam_id = round.id
    WHERE round.slug = p_slug
    GROUP BY round.id
  ) round_history
$$;

REVOKE ALL ON FUNCTION khatam_public.khatam_history(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.khatam_history(TEXT)
  TO service_role;

-- Assign a previously empty round to a family or institution.
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

  UPDATE khatam_public.khatams
  SET participation_mode = 'group'
  WHERE id = p_khatam_id;

  RETURN v_updated;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.assign_entire_khatam(BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.assign_entire_khatam(BIGINT, TEXT)
  TO service_role;

-- Duplicate one selected round with the same name/settings and fresh slots.
CREATE OR REPLACE FUNCTION khatam_public.duplicate_khatam_round(
  p_source_khatam_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_source khatam_public.khatams%ROWTYPE;
  v_new_id BIGINT;
  v_new_num INT;
  v_slot_count INT;
BEGIN
  SELECT *
  INTO v_source
  FROM khatam_public.khatams
  WHERE id = p_source_khatam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source khatam not found.';
  END IF;

  SELECT coalesce(max(khatam_num), 0) + 1
  INTO v_new_num
  FROM khatam_public.khatams
  WHERE slug = v_source.slug;

  INSERT INTO khatam_public.khatams (
    slug,
    name,
    pin_hash,
    khatam_num,
    is_solo,
    location_city,
    location_country,
    location_lat,
    location_lng,
    show_names_on_globe,
    claim_limit,
    campaign_id,
    participation_mode
  )
  VALUES (
    v_source.slug,
    v_source.name,
    v_source.pin_hash,
    v_new_num,
    v_source.is_solo,
    v_source.location_city,
    v_source.location_country,
    v_source.location_lat,
    v_source.location_lng,
    v_source.show_names_on_globe,
    v_source.claim_limit,
    v_source.campaign_id,
    v_source.participation_mode
  )
  RETURNING id INTO v_new_id;

  INSERT INTO khatam_public.slots (khatam_id, juz, q)
  SELECT v_new_id, juz, quarter
  FROM generate_series(1, 30) AS juz_series(juz)
  CROSS JOIN generate_series(1, 4) AS quarter_series(quarter);

  GET DIAGNOSTICS v_slot_count = ROW_COUNT;
  IF v_slot_count <> 120 THEN
    RAISE EXCEPTION 'Failed to create every slot for the duplicate.';
  END IF;

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.duplicate_khatam_round(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.duplicate_khatam_round(BIGINT)
  TO service_role;

-- Record an offline family/institution khatam as a newly created, completed
-- campaign round in one transaction.
CREATE OR REPLACE FUNCTION khatam_public.record_completed_khatam(
  p_source_khatam_id BIGINT,
  p_name TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_source khatam_public.khatams%ROWTYPE;
  v_new_id BIGINT;
  v_new_num INT;
  v_now TIMESTAMPTZ := now();
  v_slot_count INT;
BEGIN
  IF btrim(p_name) = '' THEN
    RAISE EXCEPTION 'A family or institution name is required.';
  END IF;

  SELECT *
  INTO v_source
  FROM khatam_public.khatams
  WHERE id = p_source_khatam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source khatam not found.';
  END IF;

  SELECT coalesce(max(khatam_num), 0) + 1
  INTO v_new_num
  FROM khatam_public.khatams
  WHERE slug = v_source.slug;

  INSERT INTO khatam_public.khatams (
    slug,
    name,
    pin_hash,
    khatam_num,
    completed_at,
    is_solo,
    location_city,
    location_country,
    location_lat,
    location_lng,
    show_names_on_globe,
    claim_limit,
    campaign_id,
    participation_mode
  )
  VALUES (
    v_source.slug,
    btrim(p_name),
    v_source.pin_hash,
    v_new_num,
    v_now,
    FALSE,
    v_source.location_city,
    v_source.location_country,
    v_source.location_lat,
    v_source.location_lng,
    v_source.show_names_on_globe,
    v_source.claim_limit,
    v_source.campaign_id,
    'group'
  )
  RETURNING id INTO v_new_id;

  INSERT INTO khatam_public.slots (
    khatam_id,
    juz,
    q,
    status,
    claimed_by,
    claimed_at,
    done_at
  )
  SELECT
    v_new_id,
    juz,
    quarter,
    'dn',
    btrim(p_name),
    v_now,
    v_now
  FROM generate_series(1, 30) AS juz_series(juz)
  CROSS JOIN generate_series(1, 4) AS quarter_series(quarter);

  GET DIAGNOSTICS v_slot_count = ROW_COUNT;
  IF v_slot_count <> 120 THEN
    RAISE EXCEPTION 'Failed to create every completed slot.';
  END IF;

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.record_completed_khatam(BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.record_completed_khatam(BIGINT, TEXT)
  TO service_role;

-- Preserve the round category when bulk-creating campaign targets.
CREATE OR REPLACE FUNCTION khatam_public.create_khatam_rounds(
  p_source_khatam_id BIGINT,
  p_target_total INT,
  p_name_prefix TEXT DEFAULT ''
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_source khatam_public.khatams%ROWTYPE;
  v_existing_count INT;
  v_max_num INT;
  v_to_create INT;
  v_slot_count INT;
BEGIN
  IF p_target_total < 1 OR p_target_total > 5000 THEN
    RAISE EXCEPTION 'Campaign target must be between 1 and 5000.';
  END IF;

  SELECT *
  INTO v_source
  FROM khatam_public.khatams
  WHERE id = p_source_khatam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source khatam not found.';
  END IF;

  IF v_source.campaign_id IS NULL THEN
    RAISE EXCEPTION 'This khatam is not linked to a campaign.';
  END IF;

  SELECT count(*)::INT, coalesce(max(khatam_num), 0)::INT
  INTO v_existing_count, v_max_num
  FROM khatam_public.khatams
  WHERE campaign_id = v_source.campaign_id
    AND slug = v_source.slug;

  IF p_target_total < v_existing_count THEN
    RAISE EXCEPTION 'Campaign target cannot be lower than the current round count.';
  END IF;

  v_to_create := least(p_target_total - v_existing_count, 100);

  IF v_to_create > 0 THEN
    WITH new_khatams AS (
      INSERT INTO khatam_public.khatams (
        slug,
        name,
        pin_hash,
        khatam_num,
        is_solo,
        location_city,
        location_country,
        location_lat,
        location_lng,
        show_names_on_globe,
        claim_limit,
        campaign_id,
        participation_mode
      )
      SELECT
        v_source.slug,
        CASE
          WHEN btrim(coalesce(p_name_prefix, '')) = ''
            THEN 'Khatam ' || (v_max_num + n)
          ELSE btrim(p_name_prefix) || ' ' || (v_max_num + n)
        END,
        v_source.pin_hash,
        v_max_num + n,
        v_source.is_solo,
        v_source.location_city,
        v_source.location_country,
        v_source.location_lat,
        v_source.location_lng,
        v_source.show_names_on_globe,
        v_source.claim_limit,
        v_source.campaign_id,
        v_source.participation_mode
      FROM generate_series(1, v_to_create) AS series(n)
      RETURNING id
    )
    INSERT INTO khatam_public.slots (khatam_id, juz, q)
    SELECT new_khatams.id, juz, quarter
    FROM new_khatams
    CROSS JOIN generate_series(1, 30) AS juz_series(juz)
    CROSS JOIN generate_series(1, 4) AS quarter_series(quarter);

    GET DIAGNOSTICS v_slot_count = ROW_COUNT;

    IF v_slot_count <> v_to_create * 120 THEN
      RAISE EXCEPTION 'Failed to create every slot for the new rounds.';
    END IF;
  END IF;

  UPDATE khatam_public.campaigns
  SET goal = greatest(goal, p_target_total)
  WHERE id = v_source.campaign_id;

  RETURN v_to_create;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.create_khatam_rounds(BIGINT, INT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.create_khatam_rounds(BIGINT, INT, TEXT)
  TO service_role;
