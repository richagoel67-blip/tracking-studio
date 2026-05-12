import { AlertTriangle, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import type { QuickTestEventStep } from "./quick-test-plan";
import type { JourneyEventResult, JourneyStatus } from "./quick-test-session";
import { journeyListeningMessage, nodeKindLabel } from "./quick-test-session";

const badgeClass: Record<JourneyStatus, string> = {
  DETECTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  WARNING: "border-amber-200 bg-amber-50 text-amber-900",
  LISTENING: "border-sky-200 bg-sky-50 text-sky-800",
  TIMEOUT: "border-red-200 bg-red-50 text-red-800",
  NOT_DETECTED: "border-red-200 bg-red-50 text-red-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
};

const cardClass = (status: JourneyStatus, isActive: boolean) =>
  cn(
    "rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors",
    isActive && "border-sky-300 bg-sky-50/70 ring-1 ring-sky-200/60",
    !isActive && status === "LISTENING" && "border-slate-200 bg-white",
    !isActive && status === "DETECTED" && "border-emerald-200/80 bg-white",
    !isActive && status === "WARNING" && "border-amber-200/80 bg-white",
    !isActive && (status === "TIMEOUT" || status === "NOT_DETECTED" || status === "FAILED") && "border-red-200/80 bg-white",
  );

function statusIcon(status: JourneyStatus, isActive: boolean) {
  const activeRing = isActive && status === "LISTENING";
  switch (status) {
    case "DETECTED":
      return <CheckCircle2 className="size-5 text-emerald-600" strokeWidth={2} aria-hidden />;
    case "WARNING":
      return <AlertTriangle className="size-5 text-amber-600" strokeWidth={2} aria-hidden />;
    case "TIMEOUT":
      return <Clock className="size-5 text-red-600" strokeWidth={2} aria-hidden />;
    case "NOT_DETECTED":
    case "FAILED":
      return <XCircle className="size-5 text-red-600" strokeWidth={2} aria-hidden />;
    case "LISTENING":
    default:
      return (
        <span className="relative flex size-5 items-center justify-center" aria-hidden>
          <Circle
            className={cn("size-5 text-slate-300", activeRing && "text-sky-500")}
            strokeWidth={2}
            fill={activeRing ? "currentColor" : "none"}
          />
        </span>
      );
  }
}

function badgeLabel(status: JourneyStatus): string {
  if (status === "NOT_DETECTED") return "NOT DETECTED";
  return status.replaceAll("_", " ");
}

export function QuickTestValidationJourney({
  steps,
  results,
  activeStepId,
  expandedStepId,
  onToggleExpand,
}: {
  steps: QuickTestEventStep[];
  results: Record<string, JourneyEventResult>;
  activeStepId: string | null;
  expandedStepId: string | null;
  onToggleExpand: (stepId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Validation journey</h2>
      <div className="space-y-2">
        {steps.map((step) => {
          const r = results[step.id] ?? { status: "LISTENING" as const, message: journeyListeningMessage(step) };
          const isActive = activeStepId === step.id;
          const expanded = expandedStepId === step.id;
          const jtrackDisplay =
            r.status === "LISTENING" ? "—" : r.jtrack === null || r.jtrack === undefined ? "null" : r.jtrack;

          return (
            <article key={step.id} className={cardClass(r.status, isActive)}>
              <button
                type="button"
                onClick={() => onToggleExpand(step.id)}
                className="flex w-full gap-3 rounded-lg p-4 text-left transition-colors hover:bg-black/[0.02]"
              >
                <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                  {statusIcon(r.status, isActive)}
                  {isActive ? <span className="size-1.5 rounded-full bg-sky-500" aria-hidden /> : null}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {step.stepNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{step.displayName}</span>
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-700">
                          {step.eventCode}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {step.sourceNodeLabel} · {nodeKindLabel(step.nodeKind)} · {step.methodLabel}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        badgeClass[r.status],
                        isActive && r.status === "LISTENING" && "border-sky-400 bg-sky-100 text-sky-900",
                      )}
                    >
                      {badgeLabel(r.status)}
                    </span>
                  </div>
                  {r.message ? <p className="text-sm leading-5 text-slate-600">{r.message}</p> : null}
                </div>
              </button>
              {expanded ? (
                <div className="space-y-2 border-t border-slate-200 px-4 pb-4 pt-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {step.architecture === "s2s" ? "Endpoint" : "URL"}
                      </p>
                      <p className="mt-0.5 break-all font-mono text-xs text-slate-800">{step.urlOrEndpoint}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">jtrack</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-800">{jtrackDisplay}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Latency</p>
                      <p className="mt-0.5 text-xs text-slate-800">{r.latencyLabel ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Message</p>
                      <p className="mt-0.5 text-xs text-slate-800">{r.message ?? "—"}</p>
                    </div>
                  </div>
                  {r.recommendedFix ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                      <span className="font-semibold">Recommended fix: </span>
                      {r.recommendedFix}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
