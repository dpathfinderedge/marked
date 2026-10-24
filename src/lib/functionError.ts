export async function getFunctionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): Promise<string> {
  if (typeof error === "object" && error !== null && "context" in error) {
    const context = (error as { context: unknown }).context;
    if (context instanceof Response) {
      try {
        const body: unknown = await context.clone().json();
        if (
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string" &&
          (body as { error: string }).error !== ""
        ) {
          return (body as { error: string }).error;
        }
      } catch {
        // Not JSON; use the fallback below.
      }
      return fallback;
    }
  }
  return fallback;
}