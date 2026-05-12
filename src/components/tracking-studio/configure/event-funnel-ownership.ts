import {
  createDefaultCareerEvents,
  createS2sDefaultCareerEvents,
  type TrackingEvent,
  type TrackingSetupArchitecture,
} from "./tracking-events";

export type FunnelDefaultId = "view" | "apply_start" | "apply_finish";

export const FUNNEL_DEFAULT_IDS: FunnelDefaultId[] = ["view", "apply_start", "apply_finish"];

export type EventOwnershipResolution = "move_to_career" | "keep_on_ats";

export function funnelResolutionKey(
  flowId: string,
  careerNodeId: string,
  atsNodeId: string,
  funnelId: FunnelDefaultId,
): string {
  return `${flowId}:${careerNodeId}:${atsNodeId}:${funnelId}`;
}

function isFunnelId(s: string): s is FunnelDefaultId {
  return s === "view" || s === "apply_start" || s === "apply_finish";
}

/** Returns funnel id from resolution key suffix, or null if key shape is invalid. */
export function funnelIdFromResolutionKey(key: string): FunnelDefaultId | null {
  const parts = key.split(":");
  const last = parts[parts.length - 1];
  return last && isFunnelId(last) ? last : null;
}

export function filterResolutionKeysForFlow(
  map: Record<string, EventOwnershipResolution>,
  flowId: string,
): Record<string, EventOwnershipResolution> {
  const prefix = `${flowId}:`;
  return Object.fromEntries(Object.entries(map).filter(([k]) => !k.startsWith(prefix)));
}

export function filterResolutionKeysForCareerNode(
  map: Record<string, EventOwnershipResolution>,
  careerNodeId: string,
): Record<string, EventOwnershipResolution> {
  return Object.fromEntries(
    Object.entries(map).filter(([k]) => {
      const parts = k.split(":");
      return parts.length >= 2 && parts[1] !== careerNodeId;
    }),
  );
}

export function filterResolutionKeysForAtsNode(
  map: Record<string, EventOwnershipResolution>,
  atsNodeId: string,
): Record<string, EventOwnershipResolution> {
  return Object.fromEntries(
    Object.entries(map).filter(([k]) => {
      const parts = k.split(":");
      return parts.length >= 3 && parts[2] !== atsNodeId;
    }),
  );
}

export function getEnabledFunnelEvents(events: TrackingEvent[]): FunnelDefaultId[] {
  const out: FunnelDefaultId[] = [];
  for (const id of FUNNEL_DEFAULT_IDS) {
    const e = events.find((x) => x.id === id && x.type === "default");
    if (e?.enabled) out.push(id);
  }
  return out;
}

export function getEarliestEnabledFunnelEvent(events: TrackingEvent[]): FunnelDefaultId | null {
  for (const id of FUNNEL_DEFAULT_IDS) {
    const e = events.find((x) => x.id === id && x.type === "default");
    if (e?.enabled) return id;
  }
  return null;
}

function resolutionPrefix(flowId: string, careerNodeId: string, atsNodeId: string): string {
  return `${flowId}:${careerNodeId}:${atsNodeId}:`;
}

export function getOwnershipResolution(
  flowId: string,
  careerNodeId: string,
  atsNodeId: string,
  funnelId: FunnelDefaultId,
  resolutionMap: Record<string, EventOwnershipResolution>,
): EventOwnershipResolution | undefined {
  return resolutionMap[funnelResolutionKey(flowId, careerNodeId, atsNodeId, funnelId)];
}

/** First ATS flow-node id in canvas order (only one ATS per flow today). */
export function getFirstAtsNodeInFlow(flow: { atsIds: string[] }): string | null {
  return flow.atsIds[0] ?? null;
}

/**
 * True when inspecting this career node against the first ATS in the flow and that ATS
 * has at least one enabled funnel event (VIEW / APPLY_START / APPLY_FINISH), and the
 * conflict is not cleared by a legacy `move_to_career` resolution for that earliest funnel.
 */
