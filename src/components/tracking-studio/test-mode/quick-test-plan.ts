import type { Architecture, SetupSnapshot } from "../configure/tracking-setup-storage";
import { mergeAtsTemplateAndNode, mergeCareerTemplateAndNode } from "../configure/tracking-setup-storage";
import {
  createDefaultAtsEvents,
  createDefaultCareerEvents,
  SETUP_DATA_VERSION,
  type AtsState,
  type CareerSiteState,
  type TrackingEvent,
  type TrackingMethod,
} from "../configure/tracking-events";

export type QuickTestNodeKind = "career" | "ats";

export type QuickTestEventStep = {
  id: string;
  stepNumber: number;
  displayName: string;
  eventCode: string;
  methodLabel: "JS Pixel" | "Image Pixel" | "S2S";
  trackingMethod: TrackingMethod;
  urlOrEndpoint: string;
  sourceNodeLabel: string;
  nodeKind: QuickTestNodeKind;
  architecture: Architecture;
  /** Underlying configure event id */
  eventRowId: string;
};

const DEFAULT_ORDER = ["view", "lead", "apply_start", "apply_finish"] as const;

function methodLabel(m: TrackingMethod, arch: Architecture): "JS Pixel" | "Image Pixel" | "S2S" {
  if (arch === "s2s") return "S2S";
  if (m === "js") return "JS Pixel";
  if (m === "image") return "Image Pixel";
  return "Image Pixel";
}

function resolveUrlOrEndpoint(
  e: TrackingEvent,
  arch: Architecture,
  ctx: { kind: QuickTestNodeKind; career?: CareerSiteState; ats?: AtsState },
): string {
  if (arch === "s2s") {
    if (ctx.kind === "career" && ctx.career) {
      return (ctx.career.s2sEndpointUrl ?? "").trim() || "(endpoint not set)";
    }
    if (ctx.kind === "ats" && ctx.ats) {
      return (ctx.ats.endpointUrl ?? "").trim() || "(endpoint not set)";
    }
    return "(endpoint not set)";
  }
  const u = e.url.trim();
  if (u) return u;
  if (ctx.kind === "career" && ctx.career?.baseUrl.trim()) return ctx.career.baseUrl.trim();
  if (ctx.kind === "ats" && ctx.ats?.endpointUrl.trim()) return ctx.ats.endpointUrl.trim();
  return "(URL not set)";
}

function collectFromEvents(
  events: TrackingEvent[],
  _arch: Architecture,
  ctx: { kind: QuickTestNodeKind; career?: CareerSiteState; ats?: AtsState },
): TrackingEvent[] {
  const enabled = events.filter((ev) => ev.enabled);
  const byId = new Map(enabled.map((e) => [e.id, e] as const));
  const ordered: TrackingEvent[] = [];
  for (const id of DEFAULT_ORDER) {
    const e = byId.get(id);
    if (e) ordered.push(e);
  }
  const defaultSet = new Set<string>(DEFAULT_ORDER);
  const customs = enabled
    .filter((e) => e.type === "custom" && !defaultSet.has(e.id))
    .slice(0, 5);
  ordered.push(...customs);
  return ordered;
}

function toStep(
  e: TrackingEvent,
  stepNumber: number,
  arch: Architecture,
  ctx: { kind: QuickTestNodeKind; career?: CareerSiteState; ats?: AtsState },
  sourceLabel: string,
): QuickTestEventStep {
  return {
    id: `${ctx.kind}-${e.id}-${stepNumber}`,
    stepNumber,
    displayName: e.label.trim() || e.eventKey,
    eventCode: e.eventKey.toUpperCase(),
    methodLabel: methodLabel(e.trackingMethod, arch),
    trackingMethod: arch === "s2s" ? "s2s" : e.trackingMethod,
    urlOrEndpoint: resolveUrlOrEndpoint(e, arch, ctx),
    sourceNodeLabel: sourceLabel,
    nodeKind: ctx.kind,
    architecture: arch,
    eventRowId: e.id,
  };
}

