export type PageRow = {
  locale: string;
  pathKey: string;
  mirrorPathKey: string | null;
  file: string;
  urlPath: string;
  mtimeMs: number | null;
};

export type PagesManifest = {
  generatedAt: string;
  baseUrl: string;
  prefixLocales: string[];
  legacyRoots: Record<string, string>;
  pages: PageRow[];
};
