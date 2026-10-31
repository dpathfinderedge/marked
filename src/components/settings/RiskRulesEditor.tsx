import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRiskRules } from "@/hooks/useRiskRules";
import { useToast } from "@/hooks/useToast";
import {
  MAX_TRADES_PER_DAY_LIMIT,
  parseCountRule,
  parseMoneyRule,
  type RiskRules,
} from "@/lib/calculations";

const asText = (value: number | null): string => (value === null ? "" : String(value));

export function RiskRulesEditor(): JSX.Element {
  const { rules, isLoading, error: loadError, saveRules } = useRiskRules();
  const { showToast } = useToast();
  const [loss, setLoss] = useState("");
  const [count, setCount] = useState("");
  const [target, setTarget] = useState("");
  const [errors, setErrors] = useState<{ loss?: string; count?: string; target?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLoss(asText(rules.dailyLossLimit));
    setCount(asText(rules.maxTradesPerDay));
    setTarget(asText(rules.monthlyTarget));
  }, [rules]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const parsedLoss = parseMoneyRule(loss);
    const parsedCount = parseCountRule(count);
    const parsedTarget = parseMoneyRule(target);

    const next = {
      loss: parsedLoss.ok ? undefined : parsedLoss.error,
      count: parsedCount.ok ? undefined : parsedCount.error,
      target: parsedTarget.ok ? undefined : parsedTarget.error,
    };
    setErrors(next);
    if (!parsedLoss.ok || !parsedCount.ok || !parsedTarget.ok) return;

    const toSave: RiskRules = {
      dailyLossLimit: parsedLoss.value,
      maxTradesPerDay: parsedCount.value,
      monthlyTarget: parsedTarget.value,
    };

    setIsSaving(true);
    const { error: saveError } = await saveRules(toSave);
    setIsSaving(false);
    if (saveError) {
      showToast(saveError, "error");
      return;
    }
    showToast("Limits saved.");
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4 rounded-xl border border-line bg-bg-1 p-6"
    >
      <div>
        <h2 className="font-sans text-sm font-medium text-text">Daily limits and monthly goal</h2>
        <p className="mt-1 font-sans text-sm text-text-muted">
          Set the lines you don't want to cross. Your dashboard shows how close today is, and warns
          you when you're near a limit. Leave a field empty to switch it off.
        </p>
      </div>

      {loadError ? <p className="text-xs text-signal-red">{loadError}</p> : null}

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <Input
            label="Daily loss limit ($)"
            id="risk-daily-loss"
            type="text"
            inputMode="decimal"
            placeholder="For example 200"
            value={loss}
            onChange={(e) => setLoss(e.target.value)}
            error={errors.loss}
          />
          <Input
            label="Most trades per day"
            id="risk-max-trades"
            type="text"
            inputMode="numeric"
            placeholder={`For example 5 (up to ${MAX_TRADES_PER_DAY_LIMIT})`}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            error={errors.count}
          />
          <Input
            label="Monthly profit goal ($)"
            id="risk-monthly-goal"
            type="text"
            inputMode="decimal"
            placeholder="For example 1000"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={errors.target}
          />
          <p className="text-xs text-text-faint">
            The loss limit counts your net result for the day, so a win earlier in the day gives you
            room back.
          </p>
          <Button type="submit" isLoading={isSaving}>
            Save limits
          </Button>
        </>
      )}
    </form>
  );
}