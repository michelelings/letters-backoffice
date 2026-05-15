import { useEffect, useMemo, useState } from "react";
import { TopNav } from "./TopNav";
import { formatSyncLabel } from "./formatSyncLabel";
import type { CoverageSnapshot } from "./types";

function coverageCellClass(score: number | null): string {
  if (score === null) return "bo-cov__cell bo-cov__cell--miss";
  if (score >= 95) return "bo-cov__cell bo-cov__cell--ok";
  if (score >= 75) return "bo-cov__cell bo-cov__cell--mid";
  return "bo-cov__cell bo-cov__cell--low";
}

function fmtMirror(mk: string): string {
  return mk === "" ? "(home)" : mk;
}

export function CoveragePage() {
  const [snapshot, setSnapshot] = useState<CoverageSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/coverage-snapshot.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as CoverageSnapshot;
        if (!cancelled) {
          setSnapshot(data);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSnapshot(null);
          setLoadError(e instanceof Error ? e.message : "Failed to load coverage snapshot");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!snapshot) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return snapshot.rows;
    return snapshot.rows.filter(
      (r) =>
        r.mirrorPathKey.toLowerCase().includes(q) ||
        r.enUrlPath.toLowerCase().includes(q) ||
        r.enFile.toLowerCase().includes(q),
    );
  }, [snapshot, filter]);

  return (
    <div className="bo-shell">
      <header className="bo-header">
        <div className="bo-header__cluster">
          <TopNav />
          <div className="bo-header__text">
            <h1 className="bo-header__title">Coverage matrix</h1>
            <p className="bo-header__tagline">
              {snapshot ? (
                <>
                  <span className="bo-mono">{snapshot.baseUrl.replace(/^https?:\/\//, "")}</span>
                  <span className="bo-header__dot" aria-hidden>
                    ·
                  </span>
                  <span>
                    {filteredRows.length} of {snapshot.rows.length} rows · {snapshot.locales.length} locales
                  </span>
                </>
              ) : loadError ? (
                "Coverage snapshot unavailable"
              ) : (
                "Loading coverage snapshot…"
              )}
            </p>
          </div>
        </div>
        {snapshot ? (
          <p className="bo-header__sync">
            Last sync{" "}
            <time dateTime={snapshot.generatedAt} title={snapshot.generatedAt}>
              {formatSyncLabel(snapshot.generatedAt)}
            </time>
          </p>
        ) : null}
      </header>

      <main className="bo-main">
        {loadError ? (
          <div className="bo-error" role="alert">
            <strong>Could not load coverage snapshot.</strong> {loadError} Run{" "}
            <span className="bo-mono">npm run manifest</span> from the repo root (includes coverage build), then
            refresh.
          </div>
        ) : null}

        {snapshot ? (
          <>
            <section className="bo-cov__intro">
              <p>
                Each row is an <strong>English</strong> mirror path. Locale columns show a <strong>0–100 score</strong>:
                start at 100, then <strong>−{snapshot.scoring.penalties.field}</strong> per missing{" "}
                <strong>title</strong>, <strong>description</strong>, or <strong>h1</strong> in the locale{" "}
                <span className="bo-mono">page.tsx</span> / HTML (lightweight parse).{" "}
                <strong>−{snapshot.scoring.penalties.stale}</strong> if English was last modified more than{" "}
                <strong>{snapshot.scoring.staleDays}</strong> days after that locale file (stale). A dash (
                <span className="bo-mono">—</span>) means <strong>no mirrored page</strong>. The <strong>Avg</strong>{" "}
                column is the mean across locales (missing mirrors count as <strong>0</strong>).
              </p>
              <p className="bo-cov__legend">
                <span className="bo-cov__swatch bo-cov__swatch--ok" /> ≥ 95 &nbsp;
                <span className="bo-cov__swatch bo-cov__swatch--mid" /> 75–94 &nbsp;
                <span className="bo-cov__swatch bo-cov__swatch--low" /> &lt; 75 &nbsp;
                <span className="bo-cov__swatch bo-cov__swatch--miss" /> Missing
              </p>
              {snapshot.scoring.notes ? <p className="bo-cov__note">{snapshot.scoring.notes}</p> : null}
            </section>

            <div className="bo-toolbar bo-toolbar--cov">
              <div className="bo-field">
                <label htmlFor="cov-filter">Filter path</label>
                <input
                  id="cov-filter"
                  type="search"
                  placeholder="e.g. guides/"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <p className="bo-cov__count">
                Showing <strong>{filteredRows.length}</strong> of {snapshot.rows.length} rows · {snapshot.locales.length}{" "}
                locales
              </p>
            </div>

            <div className="bo-cov__scroll">
              <table className="bo-cov__table">
                <thead>
                  <tr>
                    <th scope="col" className="bo-cov__th-path">
                      English path
                    </th>
                    <th scope="col" className="bo-cov__th-num">
                      Avg
                    </th>
                    {snapshot.locales.map((loc) => (
                      <th key={loc} scope="col" className="bo-cov__th-locale" title={loc}>
                        {loc}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.enFile}>
                      <th scope="row" className="bo-cov__path">
                        <a
                          className="bo-link"
                          href={`${snapshot.baseUrl.replace(/\/$/, "")}${row.enUrlPath === "/" ? "/" : row.enUrlPath}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {fmtMirror(row.mirrorPathKey)}
                        </a>
                        <div className="bo-mono bo-cov__file">{row.enFile}</div>
                      </th>
                      <td className="bo-cov__avg">{row.avg}</td>
                      {snapshot.locales.map((loc) => {
                        const sc = row.scores[loc];
                        return (
                          <td key={loc} className={coverageCellClass(sc)}>
                            {sc === null ? "—" : sc}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : !loadError ? (
          <p className="bo-meta">Loading…</p>
        ) : null}
      </main>
    </div>
  );
}
