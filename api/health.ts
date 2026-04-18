import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseServiceAccount, siteDomain } from "./lib/google";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sa = !!parseServiceAccount();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    siteDomain: siteDomain(),
    integrations: {
      ga4: sa && !!process.env.GA4_PROPERTY_ID?.trim(),
      gsc: sa && !!process.env.GSC_SITE_URL?.trim(),
      ahrefs: !!process.env.AHREFS_API_KEY?.trim(),
      semrush: !!process.env.SEMRUSH_API_KEY?.trim(),
    },
  });
}
