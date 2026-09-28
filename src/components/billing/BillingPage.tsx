import { useSubscription } from "@/hooks/useSubscription";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";

export function BillingPage(): JSX.Element {
  const { status, isPro, currentPeriodEnd, isLoading } = useSubscription();
  const { showToast } = useToast();
  const { startCheckout } = useCheckout(() => {
    showToast("Payment received — activating your Pro plan…");
  });

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Billing</h1>

      <div className="rounded-xl border border-line bg-bg-1 p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
          Current plan
        </p>
        <p className="mt-1 text-xl font-bold text-text">
          {isPro ? "Pro" : "Free"}
        </p>
        {isPro && currentPeriodEnd ? (
          <p className="mt-1 text-sm text-text-muted">
            Renews {new Date(currentPeriodEnd).toLocaleDateString()}
          </p>
        ) : null}
        {status === "past_due" ? (
          <p className="mt-2 text-sm text-signal-red">
            Your last payment failed. Upgrade again to restore Pro access.
          </p>
        ) : null}

        {!isPro ? (
          <>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-text-muted">
              <li>Unlimited trades</li>
              <li>CSV bulk import</li>
              <li>Screenshot attachments</li>
              <li>Live FX rate lookup for cross pairs</li>
            </ul>
            <Button onClick={startCheckout} className="mt-6">
              Upgrade — ₦12,000/month
            </Button>
          </>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            To cancel or update your payment method, contact support for now.
          </p>
        )}
      </div>
    </div>
  );
}