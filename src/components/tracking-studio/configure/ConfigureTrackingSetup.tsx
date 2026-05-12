import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  ChevronRight,
  CopyPlus,
  ExternalLink,
  GitBranchPlus,
  Info,
  LayoutTemplate,
  Minus,
  Monitor,
  Pencil,
  Plus,
  Rocket,
  Scaling,
  Server,
  SquareMousePointer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldInput } from "@/components/ui/field-input";
import { Label } from "@/components/ui/label";
import {
  SearchableDropdown,
  type SearchableDropdownOption,
} from "@/components/ui/searchable-dropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { pixelMethodRecommendationForVendor } from "./ats-pixel-method-recommendation";
import { ATS_VENDOR_LOGO_URL } from "./ats-vendor-logos";
import { AtsEventsSection, CareerSiteEventsSection } from "./configure-event-forms";
import { deriveTrackingPattern } from "./derive-tracking-pattern";
import {
  applyAutoFlowNamesToFlows,
  buildAutoFlowName,
  careerTemplateNameFromBaseUrl,
} from "./flow-auto-naming";
import {
  countCustomEventsDefinedFromFlowNodes,
  countEnabledCustomEventsFromFlowNodes,
  countEnabledDefaultEventsFromFlowNodes,
  createDefaultAtsEvents,
  createDefaultCareerEvents,
  createS2sDefaultAtsEvents,
  createS2sDefaultCareerEvents,
  enabledEventChips,
  eventChipToneClassNames,
  hasAnyDuplicateCustomNameErrorForFlowNodes,
  isAtsTrackingComplete,
  isCareerTrackingComplete,
  isValidHttpOrHttpsUrl,
  isTrackingEventRowValid,
  markCustomDuplicateErrorsForFlowNodes,
  normalizeAtsEventsOrder,
  normalizeCareerEventsOrder,
  nodeHasSelectedS2sEvents,
  S2S_EVENT_SOURCE_OPTIONS,
  s2sEventSourceLabel,
  SETUP_DATA_VERSION,
  type AtsState,
  type CareerSiteState,
  type S2sEventSource,
  type S2sTestStatus,
  type TrackingEvent,
  type TrackingMethod,
} from "./tracking-events";
import {
  buildInitialCareerEventsForOwnershipConflict,
  filterResolutionKeysForAtsNode,
  filterResolutionKeysForCareerNode,
  filterResolutionKeysForFlow,
  getAtsFunnelRowUi,
  getAtsFunnelRowsBlockedByCareerSequentialOwnership,
  getCareerOwnershipRowMeta,
  getEarliestEnabledFunnelEvent,
  getOwnershipConflictPanel,
  mergeAtsFunnelOwnershipRowMeta,
  type CareerRowOwnershipMeta,
  type EventOwnershipResolution,
} from "./event-funnel-ownership";
import { buildSetupDiffLines } from "./tracking-setup-diff";
import {
  type Architecture,
  atsLimitPerFlow,
  atsTemplateLimit,
  clearDraft,
  clearLive,
  cloneSnapshot,
  loadDraft,
  loadLive,
  loadMode,
  mergeAtsTemplateAndNode,
  mergeCareerTemplateAndNode,
  saveDraft as persistDraft,
  saveLive,
  saveMode,
  type AtsFlowNodeState,
  type AtsTemplate,
  type CareerFlowNodeState,
  type CareerSiteTemplate,
  type FlowState,
  type Selection,
  type SetupSnapshot,
  type WizardStage,
} from "./tracking-setup-storage";

const ATS_OPTIONS = ["Workday", "JobInvite", "Bullhorn", "BambooHR", "Avionte"] as const;

/** Pixel tracking: recommended event firing method shown next to each ATS in the vendor dropdown. */
const ATS_VENDOR_PIXEL_METHOD_TAG: Record<(typeof ATS_OPTIONS)[number], string> = {
  Workday: "JS recommended",
  JobInvite: "Image recommended",
  Bullhorn: "JS recommended",
  BambooHR: "JS recommended",
  Avionte: "Image recommended",
};

function atsPixelMethodRecommendationForPanel(
  vendor: string,
  architecture: Architecture,
): "js" | "image" | undefined {
  if (architecture !== "pixel") return undefined;
  return pixelMethodRecommendationForVendor(vendor);
}

const STEPPER_STEPS = [
  { title: "Select architecture", subtitle: "tracking method" },
  { title: "Build tracking flow", subtitle: "Configure career sites & ATSes" },
  { title: "Configure flows", subtitle: "Set-up flows & preview full setup" },
  { title: "Launch", subtitle: "Success and next steps" },
] as const;

const STEPPER_ICONS = [LayoutTemplate, SquareMousePointer, Scaling, Rocket] as const;

type StepperStepState = "done" | "active" | "upcoming";

function stepperStepState(stepIndex: number, stage: WizardStage): StepperStepState {
  if (stage === 1) {
    return stepIndex === 0 ? "active" : "upcoming";
  }
  if (stage === 2) {
    if (stepIndex === 0) return "done";
    if (stepIndex === 1) return "active";
    return "upcoming";
  }
  if (stage === 3) {
    if (stepIndex <= 1) return "done";
    if (stepIndex === 2) return "active";
    return "upcoming";
  }
  // stage 4
  if (stepIndex <= 2) return "done";
  return "active";
}

const FLOW_CANVAS_MIN_SCALE = 0.5;
const FLOW_CANVAS_MAX_SCALE = 1.5;
const FLOW_CANVAS_SCALE_STEP = 0.1;

function clampFlowCanvasScale(n: number) {
  return Math.min(FLOW_CANVAS_MAX_SCALE, Math.max(FLOW_CANVAS_MIN_SCALE, n));
}

/** Dashed canvas CTAs: grey default, secondary blue on hover (matches Add flow). */
const DASHED_FLOW_CTA_ROW_CLASS =
  "group inline-flex w-full items-center gap-3 rounded-lg border border-dashed border-[color:var(--figma-gray-border-04)] bg-white px-5 py-3 text-left text-sm font-medium leading-5 text-[color:var(--figma-gray-text-04)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)] hover:text-[color:var(--figma-secondary-main)]";

const DASHED_FLOW_CTA_ICON_CLASS =
  "size-5 shrink-0 text-[color:var(--figma-gray-icon-05)] transition-colors group-hover:text-[color:var(--figma-secondary-main)]";

const DASHED_FLOW_CTA_TILE_CLASS =
  "group flex h-[122px] w-[130px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[color:var(--figma-gray-border-04)] bg-white px-2 text-sm font-medium text-[color:var(--figma-gray-text-04)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)] hover:text-[color:var(--figma-secondary-main)]";

/** Inline info callout for flow canvas catalog dropdowns (Figma 373:24832). */
function FlowCatalogDropdownInfoBanner({ message }: { message: string }) {
  return (
    <div
      role="note"
      className="mb-2 flex gap-2.5 rounded border border-[color:var(--figma-info-light)] bg-[color:var(--figma-info-lighter)] p-3"
    >
      <Info
        className="size-5 shrink-0 text-[color:var(--figma-info-main)]"
        strokeWidth={2}
        aria-hidden
      />
      <p className="text-xs font-normal leading-[18px] text-[color:var(--figma-gray-text-04)]">
        {message}
      </p>
    </div>
  );
}

function mergedAtsFromMaps(
  nodeId: string,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
): AtsState | null {
  const n = atsFlowNodesById[nodeId];
  const t = n ? atsTemplatesById[n.templateId] : null;
  if (!n || !t) return null;
  return mergeAtsTemplateAndNode(t, n);
}

function vendorsOnFlow(
  flow: FlowState,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
): Set<string> {
  const s = new Set<string>();
  for (const id of flow.atsIds) {
    const m = mergedAtsFromMaps(id, atsFlowNodesById, atsTemplatesById);
    const v = m?.vendor.trim();
    if (v) s.add(v);
  }
  return s;
}

function nextUnusedTemplateVendor(atsTemplatesById: Record<string, AtsTemplate>): string {
  const used = new Set(Object.values(atsTemplatesById).map((t) => t.vendor.trim()));
  return ATS_OPTIONS.find((v) => !used.has(v)) ?? ATS_OPTIONS[0];
}

function atsTemplateCatalogEntries(atsTemplatesById: Record<string, AtsTemplate>): {
  templateId: string;
  label: string;
}[] {
  return Object.entries(atsTemplatesById).map(([templateId, t]) => ({
    templateId,
    label: t.vendor.trim() || "ATS",
  }));
}

function atsCopySourcesOtherFlows(
  flowId: string,
  flows: FlowState[],
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
): { sourceNodeId: string; flowName: string; vendor: string }[] {
  const out: { sourceNodeId: string; flowName: string; vendor: string }[] = [];
  for (const f of flows) {
    if (f.id === flowId) continue;
    const aid = f.atsIds[0];
    if (!aid) continue;
    const m = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
    if (!m) continue;
    out.push({
      sourceNodeId: aid,
      flowName: f.name.trim() || "Flow",
      vendor: m.vendor.trim() || "ATS",
    });
  }
  return out;
}

function pruneAtsTemplatesForFlows(
  flows: FlowState[],
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
): Record<string, AtsTemplate> {
  const ref = new Set<string>();
  for (const f of flows) {
    for (const aid of f.atsIds) {
      const n = atsFlowNodesById[aid];
      if (n?.templateId) ref.add(n.templateId);
    }
  }
  return Object.fromEntries(Object.entries(atsTemplatesById).filter(([k]) => ref.has(k)));
}

