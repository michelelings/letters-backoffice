import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseServiceAccount } from "./lib/google";

function cellString(row: { dimensionValues?: { value?: string | null }[] } | undefined, i: number): string {
  return row?.dimensionValues?.[i]?.value ?? "";
}

function metricNumber(row: { metricValues?: { value?: string | null }[] } | undefined, i: number): number {
  const v = row?.metricValues?.[i]?.value;
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const creds = parseServiceAccount();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!creds || !propertyId) {
    res.status(503).json({
      ok: false,
      error:
        "GA4 not configured. Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_JSON on the Vercel project (service account needs Viewer on the GA4 property).",
    });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const client = new BetaAnalyticsDataClient({ credentials: creds });

    const [totals] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    });

    const [pages] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 30,
    });

    const totalsRow = totals.rows?.[0];
    const topPages =
      pages.rows?.map((row) => ({
        path: cellString(row, 0),
        sessions: metricNumber(row, 0),
      })) ?? [];

    res.status(200).json({
      ok: true,
      source: "ga4",
      dateRange: { start: "28daysAgo", end: "today" },
      totals: {
        sessions: metricNumber(totalsRow, 0),
        activeUsers: metricNumber(totalsRow, 1),
      },
      topPages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "GA4 request failed";
    res.status(502).json({ ok: false, error: message });
  }
}
