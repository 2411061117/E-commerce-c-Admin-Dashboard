import {
  createSupabaseClient,
  type SupabaseClient,
} from "@ecommerce/supabase-client";

let client: SupabaseClient | undefined;

// Lazy singleton: creating the client eagerly at module scope would throw
// (and crash the app before React even mounts) whenever VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY aren't set yet. Deferring creation to first use lets
// AuthProvider catch the error and render a clear message instead.
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient({
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
  }
  return client;
}
