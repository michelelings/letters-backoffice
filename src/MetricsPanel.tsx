import { useEffect, useMemo, useState, type ReactNode } from "react";
import { localeLabel } from "./locales";
import type {
  GaSummaryResponse,
  GscSummaryResponse,
  HealthResponse,
  SeoSummaryResponse,
} from "./metricsTypes";
import { normalizeReportPath } from "./metricsPath";
import type { PageRow, PagesManifest } from "./types";

async function fetchJson<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(path);
    const text = await res.text();
    let data: T | null = null;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bo-card">
      <h2 className="bo-card__title">{title}</h2>
      <div className="bo-card__body">{children}</div>
    </section>
  );
}

function fmtCellNum(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  return n.toLocaleString();
}

function fmtCtr(ratio: number | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "n/a";
  return `${(ratio * 100).toFixed(2)}%`;
}

function fmtPos(pos: number | undefined): string {
  if (pos == null || !Number.isFinite(pos)) return "n/a";
  return pos.toFixed(1);
}

type GscMetrics = { clicks: number; impressions: number; ctr: number; position: number };

export function MetricsPanel({ manifest }: { manifest: PagesManifest }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ga, setGa] = useState<GaSummaryResponse | null>(null);
  const [gsc, setGsc] = useState<GscSummaryResponse | null>(null);
  const [seo, setSeo] = useState<SeoSummaryResponse | null>(null);
  const [apisLoading, setApisLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setApisLoading(true);
      const [h, gaR, gscR, seoR] = await Promise.all([
        fetchJson<HealthResponse>("/api/health"),
        fetchJson<GaSummaryResponse>("/api/ga-summary"),
        fetchJson<GscSummaryResponse>("/api/gsc-summary"),
        fetchJson<SeoSummaryResponse>("/api/seo-summary"),
      ]);
      if (cancelled) return;
      setHealth(h.data);
      setGa(gaR.data);
      setGsc(gscR.data);
      setSeo(seoR.data);
      setApisLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiUnreachable =
    !apisLoading &&
    health === null &&
    ga === null &&
    gsc === null &&
    seo === null;

  const gaByPath = useMemo(() => {
    const m = new Map<string, number>();
    if (ga && "ok" in ga && ga.ok) {
      for (const row of ga.topPages) {
        m.set(normalizeReportPath(row.path), row.sessions);
      }
    }
    return m;
  }, [ga]);

  const gscByPath = useMemo(() => {
    const m = new Map<string, GscMetrics>();
    if (gsc && "ok" in gsc && gsc.ok) {
      for (const row of gsc.topPages) {
        m.set(normalizeReportPath(row.page), {
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        });
      }
    }
    return m;
  }, [gsc]);

  const tableRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const sorted = [...manifest.pages].sort((a, b) => {
      if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
      return a.urlPath.localeCompare(b.urlPath);
    });
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.urlPath.toLowerCase().includes(q) ||
        p.pathKey.toLowerCase().includes(q) ||
        p.locale.toLowerCase().includes(q) ||
        p.file.toLowerCase().includes(q),
    );
  }, [manifest.pages, tableSearch]);

  return (
    <div className="bo-metrics">
      {import.meta.env.DEV ? (
        <p className="bo-metrics__hint">
          <strong>Local Vite:</strong> <span className="bo-mono">/api/*</span> routes only run with{" "}
          <span className="bo-mono">npx vercel dev</span> from <span className="bo-mono">backoffice/</span>, or on a
          Vercel deployment. The table still lists every HTML page; metric cells fill in when APIs respond.
        </p>
      ) : null}

      {apisLoading ? <p className="bo-meta">Loading API status…</p> : null}

      {apiUnreachable ? (
        <p className="bo-metrics__hint">
          APIs did not return JSON (for example plain <span className="bo-mono">npm run dev</span> without functions).
          Rows below are still filled from the manifest; GA4, GSC, and vendor columns stay at{" "}
          <span className="bo-mono">n/a</span> until <span className="bo-mono">vercel dev</span> or production env vars
          are wired.
        </p>
      ) : null}

      {health ? (
        <p className="bo-meta">
          Domain: <span className="bo-mono">{health.siteDomain}</span> · GA4 env:{" "}
          <span className="bo-mono">{health.integrations.ga4 ? "yes" : "no"}</span> · GSC env:{" "}
          <span className="bo-mono">{health.integrations.gsc ? "yes" : "no"}</span> · Ahrefs env:{" "}
          <span className="bo-mono">{health.integrations.ahrefs ? "yes" : "no"}</span> · Semrush env:{" "}
          <span className="bo-mono">{health.integrations.semrush ? "yes" : "no"}</span>
        </p>
      ) : null}

      <h2 className="bo-metrics__section-title">Pages and metric slots</h2>
      <p className="bo-meta bo-metrics__section-lead">
        One row per HTML page in the repo. GA4 and GSC values join on normalized URL path when the APIs return data.
        Today each API returns a capped “top pages” list, so many rows stay <span className="bo-mono">n/a</span> until
        we widen or page those queries. Ahrefs and Semrush columns are reserved for future per-URL scores; domain-level
        figures stay in the summary cards.
      </p>

      <div className="bo-toolbar bo-toolbar--metrics">
        <div className="bo-field">
          <label htmlFor="metrics-table-search">Filter pages</label>
          <input
            id="metrics-table-search"
            type="search"
            placeholder="Locale, path, or file"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <p className="bo-metrics__row-count">
          {tableRows.length} of {manifest.pages.length} pages
        </p>
      </div>

      <div className="bo-table-wrap bo-table-wrap--metrics">
        <table className="bo-table bo-table--metrics">
          <thead>
            <tr>
              <th scope="col">Locale</th>
              <th scope="col">URL</th>
              <th scope="col" title="Google Analytics 4: sessions in the last 28 days (joined by path)">
                GA4 sessions (28d)
              </th>
              <th scope="col" title="Google Search Console: clicks in the last 28 days">
                GSC clicks
              </th>
              <th scope="col" title="Google Search Console: impressions in the last 28 days">
                GSC impressions
              </th>
              <th scope="col" title="Google Search Console: click-through rate">
                GSC CTR
              </th>
              <th scope="col" title="Google Search Console: average position">
                GSC position
              </th>
              <th scope="col" title="Reserved for per-URL Ahrefs metrics when an endpoint is available">
                Ahrefs (URL)
              </th>
              <th scope="col" title="Reserved for per-URL Semrush metrics when an endpoint is available">
                Semrush (URL)
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((page: PageRow) => {
              const path = normalizeReportPath(page.urlPath);
              const sessions = gaByPath.get(path);
              const gscRow = gscByPath.get(path);
              return (
                <tr key={page.file}>
                  <td>{localeLabel(page.locale)}</td>
                  <td>
                    <a
                      className="bo-link"
                      href={`${manifest.baseUrl.replace(/\/$/, "")}${page.urlPath === "/" ? "/" : page.urlPath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {page.urlPath}
                    </a>
                    <div className="bo-mono bo-metrics__file-hint">{page.file}</div>
                  </td>
                  <td className="bo-metrics__num">{fmtCellNum(sessions)}</td>
                  <td className="bo-metrics__num">{fmtCellNum(gscRow?.clicks)}</td>
                  <td className="bo-metrics__num">{fmtCellNum(gscRow?.impressions)}</td>
                  <td className="bo-metrics__num">{fmtCtr(gscRow?.ctr)}</td>
                  <td className="bo-metrics__num">{fmtPos(gscRow?.position)}</td>
                  <td className="bo-metrics__num bo-metrics__placeholder">n/a</td>
                  <td className="bo-metrics__num bo-metrics__placeholder">n/a</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="bo-metrics__section-title">API summaries</h2>
      <div className="bo-metrics-grid">
        <Card title="Google Analytics (GA4)">
          {!ga ? (
            <p className="bo-card__muted">No response from <span className="bo-mono">/api/ga-summary</span>.</p>
          ) : "ok" in ga && ga.ok ? (
            <>
              <p className="bo-metrics__kpi">
                <span className="bo-metrics__kpi-label">Sessions (28d)</span>
                <span className="bo-metrics__kpi-value">{ga.totals.sessions.toLocaleString()}</span>
              </p>
              <p className="bo-metrics__kpi">
                <span className="bo-metrics__kpi-label">Active users (28d)</span>
                <span className="bo-metrics__kpi-value">{ga.totals.activeUsers.toLocaleString()}</span>
              </p>
            </>
          ) : (
            <p className="bo-card__error">{"error" in ga ? ga.error : "Unavailable"}</p>
          )}
        </Card>

        <Card title="Google Search Console">
          {!gsc ? (
            <p className="bo-card__muted">No response from <span className="bo-mono">/api/gsc-summary</span>.</p>
          ) : "ok" in gsc && gsc.ok ? (
            <>
              <p className="bo-metrics__kpi">
                <span className="bo-metrics__kpi-label">Clicks (28d)</span>
                <span className="bo-metrics__kpi-value">{gsc.totals.clicks.toLocaleString()}</span>
              </p>
              <p className="bo-metrics__kpi">
                <span className="bo-metrics__kpi-label">Impressions (28d)</span>
                <span className="bo-metrics__kpi-value">{gsc.totals.impressions.toLocaleString()}</span>
              </p>
            </>
          ) : (
            <p className="bo-card__error">{"error" in gsc ? gsc.error : "Unavailable"}</p>
          )}
        </Card>

        <Card title="Ahrefs and Semrush (domain)">
          {!seo ? (
            <p className="bo-card__muted">No response from <span className="bo-mono">/api/seo-summary</span>.</p>
          ) : (
            <>
              <h3 className="bo-metrics__h3">Ahrefs</h3>
              {!seo.ahrefs.configured ? (
                <p className="bo-card__muted">Set <span className="bo-mono">AHREFS_API_KEY</span> on Vercel.</p>
              ) : seo.ahrefs.error ? (
                <p className="bo-card__error">{seo.ahrefs.error}</p>
              ) : (
                <ul className="bo-metrics__list">
                  <li>
                    <strong>Domain Rating:</strong>{" "}
                    {seo.ahrefs.domainRating != null ? seo.ahrefs.domainRating : "n/a"}
                  </li>
                  <li>
                    <strong>Ahrefs Rank:</strong> {seo.ahrefs.ahrefsRank != null ? seo.ahrefs.ahrefsRank : "n/a"}
                  </li>
                </ul>
              )}

              <h3 className="bo-metrics__h3">Semrush</h3>
              {!seo.semrush.configured ? (
                <p className="bo-card__muted">
                  Set <span className="bo-mono">SEMRUSH_API_KEY</span> (and optional{" "}
                  <span className="bo-mono">SEMRUSH_DATABASE</span>, default <span className="bo-mono">us</span>) on
                  Vercel.
                </p>
              ) : seo.semrush.error ? (
                <p className="bo-card__error">{seo.semrush.error}</p>
              ) : (
                <ul className="bo-metrics__list">
                  <li>
                    <strong>Rank (Rk):</strong> {seo.semrush.rank != null ? seo.semrush.rank.toLocaleString() : "n/a"}
                  </li>
                  <li>
                    <strong>Domain score (Db):</strong>{" "}
                    {seo.semrush.domainScore != null ? seo.semrush.domainScore.toLocaleString() : "n/a"}
                  </li>
                  <li>
                    <strong>Organic keywords (Or):</strong>{" "}
                    {seo.semrush.organicKeywords != null ? seo.semrush.organicKeywords.toLocaleString() : "n/a"}
                  </li>
                  <li>
                    <strong>Organic traffic (Ot):</strong>{" "}
                    {seo.semrush.organicTraffic != null ? seo.semrush.organicTraffic.toLocaleString() : "n/a"}
                  </li>
                </ul>
              )}
            </>
          )}
        </Card>
      </div>

      <p className="bo-footnote">
        Keys and service account JSON live in Vercel environment variables only. GA4 and GSC share{" "}
        <span className="bo-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> when both are enabled. Join keys normalize paths
        (trailing slashes, full URL vs path). Vendor URL columns are placeholders until per-page API fields are defined.
      </p>
    </div>
  );
}
