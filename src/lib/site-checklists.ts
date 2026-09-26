import {
  EXCEL_MOT_DETAILED_CHECKLIST,
  EXCEL_MOT_EQUIPMENT,
  getExcelMotDetailedChecklistItems,
  getExcelMotDetailedItemCount,
  letteredChecklistItems,
} from "./excel-mot-checklist";
import {
  getExcelMgpsCatalog,
  getExcelMgpsDetailedChecklistItems,
  getExcelMgpsDetailedItemCount,
} from "./excel-mgps-checklist";
import { isKanpurSite } from "./extra-sites";
import {
  MGPS_ALL_EQUIPMENT,
  MGPS_SITE_DETAILED_CHECKLIST,
  getMgpsSiteDetailedChecklistItems,
  getMgpsSiteDetailedItemCount,
} from "./mgps-site-checklist";
import {
  OT_DETAILED_CHECKLIST,
  OT_EQUIPMENT_LIST,
  getOtDetailedChecklistItems,
  getOtDetailedItemCount,
} from "./ot-detailed-checklist";

export function usesExcelChecklists(siteSlug?: string | null, siteName?: string | null) {
  if (isKanpurSite(siteSlug) || siteName === "Kanpur") return false;
  return Boolean(siteSlug) || Boolean(siteName);
}

export function getMotEquipmentNames(
  siteSlug?: string | null,
  siteName?: string | null
): readonly string[] {
  return usesExcelChecklists(siteSlug, siteName) ? EXCEL_MOT_EQUIPMENT : OT_EQUIPMENT_LIST;
}

export function getMotDetailedChecks(
  equipmentName: string,
  siteSlug?: string | null,
  siteName?: string | null
): readonly string[] {
  if (usesExcelChecklists(siteSlug, siteName)) {
    return EXCEL_MOT_DETAILED_CHECKLIST[equipmentName as keyof typeof EXCEL_MOT_DETAILED_CHECKLIST] || [];
  }
  return OT_DETAILED_CHECKLIST[equipmentName as keyof typeof OT_DETAILED_CHECKLIST] || [];
}

export function getMotDetailedItemCount(
  equipmentName: string,
  siteSlug?: string | null,
  siteName?: string | null
) {
  return usesExcelChecklists(siteSlug, siteName)
    ? getExcelMotDetailedItemCount(equipmentName)
    : getOtDetailedItemCount(equipmentName);
}

export function getMotDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string,
  siteSlug?: string | null,
  siteName?: string | null
) {
  return usesExcelChecklists(siteSlug, siteName)
    ? getExcelMotDetailedChecklistItems(parentItemId, equipmentName)
    : getOtDetailedChecklistItems(parentItemId, equipmentName);
}

export function getMgpsEquipmentNames(
  siteSlug?: string | null,
  departmentSlug?: string | null,
  siteName?: string | null,
  departmentName?: string | null
): readonly string[] {
  if (usesExcelChecklists(siteSlug, siteName)) {
    return getExcelMgpsCatalog(departmentSlug, departmentName).names;
  }
  return MGPS_ALL_EQUIPMENT;
}

export function getMgpsDetailedChecks(
  equipmentName: string,
  siteSlug?: string | null,
  departmentSlug?: string | null,
  siteName?: string | null,
  departmentName?: string | null
): readonly string[] {
  if (usesExcelChecklists(siteSlug, siteName)) {
    return getExcelMgpsCatalog(departmentSlug, departmentName).detailed[equipmentName] || [];
  }
  return MGPS_SITE_DETAILED_CHECKLIST[equipmentName as keyof typeof MGPS_SITE_DETAILED_CHECKLIST] || [];
}

export function getMgpsDetailedItemCount(
  equipmentName: string,
  siteSlug?: string | null,
  departmentSlug?: string | null,
  siteName?: string | null,
  departmentName?: string | null
) {
  return usesExcelChecklists(siteSlug, siteName)
    ? getExcelMgpsDetailedItemCount(equipmentName, departmentSlug, departmentName)
    : getMgpsSiteDetailedItemCount(equipmentName);
}

export function getMgpsDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string,
  siteSlug?: string | null,
  departmentSlug?: string | null,
  siteName?: string | null,
  departmentName?: string | null
) {
  const items = usesExcelChecklists(siteSlug, siteName)
    ? getExcelMgpsDetailedChecklistItems(
        parentItemId,
        equipmentName,
        departmentSlug,
        departmentName
      )
    : getMgpsSiteDetailedChecklistItems(parentItemId, equipmentName);
  return usesExcelChecklists(siteSlug, siteName) ? letteredChecklistItems(items) : items;
}
