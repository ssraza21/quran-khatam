-- Step 1: Database Schema for generalized Quran Khatam
-- Run this in Supabase SQL Editor

CREATE SCHEMA IF NOT EXISTS khatam_public;

CREATE TABLE khatam_public.khatams (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,
  khatam_num  INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(slug, khatam_num)
);

CREATE TABLE khatam_public.slots (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  khatam_id  BIGINT NOT NULL REFERENCES khatam_public.khatams(id) ON DELETE CASCADE,
  juz        SMALLINT NOT NULL,
  q          SMALLINT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'av' CHECK (status IN ('av','cl','dn')),
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  done_at    TIMESTAMPTZ,
  UNIQUE(khatam_id, juz, q)
);

CREATE INDEX idx_khatams_slug ON khatam_public.khatams(slug);
CREATE INDEX idx_slots_khatam ON khatam_public.slots(khatam_id);

-- RLS: Enable on both tables. Allow anon to SELECT only.
ALTER TABLE khatam_public.khatams ENABLE ROW LEVEL SECURITY;
ALTER TABLE khatam_public.slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_khatams" ON khatam_public.khatams
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_slots" ON khatam_public.slots
  FOR SELECT TO anon USING (true);

CREATE POLICY "service_all_khatams" ON khatam_public.khatams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_slots" ON khatam_public.slots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime: Enable for khatam_public.slots
ALTER PUBLICATION supabase_realtime ADD TABLE khatam_public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE khatam_public.khatams;