export function getPriorOrReverseOwnershipConflict(
  flow: { id: string; careerFlowNodeId: string | null; atsIds: string[] },
  careerNodeId: string,
  atsNodeId: string,
  mergedAtsVendor: string,
  atsEvents: TrackingEvent[],
  resolutionMap: Record<string, EventOwnershipResolution>,
): boolean {
  return (
    getOwnershipConflictPanel(
      flow,
      careerNodeId,
      atsNodeId,
      mergedAtsVendor,
      atsEvents,
      resolutionMap,
    ) !== null
  );
}

export type OwnershipConflictPanel = {
  flowId: string;
  careerNodeId: string;
  atsNodeId: string;
  /** Earliest enabled funnel event on the first ATS (VIEW → APPLY_START → APPLY_FINISH). */
  conflictFunnel: FunnelDefaultId;
  atsVendorName: string;
};

export function getOwnershipConflictPanel(
  flow: { id: string; careerFlowNodeId: string | null; atsIds: string[] },
  careerNodeId: string,
  atsNodeId: string,
  mergedAtsVendor: string,
  atsEvents: TrackingEvent[],
  resolutionMap: Record<string, EventOwnershipResolution>,
): OwnershipConflictPanel | null {
  if (flow.careerFlowNodeId !== careerNodeId) return null;
  const firstAts = flow.atsIds[0];
  if (!firstAts || firstAts !== atsNodeId) return null;

  const earliest = getEarliestEnabledFunnelEvent(atsEvents);
  if (!earliest) return null;

  const rk = funnelResolutionKey(flow.id, careerNodeId, atsNodeId, earliest);
  if (resolutionMap[rk] === "move_to_career") return null;

  return {
    flowId: flow.id,
    careerNodeId,
    atsNodeId,
    conflictFunnel: earliest,
    atsVendorName: mergedAtsVendor.trim() || "ATS",
  };
}

export function buildInitialCareerEventsForOwnershipConflict(
  architecture: TrackingSetupArchitecture,
  earliest: FunnelDefaultId,
): TrackingEvent[] {
  const base =
    architecture === "s2s" ? createS2sDefaultCareerEvents() : createDefaultCareerEvents();
  const ev = JSON.parse(JSON.stringify(base)) as TrackingEvent[];
  const set = (id: string, patch: Partial<TrackingEvent>) => {
    const i = ev.findIndex((e) => e.id === id);
    if (i >= 0) Object.assign(ev[i]!, patch);
  };
  if (earliest === "view") {
    set("view", { enabled: false });
    set("apply_start", { enabled: false });
    set("apply_finish", { enabled: false });
  } else if (earliest === "apply_start") {
    set("apply_start", { enabled: false });
    set("apply_finish", { enabled: false });
  } else {
    set("apply_finish", { enabled: false });
  }
  return ev;
}

function defaultCareerRowForId(
  id: string,
  architecture: TrackingSetupArchitecture,
): TrackingEvent | undefined {
  const list =
    architecture === "s2s" ? createS2sDefaultCareerEvents() : createDefaultCareerEvents();
  return list.find((e) => e.id === id);
}

function disableAtsFunnelThrough(events: TrackingEvent[], through: FunnelDefaultId): TrackingEvent[] {
  const next = JSON.parse(JSON.stringify(events)) as TrackingEvent[];
  const idx = (id: string) => next.findIndex((e) => e.id === id);
  const disable = (id: string) => {
    const i = idx(id);
    if (i >= 0) next[i] = { ...next[i]!, enabled: false };
  };
  if (through === "view") disable("view");
  else if (through === "apply_start") {
    disable("view");
    disable("apply_start");
  } else {
    disable("view");
    disable("apply_start");
    disable("apply_finish");
  }
  return next;
}

