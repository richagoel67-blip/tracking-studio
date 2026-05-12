import * as React from "react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import type { QuickTestEventStep } from "./quick-test-plan";
import { RawPayloadAccordion } from "./RawPayloadAccordion";

export type QuickTestCardStatus =
  | "DETECTED"
  | "WARNING"
  | "LISTENING"
  | "TIMEOUT"
  | "NOT_DETECTED"
  | "PENDING";

const statusPillClass: Record<QuickTestCardStatus, string> = {
  DETECTED:
    "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)] border-[color:var(--figma-success-main)]/25",
  WARNING:
    "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)] border-[color:var(--figma-warning-main)]/25",
  LISTENING:
    "bg-blue-50 text-blue-800 border-blue-200",
  TIMEOUT: "bg-red-50 text-red-800 border-red-200",
  NOT_DETECTED: "bg-red-50 text-red-800 border-red-200",
  PENDING: "bg-[color:var(--figma-gray-bg-05)] text-[color:var(--figma-gray-text-04)] border-[color:var(--figma-gray-border-03)]",
};

const cardBorderClass: Record<QuickTestCardStatus, string> = {
  DETECTED: "border-[color:var(--figma-success-main)]/40 bg-[color:var(--figma-success-lighter)]/35",
  WARNING: "border-[color:var(--figma-warning-main)]/45 bg-[color:var(--figma-warning-lighter)]/25",
  LISTENING: "border-blue-300/80 bg-blue-50/40",
  TIMEOUT: "border-red-300/80 bg-red-50/30",
  NOT_DETECTED: "border-red-300/80 bg-red-50/30",
  PENDING: "border-[color:var(--figma-gray-border-02)] bg-white",
};

export function QuickTestEventValidationCard({
  step,
  status,
  message,
  latencyLabel,
  jtrackPresent,
  warningBox,
  actions,
  rawPayload,
  rawExpanded,
  onRawToggle,
}: {
  step: QuickTestEventStep;
  status: QuickTestCardStatus;
  message?: string;
  latencyLabel?: string;
  jtrackPresent?: boolean | null;
  warningBox?: string;
  actions?: { label: string; onClick?: () => void }[];
  rawPayload: string;
  rawExpanded: boolean;
  onRawToggle: () => void;
}) {
  const showJtrack = status !== "PENDING" && status !== "LISTENING" && jtrackPresent !== null && jtrackPresent !== undefined;

  return (
    <article
      className={cn(
        "rounded-lg border-2 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors",
        cardBorderClass[status],
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--figma-gray-bg-05)] text-xs font-bold text-[color:var(--figma-gray-text-05)]">
              {step.stepNumber}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  {step.displayName}
                </h3>
                <span className="rounded-full border border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[color:var(--figma-gray-text-05)]">
                  {step.eventCode}
                </span>
                <span className="rounded-full border border-[color:var(--figma-gray-border-03)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--figma-gray-text-04)]">
                  {step.methodLabel}
                </span>
                {latencyLabel ? (
                  <span className="text-xs font-medium text-[color:var(--figma-gray-text-03)]">
                    {latencyLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-[color:var(--figma-gray-text-03)]">
                {step.urlOrEndpoint}
              </p>
              <p className="mt-0.5 text-[10px] text-[color:var(--figma-gray-text-03)]">
                Source: {step.sourceNodeLabel}
              </p>
            </div>
          </div>

          {showJtrack ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                jtrackPresent
                  ? "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]"
                  : "bg-[color:var(--figma-error-lighter)] text-[color:var(--figma-error-main)]",
              )}
            >
              {jtrackPresent ? "jtrack" : "jtrack missing"}
            </span>
          ) : null}

          {message ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 flex-1 text-sm leading-5 text-[color:var(--figma-gray-text-04)]">
                {message}
              </p>
              <RawPayloadAccordion
                expanded={rawExpanded}
                onToggle={onRawToggle}
                payload={rawPayload}
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <RawPayloadAccordion
                expanded={rawExpanded}
                onToggle={onRawToggle}
                payload={rawPayload}
                disabled={status === "LISTENING" || status === "PENDING"}
              />
            </div>
          )}

          {warningBox ? (
            <div className="rounded-md border border-[color:var(--figma-warning-main)]/35 bg-[color:var(--figma-warning-lighter)]/40 px-3 py-2 text-xs leading-relaxed text-[color:var(--figma-gray-text-05)]">
              {warningBox}
            </div>
          ) : null}

          {actions && actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={a.onClick}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 sm:pt-0.5">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide",
              statusPillClass[status],
            )}
          >
            {status === "NOT_DETECTED"
              ? "NOT DETECTED"
              : status.replaceAll("_", " ")}
          </span>
        </div>
      </div>
    </article>
  );
}
