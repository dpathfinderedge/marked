import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup rather than silently hitting undefined-URL
  // network errors deep in a component tree.
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill " +
      "in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase " +
      "project settings.",
  );
}

// `Database` is a generated type (see src/types/database.ts) so every
// `.from("table")` call is typed against the real schema once Phase 3
// creates it — no `any` leaking in from the query layer.
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