export function applyMoveFunnelToCareer(
  careerEvents: TrackingEvent[],
  atsEvents: TrackingEvent[],
  funnel: FunnelDefaultId,
  architecture: TrackingSetupArchitecture = "pixel",
): { nextCareerEvents: TrackingEvent[]; nextAtsEvents: TrackingEvent[] } {
  const nextCareer = JSON.parse(JSON.stringify(careerEvents)) as TrackingEvent[];
  const tmpl = defaultCareerRowForId(funnel, architecture);
  const ci = nextCareer.findIndex((e) => e.id === funnel);
  if (ci >= 0 && tmpl) {
    nextCareer[ci] = {
      ...nextCareer[ci]!,
      enabled: true,
      url: "",
      trackingMethod: tmpl.trackingMethod,
      label: tmpl.label,
      eventKey: tmpl.eventKey,
    };
  }
  const nextAts = disableAtsFunnelThrough(atsEvents, funnel);
  return { nextCareerEvents: nextCareer, nextAtsEvents: nextAts };
}

export type CareerRowOwnershipMeta = {
  switchDisabled: boolean;
  muted: boolean;
  helperText?: string;
  /**
   * When true, the switch is only locked while the event is off so the user can still turn
   * off an overlapping "on" state on the other node (sequential ownership).
   */
  lockEnableOnly?: boolean;
};

export function getCareerOwnershipRowMeta(
  panel: OwnershipConflictPanel | null,
  atsVendorName: string,
): Partial<Record<string, CareerRowOwnershipMeta>> {
  if (!panel) return {};
  const v = atsVendorName.trim() || "ATS";
  const f = panel.conflictFunnel;
  const meta: Partial<Record<string, CareerRowOwnershipMeta>> = {};

  const setRow = (id: string, m: CareerRowOwnershipMeta) => {
    meta[id] = m;
  };

  if (f === "view") {
    setRow("view", {
      switchDisabled: true,
      muted: true,
      helperText: `Funnel events are locked because VIEW is already configured on ${v}. Disable VIEW on ${v} first if you want to configure Career Site funnel events.`,
    });
    setRow("apply_start", {
      switchDisabled: true,
      muted: true,
      helperText: `Disabled because VIEW is already configured on ${v} in this flow.`,
    });
    setRow("apply_finish", {
      switchDisabled: true,
      muted: true,
      helperText: `Disabled because VIEW is already configured on ${v} in this flow.`,
    });
    return meta;
  }

  if (f === "apply_start") {
    setRow("apply_start", {
      switchDisabled: true,
      muted: true,
      helperText: `APPLY_START is already configured on ${v}. Disable it on ${v} first if you want to configure it here.`,
    });
    setRow("apply_finish", {
      switchDisabled: true,
      muted: true,
      helperText: `APPLY_FINISH is locked because this flow has already reached Apply Start on ${v}.`,
    });
    return meta;
  }

  setRow("apply_finish", {
    switchDisabled: true,
    muted: true,
    helperText: `APPLY_FINISH is already configured on ${v}. Disable it on ${v} first if you want to configure it here.`,
  });
  return meta;
}

export function isEventDisabled(
  eventId: string,
  panel: OwnershipConflictPanel | null,
  atsVendorName: string,
): boolean {
  if (eventId === "lead") return false;
  const m = getCareerOwnershipRowMeta(panel, atsVendorName);
  return Boolean(m[eventId]?.switchDisabled);
}

export function getDisabledReason(
  eventId: string,
  panel: OwnershipConflictPanel | null,
  atsVendorName: string,
): string | undefined {
  if (eventId === "lead") return undefined;
  return getCareerOwnershipRowMeta(panel, atsVendorName)[eventId]?.helperText;
}

