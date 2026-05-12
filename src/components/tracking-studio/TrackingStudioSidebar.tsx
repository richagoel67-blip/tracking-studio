import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, LayoutDashboard, ListTodo, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

function isNavActive(to: string, pathname: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

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
  const active = isNavActive(to, pathname);

  return (
    <Link
      to={to}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-semibold leading-5 transition-colors",
        active
          ? "bg-[color:var(--figma-secondary-lighter)] text-[color:var(--figma-secondary-main)]"
          : "text-[color:var(--figma-gray-text-03)] hover:bg-[color:var(--figma-gray-bg-01)]",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-5 [&_svg]:shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">{label}</span>
    </Link>
  );
}

export function TrackingStudioSidebar() {
  return (
    <aside className="flex min-h-[calc(100dvh-4rem)] w-[232px] shrink-0 flex-col border-r border-[color:var(--figma-gray-border-02)] bg-white">
      <div className="flex items-center gap-1 p-6">
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-[color:var(--figma-gray-text-05)] transition-colors hover:bg-[color:var(--figma-gray-bg-01)]"
          aria-label="Back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="size-6 shrink-0" strokeWidth={1.5} />
        </button>
        <span className="text-[20px] font-semibold leading-[28px] text-[color:var(--figma-gray-text-05)]">
          Tracking studio
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-6 pb-8">
        <SidebarNavLink to="/" label="Dashboard" icon={<LayoutDashboard strokeWidth={1.75} />} />
        <SidebarNavLink
          to="/test-mode"
          label="Test mode/Debug"
          icon={<ListTodo strokeWidth={1.75} />}
        />
        <SidebarNavLink
          to="/installation-guide"
          label="Installation guide"
          icon={<BookOpen strokeWidth={1.75} />}
        />
        <SidebarNavLink to="/configure" label="Configure" icon={<Settings strokeWidth={1.75} />} />
      </nav>
    </aside>
  );
}
