import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDailyRecap } from "@/hooks/useDailyRecap";
import { useToast } from "@/hooks/useToast";
import { MAX_RECAP_LENGTH } from "@/lib/calculations";

export function DailyRecap({ date }: { date: string }): JSX.Element {
  const { note, isLoading, error, save } = useDailyRecap(date);
  const { showToast } = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const value = draft ?? note ?? "";
  const isDirty = draft !== null && draft.trim() !== (note ?? "");

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    const { error: saveError } = await save(value);
    setIsSaving(false);
    if (saveError) {
      showToast(saveError, "error");
      return;
    }
    setDraft(null);
    showToast(value.trim() === "" ? "Recap removed." : "Recap saved.");
  };

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-text">Day recap</h3>
      <p className="mt-0.5 text-xs text-text-muted">
        What went well? What will you do differently tomorrow?
      </p>

      {error ? <p className="mt-2 text-xs text-signal-red">{error}</p> : null}

      <textarea
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        disabled={isLoading}
        rows={4}
        maxLength={MAX_RECAP_LENGTH}
        aria-label="Day recap"
        placeholder={isLoading ? "Loading…" : "Write a few lines about your day."}
        className="mt-3 w-full resize-y rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-line-strong disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-text-faint">
          {value.length > MAX_RECAP_LENGTH - 200
            ? `${value.length} of ${MAX_RECAP_LENGTH}`
            : note !== null && !isDirty
              ? "Saved"
              : ""}
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSave()}
          isLoading={isSaving}
          disabled={!isDirty || isLoading}
          className="!px-3 !py-1.5"
        >
          {value.trim() === "" && note !== null ? "Remove recap" : "Save recap"}
        </Button>
      </div>
    </div>
  );
}