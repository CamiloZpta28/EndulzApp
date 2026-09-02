import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { supabaseEnv } from "./env";

/** Supabase client for Client Components (browser only). */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient<Database>(url, key);
}
