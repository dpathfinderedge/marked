import type { PlanCodes } from "@/lib/billing/plans";

export const PLAN_CODES: PlanCodes = {
  monthly: import.meta.env.VITE_PAYSTACK_PLAN_CODE?.trim() || undefined,
  annual: import.meta.env.VITE_PAYSTACK_PLAN_CODE_ANNUAL?.trim() || undefined,
};