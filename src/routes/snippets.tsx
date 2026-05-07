import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/tracking-studio/AppShell";
import { PlaceholderPage } from "@/components/tracking-studio/PlaceholderPage";

export const Route = createFileRoute("/snippets")({
  component: SnippetsPage,
});

function SnippetsPage() {
  return (
    <AppShell>
      <PlaceholderPage title="Snippets" />
    </AppShell>
  );
}
