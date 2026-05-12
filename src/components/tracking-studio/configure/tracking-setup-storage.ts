import {
  SETUP_DATA_VERSION,
  createDefaultCareerEvents,
  createS2sDefaultCareerEvents,
  migrateLegacyAts,
  migrateLegacyCareer,
  normalizeAtsEventsOrder,
  normalizeCareerEventsOrder,
  type AtsState,
  type CareerSiteState,
  type S2sEventSource,
  type S2sTestStatus,
  type TrackingEvent,
} from "./tracking-events";

export type Architecture = "pixel" | "s2s";

export type WizardStage = 1 | 2 | 3 | 4;

/** Shared career site identity (max 2 templates per client). */
export type CareerSiteTemplate = {
  name: string;
  baseUrl: string;
};

/**
 * Per-flow career tracking configuration (never shared across flows).
 * Name/baseUrl live on CareerSiteTemplate; this holds events + S2S fields.
 */
export type CareerFlowNodeState = {
  templateId: string;
  /** Set when this node was created by reusing an existing career template. */
  copiedFromTemplateId?: string;
  /**
   * After the user edits flow-specific tracking on a copied/reused node, hide the
   * "Copied" hint on the canvas (until then it reflects catalog reuse).
   */
  copiedReuseHintDismissed?: boolean;
  /** Initial catalog label for this node; used when clearing an invalid/empty base URL. */
  defaultCareerSiteName?: string;
  events: TrackingEvent[];
  /**
   * True while the user must resolve funnel ownership after adding this career node
   * to a flow that already had funnel events on the first ATS. Cleared on move/keep.
   */
  funnelOwnershipReviewActive?: boolean;
  s2sEventSource?: S2sEventSource | "";
  s2sEndpointUrl?: string;
  s2sTestStatus?: S2sTestStatus;
};

/** Shared ATS identity (max {@link atsTemplateLimit} per client): vendor + endpoint URL. */
export type AtsTemplate = {
  vendor: string;
  endpointUrl: string;
};

/**
 * Per-flow ATS tracking configuration. Vendor/endpoint live on {@link AtsTemplate};
 * this holds events + S2S fields (mirrors career template vs flow node).
 */
export type AtsFlowNodeState = {
  templateId: string;
  /** Set when this node was created from an existing template or copied from another flow. */
  copiedFromTemplateId?: string;
  /**
   * After the user edits flow-specific tracking on a copied/reused node, hide the
   * "Copied" hint on the canvas.
   */
  copiedReuseHintDismissed?: boolean;
  events: TrackingEvent[];
  s2sEventSource?: S2sEventSource | "";
  s2sTestStatus?: S2sTestStatus;
};

/** Maximum distinct ATS templates allowed for one client (like career site templates). */
export const atsTemplateLimit = 2;

export type FlowState = {
  id: string;
  name: string;
  /** When `manual`, automatic flow naming does not overwrite `name`. */
  nameMode?: "auto" | "manual";
  /** Points at `careerFlowNodesById` (not template id). */
  careerFlowNodeId: string | null;
  /** ATS flow node ids (see `atsFlowNodesById`). */
  atsIds: string[];
};

/** Maximum ATS nodes that may be attached to a single flow. */
export const atsLimitPerFlow = 1;

export type Selection =
  | { kind: "flow"; flowId: string }
  | { kind: "career"; flowId: string }
  | { kind: "ats"; flowId: string; atsId: string };

export type SetupSnapshot = {
  version: number;
  wizardStage: WizardStage;
  architecture: Architecture;
  flows: FlowState[];
  careerTemplatesById: Record<string, CareerSiteTemplate>;
  careerFlowNodesById: Record<string, CareerFlowNodeState>;
  /** Shared ATS catalog (vendor + endpoint); max {@link atsTemplateLimit} entries. */
  atsTemplatesById: Record<string, AtsTemplate>;
  atsFlowNodesById: Record<string, AtsFlowNodeState>;
  /** @deprecated v3 only — empty after v4 migration; kept for JSON shape tolerance */
  careerSiteById?: Record<string, CareerSiteState>;
  /** @deprecated v3 only */
  atsById?: Record<string, AtsState>;
  careerSiteSerial: number;
  flowCanvasScale?: number;
  selection?: Selection | null;
  /**
   * Prototype: funnel ownership conflict resolution per flow/career/ATS/funnel key
   * (`funnelResolutionKey`). Values move_to_career | keep_on_ats.
   */
  eventOwnershipResolution?: Record<string, "move_to_career" | "keep_on_ats">;
};

