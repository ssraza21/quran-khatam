-- Generalize campaigns into containers of one or more organizer-managed goals.
-- Existing Quran Khatams remain unchanged and are backfilled into one Quran
-- goal per campaign. Surah goals use aggregate participant pledges rather than
-- manufacturing Quran-style Juz/quarter slots.

ALTER TABLE khatam_public.campaigns
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

UPDATE khatam_public.campaigns campaign
SET pin_hash = (
  SELECT khatam.pin_hash
  FROM khatam_public.khatams khatam
  WHERE khatam.campaign_id = campaign.id
  ORDER BY khatam.khatam_num DESC, khatam.id DESC
  LIMIT 1
)
WHERE campaign.pin_hash IS NULL;

CREATE TABLE khatam_public.campaign_goals (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id     BIGINT NOT NULL REFERENCES khatam_public.campaigns(id) ON DELETE CASCADE,
  goal_type       TEXT NOT NULL CHECK (goal_type IN ('quran_khatam', 'surah_recitation')),
  surah_number    SMALLINT,
  target          INT NOT NULL CHECK (target BETWEEN 1 AND 1000000),
  display_order   INT NOT NULL DEFAULT 1,
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  CONSTRAINT campaign_goals_surah_shape CHECK (
    (goal_type = 'quran_khatam' AND surah_number IS NULL)
    OR (goal_type = 'surah_recitation' AND surah_number BETWEEN 1 AND 114)
  )
);

CREATE UNIQUE INDEX campaign_goals_one_quran_goal
  ON khatam_public.campaign_goals(campaign_id)
  WHERE goal_type = 'quran_khatam';

CREATE UNIQUE INDEX campaign_goals_one_goal_per_surah
  ON khatam_public.campaign_goals(campaign_id, surah_number)
  WHERE goal_type = 'surah_recitation';

CREATE INDEX idx_campaign_goals_campaign_order
  ON khatam_public.campaign_goals(campaign_id, display_order, id);

INSERT INTO khatam_public.campaign_goals (
  campaign_id,
  goal_type,
  target,
  display_order,
  is_enabled
)
SELECT
  campaign.id,
  'quran_khatam',
  greatest(campaign.goal, 1),
  1,
  TRUE
FROM khatam_public.campaigns campaign
WHERE NOT EXISTS (
  SELECT 1
  FROM khatam_public.campaign_goals existing_goal
  WHERE existing_goal.campaign_id = campaign.id
    AND existing_goal.goal_type = 'quran_khatam'
);

ALTER TABLE khatam_public.khatams
  ADD COLUMN IF NOT EXISTS campaign_goal_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'khatams_campaign_goal_id_fkey'
      AND conrelid = 'khatam_public.khatams'::regclass
  ) THEN
    ALTER TABLE khatam_public.khatams
      ADD CONSTRAINT khatams_campaign_goal_id_fkey
      FOREIGN KEY (campaign_goal_id)
      REFERENCES khatam_public.campaign_goals(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

UPDATE khatam_public.khatams khatam
SET campaign_goal_id = goal.id
FROM khatam_public.campaign_goals goal
WHERE khatam.campaign_goal_id IS NULL
  AND goal.campaign_id = khatam.campaign_id
  AND goal.goal_type = 'quran_khatam';

CREATE INDEX IF NOT EXISTS idx_khatams_campaign_goal_id
  ON khatam_public.khatams(campaign_goal_id);

CREATE TABLE khatam_public.recitation_contributions (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id           BIGINT NOT NULL REFERENCES khatam_public.campaign_goals(id) ON DELETE CASCADE,
  participant_name  TEXT NOT NULL CHECK (
    length(btrim(participant_name)) BETWEEN 1 AND 60
  ),
  participant_key   TEXT NOT NULL CHECK (
    participant_key = lower(btrim(participant_name))
  ),
  pledged_count     INT NOT NULL DEFAULT 0 CHECK (pledged_count > 0),
  completed_count   INT NOT NULL DEFAULT 0 CHECK (
    completed_count >= 0 AND completed_count <= pledged_count
  ),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, participant_key)
);

