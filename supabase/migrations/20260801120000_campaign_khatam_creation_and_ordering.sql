-- Add campaign-level ordering and atomic organizer actions for creating and
-- completing Khatams. Existing round numbers remain stable identifiers; the
-- display order is intentionally independent from them.

ALTER TABLE khatam_public.khatams
  ADD COLUMN IF NOT EXISTS display_order INT;

UPDATE khatam_public.khatams
SET display_order = khatam_num
WHERE display_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_khatams_campaign_display_order
  ON khatam_public.khatams(campaign_id, display_order, khatam_num);

-- Return every Khatam in its organizer-defined order without being truncated
-- by PostgREST's maximum row setting.
CREATE OR REPLACE FUNCTION khatam_public.khatam_history(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(
      to_jsonb(round_history)
      ORDER BY round_history.display_order ASC, round_history.khatam_num ASC
    ),
    '[]'::JSONB
  )
  FROM (
    SELECT
      round.id,
      round.slug,
      round.name,
      round.khatam_num,
      coalesce(round.display_order, round.khatam_num) AS display_order,
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

-- Create one or many Khatams and all of their slots in one transaction. A
-- completed batch is useful for recording offline Khatams without one request
-- per Khatam.
CREATE OR REPLACE FUNCTION khatam_public.create_campaign_khatams(
  p_source_khatam_id BIGINT,
  p_count INT,
  p_exact_name TEXT DEFAULT '',
  p_name_prefix TEXT DEFAULT '',
  p_participation_mode TEXT DEFAULT 'open',
  p_completed BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_source khatam_public.khatams%ROWTYPE;
  v_existing_count INT;
  v_max_num INT;
  v_max_order INT;
  v_new_id BIGINT;
  v_new_num INT;
  v_new_name TEXT;
  v_now TIMESTAMPTZ := now();
  v_created_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_index INT;
  v_slot_count INT;
BEGIN
  IF p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'Khatam count must be between 1 and 100.';
  END IF;

  IF p_participation_mode NOT IN ('open', 'group') THEN
    RAISE EXCEPTION 'Participation mode must be open or group.';
  END IF;

  IF length(btrim(coalesce(p_exact_name, ''))) > 80
    OR length(btrim(coalesce(p_name_prefix, ''))) > 60 THEN
    RAISE EXCEPTION 'Khatam name is too long.';
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

  SELECT
    count(*)::INT,
    coalesce(max(khatam_num), 0)::INT,
    coalesce(max(display_order), 0)::INT
  INTO v_existing_count, v_max_num, v_max_order
  FROM khatam_public.khatams
  WHERE campaign_id = v_source.campaign_id
    AND slug = v_source.slug;

  FOR v_index IN 1..p_count LOOP
    v_new_num := v_max_num + v_index;
    v_new_name := CASE
      WHEN p_count = 1 AND btrim(coalesce(p_exact_name, '')) <> ''
        THEN btrim(p_exact_name)
      WHEN btrim(coalesce(p_name_prefix, '')) <> ''
        THEN btrim(p_name_prefix) || ' ' || v_new_num
      ELSE 'Khatam ' || v_new_num
    END;

    INSERT INTO khatam_public.khatams (
      slug,
      name,
      pin_hash,
      khatam_num,
      display_order,
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
      v_new_name,
      v_source.pin_hash,
      v_new_num,
      v_max_order + v_index,
      CASE WHEN p_completed THEN v_now ELSE NULL END,
      FALSE,
      v_source.location_city,
      v_source.location_country,
      v_source.location_lat,
      v_source.location_lng,
      v_source.show_names_on_globe,
      v_source.claim_limit,
      v_source.campaign_id,
      p_participation_mode
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
      CASE WHEN p_completed THEN 'dn' ELSE 'av' END,
      CASE WHEN p_completed THEN v_new_name ELSE NULL END,
      CASE WHEN p_completed THEN v_now ELSE NULL END,
      CASE WHEN p_completed THEN v_now ELSE NULL END
    FROM generate_series(1, 30) AS juz_series(juz)
    CROSS JOIN generate_series(1, 4) AS quarter_series(quarter);

    GET DIAGNOSTICS v_slot_count = ROW_COUNT;
    IF v_slot_count <> 120 THEN
      RAISE EXCEPTION 'Failed to create every slot for Khatam %.', v_new_num;
    END IF;

    v_created_ids := array_append(v_created_ids, v_new_id);
  END LOOP;

  UPDATE khatam_public.campaigns
  SET goal = greatest(goal, v_existing_count + p_count)
  WHERE id = v_source.campaign_id;

  RETURN v_created_ids;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.create_campaign_khatams(BIGINT, INT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.create_campaign_khatams(BIGINT, INT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;

-- Mark every portion in one existing Khatam complete while preserving any
-- participant names already recorded on claimed portions.
CREATE OR REPLACE FUNCTION khatam_public.complete_entire_khatam(
  p_khatam_id BIGINT,
  p_completed_by TEXT DEFAULT 'Admin'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_updated INT;
BEGIN
  UPDATE khatam_public.slots
  SET
    status = 'dn',
    claimed_by = coalesce(claimed_by, nullif(btrim(p_completed_by), ''), 'Admin'),
    claimed_at = coalesce(claimed_at, v_now),
    done_at = v_now
  WHERE khatam_id = p_khatam_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 120 THEN
    RAISE EXCEPTION 'A complete Khatam must contain exactly 120 portions.';
  END IF;

  UPDATE khatam_public.khatams
  SET completed_at = v_now
  WHERE id = p_khatam_id;

  RETURN v_updated;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.complete_entire_khatam(BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.complete_entire_khatam(BIGINT, TEXT)
  TO service_role;

-- Persist an exact campaign order. Requiring the full set prevents accidental
-- omission or cross-campaign movement when two browser tabs are stale.
CREATE OR REPLACE FUNCTION khatam_public.reorder_campaign_khatams(
  p_source_khatam_id BIGINT,
  p_ordered_ids BIGINT[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_campaign_id BIGINT;
  v_slug TEXT;
  v_expected_count INT;
  v_distinct_count INT;
  v_matching_count INT;
BEGIN
  SELECT campaign_id, slug
  INTO v_campaign_id, v_slug
  FROM khatam_public.khatams
  WHERE id = p_source_khatam_id
  FOR UPDATE;

  IF NOT FOUND OR v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found.';
  END IF;

  SELECT count(*)::INT
  INTO v_expected_count
  FROM khatam_public.khatams
  WHERE campaign_id = v_campaign_id AND slug = v_slug;

  SELECT count(DISTINCT id)::INT
  INTO v_distinct_count
  FROM unnest(p_ordered_ids) AS ordered(id);

  SELECT count(*)::INT
  INTO v_matching_count
  FROM khatam_public.khatams
  WHERE campaign_id = v_campaign_id
    AND slug = v_slug
    AND id = ANY(p_ordered_ids);

  IF cardinality(p_ordered_ids) <> v_expected_count
    OR v_distinct_count <> v_expected_count
    OR v_matching_count <> v_expected_count THEN
    RAISE EXCEPTION 'The order must include every Khatam in this campaign exactly once.';
  END IF;

  UPDATE khatam_public.khatams AS round
  SET display_order = ordered.position::INT
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE round.id = ordered.id
    AND round.campaign_id = v_campaign_id;

  RETURN v_expected_count;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.reorder_campaign_khatams(BIGINT, BIGINT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.reorder_campaign_khatams(BIGINT, BIGINT[])
  TO service_role;
