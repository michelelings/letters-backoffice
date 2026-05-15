#!/usr/bin/env node
/**
 * Builds public/pages-manifest.json from the marketing (letters-website) repo:
 * - Static export: walks *.html (legacy)
 * - Next.js App Router: walks page.tsx files under src/app (recursive) when no HTML pages are found
 *
 * Usage:
 *   node scripts/generate-pages-manifest.mjs [SITE_ROOT]
 *
 * SITE_ROOT defaults to env LETTERS_WEBSITE_ROOT or usual sibling/vendor paths.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const OUT_DIR = join(PACKAGE_ROOT, "public");
const OUT_FILE = join(OUT_DIR, "pages-manifest.json");

const BASE_URL = "https://www.letters.game";

const SITE_REPOSITORY = Object.freeze({
  owner: "michelelings",
  name: "letters-website",
  defaultBranch: "main",
});

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

function isMarketingSiteRoot(dir) {
  const nextApp = existsSync(join(dir, "src", "app"));
  const staticSite =
    existsSync(join(dir, "styles.css")) && existsSync(join(dir, "index.html"));
  return nextApp || staticSite;
}

function resolveSiteRoot() {
  const fromArg = process.argv[2]?.trim();
  if (fromArg) return resolve(fromArg);

  const fromEnv = process.env.LETTERS_WEBSITE_ROOT?.trim();
  if (fromEnv) return resolve(process.cwd(), fromEnv);

  const monorepoMarketing = resolve(PACKAGE_ROOT, "..");
  if (isMarketingSiteRoot(monorepoMarketing)) {
    return monorepoMarketing;
  }

  const vendor = join(PACKAGE_ROOT, "vendor", "letters-website");
  if (isMarketingSiteRoot(vendor)) {
    return vendor;
  }

  const sibling = resolve(PACKAGE_ROOT, "..", "letters-website");
  if (isMarketingSiteRoot(sibling)) {
    return sibling;
  }

  console.error(
    "Set LETTERS_WEBSITE_ROOT or pass the marketing site directory as the first argument.\n" +
      "Expected a Next.js tree with src/app or a static tree with index.html + styles.css.\n" +
      "Example: LETTERS_WEBSITE_ROOT=../letters-website npm run manifest\n" +
      "Or: git submodule at vendor/letters-website",
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

/** App Router: src/app/(group)/foo/page.tsx -> path key "foo" (groups stripped). */
function nextPageFileToPathKey(appRoot, fileAbs) {
  const rel = posix(relative(appRoot, fileAbs));
  const dir = dirname(rel);
  if (dir === ".") return "";
  const segments = dir.split("/").filter(Boolean);
  const urlSegs = segments.filter((s) => !/^\([^)]+\)$/.test(s));
  return urlSegs.join("/");
}

function walkNextPageFiles(appDir, out) {
  const names = readdirSync(appDir);
  for (const name of names) {
    const full = join(appDir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkNextPageFiles(full, out);
    } else if (name === "page.tsx" || name === "page.jsx" || name === "page.mdx") {
      out.push(full);
    }
  }
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
  const htmlFiles = [];
  walkHtmlFiles(REPO_ROOT, REPO_ROOT, htmlFiles);

  let pages = [];
  /** @type {"html" | "next-app"} */
  let manifestSource = "html";

  if (htmlFiles.length > 0) {
    pages = htmlFiles.map((fileAbs) => {
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
    });
  } else {
    const appRoot = join(REPO_ROOT, "src", "app");
    if (!existsSync(appRoot)) {
      console.error("No HTML pages and no src/app — cannot build manifest.");
      process.exit(1);
    }
    manifestSource = "next-app";
    const pageFiles = [];
    walkNextPageFiles(appRoot, pageFiles);

    pages = pageFiles.map((fileAbs) => {
      const pathKey = nextPageFileToPathKey(appRoot, fileAbs);
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
    });
  }

  pages.sort((a, b) => {
    if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
    return a.pathKey.localeCompare(b.pathKey);
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sourceRoot: posix(relative(PACKAGE_ROOT, REPO_ROOT)) || ".",
    siteRepository: SITE_REPOSITORY,
    manifestSource,
    prefixLocales: [...PREFIX_LOCALES].sort(),
    legacyRoots: { ...LEGACY_ROOT_TO_LOCALE },
    pages,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.error(
    `Wrote ${pages.length} pages (${manifestSource}) from ${REPO_ROOT} to ${relative(PACKAGE_ROOT, OUT_FILE)}`,
  );
}

main();