export function getAtsFunnelRowHelperAfterMove(
  eventId: string,
  moved: FunnelDefaultId,
  atsVendorName: string,
): string | null {
  if (eventId === "lead") return null;
  if (moved === "view" && eventId === "view") {
    return "VIEW is disabled because it is now configured on Career Site in this flow.";
  }
  if (moved === "apply_start" && (eventId === "view" || eventId === "apply_start")) {
    return "VIEW and APPLY_START are disabled because this flow has already reached Apply Start on Career Site.";
  }
  if (
    moved === "apply_finish" &&
    (eventId === "view" || eventId === "apply_start" || eventId === "apply_finish")
  ) {
    return "Funnel events are disabled because Apply Finish is already configured on Career Site.";
  }
  return null;
}

export function getAtsFunnelRowUi(
  flowId: string,
  careerNodeId: string | null,
  atsNodeId: string,
  atsEvents: TrackingEvent[],
  atsVendorName: string,
  resolutionMap: Record<string, EventOwnershipResolution>,
): Partial<Record<string, CareerRowOwnershipMeta>> {
  if (!careerNodeId) return {};
  const prefix = resolutionPrefix(flowId, careerNodeId, atsNodeId);
  const key = Object.keys(resolutionMap).find(
    (k) => k.startsWith(prefix) && resolutionMap[k] === "move_to_career",
  );
  if (!key) return {};
  const moved = funnelIdFromResolutionKey(key);
  if (!moved) return {};
  const out: Partial<Record<string, CareerRowOwnershipMeta>> = {};
  for (const id of ["view", "apply_start", "apply_finish"] as const) {
    const ev = atsEvents.find((e) => e.id === id);
    const helper = getAtsFunnelRowHelperAfterMove(id, moved, atsVendorName);
    if (!ev?.enabled && helper) {
      out[id] = { switchDisabled: true, muted: true, helperText: helper };
    }
  }
  return out;
}

/** Sequential ownership: Career Site owns an earlier funnel → lock matching ATS funnel toggles. */
export function getAtsFunnelRowsBlockedByCareerSequentialOwnership(
  careerEvents: TrackingEvent[],
  atsNodeId: string,
  firstAtsId: string | null,
): Partial<Record<string, CareerRowOwnershipMeta>> {
  if (!firstAtsId || atsNodeId !== firstAtsId) return {};
  const ce = getEarliestEnabledFunnelEvent(careerEvents);
  if (!ce) return {};
  const out: Partial<Record<string, CareerRowOwnershipMeta>> = {};
  if (ce === "view") {
    out.view = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText: "Disabled because VIEW is already configured on Career Site in this flow.",
    };
  } else if (ce === "apply_start") {
    out.view = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText:
        "VIEW is disabled because this flow has already reached Apply Start on Career Site.",
    };
    out.apply_start = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText:
        "APPLY_START is disabled because this flow has already reached Apply Start on Career Site.",
    };
  } else {
    out.view = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText:
        "VIEW is disabled because Apply Finish is already configured on Career Site in this flow.",
    };
    out.apply_start = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText:
        "APPLY_START is disabled because Apply Finish is already configured on Career Site in this flow.",
    };
    out.apply_finish = {
      switchDisabled: true,
      muted: true,
      lockEnableOnly: true,
      helperText:
        "APPLY_FINISH is disabled because Apply Finish is already configured on Career Site in this flow.",
    };
  }
  return out;
}

export function mergeAtsFunnelOwnershipRowMeta(
  a: Partial<Record<string, CareerRowOwnershipMeta>>,
  b: Partial<Record<string, CareerRowOwnershipMeta>>,
): Partial<Record<string, CareerRowOwnershipMeta>> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Partial<Record<string, CareerRowOwnershipMeta>> = {};
  for (const k of keys) {
    const ma = a[k];
    const mb = b[k];
    if (!ma && !mb) continue;
    out[k] = {
      switchDisabled: Boolean(ma?.switchDisabled || mb?.switchDisabled),
      muted: Boolean(ma?.muted || mb?.muted),
      lockEnableOnly: Boolean(ma?.lockEnableOnly || mb?.lockEnableOnly),
      helperText: mb?.helperText ?? ma?.helperText,
    };
  }
  return out;
}
