import { useEffect, useState } from "react";
import { useAttachments, type Attachment } from "@/hooks/useAttachments";

interface TradeAttachmentsProps {
  tradeId: string;
}

export function TradeAttachments({ tradeId }: TradeAttachmentsProps): JSX.Element {
  const { listAttachments, deleteAttachment } = useAttachments();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const { attachments: result, error: fetchError } =
        await listAttachments(tradeId);

      if (cancelled) return;

      if (fetchError) setError(fetchError);
      else setAttachments(result);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tradeId, listAttachments]);

  const handleDelete = async (attachment: Attachment): Promise<void> => {
    const { error: deleteError } = await deleteAttachment(
      attachment.id,
      attachment.storagePath,
    );
    if (!deleteError) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    }
  };

  if (isLoading) {
    return (
      <p className="px-4 py-3 font-mono text-xs text-text-muted">
        Loading attachments…
      </p>
    );
  }

  if (error) {
    return <p className="px-4 py-3 font-mono text-xs text-signal-red">{error}</p>;
  }

  if (attachments.length === 0) {
    return (
      <p className="px-4 py-3 font-sans text-xs text-text-muted">
        No screenshots attached.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 px-4 py-3">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="group relative">
          <a href={attachment.signedUrl} target="_blank" rel="noreferrer">
            <img
              src={attachment.signedUrl}
              alt="Trade screenshot"
              className="h-20 w-20 rounded-lg border border-line object-cover"
            />
          </a>
          <button
            type="button"
            onClick={() => void handleDelete(attachment)}
            className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-signal-red text-paper group-hover:flex"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}