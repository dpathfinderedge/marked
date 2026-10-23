import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getFunctionErrorMessage } from "@/lib/functionError";
import {
  parseSubscriptionDetails,
  type SubscriptionDetails,
} from "@/lib/billing/manage";

type ManageAction = "details" | "cancel" | "resume" | "manage-link";

interface Result<T> {
  data: T | null;
  error: string | null;
}

async function invoke(action: ManageAction): Promise<Result<unknown>> {
  const { data, error } = await supabase.functions.invoke(
    "manage-subscription",
    { body: { action } },
  );
  if (error) return { data: null, error: await getFunctionErrorMessage(error) };
  return { data, error: null };
}

export async function waitForPlanCode(
  userId: string,
  planCode: string,
  attempts = 15,
  intervalMs = 2000,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.plan_code === planCode) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export function useManageSubscription() {
  const loadDetails = useCallback(async (): Promise<
    Result<SubscriptionDetails>
  > => {
    const { data, error } = await invoke("details");
    if (error) return { data: null, error };
    const details = parseSubscriptionDetails(data);
    return details
      ? { data: details, error: null }
      : { data: null, error: "We couldn't read your subscription details." };
  }, []);

  const cancel = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await invoke("cancel");
    return { error };
  }, []);

  const resume = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await invoke("resume");
    return { error };
  }, []);

  const getCardUpdateLink = useCallback(async (): Promise<Result<string>> => {
    const { data, error } = await invoke("manage-link");
    if (error) return { data: null, error };
    const link =
      typeof data === "object" && data !== null && "link" in data
        ? (data as { link: unknown }).link
        : null;
    return typeof link === "string" && link.startsWith("https://")
      ? { data: link, error: null }
      : { data: null, error: "We couldn't get your card update link." };
  }, []);

  return { loadDetails, cancel, resume, getCardUpdateLink };
}