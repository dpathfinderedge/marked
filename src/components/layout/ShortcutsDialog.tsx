import { Dialog } from "@/components/ui/Dialog";
import { GO_TARGETS } from "@/lib/shortcuts/shortcuts";

function Key({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-xs text-text">
      {children}
    </kbd>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }): JSX.Element {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text">{label}</span>
      <span className="flex items-center gap-1.5 text-xs text-text-faint">
        {keys.map((key, i) =>
          key === "then" ? (
            <span key={i}>then</span>
          ) : (
            <Key key={i}>{key}</Key>
          ),
        )}
      </span>
    </li>
  );
}

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps): JSX.Element {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="They work when you're not typing in a field."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="text-xs font-medium text-text-muted">Do something</h3>
          <ul className="mt-1 divide-y divide-line">
            <Row keys={["n"]} label="Log a new trade" />
            <Row keys={["/"]} label="Search your trades" />
            <Row keys={["?"]} label="Show this list" />
          </ul>
        </section>
        <section>
          <h3 className="text-xs font-medium text-text-muted">Go to a page</h3>
          <ul className="mt-1 divide-y divide-line">
            {GO_TARGETS.map((target) => (
              <Row key={target.key} keys={["g", "then", target.key]} label={target.label} />
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  );
}