#!/usr/bin/env node
/**
 * Builds public/coverage-snapshot.json: English mirror row × locale columns with 0–100 scores.
 * Scoring: 100 − 20 per missing title / description / h1 in locale file, −25 if English is materially newer (stale).
 * Missing mirrors: null (shown as —); they count as 0 in row averages.
 *
 * Requires public/pages-manifest.json (run after generate-pages-manifest).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const MANIFEST_FILE = join(PACKAGE_ROOT, "public", "pages-manifest.json");
const OUT_FILE = join(PACKAGE_ROOT, "public", "coverage-snapshot.json");

/** English newer than locale by this many ms ⇒ stale penalty */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const PEN = { field: 20, stale: 25 };

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function firstQuotedAfterKey(src, key) {
  const re = new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m");
  const m = src.match(re);
  return m ? m[1].replace(/\\"/g, '"').trim() : "";
}

function extractTsxMeta(src) {
  const title = firstQuotedAfterKey(src, "title");
  let description = firstQuotedAfterKey(src, "description");
  if (!description) {
    const idx = src.indexOf("articleJsonLd");
    if (idx >= 0) {
      description = firstQuotedAfterKey(src.slice(idx), "description");
    }
  }
  let h1 = "";
  const h1m = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1m) {
    h1 = h1m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!h1) {
    const hm = src.match(/headline:\s*"((?:[^"\\]|\\.)*)"/);
    h1 = hm ? hm[1].replace(/\\"/g, '"').trim() : "";
  }
  return { title, description, h1 };
}

function extractHtmlMeta(src) {
  const titleM = src.match(/<title[^>]*>([^<]*)</i);
  const title = titleM ? titleM[1].trim() : "";
  const descM = src.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const description = descM ? descM[1].trim() : "";
  const h1M = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1M
    ? h1M[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";
  return { title, description, h1 };
}

function extractMeta(absPath, fileRel) {
  const src = readFileSync(absPath, "utf8");
  if (/\.(tsx|jsx|mdx)$/i.test(fileRel)) {
    return extractTsxMeta(src);
  }
  return extractHtmlMeta(src);
}

function isStale(enMtime, locMtime) {
  if (enMtime == null || locMtime == null) return false;
  return enMtime > locMtime + STALE_MS;
}

function scoreLocale(enPage, locPage, repoRoot) {
  if (!locPage) return null;
  const p = join(repoRoot, locPage.file);
  if (!existsSync(p)) return null;
  const meta = extractMeta(p, locPage.file);
  let s = 100;
  if (!meta.title) s -= PEN.field;
  if (!meta.description) s -= PEN.field;
  if (!meta.h1) s -= PEN.field;
  if (isStale(enPage.mtimeMs, locPage.mtimeMs)) s -= PEN.stale;
  return Math.max(0, Math.min(100, s));
}

function main() {
  if (!existsSync(MANIFEST_FILE)) {
    console.error(`Missing ${MANIFEST_FILE}. Run npm run manifest first.`);
    process.exit(1);
  }

  const manifest = readJson(MANIFEST_FILE);
  const repoRoot = resolve(PACKAGE_ROOT, manifest.sourceRoot || ".");
  const locales = manifest.prefixLocales || [];

  const byMirror = new Map();
  for (const p of manifest.pages) {
    if (p.mirrorPathKey === null) continue;
    byMirror.set(`${p.locale}:${p.mirrorPathKey}`, p);
  }

  const enRows = manifest.pages.filter((p) => p.locale === "en" && p.mirrorPathKey !== null);
  enRows.sort((a, b) => {
    const ka = a.mirrorPathKey === "" ? "\u0000" : a.mirrorPathKey;
    const kb = b.mirrorPathKey === "" ? "\u0000" : b.mirrorPathKey;
    return ka.localeCompare(kb);
  });

  const rows = [];
  for (const en of enRows) {
    const key = en.mirrorPathKey;
    const scores = {};
    const numeric = [];
    for (const loc of locales) {
      const other = byMirror.get(`${loc}:${key}`) ?? null;
      const sc = scoreLocale(en, other, repoRoot);
      scores[loc] = sc;
      numeric.push(sc == null ? 0 : sc);
    }
    const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;
    rows.push({
      mirrorPathKey: key === "" ? "" : key,
      enUrlPath: en.urlPath,
      enFile: en.file,
      avg: Math.round(avg * 10) / 10,
      scores,
    });
  }

  const doc = {
    generatedAt: new Date().toISOString(),
    baseUrl: manifest.baseUrl,
    siteRepository: manifest.siteRepository ?? null,
    sourceRoot: manifest.sourceRoot,
    locales,
    scoring: {
      staleDays: STALE_MS / (24 * 60 * 60 * 1000),
      penalties: { field: PEN.field, stale: PEN.stale },
      notes:
        "Per locale page file: −20 if title, description, or h1 is empty/missing after a lightweight parse. −25 if English mtime is more than 7 days newer (stale). Regex-based extraction may miss unusual patterns.",
    },
    rows,
  };

  mkdirSync(join(PACKAGE_ROOT, "public"), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.error(`Wrote ${rows.length} coverage rows to public/coverage-snapshot.json`);
}

main();
