import { useEffect, useState, type FormEvent } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsPage(): JSX.Element {
  const { threshold, isLoading, updateThreshold } = useSettings();
  const [value, setValue] = useState(String(threshold));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(String(threshold));
  }, [threshold]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError("Enter a whole number of 1 or more.");
      return;
    }

    setIsSaving(true);
    const { error: saveError } = await updateThreshold(parsed);
    setIsSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  };

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-rule bg-surface p-6"
      >
        <div>
          <h2 className="font-sans text-sm font-medium text-ink">
            Consecutive-loss flag
          </h2>
          <p className="mt-1 font-sans text-sm text-muted">
            Flag a trade when it follows this many losing trades in a row.
          </p>
        </div>

        <Input
          label="Threshold"
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
        />

        {saved ? (
          <p className="font-mono text-xs text-green">Saved.</p>
        ) : null}

        <Button type="submit" isLoading={isSaving}>
          Save
        </Button>
      </form>
    </div>
  );
}