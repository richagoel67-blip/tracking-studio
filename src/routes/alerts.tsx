import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { PlaceholderPage } from "@/components/tracking-studio/PlaceholderPage";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <AppShell>
      <PlaceholderPage title="Alerts" />
    </AppShell>
  );
}
