-- Seed 20 open community khatams into the Masjid Al-Aqsa campaign.
-- These are public khatams anyone can claim slots from.
-- Admin PIN for all seeded khatams is: 786786
-- (salt is fixed zeros; you can change the pin in the app later via admin panel)

DO $$
DECLARE
  v_campaign_id BIGINT;
  v_khatam_id   BIGINT;
  -- PIN "786786" hashed with a fixed salt of 32 zeroes (matches the worker's saltHex:sha256(saltHex||pin) format)
  v_pin_hash    TEXT := '00000000000000000000000000000000:' ||
                        encode(
                          digest('00000000000000000000000000000000786786', 'sha256'),
                          'hex'
                        );
  i             INT;
BEGIN
  SELECT id INTO v_campaign_id
  FROM khatam_public.campaigns
  WHERE slug = 'masjid-al-aqsa';

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campaign masjid-al-aqsa not found. Run migration_campaigns.sql first.';
  END IF;

  FOR i IN 1..20 LOOP
    INSERT INTO khatam_public.khatams
      (slug, name, pin_hash, khatam_num, is_solo, campaign_id)
    VALUES (
      'aqsa-khatam-' || i,
      'Aqsa Khatam #' || i,
      v_pin_hash,
      1,
      FALSE,
      v_campaign_id
    )
    RETURNING id INTO v_khatam_id;

    -- Create 120 slots (30 juz × 4 quarters)
    INSERT INTO khatam_public.slots (khatam_id, juz, q)
    SELECT v_khatam_id, j, q
    FROM generate_series(1, 30) AS j,
         generate_series(1, 4)  AS q;
  END LOOP;

  RAISE NOTICE 'Seeded 20 khatams into campaign % (id: %)', 'masjid-al-aqsa', v_campaign_id;
END $$;
