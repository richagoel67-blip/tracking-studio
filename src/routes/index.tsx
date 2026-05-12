"use client";

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Play,
  Filter,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { Button } from "@/components/ui/button";
import { MOCK_TRACKING_EVENT_LOGS } from "@/components/tracking-studio/tracking-events-drawer/mock-tracking-event-logs";
import { TrackingEventsDrawer } from "@/components/tracking-studio/tracking-events-drawer/TrackingEventsDrawer";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [activityOpen, setActivityOpen] = React.useState(false);

  return (
    <AppShell>
      <div className="min-h-full bg-[color:var(--figma-gray-bg-04)]">
        <div className="mx-auto max-w-[1148px] space-y-5 p-6">
        <div>
          <h1 className="text-lg font-semibold leading-7 text-foreground">Dashboard</h1>
          <p className="mt-2 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">
            Track funnel performance, attribution quality, and pixel health across devices and ATS
            integrations.
          </p>
        </div>

        <section className="rounded-lg border border-border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold leading-7 text-foreground">
                Tenet Healthcare
              </span>
              <span className="rounded border border-border bg-[color:var(--figma-gray-bg-03)] px-2 py-0.5 text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">
                Workday
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
                  Pixel Status
                </span>
                <span className="flex gap-1 pl-1">
                  <span className="size-2.5 rounded-full bg-[color:var(--figma-error-main)]" />
                  <span className="size-2.5 rounded-full bg-[color:var(--figma-warning-main)]" />
                  <span className="size-2.5 rounded-full bg-[color:var(--figma-success-main)]" />
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-lg border-0 bg-[color:var(--figma-primary-lighter)] px-5 py-2.5 text-base font-medium leading-6 text-[color:var(--figma-primary-main)] shadow-none hover:bg-[color:var(--figma-primary-light)] hover:text-[color:var(--figma-primary-main)] focus-visible:ring-1 focus-visible:ring-[color:var(--figma-primary-main)]/25"
                onClick={() => setActivityOpen(true)}
              >
                Activity logs
              </Button>
              <button
                type="button"
                className="inline-flex h-11 w-[140px] items-center justify-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-base font-medium leading-6 text-[color:var(--figma-on-primary-label)] transition-opacity hover:opacity-90"
              >
                <Play className="size-5" strokeWidth={1.75} />
                Run Tests
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-8 lg:gap-12">
            <div className="flex items-center gap-1 text-xs leading-[18px]">
              <Clock
                className="size-[18px] text-[color:var(--figma-success-main)]"
                strokeWidth={1.5}
              />
              <span className="text-[color:var(--figma-gray-text-03)]">Last Event Received :</span>
              <span className="text-sm font-normal leading-5 text-foreground">2 min ago</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
                Primary contact
              </span>
              <div className="flex items-center gap-1">
                <div className="flex size-6 items-center justify-center rounded-full bg-[color:var(--figma-primary-lighter)] text-[10px] font-semibold leading-4 text-primary">
                  KS
                </div>
                <span className="text-sm font-semibold leading-5 text-foreground">Kevin Smith</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
                Implementation progress
              </span>
              <span className="text-sm font-semibold leading-5 text-foreground">94%</span>
              <svg className="size-5 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--figma-gray-border-03)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--figma-primary-main)"
                  strokeWidth="3"
                  strokeDasharray={`${0.94 * 97.4} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="rounded-full bg-[color:var(--figma-warning-lighter)] px-3 py-1 text-xs font-medium leading-[18px] text-[color:var(--figma-warning-main)]">
                Hypercare
              </span>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-9 items-center justify-center">
            <Filter className="size-4 text-[color:var(--figma-gray-icon-04)]" strokeWidth={1.5} />
          </div>
          <FilterPill label="All ATS" />
          <FilterPill label="All pixel health" wide />
        </div>

        <section className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="flex h-[178px] w-full shrink-0 flex-col justify-between rounded-lg border border-border bg-white p-6 lg:w-[200px]">
            <div>
              <div className="text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                Total events
              </div>
              <div className="mt-1 text-lg font-bold leading-none text-foreground">4,094</div>
              <div className="mt-1 text-xs leading-[18px] text-[color:var(--figma-success-main)]">
                +12.3% from last period
              </div>
            </div>
            <svg viewBox="0 0 152 18" className="mt-2 h-[18px] w-full" preserveAspectRatio="none">
              <path
                d="M0,14 L24,12 L48,13 L72,9 L96,10 L120,5 L136,7 L152,4"
                fill="none"
                stroke="var(--figma-chart-bar-primary)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="flex min-h-[178px] min-w-0 flex-1 gap-8 rounded-lg border border-border bg-white p-6">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                  Attribution coverage
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-lg font-semibold leading-7 text-foreground">94%</span>
                  <span className="pb-0.5 text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                    /6% unattributed
                  </span>
                </div>
              </div>
              <div className="w-[234px] max-w-full space-y-2">
                <div className="flex justify-between text-xs leading-[18px]">
                  <span>
                    <span className="font-semibold text-foreground">78%</span>{" "}
                    <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                      Cookie
                    </span>
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">22%</span>{" "}
                    <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                      fingerprint
                    </span>
                  </span>
                </div>
                <div className="flex h-2 gap-px overflow-hidden rounded-2xl">
                  <div className="h-full w-[74.5%] bg-chart-bar" />
                  <div className="h-full flex-1 bg-chart-bar-muted" />
                </div>
                <div className="flex justify-between text-[10px] leading-4 text-[color:var(--figma-gray-text-03)]">
                  <span>0</span>
                  <span>94%</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
              <div className="flex flex-wrap gap-6">
                <div className="flex gap-6">
                  <div className="flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Monitor
                        className="size-[18px] text-[color:var(--figma-gray-text-04)]"
                        strokeWidth={1.5}
                      />
                      <span className="text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                        Desktop split
                      </span>
                    </div>
                    <span className="text-sm font-semibold leading-5 text-foreground">58.3%</span>
                  </div>
                  <div className="min-w-[120px] flex-1 space-y-2">
                    <div className="flex justify-between text-xs leading-[18px]">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">34%</span>
                        <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                          Cookie
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-foreground">24.3%</span>
                        <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                          fingerprint
                        </span>
                      </span>
                    </div>
                    <div className="flex h-0.5 gap-px overflow-hidden rounded-2xl">
                      <div className="h-full w-[68%] bg-chart-bar" />
                      <div className="h-full flex-1 bg-chart-bar-muted" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex gap-6">
                  <div className="flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Smartphone
                        className="size-[18px] text-[color:var(--figma-gray-text-04)]"
                        strokeWidth={1.5}
                      />
                      <span className="text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                        Mobile split
                      </span>
                    </div>
                    <span className="text-sm font-semibold leading-5 text-foreground">41.7%</span>
                  </div>
                  <div className="min-w-[120px] flex-1 space-y-2">
                    <div className="flex justify-between text-xs leading-[18px]">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">30%</span>
                        <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                          Cookie
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-foreground">11.7%</span>
                        <span className="font-normal text-[color:var(--figma-gray-text-04)]">
                          fingerprint
                        </span>
                      </span>
                    </div>
                    <div className="flex h-0.5 gap-px overflow-hidden rounded-2xl">
                      <div className="h-full w-[64%] bg-chart-bar" />
                      <div className="h-full flex-1 bg-chart-bar-muted" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[178px] flex-1 rounded-lg border border-border bg-white p-6 lg:max-w-[302px] lg:flex-none">
            <div className="flex w-full justify-between gap-6">
              <div className="flex flex-col justify-between gap-5">
                <div>
                  <div className="text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                    Pixel health
                  </div>
                  <div className="mt-0.5 flex items-end gap-1">
                    <span className="text-lg font-semibold leading-7 text-foreground">47/52</span>
                    <span className="pb-0.5 text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                      healthy
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-xs leading-[18px] text-[color:var(--figma-gray-text-04)]">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-4 shrink-0 rounded-lg bg-[color:var(--figma-chart-light)]" />
                    47 Healthy
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-4 shrink-0 rounded-lg bg-chart-bar" />3 Warning
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-4 shrink-0 rounded-lg bg-chart-bar-muted" />2 Silent
                  </div>
                </div>
              </div>
              <PieChart />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="flex min-h-[360px] flex-1 flex-col rounded-md border border-[color:var(--figma-neutral-300)] bg-white p-6 lg:max-w-[782px]">
            <h2 className="text-base font-medium leading-[30px] text-[color:var(--figma-title-strong)]">
              Conversion funnel
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <FunnelStep label="Clicks" value="324,560" />
              <FunnelStep label="Views" value="123,333" sub="62% drop" />
              <FunnelStep label="Apply starts" value="32,456" sub="74% drop" />
              <FunnelStep label="Apply finishes" value="487" sub="98.5% drop" />
            </div>
            <FunnelChart />
          </div>

          <div className="flex w-full flex-col rounded-lg border border-border bg-white p-6 lg:w-[346px] lg:shrink-0">
            <h3 className="text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-04)]">
              Pixel status
            </h3>
            <div className="mt-5 flex gap-2.5">
              <div className="flex w-2 shrink-0 flex-col items-center pt-1">
                <span className="size-2 rounded-full bg-[color:var(--figma-success-main)]" />
                <div className="mt-1 w-px flex-1 min-h-[52px] bg-border" />
                <span className="size-2 rounded-full bg-[color:var(--figma-warning-main)]" />
                <div className="mt-1 w-px flex-1 min-h-[52px] bg-border" />
                <span className="size-2 rounded-full bg-[color:var(--figma-error-main)]" />
              </div>
              <div className="min-w-0 flex-1 space-y-8">
                <PixelRow
                  tag="VIEW"
                  tagClass="bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]"
                  type="IMAGE PIXEL"
                />
                <PixelRow
                  tag="APPLY START"
                  tagClass="bg-[color:var(--figma-warning-lighter)] text-[color:var(--figma-warning-main)]"
                  type="JS PIXEL"
                />
                <PixelRow
                  tag="APPLY FINISH"
                  tagClass="bg-[color:var(--figma-success-lighter)] text-[color:var(--figma-success-main)]"
                  type="IMAGE PIXEL"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-8 text-xs leading-[18px] text-[color:var(--figma-gray-text-03)]">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[color:var(--figma-success-main)]" />
                Pass
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[color:var(--figma-warning-main)]" />
                Warning
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[color:var(--figma-error-main)]" />
                Fail
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6">
          <div className="inline-flex rounded-lg border border-[color:var(--figma-gray-border-03)]">
            <button
              type="button"
              className="rounded-bl-[4px] rounded-tl-[4px] border border-[color:var(--figma-gray-border-03)] bg-[color:var(--figma-gray-bg-03)] px-4 py-2 text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-04)]"
            >
              Funnel by device(45)
            </button>
            <button
              type="button"
              className="-ml-px border border-[color:var(--figma-gray-border-03)] bg-white px-4 py-2 text-sm font-medium leading-5 text-[color:var(--figma-gray-text-04)]"
            >
              Attribution by device(12)
            </button>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-white shadow-[inset_0_-1px_0_0_var(--figma-gray-border-03)]">
                    <Th>OS</Th>
                    <Th className="w-[120px]">Browser</Th>
                    <Th right>Clicks</Th>
                    <Th right>Views</Th>
                    <Th right>Apply start</Th>
                    <Th right>Apply finish</Th>
                    <Th right>Click → Apply Finish</Th>
                    <Th>Funnel</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <Td>
                        <span className="flex items-center gap-2">
                          {r.mobile ? (
                            <Smartphone className="size-[18px] shrink-0 text-[color:var(--figma-gray-icon-03)]" />
                          ) : (
                            <Monitor className="size-[18px] shrink-0 text-[color:var(--figma-gray-icon-03)]" />
                          )}
                          {r.os}
                        </span>
                      </Td>
                      <Td>{r.browser}</Td>
                      <Td right>{r.clicks}</Td>
                      <Td right>{r.views}</Td>
                      <Td right>{r.start}</Td>
                      <Td right>{r.finish}</Td>
                      <Td right>
                        <span className="text-[color:var(--figma-success-main)]">{r.cf}</span>
                      </Td>
                      <Td>
                        <MiniFunnel />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-1 text-[color:var(--figma-gray-icon-03)]">
            <button type="button" aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label="Next page">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>
        </div>
      </div>

      <TrackingEventsDrawer
        clientName="Tenet Healthcare"
        logs={MOCK_TRACKING_EVENT_LOGS}
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </AppShell>
  );
}

const rows = [
  {
    os: "Windows",
    browser: "Chrome",
    clicks: "1.1M",
    views: "3.3k",
    start: "40k",
    finish: "40k",
    cf: "4k",
    mobile: false,
  },
  {
    os: "iOS",
    browser: "Safari",
    clicks: "3.3k",
    views: "1.1M",
    start: "3k",
    finish: "3k",
    cf: "300",
    mobile: true,
  },
  {
    os: "Android",
    browser: "Firefox",
    clicks: "4k",
    views: "3.3k",
    start: "201k",
    finish: "201k",
    cf: "200",
    mobile: true,
  },
  {
    os: "Linux",
    browser: "Edge",
    clicks: "3.3k",
    views: "3.3k",
    start: "6k",
    finish: "6k",
    cf: "600",
    mobile: false,
  },
  {
    os: "macOS",
    browser: "Opera",
    clicks: "3.3k",
    views: "201k",
    start: "3.3k",
    finish: "3.3k",
    cf: "340",
    mobile: false,
  },
  {
    os: "Chrome OS",
    browser: "Brave",
    clicks: "3.3k",
    views: "4k",
    start: "3.0k",
    finish: "3.0k",
    cf: "1k",
    mobile: false,
  },
  {
    os: "Ubuntu",
    browser: "Vivaldi",
    clicks: "201k",
    views: "3.3k",
    start: "4k",
    finish: "4k",
    cf: "2k",
    mobile: false,
  },
];

function FilterPill({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-sm font-medium leading-5 text-[color:var(--figma-gray-text-04)] ${wide ? "min-w-[147px] justify-between" : ""}`}
    >
      {label}
      <ChevronDown className="size-5 text-[color:var(--figma-gray-icon-03)]" />
    </button>
  );
}

