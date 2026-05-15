import type { PagesManifest, SiteRepository } from "./types";

export function marketingRepoBlobUrl(repo: SiteRepository, pathInRepo: string): string {
  const encoded = pathInRepo
    .split("/")
    .filter((s) => s.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${encoded}`;
}

export function manifestSourceLink(
  manifest: PagesManifest,
  pathInRepo: string,
): string | null {
  if (!manifest.siteRepository) return null;
  return marketingRepoBlobUrl(manifest.siteRepository, pathInRepo);
}
