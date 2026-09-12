"use client";

import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import { useHierarchy } from "@/hooks/use-hierarchy";
import { getSiteHomeSubtitle } from "@/lib/extra-sites";
import { Building2, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function HomePage() {
  const { data, offline } = useHierarchy();
  const [query, setQuery] = useState("");

  const sites = useMemo(() => {
    const list = [...(data || [])].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((site) => {
      if (site.name.toLowerCase().includes(q)) return true;
      return site.departments.some((dept) => dept.name.toLowerCase().includes(q));
    });
  }, [data, query]);

  return (
    <PageShell
      title="Start Inspection"
      subtitle="Select a hospital site to begin the service checklist"
    >
      {offline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          Offline mode — using cached site data
        </div>
      )}

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or hospital"
          aria-label="Search city or hospital"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {sites.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No sites found for “{query.trim()}”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sites.map((site) => (
            <SelectionCard
              key={site.id}
              title={site.name}
              subtitle={getSiteHomeSubtitle(site)}
              href={`/sites/${site.id}`}
              icon={<Building2 className="h-6 w-6" />}
            />
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 md:hidden">
        <Link
          href="/drafts"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700"
        >
          View Drafts
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700"
        >
          Admin Dashboard
        </Link>
      </div>
    </PageShell>
  );
}
