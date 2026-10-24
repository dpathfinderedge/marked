import { describe, expect, it } from "vitest";
import { getFunctionErrorMessage } from "./functionError";

const withResponse = (body: BodyInit | null, status = 502) => ({
  message: "Edge Function returned a non-2xx status code",
  context: new Response(body, { status }),
});

describe("getFunctionErrorMessage", () => {
  it("uses the error message from the function's response", async () => {
    const error = withResponse(JSON.stringify({ error: "Account was not deleted." }));
    await expect(getFunctionErrorMessage(error)).resolves.toBe("Account was not deleted.");
  });

  it("falls back when the body is not JSON or has no message", async () => {
    await expect(getFunctionErrorMessage(withResponse("<html>"))).resolves.toMatch(/try again/i);
    await expect(getFunctionErrorMessage(withResponse(JSON.stringify({ ok: false })))).resolves.toMatch(/try again/i);
    await expect(getFunctionErrorMessage(withResponse(JSON.stringify({ error: "" })))).resolves.toMatch(/try again/i);
  });

  it("never exposes the library's generic non-2xx text", async () => {
    await expect(getFunctionErrorMessage(new Error("Edge Function returned a non-2xx status code"))).resolves.not.toMatch(/non-2xx/);
  });

  it("accepts a custom fallback and odd inputs", async () => {
    await expect(getFunctionErrorMessage(null, "Nope")).resolves.toBe("Nope");
    await expect(getFunctionErrorMessage(undefined)).resolves.toMatch(/try again/i);
  });
});