import { useState } from "react";
import { Check, ChevronRight, Copy, ExternalLink, Info, Mail, X } from "lucide-react";

import { cn } from "@/lib/utils";

const FLOWS = [
  { id: 1 as const, label: "Flow 1", tag: "PIXEL" as const, description: "Job Ad click → career site → ATS" },
  { id: 2 as const, label: "Flow 2", tag: "S2S" as const, description: "Job Ad click → career site → ATS" },
  { id: 3 as const, label: "Flow 3", tag: "PIXEL" as const, description: "Job Ad click → ATS" },
];

const ATS_CARDS = [
  {
    supportedTracking: ["IMAGE PIXEL", "JS PIXEL"],
  },
  {
    supportedTracking: ["IMAGE PIXEL", "JS PIXEL", "S2S"],
  },
] as const;

const PASTE_SEGMENTS = ["Administration", "Career site", "Footer script"];

const ATS_MATRIX_ROWS = [
  { page: "Carrer page", jsPixel: true, imagePixel: true, s2sPixel: false },
  { page: "Apply page", jsPixel: true, imagePixel: true, s2sPixel: true },
  { page: "Thank you page", jsPixel: false, imagePixel: true, s2sPixel: true },
] as const;

const PLACEMENT_INSTRUCTIONS = [
  {
    label: "VIEW",
    className: "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]",
    detail: "Career Site Settings > Custom JavaScript",
  },
  {
    label: "APPLY_START",
    className: "bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]",
    detail: "Career Site Settings > Custom JavaScript",
  },
  {
    label: "APPLY_FINISH",
    className: "bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]",
    detail: "S2S via Symplr API webhooks",
  },
] as const;

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

function WorkdayMark() {
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-white text-[32px] font-semibold leading-none text-[#0467ca]">
      W
    </div>
  );
}

function SupportedTrackingChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-0.5 rounded-full bg-[color:var(--figma-gray-bg-03)] px-1.5 py-0.5 text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
      {label}
      <Check className="size-4 text-[color:var(--figma-gray-icon-04)]" strokeWidth={2} />
    </span>
  );
}

