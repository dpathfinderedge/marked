import { useEffect, useState, type FormEvent } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsPage(): JSX.Element {
  const { threshold, isLoading, error: fetchError, updateThreshold } = useSettings();
  const { showToast } = useToast();
  const [value, setValue] = useState(String(threshold));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(String(threshold));
  }, [threshold]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

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
      showToast(saveError, "error");
      return;
    }
    showToast("Settings saved.");
  };

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>

      {fetchError ? (
        <p className="text-xs text-signal-red">
          Couldn't load your settings: {fetchError}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-line bg-bg-1 p-6"
      >
        <div>
          <h2 className="font-sans text-sm font-medium text-text">
            Consecutive-loss flag
          </h2>
          <p className="mt-1 font-sans text-sm text-text-muted">
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

        <Button type="submit" isLoading={isSaving}>
          Save
        </Button>
      </form>
    </div>
  );
}