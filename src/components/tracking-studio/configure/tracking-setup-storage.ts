import {
  SETUP_DATA_VERSION,
  migrateLegacyAts,
  migrateLegacyCareer,
  normalizeAtsEventsOrder,
  normalizeCareerEventsOrder,
  type AtsState,
  type CareerSiteState,
} from "./tracking-events";

export type Architecture = "pixel" | "s2s";

export type WizardStage = 1 | 2 | 3 | 4;

export type FlowState = {
  id: string;
  name: string;
  careerSiteId: string | null;
  atsIds: string[];
};

/** Maximum ATS catalog nodes that may be attached to a single flow. */
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
  careerSiteById: Record<string, CareerSiteState>;
  atsById: Record<string, AtsState>;
  careerSiteSerial: number;
  flowCanvasScale?: number;
  selection?: Selection | null;
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
    if (!flow.atsIds.includes(sel.atsId) || !snap.atsById[sel.atsId]) {
      return { kind: "flow", flowId: flow.id };
    }
  }
  if (sel.kind === "career") {
    if (!flow.careerSiteId || !snap.careerSiteById[flow.careerSiteId]) {
      return { kind: "flow", flowId: flow.id };
    }
  }
  return sel;
}

function migrateSnapshot(s: SetupSnapshot): SetupSnapshot {
  const careerSiteById = Object.fromEntries(
    Object.entries(s.careerSiteById ?? {}).map(([k, cs]) => [k, migrateLegacyCareer(cs as never)]),
  );
  const atsById = Object.fromEntries(
    Object.entries(s.atsById ?? {}).map(([k, a]) => [k, migrateLegacyAts(a as never)]),
  );
  let next: SetupSnapshot = {
    ...s,
    version: SETUP_DATA_VERSION,
    careerSiteById,
    atsById,
  };

  if (next.architecture === "s2s") {
    next = {
      ...next,
      careerSiteById: Object.fromEntries(
        Object.entries(next.careerSiteById).map(([k, cs]) => [
          k,
          {
            ...cs,
            s2sTestStatus: cs.s2sTestStatus ?? "not_tested",
            events: normalizeCareerEventsOrder(cs.events, "s2s"),
          },
        ]),
      ),
      atsById: Object.fromEntries(
        Object.entries(next.atsById).map(([k, a]) => [
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
    atsIds: f.atsIds.slice(0, atsLimitPerFlow),
  }));
  const referencedAts = new Set(flowsTrimmed.flatMap((f) => f.atsIds));
  const atsByIdPruned = Object.fromEntries(
    Object.entries(next.atsById).filter(([id]) => referencedAts.has(id)),
  );
  const trimmed: SetupSnapshot = {
    ...next,
    flows: flowsTrimmed,
    atsById: atsByIdPruned,
    selection: sanitizeSelection(s.selection, {
      ...next,
      flows: flowsTrimmed,
      atsById: atsByIdPruned,
    }),
  };

  return trimmed;
}

export function loadDraft(): SetupSnapshot | null {
  const s = safeParse<SetupSnapshot>(localStorage.getItem(KEY_DRAFT));
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
  const s = safeParse<SetupSnapshot>(localStorage.getItem(KEY_LIVE));
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
