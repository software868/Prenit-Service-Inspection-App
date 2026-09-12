"use client";

import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import { findSite, useHierarchy } from "@/hooks/use-hierarchy";
import { formatServiceNames, isDirectDepartment, isKanpurSite } from "@/lib/extra-sites";
import { Grid3x3, Layers } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SitePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { data } = useHierarchy();
  const site = findSite(data, siteId);
  const onlyDirect =
    site?.departments.length === 1 && isDirectDepartment(site.departments[0]?.slug);

  useEffect(() => {
    if (!site || !onlyDirect) return;
    router.replace(`/sites/${siteId}/departments/${site.departments[0].id}`);
  }, [onlyDirect, router, site, siteId]);

  if (!site) {
    return (
      <PageShell title="Site not found">
        <p className="text-slate-600">This city is not available. Please start again from home.</p>
      </PageShell>
    );
  }

  if (onlyDirect) {
    const department = site.departments[0];
    return (
      <PageShell
        breadcrumbs={[{ label: site.name }]}
        title="Select Checklist"
        subtitle="Choose the checklist to inspect"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {department.sections.map((section) => {
            const itemCount =
              section.locations.length > 0
                ? section.locations.length
                : section.equipment[0]?.checklistItems?.length || 0;
            return (
              <SelectionCard
                key={section.id}
                title={section.name}
                subtitle={
                  section.locations.length > 0
                    ? `${itemCount} OT locations`
                    : `${itemCount} equipment items`
                }
                href={`/sites/${siteId}/departments/${department.id}/sections/${section.id}`}
                icon={<Grid3x3 className="h-6 w-6" />}
              />
            );
          })}
        </div>
      </PageShell>
    );
  }

  const extraCity = !isKanpurSite(site.slug);

  return (
    <PageShell
      breadcrumbs={[{ label: site.name }]}
      title={extraCity ? "Select Hospital" : "Select Department"}
      subtitle={
        extraCity
          ? "Choose the hospital for this inspection"
          : "Choose the department for this inspection"
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {site.departments.map((dept) => (
          <SelectionCard
            key={dept.id}
            title={dept.name}
            subtitle={
              extraCity
                ? formatServiceNames(dept.sections.map((section) => section.name))
                : `${dept.sections.length} sections`
            }
            href={`/sites/${siteId}/departments/${dept.id}`}
            icon={<Layers className="h-6 w-6" />}
          />
        ))}
      </div>
    </PageShell>
  );
}
