export type HealthResponse = {
  ok: boolean;
  siteDomain: string;
  integrations: {
    ga4: boolean;
    gsc: boolean;
    ahrefs: boolean;
    semrush: boolean;
  };
};

export type GaSummaryResponse =
  | {
      ok: true;
      source: string;
      dateRange: { start: string; end: string };
      totals: { sessions: number; activeUsers: number };
      topPages: { path: string; sessions: number }[];
    }
  | { ok: false; error: string };

export type GscSummaryResponse =
  | {
      ok: true;
      source: string;
      siteUrl: string;
      dateRange: { start: string; end: string };
      totals: { clicks: number; impressions: number };
      topPages: {
        page: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }[];
    }
  | { ok: false; error: string };

export type SeoSummaryResponse = {
  ok: boolean;
  domain: string;
  ahrefs: {
    configured: boolean;
    domainRating?: number;
    ahrefsRank?: number;
    error?: string;
  };
  semrush: {
    configured: boolean;
    rank?: number;
    domainScore?: number;
    organicKeywords?: number;
    organicTraffic?: number;
    raw?: Record<string, string>;
    error?: string;
  };
};
