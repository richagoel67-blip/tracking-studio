import type { Architecture } from "./tracking-setup-storage";
import {
  mergeAtsTemplateAndNode,
  mergeCareerTemplateAndNode,
  type AtsFlowNodeState,
  type AtsTemplate,
  type CareerFlowNodeState,
  type CareerSiteTemplate,
  type FlowState,
} from "./tracking-setup-storage";
import type { TrackingEvent } from "./tracking-events";

const MULTI_PART_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "co.nz",
  "co.in",
  "com.br",
  "co.jp",
  "com.mx",
  "co.za",
  "co.id",
  "com.sg",
  "com.hk",
  "com.tw",
  "com.ar",
  "com.co",
  "ac.uk",
  "gov.uk",
]);

const DEFAULT_EVENT_ORDER = ["view", "lead", "apply_start", "apply_finish"] as const;

export function slugifyText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripPublicSuffixLabels(labels: string[]): string[] {
  if (labels.length < 2) return labels;
  const lastTwo = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
  if (MULTI_PART_PUBLIC_SUFFIXES.has(lastTwo)) {
    return labels.slice(0, -2);
  }
  return labels.slice(0, -1);
}

/**
 * Derives a short hostname-style label from a career site base URL (pixel).
 * Returns "" if invalid or empty.
 */
export function extractCareerSiteNameFromUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  let urlString = s;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    urlString = `https://${s}`;
  }
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return "";
  }
  let host = u.hostname.toLowerCase();
  if (!host) return "";
  let labels = host.split(".").filter(Boolean);
  if (labels[0] === "www") {
    labels = labels.slice(1);
  }
  if (labels.length === 0) return "";
  labels = stripPublicSuffixLabels(labels);
  if (labels.length === 0) return "";
  return labels.join(".");
}

export function eventIdToSlug(eventId: string): string {
  if (eventId === "view") return "view";
  if (eventId === "lead") return "lead";
  if (eventId === "apply_start") return "apply-start";
  if (eventId === "apply_finish") return "apply-finish";
  return slugifyText(eventId);
}

function customEventSlug(ev: TrackingEvent): string {
  const raw = (ev.label || ev.eventKey || "event").trim();
  return slugifyText(raw.replace(/_/g, " "));
}

function customEventCountsForNaming(ev: TrackingEvent, architecture: Architecture): boolean {
  if (ev.type !== "custom" || !ev.enabled) return false;
  if (architecture === "s2s") {
    return Boolean(ev.label.trim());
  }
  return true;
}

/** Enabled default + custom event slugs in order VIEW, LEAD, APPLY_START, APPLY_FINISH, then customs. */
export function getEnabledEventSlugs(
  events: TrackingEvent[],
  architecture: Architecture,
): string[] {
  const out: string[] = [];
  for (const id of DEFAULT_EVENT_ORDER) {
    const e = events.find((x) => x.id === id && x.type === "default");
    if (e?.enabled) out.push(eventIdToSlug(id));
  }
  const customs = events.filter((e) => customEventCountsForNaming(e, architecture));
  customs.sort((a, b) => a.id.localeCompare(b.id));
  for (const c of customs) {
    const s = customEventSlug(c);
    if (s) out.push(s);
  }
  return out;
}

function buildCareerNodeSegment(
  flow: FlowState,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  architecture: Architecture,
): string | null {
  const nid = flow.careerFlowNodeId;
  if (!nid) return null;
  const node = careerFlowNodesById[nid];
  const tmpl = node ? careerTemplatesById[node.templateId] : undefined;
  if (!node || !tmpl) return null;
  const merged = mergeCareerTemplateAndNode(tmpl, node);
  const nodeSlug =
    slugifyText(merged.name.trim()) || slugifyText(merged.baseUrl.trim()) || "career-site";
  const slugs = getEnabledEventSlugs(merged.events, architecture);
  return slugs.length ? `${nodeSlug}:${slugs.join("+")}` : nodeSlug;
}

function buildAtsNodeSegment(
  atsNodeId: string,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  architecture: Architecture,
): string | null {
  const node = atsFlowNodesById[atsNodeId];
  const tmpl = node ? atsTemplatesById[node.templateId] : undefined;
  if (!node || !tmpl) return null;
  const merged = mergeAtsTemplateAndNode(tmpl, node);
  const nodeSlug = slugifyText(merged.vendor.trim()) || "ats";
  const slugs = getEnabledEventSlugs(merged.events, architecture);
  return slugs.length ? `${nodeSlug}:${slugs.join("+")}` : nodeSlug;
}

export function buildAutoFlowName(
  flow: FlowState,
  flowIndex: number,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  architecture: Architecture,
): string {
  const segments: string[] = [];
  const careerSeg = buildCareerNodeSegment(
    flow,
    careerFlowNodesById,
    careerTemplatesById,
    architecture,
  );
  if (careerSeg) segments.push(careerSeg);
  for (const aid of flow.atsIds) {
    const s = buildAtsNodeSegment(aid, atsFlowNodesById, atsTemplatesById, architecture);
    if (s) segments.push(s);
  }
  if (segments.length === 0) {
    return `Flow ${flowIndex + 1}`;
  }
  return segments.join(" → ");
}

export function applyAutoFlowNamesToFlows(
  flows: FlowState[],
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  architecture: Architecture,
): FlowState[] {
  let changed = false;
  const next = flows.map((flow, idx) => {
    if ((flow.nameMode ?? "auto") === "manual") return flow;
    const auto = buildAutoFlowName(
      flow,
      idx,
      careerFlowNodesById,
      careerTemplatesById,
      atsFlowNodesById,
      atsTemplatesById,
      architecture,
    );
    if (auto === flow.name) return flow;
    changed = true;
    return { ...flow, name: auto };
  });
  return changed ? next : flows;
}

/** When base URL yields a hostname, use it as template name; otherwise restore default label. */
export function careerTemplateNameFromBaseUrl(
  baseUrl: string,
  defaultDisplayName: string,
): string {
  const extracted = extractCareerSiteNameFromUrl(baseUrl);
  if (extracted) return extracted;
  if (!baseUrl.trim()) return defaultDisplayName;
  return defaultDisplayName;
}
