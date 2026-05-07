import {
  Menu,
  LayoutGrid,
  Bell,
  Search,
  LifeBuoy,
  ChevronDown,
} from "lucide-react";

import { TrackingStudioSidebar } from "@/components/tracking-studio/TrackingStudioSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-foreground text-sm font-sans antialiased">
      <header className="flex h-16 items-center gap-4 border-b border-border bg-white px-6">
        <button type="button" className="text-foreground" aria-label="Open menu">
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <span className="text-base font-bold tracking-wide text-primary">TAO</span>
        <div className="ml-4 flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-[color:var(--figma-gray-text-04)]">
          <LayoutGrid className="size-4 text-[color:var(--figma-gray-icon-03)]" />
          <span className="font-medium">Tenet Healthcare</span>
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

      <div className="flex">
        <TrackingStudioSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
