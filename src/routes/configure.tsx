import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { PlaceholderPage } from "@/components/tracking-studio/PlaceholderPage";

export const Route = createFileRoute("/configure")({
  component: ConfigurePage,
});

function ConfigurePage() {
  return (
    <AppShell>
      <PlaceholderPage title="Configure" />
    </AppShell>
  );
}
