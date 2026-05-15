import { useEffect, useMemo, useState } from "react";
import { marketingRepoBlobUrl } from "./githubLinks";
import type { ComponentInventory, PagesManifest } from "./types";

export function PatternsPanel({ manifest }: { manifest: PagesManifest }) {
  const [inventory, setInventory] = useState<ComponentInventory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/component-inventory.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ComponentInventory;
        if (!cancelled) {
          setInventory(data);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setInventory(null);
          setLoadError(e instanceof Error ? e.message : "Failed to load component inventory");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!inventory?.components.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return inventory.components;
    return inventory.components.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.file.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)),
    );
  }, [inventory, search]);

  const effectiveRepo = manifest.siteRepository ?? inventory?.siteRepository;

  return (
    <div className="bo-patterns">
      <header className="bo-patterns__intro">
        <p>
          Reusable UI from <span className="bo-mono">src/components</span> in{" "}
          <span className="bo-mono">letters-website</span>. Regenerate with{" "}
          <span className="bo-mono">npm run manifest</span> (runs the inventory script). Use these building blocks
          before inventing new markup; match existing guides and article layouts.
        </p>
        {loadError ? (
          <p className="bo-error bo-patterns__warn" role="status">
            <strong>No inventory.</strong> {loadError} Ensure the marketing repo is linked and{" "}
            <span className="bo-mono">public/component-inventory.json</span> exists after build.
          </p>
        ) : null}
      </header>

      <div className="bo-toolbar">
        <div className="bo-field">
          <label htmlFor="pattern-search">Filter</label>
          <input
            id="pattern-search"
            type="search"
            placeholder="Component name or path"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <p className="bo-patterns__count">
          {inventory ? (
            <>
              {rows.length} of {inventory.components.length} components
            </>
          ) : (
            "…"
          )}
        </p>
      </div>

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Category</th>
              <th scope="col">File in repo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const gh = effectiveRepo ? marketingRepoBlobUrl(effectiveRepo, c.file) : null;
              return (
                <tr key={c.file}>
                  <td>
                    <strong>{c.id}</strong>
                  </td>
                  <td className="bo-mono">{c.category ?? "—"}</td>
                  <td>
                    <span className="bo-mono">{c.file}</span>
                    {gh ? (
                      <>
                        {" "}
                        <a className="bo-link" href={gh} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
