"use client";

import * as React from "react";
import { CheckCircle2, ScrollText, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  eventNameBadgeClass,
  formatFlowRouteSubtitle,
  isJtrackMissing,
  type EventStatus,
  type TrackingEventLog,
} from "./tracking-event-log";

const DISPLAY_LIMIT = 15;

export type TrackingEventsDrawerProps = {
  clientName: string;
  logs: TrackingEventLog[];
  isOpen: boolean;
  onClose: () => void;
};

function sortFlowNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function flowCountsByName(logs: readonly TrackingEventLog[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) {
    m.set(l.flowName, (m.get(l.flowName) ?? 0) + 1);
  }
  return m;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatListDateLabel(events: TrackingEventLog[]): string {
  if (events.length === 0) return "";
  const latest = new Date(events[0].recordedAt);
  const now = new Date();
  const month = latest.toLocaleString("en-US", { month: "short" });
  const day = latest.getDate();
  const year = latest.getFullYear();
  const tail = `${month} ${day}, ${year}`;
  if (isSameCalendarDay(latest, now)) {
    return `Today, ${tail}`;
  }
  const weekday = latest.toLocaleString("en-US", { weekday: "long" });
  return `${weekday}, ${tail}`;
}

function displayUrl(ev: TrackingEventLog): string {
  return ev.pageUrl ?? ev.endpointUrl ?? "—";
}

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === "received") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center" title="Received">
        <CheckCircle2
          className="size-6 text-[color:var(--figma-success-main)]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="sr-only">Received</span>
      </span>
    );
  }
  const issueLabel = status === "warning" ? "Warning" : "Failed";
  return (
    <span className="flex size-6 shrink-0 items-center justify-center" title={issueLabel}>
      <XCircle
        className="size-6 text-[color:var(--figma-error-main)]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="sr-only">{issueLabel}</span>
    </span>
  );
}

function methodDisplayChip(method: TrackingEventLog["method"]): string {
  return method.replace(/\s+/g, " ").toUpperCase();
}

function timelineDotClass(status: EventStatus): string {
  if (status === "received") return "bg-[color:var(--figma-success-main)]";
  return "bg-[color:var(--figma-error-main)]";
}

function identityResolutionDisplay(r: NonNullable<TrackingEventLog["identityResolution"]>): string {
  if (r === "fingerprint") return "fingerprint";
  if (r === "cookie") return "Cookie";
  return "Unattributed";
}

