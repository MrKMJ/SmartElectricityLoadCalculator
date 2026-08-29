"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { InstallPrompt } from "./InstallPrompt";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

function NavLinks({ nav, backHref, onNavigate }: { nav: NavItem[]; backHref?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {backHref && (
        <Link
          href={backHref}
          onClick={onNavigate}
          className="mb-3 block rounded-lg px-3 py-1.5 text-xs font-medium text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
        >
          ← All projects
        </Link>
      )}
      <nav className="space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
                  : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5",
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Shell({
  children,
  nav,
  title,
  backHref,
}: {
  children: React.ReactNode;
  nav: NavItem[];
  title: string;
  backHref?: string;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    api.notifications
      .list(true)
      .then((n) => setUnread(n.length))
      .catch(() => {});
  }, [pathname]);

  // Close the mobile drawer automatically on route change.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const Logo = (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 text-lg font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">⚡</span>
      Energy Calc
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[rgb(var(--border))] p-4 md:block">
        <div className="mb-6">{Logo}</div>
        <NavLinks nav={nav} backHref={backHref} />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[rgb(var(--bg))] p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              {Logo}
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1 text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <NavLinks nav={nav} backHref={backHref} onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <InstallPrompt />
            <Link href="/notifications" className="relative text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              🔔
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden text-sm text-black/70 dark:text-white/70 sm:block">{user?.name}</div>
            <button onClick={() => logout()} className="btn-secondary !px-3 !py-1.5 text-xs">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
