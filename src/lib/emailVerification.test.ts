import { describe, expect, it } from "vitest";
import {
  isEmailNotConfirmedError,
  isEmailVerified,
} from "@/lib/emailVerification";

describe("isEmailVerified", () => {
  it("is true once the email has a confirmation time", () => {
    expect(isEmailVerified({ email_confirmed_at: "2026-11-05T10:00:00Z" })).toBe(
      true,
    );
  });

  it("is false when the email was never confirmed", () => {
    expect(isEmailVerified({ email_confirmed_at: undefined })).toBe(false);
    expect(isEmailVerified({ email_confirmed_at: "" })).toBe(false);
  });

  it("is false when there is no user", () => {
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified(undefined)).toBe(false);
  });
});

describe("isEmailNotConfirmedError", () => {
  it("recognises the error code", () => {
    expect(
      isEmailNotConfirmedError({ code: "email_not_confirmed", message: "x" }),
    ).toBe(true);
  });

  it("recognises the message when there is no code", () => {
    expect(isEmailNotConfirmedError({ message: "Email not confirmed" })).toBe(
      true,
    );
  });

  it("ignores other errors", () => {
    expect(
      isEmailNotConfirmedError({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe(false);
    expect(isEmailNotConfirmedError(null)).toBe(false);
  });
});