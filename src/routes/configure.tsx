import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ConfigureTrackingSetup } from "@/components/tracking-studio/configure/ConfigureTrackingSetup";
import { AppShell } from "@/components/tracking-studio/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/configure")({
  component: ConfigurePage,
});

function ConfigurePage() {
  const [configureStage, setConfigureStage] = React.useState<1 | 2 | 3 | 4>(1);
  const hideSidebar = configureStage !== 1;

  return (
    <AppShell clientName="Allied Services" hideSidebar={hideSidebar}>
      <div className="flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--figma-gray-bg-04)]">
        <ConfigureTrackingSetup onStageChange={setConfigureStage} />
      </div>
      <Toaster />
    </AppShell>
  );
}
