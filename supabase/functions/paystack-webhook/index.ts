import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(computedHex, signature);
}

interface PaystackEvent {
  event: string;
  data: {
    customer?: { email?: string; customer_code?: string };
    plan?: string;
    plan_object?: { plan_code?: string };
    subscription_code?: string;
    metadata?: { user_id?: string } | null;
  };
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("x-paystack-signature");
  const rawBody = await req.text();

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  const isValid = await verifySignature(rawBody, signature, secretKey);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaystackEvent;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const customerCode = event.data.customer?.customer_code ?? null;
  const planCode = event.data.plan ?? event.data.plan_object?.plan_code ?? null;
  const userId = event.data.metadata?.user_id ?? null;

  switch (event.event) {
    case "charge.success": {
      if (!planCode || !customerCode) break; 

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (userId) {
        await adminClient.from("subscriptions").upsert({
          user_id: userId,
          status: "active",
          paystack_customer_code: customerCode,
          plan_code: planCode,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        await adminClient
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("paystack_customer_code", customerCode);
      }
      break;
    }

    case "subscription.disable": {
      if (customerCode) {
        await adminClient
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("paystack_customer_code", customerCode);
      }
      break;
    }

    case "invoice.payment_failed": {
      if (customerCode) {
        await adminClient
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("paystack_customer_code", customerCode);
      }
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});