import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/domain/database";
import { getPublicSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
