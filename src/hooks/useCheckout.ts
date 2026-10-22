import PaystackPop from "@paystack/inline-js";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CODES } from "@/lib/billing/planCodes";
import { priceNgn, toKobo, type BillingInterval } from "@/lib/billing/plans";

interface UseCheckoutResult {
  startCheckout: (interval: BillingInterval) => void;
}

export function useCheckout(onSuccess: () => void): UseCheckoutResult {
  const { user } = useAuth();

  const startCheckout = (interval: BillingInterval): void => {
    const plan = PLAN_CODES[interval];
    if (!user?.email || !plan) return;

    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: toKobo(priceNgn(interval)),
      currency: "NGN",
      plan,
      metadata: {
        user_id: user.id,
        billing_interval: interval,
        custom_fields: [],
      },
      onSuccess,
      onCancel: () => {},
    });
  };

  return { startCheckout };
}