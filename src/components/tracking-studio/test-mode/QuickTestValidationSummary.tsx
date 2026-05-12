import * as React from "react";
import { cn } from "@/lib/utils";

export function QuickTestValidationSummary({
  eventsDetected,
  eventsTotal,
  jtrackPresent,
  jtrackExpected,
  issuesFound,
  serverConfirmed,
  visible,
}: {
  eventsDetected: number;
  eventsTotal: number;
  jtrackPresent: number;
  jtrackExpected: number;
  issuesFound: number;
  serverConfirmed: number;
  visible: boolean;
}) {
  if (!visible) return null;

  const cells = [
    { label: "Events Detected", value: `${eventsDetected}/${eventsTotal}`, valueClass: "" },
    {
      label: "jtrack Present",
      value: `${jtrackPresent}/${jtrackExpected}`,
      valueClass: "",
    },
    {
      label: "Issues Found",
      value: String(issuesFound),
      valueClass: issuesFound > 0 ? "text-red-600 bg-red-50" : "",
    },
    {
      label: "Server Confirmed",
      value: `${serverConfirmed} events`,
      valueClass: "text-emerald-700 bg-emerald-50",
    },
  ];

  return (
    <section className="rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="text-sm font-semibold text-[color:var(--figma-gray-text-05)]">Validation Summary</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-md border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)] px-3 py-2"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--figma-gray-text-03)]">
              {c.label}
            </p>
            <p
              className={cn(
                "mt-1 rounded px-1.5 py-0.5 text-lg font-semibold tabular-nums text-[color:var(--figma-gray-text-05)]",
                c.valueClass,
              )}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