function FunnelStep({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-sm font-medium leading-5 text-[color:var(--figma-funnel-label)]">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold leading-6 text-[color:var(--figma-title-strong)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-sm font-normal leading-normal text-[color:var(--figma-funnel-sub)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function FunnelChart() {
  return (
    <div className="relative mt-8 h-36 w-full">
      <svg viewBox="0 0 734 120" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="funnelGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--figma-chart-mid)" />
            <stop offset="55%" stopColor="var(--figma-chart-bar-primary)" />
            <stop offset="100%" stopColor="var(--figma-chart-light)" />
          </linearGradient>
        </defs>
        <path
          d="M0,8 C120,12 160,45 200,55 C320,78 420,95 520,102 C620,108 680,112 734,115 L734,120 L0,120 Z"
          fill="url(#funnelGrad)"
          opacity={0.92}
        />
        <path
          d="M520,102 C600,108 660,108 734,108 L734,120 L500,120 Z"
          fill="var(--figma-success-main)"
          opacity={0.35}
        />
      </svg>
    </div>
  );
}

function PieChart() {
  return (
    <div
      className="size-[130px] shrink-0 rounded-full"
      style={{
        background: `conic-gradient(
          var(--figma-chart-light) 0 65%,
          var(--figma-chart-bar-primary) 65% 90%,
          var(--figma-chart-bar-muted) 90% 100%
        )`,
      }}
    />
  );
}

function PixelRow({ tag, tagClass, type }: { tag: string; tagClass: string; type: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-medium leading-[18px] ${tagClass}`}
        >
          {tag}
        </span>
        <span className="rounded-full bg-[color:var(--figma-gray-bg-03)] px-1.5 py-0.5 text-xs font-normal leading-[18px] text-[color:var(--figma-gray-text-03)]">
          {type}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs leading-[18px]">
        <span className="text-sm font-normal leading-5 text-foreground">659 today</span>
        <span className="text-[color:var(--figma-gray-text-03)]">Last 4 hours ago</span>
      </div>
    </div>
  );
}

function Th({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`relative px-6 py-4 text-left text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-04)] ${right ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td
      className={`border-border px-6 py-4 ${right ? "text-right" : "text-left"} text-sm leading-5 text-foreground`}
    >
      {children}
    </td>
  );
}

function MiniFunnel() {
  return (
    <div className="flex h-2 w-32 gap-px overflow-hidden rounded-sm">
      <div className="h-full flex-1 bg-chart-bar" />
      <div className="h-full flex-1 bg-[color:var(--figma-chart-mid)]" />
      <div className="h-full flex-1 bg-[color:var(--figma-chart-light)]" />
      <div className="h-full flex-1 bg-chart-bar-muted" />
    </div>
  );
}
