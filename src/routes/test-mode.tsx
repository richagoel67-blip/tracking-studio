import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { PlaceholderPage } from "@/components/tracking-studio/PlaceholderPage";

export const Route = createFileRoute("/test-mode")({
  component: TestModePage,
});

function TestModePage() {
  return (
    <AppShell>
      <PlaceholderPage title="Test mode / Debug" />
    </AppShell>
  );
}
