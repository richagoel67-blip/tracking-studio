import * as React from "react";

export function QuickTestSandboxBanner() {
  return (
    <div
      role="status"
      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm text-slate-700"
    >
      Sandbox mode · test events will not affect production reporting.
    </div>
  );
}
