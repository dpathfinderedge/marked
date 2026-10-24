import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/useToast";
import {
  useManageSubscription,
  waitForPlanCode,
} from "@/hooks/useManageSubscription";
import { Button } from "@/components/ui/Button";
import { PLAN_CODES } from "@/lib/billing/planCodes";
import {
  describeAmount,
  describeCard,
  formatDate,
  type SubscriptionDetails,
} from "@/lib/billing/manage";
import {
  ANNUAL_PRICE_NGN,
  ANNUAL_SAVINGS_NGN,
  formatNaira,
  getPlanInterval,
} from "@/lib/billing/plans";

type Panel = "cancel" | "switch" | null;
type Busy = "cancel" | "card" | "switch" | null;

const dangerButton =
  "rounded-lg border border-signal-red/40 px-4 py-2 text-sm font-semibold text-signal-red transition-colors hover:bg-signal-red/10 disabled:cursor-not-allowed disabled:opacity-50";

export function ManageSubscription(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { status, cancelAtPeriodEnd, planCode, currentPeriodEnd, refetch } =
    useSubscription();
  const { loadDetails, cancel, getCardUpdateLink } =
    useManageSubscription();

  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const isPastDue = status === "past_due";
  const isEnding = cancelAtPeriodEnd;
  const endLabel = currentPeriodEnd ? formatDate(currentPeriodEnd) : null;
  const currentInterval = getPlanInterval(planCode, PLAN_CODES);
  const canSwitchToYearly =
    !isPastDue &&
    !isEnding &&
    currentInterval === "monthly" &&
    Boolean(PLAN_CODES.annual);

  const fetchDetails = useCallback(async (): Promise<void> => {
    const result = await loadDetails();
    if (result.error || !result.data) {
      setDetailsError(result.error);
    } else {
      setDetails(result.data);
      setDetailsError(null);
    }
    setIsLoadingDetails(false);
  }, [loadDetails]);

  useEffect(() => {
    void fetchDetails();
    // Reload when the subscription changes (cancel, plan switch).
  }, [fetchDetails, status, cancelAtPeriodEnd, planCode]);

  // After updating the card in Paystack's tab, reload when the user comes back.
  useEffect(() => {
    const onFocus = (): void => {
      void fetchDetails();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDetails]);

  const { startCheckout } = useCheckout(() => {
    void (async () => {
      setBusy("switch");
      const target = PLAN_CODES.annual;
      const arrived =
        user && target ? await waitForPlanCode(user.id, target) : false;
      await refetch();
      setBusy(null);
      showToast(
        arrived
          ? "You're now on the yearly plan. Thanks!"
          : "Payment received. Your plan is still updating and will show here shortly.",
      );
    })();
  });

  const handleCancel = async (): Promise<void> => {
    setBusy("cancel");
    const { error } = await cancel();
    if (error) {
      setBusy(null);
      showToast(error, "error");
      return;
    }
    await refetch();
    setBusy(null);
    setPanel(null);
    showToast(
      endLabel
        ? `Subscription cancelled. You'll keep Pro until ${endLabel}.`
        : "Subscription cancelled. You won't be charged again.",
    );
  };

  const handleUpdateCard = async (): Promise<void> => {
    setBusy("card");
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;

    const { data: link, error } = await getCardUpdateLink();
    if (error || !link) {
      tab?.close();
      setBusy(null);
      showToast(error ?? "We couldn't open the card page.", "error");
      return;
    }
    if (tab) {
      tab.location.href = link;
    } else {
      window.location.assign(link);
    }
    setBusy(null);
  };

  const card = details?.card ?? null;
  const payments = details?.payments ?? [];

  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-line pt-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
          Payment method
        </p>
        {isLoadingDetails ? (
          <p className="mt-1 text-sm text-text-muted">Loading…</p>
        ) : card ? (
          <p className="mt-1 text-sm text-text">{describeCard(card)}</p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            {detailsError ?? "No card on file."}
          </p>
        )}
        {isPastDue ? (
          <p className="mt-2 text-sm text-text-muted">
            Update your card and Paystack will try the payment again.
          </p>
        ) : null}
        <Button
          variant={isPastDue ? "primary" : "secondary"}
          onClick={() => void handleUpdateCard()}
          isLoading={busy === "card"}
          disabled={busy !== null}
          className="mt-3"
        >
          Update payment method
        </Button>
      </div>

      {panel === "cancel" ? (
        <div
          role="alertdialog"
          aria-label="Cancel subscription"
          className="flex flex-col gap-3 rounded-lg border border-line bg-bg-2 p-4"
        >
          <p className="text-sm font-medium text-text">
            Cancel your subscription?
          </p>
          <p className="text-sm text-text-muted">
            {endLabel
              ? `You'll keep Pro until ${endLabel}. After that your account moves to the Free plan.`
              : "You'll keep Pro until the end of your current period, then move to the Free plan."}{" "}
            You won't be charged again, and your trades stay in your account.
            This can't be undone: to carry on after it ends, you'll subscribe
            again.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={busy !== null}
              className={dangerButton}
            >
              {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
            </button>
            <Button
              variant="secondary"
              onClick={() => setPanel(null)}
              disabled={busy !== null}
            >
              Keep Pro
            </Button>
          </div>
        </div>
      ) : null}

      {panel === "switch" ? (
        <div
          role="alertdialog"
          aria-label="Switch to yearly"
          className="flex flex-col gap-3 rounded-lg border border-line bg-bg-2 p-4"
        >
          <p className="text-sm font-medium text-text">Switch to yearly?</p>
          <p className="text-sm text-text-muted">
            You'll pay {formatNaira(ANNUAL_PRICE_NGN)} today and your monthly
            plan stops, so you're never billed twice. That saves you{" "}
            {formatNaira(ANNUAL_SAVINGS_NGN)} a year compared with paying
            monthly. Days left on your current month aren't refunded.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setPanel(null);
                startCheckout("annual");
              }}
              disabled={busy !== null}
            >
              Continue to payment
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPanel(null)}
              disabled={busy !== null}
            >
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {busy === "switch" ? (
        <p className="text-sm text-text-muted" role="status">
          Payment received. Activating your yearly plan…
        </p>
      ) : null}

      {panel === null && busy !== "switch" && !isEnding ? (
        <div className="flex flex-wrap items-center gap-3">
          {canSwitchToYearly ? (
            <Button
              variant="secondary"
              onClick={() => setPanel("switch")}
              disabled={busy !== null}
            >
              Switch to yearly — save {formatNaira(ANNUAL_SAVINGS_NGN)}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setPanel("cancel")}
            disabled={busy !== null}
            className={dangerButton}
          >
            Cancel subscription
          </button>
        </div>
      ) : null}

      {payments.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
            Payment history
          </p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {payments.map((payment) => (
              <li
                key={payment.reference}
                className="flex items-center justify-between py-2"
              >
                <span className="text-text-muted">
                  {payment.paidAt ? formatDate(payment.paidAt) : "—"}
                </span>
                <span className="font-medium text-text">
                  {describeAmount(payment)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}