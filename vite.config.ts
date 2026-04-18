import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      "@site": path.resolve(__dirname, ".."),
    },
  },
});
