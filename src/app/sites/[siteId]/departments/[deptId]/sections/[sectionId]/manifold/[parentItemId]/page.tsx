"use client";

import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  findDepartment,
  findSection,
  findSite,
  useHierarchy,
} from "@/hooks/use-hierarchy";
import { buildChecklistUrl } from "@/lib/checklist-navigation";
import { getInspectionBreadcrumb, getNavBreadcrumbs } from "@/lib/extra-sites";
import {
  getNestedComponentDetailedCount,
  getNestedComponentNames,
  isNestedParentEquipment,
} from "@/lib/nested-equipment-checklist";
import { mergeNamedCatalog } from "@/lib/hierarchy-utils";
import { slugify } from "@/lib/utils";
import { useInspectionStore } from "@/store/inspection-store";
import { ClipboardList, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";

function ManifoldPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const sectionId = params.sectionId as string;
  const parentItemId = params.parentItemId as string;
  const parentItemName = searchParams.get("name") || "Equipment";
  const { data } = useHierarchy();
  const { engineerName, setSelection } = useInspectionStore();

  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const section = findSection(data, siteId, deptId, sectionId);

  const sectionEquipment = useMemo(() => {
    const equipment = section?.equipment.filter((e) => !e.locationId) || [];
    return equipment[0] ?? null;
  }, [section?.equipment]);

  const manifoldItem = useMemo(() => {
    return sectionEquipment?.checklistItems.find((item) => item.id === parentItemId);
  }, [sectionEquipment, parentItemId]);

  const components = useMemo(() => {
    const existing = manifoldItem?.children?.length
      ? [...manifoldItem.children].sort((a, b) => a.order - b.order)
      : [];
    return mergeNamedCatalog(
      existing,
      getNestedComponentNames(parentItemName),
      (name, index) => ({
        id: `${parentItemId}--${slugify(name)}`,
        name,
        order: index + 1,
      })
    );
  }, [manifoldItem, parentItemId, parentItemName]);

  const getChecklistHref = (componentId: string, componentName: string) => {
    if (!site || !department || !section || !sectionEquipment) return "#";

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, parentItemName, componentName],
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
      equipmentId: sectionEquipment.id,
      equipmentName: sectionEquipment.name,
      parentChecklistItemId: parentItemId,
      parentChecklistItemName: parentItemName,
      checklistItemId: componentId,
      checklistItemName: componentName,
    };

    return buildChecklistUrl(path, breadcrumb, engineerName);
  };

  const handleSelect = (componentId: string, componentName: string) => {
    if (!site || !department || !section || !sectionEquipment) return;

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, parentItemName, componentName],
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
        equipmentId: sectionEquipment.id,
        equipmentName: sectionEquipment.name,
        parentChecklistItemId: parentItemId,
        parentChecklistItemName: parentItemName,
        checklistItemId: componentId,
        checklistItemName: componentName,
      },
      breadcrumb
    );
  };

  if (!isNestedParentEquipment(parentItemName)) {
    return (
      <PageShell title="Invalid equipment">
        <p className="text-slate-600">This equipment does not have nested checklists.</p>
        <Link
          href={`/sites/${siteId}/departments/${deptId}/sections/${sectionId}`}
          className="mt-4 inline-block text-blue-600"
        >
          Go back
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={getNavBreadcrumbs({
        siteId,
        siteName: site?.name,
        departmentId: deptId,
        departmentName: department?.name,
        departmentSlug: department?.slug,
        section: section ? { id: sectionId, name: section.name } : undefined,
        current: parentItemName,
      })}
      title={parentItemName}
      subtitle="Select component to inspect"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {components.map((component) => (
          <Link
            key={component.id}
            href={getChecklistHref(component.id, component.name)}
            onClick={() => handleSelect(component.id, component.name)}
            className="block w-full text-left"
          >
            <SelectionCard
              title={component.name}
              subtitle={`${getNestedComponentDetailedCount(parentItemName, component.name)} detailed checks`}
              icon={<ClipboardList className="h-6 w-6" />}
            />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

export default function ManifoldPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </PageShell>
      }
    >
      <ManifoldPageContent />
    </Suspense>
  );
}
