import type { VercelRequest, VercelResponse } from "@vercel/node";
import { siteDomain } from "./lib/google";

function splitCsvLine(line: string): string[] {
  const delim = line.includes(";") ? ";" : ",";
  return line.split(delim).map((s) => s.trim());
}

function parseSemrushDomainRanksCsv(text: string): Record<string, string> | null {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = splitCsvLine(lines[0]);
  const values = splitCsvLine(lines[1]);
  if (headers.length !== values.length) return null;
  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]] = values[i];
  }
  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  const domain = siteDomain();
  const ahrefsKey = process.env.AHREFS_API_KEY?.trim();
  const semrushKey = process.env.SEMRUSH_API_KEY?.trim();
  const semrushDatabase = process.env.SEMRUSH_DATABASE?.trim() || "us";

  const out: {
    ok: boolean;
    domain: string;
    ahrefs: {
      configured: boolean;
      domainRating?: number;
      ahrefsRank?: number;
      error?: string;
    };
    semrush: {
      configured: boolean;
      /** Semrush Rank (column Rk) when present */
      rank?: number;
      /** Authority Score style metric (column Db) when present */
      domainScore?: number;
      organicKeywords?: number;
      organicTraffic?: number;
      raw?: Record<string, string>;
      error?: string;
    };
  } = {
    ok: true,
    domain,
    ahrefs: { configured: !!ahrefsKey },
    semrush: { configured: !!semrushKey },
  };

  const today = new Date().toISOString().slice(0, 10);

  if (ahrefsKey) {
    try {
      const url = new URL("https://api.ahrefs.com/v3/site-explorer/domain-rating");
      url.searchParams.set("output", "json");
      url.searchParams.set("date", today);
      url.searchParams.set("target", domain);

      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${ahrefsKey}`,
          Accept: "application/json",
        },
      });

      const text = await r.text();
      if (!r.ok) {
        out.ahrefs.error = text.slice(0, 500) || `HTTP ${r.status}`;
      } else {
        const json = JSON.parse(text) as {
          domain_rating?: { domain_rating?: number; ahrefs_rank?: number };
          rating?: { domain_rating?: number; ahrefs_rank?: number };
        };
        const block = json.domain_rating ?? json.rating;
        const dr = block?.domain_rating;
        const ar = block?.ahrefs_rank;
        if (typeof dr === "number") out.ahrefs.domainRating = dr;
        if (typeof ar === "number") out.ahrefs.ahrefsRank = ar;
      }
    } catch (e) {
      out.ahrefs.error = e instanceof Error ? e.message : "Ahrefs request failed";
    }
  }

  if (semrushKey) {
    try {
      const url = new URL("https://api.semrush.com/");
      url.searchParams.set("type", "domain_ranks");
      url.searchParams.set("key", semrushKey);
      url.searchParams.set("domain", domain);
      url.searchParams.set("database", semrushDatabase);
      url.searchParams.set("export_columns", "Db,Rk,Or,Ot");

      const r = await fetch(url.toString());
      const text = await r.text();
      if (!r.ok) {
        out.semrush.error = text.slice(0, 500) || `HTTP ${r.status}`;
      } else {
        const row = parseSemrushDomainRanksCsv(text);
        if (!row) {
          out.semrush.error = "Unexpected Semrush response shape";
        } else {
          out.semrush.raw = row;
          const rk = Number(row.Rk);
          const or = Number(row.Or);
          const ot = Number(row.Ot);
          const db = Number(row.Db);
          if (Number.isFinite(rk)) out.semrush.rank = rk;
          if (Number.isFinite(db)) out.semrush.domainScore = db;
          if (Number.isFinite(or)) out.semrush.organicKeywords = or;
          if (Number.isFinite(ot)) out.semrush.organicTraffic = ot;
        }
      }
    } catch (e) {
      out.semrush.error = e instanceof Error ? e.message : "Semrush request failed";
    }
  }

  res.status(200).json(out);
}
