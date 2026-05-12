import * as React from "react";
import { Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function QuickTestListeningBanner({
  clientName,
  flowName,
  secondsRemaining,
  onEndEarly,
  ended,
  readOnly,
}: {
  clientName: string;
  flowName: string;
  secondsRemaining: number;
  onEndEarly: () => void;
  ended: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-blue-700/20 bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-5 text-white shadow-md",
        ended && "opacity-95",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Radio className="size-6 text-white" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold leading-7 tracking-tight">
              {ended ? "Test session ended" : "Listening for tracking events…"}
            </h2>
            <p className="text-sm font-medium text-blue-100">
              {clientName} — {flowName}
            </p>
            <p className="max-w-xl text-sm leading-5 text-blue-50/90">
              A test tab was opened. Complete the candidate journey — we&apos;ll detect configured
              events automatically.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="text-right">
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
              {formatMmSs(secondsRemaining)}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100/90">
              session timeout
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-9 border-0 bg-white/95 text-blue-900 hover:bg-white"
            disabled={readOnly || ended}
            onClick={onEndEarly}
          >
            End Test Early
          </Button>
        </div>
      </div>
    </div>
  );
}
