/** Pixel tracking: derive a stable tracking pattern from an exact page URL. */

export type DerivedTrackingPattern = {
  /** URL parses to a usable page path (not domain-only). */
  valid: boolean;
  /** Alias of `valid` for existing call sites. */
  isValid: boolean;
  /** Set when `valid` is false (e.g. parse failure). */
  error: string | null;
  /** Hostname only. */
  domain: string;
  host: string;
  /** Path with dynamic segments replaced by `*`. */
  stablePath: string;
  /** Literal path segments, each prefixed with `/` (e.g. `/careers`). */
  staticSegments: string[];
  /** Dynamic path segments removed from the stable pattern, each prefixed with `/`. */
  ignoredDynamicSegments: string[];
  /** Query parameter names present on the URL (e.g. `utm_source`). */
  ignoredQueryParams: string[];
  /** Human-readable ignore list (legacy / summary). */
  ignored: string[];
  /** `host` + masked path (e.g. `company.example/careers/job/*`). */
  generatedPattern: string;
  /** Same as `generatedPattern`. */
  finalPattern: string;
  isTooBroad: boolean;
  isDomainOnly: boolean;
};

const UUID_WITH_HYPHENS =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_COMPACT = /^[0-9a-f]{32}$/i;

function isLikelyDynamicSegment(seg: string): boolean {
  if (!seg || seg === "." || seg === "..") return false;
  if (/^\d+$/.test(seg)) return true;
  if (UUID_WITH_HYPHENS.test(seg) || UUID_COMPACT.test(seg)) return true;
  if (/^[0-9a-f]{16,}$/i.test(seg)) return true;
  if (seg.length >= 10 && /^[a-z0-9]+$/i.test(seg) && /[0-9]/.test(seg) && /[a-z]/i.test(seg)) {
    return true;
  }
  if (seg.length >= 8 && /^[a-z0-9_-]+$/i.test(seg) && /[0-9]/.test(seg) && /[a-z]/i.test(seg)) {
    const letters = seg.replace(/[^a-z]/gi, "").length;
    const digits = seg.replace(/\D/g, "").length;
    if (digits >= 3 && letters >= 2) return true;
  }
  return false;
}

function splitPathname(pathname: string): string[] {
  const p = pathname.replace(/\/+/g, "/");
  return p.split("/").filter(Boolean);
}

function hasQueryOrHash(input: string): { query: boolean; hash: boolean } {
  try {
    const u = new URL(input.trim());
    return { query: u.search.length > 1, hash: u.hash.length > 1 };
  } catch {
    return { query: input.includes("?"), hash: input.includes("#") };
  }
}

function tryParseAbsoluteUrl(raw: string, resolveBaseUrl?: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(t);
  } catch {
    /* fall through */
  }
  const base = resolveBaseUrl?.trim();
  if (t.startsWith("/") && base) {
    try {
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      return new URL(t, normalizedBase);
    } catch {
      return null;
    }
  }
  if (!/^[a-z][a-z\d+\-.]*:/i.test(t)) {
    const candidate = t.startsWith("//") ? `https:${t}` : `https://${t}`;
    try {
      return new URL(candidate);
    } catch {
      return null;
    }
  }
  return null;
}

function emptyDerived(): DerivedTrackingPattern {
  return {
    valid: false,
    isValid: false,
    error: null,
    domain: "",
    host: "",
    stablePath: "",
    staticSegments: [],
    ignoredDynamicSegments: [],
    ignoredQueryParams: [],
    ignored: [],
    generatedPattern: "",
    finalPattern: "",
    isTooBroad: false,
    isDomainOnly: false,
  };
}

/**
 * Parse `inputUrl`, strip query/hash for the pattern, classify path segments, and list query keys.
 * Optional `resolveBaseUrl` resolves relative paths against career/ATS base URL.
 */
export function deriveTrackingPattern(
  inputUrl: string,
  resolveBaseUrl?: string,
): DerivedTrackingPattern {
  const trimmed = inputUrl.trim();
  if (!trimmed) return emptyDerived();

  const parsed = tryParseAbsoluteUrl(trimmed, resolveBaseUrl);
  if (!parsed) {
    return {
      ...emptyDerived(),
      error: "Enter a valid URL.",
    };
  }

  const domain = parsed.hostname;
  if (!domain) {
    return { ...emptyDerived(), error: "Enter a valid URL." };
  }

  const { query, hash } = hasQueryOrHash(trimmed);
  const segments = splitPathname(parsed.pathname);
  const isDomainOnly = segments.length === 0;

  const ignoredQueryParams =
    parsed.search.length > 1 ? Array.from(new URLSearchParams(parsed.search).keys()) : [];

  const staticSegments: string[] = [];
  const ignoredDynamicSegments: string[] = [];
  const masked = segments.map((seg) => {
    if (isLikelyDynamicSegment(seg)) {
      ignoredDynamicSegments.push(`/${seg}`);
      return "*";
    }
    staticSegments.push(`/${seg}`);
    return seg;
  });

  const ignored: string[] = [];
  if (query) ignored.push("Query string and tracking parameters");
  if (hash) ignored.push("Hash fragment");
  if (ignoredDynamicSegments.length) ignored.push("Dynamic path IDs");

  const stablePath = masked.length ? `/${masked.join("/")}` : "/";
  const generatedPattern = segments.length === 0 ? domain : `${domain}${stablePath}`;

  const literalCount = masked.filter((s) => s !== "*").length;
  const hadSegments = segments.length > 0;
  const isTooBroad = hadSegments && literalCount === 0;

  const valid = !isDomainOnly;
  let error: string | null = null;
  if (isDomainOnly) {
    error = "Add the full event page URL, not just the domain.";
  }

  return {
    valid,
    isValid: valid,
    error,
    domain,
    host: domain,
    stablePath,
    staticSegments,
    ignoredDynamicSegments,
    ignoredQueryParams,
    ignored,
    generatedPattern,
    finalPattern: generatedPattern,
    isTooBroad,
    isDomainOnly,
  };
}
