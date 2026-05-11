"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import type { Architecture } from "./tracking-setup-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const MAX_CUSTOM_GLOBAL = 5;

export { MAX_CUSTOM_GLOBAL };

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
  onPatch,
}: {
  ev: TrackingEvent;
  architecture: Architecture;
  readOnly?: boolean;
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
  const leadHelper = ev.id === "lead" && urlInvalid;

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
        {ev.id === "view" ? (
          <p className="mt-1 text-xs text-[color:var(--figma-gray-text-03)]">
            Enter URLs for the selected step.
          </p>
        ) : ev.id === "lead" ? (
          <p className="mt-1 text-xs text-[color:var(--figma-gray-text-03)]">
            Track lead conversions on your career site.
          </p>
        ) : null}
      </div>
      {expanded ? (
        <div className="space-y-3 rounded-lg border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)] p-3">
          <MethodSegments
            value={method}
            architecture={architecture}
            disabled={readOnly}
            onChange={(v) => onPatch({ trackingMethod: v })}
          />
          <div className="space-y-1">
            <Label>
              Add URL <span className="text-[color:var(--figma-error-main)]">*</span>
            </Label>
            <Input
              value={ev.url}
              disabled={readOnly}
              onChange={(e) => onPatch({ url: e.target.value })}
              className={cn(urlInvalid && "border-[color:var(--figma-error-main)]")}
            />
            {leadHelper ? (
              <p className="text-xs text-[color:var(--figma-error-main)]">
                Enter the URL where this event should fire.
              </p>
            ) : urlInvalid && ev.id !== "lead" ? (
              <p className="text-xs text-[color:var(--figma-error-main)]">
                URL is required when this event is enabled.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomEventBlock({
  ev,
  architecture,
  readOnly,
  onPatch,
  onRemove,
}: {
  ev: TrackingEvent;
  architecture: Architecture;
  readOnly?: boolean;
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
        <MethodSegments
          value={method}
          architecture={architecture}
          disabled={readOnly}
          onChange={(v) => onPatch({ trackingMethod: v })}
        />
        <div className="space-y-1">
          <Label>
            Add URL <span className="text-[color:var(--figma-error-main)]">*</span>
          </Label>
          <Input
            value={ev.url}
            disabled={readOnly}
            onChange={(e) => onPatch({ url: e.target.value })}
            className={cn(urlInvalid && "border-[color:var(--figma-error-main)]")}
          />
          {urlInvalid ? (
            <p className="text-xs text-[color:var(--figma-error-main)]">URL is required.</p>
          ) : null}
        </div>
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
}: {
  events: TrackingEvent[];
  architecture: Architecture;
  readOnly?: boolean;
  globalCustomCount: number;
  normalize: NormalizeFn;
  onReplaceEvents: (next: TrackingEvent[]) => void;
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
          onPatch={(p) => patchEvent(ev.id, p)}
        />
      ))}
      {customs.map((ev) => (
        <CustomEventBlock
          key={ev.id}
          ev={ev}
          architecture={architecture}
          readOnly={readOnly}
          onPatch={(p) => patchEvent(ev.id, p)}
          onRemove={() => removeCustom(ev.id)}
        />
      ))}
      <div className="space-y-1">
        <Button
          type="button"
          size="sm"
          className="w-full bg-[color:var(--figma-primary-main)] text-[color:var(--figma-on-primary-label)] hover:bg-[color:var(--figma-primary-main)]/90"
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
}) {
  const normalize = React.useCallback(
    (ev: TrackingEvent[]) => normalizeAtsEventsOrder(ev, props.architecture),
    [props.architecture],
  );
  return <EventsEditor {...props} normalize={normalize} />;
}
