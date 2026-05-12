"use client";

import * as React from "react";
import { ChevronDown, Info, Trash2 } from "lucide-react";

import type { Architecture } from "./tracking-setup-storage";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  addCustomEvent,
  eventChipToneClassNames,
  isExpandableDefault,
  nameToEventKey,
  normalizeAtsEventsOrder,
  normalizeCareerEventsOrder,
  removeCustomEvent,
  syncCustomEventKeys,
  updateEventInList,
  type TrackingEvent,
} from "./tracking-events";
import { deriveTrackingPattern, type DerivedTrackingPattern } from "./derive-tracking-pattern";

const MAX_CUSTOM_GLOBAL = 5;

export { MAX_CUSTOM_GLOBAL };

const EXACT_EVENT_URL_TOOLTIP =
  "Paste the exact page URL visible in the browser when this event should fire. We'll automatically extract the stable tracking pattern and ignore dynamic IDs, tracking parameters, and query strings.";

const TRACKING_CONFIGURATION_PIXEL_GUIDANCE_TOOLTIP =
  "Paste the exact page where the event happens. We use it to generate a stable tracking pattern by keeping the domain and static path while ignoring dynamic IDs, UTM parameters, and query strings.";

const PIXEL_EVENT_URL_PLACEHOLDERS: Record<string, string> = {
  view: "e.g. https://company.myworkdayjobs.com/careers/job/12345",
  lead: "e.g. https://careers.company.com/talent-community/thank-you",
  apply_start: "e.g. https://company.myworkdayjobs.com/apply/job/12345/start",
  apply_finish: "e.g. https://company.myworkdayjobs.com/apply/thank-you?candidate=abc123",
  custom: "e.g. https://careers.company.com/events/register/thank-you",
};

function pixelEventContributesUrl(ev: TrackingEvent): boolean {
  if (ev.type === "custom") return true;
  return ev.enabled;
}

function duplicatePixelPatternMessage(
  events: TrackingEvent[],
  currentId: string,
  url: string,
  resolveBase?: string,
): string | null {
  const mine = deriveTrackingPattern(url, resolveBase);
  if (!mine.valid || mine.isTooBroad) return null;
  for (const e of events) {
    if (e.id === currentId) continue;
    if (!pixelEventContributesUrl(e)) continue;
    const tu = e.url?.trim();
    if (!tu) continue;
    const theirs = deriveTrackingPattern(tu, resolveBase);
    if (theirs.valid && !theirs.isTooBroad && theirs.generatedPattern === mine.generatedPattern) {
      return "This tracking pattern is already used for another event. Confirm this is intentional.";
    }
  }
  return null;
}

/** Link + tooltip under “Tracking configuration” for Pixel architecture (career + ATS panels). */
export function TrackingConfigurationPixelGuidance() {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-semibold text-[color:var(--figma-secondary-main)] underline decoration-[color:var(--figma-secondary-main)]/35 underline-offset-2 hover:decoration-[color:var(--figma-secondary-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)] focus-visible:ring-offset-2"
          >
            Why we ask for exact URLs
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" title="Why we ask for exact URLs">
          {TRACKING_CONFIGURATION_PIXEL_GUIDANCE_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function PatternChip({ prefix, value }: { prefix: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)] px-2 py-0.5 font-mono text-[10px] font-medium text-[color:var(--figma-gray-text-04)]">
      <span className="shrink-0 text-[color:var(--figma-gray-text-03)]">{prefix}</span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
}

/** Sub-labels inside the generated-pattern card (Figma-style caps). */
function PatternCardSectionLabel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "muted";
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-bold uppercase leading-tight tracking-[0.08em]",
        tone === "success" && "text-green-800",
        tone === "muted" && "text-[color:var(--figma-gray-text-03)]",
      )}
    >
      {children}
    </p>
  );
}

/** Domain + literal path segments only (no wildcards), for “Part we use for matching”. */
function matchingPartDisplay(derived: DerivedTrackingPattern): string {
  const host = derived.host.trim();
  if (!derived.staticSegments.length) return host;
  return `${host}${derived.staticSegments.join("")}`;
}

