"use client";

import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  findDepartment,
  findLocation,
  findSection,
  findSite,
  useHierarchy,
} from "@/hooks/use-hierarchy";
import { buildChecklistUrl } from "@/lib/checklist-navigation";
import { getInspectionBreadcrumb, getNavBreadcrumbs } from "@/lib/extra-sites";
import { mergeNamedCatalog } from "@/lib/hierarchy-utils";
import { getMotDetailedItemCount, getMotEquipmentNames } from "@/lib/site-checklists";
import { slugify } from "@/lib/utils";
import { useInspectionStore } from "@/store/inspection-store";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function LocationPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const sectionId = params.sectionId as string;
  const locationId = params.locationId as string;
  const { data } = useHierarchy();
  const { engineerName, setSelection } = useInspectionStore();

  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const section = findSection(data, siteId, deptId, sectionId);
  const location = findLocation(data, siteId, deptId, sectionId, locationId);

  const otEquipment = useMemo(() => {
    const equipment =
      section?.equipment.filter((e) => e.locationId === locationId) || [];
    return equipment[0] ?? null;
  }, [section?.equipment, locationId]);

  const checklistItems = useMemo(
    () =>
      mergeNamedCatalog(
        [...(otEquipment?.checklistItems || [])].sort((a, b) => a.order - b.order),
        getMotEquipmentNames(site?.slug, site?.name),
        (name, index) => ({
          id: `${otEquipment?.id || "ot"}--${slugify(name)}`,
          name,
          slug: slugify(name),
          order: index + 1,
        })
      ),
    [otEquipment, site?.name, site?.slug]
  );

  const getChecklistHref = (checklistItemId: string, checklistItemName: string) => {
    if (!site || !department || !section || !location || !otEquipment) return "#";

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, location.name, checklistItemName],
    });
    const path = {
      siteId,
      siteName: site.name,
      siteSlug: site.slug,
      departmentId: deptId,
      departmentName: department.name,
      departmentSlug: department.slug,
      sectionId,
      sectionName: section.name,
      sectionSlug: section.slug,
      locationId,
      locationName: location.name,
      locationSlug: location.slug,
      equipmentId: otEquipment.id,
      equipmentName: otEquipment.name,
      checklistItemId,
      checklistItemName,
    };

    return buildChecklistUrl(path, breadcrumb, engineerName);
  };

  const handleSelect = (checklistItemId: string, checklistItemName: string) => {
    if (!site || !department || !section || !location || !otEquipment) return;

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, location.name, checklistItemName],
    });
    setSelection(
      {
        siteId,
        siteName: site.name,
        siteSlug: site.slug,
        departmentId: deptId,
        departmentName: department.name,
        departmentSlug: department.slug,
        sectionId,
        sectionName: section.name,
        sectionSlug: section.slug,
        locationId,
        locationName: location.name,
        locationSlug: location.slug,
        equipmentId: otEquipment.id,
        equipmentName: otEquipment.name,
        checklistItemId,
        checklistItemName,
      },
      breadcrumb
    );
  };

  return (
    <PageShell
      breadcrumbs={getNavBreadcrumbs({
        siteId,
        siteName: site?.name,
        departmentId: deptId,
        departmentName: department?.name,
        departmentSlug: department?.slug,
        section: section ? { id: sectionId, name: section.name } : undefined,
        current: location?.name || "Location",
      })}
      title={`${location?.name || "OT"} Equipment`}
      subtitle="Select equipment to inspect"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {checklistItems.map((item) => (
          <Link
            key={item.id}
            href={getChecklistHref(item.id, item.name)}
            onClick={() => handleSelect(item.id, item.name)}
            className="block w-full text-left"
          >
            <SelectionCard
              title={item.name}
              subtitle={`${getMotDetailedItemCount(item.name, site?.slug, site?.name) || 1} detailed checks`}
              icon={<ClipboardList className="h-6 w-6" />}
            />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
