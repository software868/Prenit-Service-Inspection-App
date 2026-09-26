"use client";

import { SectionInlineInspection } from "@/components/checklist/section-inline-inspection";
import { PageShell } from "@/components/layout/app-shell";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  findDepartment,
  findSection,
  findSite,
  useHierarchy,
} from "@/hooks/use-hierarchy";
import { buildChecklistUrl } from "@/lib/checklist-navigation";
import {
  getNestedComponentCount,
  isNestedParentEquipment,
} from "@/lib/nested-equipment-checklist";
import {
  getElectricalDetailedChecklistItems,
  getElectricalDetailedItemCount,
} from "@/lib/electrical-detailed-checklist";
import { getHvacDetailedItemCount } from "@/lib/hvac-detailed-checklist";
import { mergeNamedCatalog } from "@/lib/hierarchy-utils";
import { getExcelMgpsHeading } from "@/lib/excel-mgps-checklist";
import { getInspectionBreadcrumb, getNavBreadcrumbs } from "@/lib/extra-sites";
import {
  getMgpsDetailedItemCount,
  getMgpsEquipmentNames,
  getMotEquipmentNames,
  usesExcelChecklists,
} from "@/lib/site-checklists";
import type { ChecklistItemResponse } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useInspectionStore } from "@/store/inspection-store";
import { ClipboardList, DoorOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function SectionPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const sectionId = params.sectionId as string;
  const { data } = useHierarchy();
  const { engineerName, setSelection } = useInspectionStore();

  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const section = findSection(data, siteId, deptId, sectionId);

  const hasLocations = (section?.locations.length || 0) > 0;
  const excelSite = usesExcelChecklists(site?.slug, site?.name);

  const sectionEquipment = useMemo(() => {
    const equipment = section?.equipment.filter((e) => !e.locationId) || [];
    return equipment[0] ?? null;
  }, [section?.equipment]);

  const checklistItems = useMemo(() => {
    const existing = [...(sectionEquipment?.checklistItems || [])].sort(
      (a, b) => a.order - b.order
    );
    if (section?.name !== "MGPS") return existing;
    return mergeNamedCatalog(
      existing,
      getMgpsEquipmentNames(site?.slug, department?.slug, site?.name, department?.name),
      (name, index) => ({
        id: `${sectionEquipment?.id || "mgps"}--${slugify(name)}`,
        name,
        slug: slugify(name),
        order: index + 1,
      })
    );
  }, [department?.name, department?.slug, section?.name, sectionEquipment, site?.name, site?.slug]);

  const getItemHref = (checklistItemId: string, checklistItemName: string) => {
    if (
      !usesExcelChecklists(site?.slug, site?.name) &&
      isNestedParentEquipment(checklistItemName)
    ) {
      return `/sites/${siteId}/departments/${deptId}/sections/${sectionId}/manifold/${checklistItemId}?name=${encodeURIComponent(checklistItemName)}`;
    }
    return getChecklistHref(checklistItemId, checklistItemName);
  };

  const getEquipmentTitle = (name: string) =>
    excelSite && section?.name === "MGPS"
      ? getExcelMgpsHeading(name, department?.slug, department?.name)
      : name;

  const getChecklistHref = (checklistItemId: string, checklistItemName: string) => {
    if (!site || !department || !section || !sectionEquipment) return "#";

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, getEquipmentTitle(checklistItemName)],
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
      checklistItemId,
      checklistItemName,
    };

    return buildChecklistUrl(path, breadcrumb, engineerName);
  };

  const handleSelect = (checklistItemId: string, checklistItemName: string) => {
    if (!site || !department || !section || !sectionEquipment) return;

    const breadcrumb = getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, getEquipmentTitle(checklistItemName)],
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
        checklistItemId,
        checklistItemName,
      },
      breadcrumb
    );
  };

  const isElectricalSection = section?.name === "Electrical Section";

  const electricalGroups = useMemo(() => {
    if (!isElectricalSection) return [];
    return checklistItems.map((item) => {
      const detailed = getElectricalDetailedChecklistItems(item.id, item.name);
      const items: ChecklistItemResponse[] =
        detailed.length > 0
          ? detailed
          : [
              {
                checklistItemId: item.id,
                name: item.name,
                status: null,
                remarks: "",
              },
            ];
      return { equipmentId: item.id, equipmentName: item.name, items };
    });
  }, [checklistItems, isElectricalSection]);

  const electricalSelection = useMemo(() => {
    if (!site || !department || !section || !sectionEquipment) return null;
    return {
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
    };
  }, [site, department, section, sectionEquipment, siteId, deptId, sectionId]);

  const electricalBreadcrumb = useMemo(() => {
    if (!site || !department || !section) return "";
    return getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name],
    });
  }, [site, department, section]);

  if (isElectricalSection && electricalSelection && electricalGroups.length > 0) {
    return (
      <SectionInlineInspection
        title="Electrical Inspection"
        breadcrumbs={getNavBreadcrumbs({
          siteId,
          siteName: site?.name,
          departmentId: deptId,
          departmentName: department?.name,
          departmentSlug: department?.slug,
          current: section?.name || "Electrical Section",
        })}
        breadcrumb={electricalBreadcrumb}
        selection={electricalSelection}
        groups={electricalGroups}
        initKey={`${sectionId}:${electricalSelection.equipmentId}:${electricalGroups.length}`}
      />
    );
  }

  const getDetailedItemCount = (name: string) =>
    getElectricalDetailedItemCount(name) ||
    getHvacDetailedItemCount(name) ||
    getMgpsDetailedItemCount(name, site?.slug, department?.slug, site?.name, department?.name);

  const getOtEquipmentCount = () => getMotEquipmentNames(site?.slug, site?.name).length;

  return (
    <PageShell
      breadcrumbs={getNavBreadcrumbs({
        siteId,
        siteName: site?.name,
        departmentId: deptId,
        departmentName: department?.name,
        departmentSlug: department?.slug,
        current: section?.name || "Section",
      })}
      title={hasLocations ? "Select OT" : "Select Equipment"}
      subtitle={
        hasLocations
          ? "Choose the operation theatre number"
          : "Select equipment to inspect"
      }
    >
      {hasLocations ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {section?.locations.map((location) => (
            <SelectionCard
              key={location.id}
              title={location.name}
              subtitle={`${getOtEquipmentCount()} equipment items to inspect`}
              href={`/sites/${siteId}/departments/${deptId}/sections/${sectionId}/locations/${location.id}`}
              icon={<DoorOpen className="h-6 w-6" />}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {checklistItems.map((item) => (
            <Link
              key={item.id}
              href={getItemHref(item.id, item.name)}
              onClick={() => handleSelect(item.id, item.name)}
              className="block w-full text-left"
            >
              <SelectionCard
                title={getEquipmentTitle(item.name)}
                subtitle={
                  !excelSite && isNestedParentEquipment(item.name)
                    ? `${getNestedComponentCount(item.name)} components to inspect`
                    : getDetailedItemCount(item.name) > 0
                      ? `${getDetailedItemCount(item.name)} detailed checks`
                      : `Inspect ${item.name}`
                }
                icon={<ClipboardList className="h-6 w-6" />}
              />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
