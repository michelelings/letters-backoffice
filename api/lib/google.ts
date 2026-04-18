import type { JWTInput } from "google-auth-library";

export function parseServiceAccount(): JWTInput | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as JWTInput;
  } catch {
    return null;
  }
}

export function siteDomain(): string {
  return (process.env.SITE_DOMAIN || "letters.game").replace(/^https?:\/\//, "").replace(/\/$/, "");
}
