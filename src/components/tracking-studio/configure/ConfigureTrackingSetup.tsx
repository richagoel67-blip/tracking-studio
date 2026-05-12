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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableDropdown,
  type SearchableDropdownOption,
} from "@/components/ui/searchable-dropdown";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  AtsEventsSection,
  CareerSiteEventsSection,
  TrackingConfigurationPixelGuidance,
} from "./configure-event-forms";
import { deriveTrackingPattern } from "./derive-tracking-pattern";
import {
  countCustomEventsDefined,
  countEnabledCustomEventsGlobally,
  countEnabledDefaultEvents,
  countGlobalCustomEvents,
  createDefaultAtsEvents,
  createDefaultCareerEvents,
  createS2sDefaultAtsEvents,
  createS2sDefaultCareerEvents,
  enabledEventChips,
  eventChipToneClassNames,
  hasAnyDuplicateCustomNameError,
  isAtsTrackingComplete,
  isCareerTrackingComplete,
  isTrackingEventRowValid,
  markCustomDuplicateErrors,
  nodeHasSelectedS2sEvents,
  S2S_EVENT_SOURCE_OPTIONS,
  s2sEventSourceLabel,
  SETUP_DATA_VERSION,
  type AtsState,
  type CareerSiteState,
  type S2sEventSource,
  type S2sTestStatus,
} from "./tracking-events";
import { buildSetupDiffLines } from "./tracking-setup-diff";
import {
  type Architecture,
  atsLimitPerFlow,
  clearDraft,
  clearLive,
  cloneSnapshot,
  loadDraft,
  loadLive,
  loadMode,
  saveDraft as persistDraft,
  saveLive,
  saveMode,
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

function attachableAtsEntriesForFlow(
  flow: FlowState,
  atsById: Record<string, AtsState>,
): { id: string; vendor: string }[] {
  return Object.entries(atsById)
    .filter(([id]) => !flow.atsIds.includes(id))
    .map(([id, a]) => ({ id, vendor: a.vendor }));
}

function AddAtsToFlowControl({
  readOnly,
  canCreateNewTemplate,
  attachable,
  onCreateNew,
  onAttach,
  triggerClassName,
  variant,
}: {
  readOnly?: boolean;
  canCreateNewTemplate: boolean;
  attachable: { id: string; vendor: string }[];
  onCreateNew: () => void;
  onAttach: (catalogId: string) => void;
  triggerClassName: string;
  variant: "row" | "tile";
}) {
  if (!canCreateNewTemplate && attachable.length === 0) return null;

  const label =
    variant === "row" ? <span>Add ATS</span> : <span className="text-center text-sm">Add ATS</span>;

  if (canCreateNewTemplate && attachable.length === 0) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => {
          if (!readOnly) onCreateNew();
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
        <FlowCatalogDropdownInfoBanner message="Each flow can include one ATS. Reuse an existing ATS template from the list when your catalog is full." />
        <DropdownMenuSeparator />
        {canCreateNewTemplate ? (
          <DropdownMenuItem
            onClick={() => {
              onCreateNew();
            }}
          >
            New ATS template
          </DropdownMenuItem>
        ) : null}
        {canCreateNewTemplate && attachable.length > 0 ? <DropdownMenuSeparator /> : null}
        {attachable.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => onAttach(a.id)}>
            Use &quot;{a.vendor}&quot;
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function newId() {
  return `id-${crypto.randomUUID().slice(0, 8)}`;
}

function emptyCareerSite(name: string, architecture: Architecture): CareerSiteState {
  if (architecture === "s2s") {
    return {
      name,
      baseUrl: "",
      events: createS2sDefaultCareerEvents(),
      s2sEventSource: "",
      s2sEndpointUrl: "",
      s2sTestStatus: "not_tested",
    };
  }
  return {
    name,
    baseUrl: "",
    events: createDefaultCareerEvents(),
  };
}

function initialFlows(): FlowState[] {
  return [{ id: newId(), name: "Flow 1", careerSiteId: null, atsIds: [] }];
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

function nextUnusedAtsVendor(atsById: Record<string, AtsState>): string {
  const used = new Set(Object.values(atsById).map((a) => a.vendor));
  return ATS_OPTIONS.find((n) => !used.has(n)) ?? ATS_OPTIONS[0];
}

/** Vendors already chosen by another ATS catalog row (max 2 rows; each should use a distinct option). */
function vendorsUsedByOtherAtsEntries(
  atsById: Record<string, AtsState>,
  currentCatalogId: string,
): Set<string> {
  const taken = new Set<string>();
  for (const [id, a] of Object.entries(atsById)) {
    if (id === currentCatalogId) continue;
    const v = a.vendor.trim();
    if (v) taken.add(v);
  }
  return taken;
}

function canOpenReview(
  flows: FlowState[],
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
  architecture: Architecture,
): boolean {
  if (hasAnyDuplicateCustomNameError(careerSiteById, atsById)) return false;
  const hasAnyNode = flows.some((f) => f.careerSiteId || f.atsIds.length > 0);
  if (!hasAnyNode) return false;
  return flows.every((f) => {
    const isEmpty = !f.careerSiteId && f.atsIds.length === 0;
    if (isEmpty) return false;
    if (f.careerSiteId) {
      const cs = careerSiteById[f.careerSiteId];
      if (!cs || !isCareerTrackingComplete(cs, architecture)) return false;
    }
    for (const aid of f.atsIds) {
      const ats = atsById[aid];
      if (!ats || !isAtsTrackingComplete(ats, architecture)) return false;
    }
    return true;
  });
}

function isFlowReviewReady(
  f: FlowState,
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
  architecture: Architecture,
): boolean {
  const isEmpty = !f.careerSiteId && f.atsIds.length === 0;
  if (isEmpty) return false;
  if (f.careerSiteId) {
    const cs = careerSiteById[f.careerSiteId];
    if (!cs || !isCareerTrackingComplete(cs, architecture)) return false;
  }
  for (const aid of f.atsIds) {
    const ats = atsById[aid];
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
  careerSiteById: Record<string, CareerSiteState>,
  atsById: Record<string, AtsState>,
  architecture: Architecture,
): string[] {
  const issues: string[] = [];
  if (hasAnyDuplicateCustomNameError(careerSiteById, atsById)) {
    issues.push("This custom event name already exists.");
  }
  for (const f of flows) {
    const empty = !f.careerSiteId && f.atsIds.length === 0;
    if (empty) {
      issues.push(`${f.name}: Add a career site or ATS to this flow.`);
      continue;
    }
    if (architecture === "s2s") {
      if (f.careerSiteId) {
        const cs = careerSiteById[f.careerSiteId];
        if (cs) {
          for (const line of s2sCareerBlockers(cs)) {
            issues.push(`${f.name}: ${line}`);
          }
        }
      }
      for (const aid of f.atsIds) {
        const a = atsById[aid];
        if (a) {
          for (const line of s2sAtsBlockers(a)) {
            issues.push(`${f.name}: ${line}`);
          }
        }
      }
    } else if (!isFlowReviewReady(f, careerSiteById, atsById, architecture)) {
      issues.push(`${f.name}: complete tracking configuration (URLs and required fields).`);
    }
  }
  return issues;
}

/** Matches Figma flow card: career counts as one node; all ATS slots together count as one node (not per ATS). */
function flowTrackingNodeCount(f: FlowState): number {
  return (f.careerSiteId ? 1 : 0) + (f.atsIds.length > 0 ? 1 : 0);
}

function flowPathSummaryLine(
  flow: FlowState,
  career: CareerSiteState | null,
  atsById: Record<string, AtsState>,
): string | null {
  const cname = career ? career.name.trim() || "Career site" : "";
  const ids = flow.atsIds;
  if (ids.length === 0) {
    return career ? cname : null;
  }
  const first = atsById[ids[0]!];
  const vendor = first?.vendor.trim() || "ATS";
  if (career) return `${cname} → ${vendor}`;
  return vendor;
}

function architectureLabel(a: Architecture): string {
  return a === "pixel" ? "Pixel tracking" : "Server-to-server tracking";
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
  careerSiteById,
  atsById,
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
  careerSiteById: Record<string, CareerSiteState>;
  atsById: Record<string, AtsState>;
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
  const careerCatalogCount = Object.keys(careerSiteById).length;
  const atsCatalogCount = Object.keys(atsById).length;
  const enabledDefaultEvents = countEnabledDefaultEvents(careerSiteById, atsById);
  const enabledCustomEvents = countEnabledCustomEventsGlobally(careerSiteById, atsById);
  const customRowsTotal = countCustomEventsDefined(careerSiteById, atsById);

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

      <div className="min-h-0 flex-1 overflow-y-auto bg-[color:var(--figma-gray-bg-01)] px-6 py-6">
        <div className="mx-auto max-w-[920px] space-y-6">
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
                  {atsCatalogCount}
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
                  {atsCatalogCount} ATS template{atsCatalogCount === 1 ? "" : "s"}
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
            {flows.map((flow) => {
              const career = flow.careerSiteId ? (careerSiteById[flow.careerSiteId] ?? null) : null;
              const ready = isFlowReviewReady(flow, careerSiteById, atsById, architecture);
              const pathLine = flowPathSummaryLine(flow, career, atsById);
              return (
                <div
                  key={flow.id}
                  className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                        {flow.name}
                      </p>
                      {pathLine ? (
                        <p className="mt-1 text-xs text-[color:var(--figma-gray-text-03)]">
                          {pathLine}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[color:var(--figma-gray-text-03)]">
                          No career site or ATS attached
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                        onClick={() => onEditFlow(flow.id)}
                      >
                        Edit flow
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-[color:var(--figma-gray-border-02)] pt-4 sm:grid-cols-2">
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
                            const a = atsById[aid];
                            if (!a) return null;
                            if (architecture === "s2s") {
                              return (
                                <li
                                  key={aid}
                                  className="space-y-1.5 rounded-md border border-[color:var(--figma-gray-border-02)] bg-white p-3 text-sm text-[color:var(--figma-gray-text-04)]"
                                >
                                  <p className="font-semibold text-[color:var(--figma-gray-text-05)]">
                                    {a.vendor}
                                  </p>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--figma-gray-border-02)] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-between gap-3">
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
      title: "Copy or send installation snippets",
      body: "Share pixel snippets and event mapping with your client developer.",
      action: "Installation guide",
      icon: ChevronRight,
      onAction: onGoToInstallationGuide,
    },
    {
      title: "Run test mode",
      body: "Confirm VIEW, LEAD, APPLY_START, APPLY_FINISH, and custom events fire for every flow.",
      action: "Test mode",
      icon: ChevronRight,
      onAction: onRunTests,
    },
    {
      title: "Monitor pixel health",
      body: "Watch event volume, failures, and missing parameters after launch.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
    {
      title: "Review attribution after events start firing",
      body: "Use funnel reports to validate click-to-apply and completion tracking.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
  ];

  const nextStepsS2s: NextStepRow[] = [
    {
      title: "Share endpoint details with developer",
      body: "Provide event source choices and postback URLs for each career site and ATS node.",
      action: "Installation guide",
      icon: ChevronRight,
      onAction: onGoToInstallationGuide,
    },
    {
      title: "Send test events",
      body: "Use the Send test event control in the flow builder to validate each node locally.",
      action: "Test mode",
      icon: ChevronRight,
      onAction: onRunTests,
    },
    {
      title: "Validate incoming events",
      body: "Confirm payloads match expected keys for VIEW, LEAD, APPLY_START, APPLY_FINISH, and customs.",
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
      title: "Review attribution after events start firing",
      body: "Use funnel reports once S2S events are flowing into analytics.",
      action: "Dashboard",
      icon: ChevronRight,
      onAction: onGoToDashboard,
    },
  ];

  const nextSteps = architecture === "s2s" ? nextStepsS2s : nextStepsPixel;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--figma-gray-bg-01)]">
      <div className="shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-white px-6 py-4">
        <SetupStepper stage={4} disableNavigation />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[560px] rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white px-8 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[color:var(--figma-success-main)] text-white">
            <Check className="size-8" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-xl font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
            {architecture === "s2s"
              ? "Server-to-server tracking setup launched"
              : "You're All Set! Let's begin!"}
          </h1>
          <p className="mt-2 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
            {architecture === "s2s"
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
  const [careerSiteById, setCareerSiteById] = React.useState<Record<string, CareerSiteState>>({});
  const [atsById, setAtsById] = React.useState<Record<string, AtsState>>({});
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
  const hydratedRef = React.useRef(false);

  const readOnlySetup = lifecycleMode === "liveReadOnly";
  const liveEditing = lifecycleMode === "liveEditing";

  const buildSnapshot = React.useCallback(
    (): SetupSnapshot => ({
      version: SETUP_DATA_VERSION,
      wizardStage: stage,
      architecture,
      flows,
      careerSiteById,
      atsById,
      careerSiteSerial,
      flowCanvasScale,
      selection,
    }),
    [
      stage,
      architecture,
      flows,
      careerSiteById,
      atsById,
      careerSiteSerial,
      flowCanvasScale,
      selection,
    ],
  );

  const applySnapshot = React.useCallback((snap: SetupSnapshot) => {
    setArchitecture(snap.architecture);
    setFlows(snap.flows.length ? snap.flows : initialFlows());
    setCareerSiteById(snap.careerSiteById);
    setAtsById(snap.atsById);
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

  /** Sync duplicate-name errors onto catalog maps after any career/ATS change. */
  React.useEffect(() => {
    const m = markCustomDuplicateErrors(careerSiteById, atsById);
    const cEq = JSON.stringify(m.careerSiteById) === JSON.stringify(careerSiteById);
    const aEq = JSON.stringify(m.atsById) === JSON.stringify(atsById);
    if (cEq && aEq) return;
    setCareerSiteById(m.careerSiteById);
    setAtsById(m.atsById);
  }, [careerSiteById, atsById]);

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

  const reviewEnabled = canOpenReview(flows, careerSiteById, atsById, architecture);

  React.useEffect(() => {
    if (stage !== 2) return;
    const first = flows[0];
    if (!first) return;
    if (selection === null) {
      setSelection({ kind: "flow", flowId: first.id });
    }
  }, [stage, flows, selection]);

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

  const updateCareerSiteInCatalog = (careerId: string, patch: Partial<CareerSiteState>) => {
    setCareerSiteById((prev) => {
      const cs = prev[careerId];
      if (!cs) return prev;
      return { ...prev, [careerId]: { ...cs, ...patch } };
    });
    markDirty();
  };

  const updateAtsInCatalog = (atsId: string, patch: Partial<AtsState>) => {
    setAtsById((prev) => {
      const a = prev[atsId];
      if (!a) return prev;
      return { ...prev, [atsId]: { ...a, ...patch } };
    });
    markDirty();
  };

  const gcAtsIfUnreferenced = (atsId: string, nextFlows: FlowState[]) => {
    if (!nextFlows.some((f) => f.atsIds.includes(atsId))) {
      setAtsById((cat) => {
        const { [atsId]: _, ...rest } = cat;
        return rest;
      });
    }
  };

  const selectFlow = (flowId: string) => {
    setSelection({ kind: "flow", flowId });
  };

  const selectCareerSite = (flowId: string) => {
    setSelection({ kind: "career", flowId });
  };

  const createCareerSiteForFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.careerSiteId) return;
    if (Object.keys(careerSiteById).length >= 2) {
      toast.message("Maximum 2 unique career sites. Attach an existing site instead.");
      return;
    }
    const careerId = newId();
    const name = `career site ${careerSiteSerial}`;
    setCareerSiteSerial((n) => n + 1);
    setCareerSiteById((prev) => ({ ...prev, [careerId]: emptyCareerSite(name, architecture) }));
    updateFlow(flowId, { careerSiteId: careerId });
    setSelection({ kind: "career", flowId });
  };

  const attachCareerSiteToFlow = (flowId: string, careerId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || flow.careerSiteId) return;
    if (!careerSiteById[careerId]) return;
    updateFlow(flowId, { careerSiteId: careerId });
    setSelection({ kind: "career", flowId });
  };

  const removeCareerSite = (flowId: string) => {
    setFlows((prev) => {
      const careerId = prev.find((f) => f.id === flowId)?.careerSiteId ?? null;
      const next = prev.map((f) => (f.id === flowId ? { ...f, careerSiteId: null } : f));
      if (careerId && !next.some((f) => f.careerSiteId === careerId)) {
        setCareerSiteById((cat) => {
          const { [careerId]: _, ...rest } = cat;
          return rest;
        });
      }
      return next;
    });
    setSelection({ kind: "flow", flowId });
    markDirty();
  };

  const createNewAtsForFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    if (flow.atsIds.length >= atsLimitPerFlow) {
      toast.message("Only one ATS can be added per flow.");
      return;
    }
    if (Object.keys(atsById).length >= 2) {
      toast.message("Select an existing ATS template from the menu.");
      return;
    }
    const aid = newId();
    const vendor = nextUnusedAtsVendor(atsById);
    setAtsById((prev) => ({ ...prev, [aid]: emptyAts(vendor, architecture) }));
    updateFlow(flowId, (f) => ({ ...f, atsIds: [...f.atsIds, aid] }));
    setSelection({ kind: "ats", flowId, atsId: aid });
    toast.message(`Added ${vendor}.`);
  };

  const confirmReuseAts = (flowId: string, catalogId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || !atsById[catalogId] || flow.atsIds.includes(catalogId)) return;
    if (flow.atsIds.length >= atsLimitPerFlow) return;
    updateFlow(flowId, (f) => ({ ...f, atsIds: [...f.atsIds, catalogId] }));
    setSelection({ kind: "ats", flowId, atsId: catalogId });
    toast.message("ATS attached to this flow.");
  };

  const removeAtsFromFlow = (flowId: string, atsCatalogId: string) => {
    setFlows((prev) => {
      const nextFlows = prev.map((f) =>
        f.id === flowId ? { ...f, atsIds: f.atsIds.filter((id) => id !== atsCatalogId) } : f,
      );
      gcAtsIfUnreferenced(atsCatalogId, nextFlows);
      return nextFlows;
    });
    setSelection({ kind: "flow", flowId });
    markDirty();
  };

  const addFlow = () => {
    const n = flows.length + 1;
    const flow: FlowState = { id: newId(), name: `Flow ${n}`, careerSiteId: null, atsIds: [] };
    setFlows((prev) => [...prev, flow]);
    setSelection({ kind: "flow", flowId: flow.id });
    markDirty();
  };

  const duplicateFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    const n = flows.length + 1;
    const cloned: FlowState = {
      id: newId(),
      name: `Flow ${n}`,
      careerSiteId: flow.careerSiteId,
      atsIds: [...flow.atsIds],
    };
    setFlows((prev) => [...prev, cloned]);
    setSelection({ kind: "flow", flowId: cloned.id });
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
    const orphaned = removed?.careerSiteId;
    if (orphaned && !nextFlows.some((f) => f.careerSiteId === orphaned)) {
      setCareerSiteById((cat) => {
        const { [orphaned]: _, ...rest } = cat;
        return rest;
      });
    }
    const removedAts = removed?.atsIds ?? [];
    if (removedAts.length > 0) {
      setAtsById((cat) => {
        let next = { ...cat };
        for (const aid of removedAts) {
          if (!nextFlows.some((f) => f.atsIds.includes(aid))) {
            const { [aid]: _, ...rest } = next;
            next = rest;
          }
        }
        return next;
      });
    }
    setFlows(nextFlows);
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
    setCareerSiteById({});
    setAtsById({});
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
    setCareerSiteById({});
    setAtsById({});
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
    setCareerSiteById({});
    setAtsById({});
    setCareerSiteSerial(1);
    setSelection(null);
    setLifecycleMode("wizard");
    setStage(1);
    setDirty(false);
    toast.message("Changes discarded.");
  };

  const catalogEntries = React.useMemo(
    () =>
      Object.entries(careerSiteById).map(([id, cs]) => ({
        id,
        name: cs.name.trim() || "Untitled career site",
      })),
    [careerSiteById],
  );

  const resolveCareer = (f: FlowState): CareerSiteState | null => {
    if (!f.careerSiteId) return null;
    return careerSiteById[f.careerSiteId] ?? null;
  };

  const reviewBlockersList = React.useMemo(
    () => reviewBlockers(flows, careerSiteById, atsById, architecture),
    [flows, careerSiteById, atsById, architecture],
  );

  React.useEffect(() => {
    if (stage !== 2) setPendingDeleteFlowId(null);
  }, [stage]);

  if (stage === 1) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-6">
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
                    ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-secondary-lighter)]"
                    : "border-[color:var(--figma-gray-border-02)] bg-white hover:border-[color:var(--figma-gray-border-03)]",
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color:var(--figma-gray-bg-03)]">
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
                    ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-secondary-lighter)]"
                    : "border-[color:var(--figma-gray-border-02)] bg-white hover:border-[color:var(--figma-gray-border-03)]",
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color:var(--figma-gray-bg-03)]">
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
          careerSiteById={careerSiteById}
          atsById={atsById}
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
            setStage(4);
            toast.success("Setup launched.");
          }}
          onPublish={
            isLivePublish
              ? () => {
                  const snap = buildSnapshot();
                  saveLive({ ...snap, wizardStage: 2 }, { mode: "live" });
                  setLiveSnapshot(cloneSnapshot(snap));
                  setWorkingCopy(null);
                  setLifecycleMode("liveReadOnly");
                  setStage(2);
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
          careerSitesCount={Object.keys(careerSiteById).length}
          atsCount={Object.keys(atsById).length}
          defaultEventsEnabled={countEnabledDefaultEvents(careerSiteById, atsById)}
          customEventsCount={countCustomEventsDefined(careerSiteById, atsById)}
          customEventsEnabledCount={countEnabledCustomEventsGlobally(careerSiteById, atsById)}
          onExitForNow={requestExit}
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

        {liveEditing ? (
          <div className="shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-warning-lighter)]/35 px-6 py-3">
            <p className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
              Editing live setup
            </p>
            <p className="mt-1 text-xs text-[color:var(--figma-gray-text-04)]">
              Changes will not affect the live setup until you publish them.
            </p>
          </div>
        ) : null}

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

        <div className="flex min-h-0 flex-1 overflow-hidden">
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
                          career={resolveCareer(flow)}
                          atsCards={flow.atsIds
                            .map((id) => {
                              const a = atsById[id];
                              return a ? { id, ats: a } : null;
                            })
                            .filter((x): x is { id: string; ats: AtsState } => x !== null)}
                          catalogEntries={catalogEntries}
                          catalogFull={Object.keys(careerSiteById).length >= 2}
                          selection={selection}
                          onSelectFlow={() => selectFlow(flow.id)}
                          onSelectCareer={() => flow.careerSiteId && selectCareerSite(flow.id)}
                          onSelectAts={(atsId) =>
                            setSelection({ kind: "ats", flowId: flow.id, atsId })
                          }
                          onCreateCareerSite={() => createCareerSiteForFlow(flow.id)}
                          onAttachCareerSite={(careerId) =>
                            attachCareerSiteToFlow(flow.id, careerId)
                          }
                          canCreateNewAtsTemplate={Object.keys(atsById).length < 2}
                          attachableAtsForFlow={attachableAtsEntriesForFlow(flow, atsById)}
                          onCreateNewAts={() => createNewAtsForFlow(flow.id)}
                          onAttachAtsCatalog={(catalogId) => confirmReuseAts(flow.id, catalogId)}
                          onRemoveAts={(atsCatalogId) => removeAtsFromFlow(flow.id, atsCatalogId)}
                          onRemoveCareer={() => removeCareerSite(flow.id)}
                          onDuplicate={() => duplicateFlow(flow.id)}
                          onDelete={() => requestDeleteFlow(flow.id)}
                          allowDeleteFlow={flows.length > 1}
                          onRename={(name) => updateFlow(flow.id, { name })}
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

          <aside className="flex min-h-0 flex-[0_0_32%] flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {!ctx ? (
                <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                  Select a node on the canvas.
                </p>
              ) : ctx.selection.kind === "flow" ? (
                <FlowSettingsPanel
                  flow={ctx.flow}
                  nodeCount={flowTrackingNodeCount(ctx.flow)}
                  onNameChange={(name) => updateFlow(ctx.flow.id, { name })}
                  onDuplicate={() => duplicateFlow(ctx.flow.id)}
                  onDelete={() => requestDeleteFlow(ctx.flow.id)}
                  allowDeleteFlow={flows.length > 1}
                  readOnly={readOnlySetup}
                />
              ) : ctx.selection.kind === "career" ? (
                ctx.flow.careerSiteId && careerSiteById[ctx.flow.careerSiteId] ? (
                  <CareerSitePanel
                    career={careerSiteById[ctx.flow.careerSiteId]!}
                    architecture={architecture}
                    readOnly={readOnlySetup}
                    careerSiteById={careerSiteById}
                    atsById={atsById}
                    onChange={(patch) => updateCareerSiteInCatalog(ctx.flow.careerSiteId!, patch)}
                    onRemove={() => removeCareerSite(ctx.flow.id)}
                  />
                ) : (
                  <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                    Career site was removed. Select the flow or add a career site again.
                  </p>
                )
              ) : ctx.selection.kind === "ats" ? (
                (() => {
                  const sid = (ctx.selection as Extract<Selection, { kind: "ats" }>).atsId;
                  const ats = atsById[sid];
                  return ats ? (
                    <AtsConfigurationPanel
                      ats={ats}
                      atsCatalogId={sid}
                      atsById={atsById}
                      careerSiteById={careerSiteById}
                      architecture={architecture}
                      readOnly={readOnlySetup}
                      onChange={(patch) => updateAtsInCatalog(sid, patch)}
                      onRemove={() => removeAtsFromFlow(ctx.flow.id, sid)}
                    />
                  ) : (
                    <p className="text-sm text-[color:var(--figma-gray-text-03)]">
                      ATS was removed. Select the flow or add ATS again.
                    </p>
                  );
                })()
              ) : null}
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
        <FlowCatalogDropdownInfoBanner message="Maximum 2 career sites allowed. You can reuse an existing career site added in the flow." />
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
  canCreateNewAtsTemplate,
  attachableAts,
  onCreateNewAts,
  onAttachAtsCatalog,
  architecture,
}: {
  flowId: string;
  atsCards: { id: string; ats: AtsState }[];
  selection: Selection | null;
  onSelectAts: (atsId: string) => void;
  onRemoveAts: (atsCatalogId: string) => void;
  readOnly?: boolean;
  canCreateNewAtsTemplate: boolean;
  attachableAts: { id: string; vendor: string }[];
  onCreateNewAts: () => void;
  onAttachAtsCatalog: (catalogId: string) => void;
  architecture: Architecture;
}) {
  return (
    <div className="flex flex-row flex-nowrap items-start justify-center gap-2">
      {atsCards.map(({ id, ats }) => {
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
              "w-[230px] shrink-0 rounded-lg border-2 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all",
              atsSelected && !atsOk
                ? "border-[color:var(--figma-error-main)]"
                : atsSelected
                  ? "border-[color:var(--figma-secondary-main)]"
                  : "border-[color:var(--figma-gray-border-02)] hover:border-[color:var(--figma-secondary-main)]",
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
          canCreateNewTemplate={canCreateNewAtsTemplate}
          attachable={attachableAts}
          onCreateNew={onCreateNewAts}
          onAttach={onAttachAtsCatalog}
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
  career,
  atsCards,
  catalogEntries,
  catalogFull,
  selection,
  onSelectFlow,
  onSelectCareer,
  onSelectAts,
  onCreateCareerSite,
  onAttachCareerSite,
  canCreateNewAtsTemplate,
  attachableAtsForFlow,
  onCreateNewAts,
  onAttachAtsCatalog,
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
  career: CareerSiteState | null;
  atsCards: { id: string; ats: AtsState }[];
  catalogEntries: { id: string; name: string }[];
  catalogFull: boolean;
  selection: Selection | null;
  onSelectFlow: () => void;
  onSelectCareer: () => void;
  onSelectAts: (atsId: string) => void;
  onCreateCareerSite: () => void;
  onAttachCareerSite: (careerId: string) => void;
  canCreateNewAtsTemplate: boolean;
  attachableAtsForFlow: { id: string; vendor: string }[];
  onCreateNewAts: () => void;
  onAttachAtsCatalog: (catalogId: string) => void;
  onRemoveAts: (atsCatalogId: string) => void;
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
  const n = flowTrackingNodeCount(flow);
  const nodeLabel = n === 1 ? "1 node" : `${n} nodes`;
  const cname = career ? career.name.trim() || "Career site" : "";
  const atsCount = flow.atsIds.length;
  const firstVendor = (atsCards[0]?.ats.vendor ?? "").trim() || "ATS";
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
          "w-[220px] rounded-lg border-2 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow",
          flowSelected
            ? "border-[color:var(--figma-secondary-main)]"
            : "border-[color:var(--figma-gray-border-02)]",
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
              className="min-w-0 flex-1 truncate border-none bg-transparent text-sm font-semibold text-[color:var(--figma-gray-text-05)] outline-none focus:ring-0 disabled:opacity-60"
            />
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
            canCreateNewTemplate={canCreateNewAtsTemplate}
            attachable={attachableAtsForFlow}
            onCreateNew={onCreateNewAts}
            onAttach={onAttachAtsCatalog}
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
              "w-[220px] rounded-lg border-2 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all",
              careerSelected
                ? "border-[color:var(--figma-success-main)]"
                : "border-[color:var(--figma-gray-border-02)] hover:border-[color:var(--figma-success-main)] hover:shadow-md",
            )}
          >
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
            canCreateNewAtsTemplate={canCreateNewAtsTemplate}
            attachableAts={attachableAtsForFlow}
            onCreateNewAts={onCreateNewAts}
            onAttachAtsCatalog={onAttachAtsCatalog}
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
            canCreateNewAtsTemplate={canCreateNewAtsTemplate}
            attachableAts={attachableAtsForFlow}
            onCreateNewAts={onCreateNewAts}
            onAttachAtsCatalog={onAttachAtsCatalog}
            architecture={architecture}
          />
        </>
      ) : null}
    </div>
  );
}

