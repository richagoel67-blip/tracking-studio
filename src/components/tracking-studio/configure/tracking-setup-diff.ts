import type { Architecture, SetupSnapshot } from "./tracking-setup-storage";
import {
  nameToEventKey,
  type AtsState,
  type CareerSiteState,
  type TrackingEvent,
} from "./tracking-events";

const DEFAULT_EVENT_IDS = ["view", "lead", "apply_start", "apply_finish"] as const;

function diffDefaultEvents(
  beforeEv: TrackingEvent[],
  afterEv: TrackingEvent[],
  nodeLabel: string,
): string[] {
  const lines: string[] = [];
  const get = (events: TrackingEvent[], id: string) => events.find((e) => e.id === id);
  for (const id of DEFAULT_EVENT_IDS) {
    const b = get(beforeEv, id);
    const a = get(afterEv, id);
    if (!b || !a) continue;
    const key = a.eventKey;
    if (!b.enabled && a.enabled) lines.push(`Added ${key} event (${nodeLabel})`);
    if (b.enabled && !a.enabled) lines.push(`Removed ${key} event (${nodeLabel})`);
  }
  return lines;
}

function diffCustomEvents(beforeEv: TrackingEvent[], afterEv: TrackingEvent[], nodeLabel: string) {
  const lines: string[] = [];
  const beforeCustom = beforeEv.filter((e) => e.type === "custom");
  const afterCustom = afterEv.filter((e) => e.type === "custom");
  const afterById = new Map(afterCustom.map((e) => [e.id, e]));
  const beforeById = new Map(beforeCustom.map((e) => [e.id, e]));
  for (const a of afterCustom) {
    const b = beforeById.get(a.id);
    if (!b) lines.push(`Added custom event (${nameToEventKey(a.label)}) (${nodeLabel})`);
    else if (b.label !== a.label && (b.label.trim() || a.label.trim()))
      lines.push(`Renamed custom event (${nodeLabel})`);
  }
  for (const b of beforeCustom) {
    if (!afterById.has(b.id))
      lines.push(`Removed custom event (${nameToEventKey(b.label)}) (${nodeLabel})`);
  }
  return lines;
}

function diffCareerS2s(b: CareerSiteState, a: CareerSiteState, id: string): string[] {
  const label = a.name || id;
  const lines: string[] = [];
  if ((b.s2sEndpointUrl ?? "") !== (a.s2sEndpointUrl ?? "")) {
    lines.push(`Changed endpoint URL (${label})`);
  }
  lines.push(...diffDefaultEvents(b.events, a.events, label));
  lines.push(...diffCustomEvents(b.events, a.events, label));
  return lines;
}

function diffAtsS2s(b: AtsState, a: AtsState): string[] {
  const label = a.vendor;
  const lines: string[] = [];
  if (b.s2sEventSource !== a.s2sEventSource) {
    lines.push(`Changed event source (${label})`);
  }
  if (b.endpointUrl !== a.endpointUrl) {
    lines.push(`Changed endpoint URL (${label})`);
  }
  lines.push(...diffDefaultEvents(b.events, a.events, label));
  lines.push(...diffCustomEvents(b.events, a.events, label));
  return lines;
}

/** Readable change lines for live edit review (best-effort). */
export function buildSetupDiffLines(
  before: SetupSnapshot,
  after: SetupSnapshot,
  architecture: Architecture = before.architecture,
): string[] {
  if (architecture === "pixel") {
    return buildPixelSetupDiffLines(before, after);
  }
  return buildS2sSetupDiffLines(before, after);
}

function buildPixelSetupDiffLines(before: SetupSnapshot, after: SetupSnapshot): string[] {
  const lines: string[] = [];
  const beforeFlow = new Map(before.flows.map((f) => [f.id, f]));
  const afterFlow = new Map(after.flows.map((f) => [f.id, f]));

  for (const [id, f] of afterFlow) {
    const prev = beforeFlow.get(id);
    if (!prev) lines.push(`Added flow: ${f.name}`);
    else if (prev.name !== f.name) lines.push(`Renamed flow: "${prev.name}" → "${f.name}"`);
  }
  for (const [id, f] of beforeFlow) {
    if (!afterFlow.has(id)) lines.push(`Removed flow: ${f.name}`);
  }

  const careerIds = new Set([
    ...Object.keys(before.careerSiteById),
    ...Object.keys(after.careerSiteById),
  ]);
  for (const cid of careerIds) {
    const b = before.careerSiteById[cid];
    const a = after.careerSiteById[cid];
    if (a && !b) lines.push(`Added career site catalog: ${a.name || cid}`);
    if (b && !a) lines.push(`Removed career site catalog: ${b.name || cid}`);
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) {
      if (b.baseUrl !== a.baseUrl) lines.push(`Changed career site URL (${a.name || cid})`);
      if (JSON.stringify(b.events) !== JSON.stringify(a.events))
        lines.push(`Changed career site events (${a.name || cid})`);
    }
  }

  const atsIds = new Set([...Object.keys(before.atsById), ...Object.keys(after.atsById)]);
  for (const aid of atsIds) {
    const b = before.atsById[aid];
    const a = after.atsById[aid];
    if (a && !b) lines.push(`Added ATS: ${a.vendor}`);
    if (b && !a) lines.push(`Removed ATS: ${b.vendor}`);
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) {
      if (b.endpointUrl !== a.endpointUrl) lines.push(`Changed ATS endpoint (${a.vendor})`);
      if (JSON.stringify(b.events) !== JSON.stringify(a.events))
        lines.push(`Changed ATS events (${a.vendor})`);
    }
  }

  return lines.length ? lines : ["No structural changes detected."];
}

function buildS2sSetupDiffLines(before: SetupSnapshot, after: SetupSnapshot): string[] {
  const lines: string[] = [];
  const beforeFlow = new Map(before.flows.map((f) => [f.id, f]));
  const afterFlow = new Map(after.flows.map((f) => [f.id, f]));

  for (const [id, f] of afterFlow) {
    const prev = beforeFlow.get(id);
    if (!prev) lines.push(`Added flow: ${f.name}`);
    else if (prev.name !== f.name) lines.push(`Renamed flow: "${prev.name}" → "${f.name}"`);
  }
  for (const [id, f] of beforeFlow) {
    if (!afterFlow.has(id)) lines.push(`Removed flow: ${f.name}`);
  }

  const careerIds = new Set([
    ...Object.keys(before.careerSiteById),
    ...Object.keys(after.careerSiteById),
  ]);
  for (const cid of careerIds) {
    const b = before.careerSiteById[cid];
    const a = after.careerSiteById[cid];
    if (a && !b) lines.push(`Added career site: ${a.name || cid}`);
    if (b && !a) lines.push(`Removed career site: ${b.name || cid}`);
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) {
      lines.push(...diffCareerS2s(b, a, cid));
    }
  }

  const atsIds = new Set([...Object.keys(before.atsById), ...Object.keys(after.atsById)]);
  for (const aid of atsIds) {
    const b = before.atsById[aid];
    const a = after.atsById[aid];
    if (a && !b) lines.push(`Added ATS: ${a.vendor}`);
    if (b && !a) lines.push(`Removed ATS: ${b.vendor}`);
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) {
      lines.push(...diffAtsS2s(b, a));
    }
  }

  return lines.length ? lines : ["No structural changes detected."];
}
