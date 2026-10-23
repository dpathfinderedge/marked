import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleManage, type ManageStore } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const db = createClient(
  supabaseUrl,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const store: ManageStore = {
  async getSubscription(userId) {
    const { data, error } = await db
      .from("subscriptions")
      .select("paystack_subscription_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`subscription read failed: ${error.message}`);
    return data
      ? { paystack_subscription_code: data.paystack_subscription_code ?? null }
      : null;
  },

  async upsertSubscription(row) {
    const { error } = await db
      .from("subscriptions")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(`subscription write failed: ${error.message}`);
  },
};

Deno.serve((req: Request) =>
  handleManage(req, {
    env: (name) => Deno.env.get(name),
    fetch,
    store,
    async authenticate(authHeader) {
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await caller.auth.getUser();
      return error || !data.user ? null : { id: data.user.id };
    },
  }),
);