function FlowSettingsPanel({
  flow,
  nodeCount,
  onNameChange,
  onDuplicate,
  onDelete,
  allowDeleteFlow,
  readOnly,
}: {
  flow: FlowState;
  nodeCount: number;
  onNameChange: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  allowDeleteFlow: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[color:var(--figma-gray-text-05)]">
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
      <div className="space-y-2">
        <Label htmlFor={`flow-name-${flow.id}`}>
          Flow name <span className="text-[color:var(--figma-error-main)]">*</span>
        </Label>
        <Input
          id={`flow-name-${flow.id}`}
          value={flow.name}
          disabled={readOnly}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <Badge
        variant="secondary"
        className="bg-[color:var(--figma-gray-bg-05)] font-medium text-[color:var(--figma-gray-text-04)]"
      >
        {nodeCount} nodes
      </Badge>
      <div className="space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
        <p>
          <span className="font-semibold text-[color:var(--figma-gray-text-05)]">Career site:</span>{" "}
          {flow.careerSiteId ? 1 : 0}
        </p>
        <p>
          <span className="font-semibold text-[color:var(--figma-gray-text-05)]">ATS:</span>{" "}
          {flow.atsIds.length}
        </p>
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
  careerSiteById,
  atsById,
  onChange,
  onRemove,
}: {
  career: CareerSiteState;
  architecture: Architecture;
  readOnly?: boolean;
  careerSiteById: Record<string, CareerSiteState>;
  atsById: Record<string, AtsState>;
  onChange: (patch: Partial<CareerSiteState>) => void;
  onRemove: () => void;
}) {
  const globalCustomCount = countGlobalCustomEvents(careerSiteById, atsById);

  if (architecture === "s2s") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[color:var(--figma-gray-text-05)]">
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
        <div className="space-y-2">
          <Label htmlFor="cs-name-s2s">
            Career site name <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <Input
            id="cs-name-s2s"
            value={career.name}
            disabled={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn(!career.name.trim() && "border-[color:var(--figma-error-main)]")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-s2s-endpoint">
            Endpoint URL <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <Input
            id="cs-s2s-endpoint"
            placeholder="https://api.company.com/joveo/postback"
            value={career.s2sEndpointUrl ?? ""}
            disabled={readOnly}
            onChange={(e) => onChange({ s2sEndpointUrl: e.target.value })}
            className={cn(
              !(career.s2sEndpointUrl ?? "").trim() && "border-[color:var(--figma-error-main)]",
            )}
          />
          <p className="text-xs text-[color:var(--figma-gray-text-03)]">
            Send selected server-side events to this endpoint.
          </p>
        </div>
        <Separator />
        <CareerSiteEventsSection
          events={career.events}
          architecture="s2s"
          readOnly={readOnly}
          globalCustomCount={globalCustomCount}
          onReplaceEvents={(events) => onChange({ events })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[color:var(--figma-gray-text-05)]">
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
      <div className="space-y-2">
        <Label htmlFor="cs-name">
          Career site name <span className="text-[color:var(--figma-error-main)]">*</span>
        </Label>
        <Input
          id="cs-name"
          value={career.name}
          disabled={readOnly}
          onChange={(e) => onChange({ name: e.target.value })}
          className={cn(!career.name.trim() && "border-[color:var(--figma-error-main)]")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-base">
          Enter base URL <span className="text-[color:var(--figma-error-main)]">*</span>
        </Label>
        <Input
          id="cs-base"
          placeholder="https://"
          value={career.baseUrl}
          disabled={readOnly}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
          className={cn(!career.baseUrl.trim() && "border-[color:var(--figma-error-main)]")}
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
          Tracking configuration
        </h3>
        {architecture === "pixel" ? <TrackingConfigurationPixelGuidance /> : null}
      </div>
      <CareerSiteEventsSection
        events={career.events}
        architecture={architecture}
        readOnly={readOnly}
        globalCustomCount={globalCustomCount}
        onReplaceEvents={(events) => onChange({ events })}
        pixelUrlResolveBase={career.baseUrl.trim() || undefined}
      />
    </div>
  );
}

function AtsConfigurationPanel({
  ats,
  atsCatalogId,
  atsById,
  careerSiteById,
  architecture,
  readOnly,
  onChange,
  onRemove,
}: {
  ats: AtsState;
  atsCatalogId: string;
  atsById: Record<string, AtsState>;
  careerSiteById: Record<string, CareerSiteState>;
  architecture: Architecture;
  readOnly?: boolean;
  onChange: (patch: Partial<AtsState>) => void;
  onRemove: () => void;
}) {
  const vendorsTakenElsewhere = React.useMemo(
    () => vendorsUsedByOtherAtsEntries(atsById, atsCatalogId),
    [atsById, atsCatalogId],
  );
  const vendorSelectOptions = React.useMemo(
    () => ATS_OPTIONS.filter((opt) => opt === ats.vendor || !vendorsTakenElsewhere.has(opt)),
    [ats.vendor, vendorsTakenElsewhere],
  );
  const atsVendorDropdownOptions = React.useMemo((): SearchableDropdownOption[] => {
    return vendorSelectOptions.map((opt) => {
      const base: SearchableDropdownOption = { value: opt, label: opt };
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
  const globalCustomCount = countGlobalCustomEvents(careerSiteById, atsById);
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

  if (architecture === "s2s") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[color:var(--figma-gray-text-05)]">
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
        <div className="space-y-2">
          <Label htmlFor="ats-vendor-select-s2s">
            ATS name <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <SearchableDropdown
            id="ats-vendor-select-s2s"
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
        <div className="space-y-2">
          <Label htmlFor="ats-endpoint-s2s">
            Endpoint URL <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <Input
            id="ats-endpoint-s2s"
            placeholder="https://api.company.com/joveo/postback"
            value={ats.endpointUrl}
            disabled={readOnly}
            onChange={(e) => onChange({ endpointUrl: e.target.value })}
            className={cn(!ats.endpointUrl.trim() && "border-[color:var(--figma-error-main)]")}
          />
          <p className="text-xs text-[color:var(--figma-gray-text-03)]">
            Send selected server-side events to this endpoint.
          </p>
        </div>
        <Separator />
        <AtsEventsSection
          events={ats.events}
          architecture="s2s"
          readOnly={readOnly}
          globalCustomCount={globalCustomCount}
          onReplaceEvents={(events) => onChange({ events })}
        />
        <div className="space-y-2">
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[color:var(--figma-gray-text-05)]">
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
      <div className="space-y-2">
        <Label htmlFor="ats-vendor-select">
          Select ATS <span className="text-[color:var(--figma-error-main)]">*</span>
        </Label>
        <SearchableDropdown
          id="ats-vendor-select"
          options={atsVendorDropdownOptions}
          value={ats.vendor}
          onValueChange={(v) => onChange({ vendor: v })}
          disabled={readOnly}
          placeholder="Select ATS"
          searchPlaceholder="Search"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ats-endpoint">
          Enter base URL <span className="text-[color:var(--figma-error-main)]">*</span>
        </Label>
        <Input
          id="ats-endpoint"
          placeholder="e.g. http://company.myworkdayjobs.com/jobs"
          value={ats.endpointUrl}
          disabled={readOnly}
          onChange={(e) => onChange({ endpointUrl: e.target.value })}
          className={cn(!ats.endpointUrl.trim() && "border-[color:var(--figma-error-main)]")}
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
          Tracking configuration
        </h3>
        {architecture === "pixel" ? <TrackingConfigurationPixelGuidance /> : null}
      </div>
      <AtsEventsSection
        events={ats.events}
        architecture={architecture}
        readOnly={readOnly}
        globalCustomCount={globalCustomCount}
        onReplaceEvents={(events) => onChange({ events })}
        pixelUrlResolveBase={ats.endpointUrl.trim() || undefined}
      />
    </div>
  );
}
