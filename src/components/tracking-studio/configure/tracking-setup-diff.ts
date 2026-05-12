import type { Architecture, FlowState, SetupSnapshot } from "./tracking-setup-storage";
import {
  mergeAtsTemplateAndNode,
  mergeCareerTemplateAndNode,
  migrateSnapshot,
} from "./tracking-setup-storage";
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

function diffCareerPixelEventsOnly(b: CareerSiteState, a: CareerSiteState, label: string): string[] {
  if (JSON.stringify(b.events) === JSON.stringify(a.events)) return [];
  return [...diffDefaultEvents(b.events, a.events, label), ...diffCustomEvents(b.events, a.events, label)];
}

function diffAtsS2s(b: AtsState, a: AtsState, nodeLabel: string): string[] {
  const lines: string[] = [];
  if (b.s2sEventSource !== a.s2sEventSource) {
    lines.push(`Changed event source (${nodeLabel})`);
  }
  if (b.endpointUrl !== a.endpointUrl) {
    lines.push(`Changed endpoint URL (${nodeLabel})`);
  }
  lines.push(...diffDefaultEvents(b.events, a.events, nodeLabel));
  lines.push(...diffCustomEvents(b.events, a.events, nodeLabel));
  return lines;
}

function diffAtsPixel(b: AtsState, a: AtsState, nodeLabel: string): string[] {
  const lines: string[] = [];
  if (b.endpointUrl !== a.endpointUrl) lines.push(`Changed ATS endpoint (${nodeLabel})`);
  lines.push(...diffDefaultEvents(b.events, a.events, nodeLabel));
  lines.push(...diffCustomEvents(b.events, a.events, nodeLabel));
  return lines;
}

function mergedCareerForFlow(snap: SetupSnapshot, flow: FlowState): CareerSiteState | null {
  const nid = flow.careerFlowNodeId;
  if (!nid) return null;
  const node = snap.careerFlowNodesById[nid];
  const tmpl = node ? snap.careerTemplatesById[node.templateId] : undefined;
  if (!node || !tmpl) return null;
  return mergeCareerTemplateAndNode(tmpl, node);
}

function atsForFlow(snap: SetupSnapshot, flow: FlowState): AtsState | undefined {
  const id = flow.atsIds[0];
  if (!id) return undefined;
  const node = snap.atsFlowNodesById[id];
  const tmpl = node ? snap.atsTemplatesById[node.templateId] : undefined;
  if (!node || !tmpl) return undefined;
  return mergeAtsTemplateAndNode(tmpl, node);
}

function diffCareerTemplates(before: SetupSnapshot, after: SetupSnapshot): string[] {
  const lines: string[] = [];
  const ids = new Set([
    ...Object.keys(before.careerTemplatesById),
    ...Object.keys(after.careerTemplatesById),
  ]);
  for (const tid of ids) {
    const b = before.careerTemplatesById[tid];
    const a = after.careerTemplatesById[tid];
    if (a && !b) lines.push(`Added career site identity: ${a.name || tid}`);
    if (b && !a) lines.push(`Removed career site identity: ${b.name || tid}`);
    if (a && b && (b.name !== a.name || b.baseUrl !== a.baseUrl)) {
      if (b.baseUrl !== a.baseUrl) lines.push(`Changed career site base URL (${a.name || tid})`);
      if (b.name !== a.name) lines.push(`Renamed career site identity (“${b.name}” → “${a.name}”)`);
    }
  }
  return lines;
}

function diffFlowsAndPerFlowTracking(
  before: SetupSnapshot,
  after: SetupSnapshot,
  architecture: Architecture,
): string[] {
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

  lines.push(...diffCareerTemplates(before, after));

  for (const [id, fAfter] of afterFlow) {
    const fBefore = beforeFlow.get(id);
    if (!fBefore) continue;

    const flowLabel = fAfter.name || id;
    const bc = mergedCareerForFlow(before, fBefore);
    const ac = mergedCareerForFlow(after, fAfter);
    const careerLabel = ac?.name?.trim() || bc?.name?.trim() || flowLabel;

    if (!bc && ac) lines.push(`Added career site to flow "${flowLabel}"`);
    if (bc && !ac) lines.push(`Removed career site from flow "${flowLabel}"`);
    if (bc && ac) {
      if (architecture === "pixel") {
        lines.push(...diffCareerPixelEventsOnly(bc, ac, careerLabel));
      } else {
        lines.push(...diffCareerS2s(bc, ac, careerLabel));
      }
    }

    const bAts = atsForFlow(before, fBefore);
    const aAts = atsForFlow(after, fAfter);
    const atsNodeLabel = `${flowLabel} — ${aAts?.vendor ?? bAts?.vendor ?? "ATS"}`;

    if (!bAts && aAts) lines.push(`Added ATS to flow "${flowLabel}" (${aAts.vendor})`);
    if (bAts && !aAts) lines.push(`Removed ATS from flow "${flowLabel}" (${bAts.vendor})`);
    if (bAts && aAts) {
      if (architecture === "pixel") {
        lines.push(...diffAtsPixel(bAts, aAts, atsNodeLabel));
      } else {
        lines.push(...diffAtsS2s(bAts, aAts, atsNodeLabel));
      }
    }
  }

  return lines;
}

/** Readable change lines for live edit review (best-effort). */
export function buildSetupDiffLines(
  before: SetupSnapshot,
  after: SetupSnapshot,
  architecture: Architecture = before.architecture,
): string[] {
  const b = migrateSnapshot(before as SetupSnapshot & Record<string, unknown>);
  const a = migrateSnapshot(after as SetupSnapshot & Record<string, unknown>);
  const arch = architecture ?? a.architecture;
  const lines = diffFlowsAndPerFlowTracking(b, a, arch);
  return lines.length ? lines : ["No structural changes detected."];
}
