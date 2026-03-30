import { createClient } from "@supabase/supabase-js";

export function createServiceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    db: { schema: "khatam_public" },
  });
}
