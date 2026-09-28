import PaystackPop from "@paystack/inline-js";
import { useAuth } from "@/hooks/useAuth";

const PLAN_AMOUNT_KOBO = 1_200_000; // ₦12,000

interface UseCheckoutResult {
  startCheckout: () => void;
}

export function useCheckout(onSuccess: () => void): UseCheckoutResult {
  const { user } = useAuth();

  const startCheckout = (): void => {
    if (!user?.email) return;

    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: PLAN_AMOUNT_KOBO,
      currency: "NGN",
      plan: import.meta.env.VITE_PAYSTACK_PLAN_CODE,
      metadata: { user_id: user.id, custom_fields: [] },
      onSuccess,
      onCancel: () => {},
    });
  };

  return { startCheckout };
}