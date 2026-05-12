import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { InstallationGuideView } from "@/components/tracking-studio/installation-guide/InstallationGuideView";

export const Route = createFileRoute("/installation-guide")({
  component: InstallationGuidePage,
});

function InstallationGuidePage() {
  return (
    <AppShell>
      <div className="min-h-full bg-[color:var(--figma-gray-bg-04)]">
        <div className="mx-auto max-w-[1148px] p-6">
          <InstallationGuideView />
        </div>
      </div>
    </AppShell>
  );
}
