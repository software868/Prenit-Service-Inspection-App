"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm text-slate-600",
        className
      )}
    >
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 py-2 text-blue-700 hover:bg-blue-50"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          {item.href ? (
            <Link
              href={item.href}
              className="rounded-md px-2 py-2 font-medium text-blue-700 hover:bg-blue-50"
            >
              {item.label}
            </Link>
          ) : (
            <span className="rounded-md px-2 py-2 font-semibold text-slate-900">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
