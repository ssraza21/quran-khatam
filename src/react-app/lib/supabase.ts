import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eyzkdcyvahdmmmhdtqdx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5emtkY3l2YWhkbW1taGR0cWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTI4MTcsImV4cCI6MjA4MjcyODgxN30.fYoPCwx1Ayghs1Q4b-jb1JYOd3Xf_IL4-qBE6jH5BjI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "qurankhatam" },
});

export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "khatam_public" },
});
