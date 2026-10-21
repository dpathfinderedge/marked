import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleWebhook, type WebhookStore } from "./handler.ts";
import type { SubscriptionStatus } from "./logic.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const UNIQUE_VIOLATION = "23505";

const store: WebhookStore = {
  async claimEvent({ id, event, payload }) {
    const { error } = await db
      .from("webhook_events")
      .insert({ id, event, payload, status: "processing" });
    if (!error) return "new";
    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(`webhook_events insert failed: ${error.message}`);
    }

    const { data, error: readError } = await db
      .from("webhook_events")
      .select("status, attempts")
      .eq("id", id)
      .maybeSingle();
    if (readError || !data) {
      throw new Error(
        `webhook_events read failed: ${readError?.message ?? "row missing"}`,
      );
    }
    if (data.status === "processed" || data.status === "ignored") {
      return "duplicate";
    }

    await db
      .from("webhook_events")
      .update({ status: "processing", attempts: Number(data.attempts) + 1 })
      .eq("id", id);
    return "retry";
  },

  async finishEvent(id, status, note) {
    await db
      .from("webhook_events")
      .update({
        status,
        note: note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
  },

  async findUserIdByEmail(email) {
    const { data, error } = await db.rpc("get_user_id_by_email", {
      p_email: email,
    });
    if (error) throw new Error(`user lookup failed: ${error.message}`);
    return typeof data === "string" ? data : null;
  },

  async getSubscription(userId) {
    const { data, error } = await db
      .from("subscriptions")
      .select("status, paystack_subscription_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`subscription read failed: ${error.message}`);
    if (!data) return null;
    return {
      status: data.status as SubscriptionStatus,
      paystack_subscription_code: data.paystack_subscription_code ?? null,
    };
  },

  async upsertSubscription(row) {
    const { error } = await db
      .from("subscriptions")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(`subscription write failed: ${error.message}`);
  },
};

Deno.serve((req: Request) =>
  handleWebhook(req, {
    env: (name) => Deno.env.get(name),
    store,
    fetch,
  }),
);