CREATE INDEX idx_recitation_contributions_goal_updated
  ON khatam_public.recitation_contributions(goal_id, updated_at DESC, id DESC);

ALTER TABLE khatam_public.campaign_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE khatam_public.recitation_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_campaign_goals"
  ON khatam_public.campaign_goals
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "authenticated_select_campaign_goals"
  ON khatam_public.campaign_goals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "service_all_campaign_goals"
  ON khatam_public.campaign_goals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_select_recitation_contributions"
  ON khatam_public.recitation_contributions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "authenticated_select_recitation_contributions"
  ON khatam_public.recitation_contributions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "service_all_recitation_contributions"
  ON khatam_public.recitation_contributions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE khatam_public.campaign_goals TO service_role;
GRANT SELECT ON TABLE khatam_public.campaign_goals TO anon, authenticated;
GRANT ALL ON TABLE khatam_public.recitation_contributions TO service_role;
GRANT SELECT ON TABLE khatam_public.recitation_contributions TO anon, authenticated;
GRANT ALL ON SEQUENCE khatam_public.campaign_goals_id_seq TO service_role;
GRANT USAGE ON SEQUENCE khatam_public.campaign_goals_id_seq TO anon, authenticated;
GRANT ALL ON SEQUENCE khatam_public.recitation_contributions_id_seq TO service_role;
GRANT USAGE ON SEQUENCE khatam_public.recitation_contributions_id_seq TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'khatam_public'
      AND tablename = 'campaign_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE khatam_public.campaign_goals;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'khatam_public'
      AND tablename = 'recitation_contributions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE khatam_public.recitation_contributions;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION khatam_public.touch_campaign_goal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER touch_campaign_goals_updated_at
BEFORE UPDATE ON khatam_public.campaign_goals
FOR EACH ROW
EXECUTE FUNCTION khatam_public.touch_campaign_goal_updated_at();

CREATE TRIGGER touch_recitation_contributions_updated_at
BEFORE UPDATE ON khatam_public.recitation_contributions
FOR EACH ROW
EXECUTE FUNCTION khatam_public.touch_campaign_goal_updated_at();

CREATE OR REPLACE FUNCTION khatam_public.sync_quran_campaign_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_goal_id BIGINT;
BEGIN
  SELECT goal.id
  INTO v_goal_id
  FROM khatam_public.campaign_goals goal
  WHERE goal.campaign_id = NEW.id
    AND goal.goal_type = 'quran_khatam'
  FOR UPDATE;

  IF v_goal_id IS NULL THEN
    INSERT INTO khatam_public.campaign_goals (
      campaign_id,
      goal_type,
      target,
      display_order,
      is_enabled
    )
    VALUES (NEW.id, 'quran_khatam', greatest(NEW.goal, 1), 1, TRUE);
  ELSE
    UPDATE khatam_public.campaign_goals
    SET target = greatest(NEW.goal, 1)
    WHERE id = v_goal_id
      AND target IS DISTINCT FROM greatest(NEW.goal, 1);
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER sync_quran_campaign_goal
AFTER INSERT OR UPDATE OF goal ON khatam_public.campaigns
FOR EACH ROW
EXECUTE FUNCTION khatam_public.sync_quran_campaign_goal();

CREATE OR REPLACE FUNCTION khatam_public.assign_quran_goal_to_khatam()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL AND NEW.campaign_goal_id IS NULL THEN
    SELECT goal.id
    INTO NEW.campaign_goal_id
    FROM khatam_public.campaign_goals goal
    WHERE goal.campaign_id = NEW.campaign_id
      AND goal.goal_type = 'quran_khatam'
    LIMIT 1;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER assign_quran_goal_to_khatam
BEFORE INSERT OR UPDATE OF campaign_id ON khatam_public.khatams
FOR EACH ROW
EXECUTE FUNCTION khatam_public.assign_quran_goal_to_khatam();

