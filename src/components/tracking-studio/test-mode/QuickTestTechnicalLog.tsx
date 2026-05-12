import * as React from "react";

import { cn } from "@/lib/utils";

import type { TechLogSource } from "./quick-test-session";

export type QuickTestTechLogRow = {
  id: string;
  timeLabel: string;
  source: TechLogSource;
  eventName: string;
  /** Raw value for display after `jtrack=` (e.g. test-8f2k or null). */
  jtrack: string;
};

export function QuickTestTechnicalLog({ rows, listening }: { rows: QuickTestTechLogRow[]; listening: boolean }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-lg border border-slate-800 bg-slate-950 shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Technical log</h2>
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2 rounded-full", listening ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" : "bg-slate-500")}
            aria-hidden
          />
          <span className="text-xs font-medium text-slate-300">{listening ? "Recording" : "Stopped"}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
        {rows.length === 0 ? (
          <p className="px-1 py-4 text-slate-500">Waiting for events…</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-2 gap-y-0.5 border-b border-slate-800/80 pb-1.5 last:border-0">
                <span className="shrink-0 text-slate-500">{r.timeLabel}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-200/95">
                  {r.source}
                </span>
                <span className="font-semibold text-sky-200">{r.eventName}</span>
                <span className="min-w-0 text-slate-400">
                  jtrack={r.jtrack}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-slate-800 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-300">{rows.length}</span> log line{rows.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
