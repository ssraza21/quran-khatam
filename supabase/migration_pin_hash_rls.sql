-- Migration: Revoke anon direct access to khatams table and expose a view without pin_hash
-- Run this in the Supabase SQL Editor after migration.sql

-- Revoke anon SELECT on the base table
REVOKE SELECT ON khatam_public.khatams FROM anon, authenticated;

-- Create a security-definer view that excludes pin_hash
CREATE OR REPLACE VIEW khatam_public.khatams_public_view
  WITH (security_invoker = false)
AS
  SELECT
    id,
    slug,
    name,
    khatam_num,
    created_at,
    completed_at,
    is_solo,
    location_city,
    location_country,
    location_lat,
    location_lng,
    show_names_on_globe
  FROM khatam_public.khatams;

-- Grant anon SELECT on the view only (not the base table)
GRANT SELECT ON khatam_public.khatams_public_view TO anon, authenticated;

-- Note: service_role retains full access to the base table via the existing RLS policy.
-- The Realtime subscription on khatam_public.khatams is unaffected (uses service_role).