function AddAtsToFlowControl({
  readOnly,
  canAddAts,
  canCreateNewTemplate,
  templateOptions,
  copySources,
  onCreateNewTemplate,
  onAttachTemplate,
  onCopyFromSource,
  triggerClassName,
  variant,
}: {
  readOnly?: boolean;
  canAddAts: boolean;
  canCreateNewTemplate: boolean;
  templateOptions: { templateId: string; label: string }[];
  copySources: { sourceNodeId: string; flowName: string; vendor: string }[];
  onCreateNewTemplate: () => void;
  onAttachTemplate: (templateId: string) => void;
  onCopyFromSource: (sourceNodeId: string) => void;
  triggerClassName: string;
  variant: "row" | "tile";
}) {
  if (!canAddAts) return null;

  const label =
    variant === "row" ? <span>Add ATS</span> : <span className="text-center text-sm">Add ATS</span>;

  const showMenu =
    canCreateNewTemplate || templateOptions.length > 0 || copySources.length > 0;

  if (!showMenu) return null;

  if (canCreateNewTemplate && templateOptions.length === 0 && copySources.length === 0) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => {
          if (!readOnly) onCreateNewTemplate();
        }}
        className={triggerClassName}
      >
        <GitBranchPlus className={DASHED_FLOW_CTA_ICON_CLASS} strokeWidth={1.5} />
        {label}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={readOnly} className={triggerClassName}>
          <GitBranchPlus className={DASHED_FLOW_CTA_ICON_CLASS} strokeWidth={1.5} />
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <FlowCatalogDropdownInfoBanner message={`Up to ${atsTemplateLimit} ATS definitions per client. Reuse one on another flow and adjust tracking per flow.`} />
        <DropdownMenuSeparator />
        {canCreateNewTemplate ? (
          <DropdownMenuItem
            onClick={() => {
              if (!readOnly) onCreateNewTemplate();
            }}
          >
            + New ATS
          </DropdownMenuItem>
        ) : null}
        {canCreateNewTemplate && (templateOptions.length > 0 || copySources.length > 0) ? (
          <DropdownMenuSeparator />
        ) : null}
        {templateOptions.map((o) => (
          <DropdownMenuItem
            key={o.templateId}
            onClick={() => {
              if (!readOnly) onAttachTemplate(o.templateId);
            }}
          >
            Use {o.label}
          </DropdownMenuItem>
        ))}
        {copySources.length > 0 && templateOptions.length > 0 ? <DropdownMenuSeparator /> : null}
        {copySources.map((c) => (
          <DropdownMenuItem
            key={c.sourceNodeId}
            onClick={() => {
              if (!readOnly) onCopyFromSource(c.sourceNodeId);
            }}
          >
            Copy {c.vendor} setup from {c.flowName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function newId() {
  return `id-${crypto.randomUUID().slice(0, 8)}`;
}

function initialFlows(): FlowState[] {
  return [{ id: newId(), name: "Flow 1", nameMode: "auto", careerFlowNodeId: null, atsIds: [] }];
}

const CAREER_COPIED_HINT_TRACKING_KEYS = new Set([
  "events",
  "s2sEventSource",
  "s2sEndpointUrl",
  "s2sTestStatus",
]);

function careerPatchDismissesCopiedReuseHint(patch: Partial<CareerFlowNodeState>): boolean {
  for (const k of Object.keys(patch)) {
    if (CAREER_COPIED_HINT_TRACKING_KEYS.has(k)) return true;
  }
  return false;
}

const ATS_COPIED_HINT_TRACKING_KEYS = new Set(["events", "s2sEventSource", "s2sTestStatus"]);

function atsPatchDismissesCopiedReuseHint(patch: Partial<AtsFlowNodeState>): boolean {
  for (const k of Object.keys(patch)) {
    if (ATS_COPIED_HINT_TRACKING_KEYS.has(k)) return true;
  }
  return false;
}

function showCopiedReuseHint(
  copiedFromTemplateId: string | undefined,
  dismissed: boolean | undefined,
): boolean {
  return Boolean(copiedFromTemplateId) && !dismissed;
}

function emptyAts(vendor: string, architecture: Architecture): AtsState {
  if (architecture === "s2s") {
    return {
      vendor,
      endpointUrl: "",
      events: createS2sDefaultAtsEvents(),
      s2sEventSource: "",
      s2sTestStatus: "not_tested",
    };
  }
  return {
    vendor,
    endpointUrl: "https://",
    events: createDefaultAtsEvents(),
  };
}

/** Vendors already chosen by another ATS flow node (same flow only has one slot — used for vendor dropdown). */
function vendorsUsedByOtherAtsOnSameFlow(
  flow: FlowState,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  currentNodeId: string,
): Set<string> {
  const taken = new Set<string>();
  for (const id of flow.atsIds) {
    if (id === currentNodeId) continue;
    const m = mergedAtsFromMaps(id, atsFlowNodesById, atsTemplatesById);
    const v = m?.vendor.trim();
    if (v) taken.add(v);
  }
  return taken;
}

function canOpenReview(
  flows: FlowState[],
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  architecture: Architecture,
): boolean {
  if (hasAnyDuplicateCustomNameErrorForFlowNodes(careerFlowNodesById, atsFlowNodesById)) return false;
  const hasAnyNode = flows.some((f) => f.careerFlowNodeId || f.atsIds.length > 0);
  if (!hasAnyNode) return false;
  return flows.every((f) => {
    if (!f.name.trim()) return false;
    const isEmpty = !f.careerFlowNodeId && f.atsIds.length === 0;
    if (isEmpty) return false;
    if (f.careerFlowNodeId) {
      const node = careerFlowNodesById[f.careerFlowNodeId];
      const tmpl = careerTemplatesById[node?.templateId ?? ""];
      if (!node || !tmpl) return false;
      const merged = mergeCareerTemplateAndNode(tmpl, node);
      if (!isCareerTrackingComplete(merged, architecture)) return false;
    }
    for (const aid of f.atsIds) {
      const ats = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
      if (!ats || !isAtsTrackingComplete(ats, architecture)) return false;
    }
    return true;
  });
}

function isFlowReviewReady(
  f: FlowState,
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  architecture: Architecture,
): boolean {
  if (!f.name.trim()) return false;
  const isEmpty = !f.careerFlowNodeId && f.atsIds.length === 0;
  if (isEmpty) return false;
  if (f.careerFlowNodeId) {
    const node = careerFlowNodesById[f.careerFlowNodeId];
    const tmpl = careerTemplatesById[node?.templateId ?? ""];
    if (!node || !tmpl) return false;
    const merged = mergeCareerTemplateAndNode(tmpl, node);
    if (!isCareerTrackingComplete(merged, architecture)) return false;
  }
  for (const aid of f.atsIds) {
    const ats = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
    if (!ats || !isAtsTrackingComplete(ats, architecture)) return false;
  }
  return true;
}

function s2sCareerBlockers(cs: CareerSiteState): string[] {
  const out: string[] = [];
  if (!(cs.s2sEndpointUrl ?? "").trim()) out.push("Endpoint URL is required for S2S tracking.");
  if (!nodeHasSelectedS2sEvents(cs.events)) out.push("Select at least one event.");
  for (const e of cs.events) {
    if (e.type === "custom" && e.enabled && !e.label.trim()) {
      out.push("Custom event name is required.");
      break;
    }
  }
  return out;
}

function s2sAtsBlockers(a: AtsState): string[] {
  const out: string[] = [];
  if (!a.s2sEventSource) out.push("Select an event source.");
  if (!a.endpointUrl.trim()) out.push("Endpoint URL is required for S2S tracking.");
  if (!nodeHasSelectedS2sEvents(a.events)) out.push("Select at least one event.");
  for (const e of a.events) {
    if (e.type === "custom" && e.enabled && !e.label.trim()) {
      out.push("Custom event name is required.");
      break;
    }
  }
  return out;
}

function reviewBlockers(
  flows: FlowState[],
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
  architecture: Architecture,
): string[] {
  const issues: string[] = [];
  if (hasAnyDuplicateCustomNameErrorForFlowNodes(careerFlowNodesById, atsFlowNodesById)) {
    issues.push("This custom event name already exists.");
  }
  for (const f of flows) {
    if (!f.name.trim()) {
      issues.push(`${flowDisplayName(f)}: Enter a flow name.`);
    }
    const empty = !f.careerFlowNodeId && f.atsIds.length === 0;
    if (empty) {
      issues.push(`${flowDisplayName(f)}: Add a career site or ATS to this flow.`);
      continue;
    }
    if (architecture === "s2s") {
      if (f.careerFlowNodeId) {
        const node = careerFlowNodesById[f.careerFlowNodeId];
        const tmpl = node ? careerTemplatesById[node.templateId] : null;
        if (node && tmpl) {
          const cs = mergeCareerTemplateAndNode(tmpl, node);
          for (const line of s2sCareerBlockers(cs)) {
            issues.push(`${flowDisplayName(f)}: ${line}`);
          }
        }
      }
      for (const aid of f.atsIds) {
        const a = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
        if (a) {
          for (const line of s2sAtsBlockers(a)) {
            issues.push(`${flowDisplayName(f)}: ${line}`);
          }
        }
      }
    } else if (
      !isFlowReviewReady(
        f,
        careerTemplatesById,
        careerFlowNodesById,
        atsTemplatesById,
        atsFlowNodesById,
        architecture,
      )
    ) {
      issues.push(
        `${flowDisplayName(f)}: complete tracking configuration (URLs and required fields).`,
      );
    }
  }
  return issues;
}

function flowDisplayName(f: FlowState): string {
  return f.name.trim() || "Untitled flow";
}

/** Matches Figma flow card: career counts as one node; all ATS slots together count as one node (not per ATS). */
function flowTrackingNodeCount(f: FlowState): number {
  return (f.careerFlowNodeId ? 1 : 0) + (f.atsIds.length > 0 ? 1 : 0);
}

function flowPathSummaryLine(
  flow: FlowState,
  careerTemplatesById: Record<string, CareerSiteTemplate>,
  careerFlowNodesById: Record<string, CareerFlowNodeState>,
  atsTemplatesById: Record<string, AtsTemplate>,
  atsFlowNodesById: Record<string, AtsFlowNodeState>,
): string | null {
  const nid = flow.careerFlowNodeId;
  const node = nid ? careerFlowNodesById[nid] : null;
  const tmpl = node ? careerTemplatesById[node.templateId] : null;
  const career = node && tmpl ? mergeCareerTemplateAndNode(tmpl, node) : null;
  const cname = career ? career.name.trim() || "Career site" : "";
  const ids = flow.atsIds;
  if (ids.length === 0) {
    return career ? cname : null;
  }
  const first = mergedAtsFromMaps(ids[0]!, atsFlowNodesById, atsTemplatesById);
  const vendor = first?.vendor.trim() || "ATS";
  if (career) return `${cname} → ${vendor}`;
  return vendor;
}

function architectureLabel(a: Architecture): string {
  return a === "pixel" ? "Pixel tracking" : "Server-to-server tracking";
}

function ReviewFlowColumnConnector() {
  return (
    <div className="flex shrink-0 items-center self-center px-1 sm:px-2" aria-hidden>
      <ChevronRight
        className="size-5 text-[color:var(--figma-gray-border-03)] sm:size-6"
        strokeWidth={1.5}
      />
    </div>
  );
}

function reviewPixelMethodLabel(m: TrackingMethod): string {
  if (m === "js") return "JS";
  if (m === "image") return "Image";
  return m;
}

function ReviewPixelEventColumn({
  events,
  architecture,
}: {
  events: TrackingEvent[];
  architecture: Architecture;
}) {
  const rows = events.filter((e) => e.type === "custom" || e.enabled);
  if (rows.length === 0) {
    return <p className="text-xs text-[color:var(--figma-gray-text-03)]">No events enabled</p>;
  }
  return (
    <div className="flex min-w-0 max-w-[300px] flex-col gap-5">
      {rows.map((ev) => (
        <div key={ev.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-[color:var(--figma-gray-text-04)]">
              {ev.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold leading-[18px]",
                eventChipToneClassNames(ev.eventKey),
              )}
            >
              {ev.eventKey}
            </span>
          </div>
          {architecture === "pixel" ? (
            <>
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Tracking Method:
                </span>
                <span className="text-sm text-[color:var(--figma-gray-text-05)]">
                  {reviewPixelMethodLabel(ev.trackingMethod)}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-baseline gap-1">
                <span className="shrink-0 text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  URL:
                </span>
                <span className="min-w-0 break-all text-sm text-[color:var(--figma-gray-text-05)]">
                  {ev.url.trim() || "—"}
                </span>
              </div>
              {!isTrackingEventRowValid(ev, architecture) ? (
                <span className="text-xs font-medium text-[color:var(--figma-error-main)]">
                  Incomplete
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ExitUnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirmDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. If you leave now, they will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[color:var(--figma-error-main)] text-white hover:bg-[color:var(--figma-error-main)]/90"
            onClick={onConfirmDiscard}
          >
            Discard and exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewTrackingStage({
  architecture,
  flows,
  careerTemplatesById,
  careerFlowNodesById,
  atsTemplatesById,
  atsFlowNodesById,
  reviewEnabled,
  blockers,
  onBack,
  onSaveDraft,
  onLaunch,
  onEditFlow,
  onExit,
  onGoToStage,
  onPublish,
  diffLines,
}: {
  architecture: Architecture;
  flows: FlowState[];
  careerTemplatesById: Record<string, CareerSiteTemplate>;
  careerFlowNodesById: Record<string, CareerFlowNodeState>;
  atsTemplatesById: Record<string, AtsTemplate>;
  atsFlowNodesById: Record<string, AtsFlowNodeState>;
  reviewEnabled: boolean;
  blockers: string[];
  onBack: () => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onEditFlow: (flowId: string) => void;
  onExit: () => void;
  onGoToStage?: (s: WizardStage) => void;
  /** When set, primary CTA publishes live edits instead of first-time launch. */
  onPublish?: () => void;
  diffLines?: string[];
}) {
  const careerCatalogCount = Object.keys(careerTemplatesById).length;
  const atsTemplateCount = Object.keys(atsTemplatesById).length;
  const enabledDefaultEvents = countEnabledDefaultEventsFromFlowNodes(
    careerFlowNodesById,
    atsFlowNodesById,
  );
  const enabledCustomEvents = countEnabledCustomEventsFromFlowNodes(
    careerFlowNodesById,
    atsFlowNodesById,
  );
  const customRowsTotal = countCustomEventsDefinedFromFlowNodes(
    careerFlowNodesById,
    atsFlowNodesById,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-white">
        <div className="px-6 py-4">
          <SetupStepper stage={3} onGoToStage={onGoToStage} />
        </div>
        <div className="w-full border-t border-[color:var(--figma-gray-border-02)]" />
        <div className="flex flex-nowrap items-center justify-between gap-4 overflow-x-auto px-6 py-5">
          <div className="min-w-0 shrink">
            <h1 className="text-lg font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
              Review tracking setup
            </h1>
            <p className="mt-1 max-w-[640px] text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
              Confirm architecture, flows, and event coverage before you launch. You can go back to
              edit any flow.
            </p>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            {onPublish ? null : (
              <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>
                Save as draft
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onExit}>
              Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[color:var(--figma-gray-bg-04)] px-6 py-8">
        <div className="mx-auto max-w-[1136px] space-y-6 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-8">
          {architecture === "s2s" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Architecture
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {architectureLabel(architecture)}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Total flows
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {flows.length}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Career sites used
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {careerCatalogCount}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  ATSs used
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {atsTemplateCount}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Events selected
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {enabledDefaultEvents}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Custom events
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {enabledCustomEvents} enabled ({customRowsTotal} rows)
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Missing blockers
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {blockers.length === 0 ? "None" : `${blockers.length} issue(s)`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Architecture
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {architectureLabel(architecture)}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">Flows</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {flows.length} configured
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                  Catalog usage
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {careerCatalogCount} career site{careerCatalogCount === 1 ? "" : "s"},{" "}
                  {atsTemplateCount} ATS definition{atsTemplateCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}

          {diffLines && diffLines.length > 0 ? (
            <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                Change summary
              </h2>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
                {diffLines.map((line, i) => (
                  <li key={`${i}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {blockers.length > 0 ? (
            <div className="rounded-lg border border-[color:var(--figma-error-main)]/35 bg-[color:var(--figma-error-main)]/5 px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--figma-error-main)]">
                Complete all required event details before launch.
              </p>
              <p className="mt-1 text-xs font-medium text-[color:var(--figma-error-main)]">
                Needs attention before launch
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-[color:var(--figma-success-main)]/35 bg-[color:var(--figma-success-lighter)]/50 px-4 py-3 text-sm text-[color:var(--figma-gray-text-04)]">
              All flows have valid tracking configuration. You can launch when ready.
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">Flows</h2>
            {flows.map((flow, flowIndex) => {
              const careerNode = flow.careerFlowNodeId
                ? careerFlowNodesById[flow.careerFlowNodeId]
                : null;
              const tmpl = careerNode ? careerTemplatesById[careerNode.templateId] : null;
              const career =
                careerNode && tmpl ? mergeCareerTemplateAndNode(tmpl, careerNode) : null;
              const careerCopied = showCopiedReuseHint(
                careerNode?.copiedFromTemplateId,
                careerNode?.copiedReuseHintDismissed,
              );
              const ready = isFlowReviewReady(
                flow,
                careerTemplatesById,
                careerFlowNodesById,
                atsTemplatesById,
                atsFlowNodesById,
                architecture,
              );
              const pathLine = flowPathSummaryLine(
                flow,
                careerTemplatesById,
                careerFlowNodesById,
                atsTemplatesById,
                atsFlowNodesById,
              );
              const flowHeading =
                pathLine != null && pathLine.length > 0
                  ? `Flow ${flowIndex + 1}: ${pathLine}`
                  : `Flow ${flowIndex + 1}: ${flowDisplayName(flow)}`;

              return (
                <div
                  key={flow.id}
                  className="overflow-hidden rounded-lg border border-[color:var(--figma-gray-border-03)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-04)] px-4 py-4">
                    <p className="min-w-0 flex-1 text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
                      {flowHeading}
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          ready
                            ? "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]"
                            : "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]",
                        )}
                      >
                        {ready ? "Ready" : "Needs attention"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[color:var(--figma-gray-border-02)] bg-white text-[color:var(--figma-primary-main)] hover:bg-[color:var(--figma-gray-bg-01)]"
                        onClick={() => onEditFlow(flow.id)}
                      >
                        <Pencil className="size-4 shrink-0" strokeWidth={1.75} />
                        Edit flow
                      </Button>
                    </div>
                  </div>

                  {architecture === "pixel" ? (
                    <div className="overflow-x-auto bg-white p-4">
                      {(() => {
                        const cols: React.ReactNode[] = [];
                        let needConnector = false;
                        if (career) {
                          cols.push(
                            <div key="career" className="flex min-w-0 shrink-0 flex-col gap-5">
                              <p className="text-xs font-medium text-[color:var(--figma-gray-text-04)]">
                                {career.name.trim() || "Career site"}
                              </p>
                              {careerCopied ? (
                                <p className="text-xs text-[color:var(--figma-gray-text-03)]">
                                  Copied
                                </p>
                              ) : null}
                              <ReviewPixelEventColumn
                                events={career.events}
                                architecture={architecture}
                              />
                            </div>,
                          );
                          needConnector = true;
                        }
                        for (const aid of flow.atsIds) {
                          const node = atsFlowNodesById[aid];
                          const a = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
                          if (!node || !a) continue;
                          if (needConnector) {
                            cols.push(<ReviewFlowColumnConnector key={`conn-${aid}`} />);
                          }
                          needConnector = true;
                          const atsCopied = showCopiedReuseHint(
                            node.copiedFromTemplateId,
                            node.copiedReuseHintDismissed,
                          );
                          cols.push(
                            <div key={aid} className="flex min-w-0 shrink-0 flex-col gap-5">
                              <div className="inline-flex w-fit rounded border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-03)] px-2 py-0.5">
                                <span className="text-xs font-medium text-[color:var(--figma-gray-text-04)]">
                                  {a.vendor.trim() || "ATS"}
                                </span>
                              </div>
                              {atsCopied ? (
                                <p className="text-xs text-[color:var(--figma-gray-text-03)]">
                                  Copied
                                </p>
                              ) : null}
                              <ReviewPixelEventColumn
                                events={a.events}
                                architecture={architecture}
                              />
                            </div>,
                          );
                        }
                        if (cols.length === 0) {
                          return (
                            <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                              No career site or ATS attached
                            </p>
                          );
                        }
                        return (
                          <div className="flex min-w-min flex-nowrap items-start gap-2">{cols}</div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <div className="rounded-md bg-[color:var(--figma-gray-bg-01)] p-3">
                      <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                        Career site
                      </p>
                      {career ? (
                        architecture === "s2s" ? (
                          <div className="mt-2 space-y-2 text-sm text-[color:var(--figma-gray-text-04)]">
                            <p>
                              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Node name:{" "}
                              </span>
                              {career.name}
                            </p>
                            {careerCopied ? (
                              <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                                Copied
                              </p>
                            ) : null}
                            <p>
                              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Node type:{" "}
                              </span>
                              Career Site
                            </p>
                            <p>
                              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Endpoint URL:{" "}
                              </span>
                              {(career.s2sEndpointUrl ?? "").trim() || "—"}
                            </p>
                            <p>
                              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Enabled events:{" "}
                              </span>
                              {enabledEventChips(career.events, "s2s").join(", ") || "—"}
                            </p>
                            <div>
                              <p className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Custom events
                              </p>
                              <ul className="mt-1 list-inside list-disc text-xs">
                                {career.events
                                  .filter((e) => e.type === "custom")
                                  .map((ev) => (
                                    <li key={ev.id}>
                                      {ev.label.trim() || "(unnamed)"} ({ev.eventKey})
                                      {ev.enabled ? "" : " — off"}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                            <p>
                              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                Readiness:{" "}
                              </span>
                              {isCareerTrackingComplete(career, "s2s") ? "Ready" : "Incomplete"}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
                            <p className="font-semibold text-[color:var(--figma-gray-text-05)]">
                              {career.name}
                            </p>
                            {careerCopied ? (
                              <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                                Copied
                              </p>
                            ) : null}
                            {career.baseUrl.trim() ? (
                              <p className="truncate text-xs">{career.baseUrl.trim()}</p>
                            ) : null}
                            <div className="mt-2 space-y-1.5">
                              {career.events
                                .filter((e) => e.type === "custom" || e.enabled)
                                .map((ev) => (
                                  <div
                                    key={ev.id}
                                    className={cn(
                                      "rounded border border-[color:var(--figma-gray-border-02)] bg-white px-2 py-1.5 text-[11px]",
                                      !isTrackingEventRowValid(ev, architecture) &&
                                        "border-[color:var(--figma-error-main)]",
                                    )}
                                  >
                                    <div className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      {ev.label}{" "}
                                      <span className="font-normal text-[color:var(--figma-gray-text-03)]">
                                        ({ev.eventKey})
                                      </span>
                                    </div>
                                    <div className="space-y-1 text-[color:var(--figma-gray-text-04)]">
                                      <div>
                                        <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                          Event name:{" "}
                                        </span>
                                        {ev.label}
                                      </div>
                                      <div>
                                        <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                          Event token:{" "}
                                        </span>
                                        {ev.eventKey}
                                      </div>
                                      <div>
                                        <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                          Pixel method:{" "}
                                        </span>
                                        {ev.trackingMethod}
                                      </div>
                                      <div>
                                        <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                          Exact event URL:{" "}
                                        </span>
                                        {ev.url.trim() || "—"}
                                      </div>
                                      <div>
                                        <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                          Generated tracking pattern:{" "}
                                        </span>
                                        {(() => {
                                          const d = deriveTrackingPattern(ev.url, career.baseUrl);
                                          if (!ev.url.trim() || !d.valid) return "—";
                                          return d.generatedPattern;
                                        })()}
                                      </div>
                                    </div>
                                    <div
                                      className={
                                        isTrackingEventRowValid(ev, architecture)
                                          ? "text-[color:var(--figma-success-main)]"
                                          : "text-[color:var(--figma-error-main)]"
                                      }
                                    >
                                      {isTrackingEventRowValid(ev, architecture)
                                        ? "Valid"
                                        : "Incomplete"}
                                    </div>
                                  </div>
                                ))}
                              {career.events.every((e) => !e.enabled) ? (
                                <p className="text-xs text-[color:var(--figma-gray-text-03)]">
                                  No events enabled
                                </p>
                              ) : null}
                            </div>
                          </div>
                        )
                      ) : (
                        <p className="mt-2 text-sm text-[color:var(--figma-gray-text-03)]">
                          None attached
                        </p>
                      )}
                    </div>
                    <div className="rounded-md bg-[color:var(--figma-gray-bg-01)] p-3">
                      <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                        ATS
                      </p>
                      {flow.atsIds.length === 0 ? (
                        <p className="mt-2 text-sm text-[color:var(--figma-gray-text-03)]">
                          None attached
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-3">
                          {flow.atsIds.map((aid) => {
                            const node = atsFlowNodesById[aid];
                            const a = mergedAtsFromMaps(aid, atsFlowNodesById, atsTemplatesById);
                            if (!a || !node) return null;
                            const atsCopied = showCopiedReuseHint(
                              node.copiedFromTemplateId,
                              node.copiedReuseHintDismissed,
                            );
                            if (architecture === "s2s") {
                              return (
                                <li
                                  key={aid}
                                  className="space-y-1.5 rounded-md border border-[color:var(--figma-gray-border-02)] bg-white p-3 text-sm text-[color:var(--figma-gray-text-04)]"
                                >
                                  <p className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                    {a.vendor}
                                  </p>
                                  {atsCopied ? (
                                    <p className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                                      Copied
                                    </p>
                                  ) : null}
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Node type:{" "}
                                    </span>
                                    ATS
                                  </p>
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Event source:{" "}
                                    </span>
                                    {s2sEventSourceLabel(a.s2sEventSource) || "—"}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Endpoint URL:{" "}
                                    </span>
                                    {a.endpointUrl.trim() || "—"}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Enabled events:{" "}
                                    </span>
                                    {enabledEventChips(a.events, "s2s").join(", ") || "—"}
                                  </p>
                                  <div>
                                    <p className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Custom events
                                    </p>
                                    <ul className="mt-1 list-inside list-disc text-xs">
                                      {a.events
                                        .filter((e) => e.type === "custom")
                                        .map((ev) => (
                                          <li key={ev.id}>
                                            {ev.label.trim() || "(unnamed)"} ({ev.eventKey})
                                            {ev.enabled ? "" : " — off"}
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Test status:{" "}
                                    </span>
                                    {s2sTestStatusLabel(a.s2sTestStatus)}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                      Readiness:{" "}
                                    </span>
                                    {isAtsTrackingComplete(a, "s2s") ? "Ready" : "Incomplete"}
                                  </p>
                                </li>
                              );
                            }
                            return (
                              <li
                                key={aid}
                                className="text-sm text-[color:var(--figma-gray-text-04)]"
                              >
                                <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                  {a.vendor}
                                </span>
                                {atsCopied ? (
                                  <p className="mt-1 text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                                    Copied
                                  </p>
                                ) : null}
                                <div className="mt-1 space-y-1.5">
                                  {a.events
                                    .filter((e) => e.type === "custom" || e.enabled)
                                    .map((ev) => (
                                      <div
                                        key={ev.id}
                                        className={cn(
                                          "rounded border border-[color:var(--figma-gray-border-02)] bg-white px-2 py-1.5 text-[11px]",
                                          !isTrackingEventRowValid(ev, architecture) &&
                                            "border-[color:var(--figma-error-main)]",
                                        )}
                                      >
                                        <div className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                          {ev.label}{" "}
                                          <span className="font-normal text-[color:var(--figma-gray-text-03)]">
                                            ({ev.eventKey})
                                          </span>
                                        </div>
                                        <div className="space-y-1 text-[color:var(--figma-gray-text-04)]">
                                          <div>
                                            <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                              Event name:{" "}
                                            </span>
                                            {ev.label}
                                          </div>
                                          <div>
                                            <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                              Event token:{" "}
                                            </span>
                                            {ev.eventKey}
                                          </div>
                                          <div>
                                            <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                              Pixel method:{" "}
                                            </span>
                                            {ev.trackingMethod}
                                          </div>
                                          <div>
                                            <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                              Exact event URL:{" "}
                                            </span>
                                            {ev.url.trim() || "—"}
                                          </div>
                                          <div>
                                            <span className="font-medium text-[color:var(--figma-gray-text-05)]">
                                              Generated tracking pattern:{" "}
                                            </span>
                                            {(() => {
                                              const d = deriveTrackingPattern(
                                                ev.url,
                                                a.endpointUrl,
                                              );
                                              if (!ev.url.trim() || !d.valid) return "—";
                                              return d.generatedPattern;
                                            })()}
                                          </div>
                                        </div>
                                        <div
                                          className={
                                            isTrackingEventRowValid(ev, architecture)
                                              ? "text-[color:var(--figma-success-main)]"
                                              : "text-[color:var(--figma-error-main)]"
                                          }
                                        >
                                          {isTrackingEventRowValid(ev, architecture)
                                            ? "Valid"
                                            : "Incomplete"}
                                        </div>
                                      </div>
                                    ))}
                                  {a.events.every((e) => !e.enabled) ? (
                                    <span className="text-xs text-[color:var(--figma-gray-text-03)]">
                                      No events enabled
                                    </span>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--figma-gray-border-02)] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[1136px] flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            Back to edit
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {onPublish ? null : (
              <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>
                Save as draft
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!reviewEnabled}
              className={cn(
                "min-w-[120px] bg-[color:var(--figma-primary-main)] text-[color:var(--figma-on-primary-label)] hover:bg-[color:var(--figma-primary-main)]/90",
                !reviewEnabled && "opacity-50",
              )}
              onClick={() => {
                if (!reviewEnabled) return;
                if (onPublish) onPublish();
                else onLaunch();
              }}
            >
              {onPublish ? "Publish changes" : "Launch setup"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchTrackingStage({
  architecture,
  flowsCount,
  careerSitesCount,
  atsCount,
  defaultEventsEnabled,
  customEventsCount,
  customEventsEnabledCount,
  launchContext = "initial",
  onExitForNow,
  onGoToInstallationGuide,
  onRunTests,
  onGoToDashboard,
}: {
  architecture: Architecture;
  flowsCount: number;
  careerSitesCount: number;
  atsCount: number;
  defaultEventsEnabled: number;
  customEventsCount: number;
  customEventsEnabledCount: number;
  /** `afterPublish` = same layout after editing a launched setup and publishing. */
  launchContext?: "initial" | "afterPublish";
  onExitForNow: () => void;
  onGoToInstallationGuide: () => void;
  onRunTests: () => void;
  onGoToDashboard: () => void;
}) {
  type NextStepRow = {
    title: string;
    body: string;
    action: string;
    icon: React.ComponentType<{ className?: string }>;
    onAction: () => void;
  };

  const nextStepsPixel: NextStepRow[] = [
    {
      title: "Share setup details with the client developer",
      body: "Send the generated URLs, endpoints, and event mapping for implementation.",
      action: "Installation guide",
      icon: ChevronRight,
      onAction: onGoToInstallationGuide,
    },
    {
      title: "Run validation in Test Tracking",
      body: "Confirm VIEW, APPLY_START, and APPLY_FINISH are firing for every selected flow.",
      action: "Test mode",
      icon: ChevronRight,
      onAction: onRunTests,
    },
    {
      title: "Monitor Tracking Health",
      body: "Watch event volume, failures, missing parameters, and last-seen timestamps after launch.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
    {
      title: "Review reports after data starts flowing",
      body: "Use funnel reports to check click-to-apply and apply-completion tracking accuracy.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
  ];

  const nextStepsS2s: NextStepRow[] = [
    {
      title: "Share setup details with the client developer",
      body: "Provide event source choices and postback URLs for each career site and ATS node.",
      action: "Installation guide",
      icon: ChevronRight,
      onAction: onGoToInstallationGuide,
    },
    {
      title: "Run validation in Test Tracking",
      body: "Send test events and confirm payloads match expected keys for each funnel step.",
      action: "Test mode",
      icon: ChevronRight,
      onAction: onRunTests,
    },
    {
      title: "Monitor Tracking Health",
      body: "Watch delivery success and error rates for server-side events.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
    {
      title: "Review reports after data starts flowing",
      body: "Use funnel reports once S2S events are flowing into analytics.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
  ];

  const nextSteps = architecture === "s2s" ? nextStepsS2s : nextStepsPixel;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--figma-gray-bg-04)]">
      <div className="shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-white px-6 py-4">
        <SetupStepper stage={4} disableNavigation />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[560px] rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white px-8 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[color:var(--figma-success-main)] text-white">
            <Check className="size-8" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-xl font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
            {launchContext === "afterPublish"
              ? "Changes published successfully"
              : architecture === "s2s"
                ? "Server-to-server tracking setup launched"
                : "You're All Set! Let's begin!"}
          </h1>
          <p className="mt-2 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
            {launchContext === "afterPublish"
              ? "Our team will get in touch with you to help in further installation."
              : architecture === "s2s"
                ? "Your S2S tracking flow is now active for Allied Services."
                : "Our team will get in touch with you to help in further installation."}
          </p>
          {architecture === "s2s" ? (
            <ul className="mx-auto mt-6 max-w-md space-y-1.5 text-left text-sm text-[color:var(--figma-gray-text-04)]">
              <li>Architecture: Server-to-server Tracking</li>
              <li>Flows launched: {flowsCount}</li>
              <li>Events selected: {defaultEventsEnabled}</li>
              <li>
                Custom events: {customEventsEnabledCount} enabled ({customEventsCount} rows)
              </li>
              <li>Career sites: {careerSitesCount}</li>
              <li>ATS nodes: {atsCount}</li>
              <li>Status: Live</li>
            </ul>
          ) : (
            <ul className="mx-auto mt-6 max-w-md space-y-1.5 text-left text-sm text-[color:var(--figma-gray-text-04)]">
              <li>Flows created: {flowsCount}</li>
              <li>Career sites configured: {careerSitesCount}</li>
              <li>ATS templates configured: {atsCount}</li>
              <li>Default events enabled: {defaultEventsEnabled}</li>
              <li>Custom events added: {customEventsCount}</li>
            </ul>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onExitForNow}>
              Exit for now
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[color:var(--figma-primary-main)] text-[color:var(--figma-on-primary-label)] hover:bg-[color:var(--figma-primary-main)]/90"
              onClick={onGoToInstallationGuide}
            >
              Go to installation guide
            </Button>
          </div>
        </div>

        <div className="mt-8 w-full max-w-[640px] rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold text-[color:var(--figma-gray-text-05)]">
            What happens next?
          </h2>
          <ul className="mt-4 space-y-4">
            {nextSteps.map((row) => {
              const Icon = row.icon;
              return (
                <li
                  key={row.title}
                  className="flex gap-3 border-b border-[color:var(--figma-gray-border-02)] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                      {row.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                      {row.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={row.onAction}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[color:var(--figma-secondary-main)] hover:underline"
                  >
                    {row.action}
                    <Icon className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ConfigureTrackingSetup({
  onStageChange,
}: {
  /** Fires when the wizard step changes (e.g. to toggle app chrome). */
  onStageChange?: (stage: WizardStage) => void;
} = {}) {
  const navigate = useNavigate();
  const [stage, setStage] = React.useState<WizardStage>(1);

  React.useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);
  const [architecture, setArchitecture] = React.useState<Architecture>("pixel");
  const [flows, setFlows] = React.useState<FlowState[]>(initialFlows);
  const [careerTemplatesById, setCareerTemplatesById] = React.useState<
    Record<string, CareerSiteTemplate>
  >({});
  const [careerFlowNodesById, setCareerFlowNodesById] = React.useState<
    Record<string, CareerFlowNodeState>
  >({});
  const [atsFlowNodesById, setAtsFlowNodesById] = React.useState<Record<string, AtsFlowNodeState>>(
    {},
  );
  const [atsTemplatesById, setAtsTemplatesById] = React.useState<Record<string, AtsTemplate>>({});
  const [eventOwnershipResolution, setEventOwnershipResolution] = React.useState<
    Record<string, EventOwnershipResolution>
  >({});
  const [selection, setSelection] = React.useState<Selection | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [exitOpen, setExitOpen] = React.useState(false);
  const [careerSiteSerial, setCareerSiteSerial] = React.useState(1);
  const [flowCanvasScale, setFlowCanvasScale] = React.useState(1);
  const flowCanvasScaleRef = React.useRef(flowCanvasScale);
  const flowCanvasScrollRef = React.useRef<HTMLDivElement | null>(null);
  const flowPinchRef = React.useRef<{ startDist: number; startScale: number } | null>(null);
  const [pendingDeleteFlowId, setPendingDeleteFlowId] = React.useState<string | null>(null);
  const [lifecycleMode, setLifecycleMode] = React.useState<
    "wizard" | "draftRestored" | "liveReadOnly" | "liveEditing" | "liveReview" | "publishSuccess"
  >("wizard");
  const [liveSnapshot, setLiveSnapshot] = React.useState<SetupSnapshot | null>(null);
  const [workingCopy, setWorkingCopy] = React.useState<SetupSnapshot | null>(null);
  const [discardDraftOpen, setDiscardDraftOpen] = React.useState(false);
  const [newClientSetupOpen, setNewClientSetupOpen] = React.useState(false);
  const [cancelLiveEditOpen, setCancelLiveEditOpen] = React.useState(false);
  const [lastDraftSavedLabel, setLastDraftSavedLabel] = React.useState<string | null>(null);
  /** Launch screen (step 4) copy: first-time launch vs after publishing live edits. */
  const [launchSuccessContext, setLaunchSuccessContext] = React.useState<
    "initial" | "afterPublish"
  >("initial");
  const hydratedRef = React.useRef(false);

  const readOnlySetup = lifecycleMode === "liveReadOnly";
  const liveEditing = lifecycleMode === "liveEditing";

  const buildSnapshot = React.useCallback(
    (): SetupSnapshot => ({
      version: SETUP_DATA_VERSION,
      wizardStage: stage,
      architecture,
      flows,
      careerTemplatesById,
      careerFlowNodesById,
      atsTemplatesById,
      atsFlowNodesById,
      careerSiteSerial,
      flowCanvasScale,
      selection,
      eventOwnershipResolution,
    }),
    [
      stage,
      architecture,
      flows,
      careerTemplatesById,
      careerFlowNodesById,
      atsTemplatesById,
      atsFlowNodesById,
      careerSiteSerial,
      flowCanvasScale,
      selection,
      eventOwnershipResolution,
    ],
  );

  const applySnapshot = React.useCallback((snap: SetupSnapshot) => {
    setArchitecture(snap.architecture);
    setFlows(snap.flows.length ? snap.flows : initialFlows());
    setCareerTemplatesById(snap.careerTemplatesById ?? {});
    setCareerFlowNodesById(snap.careerFlowNodesById ?? {});
    setAtsFlowNodesById(snap.atsFlowNodesById ?? {});
    setAtsTemplatesById(snap.atsTemplatesById ?? {});
    setEventOwnershipResolution(snap.eventOwnershipResolution ?? {});
    setCareerSiteSerial(snap.careerSiteSerial ?? 1);
    if (snap.flowCanvasScale != null) setFlowCanvasScale(snap.flowCanvasScale);
    setSelection(snap.selection ?? null);
  }, []);

  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (typeof window === "undefined") return;
    const live = loadLive();
    if (live) {
      applySnapshot(live);
      setStage(2);
      setLifecycleMode("liveReadOnly");
      setLiveSnapshot(cloneSnapshot(live));
      return;
    }
    const d = loadDraft();
    if (d) {
      applySnapshot(d);
      setStage(d.wizardStage);
      setLifecycleMode("draftRestored");
      const m = loadMode();
      if (m?.lastSavedAt) {
        setLastDraftSavedLabel(new Date(m.lastSavedAt).toLocaleString());
      }
    }
  }, [applySnapshot]);

  /** Sync duplicate-name errors onto flow node maps after any career/ATS change. */
  React.useEffect(() => {
    const m = markCustomDuplicateErrorsForFlowNodes(careerFlowNodesById, atsFlowNodesById);
    const cEq = JSON.stringify(m.careerFlowNodesById) === JSON.stringify(careerFlowNodesById);
    const aEq = JSON.stringify(m.atsFlowNodesById) === JSON.stringify(atsFlowNodesById);
    if (cEq && aEq) return;
    setCareerFlowNodesById(m.careerFlowNodesById);
    setAtsFlowNodesById(m.atsFlowNodesById);
  }, [careerFlowNodesById, atsFlowNodesById]);

  React.useEffect(() => {
    flowCanvasScaleRef.current = flowCanvasScale;
  }, [flowCanvasScale]);

  const markDirty = React.useCallback(() => setDirty(true), []);

  const onFlowCanvasTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (dist > 0)
        flowPinchRef.current = { startDist: dist, startScale: flowCanvasScaleRef.current };
    }
  }, []);

  const onFlowCanvasTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && flowPinchRef.current) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const { startDist, startScale } = flowPinchRef.current;
      if (startDist <= 0) return;
      setFlowCanvasScale(clampFlowCanvasScale(startScale * (dist / startDist)));
    }
  }, []);

  const onFlowCanvasTouchEnd = React.useCallback(() => {
    flowPinchRef.current = null;
  }, []);

  React.useEffect(() => {
    const el = flowCanvasScrollRef.current;
    if (!el || stage !== 2) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setFlowCanvasScale((s) => clampFlowCanvasScale(s - e.deltaY * 0.01));
    };
    const onTouchMovePassive = (e: TouchEvent) => {
      if (e.touches.length === 2 && flowPinchRef.current) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMovePassive, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMovePassive);
    };
  }, [stage]);

  const reviewEnabled = canOpenReview(
    flows,
    careerTemplatesById,
    careerFlowNodesById,
    atsTemplatesById,
    atsFlowNodesById,
    architecture,
  );

  React.useEffect(() => {
    if (stage !== 2) return;
    const first = flows[0];
    if (!first) return;
    if (selection === null) {
      setSelection({ kind: "flow", flowId: first.id });
    }
  }, [stage, flows, selection]);

  React.useEffect(() => {
    if (stage !== 2) return;
    setFlows((prev) =>
      applyAutoFlowNamesToFlows(
        prev,
        careerFlowNodesById,
        careerTemplatesById,
        atsFlowNodesById,
        atsTemplatesById,
        architecture,
      ),
    );
  }, [
    stage,
    architecture,
    careerFlowNodesById,
    careerTemplatesById,
    atsFlowNodesById,
    atsTemplatesById,
    flows.map((f) => `${f.id}:${f.nameMode ?? "auto"}`).join("|"),
  ]);

  const resolveSelection = (): { flow: FlowState; selection: Selection } | null => {
    if (!selection) return null;
    const flow = flows.find((f) => f.id === selection.flowId);
    if (!flow) return null;
    return { flow, selection };
  };

  const handleArchitectureNext = () => {
    setFlows((prev) => (prev.length ? prev : initialFlows()));
    setStage(2);
  };

  const updateFlow = (
    flowId: string,
    patch: Partial<FlowState> | ((f: FlowState) => FlowState),
  ) => {
    setFlows((prev) =>
      prev.map((f) => {
        if (f.id !== flowId) return f;
        return typeof patch === "function" ? patch(f) : { ...f, ...patch };
      }),
    );
    markDirty();
  };

  const updateCareerTemplate = (templateId: string, patch: Partial<CareerSiteTemplate>) => {
    setCareerTemplatesById((prev) => {
      const t = prev[templateId];
      if (!t) return prev;
      return { ...prev, [templateId]: { ...t, ...patch } };
    });
    markDirty();
  };

  const updateCareerFlowNode = (nodeId: string, patch: Partial<CareerFlowNodeState>) => {
    setCareerFlowNodesById((prev) => {
      const n = prev[nodeId];
      if (!n) return prev;
      const shouldDismiss =
        Boolean(n.copiedFromTemplateId) &&
        !n.copiedReuseHintDismissed &&
        careerPatchDismissesCopiedReuseHint(patch);
      return {
        ...prev,
        [nodeId]: {
          ...n,
          ...patch,
          ...(shouldDismiss ? { copiedReuseHintDismissed: true } : {}),
        },
      };
    });
    markDirty();
  };

  const updateAtsFlowNode = (nodeId: string, patch: Partial<AtsFlowNodeState>) => {
    setAtsFlowNodesById((prev) => {
      const a = prev[nodeId];
      if (!a) return prev;
      const shouldDismiss =
        Boolean(a.copiedFromTemplateId) &&
        !a.copiedReuseHintDismissed &&
        atsPatchDismissesCopiedReuseHint(patch);
      return {
        ...prev,
        [nodeId]: {
          ...a,
          ...patch,
          ...(shouldDismiss ? { copiedReuseHintDismissed: true } : {}),
        },
      };
    });
    markDirty();
  };

  const updateAtsTemplate = (templateId: string, patch: Partial<AtsTemplate>) => {
    setAtsTemplatesById((prev) => {
      const t = prev[templateId];
      if (!t) return prev;
      return { ...prev, [templateId]: { ...t, ...patch } };
    });
    markDirty();
  };

  const selectFlow = (flowId: string) => {
    setSelection({ kind: "flow", flowId });
  };

  const selectCareerSite = (flowId: string) => {
    setSelection({ kind: "career", flowId });
  };

  const createCareerSiteForFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.careerFlowNodeId) return;
    if (Object.keys(careerTemplatesById).length >= 2) {
      toast.message(
        "Maximum 2 unique career sites are allowed for one client. Reuse an existing career site instead.",
      );
      return;
    }
    const templateId = newId();
    const nodeId = newId();
    const name = `career site ${careerSiteSerial}`;
    setCareerSiteSerial((n) => n + 1);
    setCareerTemplatesById((prev) => ({ ...prev, [templateId]: { name, baseUrl: "" } }));

    const firstAtsId = flow.atsIds[0] ?? null;
    const firstAtsNode = firstAtsId ? atsFlowNodesById[firstAtsId] : undefined;
    const firstAtsTmpl = firstAtsNode ? atsTemplatesById[firstAtsNode.templateId] : undefined;
    const mergedFirstAts =
      firstAtsNode && firstAtsTmpl ? mergeAtsTemplateAndNode(firstAtsTmpl, firstAtsNode) : null;
    const earliestFunnel = mergedFirstAts
      ? getEarliestEnabledFunnelEvent(mergedFirstAts.events)
      : null;
    const hasOwnershipConflict = Boolean(earliestFunnel);

    const nodeState: CareerFlowNodeState =
      architecture === "s2s"
        ? {
            templateId,
            defaultCareerSiteName: name,
            events:
              hasOwnershipConflict && earliestFunnel
                ? buildInitialCareerEventsForOwnershipConflict(architecture, earliestFunnel)
                : createS2sDefaultCareerEvents(),
            s2sEventSource: "",
            s2sEndpointUrl: "",
            s2sTestStatus: "not_tested",
          }
        : {
            templateId,
            defaultCareerSiteName: name,
            events:
              hasOwnershipConflict && earliestFunnel
                ? buildInitialCareerEventsForOwnershipConflict(architecture, earliestFunnel)
                : createDefaultCareerEvents(),
          };
    setCareerFlowNodesById((prev) => ({ ...prev, [nodeId]: nodeState }));
    updateFlow(flowId, { careerFlowNodeId: nodeId });
    setSelection({ kind: "career", flowId });
    markDirty();
  };

  const attachCareerSiteToFlow = (flowId: string, templateId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.careerFlowNodeId) return;
    if (!careerTemplatesById[templateId]) return;
    const nodeId = newId();
    const tmplRef = careerTemplatesById[templateId];
    const defaultCareerSiteName =
      (tmplRef?.name ?? "").trim() || `career site ${careerSiteSerial}`;

    const firstAtsId = flow.atsIds[0] ?? null;
    const firstAtsNode = firstAtsId ? atsFlowNodesById[firstAtsId] : undefined;
    const firstAtsTmpl = firstAtsNode ? atsTemplatesById[firstAtsNode.templateId] : undefined;
    const mergedFirstAts =
      firstAtsNode && firstAtsTmpl ? mergeAtsTemplateAndNode(firstAtsTmpl, firstAtsNode) : null;
    const earliestFunnel = mergedFirstAts
      ? getEarliestEnabledFunnelEvent(mergedFirstAts.events)
      : null;
    const hasOwnershipConflict = Boolean(earliestFunnel);

    const nodeState: CareerFlowNodeState =
      architecture === "s2s"
        ? {
            templateId,
            copiedFromTemplateId: templateId,
            defaultCareerSiteName,
            events:
              hasOwnershipConflict && earliestFunnel
                ? buildInitialCareerEventsForOwnershipConflict(architecture, earliestFunnel)
                : createS2sDefaultCareerEvents(),
            s2sEventSource: "",
            s2sEndpointUrl: "",
            s2sTestStatus: "not_tested",
          }
        : {
            templateId,
            copiedFromTemplateId: templateId,
            defaultCareerSiteName,
            events:
              hasOwnershipConflict && earliestFunnel
                ? buildInitialCareerEventsForOwnershipConflict(architecture, earliestFunnel)
                : createDefaultCareerEvents(),
          };
    setCareerFlowNodesById((prev) => ({ ...prev, [nodeId]: nodeState }));
    updateFlow(flowId, { careerFlowNodeId: nodeId });
    setSelection({ kind: "career", flowId });
    markDirty();
  };

  const removeCareerSite = (flowId: string) => {
    const nodeId = flows.find((f) => f.id === flowId)?.careerFlowNodeId ?? null;
    setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, careerFlowNodeId: null } : f)));
    if (nodeId) {
      setCareerFlowNodesById((cat) => {
        const { [nodeId]: _, ...rest } = cat;
        return rest;
      });
      setEventOwnershipResolution((m) => filterResolutionKeysForCareerNode(m, nodeId));
    }
    setSelection({ kind: "flow", flowId });
    markDirty();
  };

  const createNewAtsTemplateForFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.atsIds.length >= atsLimitPerFlow) {
      toast.message("Only one ATS can be added per flow.");
      return;
    }
    if (Object.keys(atsTemplatesById).length >= atsTemplateLimit) {
      toast.message(
        `Maximum ${atsTemplateLimit} ATS definitions for one client. Attach an existing ATS instead.`,
      );
      return;
    }
    const tid = newId();
    const nid = newId();
    const vendor = nextUnusedTemplateVendor(atsTemplatesById);
    const defaults = emptyAts(vendor, architecture);
    setAtsTemplatesById((prev) => ({
      ...prev,
      [tid]: { vendor: defaults.vendor, endpointUrl: defaults.endpointUrl },
    }));
    const node: AtsFlowNodeState =
      architecture === "s2s"
        ? {
            templateId: tid,
            events: createS2sDefaultAtsEvents(),
            s2sEventSource: "",
            s2sTestStatus: "not_tested",
          }
        : {
            templateId: tid,
            events: createDefaultAtsEvents(),
          };
    setAtsFlowNodesById((prev) => ({ ...prev, [nid]: node }));
    updateFlow(flowId, (f) => ({ ...f, atsIds: [...f.atsIds, nid] }));
    setSelection({ kind: "ats", flowId, atsId: nid });
    toast.message(`Added ${vendor}.`);
    markDirty();
  };

  const attachAtsTemplateToFlow = (flowId: string, templateId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.atsIds.length >= atsLimitPerFlow) {
      toast.message("Only one ATS can be added per flow.");
      return;
    }
    if (!atsTemplatesById[templateId]) return;
    const nid = newId();
    const node: AtsFlowNodeState =
      architecture === "s2s"
        ? {
            templateId,
            copiedFromTemplateId: templateId,
            events: createS2sDefaultAtsEvents(),
            s2sEventSource: "",
            s2sTestStatus: "not_tested",
          }
        : {
            templateId,
            copiedFromTemplateId: templateId,
            events: createDefaultAtsEvents(),
          };
    setAtsFlowNodesById((prev) => ({ ...prev, [nid]: node }));
    updateFlow(flowId, (f) => ({ ...f, atsIds: [...f.atsIds, nid] }));
    setSelection({ kind: "ats", flowId, atsId: nid });
    markDirty();
  };

  const copyAtsNodeFromOtherFlow = (flowId: string, sourceNodeId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    const src = atsFlowNodesById[sourceNodeId];
    if (!flow || !src || flow.atsIds.length >= atsLimitPerFlow) {
      toast.message("Only one ATS can be added per flow.");
      return;
    }
    const tid = src.templateId;
    if (!atsTemplatesById[tid]) return;
    const nid = newId();
    const node: AtsFlowNodeState = {
      templateId: tid,
      copiedFromTemplateId: tid,
      events: JSON.parse(JSON.stringify(src.events)) as AtsFlowNodeState["events"],
      s2sEventSource: src.s2sEventSource,
      s2sTestStatus: src.s2sTestStatus ?? "not_tested",
    };
    setAtsFlowNodesById((prev) => ({ ...prev, [nid]: node }));
    updateFlow(flowId, (f) => ({ ...f, atsIds: [...f.atsIds, nid] }));
    setSelection({ kind: "ats", flowId, atsId: nid });
    toast.message("Copied ATS tracking into this flow.");
    markDirty();
  };

  const removeAtsFromFlow = (flowId: string, atsNodeId: string) => {
    const nextFlows = flows.map((f) =>
      f.id === flowId ? { ...f, atsIds: f.atsIds.filter((id) => id !== atsNodeId) } : f,
    );
    const { [atsNodeId]: _, ...nextNodes } = atsFlowNodesById;
    const nextTemplates = pruneAtsTemplatesForFlows(nextFlows, nextNodes, atsTemplatesById);
    setFlows(nextFlows);
    setAtsFlowNodesById(nextNodes);
    setAtsTemplatesById(nextTemplates);
    setEventOwnershipResolution((m) => filterResolutionKeysForAtsNode(m, atsNodeId));
    setSelection({ kind: "flow", flowId });
    markDirty();
  };

  const addFlow = () => {
    const n = flows.length + 1;
    const flow: FlowState = {
      id: newId(),
      name: `Flow ${n}`,
      nameMode: "auto",
      careerFlowNodeId: null,
      atsIds: [],
    };
    setFlows((prev) => [...prev, flow]);
    setSelection({ kind: "flow", flowId: flow.id });
    markDirty();
  };

  const duplicateFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    const n = flows.length + 1;
    const clonedFlowId = newId();

    let newCareerNodeId: string | null = null;
    if (flow.careerFlowNodeId) {
      const oldNode = careerFlowNodesById[flow.careerFlowNodeId];
      if (oldNode) {
        const clonedCareerNodeId = newId();
        newCareerNodeId = clonedCareerNodeId;
        setCareerFlowNodesById((p) => ({
          ...p,
          [clonedCareerNodeId]: (() => {
            const c = JSON.parse(JSON.stringify(oldNode)) as CareerFlowNodeState;
            delete c.funnelOwnershipReviewActive;
            delete c.copiedReuseHintDismissed;
            return c;
          })(),
        }));
      }
    }

    const newAtsIds: string[] = [];
    const atsAdditions: Record<string, AtsFlowNodeState> = {};
    for (const aid of flow.atsIds) {
      const oldAts = atsFlowNodesById[aid];
      if (!oldAts) continue;
      const nid = newId();
      newAtsIds.push(nid);
      const clonedAts = JSON.parse(JSON.stringify(oldAts)) as AtsFlowNodeState;
      delete clonedAts.copiedReuseHintDismissed;
      atsAdditions[nid] = clonedAts;
    }
    if (Object.keys(atsAdditions).length > 0) {
      setAtsFlowNodesById((p) => ({ ...p, ...atsAdditions }));
    }

    const cloned: FlowState = {
      id: clonedFlowId,
      name: `Flow ${n}`,
      nameMode: "auto",
      careerFlowNodeId: newCareerNodeId,
      atsIds: newAtsIds,
    };
    setFlows((prev) => [...prev, cloned]);
    setSelection({ kind: "flow", flowId: clonedFlowId });
    toast.message("Flow duplicated.");
    markDirty();
  };

  const requestDeleteFlow = (flowId: string) => {
    if (flows.length <= 1) return;
    setPendingDeleteFlowId(flowId);
  };

  const deleteFlow = (flowId: string) => {
    if (flows.length <= 1) {
      toast.error("You need at least one flow.");
      return;
    }
    const removed = flows.find((f) => f.id === flowId);
    const nextFlows = flows.filter((f) => f.id !== flowId);
    const careerNid = removed?.careerFlowNodeId;
    if (careerNid) {
      setCareerFlowNodesById((cat) => {
        const { [careerNid]: _, ...rest } = cat;
        return rest;
      });
    }
    const removedAts = removed?.atsIds ?? [];
    let nextAtsNodes = { ...atsFlowNodesById };
    for (const aid of removedAts) {
      delete nextAtsNodes[aid];
    }
    const nextAtsTemplates = pruneAtsTemplatesForFlows(nextFlows, nextAtsNodes, atsTemplatesById);
    setFlows(nextFlows);
    setAtsFlowNodesById(nextAtsNodes);
    setAtsTemplatesById(nextAtsTemplates);
    setEventOwnershipResolution((m) => filterResolutionKeysForFlow(m, flowId));
    if (selection?.flowId === flowId) {
      setSelection({ kind: "flow", flowId: nextFlows[0]!.id });
    }
    markDirty();
  };

  const confirmPendingDeleteFlow = () => {
    if (!pendingDeleteFlowId) return;
    deleteFlow(pendingDeleteFlowId);
    setPendingDeleteFlowId(null);
  };

  const pendingDeleteFlowName =
    pendingDeleteFlowId != null
      ? (flows.find((f) => f.id === pendingDeleteFlowId)?.name ?? "this flow")
      : "";

  const confirmDiscardStoredDraft = () => {
    setDiscardDraftOpen(false);
    clearDraft();
    setArchitecture("pixel");
    setFlows(initialFlows());
    setCareerTemplatesById({});
    setCareerFlowNodesById({});
    setAtsFlowNodesById({});
    setAtsTemplatesById({});
    setEventOwnershipResolution({});
    setCareerSiteSerial(1);
    setSelection(null);
    setDirty(false);
    setStage(1);
    setLifecycleMode("wizard");
    setLastDraftSavedLabel(null);
    toast.message("Draft discarded.");
  };

  const confirmStartNewClientSetup = () => {
    setNewClientSetupOpen(false);
    clearDraft();
    clearLive();
    saveMode({ mode: "firstTime" });
    setArchitecture("pixel");
    setFlows(initialFlows());
    setCareerTemplatesById({});
    setCareerFlowNodesById({});
    setAtsFlowNodesById({});
    setAtsTemplatesById({});
    setEventOwnershipResolution({});
    setCareerSiteSerial(1);
    setSelection(null);
    setDirty(false);
    setStage(1);
    setLifecycleMode("wizard");
    setLiveSnapshot(null);
    setWorkingCopy(null);
    setLastDraftSavedLabel(null);
    setFlowCanvasScale(1);
    toast.success("New client setup started.");
  };

  const confirmCancelLiveEdit = () => {
    setCancelLiveEditOpen(false);
    const baseline = workingCopy ?? liveSnapshot;
    if (baseline) applySnapshot(baseline);
    setLifecycleMode("liveReadOnly");
    setWorkingCopy(null);
    setDirty(false);
  };

  const saveDraft = () => {
    if (lifecycleMode === "liveReadOnly" || lifecycleMode === "liveEditing") {
      return;
    }
    const snap = { ...buildSnapshot(), wizardStage: 1 as const };
    persistDraft(snap, { mode: "draftRestored", lastSavedAt: new Date().toISOString() });
    setLastDraftSavedLabel(new Date().toLocaleString());
    setDirty(false);
    setLifecycleMode("wizard");
    setStage(1);
    toast.success("Draft saved. You can continue setup later.");
  };

  const goToFirstStepper = () => {
    setStage(1);
  };

  const requestExit = () => {
    if (dirty) {
      setExitOpen(true);
      return;
    }
    goToFirstStepper();
  };

  const exitFromLaunchScreen = () => {
    void navigate({ to: "/" });
  };

  const confirmExitDiscard = () => {
    setExitOpen(false);
    if (liveEditing) {
      const baseline = workingCopy ?? liveSnapshot;
      if (baseline) applySnapshot(baseline);
      setLifecycleMode("liveReadOnly");
      setWorkingCopy(null);
      setStage(1);
      setDirty(false);
      toast.message("Changes discarded.");
      return;
    }
    const live = loadLive();
    if (live) {
      applySnapshot(live);
      setLiveSnapshot(cloneSnapshot(live));
      setLifecycleMode("liveReadOnly");
      setWorkingCopy(null);
      setStage(1);
      setDirty(false);
      toast.message("Changes discarded.");
      return;
    }
    const d = loadDraft();
    if (d) {
      applySnapshot(d);
      setStage(1);
      setLifecycleMode("wizard");
      setDirty(false);
      const m = loadMode();
      if (m?.lastSavedAt) {
        setLastDraftSavedLabel(new Date(m.lastSavedAt).toLocaleString());
      }
      toast.message("Changes discarded.");
      return;
    }
    setArchitecture("pixel");
    setFlows(initialFlows());
    setCareerTemplatesById({});
    setCareerFlowNodesById({});
    setAtsFlowNodesById({});
    setAtsTemplatesById({});
    setEventOwnershipResolution({});
    setCareerSiteSerial(1);
    setSelection(null);
    setLifecycleMode("wizard");
    setStage(1);
    setDirty(false);
    toast.message("Changes discarded.");
  };

  const catalogEntries = React.useMemo(
    () =>
      Object.entries(careerTemplatesById).map(([id, t]) => ({
        id,
        name: t.name.trim() || "Untitled career site",
      })),
    [careerTemplatesById],
  );

  const resolveCareer = (f: FlowState): CareerSiteState | null => {
    const nid = f.careerFlowNodeId;
    if (!nid) return null;
    const node = careerFlowNodesById[nid];
    const tmpl = node ? careerTemplatesById[node.templateId] : null;
    if (!node || !tmpl) return null;
    return mergeCareerTemplateAndNode(tmpl, node);
  };

  const reviewBlockersList = React.useMemo(
    () =>
      reviewBlockers(
        flows,
        careerTemplatesById,
        careerFlowNodesById,
        atsTemplatesById,
        atsFlowNodesById,
        architecture,
      ),
    [flows, careerTemplatesById, careerFlowNodesById, atsTemplatesById, atsFlowNodesById, architecture],
  );

  React.useEffect(() => {
    if (stage !== 2) setPendingDeleteFlowId(null);
  }, [stage]);

  if (stage === 1) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[color:var(--figma-gray-bg-04)] p-6">
        <div className="mx-auto w-full max-w-[1136px] rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]">
          <SetupStepper stage={1} onGoToStage={(s) => setStage(s)} />
          <div className="mt-5 w-full border-t border-[color:var(--figma-gray-border-02)]" />
          <div className="mt-8">
            <h1 className="text-xl font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
              Configure tracking
            </h1>
            <p className="mt-2 max-w-[560px] text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
              Set up client pixels to track user interactions and optimize your campaigns
              effectively.
            </p>
            <p className="mt-8 text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-05)]">
              Choose tracking architecture
              <span className="text-[color:var(--figma-error-main)]">*</span>
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (architecture !== "pixel") markDirty();
                  setArchitecture("pixel");
                }}
                className={cn(
                  "flex gap-4 rounded-lg border-2 p-5 text-left transition-colors",
                  architecture === "pixel"
                    ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-gray-bg-04)]"
                    : "border-[color:var(--figma-gray-border-02)] bg-white hover:border-[color:var(--figma-gray-border-03)]",
                )}
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                    architecture === "pixel"
                      ? "bg-[color:var(--figma-secondary-lighter)]"
                      : "bg-[color:var(--figma-gray-bg-03)]",
                  )}
                >
                  <Monitor
                    className={cn(
                      "size-6",
                      architecture === "pixel"
                        ? "text-[color:var(--figma-secondary-main)]"
                        : "text-[color:var(--figma-gray-icon-04)]",
                    )}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold leading-5",
                      architecture === "pixel"
                        ? "text-[color:var(--figma-secondary-main)]"
                        : "text-[color:var(--figma-gray-text-05)]",
                    )}
                  >
                    Pixel tracking
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                    Page-based tracking using JavaScript or Image pixels
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (architecture !== "s2s") markDirty();
                  setArchitecture("s2s");
                }}
                className={cn(
                  "flex gap-4 rounded-lg border-2 p-5 text-left transition-colors",
                  architecture === "s2s"
                    ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-gray-bg-04)]"
                    : "border-[color:var(--figma-gray-border-02)] bg-white hover:border-[color:var(--figma-gray-border-03)]",
                )}
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                    architecture === "s2s"
                      ? "bg-[color:var(--figma-secondary-lighter)]"
                      : "bg-[color:var(--figma-gray-bg-03)]",
                  )}
                >
                  <Server
                    className={cn(
                      "size-6",
                      architecture === "s2s"
                        ? "text-[color:var(--figma-secondary-main)]"
                        : "text-[color:var(--figma-gray-icon-04)]",
                    )}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold leading-5",
                      architecture === "s2s"
                        ? "text-[color:var(--figma-secondary-main)]"
                        : "text-[color:var(--figma-gray-text-05)]",
                    )}
                  >
                    Server-to-server tracking
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                    Backend or webhook-based tracking
                  </p>
                </div>
              </button>
            </div>
            <div className="mt-10 flex justify-end">
              <Button
                type="button"
                className="min-w-[100px] bg-[color:var(--figma-primary-main)] text-[color:var(--figma-on-primary-label)] hover:bg-[color:var(--figma-primary-main)]/90"
                onClick={handleArchitectureNext}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 3) {
    const isLivePublish = liveEditing && liveSnapshot != null;
    const liveDiffLines = isLivePublish
      ? buildSetupDiffLines(liveSnapshot!, buildSnapshot(), architecture)
      : undefined;
    return (
      <>
        <ReviewTrackingStage
          architecture={architecture}
          flows={flows}
          careerTemplatesById={careerTemplatesById}
          careerFlowNodesById={careerFlowNodesById}
          atsTemplatesById={atsTemplatesById}
          atsFlowNodesById={atsFlowNodesById}
          reviewEnabled={reviewEnabled}
          blockers={reviewBlockersList}
          diffLines={liveDiffLines}
          onBack={() => {
            setStage(2);
            if (isLivePublish) setLifecycleMode("liveEditing");
          }}
          onSaveDraft={saveDraft}
          onLaunch={() => {
            const snap = buildSnapshot();
            saveLive({ ...snap, wizardStage: 4 }, { mode: "live" });
            clearDraft();
            setLiveSnapshot(cloneSnapshot({ ...snap, wizardStage: 4 }));
            setLifecycleMode("wizard");
            setLaunchSuccessContext("initial");
            setDirty(false);
            setStage(4);
            toast.success("Setup launched.");
          }}
          onPublish={
            isLivePublish
              ? () => {
                  const snap = buildSnapshot();
                  saveLive({ ...snap, wizardStage: 4 }, { mode: "live" });
                  setLiveSnapshot(cloneSnapshot({ ...snap, wizardStage: 4 }));
                  setWorkingCopy(null);
                  setLifecycleMode("liveReadOnly");
                  setLaunchSuccessContext("afterPublish");
                  setDirty(false);
                  setStage(4);
                  toast.success("Changes published successfully");
                }
              : undefined
          }
          onEditFlow={(flowId) => {
            setStage(2);
            setSelection({ kind: "flow", flowId });
          }}
          onExit={requestExit}
          onGoToStage={(s) => setStage(s)}
        />
        <ExitUnsavedChangesDialog
          open={exitOpen}
          onOpenChange={setExitOpen}
          onConfirmDiscard={confirmExitDiscard}
        />
      </>
    );
  }

  if (stage === 4) {
    return (
      <>
        <LaunchTrackingStage
          architecture={architecture}
          flowsCount={flows.length}
          careerSitesCount={Object.keys(careerTemplatesById).length}
          atsCount={Object.keys(atsTemplatesById).length}
          defaultEventsEnabled={countEnabledDefaultEventsFromFlowNodes(
            careerFlowNodesById,
            atsFlowNodesById,
          )}
          customEventsCount={countCustomEventsDefinedFromFlowNodes(
            careerFlowNodesById,
            atsFlowNodesById,
          )}
          customEventsEnabledCount={countEnabledCustomEventsFromFlowNodes(
            careerFlowNodesById,
            atsFlowNodesById,
          )}
          launchContext={launchSuccessContext}
          onExitForNow={exitFromLaunchScreen}
          onGoToInstallationGuide={() => {
            void navigate({ to: "/installation-guide" });
          }}
          onRunTests={() => {
            void navigate({ to: "/test-mode" });
          }}
          onGoToDashboard={() => {
            void navigate({ to: "/" });
          }}
        />
        <ExitUnsavedChangesDialog
          open={exitOpen}
          onOpenChange={setExitOpen}
          onConfirmDiscard={confirmExitDiscard}
        />
      </>
    );
  }

  const ctx = resolveSelection();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="z-30 shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4">
            <SetupStepper
              stage={2}
              onGoToStage={(s) => setStage(s)}
              disableNavigation={readOnlySetup}
            />
          </div>
          {liveEditing ? (
            <div className="border-t border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-warning-lighter)]/35 px-6 py-2.5">
              <p className="text-sm leading-5 text-[color:var(--figma-gray-text-05)]">
                <span className="font-semibold">Editing live setup</span>
                <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                  {" "}
                  — Changes will not affect the live setup until you publish them.
                </span>
              </p>
            </div>
          ) : null}
          <div className="w-full border-t border-[color:var(--figma-gray-border-02)]" />
          <div className="flex flex-nowrap items-center justify-between gap-4 overflow-x-auto px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
                Tracking Flow
              </h1>
              {lastDraftSavedLabel &&
              (lifecycleMode === "wizard" || lifecycleMode === "draftRestored") ? (
                <p className="mt-0.5 text-xs text-[color:var(--figma-gray-text-03)]">
                  Last draft saved {lastDraftSavedLabel}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-nowrap items-center gap-2">
              {readOnlySetup ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!liveSnapshot) return;
                      setWorkingCopy(cloneSnapshot(liveSnapshot));
                      setLifecycleMode("liveEditing");
                      setDirty(false);
                    }}
                  >
                    Edit setup
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewClientSetupOpen(true)}
                  >
                    New client setup
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={requestExit}>
                    Exit
                  </Button>
                </>
              ) : liveEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelLiveEditOpen(true)}
                  >
                    Cancel edits
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!reviewEnabled}
                    className={cn(!reviewEnabled && "opacity-50")}
                    onClick={() => {
                      if (reviewEnabled) setStage(3);
                    }}
                  >
                    Review changes
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={requestExit}>
                    Exit
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
                    Save as draft
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!reviewEnabled}
                    className={cn(!reviewEnabled && "opacity-50")}
                    onClick={() => {
                      if (reviewEnabled) setStage(3);
                    }}
                  >
                    Review
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={requestExit}>
                    Exit
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {lifecycleMode === "draftRestored" ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-secondary-lighter)]/35 px-6 py-3">
            <p className="text-sm text-[color:var(--figma-gray-text-04)]">
              Draft restored from your last session. Continue where you left off or discard this
              draft.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDiscardDraftOpen(true)}
              >
                Discard draft
              </Button>
              <Button type="button" size="sm" onClick={() => setLifecycleMode("wizard")}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden bg-[color:var(--figma-gray-bg-04)]">
          <div className="relative min-h-0 min-w-0 flex-[0_0_68%] overflow-hidden border-r border-[color:var(--figma-gray-border-02)]">
            <div
              ref={flowCanvasScrollRef}
              className="absolute inset-0 overflow-auto"
              style={{
                backgroundColor: "var(--figma-gray-bg-03)",
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, var(--figma-gray-border-03) 1px, transparent 0)",
                backgroundSize: "14px 14px",
              }}
              onTouchStart={onFlowCanvasTouchStart}
              onTouchMove={onFlowCanvasTouchMove}
              onTouchEnd={onFlowCanvasTouchEnd}
            >
              <div
                className="mx-auto flex w-max flex-col items-center gap-4 p-6"
                style={{
                  transform: `scale(${flowCanvasScale})`,
                  transformOrigin: "top center",
                }}
              >
                <div className="flex min-w-[720px] flex-col items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full border border-[color:var(--figma-gray-border-03)] bg-[#9C27B0] px-4 py-2 text-sm font-medium text-white shadow-sm">
                    Job Ad Click
                    <ExternalLink className="size-4 opacity-90" strokeWidth={1.5} />
                  </div>
                  <div className="h-8 w-px bg-[color:var(--figma-gray-border-03)]" />
                  <div className="flex w-full items-start justify-center gap-10 pb-8">
                    {flows.map((flow) => (
                      <div key={flow.id} className="flex min-w-0 shrink-0 flex-col items-center">
                        <FlowCanvasColumn
                          flow={flow}
                          flowReviewReady={isFlowReviewReady(
                            flow,
                            careerTemplatesById,
                            careerFlowNodesById,
                            atsTemplatesById,
                            atsFlowNodesById,
                            architecture,
                          )}
                          career={resolveCareer(flow)}
                          careerCopied={(() => {
                            const nid = flow.careerFlowNodeId;
                            if (!nid) return false;
                            const n = careerFlowNodesById[nid];
                            return showCopiedReuseHint(n?.copiedFromTemplateId, n?.copiedReuseHintDismissed);
                          })()}
                          atsCards={flow.atsIds
                            .map((id) => {
                              const node = atsFlowNodesById[id];
                              const merged = mergedAtsFromMaps(
                                id,
                                atsFlowNodesById,
                                atsTemplatesById,
                              );
                              if (!node || !merged) return null;
                              return {
                                id,
                                displayAts: merged,
                                copied: showCopiedReuseHint(
                                  node.copiedFromTemplateId,
                                  node.copiedReuseHintDismissed,
                                ),
                              };
                            })
                            .filter(
                              (x): x is {
                                id: string;
                                displayAts: AtsState;
                                copied: boolean;
                              } => x !== null,
                            )}
                          catalogEntries={catalogEntries}
                          catalogFull={Object.keys(careerTemplatesById).length >= 2}
                          selection={selection}
                          onSelectFlow={() => selectFlow(flow.id)}
                          onSelectCareer={() =>
                            flow.careerFlowNodeId && selectCareerSite(flow.id)
                          }
                          onSelectAts={(atsId) =>
                            setSelection({ kind: "ats", flowId: flow.id, atsId })
                          }
                          onCreateCareerSite={() => createCareerSiteForFlow(flow.id)}
                          onAttachCareerSite={(templateId) =>
                            attachCareerSiteToFlow(flow.id, templateId)
                          }
                          canAddAts={flow.atsIds.length < atsLimitPerFlow}
                          canCreateNewAtsTemplate={
                            Object.keys(atsTemplatesById).length < atsTemplateLimit
                          }
                          atsTemplateOptions={atsTemplateCatalogEntries(atsTemplatesById)}
                          atsCopySources={atsCopySourcesOtherFlows(
                            flow.id,
                            flows,
                            atsFlowNodesById,
                            atsTemplatesById,
                          )}
                          onCreateNewAtsTemplate={() => createNewAtsTemplateForFlow(flow.id)}
                          onAttachAtsTemplate={(templateId) =>
                            attachAtsTemplateToFlow(flow.id, templateId)
                          }
                          onCopyAtsFromFlow={(sourceNodeId) =>
                            copyAtsNodeFromOtherFlow(flow.id, sourceNodeId)
                          }
                          onRemoveAts={(atsNodeId) => removeAtsFromFlow(flow.id, atsNodeId)}
                          onRemoveCareer={() => removeCareerSite(flow.id)}
                          onDuplicate={() => duplicateFlow(flow.id)}
                          onDelete={() => requestDeleteFlow(flow.id)}
                          allowDeleteFlow={flows.length > 1}
                          onRename={(name) => updateFlow(flow.id, { name, nameMode: "manual" })}
                          readOnly={readOnlySetup}
                          architecture={architecture}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={readOnlySetup}
                      onClick={() => {
                        if (!readOnlySetup) addFlow();
                      }}
                      className="group flex h-[100px] w-[200px] shrink-0 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[color:var(--figma-gray-border-04)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--figma-gray-text-04)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)] hover:text-[color:var(--figma-secondary-main)] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <GitBranchPlus className={DASHED_FLOW_CTA_ICON_CLASS} strokeWidth={1.5} />
                      Add flow
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4 z-20">
              <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white/95 p-0.5 shadow-sm backdrop-blur-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-[color:var(--figma-gray-text-05)]"
                  aria-label="Zoom out"
                  onClick={() =>
                    setFlowCanvasScale((s) => clampFlowCanvasScale(s - FLOW_CANVAS_SCALE_STEP))
                  }
                >
                  <Minus className="size-4" strokeWidth={2} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-[color:var(--figma-gray-text-05)]"
                  aria-label="Zoom in"
                  onClick={() =>
                    setFlowCanvasScale((s) => clampFlowCanvasScale(s + FLOW_CANVAS_SCALE_STEP))
                  }
                >
                  <Plus className="size-4" strokeWidth={2} />
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-[0_0_32%] flex-col overflow-hidden border-l border-[color:var(--figma-gray-border-02)] bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6">
              {!ctx ? (
                <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                  Select a node on the canvas.
                </p>
              ) : (
                <>
                  {ctx.selection.kind === "flow" ? (
                <FlowSettingsPanel
                  flow={ctx.flow}
                  nodeCount={flowTrackingNodeCount(ctx.flow)}
                  suggestedAutoFlowName={buildAutoFlowName(
                    { ...ctx.flow, nameMode: "auto" },
                    Math.max(0, flows.findIndex((f) => f.id === ctx.flow.id)),
                    careerFlowNodesById,
                    careerTemplatesById,
                    atsFlowNodesById,
                    atsTemplatesById,
                    architecture,
                  )}
                  onNameChange={(name) =>
                    updateFlow(ctx.flow.id, { name, nameMode: "manual" })
                  }
                  onResetAutoFlowName={() => updateFlow(ctx.flow.id, { nameMode: "auto" })}
                  onDuplicate={() => duplicateFlow(ctx.flow.id)}
                  onDelete={() => requestDeleteFlow(ctx.flow.id)}
                  allowDeleteFlow={flows.length > 1}
                  readOnly={readOnlySetup}
                />
              ) : ctx.selection.kind === "career" ? (
                ctx.flow.careerFlowNodeId && careerFlowNodesById[ctx.flow.careerFlowNodeId] ? (
                  (() => {
                    const nid = ctx.flow.careerFlowNodeId!;
                    const careerNode = careerFlowNodesById[nid]!;
                    const firstAtsId = ctx.flow.atsIds[0] ?? null;
                    const firstAtsNode = firstAtsId ? atsFlowNodesById[firstAtsId] : null;
                    const firstAtsTmpl = firstAtsNode ? atsTemplatesById[firstAtsNode.templateId] : null;
                    const mergedAts =
                      firstAtsNode && firstAtsTmpl
                        ? mergeAtsTemplateAndNode(firstAtsTmpl, firstAtsNode)
                        : null;
                    const ownershipPanel =
                      mergedAts && firstAtsId
                        ? getOwnershipConflictPanel(
                            ctx.flow,
                            nid,
                            firstAtsId,
                            mergedAts.vendor,
                            mergedAts.events,
                            eventOwnershipResolution,
                          )
                        : null;
                    const ownershipRowByEventId = getCareerOwnershipRowMeta(
                      ownershipPanel,
                      mergedAts?.vendor ?? "ATS",
                    );
                    return (
                      <CareerSitePanel
                        career={mergeCareerTemplateAndNode(
                          careerTemplatesById[careerNode.templateId]!,
                          careerNode,
                        )}
                        architecture={architecture}
                        readOnly={readOnlySetup}
                        onChange={(patch) => {
                          const node = careerFlowNodesById[nid];
                          if (!node) return;
                          const { name, baseUrl, ...rest } = patch;
                          if (name !== undefined || baseUrl !== undefined) {
                            const templatePatch: Partial<CareerSiteTemplate> = {};
                            if (name !== undefined) templatePatch.name = name;
                            if (baseUrl !== undefined) {
                              templatePatch.baseUrl = baseUrl;
                              if (architecture === "pixel") {
                                const fallback =
                                  node.defaultCareerSiteName?.trim() ||
                                  careerTemplatesById[node.templateId]?.name?.trim() ||
                                  "career site";
                                templatePatch.name = careerTemplateNameFromBaseUrl(
                                  baseUrl,
                                  fallback,
                                );
                              }
                            }
                            updateCareerTemplate(node.templateId, templatePatch);
                          }
                          if (Object.keys(rest).length > 0) {
                            updateCareerFlowNode(nid, rest as Partial<CareerFlowNodeState>);
                          }
                        }}
                        onRemove={() => removeCareerSite(ctx.flow.id)}
                        ownershipRowByEventId={ownershipRowByEventId}
                      />
                    );
                  })()
                ) : (
                  <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                    Career site was removed. Select the flow or add a career site again.
                  </p>
                )
              ) : ctx.selection.kind === "ats" ? (
                (() => {
                  const sid = (ctx.selection as Extract<Selection, { kind: "ats" }>).atsId;
                  const node = atsFlowNodesById[sid];
                  const tmpl = node ? atsTemplatesById[node.templateId] : null;
                  return node && tmpl ? (
                    <AtsConfigurationPanel
                      ats={mergeAtsTemplateAndNode(tmpl, node)}
                      atsNodeId={sid}
                      flow={ctx.flow}
                      atsFlowNodesById={atsFlowNodesById}
                      careerFlowNodesById={careerFlowNodesById}
                      atsTemplatesById={atsTemplatesById}
                      architecture={architecture}
                      readOnly={readOnlySetup}
                      eventOwnershipResolution={eventOwnershipResolution}
                      onChange={(patch) => {
                        const { vendor, endpointUrl, ...rest } = patch;
                        if (vendor !== undefined || endpointUrl !== undefined) {
                          updateAtsTemplate(node.templateId, {
                            ...(vendor !== undefined ? { vendor } : {}),
                            ...(endpointUrl !== undefined ? { endpointUrl } : {}),
                          });
                        }
                        if (Object.keys(rest).length > 0) {
                          updateAtsFlowNode(sid, rest as Partial<AtsFlowNodeState>);
                        }
                      }}
                      onRemove={() => removeAtsFromFlow(ctx.flow.id, sid)}
                    />
                  ) : (
                    <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                      ATS was removed. Select the flow or add ATS again.
                    </p>
                  );
                })()
              ) : null}
                </>
              )}
            </div>
          </aside>
        </div>

        <AlertDialog
          open={pendingDeleteFlowId !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteFlowId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this flow?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove &quot;{pendingDeleteFlowName}&quot;? Career sites
                and ATS templates that are only used by this flow will be removed from the catalog.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[color:var(--figma-error-main)] text-white hover:bg-[color:var(--figma-error-main)]/90"
                onClick={confirmPendingDeleteFlow}
              >
                Yes, remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={discardDraftOpen} onOpenChange={setDiscardDraftOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                Your saved draft will be removed from this browser. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[color:var(--figma-error-main)] text-white hover:bg-[color:var(--figma-error-main)]/90"
                onClick={confirmDiscardStoredDraft}
              >
                Discard draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={newClientSetupOpen} onOpenChange={setNewClientSetupOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start a new client setup?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears the published live setup and any saved draft in this browser, then
                returns you to the first step for a new client. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[color:var(--figma-error-main)] text-white hover:bg-[color:var(--figma-error-main)]/90"
                onClick={confirmStartNewClientSetup}
              >
                Start new client setup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelLiveEditOpen} onOpenChange={setCancelLiveEditOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel editing?</AlertDialogTitle>
              <AlertDialogDescription>
                Unsaved changes will be discarded and the canvas will return to the last published
                setup.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancelLiveEdit}>Discard changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ExitUnsavedChangesDialog
          open={exitOpen}
          onOpenChange={setExitOpen}
          onConfirmDiscard={confirmExitDiscard}
        />
      </div>
    </TooltipProvider>
  );
}

function SetupStepper({
  stage,
  onGoToStage,
  disableNavigation,
}: {
  stage: WizardStage;
  onGoToStage?: (s: WizardStage) => void;
  disableNavigation?: boolean;
}) {
  const currentIndex = stage - 1;
  return (
    <div
      className={cn(
        "flex w-full flex-nowrap items-center gap-1 overflow-x-auto py-0.5 sm:gap-2 sm:px-1 lg:gap-3",
        disableNavigation && "pointer-events-none select-none opacity-60",
      )}
    >
      {STEPPER_STEPS.map((step, i) => {
        const state = stepperStepState(i, stage);
        const Icon = STEPPER_ICONS[i]!;
        const clickable =
          Boolean(onGoToStage) && !disableNavigation && i < currentIndex && currentIndex > 0;
        const targetStage = (i + 1) as WizardStage;
        return (
          <React.Fragment key={step.title}>
            <div
              className={cn(
                "flex shrink-0 items-start gap-1 bg-white",
                clickable && "cursor-pointer rounded-md outline-offset-2 hover:opacity-90",
              )}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={() => {
                if (clickable) onGoToStage?.(targetStage);
              }}
              onKeyDown={(e) => {
                if (!clickable) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onGoToStage?.(targetStage);
                }
              }}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  state === "done" &&
                    "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]",
                  state === "active" &&
                    "bg-[color:var(--figma-secondary-main)] text-[color:var(--figma-on-primary-label)]",
                  state === "upcoming" &&
                    "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]",
                )}
              >
                {state === "done" ? (
                  <Check className="size-[18px]" strokeWidth={2} />
                ) : (
                  <Icon className="size-[18px]" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <p className="whitespace-nowrap text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">
                  {step.title}
                </p>
                <p className="whitespace-nowrap text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
                  {step.subtitle}
                </p>
              </div>
            </div>
            {i < STEPPER_STEPS.length - 1 ? (
              <div
                className="mx-1 hidden h-px min-w-[8px] flex-1 self-center border-t border-dashed border-[color:var(--figma-gray-border-02)] sm:block"
                aria-hidden
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function AddCareerSiteDropdown({
  catalogEntries,
  catalogFull,
  onCreateCareerSite,
  onAttachCareerSite,
  triggerClassName,
}: {
  catalogEntries: { id: string; name: string }[];
  catalogFull: boolean;
  onCreateCareerSite: () => void;
  onAttachCareerSite: (careerId: string) => void;
  triggerClassName: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClassName}>
          <GitBranchPlus className={DASHED_FLOW_CTA_ICON_CLASS} strokeWidth={1.5} />
          <span>Add career site</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <FlowCatalogDropdownInfoBanner message="Maximum 2 unique career sites allowed. You can still reuse an existing career site on another flow." />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={catalogFull}
          onClick={() => {
            if (!catalogFull) onCreateCareerSite();
          }}
        >
          New career site
        </DropdownMenuItem>
        {catalogEntries.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {catalogEntries.map((e) => (
              <DropdownMenuItem key={e.id} onClick={() => onAttachCareerSite(e.id)}>
                Use “{e.name}”
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** First career in the setup: one-click create. After that: menu (new + existing, or only existing when catalog is full). */
function CareerSiteAddButton({
  catalogEntries,
  catalogFull,
  onCreateCareerSite,
  onAttachCareerSite,
  triggerClassName,
}: {
  catalogEntries: { id: string; name: string }[];
  catalogFull: boolean;
  onCreateCareerSite: () => void;
  onAttachCareerSite: (careerId: string) => void;
  triggerClassName: string;
}) {
  if (catalogEntries.length === 0) {
    return (
      <button type="button" onClick={onCreateCareerSite} className={triggerClassName}>
        <GitBranchPlus className={DASHED_FLOW_CTA_ICON_CLASS} strokeWidth={1.5} />
        <span>Add career site</span>
      </button>
    );
  }
  return (
    <AddCareerSiteDropdown
      catalogEntries={catalogEntries}
      catalogFull={catalogFull}
      onCreateCareerSite={onCreateCareerSite}
      onAttachCareerSite={onAttachCareerSite}
      triggerClassName={triggerClassName}
    />
  );
}

function FlowAtsRow({
  flowId,
  atsCards,
  selection,
  onSelectAts,
  onRemoveAts,
  readOnly,
  canAddAts,
  canCreateNewAtsTemplate,
  atsTemplateOptions,
  atsCopySources,
  onCreateNewAtsTemplate,
  onAttachAtsTemplate,
  onCopyAtsFromFlow,
  architecture,
}: {
  flowId: string;
  atsCards: { id: string; displayAts: AtsState; copied: boolean }[];
  selection: Selection | null;
  onSelectAts: (atsId: string) => void;
  onRemoveAts: (atsCatalogId: string) => void;
  readOnly?: boolean;
  canAddAts: boolean;
  canCreateNewAtsTemplate: boolean;
  atsTemplateOptions: { templateId: string; label: string }[];
  atsCopySources: { sourceNodeId: string; flowName: string; vendor: string }[];
  onCreateNewAtsTemplate: () => void;
  onAttachAtsTemplate: (templateId: string) => void;
  onCopyAtsFromFlow: (sourceNodeId: string) => void;
  architecture: Architecture;
}) {
  return (
    <div className="flex flex-row flex-nowrap items-start justify-center gap-2">
      {atsCards.map(({ id, displayAts: ats, copied }) => {
        const atsSelected =
          selection?.kind === "ats" && selection.flowId === flowId && selection.atsId === id;
        const atsOk = isAtsTrackingComplete(ats, architecture);
        return (
          <button
            key={id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAts(id);
            }}
            className={cn(
              "w-[230px] shrink-0 rounded-lg border-2 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors",
              !atsOk && "border-[color:var(--figma-error-main)]",
              atsOk && atsSelected && "border-[color:var(--figma-secondary-main)]",
              atsOk &&
                !atsSelected &&
                "border-[color:var(--figma-success-main)] hover:border-[color:var(--figma-secondary-main)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full border border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)] px-2 py-0.5 text-xs font-semibold text-[color:var(--figma-gray-text-05)]">
                {ats.vendor}
              </span>
              <button
                type="button"
                disabled={readOnly}
                className="shrink-0 text-[color:var(--figma-error-main)] disabled:opacity-40"
                aria-label="Remove ATS from flow"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!readOnly) onRemoveAts(id);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {ats.endpointUrl.trim() ? (
              <p className="mt-2 truncate text-xs text-[color:var(--figma-gray-text-03)]">
                {ats.endpointUrl.trim()}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {enabledEventChips(ats.events, architecture).length === 0 ? (
                <span className="text-[10px] text-[color:var(--figma-gray-text-03)]">
                  No events configured
                </span>
              ) : (
                enabledEventChips(ats.events, architecture).map((key) => (
                  <span
                    key={key}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      eventChipToneClassNames(key),
                    )}
                  >
                    {key}
                  </span>
                ))
              )}
            </div>
            {copied ? (
              <p className="mt-1.5 text-xs text-[color:var(--figma-gray-text-03)]">
                Copied
              </p>
            ) : null}
            {!atsOk ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--figma-error-main)]">
                <AlertCircle className="size-3.5 shrink-0" strokeWidth={2} />
                <span>Missing tracking configuration</span>
              </div>
            ) : null}
          </button>
        );
      })}
      {atsCards.length < atsLimitPerFlow ? (
        <AddAtsToFlowControl
          readOnly={readOnly}
          canAddAts={canAddAts}
          canCreateNewTemplate={canCreateNewAtsTemplate}
          templateOptions={atsTemplateOptions}
          copySources={atsCopySources}
          onCreateNewTemplate={onCreateNewAtsTemplate}
          onAttachTemplate={onAttachAtsTemplate}
          onCopyFromSource={onCopyAtsFromFlow}
          variant="tile"
          triggerClassName={cn(
            DASHED_FLOW_CTA_TILE_CLASS,
            readOnly && "pointer-events-none opacity-50",
          )}
        />
      ) : null}
    </div>
  );
}

function FlowCanvasColumn({
  flow,
  flowReviewReady,
  career,
  careerCopied,
  atsCards,
  catalogEntries,
  catalogFull,
  selection,
  onSelectFlow,
  onSelectCareer,
  onSelectAts,
  onCreateCareerSite,
  onAttachCareerSite,
  canAddAts,
  canCreateNewAtsTemplate,
  atsTemplateOptions,
  atsCopySources,
  onCreateNewAtsTemplate,
  onAttachAtsTemplate,
  onCopyAtsFromFlow,
  onRemoveAts,
  onRemoveCareer,
  onDuplicate,
  onDelete,
  onRename,
  allowDeleteFlow,
  readOnly,
  architecture,
}: {
  flow: FlowState;
  flowReviewReady: boolean;
  career: CareerSiteState | null;
  careerCopied: boolean;
  atsCards: { id: string; displayAts: AtsState; copied: boolean }[];
  catalogEntries: { id: string; name: string }[];
  catalogFull: boolean;
  selection: Selection | null;
  onSelectFlow: () => void;
  onSelectCareer: () => void;
  onSelectAts: (atsId: string) => void;
  onCreateCareerSite: () => void;
  onAttachCareerSite: (templateId: string) => void;
  canAddAts: boolean;
  canCreateNewAtsTemplate: boolean;
  atsTemplateOptions: { templateId: string; label: string }[];
  atsCopySources: { sourceNodeId: string; flowName: string; vendor: string }[];
  onCreateNewAtsTemplate: () => void;
  onAttachAtsTemplate: (templateId: string) => void;
  onCopyAtsFromFlow: (sourceNodeId: string) => void;
  onRemoveAts: (atsNodeId: string) => void;
  onRemoveCareer: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  allowDeleteFlow: boolean;
  readOnly?: boolean;
  architecture: Architecture;
}) {
  const flowSelected = selection?.kind === "flow" && selection.flowId === flow.id;
  const careerSelected = selection?.kind === "career" && selection.flowId === flow.id;
  const trackingComplete = career ? isCareerTrackingComplete(career, architecture) : true;
  const hasTrackingNodes = Boolean(flow.careerFlowNodeId || flow.atsIds.length > 0);
  const flowNameOk = Boolean(flow.name.trim());
  const flowCardError = !flowNameOk;
  const flowCardSuccess = flowNameOk && hasTrackingNodes && flowReviewReady;
  const n = flowTrackingNodeCount(flow);
  const nodeLabel = n === 1 ? "1 node" : `${n} nodes`;
  const cname = career ? career.name.trim() || "Career site" : "";
  const atsCount = flow.atsIds.length;
  const firstVendor = (atsCards[0]?.displayAts.vendor ?? "").trim() || "ATS";
  const flowSummaryLine =
    career && atsCount === 0
      ? cname
      : career && atsCount >= 1
        ? `${cname} → ${firstVendor}`
        : !career && atsCount >= 1
          ? firstVendor
          : null;

  return (
    <div className="flex w-max min-w-[248px] shrink-0 flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelectFlow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectFlow();
          }
        }}
        className={cn(
          "w-[220px] rounded-lg border-2 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors",
          flowCardError && "border-[color:var(--figma-error-main)]",
          !flowCardError && flowSelected && "border-[color:var(--figma-secondary-main)]",
          !flowCardError &&
            !flowSelected &&
            flowCardSuccess &&
            "border-[color:var(--figma-success-main)]",
          !flowCardError &&
            !flowSelected &&
            !flowCardSuccess &&
            "border-[color:var(--figma-gray-border-02)]",
          !flowCardError && !flowSelected && "hover:border-[color:var(--figma-secondary-main)]",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Pencil className="size-3.5 shrink-0 text-[color:var(--figma-gray-icon-03)]" />
            <input
              value={flow.name}
              disabled={readOnly}
              onChange={(e) => onRename(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-invalid={!flowNameOk}
              className="min-w-0 flex-1 truncate border-none bg-transparent text-sm font-semibold text-[color:var(--figma-gray-text-05)] outline-none focus:ring-0 disabled:opacity-60"
            />
            {(flow.nameMode ?? "auto") === "manual" ? (
              <span className="shrink-0 rounded border border-[color:var(--figma-gray-border-03)] px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[color:var(--figma-gray-text-03)]">
                Custom
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={readOnly}
                  className="rounded p-1 text-[color:var(--figma-gray-icon-04)] hover:bg-[color:var(--figma-gray-bg-03)] disabled:opacity-40"
                  aria-label="Duplicate flow"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!readOnly) onDuplicate();
                  }}
                >
                  <CopyPlus className="size-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Duplicate flow</TooltipContent>
            </Tooltip>
            <button
              type="button"
              disabled={readOnly || !allowDeleteFlow}
              className={cn(
                "rounded p-1 hover:bg-[color:var(--figma-gray-bg-03)]",
                allowDeleteFlow && !readOnly
                  ? "text-[color:var(--figma-error-main)]"
                  : "cursor-not-allowed text-[color:var(--figma-gray-icon-03)] opacity-50",
              )}
              aria-label="Delete flow"
              onClick={(e) => {
                e.stopPropagation();
                if (allowDeleteFlow && !readOnly) onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-md bg-[color:var(--figma-gray-bg-05)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--figma-gray-text-04)]">
            {nodeLabel}
          </span>
        </div>
        {flowSummaryLine ? (
          <p className="mt-2 truncate text-[10px] leading-[14px] text-[color:var(--figma-gray-text-03)]">
            {flowSummaryLine}
          </p>
        ) : null}
      </div>

      <div className="h-6 w-px bg-[color:var(--figma-gray-border-03)]" />

      {!career && atsCards.length === 0 ? (
        <div className="flex w-[220px] flex-col gap-5">
          <CareerSiteAddButton
            catalogEntries={catalogEntries}
            catalogFull={catalogFull}
            onCreateCareerSite={onCreateCareerSite}
            onAttachCareerSite={onAttachCareerSite}
            triggerClassName={cn(
              DASHED_FLOW_CTA_ROW_CLASS,
              readOnly && "pointer-events-none opacity-50",
            )}
          />
          <AddAtsToFlowControl
            readOnly={readOnly}
            canAddAts={canAddAts}
            canCreateNewTemplate={canCreateNewAtsTemplate}
            templateOptions={atsTemplateOptions}
            copySources={atsCopySources}
            onCreateNewTemplate={onCreateNewAtsTemplate}
            onAttachTemplate={onAttachAtsTemplate}
            onCopyFromSource={onCopyAtsFromFlow}
            variant="row"
            triggerClassName={cn(
              DASHED_FLOW_CTA_ROW_CLASS,
              readOnly && "pointer-events-none opacity-50",
            )}
          />
        </div>
      ) : null}

      {career ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCareer();
            }}
            className={cn(
              "w-[220px] rounded-lg border-2 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors",
              !trackingComplete && "border-[color:var(--figma-error-main)]",
              trackingComplete &&
                careerSelected &&
                "border-[color:var(--figma-secondary-main)]",
              trackingComplete &&
                !careerSelected &&
                "border-[color:var(--figma-success-main)] hover:border-[color:var(--figma-secondary-main)] hover:shadow-md",
            )}
          >
            {careerCopied ? (
              <p className="mb-2 text-xs text-[color:var(--figma-gray-text-03)]">
                Copied
              </p>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                {career.name}
              </span>
              <button
                type="button"
                disabled={readOnly}
                className="shrink-0 text-[color:var(--figma-error-main)] disabled:opacity-40"
                aria-label="Remove career site"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!readOnly) onRemoveCareer();
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {architecture === "pixel" && career.baseUrl.trim() ? (
              <p className="mt-1 truncate text-xs text-[color:var(--figma-gray-text-03)]">
                {career.baseUrl.trim()}
              </p>
            ) : null}
            {architecture === "s2s" && (career.s2sEndpointUrl ?? "").trim() ? (
              <p className="mt-1 truncate text-xs text-[color:var(--figma-gray-text-03)]">
                {(career.s2sEndpointUrl ?? "").trim()}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {enabledEventChips(career.events, architecture).length === 0 ? (
                <span className="text-[10px] text-[color:var(--figma-gray-text-03)]">
                  No events configured
                </span>
              ) : (
                enabledEventChips(career.events, architecture).map((key) => (
                  <span
                    key={key}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      eventChipToneClassNames(key),
                    )}
                  >
                    {key}
                  </span>
                ))
              )}
            </div>
            {!trackingComplete ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--figma-error-main)]">
                <AlertCircle className="size-3.5 shrink-0" strokeWidth={2} />
                <span>Missing tracking configuration</span>
              </div>
            ) : null}
          </button>
          <div className="h-4 w-px bg-[color:var(--figma-gray-border-03)]" />
          <FlowAtsRow
            flowId={flow.id}
            atsCards={atsCards}
            selection={selection}
            onSelectAts={onSelectAts}
            onRemoveAts={onRemoveAts}
            readOnly={readOnly}
            canAddAts={canAddAts}
            canCreateNewAtsTemplate={canCreateNewAtsTemplate}
            atsTemplateOptions={atsTemplateOptions}
            atsCopySources={atsCopySources}
            onCreateNewAtsTemplate={onCreateNewAtsTemplate}
            onAttachAtsTemplate={onAttachAtsTemplate}
            onCopyAtsFromFlow={onCopyAtsFromFlow}
            architecture={architecture}
          />
        </>
      ) : atsCards.length > 0 ? (
        <>
          <CareerSiteAddButton
            catalogEntries={catalogEntries}
            catalogFull={catalogFull}
            onCreateCareerSite={onCreateCareerSite}
            onAttachCareerSite={onAttachCareerSite}
            triggerClassName={cn(
              DASHED_FLOW_CTA_ROW_CLASS,
              "w-[220px]",
              readOnly && "pointer-events-none opacity-50",
            )}
          />
          <div className="h-4 w-px bg-[color:var(--figma-gray-border-03)]" />
          <FlowAtsRow
            flowId={flow.id}
            atsCards={atsCards}
            selection={selection}
            onSelectAts={onSelectAts}
            onRemoveAts={onRemoveAts}
            readOnly={readOnly}
            canAddAts={canAddAts}
            canCreateNewAtsTemplate={canCreateNewAtsTemplate}
            atsTemplateOptions={atsTemplateOptions}
            atsCopySources={atsCopySources}
            onCreateNewAtsTemplate={onCreateNewAtsTemplate}
            onAttachAtsTemplate={onAttachAtsTemplate}
            onCopyAtsFromFlow={onCopyAtsFromFlow}
            architecture={architecture}
          />
        </>
      ) : null}
    </div>
  );
}

/** Figma 373:25696 — greyish outlined form region in the configure side panel */
const CONFIGURE_SIDE_FORM_SHELL =
  "rounded-lg border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

/** Figma 373:25699 — nested white “Tracking configuration” block */
const CONFIGURE_SIDE_TRACKING_NEST =
  "rounded-lg bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

function FlowSettingsPanel({
  flow,
  nodeCount,
  suggestedAutoFlowName,
  onNameChange,
  onResetAutoFlowName,
  onDuplicate,
  onDelete,
  allowDeleteFlow,
  readOnly,
}: {
  flow: FlowState;
  nodeCount: number;
  suggestedAutoFlowName: string;
  onNameChange: (name: string) => void;
  onResetAutoFlowName: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  allowDeleteFlow: boolean;
  readOnly?: boolean;
}) {
  const isManualName = (flow.nameMode ?? "auto") === "manual";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
          Flow settings
        </h2>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Duplicate flow"
                disabled={readOnly}
                onClick={onDuplicate}
              >
                <CopyPlus className="size-4" strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Duplicate flow</TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={readOnly || !allowDeleteFlow}
            className={cn(
              "size-8 text-destructive",
              (!allowDeleteFlow || readOnly) && "opacity-50",
            )}
            aria-label="Delete flow"
            onClick={() => {
              if (allowDeleteFlow && !readOnly) onDelete();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className={CONFIGURE_SIDE_FORM_SHELL}>
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <FieldInput
              id={`flow-name-${flow.id}`}
              label="Flow name"
              required
              labelTrailing={
                isManualName ? (
                  <Badge
                    variant="outline"
                    className="border-[color:var(--figma-gray-border-03)] text-[10px] font-medium text-[color:var(--figma-gray-text-03)]"
                  >
                    Custom name
                  </Badge>
                ) : null
              }
              value={flow.name}
              disabled={readOnly}
              onChange={(e) => onNameChange(e.target.value)}
              className={cn(!flow.name.trim() && "border-[color:var(--figma-error-main)]")}
              aria-invalid={!flow.name.trim()}
              error={!flow.name.trim() ? "Flow name is required." : undefined}
            />
            {isManualName ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-[color:var(--figma-gray-text-03)]">
                  Auto-generated from this setup:{" "}
                  <span className="font-mono text-[color:var(--figma-gray-text-04)]">
                    {suggestedAutoFlowName}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-fit px-2 text-xs text-[color:var(--figma-secondary-main)]"
                  disabled={readOnly}
                  onClick={() => {
                    if (!readOnly) onResetAutoFlowName();
                  }}
                >
                  Reset to auto-name
                </Button>
              </div>
            ) : null}
          </div>
          <Badge
            variant="secondary"
            className="w-fit bg-[color:var(--figma-gray-bg-05)] font-medium text-[color:var(--figma-gray-text-04)]"
          >
            {nodeCount} nodes
          </Badge>
          <div className="space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
            <p>
              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">
                Career site:
              </span>{" "}
              {flow.careerFlowNodeId ? 1 : 0}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--figma-gray-text-05)]">ATS:</span>{" "}
              {flow.atsIds.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function s2sTestStatusLabel(status: S2sTestStatus | undefined): string {
  if (status === "testing") return "Testing...";
  if (status === "received") return "Test received";
  return "Not tested";
}

function CareerSitePanel({
  career,
  architecture,
  readOnly,
  onChange,
  onRemove,
  ownershipRowByEventId,
}: {
  career: CareerSiteState;
  architecture: Architecture;
  readOnly?: boolean;
  onChange: (patch: Partial<CareerSiteState>) => void;
  onRemove: () => void;
  ownershipRowByEventId: Partial<Record<string, CareerRowOwnershipMeta>>;
}) {
  if (architecture === "s2s") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
            Career Site Configuration
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            disabled={readOnly}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className={CONFIGURE_SIDE_FORM_SHELL}>
          <div className="flex flex-col gap-5">
            <FieldInput
              id="cs-name-s2s"
              label="Career site name"
              required
              value={career.name}
              disabled={readOnly}
              onChange={(e) => onChange({ name: e.target.value })}
              className={cn(!career.name.trim() && "border-[color:var(--figma-error-main)]")}
            />
            <FieldInput
              id="cs-s2s-endpoint"
              label="Endpoint URL"
              required
              placeholder="https://api.company.com/joveo/postback"
              value={career.s2sEndpointUrl ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange({ s2sEndpointUrl: e.target.value })}
              className={cn(
                !(career.s2sEndpointUrl ?? "").trim() && "border-[color:var(--figma-error-main)]",
              )}
              hint="Send selected server-side events to this endpoint."
            />
            <div className={CONFIGURE_SIDE_TRACKING_NEST}>
              <div className="mb-3 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  Tracking configuration
                </h3>
              </div>
              <CareerSiteEventsSection
                events={career.events}
                architecture="s2s"
                readOnly={readOnly}
                onReplaceEvents={(events) => onChange({ events })}
                ownershipRowByEventId={ownershipRowByEventId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
          Career site
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          disabled={readOnly}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className={CONFIGURE_SIDE_FORM_SHELL}>
        <div className="flex flex-col gap-5">
          <FieldInput
            id="cs-name"
            label="Career site name"
            required
            value={career.name}
            disabled={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn(!career.name.trim() && "border-[color:var(--figma-error-main)]")}
          />
          <FieldInput
            id="cs-base"
            label="Enter base URL"
            required
            placeholder="https://careers.example.com"
            value={career.baseUrl}
            disabled={readOnly}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            className={cn(
              (!career.baseUrl.trim() || !isValidHttpOrHttpsUrl(career.baseUrl)) &&
                "border-[color:var(--figma-error-main)]",
            )}
            aria-invalid={!career.baseUrl.trim() || !isValidHttpOrHttpsUrl(career.baseUrl)}
            error={
              career.baseUrl.trim() && !isValidHttpOrHttpsUrl(career.baseUrl)
                ? "Enter a valid link with an http:// or https:// address."
                : undefined
            }
          />
          <div className={CONFIGURE_SIDE_TRACKING_NEST}>
            <div className="mb-3 flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                Tracking configuration
              </h3>
              {architecture === "pixel" ? (
                <p className="text-xs leading-relaxed text-[color:var(--figma-gray-text-03)]">
                  Enter exact URLs for the selected step.
                </p>
              ) : null}
            </div>
            <CareerSiteEventsSection
              events={career.events}
              architecture={architecture}
              readOnly={readOnly}
              onReplaceEvents={(events) => onChange({ events })}
              pixelUrlResolveBase={career.baseUrl.trim() || undefined}
              ownershipRowByEventId={ownershipRowByEventId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AtsConfigurationPanel({
  ats,
  atsNodeId,
  flow,
  atsFlowNodesById,
  careerFlowNodesById,
  atsTemplatesById,
  architecture,
  readOnly,
  eventOwnershipResolution,
  onChange,
  onRemove,
}: {
  ats: AtsState;
  atsNodeId: string;
  flow: FlowState;
  atsFlowNodesById: Record<string, AtsFlowNodeState>;
  careerFlowNodesById: Record<string, CareerFlowNodeState>;
  atsTemplatesById: Record<string, AtsTemplate>;
  architecture: Architecture;
  readOnly?: boolean;
  eventOwnershipResolution: Record<string, EventOwnershipResolution>;
  onChange: (patch: Partial<AtsState>) => void;
  onRemove: () => void;
}) {
  const atsFunnelOwnershipRowByEventId = React.useMemo(() => {
    const cid = flow.careerFlowNodeId;
    const careerNode = cid ? careerFlowNodesById[cid] : undefined;
    const careerEvents = careerNode?.events;
    const fromMove = cid
      ? getAtsFunnelRowUi(flow.id, cid, atsNodeId, ats.events, ats.vendor, eventOwnershipResolution)
      : {};
    const fromCareer =
      careerEvents !== undefined
        ? getAtsFunnelRowsBlockedByCareerSequentialOwnership(
            careerEvents,
            atsNodeId,
            flow.atsIds[0] ?? null,
          )
        : {};
    return mergeAtsFunnelOwnershipRowMeta(fromMove, fromCareer);
  }, [
    flow.id,
    flow.careerFlowNodeId,
    flow.atsIds,
    atsNodeId,
    ats.events,
    ats.vendor,
    eventOwnershipResolution,
    careerFlowNodesById,
  ]);

  const vendorsTakenElsewhere = React.useMemo(
    () =>
      vendorsUsedByOtherAtsOnSameFlow(flow, atsFlowNodesById, atsTemplatesById, atsNodeId),
    [flow, atsFlowNodesById, atsTemplatesById, atsNodeId],
  );
  const vendorSelectOptions = React.useMemo(
    () => ATS_OPTIONS.filter((opt) => opt === ats.vendor || !vendorsTakenElsewhere.has(opt)),
    [ats.vendor, vendorsTakenElsewhere],
  );
  const atsVendorDropdownOptions = React.useMemo((): SearchableDropdownOption[] => {
    return vendorSelectOptions.map((opt) => {
      const base: SearchableDropdownOption = {
        value: opt,
        label: opt,
        logoSrc: ATS_VENDOR_LOGO_URL[opt],
      };
      if (architecture === "pixel") {
        return {
          ...base,
          tag: ATS_VENDOR_PIXEL_METHOD_TAG[opt as (typeof ATS_OPTIONS)[number]],
        };
      }
      return base;
    });
  }, [vendorSelectOptions, architecture]);
  const s2sEventSourceDropdownOptions = React.useMemo((): SearchableDropdownOption[] => {
    return S2S_EVENT_SOURCE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      keywords: [o.value, o.label],
    }));
  }, []);
  const testTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
    };
  }, []);

  const sendTestEvent = () => {
    if (readOnly) return;
    onChange({ s2sTestStatus: "testing" });
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    testTimerRef.current = setTimeout(() => {
      onChange({ s2sTestStatus: "received" });
      testTimerRef.current = null;
    }, 900);
  };

  const pixelMethodRecommendation = atsPixelMethodRecommendationForPanel(ats.vendor, architecture);

  if (architecture === "s2s") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
            ATS Configuration
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            disabled={readOnly}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className={CONFIGURE_SIDE_FORM_SHELL}>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="ats-vendor-select-s2s">
                ATS name <span className="text-[color:var(--figma-error-main)]">*</span>
              </Label>
              <SearchableDropdown
                id="ats-vendor-select-s2s"
                showLogos
                options={atsVendorDropdownOptions}
                value={ats.vendor}
                onValueChange={(v) => onChange({ vendor: v })}
                disabled={readOnly}
                placeholder="Select ATS"
                searchPlaceholder="Search"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ats-s2s-source">
                Event source <span className="text-[color:var(--figma-error-main)]">*</span>
              </Label>
              <SearchableDropdown
                id="ats-s2s-source"
                options={s2sEventSourceDropdownOptions}
                value={ats.s2sEventSource || undefined}
                onValueChange={(v) => onChange({ s2sEventSource: v as S2sEventSource })}
                disabled={readOnly}
                placeholder="Select event source"
                searchPlaceholder="Search"
                triggerClassName={cn(!ats.s2sEventSource && "border-[color:var(--figma-error-main)]")}
              />
            </div>
            <FieldInput
              id="ats-endpoint-s2s"
              label="Endpoint URL"
              required
              placeholder="https://api.company.com/joveo/postback"
              value={ats.endpointUrl}
              disabled={readOnly}
              onChange={(e) => onChange({ endpointUrl: e.target.value })}
              className={cn(!ats.endpointUrl.trim() && "border-[color:var(--figma-error-main)]")}
              hint="Send selected server-side events to this endpoint."
            />
            <div className={CONFIGURE_SIDE_TRACKING_NEST}>
              <AtsEventsSection
                events={ats.events}
                architecture="s2s"
                readOnly={readOnly}
                onReplaceEvents={(events) => onChange({ events })}
                ownershipRowByEventId={atsFunnelOwnershipRowByEventId}
                pixelMethodRecommendation={pixelMethodRecommendation}
              />
              <div className="mt-5 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  onClick={sendTestEvent}
                >
                  Send test event
                </Button>
                <p className="text-xs text-[color:var(--figma-gray-text-04)]">
                  Test status: {s2sTestStatusLabel(ats.s2sTestStatus)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium leading-6 text-[color:var(--figma-gray-text-05)]">
          ATS Configuration
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          disabled={readOnly}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className={CONFIGURE_SIDE_FORM_SHELL}>
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="ats-vendor-select">
              Select ATS <span className="text-[color:var(--figma-error-main)]">*</span>
            </Label>
            <SearchableDropdown
              id="ats-vendor-select"
              showLogos
              options={atsVendorDropdownOptions}
              value={ats.vendor}
              onValueChange={(v) => onChange({ vendor: v })}
              disabled={readOnly}
              placeholder="Select ATS"
              searchPlaceholder="Search"
            />
          </div>
          <FieldInput
            id="ats-endpoint"
            label="Enter base URL"
            required
            placeholder="e.g. http://company.myworkdayjobs.com/jobs"
            value={ats.endpointUrl}
            disabled={readOnly}
            onChange={(e) => onChange({ endpointUrl: e.target.value })}
            className={cn(!ats.endpointUrl.trim() && "border-[color:var(--figma-error-main)]")}
          />
          <div className={CONFIGURE_SIDE_TRACKING_NEST}>
            <div className="mb-3 flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                Tracking configuration
              </h3>
              {architecture === "pixel" ? (
                <p className="text-xs leading-relaxed text-[color:var(--figma-gray-text-03)]">
                  Enter exact URLs for the selected step.
                </p>
              ) : null}
            </div>
            <AtsEventsSection
              events={ats.events}
              architecture={architecture}
              readOnly={readOnly}
              onReplaceEvents={(events) => onChange({ events })}
              pixelUrlResolveBase={ats.endpointUrl.trim() || undefined}
              ownershipRowByEventId={atsFunnelOwnershipRowByEventId}
              pixelMethodRecommendation={pixelMethodRecommendation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
