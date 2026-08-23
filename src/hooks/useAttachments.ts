import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface Attachment {
  id: string;
  tradeId: string;
  storagePath: string;
  signedUrl: string;
  createdAt: string;
}

const BUCKET = "trade-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60; 

interface UseAttachmentsResult {
  uploadAttachments: (
    tradeId: string,
    files: File[],
  ) => Promise<{ error: string | null; count: number }>;
  listAttachments: (
    tradeId: string,
  ) => Promise<{ attachments: Attachment[]; error: string | null }>;
  deleteAttachment: (
    attachmentId: string,
    storagePath: string,
  ) => Promise<{ error: string | null }>;
}

export function useAttachments(): UseAttachmentsResult {
  const { user } = useAuth();

  const uploadAttachments = useCallback(
    async (
      tradeId: string,
      files: File[],
    ): Promise<{ error: string | null; count: number }> => {
      if (!user) return { error: "Not signed in.", count: 0 };
      if (files.length === 0) return { error: null, count: 0 };

      let uploaded = 0;
      for (const file of files) {
        const path = `${user.id}/${tradeId}/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file);
        if (uploadError) {
          return { error: uploadError.message, count: uploaded };
        }

        const { error: insertError } = await supabase
          .from("trade_attachments")
          .insert({
            trade_id: tradeId,
            user_id: user.id,
            storage_path: path,
          });
        if (insertError) {
          return { error: insertError.message, count: uploaded };
        }

        uploaded++;
      }

      return { error: null, count: uploaded };
    },
    [user],
  );

  const listAttachments = useCallback(
    async (
      tradeId: string,
    ): Promise<{ attachments: Attachment[]; error: string | null }> => {
      const { data, error: fetchError } = await supabase
        .from("trade_attachments")
        .select("*")
        .eq("trade_id", tradeId)
        .order("created_at", { ascending: true });

      if (fetchError) return { attachments: [], error: fetchError.message };
      if (!data || data.length === 0) return { attachments: [], error: null };

      const paths = data.map((row) => row.storage_path);
      const { data: signedUrls, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

      if (signError) return { attachments: [], error: signError.message };

      const attachments: Attachment[] = data.map((row, i) => ({
        id: row.id,
        tradeId: row.trade_id,
        storagePath: row.storage_path,
        signedUrl: signedUrls?.[i]?.signedUrl ?? "",
        createdAt: row.created_at,
      }));

      return { attachments, error: null };
    },
    [],
  );

  const deleteAttachment = useCallback(
    async (
      attachmentId: string,
      storagePath: string,
    ): Promise<{ error: string | null }> => {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);
      if (storageError) return { error: storageError.message };

      const { error: dbError } = await supabase
        .from("trade_attachments")
        .delete()
        .eq("id", attachmentId);
      if (dbError) return { error: dbError.message };

      return { error: null };
    },
    [],
  );

  return { uploadAttachments, listAttachments, deleteAttachment };
}