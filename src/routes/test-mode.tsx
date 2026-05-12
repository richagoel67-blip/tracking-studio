import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { TestModeView } from "@/components/tracking-studio/test-mode/TestModeView";

export const Route = createFileRoute("/test-mode")({
  component: TestModePage,
});

function TestModePage() {
  return (
    <AppShell>
      <div className="min-h-full bg-[color:var(--figma-gray-bg-04)]">
        <div className="mx-auto max-w-[1148px] p-6">
          <TestModeView />
        </div>
      </div>
    </AppShell>
  );
}