export const KEY_DRAFT = "trackingStudioDraftSetup";
export const KEY_LIVE = "trackingStudioLiveSetup";
export const KEY_MODE = "trackingStudioCurrentMode";

export type PersistedMode =
  | "firstTime"
  | "draftRestored"
  | "live"
  | "liveReadOnly"
  | "liveEditing"
  | "liveReviewChanges"
  | "publishSuccess";

export type ModePayload = {
  mode: PersistedMode;
  lastSavedAt?: string;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function newMigrateId(): string {
  return `id-${crypto.randomUUID().slice(0, 8)}`;
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function careerNodeFromLegacyCareer(
  cs: CareerSiteState,
  templateId: string,
  copiedFromTemplateId: string | undefined,
  architecture: Architecture,
): CareerFlowNodeState {
  const base: CareerFlowNodeState = {
    templateId,
    copiedFromTemplateId,
    events: deepClone(cs.events),
    s2sEventSource: cs.s2sEventSource,
    s2sEndpointUrl: cs.s2sEndpointUrl,
    s2sTestStatus: cs.s2sTestStatus,
  };
  if (copiedFromTemplateId) {
    base.events =
      architecture === "s2s" ? createS2sDefaultCareerEvents() : createDefaultCareerEvents();
  }
  return base;
}

function atsNodeFromLegacyAts(
  a: AtsState,
  copiedFromVendor: string | undefined,
): AtsState & { copiedFromVendor?: string } {
  return {
    ...deepClone(a),
    copiedFromVendor,
  };
}

/** Migrate v3 snapshot (shared careerSiteById / atsById) to v4 flow nodes. */
function migrateLegacySnapshotToV4(raw: SetupSnapshot & Record<string, unknown>): SetupSnapshot {
  const architecture = raw.architecture ?? "pixel";
  const legacyCareer = Object.fromEntries(
    Object.entries((raw.careerSiteById ?? {}) as Record<string, CareerSiteState>).map(([k, cs]) => [
      k,
      migrateLegacyCareer(cs as never),
    ]),
  );
  const legacyAts = Object.fromEntries(
    Object.entries((raw.atsById ?? {}) as Record<string, AtsState>).map(([k, a]) => [
      k,
      migrateLegacyAts(a as never),
    ]),
  );

  const careerTemplatesById: Record<string, CareerSiteTemplate> = {};
  for (const [tid, cs] of Object.entries(legacyCareer)) {
    careerTemplatesById[tid] = { name: cs.name, baseUrl: cs.baseUrl };
  }

  const careerFlowNodesById: Record<string, CareerFlowNodeState> = {};
  const rawFlows = (raw.flows ?? []) as (FlowState & { careerSiteId?: string | null })[];
  const careerUsage = new Map<string, string[]>();
  for (const f of rawFlows) {
    const cid = f.careerFlowNodeId ?? f.careerSiteId ?? null;
    if (!cid) continue;
    const arr = careerUsage.get(cid) ?? [];
    arr.push(f.id);
    careerUsage.set(cid, arr);
  }

  const flowCareerNodeId = new Map<string, string>();
  for (const [legacyCareerId, flowIds] of careerUsage) {
    const cs = legacyCareer[legacyCareerId];
    if (!cs) continue;
    if (flowIds.length === 1) {
      const fid = flowIds[0]!;
      flowCareerNodeId.set(fid, legacyCareerId);
      careerFlowNodesById[legacyCareerId] = careerNodeFromLegacyCareer(
        cs,
        legacyCareerId,
        undefined,
        architecture,
      );
    } else {
      flowIds.forEach((fid, idx) => {
        if (idx === 0) {
          flowCareerNodeId.set(fid, legacyCareerId);
          careerFlowNodesById[legacyCareerId] = careerNodeFromLegacyCareer(
            cs,
            legacyCareerId,
            undefined,
            architecture,
          );
        } else {
          const nid = newMigrateId();
          flowCareerNodeId.set(fid, nid);
          careerFlowNodesById[nid] = careerNodeFromLegacyCareer(
            cs,
            legacyCareerId,
            legacyCareerId,
            architecture,
          );
        }
      });
    }
  }

  const atsFlowNodesById: Record<string, AtsState & { copiedFromVendor?: string }> = {};
  const atsUsage = new Map<string, string[]>();
  for (const f of rawFlows) {
    for (const aid of f.atsIds ?? []) {
      const arr = atsUsage.get(aid) ?? [];
      arr.push(f.id);
      atsUsage.set(aid, arr);
    }
  }

  const flowAtsRemap = new Map<string, Map<string, string>>();
  for (const [legacyAtsId, flowIds] of atsUsage) {
    const a = legacyAts[legacyAtsId];
    if (!a) continue;
    if (flowIds.length <= 1) {
      atsFlowNodesById[legacyAtsId] = atsNodeFromLegacyAts(a, undefined);
      for (const fid of flowIds) {
        let m = flowAtsRemap.get(fid);
        if (!m) {
          m = new Map();
          flowAtsRemap.set(fid, m);
        }
        m.set(legacyAtsId, legacyAtsId);
      }
    } else {
      flowIds.forEach((fid, idx) => {
        const newId = idx === 0 ? legacyAtsId : newMigrateId();
        atsFlowNodesById[newId] = atsNodeFromLegacyAts(
          a,
          idx === 0 ? undefined : (a.vendor ?? "").trim() || undefined,
        );
        let m = flowAtsRemap.get(fid);
        if (!m) {
          m = new Map();
          flowAtsRemap.set(fid, m);
        }
        m.set(legacyAtsId, newId);
      });
    }
  }

  const flows: FlowState[] = rawFlows.map((f) => {
    const careerNid = flowCareerNodeId.get(f.id) ?? null;
    const atsRemap = flowAtsRemap.get(f.id);
    const nextAtsIds = (f.atsIds ?? [])
      .slice(0, atsLimitPerFlow)
      .map((oldAid) => atsRemap?.get(oldAid) ?? oldAid);
    return {
      id: f.id,
      name: f.name,
      nameMode: "auto" as const,
      careerFlowNodeId: careerNid,
      atsIds: nextAtsIds,
    };
  });

  const referencedAts = new Set(flows.flatMap((f) => f.atsIds));
  const atsPruned = Object.fromEntries(
    Object.entries(atsFlowNodesById).filter(([id]) => referencedAts.has(id)),
  ) as Record<string, AtsState & { copiedFromVendor?: string }>;

  return {
    version: 4,
    wizardStage: raw.wizardStage ?? 1,
    architecture,
    flows,
    careerTemplatesById,
    careerFlowNodesById,
    atsTemplatesById: {},
    atsFlowNodesById: atsPruned as unknown as Record<string, AtsFlowNodeState>,
    careerSiteById: {},
    atsById: {},
    careerSiteSerial: raw.careerSiteSerial ?? 1,
    flowCanvasScale: raw.flowCanvasScale,
    selection: raw.selection ?? null,
  };
}

function isV4Snapshot(s: SetupSnapshot & Record<string, unknown>): boolean {
  return (
    s.version >= 4 &&
    s.careerFlowNodesById != null &&
    s.careerTemplatesById != null &&
    s.atsFlowNodesById != null
  );
}

function sanitizeSelection(
  sel: SetupSnapshot["selection"],
  snap: SetupSnapshot,
): SetupSnapshot["selection"] {
  if (!sel) return null;
  const flow = snap.flows.find((f) => f.id === sel.flowId);
  if (!flow) {
    return snap.flows[0] ? { kind: "flow", flowId: snap.flows[0].id } : null;
  }
  if (sel.kind === "ats") {
    const node = snap.atsFlowNodesById[sel.atsId];
    if (
      !flow.atsIds.includes(sel.atsId) ||
      !node ||
      !snap.atsTemplatesById[node.templateId]
    ) {
      return { kind: "flow", flowId: flow.id };
    }
  }
  if (sel.kind === "career") {
    const nid = flow.careerFlowNodeId;
    if (!nid || !snap.careerFlowNodesById[nid]) {
      return { kind: "flow", flowId: flow.id };
    }
  }
  return sel;
}

function needsAtsFlatMigration(snap: SetupSnapshot): boolean {
  for (const f of snap.flows) {
    for (const aid of f.atsIds) {
      const raw = snap.atsFlowNodesById[aid] as Record<string, unknown> | undefined;
      if (raw && typeof raw === "object" && "vendor" in raw) return true;
    }
  }
  return false;
}

function migrateFlatAtsNodesToV5(snap: SetupSnapshot): SetupSnapshot {
  const atsTemplatesById: Record<string, AtsTemplate> = { ...snap.atsTemplatesById };
  const nextNodes: Record<string, AtsFlowNodeState> = {};

  for (const [nid, rawUnknown] of Object.entries(snap.atsFlowNodesById)) {
    const raw = rawUnknown as Record<string, unknown>;
    if (raw && typeof raw === "object" && "templateId" in raw && !("vendor" in raw)) {
      nextNodes[nid] = rawUnknown as AtsFlowNodeState;
      continue;
    }
    const a = rawUnknown as unknown as AtsState & { copiedFromVendor?: string };
    const tid = newMigrateId();
    atsTemplatesById[tid] = {
      vendor: typeof a.vendor === "string" ? a.vendor : "",
      endpointUrl: typeof a.endpointUrl === "string" ? a.endpointUrl : "",
    };
    nextNodes[nid] = {
      templateId: tid,
      copiedFromTemplateId: a.copiedFromVendor ? tid : undefined,
      events: deepClone(a.events),
      s2sEventSource: a.s2sEventSource,
      s2sTestStatus: a.s2sTestStatus ?? "not_tested",
    };
  }

  return {
    ...snap,
    version: SETUP_DATA_VERSION,
    atsTemplatesById,
    atsFlowNodesById: nextNodes,
  };
}

function pruneOrphanAtsTemplates(snap: SetupSnapshot): SetupSnapshot {
  const ref = new Set<string>();
  for (const f of snap.flows) {
    for (const aid of f.atsIds) {
      const n = snap.atsFlowNodesById[aid];
      if (n?.templateId) ref.add(n.templateId);
    }
  }
  const atsTemplatesById = Object.fromEntries(
    Object.entries(snap.atsTemplatesById).filter(([k]) => ref.has(k)),
  );
  return { ...snap, atsTemplatesById };
}

/** Normalize any persisted snapshot shape to current schema (used by loaders and diff). */
export function migrateSnapshot(s: SetupSnapshot & Record<string, unknown>): SetupSnapshot {
  let base: SetupSnapshot;
  if (isV4Snapshot(s)) {
    base = {
      ...s,
      version: SETUP_DATA_VERSION,
      careerTemplatesById: { ...(s.careerTemplatesById ?? {}) },
      careerFlowNodesById: { ...(s.careerFlowNodesById ?? {}) },
      atsTemplatesById: { ...((s.atsTemplatesById ?? {}) as Record<string, AtsTemplate>) },
      atsFlowNodesById: { ...(s.atsFlowNodesById ?? {}) },
      flows: (s.flows ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        nameMode: (f as FlowState).nameMode ?? "auto",
        careerFlowNodeId:
          f.careerFlowNodeId ??
          (f as FlowState & { careerSiteId?: string | null }).careerSiteId ??
          null,
        atsIds: [...(f.atsIds ?? [])],
      })),
      careerSiteSerial: s.careerSiteSerial ?? 1,
    } as SetupSnapshot;
  } else {
    base = migrateLegacySnapshotToV4(s);
  }

  let next = base;
  if (next.architecture === "s2s") {
    next = {
      ...next,
      careerFlowNodesById: Object.fromEntries(
        Object.entries(next.careerFlowNodesById).map(([k, node]) => [
          k,
          {
            ...node,
            s2sTestStatus: node.s2sTestStatus ?? "not_tested",
            events: normalizeCareerEventsOrder(node.events, "s2s"),
          },
        ]),
      ),
      atsFlowNodesById: Object.fromEntries(
        Object.entries(next.atsFlowNodesById).map(([k, a]) => [
          k,
          {
            ...a,
            s2sTestStatus: a.s2sTestStatus ?? "not_tested",
            events: normalizeAtsEventsOrder(a.events, "s2s"),
          },
        ]),
      ),
    };
  }

  const flowsTrimmed = (next.flows ?? []).map((f) => ({
    ...f,
    nameMode: (f as FlowState).nameMode ?? "auto",
    atsIds: f.atsIds.slice(0, atsLimitPerFlow),
  }));
  const referencedAts = new Set(flowsTrimmed.flatMap((f) => f.atsIds));
  const atsByIdPruned = Object.fromEntries(
    Object.entries(next.atsFlowNodesById).filter(([id]) => referencedAts.has(id)),
  );
  let trimmed: SetupSnapshot = {
    ...next,
    flows: flowsTrimmed,
    atsFlowNodesById: atsByIdPruned,
    atsTemplatesById: next.atsTemplatesById ?? {},
    selection: sanitizeSelection(next.selection, {
      ...next,
      flows: flowsTrimmed,
      atsFlowNodesById: atsByIdPruned,
      atsTemplatesById: next.atsTemplatesById ?? {},
    }),
  };

  if (needsAtsFlatMigration(trimmed)) {
    trimmed = migrateFlatAtsNodesToV5(trimmed);
  }
  trimmed = pruneOrphanAtsTemplates({
    ...trimmed,
    atsTemplatesById: trimmed.atsTemplatesById ?? {},
  });
  trimmed = {
    ...trimmed,
    version: SETUP_DATA_VERSION,
    eventOwnershipResolution: trimmed.eventOwnershipResolution ?? {},
    selection: sanitizeSelection(trimmed.selection, trimmed),
  };

  return trimmed;
}

