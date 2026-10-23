import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stopRenewal } from "../_shared/paystack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Not authenticated." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: subscription, error: subscriptionError } = await adminClient
    .from("subscriptions")
    .select("paystack_subscription_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Could not read subscription", subscriptionError.message);
    return jsonResponse(
      { error: "We couldn't check your subscription, so your account was not deleted. Please try again." },
      500,
    );
  }

  const subscriptionCode = subscription?.paystack_subscription_code ?? null;
  if (subscriptionCode) {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    try {
      if (!paystackSecret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
      await stopRenewal({ secret: paystackSecret, fetch }, subscriptionCode);
    } catch (error) {
      console.error(
        "Could not stop the Paystack subscription before deleting the account",
        error instanceof Error ? error.message : error,
      );
      return jsonResponse(
        { error: "We couldn't cancel your subscription, so your account was not deleted and you haven't been charged anything new. Please try again, or contact support." },
        502,
      );
    }
  } 

  for (const bucket of ["trade-attachments", "avatars"]) {
    const { data: files } = await adminClient.storage
      .from(bucket)
      .list(user.id);

    if (files && files.length > 0) {
      const paths = files.map((file) => `${user.id}/${file.name}`);
      await adminClient.storage.from(bucket).remove(paths);
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ success: true }, 200);
});