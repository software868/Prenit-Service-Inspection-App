"use client";

import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import { findDepartment, findSite, useHierarchy } from "@/hooks/use-hierarchy";
import { isDirectDepartment, isKanpurSite } from "@/lib/extra-sites";
import { Grid3x3 } from "lucide-react";
import { useParams } from "next/navigation";

export default function DepartmentPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const { data } = useHierarchy();
  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const extraCity = site && !isKanpurSite(site.slug);
  const hideHospital = isDirectDepartment(department?.slug);

  const breadcrumbs = hideHospital
    ? [{ label: site?.name || "Site" }]
    : [
        { label: site?.name || "Site", href: `/sites/${siteId}` },
        { label: department?.name || "Department" },
      ];

  return (
    <PageShell
      breadcrumbs={breadcrumbs}
      title={extraCity ? "Select Checklist" : "Select Section"}
      subtitle={extraCity ? "Choose the checklist to inspect" : "Choose the section to inspect"}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {department?.sections.map((section) => {
          const itemCount =
            section.locations.length > 0
              ? section.locations.length
              : section.equipment[0]?.checklistItems?.length || 0;

          const subtitle =
            section.locations.length > 0
              ? `${itemCount} OT locations`
              : `${itemCount} equipment items`;

          return (
            <SelectionCard
              key={section.id}
              title={section.name}
              subtitle={subtitle}
              href={`/sites/${siteId}/departments/${deptId}/sections/${section.id}`}
              icon={<Grid3x3 className="h-6 w-6" />}
            />
          );
        })}
      </div>
    </PageShell>
  );
}
