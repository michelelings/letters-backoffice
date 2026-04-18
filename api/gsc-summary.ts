import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { parseServiceAccount } from "./lib/google";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const creds = parseServiceAccount();
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!creds || !siteUrl) {
    res.status(503).json({
      ok: false,
      error:
        "GSC not configured. Set GSC_SITE_URL (exact property URL, for example https://www.letters.game/) and GOOGLE_SERVICE_ACCOUNT_JSON. Add the service account in Search Console with access to that property.",
    });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  const end = isoDate(new Date());
  const startD = new Date();
  startD.setUTCDate(startD.getUTCDate() - 28);
  const start = isoDate(startD);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const webmasters = google.searchconsole({ version: "v1", auth });

    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["page"],
        rowLimit: 30,
      },
    });

    const rows =
      data.rows?.map((row) => ({
        page: row.keys?.[0] ?? "",
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      })) ?? [];

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += r.clicks;
        acc.impressions += r.impressions;
        return acc;
      },
      { clicks: 0, impressions: 0 },
    );

    res.status(200).json({
      ok: true,
      source: "gsc",
      siteUrl,
      dateRange: { start, end },
      totals,
      topPages: rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "GSC request failed";
    res.status(502).json({ ok: false, error: message });
  }
}
