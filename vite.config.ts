import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory that contains the marketing site's styles.css (and index.html).
 * Override with LETTERS_WEBSITE_ROOT (relative to cwd or absolute).
 */
function resolveLettersWebsiteRoot(): string {
  const env = process.env.LETTERS_WEBSITE_ROOT?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  }

  const monorepoParent = path.resolve(__dirname, "..");
  if (
    fs.existsSync(path.join(monorepoParent, "styles.css")) &&
    fs.existsSync(path.join(monorepoParent, "index.html"))
  ) {
    return monorepoParent;
  }

  const vendor = path.join(__dirname, "vendor", "letters-website");
  if (fs.existsSync(path.join(vendor, "styles.css"))) {
    return vendor;
  }

  const sibling = path.resolve(__dirname, "..", "letters-website");
  if (fs.existsSync(path.join(sibling, "styles.css"))) {
    return sibling;
  }

  throw new Error(
    "Cannot find marketing site styles.css. Set LETTERS_WEBSITE_ROOT, clone letters-website to vendor/letters-website (submodule), or keep this app inside the letters-website monorepo.",
  );
}

const lettersWebsiteRoot = resolveLettersWebsiteRoot();

export default defineConfig({
  plugins: [
    react(),
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
      "@letters-site": lettersWebsiteRoot,
    },
  },
});
