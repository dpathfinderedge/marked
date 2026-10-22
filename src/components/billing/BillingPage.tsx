import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { IntervalToggle } from "@/components/billing/IntervalToggle";
import { PLAN_CODES } from "@/lib/billing/planCodes";
import {
  ANNUAL_PER_MONTH_NGN,
  ANNUAL_SAVINGS_NGN,
  formatNaira,
  getPlanInterval,
  intervalLabel,
  intervalUnit,
  priceNgn,
  type BillingInterval,
} from "@/lib/billing/plans";

const ACTIVATION_POLL_INTERVAL_MS = 2000;
const ACTIVATION_POLL_MAX_ATTEMPTS = 15;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function BillingPage(): JSX.Element {
  const {
    status,
    isPro,
    cancelAtPeriodEnd,
    planCode,
    currentPeriodEnd,
    isLoading,
    refetch,
  } = useSubscription();
  const { showToast } = useToast();
  const [isActivating, setIsActivating] = useState(false);
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval>("monthly");

  const waitForActivation = async (): Promise<void> => {
    setIsActivating(true);

    for (let attempt = 0; attempt < ACTIVATION_POLL_MAX_ATTEMPTS; attempt++) {
      const nextStatus = await refetch();
      if (nextStatus === "active") {
        setIsActivating(false);
        showToast("You're on Pro. Thanks for upgrading!");
        return;
      }
      await sleep(ACTIVATION_POLL_INTERVAL_MS);
    }

    setIsActivating(false);
    showToast(
      "Payment received. Your plan is still updating and will show here shortly.",
    );
  };

  const { startCheckout } = useCheckout(() => {
    void waitForActivation();
  });

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Loading…
      </p>
    );
  }

  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString()
    : null;
  const isEnding = isPro && (cancelAtPeriodEnd || status === "cancelled");

  const currentInterval = getPlanInterval(planCode, PLAN_CODES);
  let planName = "Free";
  if (isPro) {
    planName = currentInterval
      ? `Pro · ${intervalLabel(currentInterval)}`
      : "Pro";
  }

  let planNote: string | null = null;
  if (isEnding) {
    planNote = periodEndLabel
      ? `Pro access ends on ${periodEndLabel}. You won't be charged again.`
      : "Your subscription won't renew.";
  } else if (isPro && periodEndLabel) {
    planNote = `Renews ${periodEndLabel}`;
  }

  const hasAnnual = Boolean(PLAN_CODES.annual);
  const price = priceNgn(selectedInterval);
  const unit = intervalUnit(selectedInterval);
  const canCheckout = Boolean(PLAN_CODES[selectedInterval]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Billing</h1>

      <div className="rounded-xl border border-line bg-bg-1 p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
          Current plan
        </p>
        <p className="mt-1 text-xl font-bold text-text">{planName}</p>
        {planNote ? (
          <p className="mt-1 text-sm text-text-muted">{planNote}</p>
        ) : null}
        {status === "past_due" ? (
          <p className="mt-2 text-sm text-signal-red">
            Your last payment failed. Upgrade again to restore Pro access.
          </p>
        ) : null}

        {isActivating ? (
          <p className="mt-4 text-sm text-text-muted" role="status">
            Payment received. Activating your Pro plan…
          </p>
        ) : null}

        {!isPro ? (
          <>
            {hasAnnual ? (
              <div className="mt-6">
                <IntervalToggle
                  value={selectedInterval}
                  onChange={setSelectedInterval}
                  disabled={isActivating}
                />
              </div>
            ) : null}

            <p className="mt-5 text-3xl font-bold tracking-tight text-text">
              {formatNaira(price)}
              <span className="ml-1 text-sm font-medium text-text-muted">
                /{unit}
              </span>
            </p>
            {selectedInterval === "annual" ? (
              <p className="mt-1 text-sm text-text-muted">
                {formatNaira(ANNUAL_PER_MONTH_NGN)}/month, billed yearly. You
                save {formatNaira(ANNUAL_SAVINGS_NGN)}.
              </p>
            ) : null}

            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-text-muted">
              <li>Unlimited trades</li>
              <li>CSV bulk import</li>
              <li>Screenshot attachments</li>
              <li>Live FX rate lookup for cross pairs</li>
            </ul>
            <Button
              onClick={() => startCheckout(selectedInterval)}
              disabled={isActivating || !canCheckout}
              className="mt-6"
            >
              Upgrade — {formatNaira(price)}/{unit}
            </Button>
          </>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {isEnding
              ? "You can subscribe again once your Pro access ends."
              : "To cancel or update your payment method, contact support for now."}
          </p>
        )}
      </div>
    </div>
  );
}