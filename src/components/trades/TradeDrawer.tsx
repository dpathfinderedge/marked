import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Stamp } from "@/components/ui/Stamp";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { TradeAttachments } from "@/components/trades/TradeAttachments";
import { useAttachments } from "@/hooks/useAttachments";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/useToast";
import type { TradePatch } from "@/hooks/useTrades";
import type { CalcMode, Trade } from "@/types/trade";
import { formatWeekdayDate } from "@/utils/dates";
import { formatDollars, formatSignedDollars } from "@/utils/format";

interface TradeDrawerProps {
  trade: Trade | null;
  isFlagged: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: TradePatch) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const CALC_MODE_LABEL: Record<CalcMode, string> = {
  direct: "Calculated from prices",
  converted: "Converted at a live rate",
  manual: "Entered by hand",
};

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-text">{children}</dd>
    </div>
  );
}

function DrawerBody({
  trade,
  isFlagged,
  onClose,
  onUpdate,
  onDelete,
}: Omit<TradeDrawerProps, "trade"> & { trade: Trade }): JSX.Element {
  const { isPro } = useSubscription();
  const { uploadAttachments } = useAttachments();
  const { showToast } = useToast();

  const [notes, setNotes] = useState(trade.notes);
  const [tag, setTag] = useState(trade.tag);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotsVersion, setScreenshotsVersion] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLong = trade.direction === "long";
  const isDirty = notes !== trade.notes || tag.trim() !== trade.tag;

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    const { error } = await onUpdate(trade.id, { notes, tag: tag.trim() });
    setIsSaving(false);
    if (error) {
      showToast(error, "error");
      return;
    }
    setTag(tag.trim());
    showToast("Changes saved.");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;

    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      showToast(`${tooLarge.name} is over 5MB. Choose a smaller image.`, "error");
      return;
    }

    setIsUploading(true);
    const { error } = await uploadAttachments(trade.id, files);
    setIsUploading(false);
    setScreenshotsVersion((v) => v + 1);

    if (error) {
      showToast(error, "error");
      return;
    }
    showToast(files.length === 1 ? "Screenshot added." : "Screenshots added.");
  };

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    const { error } = await onDelete(trade.id);
    setIsDeleting(false);
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("Trade deleted.");
    onClose();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p
          className={`font-mono text-3xl font-semibold tracking-tight ${
            trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {formatSignedDollars(trade.pnl)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-text-muted">
          <span
            className={`flex items-center gap-0.5 ${
              isLong ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {isLong ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isLong ? "Long" : "Short"}
          </span>
          {trade.rMultiple !== null ? (
            <span className="font-mono">{trade.rMultiple.toFixed(2)}R</span>
          ) : null}
        </p>
      </div>

      {isFlagged ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-signal-red/30 bg-signal-red/5 px-3 py-2.5 text-sm text-text">
          <Stamp size={16} className="mt-0.5 shrink-0 text-signal-red" />
          <p>This trade came right after a losing streak. Worth a look at what you were feeling.</p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Market">{trade.market === "forex" ? "Forex" : "Crypto"}</Field>
        <Field label="Session">{trade.session}</Field>
        <Field label="Risk">{trade.risk !== null ? formatDollars(trade.risk) : "—"}</Field>
        <Field label="Pips">{trade.pips !== null ? trade.pips.toFixed(1) : "—"}</Field>
        <div className="col-span-2">
          <Field label="P&L">{CALC_MODE_LABEL[trade.calcMode]}</Field>
        </div>
      </dl>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          Setup
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="breakout, reversal…"
            className="rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-line-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          Notes
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why you took it, how it played out, what you'd change."
            className="rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-line-strong"
          />
        </label>
        {isDirty ? (
          <div className="flex gap-2">
            <Button onClick={() => void handleSave()} isLoading={isSaving}>
              Save changes
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setNotes(trade.notes);
                setTag(trade.tag);
              }}
              disabled={isSaving}
            >
              Discard
            </Button>
          </div>
        ) : null}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Screenshots</h3>
          {isPro ? (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text">
              <ImagePlus size={14} />
              {isUploading ? "Uploading…" : "Add"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                onChange={(e) => void handleUpload(e)}
                className="sr-only"
              />
            </label>
          ) : null}
        </div>
        <TradeAttachments key={screenshotsVersion} tradeId={trade.id} />
        {!isPro ? <UpgradePrompt feature="Adding screenshots" /> : null}
      </section>

      <section className="border-t border-line pt-5">
        {isConfirmingDelete ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              Delete this trade
              {" "}
              and its screenshots? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg bg-signal-red px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </button>
              <Button
                variant="secondary"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-signal-red"
          >
            <Trash2 size={15} />
            Delete trade
          </button>
        )}
        <Link
          to={`/calendar?date=${trade.date}`}
          onClick={onClose}
          className="mt-4 block text-sm text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
        >
          See this day in the calendar
        </Link>
      </section>
    </div>
  );
}

export function TradeDrawer({
  trade,
  isFlagged,
  onClose,
  onUpdate,
  onDelete,
}: TradeDrawerProps): JSX.Element {
  return (
    <Dialog
      isOpen={trade !== null}
      onClose={onClose}
      placement="right"
      title={trade?.pair ?? "Trade"}
      description={
        trade ? `${formatWeekdayDate(trade.date)}, ${trade.date.slice(0, 4)}` : undefined
      }
    >
      {trade ? (
        <DrawerBody
          key={trade.id}
          trade={trade}
          isFlagged={isFlagged}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ) : null}
    </Dialog>
  );
}