export function loadDraft(): SetupSnapshot | null {
  const s = safeParse<SetupSnapshot & Record<string, unknown>>(localStorage.getItem(KEY_DRAFT));
  if (!s?.flows?.length) return null;
  return migrateSnapshot(s);
}

export function saveDraft(snapshot: SetupSnapshot, mode: ModePayload) {
  localStorage.setItem(KEY_DRAFT, JSON.stringify({ ...snapshot, version: SETUP_DATA_VERSION }));
  localStorage.setItem(KEY_MODE, JSON.stringify(mode));
}

export function clearDraft() {
  localStorage.removeItem(KEY_DRAFT);
}

export function loadLive(): SetupSnapshot | null {
  const s = safeParse<SetupSnapshot & Record<string, unknown>>(localStorage.getItem(KEY_LIVE));
  if (!s?.flows?.length) return null;
  return migrateSnapshot(s);
}

export function saveLive(snapshot: SetupSnapshot, mode: ModePayload) {
  localStorage.setItem(KEY_LIVE, JSON.stringify({ ...snapshot, version: SETUP_DATA_VERSION }));
  localStorage.setItem(KEY_MODE, JSON.stringify(mode));
}

export function clearLive() {
  localStorage.removeItem(KEY_LIVE);
}

export function loadMode(): ModePayload | null {
  return safeParse<ModePayload>(localStorage.getItem(KEY_MODE));
}

export function saveMode(mode: ModePayload) {
  localStorage.setItem(KEY_MODE, JSON.stringify(mode));
}

export function cloneSnapshot(s: SetupSnapshot): SetupSnapshot {
  return JSON.parse(JSON.stringify(s)) as SetupSnapshot;
}

/** Merge template identity + flow node tracking for panels that expect `CareerSiteState`. */
export function mergeCareerTemplateAndNode(
  template: CareerSiteTemplate,
  node: CareerFlowNodeState,
): CareerSiteState {
  return {
    name: template.name,
    baseUrl: template.baseUrl,
    events: node.events,
    s2sEventSource: node.s2sEventSource,
    s2sEndpointUrl: node.s2sEndpointUrl,
    s2sTestStatus: node.s2sTestStatus,
  };
}

/** Merge ATS template + per-flow node for panels that expect `AtsState`. */
export function mergeAtsTemplateAndNode(template: AtsTemplate, node: AtsFlowNodeState): AtsState {
  return {
    vendor: template.vendor,
    endpointUrl: template.endpointUrl,
    events: node.events,
    s2sEventSource: node.s2sEventSource,
    s2sTestStatus: node.s2sTestStatus,
  };
}
