import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { FinalOutcome, JourneyStatus } from "./quick-test-session";

function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function statusRowTone(outcome: FinalOutcome | null, sessionLabel: string) {
  if (outcome === "Passed") return { dot: "bg-emerald-500", text: "text-emerald-800" };
  if (outcome === "Issues found") return { dot: "bg-orange-500", text: "text-amber-900" };
  if (outcome === "Failed" || outcome === "Ended") return { dot: "bg-red-500", text: "text-red-800" };
  if (sessionLabel === "Running") return { dot: "bg-sky-500", text: "text-sky-800" };
  return { dot: "bg-slate-400", text: "text-slate-800" };
}

/** Outer card border — light tint per state (screenshot: warm yellow when issues). */
function outerCardBorder(outcome: FinalOutcome | null, sessionLabel: string): string {
  if (outcome === "Issues found") return "border-amber-200/90";
  if (outcome === "Passed") return "border-emerald-200/80";
  if (outcome === "Failed" || outcome === "Ended") return "border-red-200/70";
  if (sessionLabel === "Running") return "border-sky-200/70";
  return "border-slate-200";
}

function stepPanelClass(
  status: JourneyStatus | null,
  sessionDone: boolean,
  outcome: FinalOutcome | null,
): string {
  if (sessionDone) {
    if (outcome === "Issues found") {
      return "border-0 bg-amber-50/95 shadow-none";
    }
    if (outcome === "Passed") {
      return "border-0 bg-emerald-50/90 shadow-none";
    }
    if (outcome === "Failed" || outcome === "Ended") {
      return "border-0 bg-red-50/80 shadow-none";
    }
    return "border-0 bg-slate-50/90 shadow-none";
  }
  switch (status) {
    case "WARNING":
      return "border-0 bg-amber-50/95 shadow-none";
    case "DETECTED":
      return "border-0 bg-emerald-50/80 shadow-none";
    case "TIMEOUT":
    case "NOT_DETECTED":
    case "FAILED":
      return "border-0 bg-red-50/70 shadow-none";
    case "LISTENING":
    default:
      return "border-0 bg-sky-50/45 shadow-none";
  }
}

function stepBadge(status: JourneyStatus | null): { label: string; className: string } | null {
  if (!status || status === "LISTENING" || status === "DETECTED") return null;
  const label = status === "NOT_DETECTED" ? "NOT DETECTED" : status.replaceAll("_", " ");
  const base = "mt-3 inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
  switch (status) {
    case "WARNING":
      return { label, className: cn(base, "bg-amber-100 text-amber-900") };
    case "TIMEOUT":
      return { label, className: cn(base, "bg-red-100 text-red-800") };
    case "NOT_DETECTED":
    case "FAILED":
      return { label, className: cn(base, "bg-red-100 text-red-800") };
    default:
      return null;
  }
}

export function QuickTestStatusCard({
  sessionLabel,
  outcome,
  flowName,
  architectureLabel,
  currentStepLabel,
  instruction,
  currentStepStatus,
  timerSeconds,
  showTimer,
  onEndTest,
  showEndButton,
}: {
  sessionLabel: string;
  outcome: FinalOutcome | null;
  flowName: string;
  architectureLabel: string;
  currentStepLabel: string;
  instruction: string;
  /** Status of the active journey row while running; omit when idle or session finished. */
  currentStepStatus: JourneyStatus | null;
  timerSeconds: number;
  showTimer: boolean;
  onEndTest: () => void;
  showEndButton: boolean;
}) {
  const headline = outcome ?? (sessionLabel || "—");
  const tone = statusRowTone(outcome, sessionLabel);
  const sessionDone = Boolean(outcome);
  const badge = stepBadge(sessionDone ? null : currentStepStatus);

  return (
    <section
      className={cn(
        "rounded-xl border bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        outerCardBorder(outcome, sessionLabel),
      )}
    >
      {/* Top row: status (left) + timer / actions (right) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-tight">
          <span className={cn("size-2 shrink-0 rounded-full", tone.dot)} aria-hidden />
          <span className={cn("font-bold", tone.text)}>{headline}</span>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="font-normal text-slate-400">{architectureLabel}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {showTimer ? (
            <div className="min-w-[5.5rem] rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-center shadow-sm">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none text-slate-900">
                {formatTimer(timerSeconds)}
              </p>
              <p className="mt-1 text-center text-[10px] font-normal lowercase leading-none text-slate-400">
                remaining
              </p>
            </div>
          ) : null}
          {showEndButton ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 border-indigo-200 text-indigo-900 hover:bg-indigo-50"
              onClick={onEndTest}
            >
              End test
            </Button>
          ) : null}
        </div>
      </div>

      {/* Flow title — full width under header row */}
      <h2 className="mt-2 break-words text-xl font-bold leading-snug tracking-tight text-slate-900">{flowName}</h2>

      {/* Current step: nested panel left; open space on the right (desktop) */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        <div
          className={cn(
            "w-full max-w-xl rounded-lg p-5 sm:shrink-0",
            stepPanelClass(sessionDone ? null : currentStepStatus, sessionDone, outcome),
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Current step</p>
          <p className="mt-2 text-base font-bold text-slate-900">{currentStepLabel}</p>
          {instruction ? (
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-slate-500">{instruction}</p>
          ) : null}
          {badge ? <span className={badge.className}>{badge.label}</span> : null}
        </div>
        <div className="min-h-[4rem] flex-1 sm:min-h-0" aria-hidden />
      </div>
    </section>
  );
}
