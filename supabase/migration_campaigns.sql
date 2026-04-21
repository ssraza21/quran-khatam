-- Migration: Add campaigns feature
-- Run this in the Supabase SQL Editor after migration.sql

-- 1. Campaigns table
CREATE TABLE khatam_public.campaigns (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal        INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_slug ON khatam_public.campaigns(slug);
CREATE INDEX idx_campaigns_featured ON khatam_public.campaigns(is_featured) WHERE is_featured = TRUE;

-- 2. Add campaign_id FK to khatams (nullable so existing khatams are unaffected)
ALTER TABLE khatam_public.khatams
  ADD COLUMN campaign_id BIGINT REFERENCES khatam_public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_khatams_campaign ON khatam_public.khatams(campaign_id) WHERE campaign_id IS NOT NULL;

-- 3. RLS
ALTER TABLE khatam_public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_campaigns" ON khatam_public.campaigns
  FOR SELECT TO anon USING (true);

CREATE POLICY "service_all_campaigns" ON khatam_public.campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON khatam_public.campaigns TO anon, authenticated;
GRANT ALL ON khatam_public.campaigns TO service_role;
GRANT USAGE ON SEQUENCE khatam_public.campaigns_id_seq TO service_role;

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE khatam_public.campaigns;

-- 5. Seed: Masjid Al-Aqsa featured campaign
INSERT INTO khatam_public.campaigns (slug, name, description, goal, is_featured)
VALUES (
  'masjid-al-aqsa',
  'Quran for Masjid Al-Aqsa',
  'Join Muslims around the world in completing the Quran in solidarity for the liberation and protection of Masjid Al-Aqsa — the third holiest site in Islam. Every portion recited is a prayer for its people.',
  5000,
  TRUE
);