/** Enabled events for quick test: defaults in journey order, then up to 5 custom rows per node. */
export function buildQuickTestStepsFromFlow(
  snapshot: SetupSnapshot,
  flowId: string,
): QuickTestEventStep[] {
  const flow = snapshot.flows.find((f) => f.id === flowId);
  if (!flow) return [];
  const arch = snapshot.architecture;
  const steps: QuickTestEventStep[] = [];
  let n = 1;

  if (flow.careerFlowNodeId) {
    const node = snapshot.careerFlowNodesById[flow.careerFlowNodeId];
    const tmpl = node ? snapshot.careerTemplatesById[node.templateId] : null;
    if (node && tmpl) {
      const career = mergeCareerTemplateAndNode(tmpl, node);
      const ordered = collectFromEvents(career.events, arch, { kind: "career", career });
      for (const e of ordered) {
        steps.push(toStep(e, n++, arch, { kind: "career", career }, career.name.trim() || "Career site"));
      }
    }
  }

  for (const aid of flow.atsIds) {
    const node = snapshot.atsFlowNodesById[aid];
    const tmpl = node ? snapshot.atsTemplatesById[node.templateId] : null;
    if (!node || !tmpl) continue;
    const ats = mergeAtsTemplateAndNode(tmpl, node);
    const vendor = ats.vendor.trim() || "ATS";
    const ordered = collectFromEvents(ats.events, arch, { kind: "ats", ats });
    for (const e of ordered) {
      steps.push(toStep(e, n++, arch, { kind: "ats", ats }, vendor));
    }
  }

  return steps;
}

export function countEnabledEventsInFlow(snapshot: SetupSnapshot, flowId: string): number {
  return buildQuickTestStepsFromFlow(snapshot, flowId).length;
}

export const DEMO_PROTOTYPE_FLOW_ID = "demo-flow-prototype";

/** In-memory setup when no draft/live snapshot exists — keeps Quick Test usable. */
export function getDemoSetupSnapshot(): SetupSnapshot {
  const templateId = "demo-c-tmpl";
  const careerNodeId = "demo-c-node";
  const atsTemplateId = "demo-ats-tmpl";
  const atsNodeId = "demo-ats-node";
  const careerEvents: TrackingEvent[] = createDefaultCareerEvents().map((e) => {
    if (e.id === "view")
      return {
        ...e,
        enabled: true,
        label: "Career Page View",
        url: "",
        trackingMethod: "image" as const,
      };
    if (e.id === "lead")
      return {
        ...e,
        enabled: true,
        label: "Lead",
        url: "",
        trackingMethod: "image" as const,
      };
    return { ...e, enabled: false };
  });
  const atsEvents: TrackingEvent[] = createDefaultAtsEvents().map((e) => {
    if (e.id === "apply_start")
      return {
        ...e,
        enabled: true,
        label: "Apply Start",
        url: "https://tenethealth.wd5.myworkdayjobs.com/apply",
        trackingMethod: "image" as const,
      };
    if (e.id === "apply_finish")
      return {
        ...e,
        enabled: true,
        label: "Apply Complete",
        url: "https://tenethealth.wd5.myworkdayjobs.com/confirmation",
        trackingMethod: "image" as const,
      };
    return { ...e, enabled: false };
  });

  return {
    version: SETUP_DATA_VERSION,
    wizardStage: 2,
    architecture: "pixel",
    flows: [
      {
        id: DEMO_PROTOTYPE_FLOW_ID,
        name: "tenetcareers:view+lead → workday:apply-start+apply-finish",
        nameMode: "auto",
        careerFlowNodeId: careerNodeId,
        atsIds: [atsNodeId],
      },
    ],
    careerTemplatesById: {
      [templateId]: {
        name: "Tenet Health",
        baseUrl: "https://careers.tenethealth.com/jobs",
      },
    },
    careerFlowNodesById: {
      [careerNodeId]: {
        templateId,
        events: careerEvents,
      },
    },
    atsTemplatesById: {
      [atsTemplateId]: {
        vendor: "Workday",
        endpointUrl: "https://tenethealth.wd5.myworkdayjobs.com",
      },
    },
    atsFlowNodesById: {
      [atsNodeId]: {
        templateId: atsTemplateId,
        events: atsEvents,
      },
    },
    careerSiteSerial: 1,
    eventOwnershipResolution: {},
  };
}

export function defaultClientName(snapshot: SetupSnapshot): string {
  const first = Object.values(snapshot.careerTemplatesById)[0];
  const n = first?.name?.trim();
  if (n) return n;
  return "Your organization";
}
