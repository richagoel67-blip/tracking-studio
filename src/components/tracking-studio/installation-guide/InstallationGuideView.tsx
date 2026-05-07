import { useState } from "react";
import { ChevronRight, Copy, ExternalLink, Info, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

const FLOWS = [
  { id: 1 as const, label: "Flow 1", tag: "PIXEL" as const, description: "Job Ad click → career site → ATS" },
  { id: 2 as const, label: "Flow 2", tag: "S2S" as const, description: "Job Ad click → career site → ATS" },
  { id: 3 as const, label: "Flow 3", tag: "PIXEL" as const, description: "Job Ad click → ATS" },
];

const PASTE_SEGMENTS = ["Administration", "Career site", "Footer script"];

function CopySnippetButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label="Copy snippet"
      className="text-[color:var(--figma-gray-icon-04)] transition-colors hover:text-[color:var(--figma-gray-text-05)]"
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      <Copy className="size-5" strokeWidth={1.5} />
    </button>
  );
}

function PasteBreadcrumb({ showInfoIcon }: { showInfoIcon?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs leading-[18px]">
      {showInfoIcon ? (
        <div className="flex items-center gap-1">
          <Info className="size-[18px] shrink-0 text-[color:var(--figma-gray-icon-04)]" strokeWidth={1.5} />
          <span className="text-[color:var(--figma-gray-text-03)]">Paste in:</span>
        </div>
      ) : (
        <span className="text-[color:var(--figma-gray-text-03)]">Paste in:</span>
      )}
      <div className="flex flex-wrap items-center gap-0.5 text-[color:var(--figma-gray-text-05)]">
        {PASTE_SEGMENTS.map((seg, i) => (
          <span key={seg} className="flex items-center gap-0.5">
            {i > 0 ? <ChevronRight className="size-5 shrink-0 text-[color:var(--figma-gray-icon-04)]" strokeWidth={1.5} /> : null}
            <span>{seg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function trackingSnippetText(trackEvent: "APPLY_START" | "APPLY_FINISH") {
  return `<!-- Joveo ${trackEvent} Pixel | Tenet Healthcare -->
<script>
 joveo.track({ event: '${trackEvent}', tid: 'JVT-1f2k-XX' });
</script>`;
}

function HighlightedCodeBlock({ trackEvent }: { trackEvent: "APPLY_START" | "APPLY_FINISH" }) {
  const comment = `<!-- Joveo ${trackEvent} Pixel | Tenet Healthcare -->`;
  return (
    <pre className="overflow-x-auto bg-[color:var(--figma-code-panel-bg)] p-4 font-mono text-sm leading-6">
      <code className="text-[color:var(--figma-code-text)]">
        <span className="whitespace-pre-wrap">{comment}</span>
        {"\n"}
        <span className="text-[color:var(--figma-syntax-tag)]">{"<script>"}</span>
        {"\n"}
        <span>
          {" joveo.track({ event: "}
          <span className="text-[color:var(--figma-syntax-string-warm)]">{`'${trackEvent}'`}</span>
          {", tid: "}
          <span className="text-[color:var(--figma-syntax-string-alt)]">{"'JVT-1f2k-XX'"}</span>
          {" });"}
        </span>
        {"\n"}
        <span className="text-[color:var(--figma-syntax-tag)]">{"</script>"}</span>
      </code>
    </pre>
  );
}

function PixelCodeSnippet({
  tabLabel,
  badge,
  trackEvent,
}: {
  tabLabel: string;
  badge: { text: string; variant: "view" | "warning" };
  trackEvent: "APPLY_START" | "APPLY_FINISH";
}) {
  const badgeClass =
    badge.variant === "view"
      ? "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]"
      : "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]";

  const snippetText = trackingSnippetText(trackEvent);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between bg-[color:var(--figma-gray-bg-01)] px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">{tabLabel}</span>
            <span className={cn("rounded-full px-2 py-1 text-xs font-medium leading-[18px]", badgeClass)}>{badge.text}</span>
          </div>
          <span className="text-xs font-normal leading-[18px] text-[color:var(--figma-gray-text-03)]">IMAGE PIXEL</span>
        </div>
        <CopySnippetButton text={snippetText} />
      </div>
      <HighlightedCodeBlock trackEvent={trackEvent} />
    </div>
  );
}

export function InstallationGuideView() {
  const [tab, setTab] = useState<"pixel" | "ats" | "steps">("pixel");
  const [flowId, setFlowId] = useState<(typeof FLOWS)[number]["id"]>(1);

  return (
    <div className="mx-auto flex max-w-[1136px] flex-col gap-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-lg font-semibold leading-7 text-[color:var(--figma-gray-text-05)]">Installation guide</h1>
          <p className="max-w-[653px] text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
            Client-scoped view for ATS compatibility, setup status, guide steps, and validation readiness. Only ATSs connected to this client are shown here.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium leading-5 text-primary transition-colors hover:bg-[color:var(--figma-gray-bg-03)]"
          >
            <Mail className="size-4" strokeWidth={1.75} />
            Get on email
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium leading-5 text-[color:var(--figma-on-primary-label)] transition-opacity hover:opacity-90"
          >
            <ExternalLink className="size-4" strokeWidth={1.75} />
            Full CS guide
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("pixel")}
          className={cn(
            "-mb-px border-b-2 pb-3 text-sm leading-5 transition-colors",
            tab === "pixel"
              ? "border-primary font-semibold text-primary"
              : "border-transparent font-normal text-[color:var(--figma-gray-text-04)] hover:text-foreground",
          )}
        >
          Pixel Installation guide
        </button>
        <button
          type="button"
          onClick={() => setTab("ats")}
          className={cn(
            "-mb-px border-b-2 pb-3 text-sm leading-5 transition-colors",
            tab === "ats"
              ? "border-primary font-semibold text-primary"
              : "border-transparent font-normal text-[color:var(--figma-gray-text-04)] hover:text-foreground",
          )}
        >
          Selected ATS(2)
        </button>
        <button
          type="button"
          onClick={() => setTab("steps")}
          className={cn(
            "-mb-px border-b-2 pb-3 text-sm leading-5 transition-colors",
            tab === "steps"
              ? "border-primary font-semibold text-primary"
              : "border-transparent font-normal text-[color:var(--figma-gray-text-04)] hover:text-foreground",
          )}
        >
          Steps
        </button>
      </div>

      {tab !== "pixel" ? (
        <div className="rounded-lg border border-border bg-white p-8 text-sm text-[color:var(--figma-gray-text-03)]">
          {tab === "ats" ? "Selected ATS content coming soon." : "Steps content coming soon."}
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex w-full shrink-0 flex-col gap-5 rounded-lg border border-border bg-white p-4 lg:w-80">
            <div>
              <p className="text-base font-medium leading-6 text-[color:var(--figma-install-heading)]">Choose tracking flow</p>
              <p className="mt-1 text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">Select your flow to find the snippet</p>
            </div>
            <div className="flex flex-col gap-3">
              {FLOWS.map((flow) => {
                const selected = flow.id === flowId;
                return (
                  <button
                    key={flow.id}
                    type="button"
                    onClick={() => setFlowId(flow.id)}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-3 text-left transition-shadow",
                      selected
                        ? "border-[color:var(--figma-secondary-main)] bg-[color:var(--figma-gray-bg-04)] shadow-[0px_1px_1px_rgba(0,0,0,0.06),0px_1px_1.5px_rgba(0,0,0,0.1)]"
                        : "border-[color:var(--figma-gray-border-03)] bg-white hover:bg-[color:var(--figma-gray-bg-01)]",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-05)]">{flow.label}</span>
                      <span
                        className={cn(
                          "rounded border px-2 py-0.5 text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]",
                          selected && flow.tag === "PIXEL" && "border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-02)]",
                          selected && flow.tag === "S2S" && "border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)]",
                          !selected && flow.tag === "PIXEL" && "border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)]",
                          !selected && flow.tag === "S2S" && "border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)]",
                        )}
                      >
                        {flow.tag}
                      </span>
                    </div>
                    <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">{flow.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <section className="rounded-lg border border-border bg-white p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Career site Pixel</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-8">
                    <div className="flex items-center gap-2 text-sm leading-5">
                      <span className="text-[color:var(--figma-gray-text-03)]">Base URL:</span>
                      <span className="font-normal text-primary">www.workday.com/</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm leading-5">
                      <span className="text-[color:var(--figma-gray-text-03)]">View page URL:</span>
                      <span className="font-normal text-primary">www.workday.com/</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <PixelCodeSnippet tabLabel="View" badge={{ text: "VIEW", variant: "view" }} trackEvent="APPLY_START" />
                  <PasteBreadcrumb showInfoIcon />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-white p-5">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm leading-5 text-[color:var(--figma-gray-text-03)]">ATS:</span>
                  <span className="rounded border border-border bg-[color:var(--figma-gray-bg-03)] px-2 py-0.5 text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">
                    Workday
                  </span>
                </div>

                <div className="flex flex-col gap-10">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Apply Page Pixel</p>
                    <PixelCodeSnippet tabLabel="Apply start" badge={{ text: "APPLY_START", variant: "warning" }} trackEvent="APPLY_START" />
                    <PasteBreadcrumb />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Thankyou Page Pixel</p>
                    <PasteBreadcrumb />
                    <PixelCodeSnippet tabLabel="Apply finish" badge={{ text: "APPLY_FINISH", variant: "view" }} trackEvent="APPLY_FINISH" />
                    <PasteBreadcrumb showInfoIcon />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
