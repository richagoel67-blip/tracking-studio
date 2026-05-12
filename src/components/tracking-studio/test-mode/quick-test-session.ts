import type { QuickTestEventStep } from "./quick-test-plan";

export type TestSessionState = "idle" | "running" | "completed" | "ended";

export type JourneyStatus =
  | "LISTENING"
  | "DETECTED"
  | "WARNING"
  | "TIMEOUT"
  | "NOT_DETECTED"
  | "FAILED";

export type TechLogSource =
  | "PIXEL_FIRE"
  | "SERVER_POSTBACK"
  | "SERVER_CONFIRMED"
  | "TIMEOUT"
  | "TEST_ENDED";

export type JourneyEventResult = {
  status: JourneyStatus;
  message?: string;
  latencyLabel?: string;
  jtrack?: string | null;
  recommendedFix?: string;
};

export function isS2sStep(step: QuickTestEventStep): boolean {
  return step.architecture === "s2s" || step.trackingMethod === "s2s";
}

export function journeyListeningMessage(step: QuickTestEventStep): string {
  return isS2sStep(step) ? "Waiting for server postback." : "Waiting for event to fire.";
}

export function instructionForStep(step: QuickTestEventStep): string {
  if (isS2sStep(step)) {
    return `Send ${step.eventCode} postback.`;
  }
  switch (step.eventCode) {
    case "VIEW":
      return "Open the configured career page.";
    case "LEAD":
      return "Submit the lead form.";
    case "APPLY_START":
      return "Start the application.";
    case "APPLY_FINISH":
      return "Complete the application.";
    default:
      return `Complete the action for ${step.displayName}.`;
  }
}

export function nodeKindLabel(kind: QuickTestEventStep["nodeKind"]): string {
  return kind === "career" ? "Career Site" : "ATS";
}

export function architectureDisplayLabel(architecture: QuickTestEventStep["architecture"]): string {
  return architecture === "s2s" ? "S2S Tracking" : "Pixel Tracking";
}

export function firstListeningStepId(
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): string | null {
  for (const s of steps) {
    if ((results[s.id]?.status ?? "LISTENING") === "LISTENING") return s.id;
  }
  return null;
}

export function hasAnyListening(
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): boolean {
  return firstListeningStepId(steps, results) !== null;
}

export function summaryDetectedCount(
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): number {
  let n = 0;
  for (const s of steps) {
    const st = results[s.id]?.status ?? "LISTENING";
    if (st === "DETECTED" || st === "WARNING") n += 1;
  }
  return n;
}

export function summaryListeningCount(
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): number {
  let n = 0;
  for (const s of steps) {
    if ((results[s.id]?.status ?? "LISTENING") === "LISTENING") n += 1;
  }
  return n;
}

export function summaryIssuesCount(
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): number {
  let n = 0;
  for (const s of steps) {
    const st = results[s.id]?.status ?? "LISTENING";
    if (st === "WARNING" || st === "TIMEOUT" || st === "NOT_DETECTED" || st === "FAILED") n += 1;
  }
  return n;
}

export function summaryConfirmedLogCount(logs: { source: TechLogSource }[]): number {
  return logs.filter((r) => r.source === "SERVER_CONFIRMED").length;
}

export type FinalOutcome = "Passed" | "Issues found" | "Failed" | "Ended";

export function computeFinalOutcome(
  session: "completed" | "ended",
  steps: QuickTestEventStep[],
  results: Record<string, JourneyEventResult>,
): FinalOutcome {
  if (session === "ended") return "Ended";
  if (steps.length === 0) return "Failed";
  const statuses = steps.map((s) => results[s.id]?.status ?? "LISTENING");
  const hasSignal = statuses.some((st) => st === "DETECTED" || st === "WARNING");
  const allDetected = statuses.every((st) => st === "DETECTED");
  const hasIssues = statuses.some((st) =>
    ["WARNING", "TIMEOUT", "NOT_DETECTED", "FAILED"].includes(st),
  );
  if (allDetected && !hasIssues) return "Passed";
  if (!hasSignal) return "Failed";
  return "Issues found";
}

export function initialJourneyResults(steps: QuickTestEventStep[]): Record<string, JourneyEventResult> {
  const o: Record<string, JourneyEventResult> = {};
  for (const s of steps) {
    o[s.id] = { status: "LISTENING", message: journeyListeningMessage(s) };
  }
  return o;
}
