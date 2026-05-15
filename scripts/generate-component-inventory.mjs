#!/usr/bin/env node
/**
 * Lists reusable UI under src/components in letters-website → public/component-inventory.json.
 * Uses the same SITE_ROOT resolution as generate-pages-manifest.mjs.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const OUT_DIR = join(PACKAGE_ROOT, "public");
const OUT_FILE = join(OUT_DIR, "component-inventory.json");

const SITE_REPOSITORY = Object.freeze({
  owner: "michelelings",
  name: "letters-website",
  defaultBranch: "main",
});

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
    "Set LETTERS_WEBSITE_ROOT or pass the marketing site path. " +
      "Could not find src/components (or marketing root) in default locations.",
  );
  process.exit(1);
}

function posix(p) {
  return p.split("/").join("/");
}

function walkTsxFiles(dir, root, out) {
  const names = readdirSync(dir);
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsxFiles(full, root, out);
    } else if (/\.(tsx|jsx)$/.test(name) && !/\.(test|spec|stories)\.(tsx|jsx)$/.test(name)) {
      out.push(full);
    }
  }
}

function main() {
  const REPO_ROOT = resolveSiteRoot();
  const componentsDir = join(REPO_ROOT, "src", "components");

  const components = [];
  if (existsSync(componentsDir)) {
    const files = [];
    walkTsxFiles(componentsDir, componentsDir, files);
    for (const fileAbs of files.sort((a, b) => a.localeCompare(b))) {
      const rel = posix(relative(REPO_ROOT, fileAbs));
      const relUnder = posix(relative(componentsDir, fileAbs));
      const parts = relUnder.split("/").filter(Boolean);
      const fileName = parts[parts.length - 1].replace(/\.(tsx|jsx)$/, "");
      const category =
        parts.length > 1 ? posix(parts.slice(0, -1).join("/")) || null : null;
      components.push({
        id: fileName,
        file: rel,
        category,
      });
    }
  }

  const doc = {
    generatedAt: new Date().toISOString(),
    sourceRoot: posix(relative(PACKAGE_ROOT, REPO_ROOT)) || ".",
    siteRepository: SITE_REPOSITORY,
    components,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.error(
    `Wrote ${components.length} components from ${REPO_ROOT} to ${relative(PACKAGE_ROOT, OUT_FILE)}`,
  );
}

main();
