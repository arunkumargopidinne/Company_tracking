"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";

import { clsx } from "clsx";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/student-reports", label: "Student Scores", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: BarChart3, matches: ["/reports", "/rsa"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const desktopOffset = collapsed ? "lg:pl-20" : "lg:pl-72";

  function toggleNavigation() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((value) => !value);
      return;
    }

    setMobileOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-950">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      <header
        className={clsx(
          "sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur transition-[padding] duration-200",
          desktopOffset,
        )}
      >
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleNavigation}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Toggle menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-600 text-white shadow-sm">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold leading-5">
                  EduTech Pipeline
                </span>
                <span className="text-xs text-slate-500">Hiring tracker</span>
              </span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 sm:px-4">
              Admin
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              type="button"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(20rem,88vw)] border-r border-slate-200 bg-white shadow-xl">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <main
        className={clsx(
          "w-full px-4 py-7 transition-[padding] duration-200 sm:px-5 lg:px-7 lg:py-8",
          desktopOffset,
        )}
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={clsx(
          "flex items-center gap-3 px-5 py-5",
          collapsed && "justify-center px-3",
        )}
        title="EduTech Pipeline"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-indigo-600 text-white shadow-sm">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </span>
        {collapsed ? null : (
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold leading-5">
              EduTech Pipeline
            </span>
            <span className="text-sm text-slate-500">Hiring tracker</span>
          </span>
        )}
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.matches);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={clsx(
                "flex min-h-11 items-center rounded-[8px] text-sm font-bold transition",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {collapsed ? null : <span className="min-w-0">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string, matches: string[] = []) {
  const candidates = [href, ...matches];

  return candidates.some(
    (item) =>
      pathname === item ||
      (item !== "/dashboard" && pathname.startsWith(`${item}/`)),
  );
}
