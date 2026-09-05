import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseClient(
  config: SupabaseClientConfig,
): SupabaseClient<Database> {
  if (!config.url || !config.anonKey) {
    throw new Error(
      "Supabase client config is missing `url` or `anonKey`. Check your app's environment variables.",
    );
  }

  return createClient<Database>(config.url, config.anonKey);
}

export type { SupabaseClient };
