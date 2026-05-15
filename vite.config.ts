import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import historyApiFallback from "connect-history-api-fallback";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Marketing repo root (Next.js with src/app, or static index.html + styles.css).
 * Override with LETTERS_WEBSITE_ROOT (relative to cwd or absolute).
 */
function isMarketingSiteRoot(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "src", "app")) ||
    (fs.existsSync(path.join(dir, "styles.css")) && fs.existsSync(path.join(dir, "index.html")))
  );
}

function resolveLettersWebsiteRoot(): string {
  const env = process.env.LETTERS_WEBSITE_ROOT?.trim();
  if (env) {
    const r = path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
    if (!isMarketingSiteRoot(r)) {
      throw new Error(`LETTERS_WEBSITE_ROOT=${r} does not look like letters-website (src/app or static site).`);
    }
    return r;
  }

  const monorepoParent = path.resolve(__dirname, "..");
  if (isMarketingSiteRoot(monorepoParent)) {
    return monorepoParent;
  }

  const vendor = path.join(__dirname, "vendor", "letters-website");
  if (isMarketingSiteRoot(vendor)) {
    return vendor;
  }

  const sibling = path.resolve(__dirname, "..", "letters-website");
  if (isMarketingSiteRoot(sibling)) {
    return sibling;
  }

  throw new Error(
    "Cannot find letters-website. Clone to vendor/letters-website, use a sibling ../letters-website, set LETTERS_WEBSITE_ROOT, or work inside the marketing monorepo.",
  );
}

/** Backoffice imports `@letters-site/styles.css`. Static sites use root styles.css; Next uses a local token shim (globals.css depends on Tailwind). */
function resolveMarketingStylesEntry(root: string): string {
  const legacy = path.join(root, "styles.css");
  if (fs.existsSync(legacy)) {
    return legacy;
  }
  const nextGlobal = path.join(root, "src", "app", "globals.css");
  if (fs.existsSync(nextGlobal)) {
    return path.join(__dirname, "src", "letters-site-theme.css");
  }
  throw new Error(`No styles.css or src/app/globals.css under ${root}.`);
}

const lettersWebsiteRoot = resolveLettersWebsiteRoot();
const lettersStylesEntry = resolveMarketingStylesEntry(lettersWebsiteRoot);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "spa-history-fallback",
      configureServer(server) {
        server.middlewares.use(
          historyApiFallback({
            disableDotRule: true,
            verbose: false,
            }) as any,
        );
      },
    },
    {
      name: "letters-inject-vercel-git-sha",
      transformIndexHtml(html) {
        const sha = process.env.VERCEL_GIT_COMMIT_SHA || "";
        const comment = sha
          ? `\n    <!-- vercel-git: ${sha} -->\n  `
          : "\n    <!-- vercel-git: (local build) -->\n  ";
        return html.replace("</head>", `${comment}</head>`);
      },
    },
  ],
  resolve: {
    alias: {
      "@letters-site/styles.css": lettersStylesEntry,
      "@letters-site": lettersWebsiteRoot,
    },
  },
});
