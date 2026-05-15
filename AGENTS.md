# Agents: Letters backoffice

Internal staff UI for **route inventory**, **locale coverage**, **reusable components**, and optional **GA / GSC / vendor SEO** signals. English routes are canonical; other locales mirror by `mirrorPathKey` where applicable.

## Where the data comes from

| Surface | Source | Freshness |
| --- | --- | --- |
| Browse, parity, **Coverage matrix**, Patterns | Generated at **build** from a clone of [`letters-website`](https://github.com/michelelings/letters-website) (`npm run manifest`). JSON: `pages-manifest.json`, `component-inventory.json`, `coverage-snapshot.json`. | **As of last Vercel production deploy** of this repo. Check `generatedAt` in those files (or the built assets) if unsure. |
| **Metrics** (GA4, GSC, Ahrefs, Semrush summaries) | Vercel serverless `/api/*` + env vars (see `.env.example`). | **Live** when APIs and credentials are configured on Vercel. |
| **Opportunities queue** | `public/opportunities.json` in this repo. | **After merge to `main`** and redeploy. |

Treat **inventory and coverage as deploy-time snapshots**, not real-time. After large changes to the marketing site, ensure this app **redeploys** (see README: deploy hooks).

## Workflow conventions

1. **New English content first** in `letters-website`, then mirror locales using **Parity** / **Coverage** to see gaps.
2. **Reuse patterns** from the **Patterns** tab (`src/components` inventory) before inventing new UI.
3. **Queue GSC/GA-led work** in `opportunities.json` (path + locale + source + hint); merge to `main` so production shows the queue.
4. **`/coverage`** scores are heuristic (title/description/h1 parse, staleness vs English). Use as a **prioritization signal**, not a legal guarantee.

## Enabling “live” analytics on Vercel

Set environment variables from `.env.example` on the Vercel project (Production), redeploy, then confirm **Metrics** cards and joined cells populate. Missing vars keep API integrations off or partial.

## Making data stay current

- **On every `letters-website` merge:** trigger a redeploy of **this** project (deploy hook + workflow in `letters-website`; see README).
- **Optional:** nightly hook in **this** repo rebuilds from latest `letters-website` `main` without a marketing push.
