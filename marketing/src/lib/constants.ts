const DEFAULT_APP_URL = "https://app-marked.vercel.app";

export const APP_URL = (import.meta.env.PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");

export const SIGN_IN_URL = `${APP_URL}/auth`;
export const SIGN_UP_URL = `${APP_URL}/auth/signup`;

export const APP_HOST = new URL(APP_URL).host;

export const SUPPORT_EMAIL = "support@marked.app";
export const LEGAL_LAST_UPDATED = "24 October 2026";