-- Return every goal and its aggregate state as one JSON value so the Worker is
-- not affected by PostgREST row limits.
CREATE OR REPLACE FUNCTION khatam_public.campaign_goal_summary(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(to_jsonb(goal_summary) ORDER BY goal_summary.display_order, goal_summary.id),
    '[]'::JSONB
  )
  FROM (
    SELECT
      goal.id,
      goal.campaign_id,
      goal.goal_type,
      goal.surah_number,
      goal.target,
      goal.display_order,
      goal.is_enabled,
      goal.created_at,
      goal.updated_at,
      goal.completed_at,
      CASE
        WHEN goal.goal_type = 'quran_khatam' THEN (
          SELECT count(*)::BIGINT
          FROM khatam_public.khatams khatam
          WHERE khatam.campaign_id = goal.campaign_id
            AND (khatam.campaign_goal_id = goal.id OR khatam.campaign_goal_id IS NULL)
        )
        ELSE coalesce((
          SELECT sum(contribution.pledged_count)::BIGINT
          FROM khatam_public.recitation_contributions contribution
          WHERE contribution.goal_id = goal.id
        ), 0)
      END AS pledged,
      CASE
        WHEN goal.goal_type = 'quran_khatam' THEN (
          SELECT count(*)::BIGINT
          FROM khatam_public.khatams khatam
          WHERE khatam.campaign_id = goal.campaign_id
            AND (khatam.campaign_goal_id = goal.id OR khatam.campaign_goal_id IS NULL)
            AND khatam.completed_at IS NOT NULL
        )
        ELSE coalesce((
          SELECT sum(contribution.completed_count)::BIGINT
          FROM khatam_public.recitation_contributions contribution
          WHERE contribution.goal_id = goal.id
        ), 0)
      END AS completed,
      CASE
        WHEN goal.goal_type = 'quran_khatam' THEN (
          SELECT count(*)::BIGINT
          FROM khatam_public.khatams khatam
          WHERE khatam.campaign_id = goal.campaign_id
            AND (khatam.campaign_goal_id = goal.id OR khatam.campaign_goal_id IS NULL)
            AND khatam.completed_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM khatam_public.slots slot
              WHERE slot.khatam_id = khatam.id
                AND slot.status <> 'av'
            )
        )
        ELSE coalesce((
          SELECT sum(contribution.pledged_count - contribution.completed_count)::BIGINT
          FROM khatam_public.recitation_contributions contribution
          WHERE contribution.goal_id = goal.id
        ), 0)
      END AS in_progress,
      CASE
        WHEN goal.goal_type = 'surah_recitation' THEN (
          SELECT count(*)::BIGINT
          FROM khatam_public.recitation_contributions contribution
          WHERE contribution.goal_id = goal.id
        )
        ELSE 0::BIGINT
      END AS contributor_count
    FROM khatam_public.campaign_goals goal
    JOIN khatam_public.campaigns campaign ON campaign.id = goal.campaign_id
    WHERE campaign.slug = p_slug
  ) goal_summary
$$;