export function TrackingEventsDrawer({
  clientName,
  logs,
  isOpen,
  onClose,
}: TrackingEventsDrawerProps) {
  const [flowFilter, setFlowFilter] = React.useState<string>("__all__");

  React.useEffect(() => {
    if (!isOpen) setFlowFilter("__all__");
  }, [isOpen]);

  const recentWindow = React.useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    return sorted.slice(0, DISPLAY_LIMIT);
  }, [logs]);

  const windowSize = recentWindow.length;

  const flowNames = React.useMemo(() => {
    const unique = [...new Set(recentWindow.map((l) => l.flowName))];
    return sortFlowNames(unique);
  }, [recentWindow]);

  const counts = React.useMemo(() => flowCountsByName(recentWindow), [recentWindow]);

  const displayed = React.useMemo(() => {
    if (flowFilter === "__all__") return [...recentWindow];
    return recentWindow.filter((l) => l.flowName === flowFilter);
  }, [recentWindow, flowFilter]);

  const stats = React.useMemo(() => {
    const shown = displayed.length;
    let received = 0;
    let warnings = 0;
    let failed = 0;
    for (const e of displayed) {
      if (e.status === "received") received += 1;
      else if (e.status === "warning") warnings += 1;
      else failed += 1;
    }
    return { shown, received, warnings, failed };
  }, [displayed]);

  const listHeading = flowFilter === "__all__" ? "All tracking events" : `${flowFilter} events`;

  const dateLabel = formatListDateLabel(displayed);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const empty = displayed.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full max-h-[100dvh] w-full max-w-[min(600px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden border-l border-[color:var(--figma-gray-border-02)] bg-white p-0 shadow-xl sm:max-w-[600px]",
          "[&>button.absolute]:hidden",
        )}
      >
        <div className="sticky top-0 z-10 shrink-0 border-b border-[color:var(--figma-gray-border-02)] bg-white px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1 pr-10">
              <SheetTitle className="text-left text-lg font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">
                Tracking events
              </SheetTitle>
              <SheetDescription className="text-left text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                Last {windowSize} tracking event{windowSize === 1 ? "" : "s"} · {clientName}
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 shrink-0 rounded-md text-[color:var(--figma-gray-icon-04)] hover:bg-[color:var(--figma-gray-bg-01)] hover:text-[color:var(--figma-gray-text-05)]"
              onClick={onClose}
              aria-label="Close tracking events"
            >
              <X className="size-5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[color:var(--figma-gray-bg-04)] px-6 py-5">
          <div
            className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label="Filter by flow"
          >
            <FlowChip
              selected={flowFilter === "__all__"}
              onClick={() => setFlowFilter("__all__")}
              label="All flows"
              count={windowSize}
            />
            {flowNames.map((name) => (
              <FlowChip
                key={name}
                selected={flowFilter === name}
                onClick={() => setFlowFilter(name)}
                label={name}
                count={counts.get(name) ?? 0}
              />
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryCard label="Events shown" value={String(stats.shown)} />
            <SummaryCard label="Received" value={String(stats.received)} />
            <SummaryCard label="Warnings" value={String(stats.warnings)} />
            <SummaryCard label="Failed" value={String(stats.failed)} />
          </div>

          <div className="mb-3 flex min-h-[28px] flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-05)]">
              {listHeading}
            </h3>
            {dateLabel ? (
              <span className="text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-03)]">
                {dateLabel}
              </span>
            ) : null}
          </div>

          {empty ? (
            <div className="rounded-xl border border-[color:var(--figma-gray-border-03)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <ScrollText
                  className="size-10 text-[color:var(--figma-gray-icon-04)]"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <p className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                  No tracking events found
                </p>
                <p className="max-w-sm text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                  Try switching to another flow tab.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                className="pointer-events-none absolute bottom-6 left-[11px] top-6 w-px bg-[color:var(--figma-gray-border-02)]"
                aria-hidden
              />
              <ul className="space-y-4">
                {displayed.map((ev) => (
                  <li key={ev.id} className="flex gap-4">
                    <div className="relative z-[1] flex w-6 shrink-0 justify-center pt-6">
                      <span
                        className={cn(
                          "size-3 shrink-0 rounded-full ring-4 ring-[color:var(--figma-gray-bg-04)]",
                          timelineDotClass(ev.status),
                        )}
                        aria-hidden
                      />
                    </div>
                    <article className="min-w-0 flex-1 rounded-xl border border-[color:var(--figma-gray-border-03)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm leading-5">
                          <time
                            className="shrink-0 whitespace-nowrap text-[color:var(--figma-gray-text-04)]"
                            dateTime={ev.recordedAt}
                          >
                            {ev.time}
                          </time>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="shrink-0 whitespace-nowrap text-[color:var(--figma-gray-text-03)]">
                              {ev.flowName} :
                            </span>
                            <span className="min-w-0 font-medium text-[color:var(--figma-gray-text-04)]">
                              {formatFlowRouteSubtitle(ev)}
                            </span>
                          </div>
                        </div>

                        <div
                          className="h-px w-full bg-[color:var(--figma-gray-border-02)]"
                          aria-hidden
                        />

                        <div className="flex w-full items-start justify-between gap-8">
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-4">
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-1 text-xs font-medium leading-[18px]",
                                  eventNameBadgeClass(ev.event),
                                )}
                              >
                                {ev.event}
                              </span>
                              <p className="min-w-0 shrink text-sm leading-5 text-[color:var(--figma-gray-text-05)]">
                                <span className="font-normal">Job : </span>
                                <span className="font-medium">{ev.jobId}</span>
                              </p>
                            </div>

                            <div className="flex min-w-0 flex-wrap items-center gap-4 text-sm leading-5">
                              <span
                                className={cn(
                                  "shrink-0 whitespace-nowrap",
                                  isJtrackMissing(ev.jtrack)
                                    ? "text-[color:var(--figma-error-main)]"
                                    : "text-[color:var(--figma-success-main)]",
                                )}
                              >
                                jtrack : {isJtrackMissing(ev.jtrack) ? "missing" : ev.jtrack}
                              </span>
                              {ev.identityResolution ? (
                                <span className="shrink-0 whitespace-nowrap text-[color:var(--figma-gray-text-03)]">
                                  {identityResolutionDisplay(ev.identityResolution)}
                                </span>
                              ) : null}
                              <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-[color:var(--figma-gray-bg-03)] px-2 py-0.5 text-sm font-normal leading-5 text-[color:var(--figma-gray-text-03)]">
                                {methodDisplayChip(ev.method)}
                              </span>
                            </div>

                            <p
                              className="break-all text-sm leading-5 text-[color:var(--figma-gray-text-03)]"
                              title={displayUrl(ev)}
                            >
                              {displayUrl(ev)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-start pt-0.5">
                            <StatusIcon status={ev.status} />
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FlowChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs font-medium leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)] focus-visible:ring-offset-2",
        selected
          ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]"
          : "border-[color:var(--figma-gray-border-02)] bg-white text-[color:var(--figma-gray-text-04)] hover:border-[color:var(--figma-gray-border-03)] hover:bg-[color:var(--figma-gray-bg-01)]",
      )}
    >
      {label}{" "}
      <span
        className={cn(
          "tabular-nums",
          selected ? "opacity-90" : "text-[color:var(--figma-gray-text-03)]",
        )}
      >
        ({count})
      </span>
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="text-[10px] font-medium uppercase leading-4 tracking-wide text-[color:var(--figma-gray-text-03)]">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums leading-7 text-[color:var(--figma-gray-text-05)]">
        {value}
      </div>
    </div>
  );
}
