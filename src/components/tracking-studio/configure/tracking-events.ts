/** Unified tracking events for career sites and ATS catalog rows (configure wizard). */

/** Wizard architecture; kept here to avoid circular imports with tracking-setup-storage. */
export type TrackingSetupArchitecture = "pixel" | "s2s";

export type S2sEventSource =
  | "ats_webhook"
  | "backend_webhook"
  | "server_event"
  | "middleware"
  | "api_call"
  | "manual";

export type S2sTestStatus = "not_tested" | "testing" | "received";

export const S2S_EVENT_SOURCE_OPTIONS: { value: S2sEventSource; label: string }[] = [
  { value: "ats_webhook", label: "ATS webhook" },
  { value: "backend_webhook", label: "Backend webhook" },
  { value: "server_event", label: "Server event" },
  { value: "middleware", label: "Middleware" },
  { value: "api_call", label: "API call" },
  { value: "manual", label: "Manual implementation" },
];

export function s2sEventSourceLabel(v: S2sEventSource | "" | undefined): string {
  if (!v) return "";
  return S2S_EVENT_SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export type PixelMethod = "js" | "image";

/** Stored on each event; S2S reserved for future / ATS server-side if needed. */
export type TrackingMethod = PixelMethod | "s2s";

export type TrackingEvent = {
  id: string;
  label: string;
  eventKey: string;
  type: "default" | "custom";
  enabled: boolean;
  url: string;
  trackingMethod: TrackingMethod;
  errors?: {
    name?: string;
    url?: string;
    trackingMethod?: string;
  };
};

export type CareerSiteState = {
  name: string;
  baseUrl: string;
  events: TrackingEvent[];
  /** S2S-only: postback endpoint for this career site node. */
  s2sEventSource?: S2sEventSource | "";
  s2sEndpointUrl?: string;
  s2sTestStatus?: S2sTestStatus;
};

export type AtsState = {
  vendor: string;
  endpointUrl: string;
  events: TrackingEvent[];
  /** S2S-only: reuses endpointUrl for postback; these supplement node config. */
  s2sEventSource?: S2sEventSource | "";
  s2sTestStatus?: S2sTestStatus;
};

export const SETUP_DATA_VERSION = 7;

const DEFAULT_IDS = ["view", "lead", "apply_start", "apply_finish"] as const;

function defaultEvent(
  id: (typeof DEFAULT_IDS)[number],
  label: string,
  eventKey: string,
  overrides: Partial<TrackingEvent> = {},
): TrackingEvent {
  return {
    id,
    label,
    eventKey,
    type: "default",
    enabled: false,
    url: "",
    trackingMethod: "image",
    ...overrides,
  };
}

/** Career site defaults: VIEW on; exact event URL is entered in the UI (no preset value). */
export function createDefaultCareerEvents(): TrackingEvent[] {
  return [
    defaultEvent("view", "View", "VIEW", {
      enabled: true,
      url: "",
      trackingMethod: "js",
    }),
    defaultEvent("lead", "Lead", "LEAD"),
    defaultEvent("apply_start", "Apply start", "APPLY_START"),
    defaultEvent("apply_finish", "Apply finish", "APPLY_FINISH"),
  ];
}

/** ATS defaults (matches prior emptyAts). */
export function createDefaultAtsEvents(): TrackingEvent[] {
  return [
    defaultEvent("view", "View", "VIEW"),
    defaultEvent("lead", "Lead", "LEAD"),
    defaultEvent("apply_start", "Apply start", "APPLY_START", {
      enabled: true,
      url: "",
      trackingMethod: "js",
    }),
    defaultEvent("apply_finish", "Apply finish", "APPLY_FINISH"),
  ];
}

/** S2S wizard: four defaults off, no URLs required. */
export function createS2sDefaultCareerEvents(): TrackingEvent[] {
  return [
    defaultEvent("view", "View", "VIEW"),
    defaultEvent("lead", "Lead", "LEAD"),
    defaultEvent("apply_start", "Apply start", "APPLY_START"),
    defaultEvent("apply_finish", "Apply finish", "APPLY_FINISH"),
  ];
}

export function createS2sDefaultAtsEvents(): TrackingEvent[] {
  return [
    defaultEvent("view", "View", "VIEW"),
    defaultEvent("lead", "Lead", "LEAD"),
    defaultEvent("apply_start", "Apply start", "APPLY_START"),
    defaultEvent("apply_finish", "Apply finish", "APPLY_FINISH"),
  ];
}

export function nameToEventKey(name: string): string {
  const t = name.trim();
  if (!t) return "CUSTOM_EVENT";
  return (
    t
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase() || "CUSTOM_EVENT"
  );
}

export function newCustomEventId(): string {
  return `custom-${crypto.randomUUID().slice(0, 8)}`;
}

/** Legacy flat shape before events[] migration. */
type LegacyCareer = {
  name: string;
  baseUrl: string;
  viewOn?: boolean;
  viewMethod?: PixelMethod;
  viewUrls?: string[];
  applyStart?: boolean;
  applyStartMethod?: PixelMethod;
  applyStartUrls?: string[];
  applyFinish?: boolean;
  applyFinishMethod?: PixelMethod;
  applyFinishUrls?: string[];
  events?: TrackingEvent[];
};

type LegacyAts = {
  vendor: string;
  endpointUrl: string;
  viewOn?: boolean;
  viewMethod?: PixelMethod;
  viewUrls?: string[];
  applyStart?: boolean;
  applyStartMethod?: PixelMethod;
  applyStartUrls?: string[];
  applyFinish?: boolean;
  applyFinishMethod?: PixelMethod;
  applyFinishUrls?: string[];
  events?: TrackingEvent[];
};

function firstUrl(urls: string[] | undefined): string {
  if (!urls?.length) return "";
  const u = urls.find((x) => x.trim());
  return (u ?? urls[0] ?? "").trim();
}

export function migrateLegacyCareer(raw: LegacyCareer): CareerSiteState {
  if (raw.events && raw.events.length > 0) {
    return {
      name: raw.name,
      baseUrl: raw.baseUrl,
      events: normalizeCareerEventsOrder(raw.events, "pixel"),
    };
  }
  const events = createDefaultCareerEvents();
  const set = (id: string, patch: Partial<TrackingEvent>) => {
    const i = events.findIndex((e) => e.id === id);
    if (i >= 0) Object.assign(events[i]!, patch);
  };
  set("view", {
    enabled: !!raw.viewOn,
    trackingMethod: raw.viewMethod ?? "js",
    url: firstUrl(raw.viewUrls) || "",
  });
  set("lead", { enabled: false, url: "", trackingMethod: "image" });
  set("apply_start", {
    enabled: !!raw.applyStart,
    trackingMethod: raw.applyStartMethod ?? "js",
    url: firstUrl(raw.applyStartUrls),
  });
  set("apply_finish", {
    enabled: !!raw.applyFinish,
    trackingMethod: raw.applyFinishMethod ?? "js",
    url: firstUrl(raw.applyFinishUrls),
  });
  return {
    name: raw.name,
    baseUrl: raw.baseUrl,
    events: normalizeCareerEventsOrder(events, "pixel"),
  };
}

export function migrateLegacyAts(raw: LegacyAts): AtsState {
  if (raw.events && raw.events.length > 0) {
    return {
      vendor: raw.vendor,
      endpointUrl: raw.endpointUrl,
      events: normalizeAtsEventsOrder(raw.events, "pixel"),
    };
  }
  const events = createDefaultAtsEvents();
  const set = (id: string, patch: Partial<TrackingEvent>) => {
    const i = events.findIndex((e) => e.id === id);
    if (i >= 0) Object.assign(events[i]!, patch);
  };
  set("view", {
    enabled: !!raw.viewOn,
    trackingMethod: raw.viewMethod ?? "js",
    url: firstUrl(raw.viewUrls),
  });
  set("lead", { enabled: false, url: "", trackingMethod: "image" });
  set("apply_start", {
    enabled: !!raw.applyStart,
    trackingMethod: raw.applyStartMethod ?? "js",
    url: firstUrl(raw.applyStartUrls),
  });
  set("apply_finish", {
    enabled: !!raw.applyFinish,
    trackingMethod: raw.applyFinishMethod ?? "js",
    url: firstUrl(raw.applyFinishUrls),
  });
  return {
    vendor: raw.vendor,
    endpointUrl: raw.endpointUrl,
    events: normalizeAtsEventsOrder(events, "pixel"),
  };
}

export function normalizeCareerEventsOrder(
  events: TrackingEvent[],
  architecture: TrackingSetupArchitecture = "pixel",
): TrackingEvent[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const head: TrackingEvent[] = [];
  for (const id of DEFAULT_IDS) {
    const e = byId.get(id);
    if (e) head.push(e);
  }
  const customs = events.filter(
    (e) => e.type === "custom" || !DEFAULT_IDS.includes(e.id as (typeof DEFAULT_IDS)[number]),
  );
  const seen = new Set(head.map((h) => h.id));
  for (const c of customs) {
    if (!seen.has(c.id)) {
      head.push(c);
      seen.add(c.id);
    }
  }
  const fallback =
    architecture === "s2s" ? createS2sDefaultCareerEvents() : createDefaultCareerEvents();
  const ordered = head.length ? head : fallback;
  if (architecture === "s2s") {
    return ordered.map((e) => ({ ...e }));
  }
  return ordered.map((e) => (e.type === "custom" ? { ...e, enabled: true } : e));
}

export function normalizeAtsEventsOrder(
  events: TrackingEvent[],
  architecture: TrackingSetupArchitecture = "pixel",
): TrackingEvent[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const head: TrackingEvent[] = [];
  for (const id of DEFAULT_IDS) {
    const e = byId.get(id);
    if (e) head.push(e);
  }
  const customs = events.filter(
    (e) => e.type === "custom" || !DEFAULT_IDS.includes(e.id as (typeof DEFAULT_IDS)[number]),
  );
  const seen = new Set(head.map((h) => h.id));
  for (const c of customs) {
    if (!seen.has(c.id)) {
      head.push(c);
      seen.add(c.id);
    }
  }
  const fallback = architecture === "s2s" ? createS2sDefaultAtsEvents() : createDefaultAtsEvents();
  const ordered = head.length ? head : fallback;
  if (architecture === "s2s") {
    return ordered.map((e) => ({ ...e }));
  }
  return ordered.map((e) => (e.type === "custom" ? { ...e, enabled: true } : e));
}

export function getEventById(events: TrackingEvent[], id: string): TrackingEvent | undefined {
  return events.find((e) => e.id === id);
}

export function updateEventInList(
  events: TrackingEvent[],
  id: string,
  patch: Partial<TrackingEvent>,
): TrackingEvent[] {
  return events.map((e) =>
    e.id === id ? { ...e, ...patch, errors: patch.errors ?? e.errors } : e,
  );
}

export function removeCustomEvent(events: TrackingEvent[], id: string): TrackingEvent[] {
  return events.filter((e) => e.id !== id || e.type !== "custom");
}

/** Mark duplicate custom names only within a single node's event list. */
function markDuplicatesWithinEvents(events: TrackingEvent[]): TrackingEvent[] {
  const keyToIds = new Map<string, string[]>();
  for (const e of events) {
    if (e.type === "custom" && e.label.trim()) {
      const k = nameToEventKey(e.label);
      if (!keyToIds.has(k)) keyToIds.set(k, []);
      keyToIds.get(k)!.push(e.id);
    }
  }
  const dupIds = new Set<string>();
  for (const [k, ids] of keyToIds.entries()) {
    if (k === "CUSTOM_EVENT") continue;
    if (ids.length > 1) for (const id of ids) dupIds.add(id);
  }
  return events.map((e) => {
    if (e.type !== "custom") return e;
    const dup = dupIds.has(e.id) && e.label.trim().length > 0;
    return {
      ...e,
      errors: {
        ...e.errors,
        name: dup ? "This custom event name already exists." : e.errors?.name,
      },
    };
  });
}

/** v4: duplicate custom event names are scoped per flow node (not global across flows). */
export function markCustomDuplicateErrorsForFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(
  careerFlowNodesById: Record<string, C>,
  atsFlowNodesById: Record<string, A>,
): { careerFlowNodesById: Record<string, C>; atsFlowNodesById: Record<string, A> } {
  return {
    careerFlowNodesById: Object.fromEntries(
      Object.entries(careerFlowNodesById).map(([k, n]) => [
        k,
        { ...n, events: markDuplicatesWithinEvents(n.events) } as C,
      ]),
    ),
    atsFlowNodesById: Object.fromEntries(
      Object.entries(atsFlowNodesById).map(([k, n]) => [
        k,
        { ...n, events: markDuplicatesWithinEvents(n.events) } as A,
      ]),
    ),
  };
}

export function hasAnyDuplicateCustomNameErrorForFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(careerFlowNodesById: Record<string, C>, atsFlowNodesById: Record<string, A>): boolean {
  const m = markCustomDuplicateErrorsForFlowNodes(careerFlowNodesById, atsFlowNodesById);
  return (
    Object.values(m.careerFlowNodesById).some((n) => n.events.some((e) => e.errors?.name)) ||
    Object.values(m.atsFlowNodesById).some((n) => n.events.some((e) => e.errors?.name))
  );
}

export function countGlobalCustomEvents(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): number {
  let n = 0;
  for (const cs of Object.values(careerSiteById)) {
    n += cs.events.filter((e) => e.type === "custom").length;
  }
  for (const a of Object.values(atsById)) {
    n += a.events.filter((e) => e.type === "custom").length;
  }
  return n;
}

export function countGlobalCustomEventsFromFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(careerFlowNodesById: Record<string, C>, atsFlowNodesById: Record<string, A>): number {
  let n = 0;
  for (const node of Object.values(careerFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom").length;
  }
  for (const node of Object.values(atsFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom").length;
  }
  return n;
}

/** Mark duplicate custom event names within each career / ATS row (not across rows). */
export function markCustomDuplicateErrors(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): { careerSiteById: Record<string, CareerSiteState>; atsById: Record<string, AtsState> } {
  return {
    careerSiteById: Object.fromEntries(
      Object.entries(careerSiteById).map(([k, cs]) => [
        k,
        { ...cs, events: markDuplicatesWithinEvents(cs.events) },
      ]),
    ),
    atsById: Object.fromEntries(
      Object.entries(atsById).map(([k, a]) => [k, { ...a, events: markDuplicatesWithinEvents(a.events) }]),
    ),
  };
}

export function isExpandableDefault(id: string): boolean {
  return id === "view" || id === "lead";
}

export function enabledEventChips(
  events: TrackingEvent[],
  architecture: TrackingSetupArchitecture = "pixel",
): string[] {
  const chips: string[] = [];
  for (const e of events) {
    if (e.type === "custom") {
      if (architecture === "s2s" && !e.enabled) continue;
      if (!e.label.trim()) continue;
      chips.push(e.eventKey);
      continue;
    }
    if (!e.enabled) continue;
    chips.push(e.eventKey);
  }
  return chips;
}

/** Pill styles for enabled event keys (Figma: VIEW / APPLY_START / APPLY_FINISH tones). */
export function eventChipToneClassNames(eventKey: string): string {
  const k = eventKey.toUpperCase();
  if (k === "VIEW") {
    return "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]";
  }
  if (k === "APPLY_START") {
    return "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]";
  }
  if (k === "APPLY_FINISH") {
    return "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]";
  }
  if (k === "LEAD") {
    return "bg-[color:var(--figma-primary-lighter)] text-[color:var(--figma-primary-main)]";
  }
  return "bg-[color:var(--figma-gray-bg-05)] text-[color:var(--figma-gray-text-04)]";
}

export function isTrackingEventRowValid(
  e: TrackingEvent,
  architecture: TrackingSetupArchitecture = "pixel",
): boolean {
  if (architecture === "s2s") {
    if (e.type === "custom") {
      if (!e.enabled) return true;
      if (!e.label.trim()) return false;
      if (e.errors?.name) return false;
      return true;
    }
    if (!e.enabled) return true;
    return true;
  }
  if (e.type === "custom") {
    if (!e.label.trim()) return false;
    if (e.errors?.name) return false;
    if (!e.url.trim()) return false;
    if (!e.trackingMethod) return false;
    return true;
  }
  if (!e.enabled) return true;
  if (isExpandableDefault(e.id)) {
    if (!e.url.trim()) return false;
    if (!e.trackingMethod) return false;
  } else {
    if (!e.url.trim()) return false;
    if (!e.trackingMethod) return false;
  }
  return true;
}

/** At least one default event on, or one enabled custom with a name. */
export function nodeHasSelectedS2sEvents(events: TrackingEvent[]): boolean {
  for (const e of events) {
    if (e.type === "custom") {
      if (e.enabled && e.label.trim()) return true;
      continue;
    }
    if (e.enabled) return true;
  }
  return false;
}

function isS2sEventSourceSet(v: CareerSiteState["s2sEventSource"]): boolean {
  return Boolean(v && String(v).trim());
}

/** Pixel career base URL: must use http(s) scheme and parse as a URL with a host. */
export function isValidHttpOrHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
  try {
    const u = new URL(s);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function isCareerS2sComplete(cs: CareerSiteState): boolean {
  if (!cs.name.trim()) return false;
  if (!(cs.s2sEndpointUrl ?? "").trim()) return false;
  if (!nodeHasSelectedS2sEvents(cs.events)) return false;
  for (const e of cs.events) {
    if (!isTrackingEventRowValid(e, "s2s")) return false;
  }
  return true;
}

export function isAtsS2sComplete(a: AtsState): boolean {
  if (!a.vendor.trim()) return false;
  if (!isS2sEventSourceSet(a.s2sEventSource)) return false;
  if (!a.endpointUrl.trim()) return false;
  if (!nodeHasSelectedS2sEvents(a.events)) return false;
  for (const e of a.events) {
    if (!isTrackingEventRowValid(e, "s2s")) return false;
  }
  return true;
}

export function isCareerTrackingComplete(
  cs: CareerSiteState,
  architecture: TrackingSetupArchitecture = "pixel",
): boolean {
  if (architecture === "s2s") return isCareerS2sComplete(cs);
  if (!cs.name.trim() || !isValidHttpOrHttpsUrl(cs.baseUrl)) return false;
  for (const e of cs.events) {
    if (!isTrackingEventRowValid(e, "pixel")) return false;
  }
  return true;
}

export function isAtsTrackingComplete(
  a: AtsState,
  architecture: TrackingSetupArchitecture = "pixel",
): boolean {
  if (architecture === "s2s") return isAtsS2sComplete(a);
  if (!a.vendor.trim() || !a.endpointUrl.trim()) return false;
  for (const e of a.events) {
    if (!isTrackingEventRowValid(e, "pixel")) return false;
  }
  return true;
}

export function countEnabledDefaultEvents(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): number {
  let n = 0;
  const count = (events: TrackingEvent[]) => {
    for (const e of events) {
      if (e.type === "default" && e.enabled) n += 1;
    }
  };
  for (const cs of Object.values(careerSiteById)) count(cs.events);
  for (const a of Object.values(atsById)) count(a.events);
  return n;
}

export function countEnabledDefaultEventsFromFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(careerFlowNodesById: Record<string, C>, atsFlowNodesById: Record<string, A>): number {
  let n = 0;
  const count = (events: TrackingEvent[]) => {
    for (const e of events) {
      if (e.type === "default" && e.enabled) n += 1;
    }
  };
  for (const node of Object.values(careerFlowNodesById)) count(node.events);
  for (const node of Object.values(atsFlowNodesById)) count(node.events);
  return n;
}

export function countCustomEventsDefinedFromFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(careerFlowNodesById: Record<string, C>, atsFlowNodesById: Record<string, A>): number {
  let n = 0;
  for (const node of Object.values(careerFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom").length;
  }
  for (const node of Object.values(atsFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom").length;
  }
  return n;
}

export function countEnabledCustomEventsFromFlowNodes<
  C extends { events: TrackingEvent[] },
  A extends { events: TrackingEvent[] },
>(careerFlowNodesById: Record<string, C>, atsFlowNodesById: Record<string, A>): number {
  let n = 0;
  for (const node of Object.values(careerFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom" && e.enabled).length;
  }
  for (const node of Object.values(atsFlowNodesById)) {
    n += node.events.filter((e) => e.type === "custom" && e.enabled).length;
  }
  return n;
}

export function countCustomEventsDefined(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): number {
  return countGlobalCustomEvents(careerSiteById, atsById);
}

export function countEnabledCustomEventsGlobally(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): number {
  let n = 0;
  for (const cs of Object.values(careerSiteById)) {
    n += cs.events.filter((e) => e.type === "custom" && e.enabled).length;
  }
  for (const a of Object.values(atsById)) {
    n += a.events.filter((e) => e.type === "custom" && e.enabled).length;
  }
  return n;
}

export function hasAnyDuplicateCustomNameError(
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
): boolean {
  const m = markCustomDuplicateErrors(careerSiteById, atsById);
  return (
    Object.values(m.careerSiteById).some((cs) => cs.events.some((e) => e.errors?.name)) ||
    Object.values(m.atsById).some((a) => a.events.some((e) => e.errors?.name))
  );
}

export function addCustomEvent(events: TrackingEvent[]): TrackingEvent[] {
  const ev: TrackingEvent = {
    id: newCustomEventId(),
    label: "",
    eventKey: "CUSTOM_EVENT",
    type: "custom",
    enabled: true,
    url: "",
    trackingMethod: "image",
  };
  return [...events, ev];
}

export function syncCustomEventKeys(events: TrackingEvent[]): TrackingEvent[] {
  return events.map((e) => (e.type === "custom" ? { ...e, eventKey: nameToEventKey(e.label) } : e));
}
