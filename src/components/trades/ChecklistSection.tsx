import { Link } from "react-router-dom";

interface ChecklistSectionProps {
  items: string[];
  checked: ReadonlySet<string>;
  onToggle: (item: string) => void;
}

export function ChecklistSection({ items, checked, onToggle }: ChecklistSectionProps): JSX.Element {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-2.5 text-xs text-text-muted">
        Want to track whether you follow your rules?{" "}
        <Link to="/settings" className="font-medium text-signal-red underline underline-offset-4">
          Set up a pre-trade checklist
        </Link>
        .
      </p>
    );
  }

  const followed = items.filter((item) => checked.has(item)).length;

  return (
    <fieldset className="rounded-lg border border-line px-3 pb-3 pt-2.5">
      <legend className="px-1 text-xs font-medium uppercase tracking-widest text-text-faint">
        Pre-trade checklist
      </legend>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 text-sm text-text hover:bg-bg-2/60">
              <input
                type="checkbox"
                checked={checked.has(item)}
                onChange={() => onToggle(item)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-signal-red"
              />
              <span className="min-w-0">{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p
        className={`mt-2 px-1 text-xs ${
          followed === items.length ? "text-signal-green" : "text-text-muted"
        }`}
      >
        {followed} of {items.length} followed
      </p>
    </fieldset>
  );
}