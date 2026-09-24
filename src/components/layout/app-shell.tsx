"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ClipboardCheck, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const isAdminUser = user?.role === "ADMIN";
  const isAdmin = pathname.startsWith("/admin");

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 lg:max-w-6xl">
        <Link href={isAdminUser ? "/admin" : "/"} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Prenit Service</p>
            <p className="text-xs text-slate-500">{user.name}</p>
          </div>
        </Link>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {!isAdminUser && (
            <>
              <Link
                href="/"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === "/" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                New Inspection
              </Link>
              <Link
                href="/drafts"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === "/drafts"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Drafts
              </Link>
            </>
          )}
          {isAdminUser && (
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                isAdmin ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-100 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {!isAdminUser && (
              <>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  New Inspection
                </Link>
                <Link
                  href="/drafts"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Drafts
                </Link>
              </>
            )}
            {isAdminUser && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Admin Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

interface PageShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  subtitle?: string;
  wide?: boolean;
  padBottom?: boolean;
}

export function PageShell({
  children,
  breadcrumbs,
  title,
  subtitle,
  wide,
  padBottom,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30">
      <AppHeader />
      <main
        className={cn(
          "mx-auto px-4 py-5",
          wide ? "max-w-6xl" : "max-w-3xl lg:max-w-5xl",
          padBottom && "pb-20"
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
        )}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
            {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