REVOKE ALL ON FUNCTION khatam_public.campaign_goal_summary(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.campaign_goal_summary(TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.campaign_goal_summaries(p_slugs TEXT[])
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_object_agg(campaign.slug, khatam_public.campaign_goal_summary(campaign.slug)),
    '{}'::JSONB
  )
  FROM khatam_public.campaigns campaign
  WHERE campaign.slug = ANY(coalesce(p_slugs, ARRAY[]::TEXT[]))
$$;

REVOKE ALL ON FUNCTION khatam_public.campaign_goal_summaries(TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.campaign_goal_summaries(TEXT[])
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.pledge_surah_recitations(
  p_goal_id BIGINT,
  p_participant_name TEXT,
  p_quantity INT
)
RETURNS TABLE (
  contribution_id BIGINT,
  pledged_count INT,
  completed_count INT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_goal khatam_public.campaign_goals%ROWTYPE;
  v_total_pledged BIGINT;
BEGIN
  IF length(btrim(coalesce(p_participant_name, ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Name must be between 1 and 60 characters.';
  END IF;
  IF p_quantity < 1 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'Pledge quantity must be between 1 and 10,000.';
  END IF;

  SELECT *
  INTO v_goal
  FROM khatam_public.campaign_goals
  WHERE id = p_goal_id
  FOR UPDATE;

  IF NOT FOUND OR v_goal.goal_type <> 'surah_recitation' THEN
    RAISE EXCEPTION 'Surah goal not found.';
  END IF;
  IF NOT v_goal.is_enabled THEN
    RAISE EXCEPTION 'This Surah goal is not accepting pledges.';
  END IF;

  SELECT coalesce(sum(contribution.pledged_count), 0)
  INTO v_total_pledged
  FROM khatam_public.recitation_contributions contribution
  WHERE contribution.goal_id = p_goal_id;

  IF v_total_pledged + p_quantity > v_goal.target THEN
    RAISE EXCEPTION 'Only % recitations remain available.', greatest(v_goal.target - v_total_pledged, 0);
  END IF;

  INSERT INTO khatam_public.recitation_contributions (
    goal_id,
    participant_name,
    participant_key,
    pledged_count,
    completed_count
  )
  VALUES (
    p_goal_id,
    btrim(p_participant_name),
    lower(btrim(p_participant_name)),
    p_quantity,
    0
  )
  ON CONFLICT (goal_id, participant_key)
  DO UPDATE SET
    participant_name = EXCLUDED.participant_name,
    pledged_count = khatam_public.recitation_contributions.pledged_count + EXCLUDED.pledged_count
  RETURNING
    id,
    khatam_public.recitation_contributions.pledged_count,
    khatam_public.recitation_contributions.completed_count
  INTO contribution_id, pledged_count, completed_count;

  RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.pledge_surah_recitations(BIGINT, TEXT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.pledge_surah_recitations(BIGINT, TEXT, INT)
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.complete_surah_recitations(
  p_goal_id BIGINT,
  p_participant_name TEXT,
  p_quantity INT
)
RETURNS TABLE (
  contribution_id BIGINT,
  pledged_count INT,
  completed_count INT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_contribution khatam_public.recitation_contributions%ROWTYPE;
  v_target INT;
  v_total_completed BIGINT;
BEGIN
  IF p_quantity < 1 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'Completion quantity must be between 1 and 10,000.';
  END IF;

  SELECT contribution.*
  INTO v_contribution
  FROM khatam_public.recitation_contributions contribution
  JOIN khatam_public.campaign_goals goal ON goal.id = contribution.goal_id
  WHERE contribution.goal_id = p_goal_id
    AND contribution.participant_key = lower(btrim(coalesce(p_participant_name, '')))
    AND goal.goal_type = 'surah_recitation'
  FOR UPDATE OF contribution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pledge was found for this name.';
  END IF;
  IF v_contribution.completed_count + p_quantity > v_contribution.pledged_count THEN
    RAISE EXCEPTION 'Only % pledged recitations remain incomplete.',
      v_contribution.pledged_count - v_contribution.completed_count;
  END IF;

  UPDATE khatam_public.recitation_contributions contribution
  SET completed_count = contribution.completed_count + p_quantity
  WHERE contribution.id = v_contribution.id
  RETURNING contribution.id, contribution.pledged_count, contribution.completed_count
  INTO contribution_id, pledged_count, completed_count;

  SELECT goal.target
  INTO v_target
  FROM khatam_public.campaign_goals goal
  WHERE goal.id = p_goal_id
  FOR UPDATE;

  SELECT coalesce(sum(contribution.completed_count), 0)
  INTO v_total_completed
  FROM khatam_public.recitation_contributions contribution
  WHERE contribution.goal_id = p_goal_id;

  UPDATE khatam_public.campaign_goals
  SET completed_at = CASE WHEN v_total_completed >= v_target THEN now() ELSE NULL END
  WHERE id = p_goal_id;

  RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.complete_surah_recitations(BIGINT, TEXT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.complete_surah_recitations(BIGINT, TEXT, INT)
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.upsert_surah_goal(
  p_campaign_id BIGINT,
  p_goal_id BIGINT,
  p_surah_number INT,
  p_target INT,
  p_is_enabled BOOLEAN DEFAULT TRUE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_goal_id BIGINT;
  v_pledged BIGINT;
  v_completed BIGINT;
  v_next_order INT;
BEGIN
  IF p_surah_number NOT BETWEEN 1 AND 114 THEN
    RAISE EXCEPTION 'Surah number must be between 1 and 114.';
  END IF;
  IF p_target NOT BETWEEN 1 AND 1000000 THEN
    RAISE EXCEPTION 'Goal target must be between 1 and 1,000,000.';
  END IF;

  PERFORM 1
  FROM khatam_public.campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found.';
  END IF;

  IF p_goal_id IS NULL THEN
    SELECT coalesce(max(goal.display_order), 0) + 1
    INTO v_next_order
    FROM khatam_public.campaign_goals goal
    WHERE goal.campaign_id = p_campaign_id;

    INSERT INTO khatam_public.campaign_goals (
      campaign_id,
      goal_type,
      surah_number,
      target,
      display_order,
      is_enabled
    )
    VALUES (
      p_campaign_id,
      'surah_recitation',
      p_surah_number,
      p_target,
      v_next_order,
      coalesce(p_is_enabled, TRUE)
    )
    RETURNING id INTO v_goal_id;
  ELSE
    SELECT
      coalesce(sum(contribution.pledged_count), 0),
      coalesce(sum(contribution.completed_count), 0)
    INTO v_pledged, v_completed
    FROM khatam_public.recitation_contributions contribution
    JOIN khatam_public.campaign_goals goal ON goal.id = contribution.goal_id
    WHERE goal.id = p_goal_id
      AND goal.campaign_id = p_campaign_id
      AND goal.goal_type = 'surah_recitation';

    IF p_target < v_pledged THEN
      RAISE EXCEPTION 'Goal target cannot be lower than the % already pledged.', v_pledged;
    END IF;

    UPDATE khatam_public.campaign_goals
    SET
      surah_number = p_surah_number,
      target = p_target,
      is_enabled = coalesce(p_is_enabled, is_enabled),
      completed_at = CASE
        WHEN v_completed >= p_target THEN coalesce(completed_at, now())
        ELSE NULL
      END
    WHERE id = p_goal_id
      AND campaign_id = p_campaign_id
      AND goal_type = 'surah_recitation'
    RETURNING id INTO v_goal_id;

    IF v_goal_id IS NULL THEN
      RAISE EXCEPTION 'Surah goal not found.';
    END IF;
  END IF;

  RETURN v_goal_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This campaign already has a goal for that Surah.';
END
$$;

REVOKE ALL ON FUNCTION khatam_public.upsert_surah_goal(BIGINT, BIGINT, INT, INT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.upsert_surah_goal(BIGINT, BIGINT, INT, INT, BOOLEAN)
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.set_campaign_goal_enabled(
  p_campaign_id BIGINT,
  p_goal_id BIGINT,
  p_is_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM khatam_public.campaign_goals
  WHERE campaign_id = p_campaign_id
  FOR UPDATE;

  IF NOT p_is_enabled AND NOT EXISTS (
    SELECT 1
    FROM khatam_public.campaign_goals goal
    WHERE goal.campaign_id = p_campaign_id
      AND goal.id <> p_goal_id
      AND goal.is_enabled = TRUE
  ) THEN
    RAISE EXCEPTION 'A campaign must have at least one enabled goal.';
  END IF;

  UPDATE khatam_public.campaign_goals
  SET is_enabled = p_is_enabled
  WHERE id = p_goal_id
    AND campaign_id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign goal not found.';
  END IF;

  RETURN p_is_enabled;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.set_campaign_goal_enabled(BIGINT, BIGINT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.set_campaign_goal_enabled(BIGINT, BIGINT, BOOLEAN)
  TO service_role;

CREATE OR REPLACE FUNCTION khatam_public.set_surah_contribution(
  p_goal_id BIGINT,
  p_participant_name TEXT,
  p_pledged_count INT,
  p_completed_count INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_goal khatam_public.campaign_goals%ROWTYPE;
  v_other_pledged BIGINT;
BEGIN
  IF length(btrim(coalesce(p_participant_name, ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Name must be between 1 and 60 characters.';
  END IF;
  IF p_pledged_count < 0 OR p_completed_count < 0 OR p_completed_count > p_pledged_count THEN
    RAISE EXCEPTION 'Completed recitations must be between zero and the pledged amount.';
  END IF;

  SELECT *
  INTO v_goal
  FROM khatam_public.campaign_goals
  WHERE id = p_goal_id
    AND goal_type = 'surah_recitation'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Surah goal not found.';
  END IF;

  SELECT coalesce(sum(contribution.pledged_count), 0)
  INTO v_other_pledged
  FROM khatam_public.recitation_contributions contribution
  WHERE contribution.goal_id = p_goal_id
    AND contribution.participant_key <> lower(btrim(p_participant_name));

  IF v_other_pledged + p_pledged_count > v_goal.target THEN
    RAISE EXCEPTION 'The adjusted pledge would exceed the goal target.';
  END IF;

  IF p_pledged_count = 0 THEN
    DELETE FROM khatam_public.recitation_contributions
    WHERE goal_id = p_goal_id
      AND participant_key = lower(btrim(p_participant_name));
  ELSE
    INSERT INTO khatam_public.recitation_contributions (
      goal_id,
      participant_name,
      participant_key,
      pledged_count,
      completed_count
    )
    VALUES (
      p_goal_id,
      btrim(p_participant_name),
      lower(btrim(p_participant_name)),
      p_pledged_count,
      p_completed_count
    )
    ON CONFLICT (goal_id, participant_key)
    DO UPDATE SET
      participant_name = EXCLUDED.participant_name,
      pledged_count = EXCLUDED.pledged_count,
      completed_count = EXCLUDED.completed_count;
  END IF;

  UPDATE khatam_public.campaign_goals goal
  SET completed_at = CASE
    WHEN (
      SELECT coalesce(sum(contribution.completed_count), 0)
      FROM khatam_public.recitation_contributions contribution
      WHERE contribution.goal_id = p_goal_id
    ) >= goal.target THEN now()
    ELSE NULL
  END
  WHERE goal.id = p_goal_id;

  RETURN TRUE;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.set_surah_contribution(BIGINT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.set_surah_contribution(BIGINT, TEXT, INT, INT)
  TO service_role;

-- Keep the campaign (and its Surah contributions) safe when an organizer tries
-- to delete its final Quran Khatam. The Quran goal can be archived instead.
CREATE OR REPLACE FUNCTION khatam_public.delete_khatam_round(p_khatam_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_campaign_id BIGINT;
  v_slug TEXT;
  v_is_final_khatam BOOLEAN;
BEGIN
  SELECT khatam.campaign_id, khatam.slug
  INTO v_campaign_id, v_slug
  FROM khatam_public.khatams khatam
  WHERE khatam.id = p_khatam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM khatam_public.khatams remaining
    WHERE remaining.slug = v_slug
      AND remaining.id <> p_khatam_id
  )
  INTO v_is_final_khatam;

  IF v_is_final_khatam AND v_campaign_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM khatam_public.campaign_goals goal
    WHERE goal.campaign_id = v_campaign_id
      AND goal.goal_type = 'surah_recitation'
  ) THEN
    RAISE EXCEPTION 'Archive the Quran goal instead of deleting its final Khatam while Surah goals exist.';
  END IF;

  DELETE FROM khatam_public.khatams
  WHERE id = p_khatam_id;

  IF v_is_final_khatam THEN
    DELETE FROM khatam_public.khatam_participants
    WHERE slug = v_slug;
  END IF;

  IF v_campaign_id IS NOT NULL THEN
    DELETE FROM khatam_public.campaigns campaign
    WHERE campaign.id = v_campaign_id
      AND NOT EXISTS (
        SELECT 1
        FROM khatam_public.khatams remaining
        WHERE remaining.campaign_id = campaign.id
      );
  END IF;

  RETURN TRUE;
END
$$;

REVOKE ALL ON FUNCTION khatam_public.delete_khatam_round(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION khatam_public.delete_khatam_round(BIGINT)
  TO service_role;
