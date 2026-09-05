// Placeholder until the real types are generated against the linked Supabase project:
//   supabase gen types typescript --project-id <ref> > src/database.types.ts
// Keeping an (empty) shape here so `SupabaseClient<Database>` type-checks before that step.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
