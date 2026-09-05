import type { Database } from "@ecommerce/supabase-client";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Profile["role"];
