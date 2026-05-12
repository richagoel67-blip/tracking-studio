import * as React from "react";

import { cn } from "@/lib/utils";

function SummaryCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  const neutral = value === 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          neutral ? "text-slate-400" : valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function QuickTestSummaryCards({
  detected,
  listening,
  issues,
  confirmed,
}: {
  detected: number;
  listening: number;
  issues: number;
  confirmed: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCell label="Detected" value={detected} valueClass="text-emerald-700" />
      <SummaryCell label="Listening" value={listening} valueClass="text-sky-700" />
      <SummaryCell label="Issues" value={issues} valueClass="text-amber-700" />
      <SummaryCell label="Confirmed" value={confirmed} valueClass="text-emerald-700" />
    </div>
  );
}
