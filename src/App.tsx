import { useEffect, useMemo, useState } from "react";
import { localeLabel } from "./locales";
import { MetricsPanel } from "./MetricsPanel";
import type { PageRow, PagesManifest } from "./types";

type Tab = "parity" | "browse" | "metrics";

function absUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  if (path === "/") return `${b}/`;
  return `${b}${path.startsWith("/") ? path : `/${path}`}`;
}

function indexMirrorPages(pages: PageRow[]): Map<string, PageRow> {
  const m = new Map<string, PageRow>();
  for (const p of pages) {
    if (p.mirrorPathKey === null) continue;
    m.set(`${p.locale}:${p.mirrorPathKey}`, p);
  }
  return m;
}

function isGuidesPage(pathKey: string): boolean {
  return pathKey === "guides" || /(^|\/)guides(\/|$)/.test(pathKey);
}

export function App() {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("parity");
  const [compareLocale, setCompareLocale] = useState("es");
  const [browseLocale, setBrowseLocale] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [guidesOnly, setGuidesOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/pages-manifest.json");
        if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
        const data = (await res.json()) as PagesManifest;
        if (!cancelled) {
          setManifest(data);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load manifest");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byMirror = useMemo(
    () => (manifest ? indexMirrorPages(manifest.pages) : null),
    [manifest],
  );

  const localeOptions = useMemo(() => {
    if (!manifest) return [];
    const codes = new Set(manifest.pages.map((p) => p.locale));
    for (const c of manifest.prefixLocales) codes.add(c);
    codes.add("en");
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [manifest]);

  const compareLocaleOptions = useMemo(
    () => localeOptions.filter((c) => c !== "en"),
    [localeOptions],
  );

  const effectiveCompare =
    compareLocaleOptions.includes(compareLocale) && compareLocale !== "en"
      ? compareLocale
      : (compareLocaleOptions[0] ?? "es");

  const parityRows = useMemo(() => {
    if (!manifest || !byMirror) return [];
    const rows: { en: PageRow; other: PageRow | null }[] = [];
    for (const p of manifest.pages) {
      if (p.locale !== "en" || p.mirrorPathKey === null) continue;
      if (guidesOnly && !isGuidesPage(p.pathKey)) continue;
      const other = byMirror.get(`${effectiveCompare}:${p.mirrorPathKey}`) ?? null;
      if (missingOnly && other) continue;
      const q = search.trim().toLowerCase();
      if (q && !p.pathKey.toLowerCase().includes(q) && !p.urlPath.toLowerCase().includes(q)) {
        continue;
      }
      rows.push({ en: p, other });
    }
    return rows;
  }, [manifest, byMirror, effectiveCompare, guidesOnly, missingOnly, search]);

  const browseRows = useMemo(() => {
    if (!manifest) return [];
    const q = search.trim().toLowerCase();
    return manifest.pages.filter((p) => {
      if (browseLocale !== "all" && p.locale !== browseLocale) return false;
      if (guidesOnly && !isGuidesPage(p.pathKey)) return false;
      if (q && !p.pathKey.toLowerCase().includes(q) && !p.file.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [manifest, browseLocale, guidesOnly, search]);

  return (
    <div className="bo-shell">
      <header className="bo-header">
        <h1>Letters backoffice</h1>
      </header>

      <main className="bo-main">
        {loadError ? (
          <div className="bo-error" role="alert">
            <strong>Could not load pages manifest.</strong> {loadError} Run{" "}
            <span className="bo-mono">npm run manifest</span> from <span className="bo-mono">backoffice/</span>{" "}
            after pulling HTML changes, then refresh.
          </div>
        ) : null}

        {manifest ? (
          <>
            <div className="bo-tabs" role="tablist" aria-label="View">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "parity"}
                className="bo-tab"
                onClick={() => setTab("parity")}
              >
                English vs locale
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "browse"}
                className="bo-tab"
                onClick={() => setTab("browse")}
              >
                Browse all
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "metrics"}
                className="bo-tab"
                onClick={() => setTab("metrics")}
              >
                Metrics
              </button>
            </div>

            <div className="bo-toolbar">
              {tab === "metrics" ? null : (
                <>
                  <div className="bo-field">
                    <label htmlFor="search">Search</label>
                    <input
                      id="search"
                      type="search"
                      placeholder="Path or URL fragment"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="bo-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={guidesOnly}
                        onChange={(e) => setGuidesOnly(e.target.checked)}
                      />{" "}
                      Guides only
                    </label>
                  </div>
                  {tab === "parity" ? (
                    <>
                      <div className="bo-field">
                        <label htmlFor="compare-locale">Compare locale</label>
                        <select
                          id="compare-locale"
                          value={effectiveCompare}
                          onChange={(e) => setCompareLocale(e.target.value)}
                        >
                          {compareLocaleOptions.map((code) => (
                            <option key={code} value={code}>
                              {localeLabel(code)} ({code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bo-field">
                        <label>
                          <input
                            type="checkbox"
                            checked={missingOnly}
                            onChange={(e) => setMissingOnly(e.target.checked)}
                          />{" "}
                          Missing mirror only
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="bo-field">
                      <label htmlFor="browse-locale">Locale</label>
                      <select
                        id="browse-locale"
                        value={browseLocale}
                        onChange={(e) => setBrowseLocale(e.target.value)}
                      >
                        <option value="all">All locales</option>
                        {localeOptions.map((code) => (
                          <option key={code} value={code}>
                            {localeLabel(code)} ({code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {tab === "metrics" ? (
              <MetricsPanel manifest={manifest} />
            ) : tab === "parity" ? (
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th>Mirror key</th>
                      <th>English (production)</th>
                      <th>
                        {localeLabel(effectiveCompare)} (expected{" "}
                        <span className="bo-mono">/{effectiveCompare}/…</span>)
                      </th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parityRows.map(({ en, other }) => (
                      <tr key={en.file}>
                        <td className="bo-mono">{en.mirrorPathKey === "" ? "(home)" : en.mirrorPathKey}</td>
                        <td>
                          <a
                            className="bo-link"
                            href={absUrl(manifest.baseUrl, en.urlPath)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {en.urlPath}
                          </a>
                          <div className="bo-mono" style={{ marginTop: "0.25rem", opacity: 0.85 }}>
                            {en.file}
                          </div>
                        </td>
                        <td>
                          {other ? (
                            <>
                              <a
                                className="bo-link"
                                href={absUrl(manifest.baseUrl, other.urlPath)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {other.urlPath}
                              </a>
                              <div className="bo-mono" style={{ marginTop: "0.25rem", opacity: 0.85 }}>
                                {other.file}
                              </div>
                            </>
                          ) : (
                            <span className="bo-mono">
                              {absUrl(
                                manifest.baseUrl,
                                `/${effectiveCompare}${en.urlPath === "/" ? "/" : en.urlPath}`,
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          {other ? (
                            <span className="bo-badge bo-badge--ok">Present</span>
                          ) : (
                            <span className="bo-badge bo-badge--miss">Missing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th>Locale</th>
                      <th>URL path</th>
                      <th>Path key</th>
                      <th>File</th>
                      <th>Mirror key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {browseRows.map((p) => (
                      <tr key={p.file}>
                        <td>{localeLabel(p.locale)}</td>
                        <td>
                          <a
                            className="bo-link"
                            href={absUrl(manifest.baseUrl, p.urlPath)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.urlPath}
                          </a>
                        </td>
                        <td className="bo-mono">{p.pathKey || "(home)"}</td>
                        <td className="bo-mono">{p.file}</td>
                        <td className="bo-mono">
                          {p.mirrorPathKey === null
                            ? "n/a"
                            : p.mirrorPathKey === ""
                              ? "(home)"
                              : p.mirrorPathKey}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "metrics" ? null : (
            <p className="bo-footnote">
              Parity uses the same slug under a locale prefix (for example{" "}
              <span className="bo-mono">/guides/…</span> vs{" "}
              <span className="bo-mono">/es/guides/…</span>). Transcreated URLs with different slugs appear as
              missing until you add a mirror path or a future hreflang-based matcher. Legacy trees such as{" "}
              <span className="bo-mono">/hoe-zeg-je/…</span> have no mirror key and only show in Browse all.
            </p>
            )}
          </>
        ) : !loadError ? (
          <p className="bo-meta">Loading manifest…</p>
        ) : null}
      </main>
    </div>
  );
}
