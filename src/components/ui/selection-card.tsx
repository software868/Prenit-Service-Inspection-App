"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface SelectionCardProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string;
  className?: string;
}

export function SelectionCard({
  title,
  subtitle,
  href,
  icon,
  badge,
  className,
}: SelectionCardProps) {
  const content = (
    <>
      {icon && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{title}</h3>
          {badge && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-600" />
    </>
  );

  const classes = cn(
    "group flex min-h-[72px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md",
    href && "active:scale-[0.98]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
