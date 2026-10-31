import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { SHARE_PERIODS, buildShareCard, type SharePeriod } from "@/lib/calculations";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, drawShareCard } from "@/lib/share/drawShareCard";
import { toIsoDate } from "@/utils/dates";
import type { Trade } from "@/types/trade";

const SCALE = 2;

interface ShareCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
}

async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('600 28px "Geist"'),
      document.fonts.load('700 108px "Geist Mono"'),
      document.fonts.load('600 40px "Geist Mono"'),
    ]);
  } catch {
    // 
  }
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export function ShareCardDialog({ isOpen, onClose, trades }: ShareCardDialogProps): JSX.Element {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [period, setPeriod] = useState<SharePeriod>("month");
  const [showDollars, setShowDollars] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const data = useMemo(
    () => buildShareCard(trades, { period, showDollars, today: toIsoDate(new Date()) }),
    [trades, period, showDollars],
  );

  useEffect(() => {
    if (!isOpen) {
      setShowDollars(false);
      return;
    }
    let cancelled = false;
    void loadFonts().then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isOpen || !canvas || !data || !fontsReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = SHARE_CARD_WIDTH * SCALE;
    canvas.height = SHARE_CARD_HEIGHT * SCALE;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawShareCard(ctx, data);
  }, [isOpen, data, fontsReady]);

  const canCopy = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

  const download = async (): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const blob = await toPng(canvas);
    if (!blob) {
      showToast("We couldn't make the image. Try again.", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marked-${period}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Image saved.");
  };

  const copy = async (): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    try {
      const blob = await toPng(canvas);
      if (!blob) throw new Error("no image");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Image copied.");
    } catch {
      showToast("Your browser wouldn't copy the image. Save it instead.", "error");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Share your results"
      description="Make an image of your stats to post anywhere."
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Select
            label="Period"
            options={SHARE_PERIODS}
            value={period}
            onChange={(e) => setPeriod(e.target.value as SharePeriod)}
          />
          <label className="flex cursor-pointer items-center gap-2.5 pb-2 text-sm text-text">
            <input
              type="checkbox"
              checked={showDollars}
              onChange={(e) => setShowDollars(e.target.checked)}
              className="h-4 w-4 accent-signal-red"
            />
            Show dollar amounts
          </label>
        </div>

        {data ? (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Your results for ${data.periodLabel}: ${data.trades} trades`}
            className="aspect-[1200/630] w-full rounded-lg border border-line bg-bg-0"
          />
        ) : (
          <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-lg border border-dashed border-line px-6 text-center text-sm text-text-muted">
            No trades in this period. Pick a longer one to make a card.
          </div>
        )}

        <p className="text-xs text-text-faint">
          {showDollars
            ? "The image shows your profit and loss in dollars."
            : "The image shows no dollar amounts, so your account size stays private."}{" "}
          It never includes your notes, pairs or account details, and nothing is uploaded.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          {canCopy ? (
            <Button type="button" variant="secondary" onClick={() => void copy()} disabled={!data}>
              Copy image
            </Button>
          ) : null}
          <Button type="button" onClick={() => void download()} disabled={!data}>
            Save image
          </Button>
        </div>
      </div>
    </Dialog>
  );
}