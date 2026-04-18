# Letters backoffice

[![Repo](https://img.shields.io/badge/GitHub-michelelings%2Fletters--backoffice-111?style=flat&logo=github)](https://github.com/michelelings/letters-backoffice)
[![Made with Cursor](https://img.shields.io/badge/Made%20with-Cursor-141EF5?style=flat&logo=cursor&logoColor=white)](https://cursor.com)

React + Vite staff UI for page inventory, locale parity, and (optional) GA4, GSC, Ahrefs, and Semrush summaries via Vercel serverless routes.

**This repository** is the app root (not the `backoffice/` subfolder of [letters-website](https://github.com/michelelings/letters-website)).

**Clone for Cursor:** use this repo as the project root, not the marketing monorepo:

```bash
git clone https://github.com/michelelings/letters-backoffice.git
cd letters-backoffice
```

Then open the `letters-backoffice` folder in Cursor (**File → Open Folder…**) and link the marketing site as described below.

The marketing site stays a **separate repository** (static HTML at [letters-website](https://github.com/michelelings/letters-website)). This app only **reads** that tree to build `public/pages-manifest.json` and imports its [`styles.css`](https://github.com/michelelings/letters-website/blob/main/styles.css) for visual parity.

## Own GitHub repo and Cursor project

### 1. Export `backoffice/` history from the monorepo

From a clone of `letters-website`:

```bash
cd /path/to/letters-website
git subtree split --prefix=backoffice -b backoffice-export
```

Create the new empty repository on GitHub (for example `letters-backoffice`), then:

```bash
mkdir /path/to/letters-backoffice && cd /path/to/letters-backoffice
git init
git pull /path/to/letters-website backoffice-export
git remote add origin git@github.com:YOUR_ORG/letters-backoffice.git
git branch -M main
git push -u origin main
```

### 2. Open in Cursor

**File → Open Folder…** and choose `/path/to/letters-backoffice` (the new repo root). Do not open the marketing monorepo root if you only work on the backoffice.

### 3. Link the marketing site for local dev

Pick one:

- **Submodule** (good default):

  ```bash
  git submodule add https://github.com/michelelings/letters-website.git vendor/letters-website
  git submodule update --init --recursive
  ```

  Then `npm install` and `npm run dev` resolve `vendor/letters-website/styles.css` and the manifest automatically.

- **Sibling clone**: clone `letters-website` next to this repo as `../letters-website`. The manifest and Vite config look for `../letters-website/styles.css`.

- **Env var**: point at any checkout:

  ```bash
  export LETTERS_WEBSITE_ROOT=/absolute/path/to/letters-website
  npm run dev
  ```

## Vercel (standalone repo)

- **Root Directory**: `.` (repository root of this project).
- **Install Command**: `npm ci` (or `npm install`).
- **Build Command**: the repo includes [`vercel.json`](vercel.json), which clones the public marketing site into `.letters-site` and runs `npm run build` with `LETTERS_WEBSITE_ROOT` set. Override in the Vercel dashboard only if you need a different flow.
- For a **private** marketing repo, replace the clone URL with an authenticated URL or tokenized clone, or set `LETTERS_WEBSITE_ROOT` after fetching the site another way.
- **Output directory**: `dist` (also set in `vercel.json`).

After you move this app to its own repo, **remove the `backoffice/` folder** from the marketing monorepo in a follow-up commit so only one copy exists.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run manifest` | Regenerate `public/pages-manifest.json` from the marketing HTML tree. |
| `npm run dev` | Manifest + Vite dev server (`/api/*` needs `npx vercel dev` or deploy). |
| `npm run build` | Manifest + production client bundle. |

Environment variables for APIs are documented in [`.env.example`](.env.example).
