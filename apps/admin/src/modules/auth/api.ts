import type { SignInInput } from "@ecommerce/shared";
import { getSupabaseClient } from "../../lib/supabase";

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