function GeneratedTrackingPatternCard({
  derived,
  trimmed,
  requiredEmpty,
  duplicateMessage,
  formatWarning,
}: {
  derived: DerivedTrackingPattern;
  trimmed: boolean;
  requiredEmpty: boolean;
  duplicateMessage: string | null;
  formatWarning: string | null;
}) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const showPattern = Boolean(trimmed && derived.valid && !requiredEmpty);
  const hasIgnored =
    derived.ignoredDynamicSegments.length > 0 || derived.ignoredQueryParams.length > 0;

  return (
    <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-semibold text-[color:var(--figma-gray-text-05)]">
        Generated tracking pattern
      </p>
      {!showPattern ? (
        <p className="mt-2 text-xs text-[color:var(--figma-gray-text-03)]">
          Waiting for valid exact URL
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900/50 dark:bg-green-950/30">
            <PatternCardSectionLabel tone="success">
              Part we use for matching
            </PatternCardSectionLabel>
            <p className="mt-2 break-all font-mono text-xs font-medium leading-relaxed text-[color:var(--figma-gray-text-05)]">
              {matchingPartDisplay(derived)}
            </p>
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-2.5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md bg-transparent px-0 py-2.5 text-left text-xs font-semibold text-[color:var(--figma-gray-text-05)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)] focus-visible:ring-offset-1"
              >
                <span className="min-w-0 pr-2">View ignored parts and final pattern</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-[color:var(--figma-gray-icon-04)] transition-transform duration-200",
                    detailsOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="mt-2 space-y-2">
                <div className="rounded-md border border-[color:var(--figma-gray-border-02)] bg-white px-3 py-2.5">
                  <PatternCardSectionLabel tone="muted">Part we ignore</PatternCardSectionLabel>
                  {hasIgnored ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {derived.ignoredDynamicSegments.map((s) => (
                        <PatternChip key={`d-${s}`} prefix="dynamic:" value={s} />
                      ))}
                      {derived.ignoredQueryParams.map((q) => (
                        <PatternChip key={`q-${q}`} prefix="query:" value={q} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-[color:var(--figma-gray-text-04)]">
                      No dynamic IDs or query parameters found.
                    </p>
                  )}
                </div>
                <div className="rounded-md border border-[color:var(--figma-gray-border-02)] bg-white px-3 py-2.5">
                  <PatternCardSectionLabel tone="muted">Final pattern</PatternCardSectionLabel>
                  <p className="mt-2 break-all font-mono text-xs font-medium leading-relaxed text-[color:var(--figma-gray-text-05)]">
                    {derived.generatedPattern}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {formatWarning ? (
            <p className="mt-2 text-xs font-medium text-[color:var(--figma-warning-main)]">
              {formatWarning}
            </p>
          ) : null}
          {duplicateMessage ? (
            <p className="mt-2 text-xs font-medium text-[color:var(--figma-warning-main)]">
              {duplicateMessage}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function PixelExactEventUrlField({
  eventId,
  value,
  onChange,
  readOnly,
  requiredEmpty,
  allEvents,
  resolveBaseUrl,
}: {
  eventId: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  /** True when URL is required but empty (existing validation). */
  requiredEmpty: boolean;
  allEvents: TrackingEvent[];
  resolveBaseUrl?: string;
}) {
  const inputId = React.useId();
  const trimmed = value.trim();
  const derived = React.useMemo(
    () => deriveTrackingPattern(value, resolveBaseUrl),
    [value, resolveBaseUrl],
  );
  const dupMsg = React.useMemo(
    () => duplicatePixelPatternMessage(allEvents, eventId, value, resolveBaseUrl),
    [allEvents, eventId, value, resolveBaseUrl],
  );

  const placeholder = PIXEL_EVENT_URL_PLACEHOLDERS[eventId] ?? PIXEL_EVENT_URL_PLACEHOLDERS.custom;

  let formatError: string | null = null;
  let formatWarning: string | null = null;
  if (trimmed) {
    if (derived.error) {
      formatError = derived.error;
    } else if (derived.isTooBroad) {
      formatWarning = "This URL may be too broad. Add the exact page where this event fires.";
    }
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={inputId} className="mb-0">
            Exact event URL <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 rounded text-[color:var(--figma-gray-icon-04)] hover:text-[color:var(--figma-secondary-main)]"
                aria-label="About exact event URL"
              >
                <Info className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" title="Exact event URL">
              {EXACT_EVENT_URL_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id={inputId}
          value={value}
          disabled={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "bg-white",
            requiredEmpty && "border-[color:var(--figma-error-main)]",
            formatError && "border-[color:var(--figma-error-main)]",
          )}
          aria-invalid={requiredEmpty || Boolean(formatError)}
        />
        {requiredEmpty ? (
          <p className="text-xs text-[color:var(--figma-error-main)]">
            {eventId === "lead"
              ? "Enter the URL where this event should fire."
              : "URL is required when this event is enabled."}
          </p>
        ) : null}
        {!requiredEmpty && formatError ? (
          <p className="text-xs text-[color:var(--figma-error-main)]">{formatError}</p>
        ) : null}
        {!requiredEmpty && formatWarning && !formatError ? (
          <p className="text-xs font-medium text-[color:var(--figma-warning-main)]">
            {formatWarning}
          </p>
        ) : null}
      </div>
      <GeneratedTrackingPatternCard
        derived={derived}
        trimmed={Boolean(trimmed)}
        requiredEmpty={requiredEmpty}
        duplicateMessage={dupMsg}
        formatWarning={requiredEmpty ? null : formatWarning}
      />
    </div>
  );
}

function MethodSegments({
  value,
  onChange,
  architecture,
  disabled,
}: {
  value: "js" | "image";
  onChange: (v: "js" | "image") => void;
  architecture: Architecture;
  disabled?: boolean;
}) {
  const jsLabel = architecture === "pixel" ? "JS Pixel" : "JS";
  const imageLabel = architecture === "pixel" ? "Image Pixel" : "Image";
  return (
    <div className="inline-flex rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("js")}
        className={cn(
          "h-9 min-w-[5.5rem] rounded-md px-4 text-sm font-medium transition-colors",
          value === "js"
            ? "border border-[color:var(--figma-secondary-main)] text-[color:var(--figma-secondary-main)]"
            : "border border-transparent text-[color:var(--figma-gray-text-04)] hover:bg-[color:var(--figma-gray-bg-01)]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {jsLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("image")}
        className={cn(
          "inline-flex h-9 min-w-[7rem] items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
          value === "image"
            ? "border border-[color:var(--figma-secondary-main)] text-[color:var(--figma-secondary-main)]"
            : "border border-transparent text-[color:var(--figma-gray-text-04)] hover:bg-[color:var(--figma-gray-bg-01)]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {imageLabel}
        {architecture !== "pixel" ? (
          <span className="rounded bg-[color:var(--figma-warning-lighter)] px-1 text-[9px] font-semibold text-[color:var(--figma-warning-main)]">
            REC
          </span>
        ) : null}
      </button>
    </div>
  );
}

function methodToJsImage(m: string): "js" | "image" {
  return m === "js" || m === "image" ? m : "image";
}

function DefaultEventBlock({
  ev,
  architecture,
  readOnly,
  allEvents,
  pixelUrlResolveBase,
  onPatch,
}: {
  ev: TrackingEvent;
  architecture: Architecture;
  readOnly?: boolean;
  allEvents: TrackingEvent[];
  pixelUrlResolveBase?: string;
  onPatch: (patch: Partial<TrackingEvent>) => void;
}) {
  if (architecture === "s2s") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[color:var(--figma-gray-text-05)]">
              {ev.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                eventChipToneClassNames(ev.eventKey),
              )}
            >
              {ev.eventKey}
            </span>
          </div>
          <Switch
            checked={ev.enabled}
            disabled={readOnly}
            onCheckedChange={(v) => onPatch({ enabled: v })}
          />
        </div>
      </div>
    );
  }

  const expanded =
    ev.enabled &&
    (isExpandableDefault(ev.id) || ev.id === "apply_start" || ev.id === "apply_finish");
  const urlInvalid = ev.enabled && expanded && !ev.url.trim();
  const method = methodToJsImage(ev.trackingMethod);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[color:var(--figma-gray-text-05)]">
              {ev.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                eventChipToneClassNames(ev.eventKey),
              )}
            >
              {ev.eventKey}
            </span>
          </div>
          <Switch
            checked={ev.enabled}
            disabled={readOnly}
            onCheckedChange={(v) => onPatch({ enabled: v })}
          />
        </div>
      </div>
      {expanded ? (
        <div className="space-y-3 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-3">
          <PixelExactEventUrlField
            eventId={ev.id}
            value={ev.url}
            onChange={(v) => onPatch({ url: v })}
            readOnly={readOnly}
            requiredEmpty={urlInvalid}
            allEvents={allEvents}
            resolveBaseUrl={pixelUrlResolveBase}
          />
          <MethodSegments
            value={method}
            architecture={architecture}
            disabled={readOnly}
            onChange={(v) => onPatch({ trackingMethod: v })}
          />
        </div>
      ) : null}
    </div>
  );
}

function CustomEventBlock({
  ev,
  architecture,
  readOnly,
  allEvents,
  pixelUrlResolveBase,
  onPatch,
  onRemove,
}: {
  ev: TrackingEvent;
  architecture: Architecture;
  readOnly?: boolean;
  allEvents: TrackingEvent[];
  pixelUrlResolveBase?: string;
  onPatch: (patch: Partial<TrackingEvent>) => void;
  onRemove: () => void;
}) {
  if (architecture === "s2s") {
    const nameInvalid = ev.enabled && !ev.label.trim();
    return (
      <div className="space-y-3 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <Label>
                Custom event name{" "}
                {ev.enabled ? (
                  <span className="text-[color:var(--figma-error-main)]">*</span>
                ) : null}
              </Label>
              <Input
                value={ev.label}
                disabled={readOnly}
                onChange={(e) =>
                  onPatch({ label: e.target.value, eventKey: nameToEventKey(e.target.value) })
                }
                className={cn(
                  (nameInvalid || ev.errors?.name) && "border-[color:var(--figma-error-main)]",
                )}
              />
              {ev.errors?.name ? (
                <p className="text-xs text-[color:var(--figma-error-main)]">{ev.errors.name}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[color:var(--figma-gray-text-03)]">Event key</span>
              <span className="rounded-full bg-[color:var(--figma-gray-bg-05)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--figma-gray-text-04)]">
                {nameToEventKey(ev.label)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[color:var(--figma-gray-text-04)]">On</span>
              <Switch
                checked={ev.enabled}
                disabled={readOnly}
                onCheckedChange={(v) => onPatch({ enabled: v })}
              />
            </div>
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
        </div>
      </div>
    );
  }

  const nameInvalid = !ev.label.trim();
  const urlInvalid = !ev.url.trim();
  const method = methodToJsImage(ev.trackingMethod);

  return (
    <div className="space-y-3 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <Label>
              Custom event name <span className="text-[color:var(--figma-error-main)]">*</span>
            </Label>
            <Input
              value={ev.label}
              disabled={readOnly}
              onChange={(e) =>
                onPatch({ label: e.target.value, eventKey: nameToEventKey(e.target.value) })
              }
              className={cn(
                (nameInvalid || ev.errors?.name) && "border-[color:var(--figma-error-main)]",
              )}
            />
            {ev.errors?.name ? (
              <p className="text-xs text-[color:var(--figma-error-main)]">{ev.errors.name}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[color:var(--figma-gray-text-03)]">Event key</span>
            <span className="rounded-full bg-[color:var(--figma-gray-bg-05)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--figma-gray-text-04)]">
              {nameToEventKey(ev.label)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>
      <div className="space-y-3 border-t border-[color:var(--figma-gray-border-02)] pt-3">
        <PixelExactEventUrlField
          eventId={ev.id}
          value={ev.url}
          onChange={(v) => onPatch({ url: v })}
          readOnly={readOnly}
          requiredEmpty={urlInvalid}
          allEvents={allEvents}
          resolveBaseUrl={pixelUrlResolveBase}
        />
        <MethodSegments
          value={method}
          architecture={architecture}
          disabled={readOnly}
          onChange={(v) => onPatch({ trackingMethod: v })}
        />
      </div>
    </div>
  );
}

type NormalizeFn = (events: TrackingEvent[]) => TrackingEvent[];

function EventsEditor({
  events,
  architecture,
  readOnly,
  globalCustomCount,
  normalize,
  onReplaceEvents,
  pixelUrlResolveBase,
}: {
  events: TrackingEvent[];
  architecture: Architecture;
  readOnly?: boolean;
  globalCustomCount: number;
  normalize: NormalizeFn;
  onReplaceEvents: (next: TrackingEvent[]) => void;
  /** Career / ATS base URL used to resolve relative pixel event URLs in previews. */
  pixelUrlResolveBase?: string;
}) {
  const defaults = events.filter((e) => e.type === "default");
  const customs = events.filter((e) => e.type === "custom");
  const atCap = globalCustomCount >= MAX_CUSTOM_GLOBAL;

  const patchEvent = (id: string, patch: Partial<TrackingEvent>) => {
    let next = updateEventInList(events, id, patch);
    next = syncCustomEventKeys(next);
    onReplaceEvents(normalize(next));
  };

  const addCustom = () => {
    if (atCap || readOnly) return;
    onReplaceEvents(normalize(addCustomEvent(events)));
  };

  const removeCustom = (id: string) => {
    if (readOnly) return;
    onReplaceEvents(normalize(removeCustomEvent(events, id)));
  };

  return (
    <div className="space-y-4">
      {defaults.map((ev) => (
        <DefaultEventBlock
          key={ev.id}
          ev={ev}
          architecture={architecture}
          readOnly={readOnly}
          allEvents={events}
          pixelUrlResolveBase={pixelUrlResolveBase}
          onPatch={(p) => patchEvent(ev.id, p)}
        />
      ))}
      {customs.map((ev) => (
        <CustomEventBlock
          key={ev.id}
          ev={ev}
          architecture={architecture}
          readOnly={readOnly}
          allEvents={events}
          pixelUrlResolveBase={pixelUrlResolveBase}
          onPatch={(p) => patchEvent(ev.id, p)}
          onRemove={() => removeCustom(ev.id)}
        />
      ))}
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-[color:var(--figma-primary-main)] text-[color:var(--figma-primary-main)] shadow-sm hover:bg-[color:var(--figma-primary-main)]/10 hover:text-[color:var(--figma-primary-main)]"
          disabled={readOnly || atCap}
          onClick={addCustom}
        >
          + Add custom conversion
        </Button>
        {atCap ? (
          <p className="text-xs text-[color:var(--figma-gray-text-03)]">
            Maximum 5 custom events reached for this client setup.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CareerSiteEventsSection(props: {
  events: TrackingEvent[];
  architecture: Architecture;
  readOnly?: boolean;
  globalCustomCount: number;
  onReplaceEvents: (next: TrackingEvent[]) => void;
  pixelUrlResolveBase?: string;
}) {
  const normalize = React.useCallback(
    (ev: TrackingEvent[]) => normalizeCareerEventsOrder(ev, props.architecture),
    [props.architecture],
  );
  return <EventsEditor {...props} normalize={normalize} />;
}

export function AtsEventsSection(props: {
  events: TrackingEvent[];
  architecture: Architecture;
  readOnly?: boolean;
  globalCustomCount: number;
  onReplaceEvents: (next: TrackingEvent[]) => void;
  pixelUrlResolveBase?: string;
}) {
  const normalize = React.useCallback(
    (ev: TrackingEvent[]) => normalizeAtsEventsOrder(ev, props.architecture),
    [props.architecture],
  );
  return <EventsEditor {...props} normalize={normalize} />;
}
