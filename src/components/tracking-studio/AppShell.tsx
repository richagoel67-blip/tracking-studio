import { Menu, LayoutGrid, Bell, Search, LifeBuoy, ChevronDown } from "lucide-react";

import { TrackingStudioSidebar } from "@/components/tracking-studio/TrackingStudioSidebar";

type AppShellProps = {
  children: React.ReactNode;
  /** Client name in the header selector (defaults to Tenet Healthcare). */
  clientName?: string;
  /** When true, the left tracking sidebar is omitted (full-width main). */
  hideSidebar?: boolean;
};

export function AppShell({
  children,
  clientName = "Tenet Healthcare",
  hideSidebar = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-foreground text-sm font-sans antialiased">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-white px-6">
        <button type="button" className="text-foreground" aria-label="Open menu">
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <span className="text-base font-bold tracking-wide text-primary">TAO</span>
        <div className="ml-4 flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-[color:var(--figma-gray-text-04)]">
          <LayoutGrid className="size-4 text-[color:var(--figma-gray-icon-03)]" />
          <span className="font-medium">{clientName}</span>
          <ChevronDown className="size-4 text-[color:var(--figma-gray-icon-03)]" />
        </div>
        <div className="mx-4 max-w-[480px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[color:var(--figma-gray-icon-03)]" />
            <input
              type="search"
              placeholder="Search candidate, applications etc."
              className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm text-[color:var(--figma-gray-text-04)] placeholder:text-[color:var(--figma-gray-text-03)] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5 text-[color:var(--figma-gray-icon-04)]">
          <LifeBuoy className="size-5" strokeWidth={1.5} />
          <Bell className="size-6" strokeWidth={1.5} />
          <LayoutGrid className="size-5" strokeWidth={1.5} />
          <div className="flex size-[31px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-[color:var(--figma-on-primary-label)]">
            AK
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 pt-16">
        {hideSidebar ? null : <TrackingStudioSidebar />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
