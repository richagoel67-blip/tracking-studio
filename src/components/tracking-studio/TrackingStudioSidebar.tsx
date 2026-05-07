import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Bell, LayoutGrid, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

function SidebarNavLink({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-semibold leading-5 transition-colors",
        active
          ? "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]"
          : "text-[color:var(--figma-gray-text-03)] hover:bg-[color:var(--figma-gray-bg-03)]",
      )}
    >
      <span className={cn("shrink-0 [&_svg]:size-5", active ? "text-[color:var(--figma-secondary-main)]" : "text-[color:var(--figma-gray-icon-04)]")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </Link>
  );
}

export function TrackingStudioSidebar() {
  return (
    <aside className="flex min-h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-1 p-6">
        <button type="button" className="text-foreground" aria-label="Back" onClick={() => window.history.back()}>
          <ArrowLeft className="size-6 shrink-0" strokeWidth={1.5} />
        </button>
        <span className="text-xl font-semibold leading-7 text-foreground">Tracking studio</span>
      </div>
      <nav className="flex flex-col gap-1 px-6 pb-8">
        <SidebarNavLink to="/" label="Dashboard" icon={<LayoutGrid strokeWidth={1.75} />} />
        <SidebarNavLink to="/test-mode" label="Test mode/Debug" icon={<LayoutGrid strokeWidth={1.75} />} />
        <SidebarNavLink to="/snippets" label="Snippets" icon={<LayoutGrid strokeWidth={1.75} />} />
        <SidebarNavLink to="/installation-guide" label="Installation guide" icon={<LayoutGrid strokeWidth={1.75} />} />
        <SidebarNavLink to="/configure" label="Configure" icon={<Settings strokeWidth={1.75} />} />
        <div className="flex items-center gap-4 p-2">
          <span className="whitespace-nowrap text-xs font-medium leading-[18px] text-[color:var(--figma-gray-icon-03)]">
            Other
          </span>
          <div className="h-px min-w-[60px] flex-1 bg-[color:var(--figma-gray-border-02)]" />
        </div>
        <SidebarNavLink to="/alerts" label="Alerts" icon={<Bell strokeWidth={1.75} />} />
      </nav>
    </aside>
  );
}
