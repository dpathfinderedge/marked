import {
  PaystackError,
  disableSubscription,
  fetchSubscription,
  getManageLink,
  listPayments,
  type FetchedSubscription,
  type PaymentRecord,
  type PaystackDeps,
  type SubscriptionCard,
} from "../_shared/paystack.ts";
import {
  buildSubscriptionRow,
  parseAllowedPlanCodes,
  type MappedStatus,
  type SubscriptionRow,
} from "../paystack-webhook/logic.ts";

export type ManageAction = "details" | "cancel" | "manage-link";

const ACTIONS: readonly ManageAction[] = [
  "details",
  "cancel",
  "manage-link",
];

export interface StoredSubscription {
  paystack_subscription_code: string | null;
}

export interface ManageStore {
  getSubscription(userId: string): Promise<StoredSubscription | null>;
  upsertSubscription(row: SubscriptionRow): Promise<void>;
}

export interface ManageDeps {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  store: ManageStore;
  authenticate: (authHeader: string) => Promise<{ id: string } | null>;
  now?: () => Date;
  paystackApiBase?: string;
}

export interface SubscriptionDetails {
  status: MappedStatus["status"];
  cancelAtPeriodEnd: boolean;
  planCode: string | null;
  nextPaymentDate: string | null;
  card: SubscriptionCard | null;
  payments: PaymentRecord[];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function fail(status: number, error: string, code: string): Response {
  return json({ error, code }, status);
}

const PROVIDER_DOWN = "We couldn't reach the payment provider. Try again in a moment.";

function isAction(value: unknown): value is ManageAction {
  return typeof value === "string" && ACTIONS.includes(value as ManageAction);
}

async function readAction(req: Request): Promise<ManageAction | null> {
  try {
    const body: unknown = await req.json();
    if (typeof body === "object" && body !== null && "action" in body) {
      const action = (body as { action: unknown }).action;
      return isAction(action) ? action : null;
    }
  } catch {
    // fall through
  }
  return null;
}

export async function handleManage(
  req: Request,
  deps: ManageDeps,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed.", "method_not_allowed");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return fail(401, "Missing authorization header.", "unauthenticated");
  }
  const user = await deps.authenticate(authHeader);
  if (!user) return fail(401, "Not authenticated.", "unauthenticated");

  const secret = deps.env("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not configured");
    return fail(500, "Billing isn't set up yet. Please contact support.", "not_configured");
  }

  const action = await readAction(req);
  if (!action) return fail(400, "Unknown action.", "bad_request");

  let code: string | null;
  try {
    const stored = await deps.store.getSubscription(user.id);
    code = stored?.paystack_subscription_code ?? null;
  } catch (error) {
    console.error("Could not read the subscription", error);
    return fail(500, "We couldn't load your subscription. Try again.", "server_error");
  }
  if (!code) {
    return fail(
      404,
      "You don't have a subscription to manage.",
      "no_subscription",
    );
  }

  const paystack: PaystackDeps = {
    secret,
    fetch: deps.fetch,
    baseUrl: deps.paystackApiBase,
  };
  const now = (deps.now ?? (() => new Date()))();

  const syncFrom = async (
    fresh: FetchedSubscription,
    forceCancelling: boolean | null,
  ): Promise<MappedStatus> => {
    const { mapped, planCode } = fresh.parsed;
    if (!mapped || !planCode) {
      throw new PaystackError("Paystack returned an unusable subscription", 502);
    }

    const next: MappedStatus =
      forceCancelling !== null && mapped.status === "active"
        ? { status: "active", cancelAtPeriodEnd: forceCancelling }
        : mapped;

    await deps.store.upsertSubscription(
      buildSubscriptionRow({
        userId: user.id,
        subscriptionCode: code,
        planCode,
        mapped: next,
        parsed: fresh.parsed,
        now,
      }),
    );
    return next;
  };

  try {
    const current = await fetchSubscription(paystack, code);
    const mapped = current.parsed.mapped;
    if (!mapped) {
      throw new PaystackError("Paystack returned an unknown status", 502);
    }

    switch (action) {
      case "details": {
        const allowedPlans = parseAllowedPlanCodes(deps.env("PAYSTACK_PLAN_CODES"));
        let payments: PaymentRecord[] = [];
        if (current.customerId !== null && allowedPlans.length > 0) {
          try {
            payments = await listPayments(
              paystack,
              current.customerId,
              allowedPlans,
            );
          } catch (error) {
            console.error("Could not load payment history", error);
          }
        }

        const details: SubscriptionDetails = {
          status: mapped.status,
          cancelAtPeriodEnd: mapped.cancelAtPeriodEnd,
          planCode: current.parsed.planCode,
          nextPaymentDate: current.parsed.nextPaymentDate,
          card: current.card,
          payments,
        };
        return json({ ...details }, 200);
      }

      case "manage-link": {
        if (mapped.status === "cancelled") {
          return fail(
            409,
            "This subscription has ended, so there's no card to update.",
            "subscription_ended",
          );
        }
        const link = await getManageLink(paystack, code);
        return json({ link }, 200);
      }

      case "cancel": {
        if (mapped.status === "cancelled") {
          return fail(409, "This subscription has already ended.", "subscription_ended");
        }
        if (!mapped.cancelAtPeriodEnd) {
          if (!current.emailToken) {
            throw new PaystackError("Paystack returned no email token", 502);
          }
          await disableSubscription(paystack, code, current.emailToken);
        }
        const fresh = await fetchSubscription(paystack, code);
        const result = await syncFrom(fresh, true);
        return json(
          { ok: true, status: result.status, cancelAtPeriodEnd: result.cancelAtPeriodEnd },
          200,
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`manage-subscription ${action} failed: ${message}`);
    return fail(502, PROVIDER_DOWN, "provider_error");
  }
}