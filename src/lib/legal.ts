const DEFAULT_MARKETING_URL = "https://maarked.vercel.app";

const MARKETING_URL = (
  import.meta.env.VITE_MARKETING_URL || DEFAULT_MARKETING_URL
).replace(/\/+$/, "");

export const TERMS_URL = `${MARKETING_URL}/terms`;
export const PRIVACY_URL = `${MARKETING_URL}/privacy`;