function AtsSummaryCard({
  supportedTracking,
  onViewMore,
}: {
  supportedTracking: readonly string[];
  onViewMore: () => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <WorkdayMark />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Workday</p>
                <span className="text-[10px] font-medium leading-4 text-[color:var(--figma-gray-text-03)]">1st</span>
                <span className="rounded-full bg-[color:var(--figma-secondary-lighter)] px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[color:var(--figma-secondary-main)]">
                  v2.3
                </span>
                <span className="rounded-full bg-[color:var(--figma-success-lighter)] px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[color:var(--figma-success-main)]">
                  Ready to test
                </span>
              </div>
              <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">Last updated 26 feb,2026</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewMore}
            className="inline-flex h-7 items-center gap-1 self-start rounded-[4px] border border-primary bg-white px-3 py-1 text-xs font-medium leading-[18px] text-primary"
          >
            View more details
            <ChevronRight className="size-3" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-x-16 gap-y-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">setup effort</p>
            <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">12 min</p>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">complexity</p>
            <p className="text-sm font-medium leading-5 text-[color:var(--figma-warning-dark)]">moderate</p>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">guide owner</p>
            <div className="flex items-center gap-1">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--figma-primary-lighter)] text-[10px] font-semibold leading-4 text-primary">
                KS
              </span>
              <span className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Kevin Smith</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">open issues</p>
            <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">1 issue</p>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">Supported tracking</p>
            <div className="flex flex-wrap items-center gap-2">
              {supportedTracking.map((item) => (
                <SupportedTrackingChip key={item} label={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MatrixStatus({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="size-5 text-[color:var(--figma-success-main)]" strokeWidth={2} />
  ) : (
    <X className="size-5 text-[color:var(--figma-error-main)]" strokeWidth={2} />
  );
}

function AtsDetailsPanel({
  open,
  onClose,
  supportedTracking,
}: {
  open: boolean;
  onClose: () => void;
  supportedTracking: readonly string[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close ATS details panel" className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[704px] max-w-[96vw] overflow-y-auto border-l border-border bg-white pb-6 pt-6">
        <div className="flex flex-col gap-10 px-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <WorkdayMark />
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Workday</p>
                    <span className="text-[10px] font-medium leading-4 text-[color:var(--figma-gray-text-03)]">1st</span>
                    <span className="rounded-full bg-[color:var(--figma-secondary-lighter)] px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[color:var(--figma-secondary-main)]">
                      v2.3
                    </span>
                    <span className="rounded-full bg-[color:var(--figma-success-lighter)] px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[color:var(--figma-success-main)]">
                      Ready to test
                    </span>
                  </div>
                  <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">Last updated 26 feb,2026</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close details panel"
                onClick={onClose}
                className="rounded-sm p-0.5 text-[color:var(--figma-gray-icon-04)] hover:bg-[color:var(--figma-gray-bg-03)]"
              >
                <X className="size-6" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-wrap items-start gap-x-16 gap-y-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">setup effort</p>
                <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">12 min</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">complexity</p>
                <p className="text-sm font-medium leading-5 text-[color:var(--figma-warning-dark)]">moderate</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">guide owner</p>
                <div className="flex items-center gap-1">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--figma-primary-lighter)] text-[10px] font-semibold leading-4 text-primary">
                    KS
                  </span>
                  <span className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">Kevin Smith</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">open issues</p>
                <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">1 issue</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">Supported tracking</p>
                <div className="flex flex-wrap items-center gap-2">
                  {supportedTracking.map((item) => (
                    <SupportedTrackingChip key={item} label={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-05)]">Pixel support matrix</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] border-b border-border bg-white">
                  <p className="px-6 py-4 text-sm font-semibold leading-5 text-[#6b7280]">Page</p>
                  <p className="px-6 py-4 text-sm font-semibold leading-5 text-[#6b7280]">JS Pixel</p>
                  <p className="px-6 py-4 text-sm font-semibold leading-5 text-[#6b7280]">Image Pixel</p>
                  <p className="px-6 py-4 text-sm font-semibold leading-5 text-[#6b7280]">S2S Pixel</p>
                </div>
                {ATS_MATRIX_ROWS.map((row) => (
                  <div key={row.page} className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] border-b border-border last:border-b-0">
                    <p className="px-6 py-4 text-sm leading-5 text-[#374151]">{row.page}</p>
                    <div className="flex items-center justify-center px-6 py-4">
                      <MatrixStatus ok={row.jsPixel} />
                    </div>
                    <div className="flex items-center justify-center px-6 py-4">
                      <MatrixStatus ok={row.imagePixel} />
                    </div>
                    <div className="flex items-center justify-center px-6 py-4">
                      <MatrixStatus ok={row.s2sPixel} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">Placement instructions</p>
              <div className="flex flex-col gap-3">
                {PLACEMENT_INSTRUCTIONS.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-xs leading-[18px]">
                    <span className={cn("rounded-full px-2 py-1 text-xs font-medium leading-[18px]", item.className)}>{item.label}</span>
                    <span className="text-[color:var(--figma-gray-text-03)]">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">Expected URL Patterns</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded border border-border bg-[color:var(--figma-gray-bg-03)] px-2 py-1 text-sm leading-5 text-[color:var(--figma-gray-text-05)]">
                  *.myworkdayjobs.com/*
                </span>
                <span className="rounded border border-border bg-[color:var(--figma-gray-bg-03)] px-2 py-1 text-sm leading-5 text-[color:var(--figma-gray-text-04)]">
                  *.wd5.myworkdayjobs.com/*
                </span>
              </div>
            </div>

            <div className="rounded-[4px] border border-[color:var(--figma-info-light)] bg-[color:var(--figma-info-lighter)] p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[color:var(--figma-info-main)] text-white">
                  <Info className="size-3.5" strokeWidth={2.2} />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-5 text-[color:var(--figma-gray-text-05)]">URL Parameter Behavior</p>
                  <p className="text-sm leading-5 text-[color:var(--figma-gray-text-04)]">
                    Parameters must be explicitly enabled in Workday career site settings. Default behavior strips query strings on redirect.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function InstallationGuideView() {
  const [tab, setTab] = useState<"pixel" | "ats" | "steps">("pixel");
  const [flowId, setFlowId] = useState<(typeof FLOWS)[number]["id"]>(1);
  const [selectedAtsIndex, setSelectedAtsIndex] = useState<number | null>(null);

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
          onClick={() => setTab("steps")}
          className={cn(
            "-mb-px border-b-2 pb-3 text-sm leading-5 transition-colors",
            tab === "steps"
              ? "border-primary font-semibold text-primary"
              : "border-transparent font-normal text-[color:var(--figma-gray-text-04)] hover:text-foreground",
          )}
        >
          Validate steps
        </button>
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
          Pixel installation guide
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
      </div>

      {tab === "pixel" ? (
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
                          !selected && "border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-01)]",
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
      ) : tab === "ats" ? (
        <div className="flex flex-col gap-5">
          {ATS_CARDS.map((card, index) => (
            <AtsSummaryCard
              key={index}
              supportedTracking={card.supportedTracking}
              onViewMore={() => setSelectedAtsIndex(index)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-8 text-sm text-[color:var(--figma-gray-text-03)]">
          Validate steps content coming soon.
        </div>
      )}
      <AtsDetailsPanel
        open={selectedAtsIndex !== null}
        onClose={() => setSelectedAtsIndex(null)}
        supportedTracking={selectedAtsIndex !== null ? ATS_CARDS[selectedAtsIndex].supportedTracking : []}
      />
    </div>
  );
}
