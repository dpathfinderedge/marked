import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChecklist } from "@/hooks/useChecklist";
import { useToast } from "@/hooks/useToast";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_ITEM_LENGTH,
  cleanChecklistItems,
} from "@/lib/calculations";

const ICON_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-bg-2 hover:text-text disabled:pointer-events-none disabled:opacity-30";

/** Where someone writes the rules they want to check before every trade. */
export function ChecklistEditor(): JSX.Element {
  const { items, isLoading, error: loadError, saveItems } = useChecklist();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(items);
  }, [items]);

  const isFull = draft.length >= MAX_CHECKLIST_ITEMS;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(items);

  const addItem = (event: FormEvent): void => {
    event.preventDefault();
    const [cleaned] = cleanChecklistItems([newItem]);
    if (!cleaned) return;
    if (draft.some((d) => d.toLowerCase() === cleaned.toLowerCase())) {
      setError("That rule is already on your checklist.");
      return;
    }
    setError(null);
    setDraft([...draft, cleaned]);
    setNewItem("");
  };

  const move = (index: number, by: -1 | 1): void => {
    const target = index + by;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setDraft(next);
  };

  const save = async (): Promise<void> => {
    setIsSaving(true);
    const { error: saveError } = await saveItems(draft);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      showToast(saveError, "error");
      return;
    }
    setError(null);
    showToast("Checklist saved.");
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-bg-1 p-6">
      <div>
        <h2 className="font-sans text-sm font-medium text-text">Pre-trade checklist</h2>
        <p className="mt-1 font-sans text-sm text-text-muted">
          Write the rules you want to follow before every trade. When you log a trade you tick the
          ones you followed, and Insights shows whether following them pays.
        </p>
      </div>

      {loadError ? <p className="text-xs text-signal-red">{loadError}</p> : null}

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          {draft.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-text-muted">
              No rules yet. Try "Trend agrees on the higher timeframe", "Stop-loss is set" or "Risk
              is 1% or less".
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {draft.map((item, index) => (
                <li key={item} className="flex items-center gap-1 py-1.5 pl-3 pr-1.5">
                  <span className="min-w-0 flex-1 text-sm text-text">{item}</span>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move "${item}" up`}
                    className={ICON_BUTTON}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === draft.length - 1}
                    aria-label={`Move "${item}" down`}
                    className={ICON_BUTTON}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(draft.filter((d) => d !== item))}
                    aria-label={`Remove "${item}"`}
                    className={ICON_BUTTON}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addItem} className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={isFull ? "That's the most you can add" : "Add a rule"}
              aria-label="New checklist rule"
              maxLength={MAX_CHECKLIST_ITEM_LENGTH}
              disabled={isFull}
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-line-strong disabled:opacity-50"
            />
            <Button type="submit" variant="secondary" disabled={isFull || newItem.trim() === ""}>
              Add
            </Button>
          </form>

          {error ? <p className="text-xs text-signal-red">{error}</p> : null}
          <p className="text-xs text-text-faint">
            {draft.length} of {MAX_CHECKLIST_ITEMS} rules. Changing the list doesn't change trades
            you've already logged.
          </p>

          <Button type="button" onClick={() => void save()} isLoading={isSaving} disabled={!isDirty}>
            Save checklist
          </Button>
        </>
      )}
    </section>
  );
}