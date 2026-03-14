import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://eyzkdcyvahdmmmhdtqdx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5emtkY3l2YWhkbW1taGR0cWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTI4MTcsImV4cCI6MjA4MjcyODgxN30.fYoPCwx1Ayghs1Q4b-jb1JYOd3Xf_IL4-qBE6jH5BjI",
  { db: { schema: "qurankhatam" } }
);
