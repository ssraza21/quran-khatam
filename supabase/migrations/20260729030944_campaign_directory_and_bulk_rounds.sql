-- Efficient aggregate counts for campaign pages with many rounds.
CREATE OR REPLACE FUNCTION khatam_public.khatam_round_counts(p_slug TEXT)
RETURNS TABLE (
  khatam_id BIGINT,
  done_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    k.id,
    count(s.id) FILTER (WHERE s.status = 'dn') AS done_count,
    count(s.id) AS total_count
  FROM khatam_public.khatams k
  LEFT JOIN khatam_public.slots s ON s.khatam_id = k.id
  WHERE k.slug = p_slug
  GROUP BY k.id
$$;

REVOKE ALL ON FUNCTION khatam_public.khatam_round_counts(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.khatam_round_counts(TEXT)
  TO service_role;

-- Keep directory and search responses bounded regardless of the number of
-- rounds in a campaign. This avoids the Data API's per-request row ceiling and
-- prevents orphaned campaigns from corrupting pagination totals.
CREATE INDEX IF NOT EXISTS idx_slots_started_khatam_id
  ON khatam_public.slots(khatam_id)
  WHERE status <> 'av';

-- Repair legacy completion timestamps so directory counts are correct on the
-- first deployment, not only after a round is edited by the updated Worker.
WITH completion_state AS (
  SELECT
    khatam.id,
    count(slot.id) AS total_count,
    count(slot.id) FILTER (WHERE slot.status = 'dn') AS done_count
  FROM khatam_public.khatams khatam
  LEFT JOIN khatam_public.slots slot ON slot.khatam_id = khatam.id
  GROUP BY khatam.id
)
UPDATE khatam_public.khatams khatam
SET completed_at = CASE
  WHEN completion_state.total_count = 120
    AND completion_state.done_count = 120
    THEN coalesce(khatam.completed_at, now())
  ELSE NULL
END
FROM completion_state
WHERE completion_state.id = khatam.id
  AND (
    (completion_state.total_count = 120
      AND completion_state.done_count = 120
      AND khatam.completed_at IS NULL)
    OR ((completion_state.total_count <> 120
      OR completion_state.done_count <> 120)
      AND khatam.completed_at IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION khatam_public.campaign_directory(
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  slug TEXT,
  campaign_name TEXT,
  description TEXT,
  is_featured BOOLEAN,
  goal INT,
  total_khatams BIGINT,
  in_progress_khatams BIGINT,
  completed_khatams BIGINT,
  active_round_name TEXT,
  active_round_num INT,
  total_matching BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH matching_campaigns AS (
    SELECT
      c.id,
      c.name,
      c.description,
      c.is_featured,
      c.goal,
      c.created_at,
      count(*) OVER () AS total_matching
    FROM khatam_public.campaigns c
    WHERE c.is_searchable = TRUE
      AND EXISTS (
        SELECT 1
        FROM khatam_public.khatams existing_round
        WHERE existing_round.campaign_id = c.id
      )
      AND (
        btrim(coalesce(p_query, '')) = ''
        OR strpos(lower(c.name), lower(btrim(p_query))) > 0
        OR strpos(lower(c.slug), lower(btrim(p_query))) > 0
      )
  ),
  campaign_page AS (
    SELECT *
    FROM matching_campaigns
    ORDER BY is_featured DESC, created_at DESC, id DESC
    LIMIT least(greatest(coalesce(p_limit, 24), 1), 48)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT
    active_round.slug,
    campaign_page.name AS campaign_name,
    campaign_page.description,
    campaign_page.is_featured,
    greatest(campaign_page.goal, round_stats.total_khatams::INT) AS goal,
    round_stats.total_khatams,
    round_stats.in_progress_khatams,
    round_stats.completed_khatams,
    active_round.name AS active_round_name,
    active_round.khatam_num AS active_round_num,
    campaign_page.total_matching
  FROM campaign_page
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS total_khatams,
      count(*) FILTER (
        WHERE round.completed_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM khatam_public.slots started_slot
            WHERE started_slot.khatam_id = round.id
              AND started_slot.status <> 'av'
          )
      ) AS in_progress_khatams,
      count(*) FILTER (WHERE round.completed_at IS NOT NULL) AS completed_khatams
    FROM khatam_public.khatams round
    WHERE round.campaign_id = campaign_page.id
  ) round_stats
  CROSS JOIN LATERAL (
    SELECT round.slug, round.name, round.khatam_num
    FROM khatam_public.khatams round
    WHERE round.campaign_id = campaign_page.id
    ORDER BY
      (round.completed_at IS NOT NULL) ASC,
      round.created_at DESC,
      round.id DESC
    LIMIT 1
  ) active_round
  ORDER BY campaign_page.is_featured DESC, campaign_page.created_at DESC, campaign_page.id DESC
$$;

REVOKE ALL ON FUNCTION khatam_public.campaign_directory(TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.campaign_directory(TEXT, INT, INT)
  TO service_role;

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

-- Delete a round and clean up campaign-scoped data if it was the final round.
-- The foreign key already cascades slot deletion.
CREATE OR REPLACE FUNCTION khatam_public.delete_khatam_round(p_khatam_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_campaign_id BIGINT;
  v_slug TEXT;
BEGIN
  SELECT round.campaign_id, round.slug
  INTO v_campaign_id, v_slug
  FROM khatam_public.khatams round
  WHERE round.id = p_khatam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  DELETE FROM khatam_public.khatams
  WHERE id = p_khatam_id;

  IF NOT EXISTS (
    SELECT 1
    FROM khatam_public.khatams remaining_round
    WHERE remaining_round.slug = v_slug
  ) THEN
    DELETE FROM khatam_public.khatam_participants
    WHERE slug = v_slug;
  END IF;

  IF v_campaign_id IS NOT NULL THEN
    DELETE FROM khatam_public.campaigns campaign
    WHERE campaign.id = v_campaign_id
      AND NOT EXISTS (
        SELECT 1
        FROM khatam_public.khatams remaining_round
        WHERE remaining_round.campaign_id = campaign.id
      );
  END IF;

  RETURN TRUE;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.delete_khatam_round(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.delete_khatam_round(BIGINT)
  TO service_role;

-- Create every missing round up to a campaign target in one transaction.
-- A single call may add at most 100 rounds (12,000 slots) to keep requests
-- bounded while still covering large madrasa campaigns.
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
        campaign_id
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
        v_source.campaign_id
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
