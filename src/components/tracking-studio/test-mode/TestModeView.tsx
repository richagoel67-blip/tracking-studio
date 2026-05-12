"use client";

import * as React from "react";
import { ExternalLink, Globe, Info, Play, Target } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SearchableDropdown,
  type SearchableDropdownOption,
} from "@/components/ui/searchable-dropdown";
import { cn } from "@/lib/utils";

import { loadDraft, loadLive, type SetupSnapshot } from "../configure/tracking-setup-storage";
import {
  buildQuickTestStepsFromFlow,
  getDemoSetupSnapshot,
  type QuickTestEventStep,
} from "./quick-test-plan";
import {
  architectureDisplayLabel,
  computeFinalOutcome,
  firstListeningStepId,
  hasAnyListening,
  initialJourneyResults,
  instructionForStep,
  isS2sStep,
  type JourneyEventResult,
  type JourneyStatus,
  summaryConfirmedLogCount,
  summaryDetectedCount,
  summaryIssuesCount,
  summaryListeningCount,
  type TechLogSource,
  type TestSessionState,
} from "./quick-test-session";
import { QuickTestSandboxBanner } from "./QuickTestSandboxBanner";
import { QuickTestStatusCard } from "./QuickTestStatusCard";
import { QuickTestSummaryCards } from "./QuickTestSummaryCards";
import type { QuickTestTechLogRow } from "./QuickTestTechnicalLog";
import { QuickTestTechnicalLog } from "./QuickTestTechnicalLog";
import { QuickTestValidationJourney } from "./QuickTestValidationJourney";

const PAGE_INTRO =
  "Test Mode: Use this section to verify that your snippet codes are firing correctly. Ensure everything is set up properly before going live.";

type TestModeTab = "quick" | "history";
type QuickTestMode = "url" | "live";

function flowSubtitle(snapshot: SetupSnapshot, flowId: string): string {
  const flow = snapshot.flows.find((f) => f.id === flowId);
  if (!flow) return "";
  const parts: string[] = [];
  if (flow.careerFlowNodeId) parts.push("Career");
  if (flow.atsIds.length) parts.push("ATS");
  return parts.join(" + ") || "Flow";
}

function flowNodeCountBadge(snapshot: SetupSnapshot, flowId: string): string {
  const flow = snapshot.flows.find((f) => f.id === flowId);
  if (!flow) return "0 nodes";
  const n = (flow.careerFlowNodeId ? 1 : 0) + (flow.atsIds.length > 0 ? 1 : 0);
  return `${n} node${n === 1 ? "" : "s"}`;
}

function resolveQuickTestStartUrl(snapshot: SetupSnapshot, flowId: string): string | null {
  const flow = snapshot.flows.find((f) => f.id === flowId);
  if (!flow?.careerFlowNodeId) {
    const first = buildQuickTestStepsFromFlow(snapshot, flowId)[0];
    return first?.urlOrEndpoint?.startsWith("http") ? first.urlOrEndpoint : null;
  }
  const node = snapshot.careerFlowNodesById[flow.careerFlowNodeId];
  const tmpl = node ? snapshot.careerTemplatesById[node.templateId] : null;
  if (snapshot.architecture === "s2s") {
    const url = (node?.s2sEndpointUrl ?? "").trim();
    return url || null;
  }
  const base = tmpl?.baseUrl?.trim() ?? "";
  return base || null;
}

function formatStreamTime(d: Date): string {
  const p = (n: number, l: number) => String(n).padStart(l, "0");
  return `${p(d.getHours(), 2)}:${p(d.getMinutes(), 2)}:${p(d.getSeconds(), 2)}.${p(d.getMilliseconds(), 3)}`;
}

const SESSION_SECONDS = 5 * 60;

const QUICK_TEST_FOOTER_HINT =
  "A new tab will open with your site. Complete the flow — we'll detect pixels automatically.";

function ModeCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-1 items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        selected
          ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-gray-bg-04)]"
          : "border-[color:var(--figma-gray-border-03)] bg-white hover:bg-[color:var(--figma-gray-bg-01)]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0 [&>svg]:size-5",
          selected ? "text-[color:var(--figma-secondary-main)]" : "text-[color:var(--figma-gray-icon-04)]",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 space-y-1">
        <span
          className={cn(
            "block text-sm font-semibold",
            selected ? "text-[color:var(--figma-secondary-main)]" : "text-[color:var(--figma-gray-text-05)]",
          )}
        >
          {title}
        </span>
        <span className="block text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">{description}</span>
      </span>
    </button>
  );
}

function logSourcesForArchitecture(arch: SetupSnapshot["architecture"]): {
  fire: TechLogSource;
  confirm: TechLogSource;
} {
  if (arch === "s2s") return { fire: "SERVER_POSTBACK", confirm: "SERVER_CONFIRMED" };
  return { fire: "PIXEL_FIRE", confirm: "SERVER_CONFIRMED" };
}

function detectedMessage(step: QuickTestEventStep): string {
  return isS2sStep(step) ? "Postback received and confirmed." : "Pixel received and confirmed.";
}

export function TestModeView() {
  const snapshot = React.useMemo(() => loadLive() ?? loadDraft() ?? getDemoSetupSnapshot(), []);
  const [tab, setTab] = React.useState<TestModeTab>("quick");
  const [quickMode, setQuickMode] = React.useState<QuickTestMode>("url");
  const [flowId, setFlowId] = React.useState("");

  const flowOptions: SearchableDropdownOption[] = React.useMemo(
    () =>
      snapshot.flows.map((f) => ({
        value: f.id,
        label: f.name,
        countBadge: flowNodeCountBadge(snapshot, f.id),
        subtitle: flowSubtitle(snapshot, f.id),
        keywords: [f.name, f.id, "flow"],
      })),
    [snapshot],
  );

  React.useEffect(() => {
    if (!flowId && snapshot.flows[0]) setFlowId(snapshot.flows[0].id);
  }, [snapshot, flowId]);

  const steps = React.useMemo(() => buildQuickTestStepsFromFlow(snapshot, flowId), [snapshot, flowId]);
  const eventCount = steps.length;
  const startUrl = flowId ? resolveQuickTestStartUrl(snapshot, flowId) : null;

  const canStartQuickTest =
    Boolean(flowId) &&
    eventCount > 0 &&
    Boolean(startUrl || snapshot.architecture === "s2s");

  const [testSessionState, setTestSessionState] = React.useState<TestSessionState>("idle");
  const [timerSeconds, setTimerSeconds] = React.useState(SESSION_SECONDS);
  const [journeyResults, setJourneyResults] = React.useState<Record<string, JourneyEventResult>>({});
  const [techLogs, setTechLogs] = React.useState<QuickTestTechLogRow[]>([]);
  const [expandedJourneyId, setExpandedJourneyId] = React.useState<string | null>(null);
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);

  const journeyResultsRef = React.useRef(journeyResults);
  journeyResultsRef.current = journeyResults;

  const sessionGenRef = React.useRef(0);
  const timeoutIdsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timerExpiryConsumedRef = React.useRef(false);

  const stopSessionTimers = React.useCallback(() => {
    sessionGenRef.current += 1;
    for (const t of timeoutIdsRef.current) clearTimeout(t);
    timeoutIdsRef.current = [];
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const appendTechLog = React.useCallback((row: Omit<QuickTestTechLogRow, "id" | "timeLabel">) => {
    const id = `log-${crypto.randomUUID().slice(0, 8)}`;
    const timeLabel = formatStreamTime(new Date());
    setTechLogs((prev) => [...prev, { ...row, id, timeLabel }]);
  }, []);

  const scheduleMockSimulation = React.useCallback(
    (sessionGen: number, activeSteps: QuickTestEventStep[]) => {
      const { fire, confirm } = logSourcesForArchitecture(snapshot.architecture);

      const find = (code: string) => activeSteps.find((s) => s.eventCode === code);
      const view = find("VIEW");
      const lead = find("LEAD");
      const applyStart = find("APPLY_START");
      const applyFinish = find("APPLY_FINISH");

      const schedule = (delayMs: number, fn: () => void) => {
        const tid = setTimeout(() => {
          if (sessionGenRef.current !== sessionGen) return;
          fn();
        }, delayMs);
        timeoutIdsRef.current.push(tid);
      };

      if (view) {
        schedule(1000, () => {
          setJourneyResults((prev) => ({
            ...prev,
            [view.id]: {
              status: "DETECTED",
              message: detectedMessage(view),
              latencyLabel: "1.2s",
              jtrack: "test-8f2k",
            },
          }));
          appendTechLog({ source: fire, eventName: "VIEW", jtrack: "test-8f2k" });
          appendTechLog({ source: confirm, eventName: "VIEW", jtrack: "test-8f2k" });
        });
      }

      if (lead) {
        schedule(2400, () => {
          setJourneyResults((prev) => ({
            ...prev,
            [lead.id]: {
              status: "DETECTED",
              message: detectedMessage(lead),
              latencyLabel: "980ms",
              jtrack: "test-8f2k",
            },
          }));
          appendTechLog({ source: fire, eventName: "LEAD", jtrack: "test-8f2k" });
          appendTechLog({ source: confirm, eventName: "LEAD", jtrack: "test-8f2k" });
        });
      }

      if (applyStart) {
        schedule(3600, () => {
          setJourneyResults((prev) => ({
            ...prev,
            [applyStart.id]: {
              status: "WARNING",
              message: "Event fired, but jtrack is missing.",
              latencyLabel: "1.3s",
              jtrack: null,
              recommendedFix: "Verify the tracking snippet preserves the jtrack query parameter through redirects.",
            },
          }));
          appendTechLog({ source: fire, eventName: "APPLY_START", jtrack: "null" });
          appendTechLog({ source: confirm, eventName: "APPLY_START", jtrack: "null" });
        });
      }

      if (applyFinish) {
        schedule(5200, () => {
          setJourneyResults((prev) => ({
            ...prev,
            [applyFinish.id]: {
              status: "TIMEOUT",
              message: isS2sStep(applyFinish) ? "No postback received." : "No completion event received.",
              latencyLabel: "—",
              jtrack: null,
            },
          }));
          appendTechLog({ source: "TIMEOUT", eventName: "APPLY_FINISH", jtrack: "null" });
        });
      }

      schedule(6800, () => {
        if (sessionGenRef.current !== sessionGen) return;
        setJourneyResults((prev) => {
          const next = { ...prev };
          for (const s of activeSteps) {
            const st = next[s.id]?.status ?? "LISTENING";
            if (st === "LISTENING") {
              next[s.id] = {
                status: "NOT_DETECTED",
                message: "No signal received during this test run.",
                jtrack: null,
              };
            }
          }
          return next;
        });
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setTestSessionState("completed");
      });
    },
    [appendTechLog, snapshot.architecture],
  );

  React.useEffect(() => {
    if (testSessionState !== "running") return;
    setActiveEventId(firstListeningStepId(steps, journeyResults));
  }, [testSessionState, steps, journeyResults]);

  const handleStartQuickTest = React.useCallback(() => {
    if (!canStartQuickTest) return;
    timerExpiryConsumedRef.current = false;
    stopSessionTimers();
    const gen = sessionGenRef.current;
    setExpandedJourneyId(null);
    setTechLogs([]);
    setTimerSeconds(SESSION_SECONDS);
    setJourneyResults(initialJourneyResults(steps));
    setTestSessionState("running");
    setActiveEventId(steps[0]?.id ?? null);

    tickRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    scheduleMockSimulation(gen, steps);
  }, [canStartQuickTest, stopSessionTimers, steps, scheduleMockSimulation]);

  const applyTimerExpiry = React.useCallback(() => {
    if (timerExpiryConsumedRef.current) return;
    timerExpiryConsumedRef.current = true;
    stopSessionTimers();
    const listening = steps.filter(
      (s) => (journeyResultsRef.current[s.id]?.status ?? "LISTENING") === "LISTENING",
    );
    for (const s of listening) {
      appendTechLog({ source: "TIMEOUT", eventName: s.eventCode, jtrack: "null" });
    }
    setJourneyResults((prev) => {
      const next = { ...prev };
      for (const s of steps) {
        const st = next[s.id]?.status ?? "LISTENING";
        if (st === "LISTENING") {
          next[s.id] = {
            status: "TIMEOUT",
            message: isS2sStep(s) ? "No postback received." : "No completion event received.",
            jtrack: null,
          };
        }
      }
      return next;
    });
    setTestSessionState("completed");
  }, [steps, appendTechLog, stopSessionTimers]);

  React.useEffect(() => {
    if (testSessionState !== "running") return;
    if (timerSeconds > 0) return;
    applyTimerExpiry();
  }, [testSessionState, timerSeconds, applyTimerExpiry]);

  const handleEndTest = React.useCallback(() => {
    if (testSessionState !== "running") return;
    stopSessionTimers();
    const listening = steps.filter(
      (s) => (journeyResultsRef.current[s.id]?.status ?? "LISTENING") === "LISTENING",
    );
    for (const s of listening) {
      appendTechLog({ source: "TEST_ENDED", eventName: s.eventCode, jtrack: "null" });
    }
    setJourneyResults((prev) => {
      const next = { ...prev };
      for (const s of steps) {
        const st = next[s.id]?.status ?? "LISTENING";
        if (st === "LISTENING") {
          next[s.id] = {
            status: "NOT_DETECTED",
            message: "Test ended before this event was detected.",
            jtrack: null,
          };
        }
      }
      return next;
    });
    setTestSessionState("ended");
  }, [testSessionState, stopSessionTimers, steps, appendTechLog]);

  const resetToIdle = React.useCallback(() => {
    stopSessionTimers();
    timerExpiryConsumedRef.current = false;
    setTestSessionState("idle");
    setJourneyResults({});
    setTechLogs([]);
    setExpandedJourneyId(null);
    setActiveEventId(null);
    setTimerSeconds(SESSION_SECONDS);
  }, [stopSessionTimers]);

  const flowName = snapshot.flows.find((f) => f.id === flowId)?.name ?? "—";
  const archLabel = architectureDisplayLabel(snapshot.architecture);

  const finalOutcome = React.useMemo(() => {
    if (testSessionState !== "completed" && testSessionState !== "ended") return null;
    return computeFinalOutcome(testSessionState === "ended" ? "ended" : "completed", steps, journeyResults);
  }, [testSessionState, steps, journeyResults]);

  const activeStep = activeEventId ? steps.find((s) => s.id === activeEventId) : undefined;
  const activeStepStatus: JourneyStatus | null =
    testSessionState === "running" && activeEventId
      ? (journeyResults[activeEventId]?.status ?? "LISTENING")
      : null;
  const runningListening = testSessionState === "running" && hasAnyListening(steps, journeyResults);
  const currentStepLabel =
    testSessionState === "running"
      ? runningListening && activeStep
        ? activeStep.displayName
        : "All events processed"
      : "—";
  const instruction =
    testSessionState === "running"
      ? runningListening && activeStep
        ? instructionForStep(activeStep)
        : "Review the results below."
      : testSessionState === "idle"
        ? ""
        : "Review the results below.";

  const detectedN = summaryDetectedCount(steps, journeyResults);
  const listeningN = summaryListeningCount(steps, journeyResults);
  const issuesN = summaryIssuesCount(steps, journeyResults);
  const confirmedN = summaryConfirmedLogCount(techLogs);

  const displayStartUrl =
    quickMode === "url"
      ? startUrl ?? "—"
      : startUrl
        ? startUrl
        : "Select a live job to populate this URL.";

  const toggleJourneyRow = React.useCallback((id: string) => {
    setExpandedJourneyId((cur) => (cur === id ? null : id));
  }, []);

  const hasIssues = issuesN > 0;

  const showTestModeChrome = testSessionState === "idle";

  return (
    <div className="relative w-full space-y-5 pb-28">
      {showTestModeChrome ? (
        <>
          <header className="space-y-2">
            <h1 className="text-lg font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">Test mode</h1>
            <p className="max-w-2xl text-sm leading-5 text-[color:var(--figma-gray-text-03)]">{PAGE_INTRO}</p>
          </header>

          <div className="flex gap-8 border-b border-[color:var(--figma-gray-border-02)]">
            {(
              [
                { id: "quick" as const, label: "Quick test" },
                { id: "history" as const, label: "Test History" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm transition-colors",
                  tab === id
                    ? "border-[color:var(--figma-primary-main)] font-semibold text-[color:var(--figma-primary-main)]"
                    : "border-transparent font-normal text-[color:var(--figma-gray-text-04)] hover:text-[color:var(--figma-gray-text-05)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {tab === "quick" ? (
        testSessionState === "idle" ? (
          <div className="space-y-5">
            <section className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[color:var(--figma-gray-text-05)]">Quick Pixel test</h2>
                  <p className="text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
                    Test pixel firing by browsing the client&apos;s site in a new tab. We&apos;ll detect pixel events on
                    our server in real-time.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <ModeCard
                    selected={quickMode === "url"}
                    onSelect={() => setQuickMode("url")}
                    icon={<Globe strokeWidth={1.75} />}
                    title="Test by URL"
                    description="Enter a career page URL directly"
                  />
                  <ModeCard
                    selected={quickMode === "live"}
                    onSelect={() => setQuickMode("live")}
                    icon={<Target strokeWidth={1.75} />}
                    title="Test on live job"
                    description="Pick a live advertised job to test"
                  />
                </div>

                <div className="w-full max-w-xl space-y-1">
                  <Label htmlFor="test-mode-flow" className="text-xs font-medium text-[color:var(--figma-gray-text-04)]">
                    Select Flow to test
                  </Label>
                  <SearchableDropdown
                    id="test-mode-flow"
                    optionPresentation="flow"
                    options={flowOptions}
                    value={flowId}
                    onValueChange={setFlowId}
                    placeholder="Select flow"
                    searchPlaceholder="Search flows"
                  />
                  {!flowId ? (
                    <p className="text-xs text-[color:var(--figma-error-main)]">Select a flow before starting the test.</p>
                  ) : null}
                  {flowId && eventCount === 0 ? (
                    <p className="text-xs text-[color:var(--figma-error-main)]">
                      This flow has no events configured.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1 text-sm text-[color:var(--figma-gray-text-04)]">
                  <p className="font-normal">
                    {snapshot.architecture === "s2s" ? "Endpoint (Career site):" : "Start URL (Career page):"}
                  </p>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium text-[color:var(--figma-gray-text-05)]">
                      {displayStartUrl}
                    </p>
                    {typeof displayStartUrl === "string" && displayStartUrl.startsWith("http") ? (
                      <a
                        href={displayStartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 rounded-md p-1 text-[color:var(--figma-gray-icon-04)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)] hover:text-[color:var(--figma-primary-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)]/30"
                        aria-label="Open URL in new tab"
                      >
                        <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-base font-semibold text-[color:var(--figma-gray-text-05)]">Expected Configuration</h2>
              <p className="mt-2 text-sm text-[color:var(--figma-gray-text-03)]">
                Events to test ({eventCount}) — review before starting.
              </p>
              <ul className="mt-4 divide-y divide-[color:var(--figma-gray-border-02)]">
                {steps.length === 0 ? (
                  <li className="py-6 text-center text-sm text-[color:var(--figma-gray-text-03)]">
                    No enabled events for this flow. Configure tracking in Tracking Flow first.
                  </li>
                ) : (
                  steps.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">
                              {s.displayName}
                            </span>
                            <span className="rounded-full bg-[color:var(--figma-gray-bg-05)] px-2 py-1 font-mono text-xs font-medium text-[color:var(--figma-gray-text-05)]">
                              {s.eventCode}
                            </span>
                          </div>
                          <span className="text-sm text-[color:var(--figma-gray-text-03)]">{s.methodLabel}</span>
                        </div>
                        <p className="truncate text-sm text-[color:var(--figma-gray-text-04)]">{s.urlOrEndpoint}</p>
                        <p className="text-xs text-[color:var(--figma-gray-text-03)]">Source: {s.sourceNodeLabel}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--figma-gray-bg-05)] px-3 py-1 text-xs font-medium text-[color:var(--figma-gray-text-04)]">
                        Configured
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <QuickTestSandboxBanner />

            <QuickTestStatusCard
              sessionLabel={testSessionState === "running" ? "Running" : ""}
              outcome={finalOutcome}
              flowName={flowName}
              architectureLabel={archLabel}
              currentStepLabel={currentStepLabel}
              instruction={instruction}
              currentStepStatus={activeStepStatus}
              timerSeconds={timerSeconds}
              showTimer={testSessionState === "running"}
              showEndButton={testSessionState === "running"}
              onEndTest={handleEndTest}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
              <div className="space-y-4">
                <QuickTestSummaryCards
                  detected={detectedN}
                  listening={listeningN}
                  issues={issuesN}
                  confirmed={confirmedN}
                />
                <QuickTestValidationJourney
                  steps={steps}
                  results={journeyResults}
                  activeStepId={activeEventId}
                  expandedStepId={expandedJourneyId}
                  onToggleExpand={toggleJourneyRow}
                />
                {testSessionState === "completed" || testSessionState === "ended" ? (
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {hasIssues ? (
                      <Button
                        type="button"
                        className="h-10 bg-amber-600 text-white hover:bg-amber-600/90"
                        onClick={handleStartQuickTest}
                      >
                        Retest issues
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="h-10 bg-indigo-700 text-white hover:bg-indigo-700/90"
                      onClick={handleStartQuickTest}
                    >
                      Run again
                    </Button>
                    <Button type="button" variant="outline" className="h-10" onClick={() => toast.message("Share (prototype)")}>
                      Share
                    </Button>
                    <Button type="button" variant="ghost" className="h-10" onClick={resetToIdle}>
                      Back
                    </Button>
                  </div>
                ) : null}
              </div>
              <QuickTestTechnicalLog rows={techLogs} listening={testSessionState === "running"} />
            </div>
          </div>
        )
      ) : (
        <section className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-medium text-[color:var(--figma-gray-text-05)]">No test history yet</p>
          <p className="mt-2 text-sm text-[color:var(--figma-gray-text-03)]">
            Run a quick test to see results and timestamps here.
          </p>
        </section>
      )}

      {tab === "quick" && testSessionState === "idle" ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[color:var(--figma-gray-border-02)] bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.06),0_-1px_2px_rgba(0,0,0,0.04)] md:left-[232px]"
          role="region"
          aria-label="Quick test actions"
        >
          <div className="mx-auto flex w-full max-w-[1148px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">Ready to test?</p>
              <p className="flex min-w-0 items-start gap-2 text-sm leading-5 text-[color:var(--figma-gray-text-04)]">
                <Info
                  className="mt-0.5 size-4 shrink-0 text-[color:var(--figma-gray-icon-04)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{QUICK_TEST_FOOTER_HINT}</span>
              </p>
            </div>
            <Button
              type="button"
              className="h-10 shrink-0 gap-2 bg-[color:var(--figma-primary-main)] px-4 text-[color:var(--figma-on-primary-label)] hover:bg-[color:var(--figma-primary-main)]/90 sm:self-center"
              disabled={!canStartQuickTest}
              onClick={handleStartQuickTest}
            >
              <Play className="size-4" strokeWidth={2} aria-hidden />
              Start quick test
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
