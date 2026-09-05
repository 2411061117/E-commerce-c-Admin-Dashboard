// Hand-written to mirror supabase/migrations/20260905000002_profiles_and_addresses.sql
// exactly. Extend this file table-by-table as each phase starts querying a new table;
// once the project is linked, replace it wholesale with:
//   supabase gen types typescript --project-id <ref> > src/database.types.ts
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "customer" | "admin";
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "customer" | "admin";
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "customer" | "admin";
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
