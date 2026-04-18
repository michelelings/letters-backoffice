#!/usr/bin/env node
/**
 * Walks the marketing (letters-website) tree for *.html and writes public/pages-manifest.json.
 *
 * Usage:
 *   node scripts/generate-pages-manifest.mjs [SITE_ROOT]
 *
 * SITE_ROOT defaults to, in order:
 *   - argv[2]
 *   - process.env.LETTERS_WEBSITE_ROOT
 *   - ../.. when run from letters-website/backoffice/scripts (monorepo)
 *   - .. when run from standalone repo with sibling ../letters-website (optional)
 *
 * Output always: <this package>/public/pages-manifest.json (script lives in backoffice/scripts).
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const OUT_DIR = join(PACKAGE_ROOT, "public");
const OUT_FILE = join(OUT_DIR, "pages-manifest.json");

const BASE_URL = "https://www.letters.game";

/** First path segment equals locale code (path prefix). Keep in sync with marketing translation.md */
const PREFIX_LOCALES = new Set([
  "nl",
  "de",
  "es",
  "fr",
  "it",
  "pt",
  "pt-BR",
  "cs",
  "da",
  "pl",
  "sv",
  "ja",
  "ko",
  "zh-Hans",
  "hi",
  "ru",
  "vi",
  "id",
]);

const LEGACY_ROOT_TO_LOCALE = {
  "hoe-zeg-je": "nl",
  "wie-sagt-man": "de",
};

const SKIP_TOP_LEVEL = new Set([".git", "node_modules", ".cursor", "backoffice", "dist"]);

function resolveSiteRoot() {
  const fromArg = process.argv[2]?.trim();
  if (fromArg) return resolve(fromArg);

  const fromEnv = process.env.LETTERS_WEBSITE_ROOT?.trim();
  if (fromEnv) return resolve(process.cwd(), fromEnv);

  const monorepoMarketing = resolve(PACKAGE_ROOT, "..");
  if (
    existsSync(join(monorepoMarketing, "styles.css")) &&
    existsSync(join(monorepoMarketing, "index.html"))
  ) {
    return monorepoMarketing;
  }

  const sibling = resolve(PACKAGE_ROOT, "..", "letters-website");
  if (existsSync(join(sibling, "styles.css"))) {
    return sibling;
  }

  const vendor = join(PACKAGE_ROOT, "vendor", "letters-website");
  if (existsSync(join(vendor, "styles.css"))) {
    return vendor;
  }

  console.error(
    "Set LETTERS_WEBSITE_ROOT or pass the marketing site directory as the first argument.\n" +
      "Example: LETTERS_WEBSITE_ROOT=../letters-website npm run manifest\n" +
      "Or add a git submodule at vendor/letters-website pointing at the marketing repo.",
  );
  process.exit(1);
}

function walkHtmlFiles(dir, root, out) {
  const names = readdirSync(dir);
  for (const name of names) {
    const full = join(dir, name);
    if (dir === root && SKIP_TOP_LEVEL.has(name)) continue;

    const st = statSync(full);
    if (st.isDirectory()) {
      walkHtmlFiles(full, root, out);
    } else if (name.endsWith(".html")) {
      out.push(full);
    }
  }
}

function posix(p) {
  return p.split("/").join("/");
}

function fileToPathKey(repoRoot, fileAbs) {
  const rel = posix(relative(repoRoot, fileAbs));
  if (rel === "index.html") return "";
  if (rel === "404.html") return "404.html";
  if (rel.endsWith("/index.html")) {
    return posix(rel.slice(0, -"/index.html".length));
  }
  return posix(rel.replace(/\.html$/i, ""));
}

function pathKeyToUrlPath(pathKey) {
  if (pathKey === "") return "/";
  if (pathKey === "404.html") return "/404.html";
  return `/${pathKey}`;
}

function classify(pathKey) {
  if (pathKey === "" || pathKey === "404.html") {
    return { locale: "en", mirrorPathKey: pathKey === "" ? "" : null };
  }
  const segments = pathKey.split("/").filter(Boolean);
  const first = segments[0];
  if (PREFIX_LOCALES.has(first)) {
    const rest = segments.slice(1).join("/");
    return { locale: first, mirrorPathKey: rest };
  }
  if (LEGACY_ROOT_TO_LOCALE[first]) {
    return { locale: LEGACY_ROOT_TO_LOCALE[first], mirrorPathKey: null };
  }
  return { locale: "en", mirrorPathKey: pathKey };
}

function main() {
  const REPO_ROOT = resolveSiteRoot();
  const files = [];
  walkHtmlFiles(REPO_ROOT, REPO_ROOT, files);

  const pages = files
    .map((fileAbs) => {
      const pathKey = fileToPathKey(REPO_ROOT, fileAbs);
      const { locale, mirrorPathKey } = classify(pathKey);
      const urlPath = pathKeyToUrlPath(pathKey);
      const relFile = posix(relative(REPO_ROOT, fileAbs));
      let mtimeMs = null;
      try {
        mtimeMs = statSync(fileAbs).mtimeMs;
      } catch {
        /* ignore */
      }
      return {
        locale,
        pathKey,
        mirrorPathKey,
        file: relFile,
        urlPath,
        mtimeMs,
      };
    })
    .sort((a, b) => {
      if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
      return a.pathKey.localeCompare(b.pathKey);
    });

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sourceRoot: posix(relative(PACKAGE_ROOT, REPO_ROOT)) || ".",
    prefixLocales: [...PREFIX_LOCALES].sort(),
    legacyRoots: { ...LEGACY_ROOT_TO_LOCALE },
    pages,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.error(
    `Wrote ${pages.length} pages from ${REPO_ROOT} to ${relative(PACKAGE_ROOT, OUT_FILE)}`,
  );
}

main();
