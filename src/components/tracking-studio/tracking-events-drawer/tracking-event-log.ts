export type EventStatus = "received" | "warning" | "failed";

export type TrackingMethod = "JS Pixel" | "Image Pixel" | "S2S";

/** How the visitor was resolved for attribution (shown beside jtrack in the activity list). */
export type IdentityResolution = "cookie" | "fingerprint" | "unattributed";

/**
 * Single tracking event row. `recordedAt` is ISO 8601 for sorting (newest first);
 * `time` is the display clock value (e.g. 10:42:18).
 */
export type TrackingEventLog = {
  id: string;
  flowName: string;
  /**
   * Career site → ATS path from client setup (e.g. "Career site 1 → Workday").
   * Shown in the activity card header after the flow label.
   */
  flowRoute?: string;
  time: string;
  recordedAt: string;
  event: string;
  jobId: string;
  /** Correlation id; empty or the literal `missing` renders as jtrack missing. */
  jtrack: string;
  /** Cookie vs fingerprint vs unattributed (not traffic source). */
  identityResolution?: IdentityResolution;
  method: TrackingMethod;
  pageUrl?: string;
  endpointUrl?: string;
  status: EventStatus;
};

/** Subtitle after "{flowName} :" — uses `flowRoute` from setup when present. */
export function formatFlowRouteSubtitle(ev: TrackingEventLog): string {
  const r = ev.flowRoute?.trim();
  if (r) return r;
  const m = /^Flow\s+(\d+)$/i.exec(ev.flowName.trim());
  if (m) return `Career site ${m[1]}`;
  return ev.flowName;
}

export function isJtrackMissing(jtrack: string | undefined): boolean {
  const t = (jtrack ?? "").trim().toLowerCase();
  return t === "" || t === "missing";
}

export function formatIdentityResolutionLabel(r: IdentityResolution): string {
  if (r === "unattributed") return "Unattributed";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export function eventNameBadgeClass(event: string): string {
  const e = event.trim().toUpperCase();
  if (e === "VIEW") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (e === "LEAD") {
    return "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]";
  }
  if (e === "APPLY_START") {
    return "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]";
  }
  if (e === "APPLY_FINISH") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}
