import { manifestSourceLink } from "./githubLinks";
import type { PagesManifest } from "./types";

export function SourceLinks({
  manifest,
  repoRelPath,
}: {
  manifest: PagesManifest;
  repoRelPath: string;
}) {
  const gh = manifestSourceLink(manifest, repoRelPath);
  return (
    <div className="bo-source-links">
      <span className="bo-mono bo-source-links__path">{repoRelPath}</span>
      {gh ? (
        <a className="bo-link bo-source-links__gh" href={gh} target="_blank" rel="noreferrer">
          GitHub
        </a>
      ) : null}
    </div>
  );
}
