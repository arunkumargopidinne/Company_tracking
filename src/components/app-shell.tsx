"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/student-reports", label: "Student Scores", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: BarChart3, matches: ["/reports", "/rsa"] },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

type ShellUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export function AppShell({
  children,
  user,
  pendingApprovalCount = 0,
  notificationCount = 0,
}: {
  children: React.ReactNode;
  user: ShellUser;
  pendingApprovalCount?: number;
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [liveNotificationCount, setLiveNotificationCount] = useState(notificationCount);
  const desktopOffset = collapsed ? "lg:pl-20" : "lg:pl-72";

  useEffect(() => {
    let cancelled = false;

    async function refreshNotificationCount() {
      try {
        const response = await fetch("/api/notifications/count", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!cancelled && response.ok && typeof payload.count === "number") {
          setLiveNotificationCount(payload.count);
        }
      } catch {
        // The server-rendered count remains visible if polling fails.
      }
    }

    const intervalId = window.setInterval(refreshNotificationCount, 30000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshNotificationCount();
      }
    }

    function handleNotificationCount(event: Event) {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count;

      if (typeof count === "number") {
        setLiveNotificationCount(count);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notifications:count", handleNotificationCount);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("notifications:count", handleNotificationCount);
    };
  }, []);

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
          role={user.role}
          pendingApprovalCount={pendingApprovalCount}
          notificationCount={liveNotificationCount}
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
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              title="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {liveNotificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-black text-white">
                  {formatBadgeCount(liveNotificationCount)}
                </span>
              ) : null}
            </Link>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 sm:px-4">
              {roleLabel(user.role)}
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              type="button"
              title="Sign out"
              onClick={() => signOut({ callbackUrl: "/login" })}
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
              role={user.role}
              pendingApprovalCount={pendingApprovalCount}
              notificationCount={liveNotificationCount}
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
        <div className="mx-auto w-full max-w-7xl animate-enter">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  role,
  pendingApprovalCount,
  notificationCount,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  role: string;
  pendingApprovalCount: number;
  notificationCount: number;
  onNavigate: () => void;
}) {
  const visibleNavItems =
    role === "SUPERADMIN"
      ? [
          ...navItems,
          { href: "/admin/users", label: "User Approvals", icon: UsersRound },
          { href: "/admin/activity", label: "Active Logs", icon: Activity },
        ]
      : navItems;

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
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.matches);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={clsx(
                "relative flex min-h-11 items-center rounded-[8px] text-sm font-bold transition",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {collapsed ? null : <span className="min-w-0">{item.label}</span>}
              {getItemBadgeCount(item.href, pendingApprovalCount, notificationCount) > 0 ? (
                <span
                  className={clsx(
                    "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black",
                    active ? "bg-white text-indigo-700" : "bg-rose-600 text-white",
                    collapsed && "absolute right-1 top-1",
                  )}
                >
                  {formatBadgeCount(getItemBadgeCount(item.href, pendingApprovalCount, notificationCount))}
                </span>
              ) : null}
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

function roleLabel(role: string) {
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "STAKEHOLDER") return "Stakeholder";
  return "Admin";
}

function getItemBadgeCount(
  href: string,
  pendingApprovalCount: number,
  notificationCount: number,
) {
  if (href === "/admin/users") return pendingApprovalCount;
  if (href === "/notifications") return notificationCount;
  return 0;
}

function formatBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}
