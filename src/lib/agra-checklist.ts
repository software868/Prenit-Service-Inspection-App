import { EXCEL_MOT_DETAILED_CHECKLIST } from "./excel-mot-checklist";

export const AGRA_OT_COUNT = 5;

export {
  EXCEL_MOT_DETAILED_CHECKLIST as AGRA_MOT_DETAILED_CHECKLIST,
  EXCEL_MOT_EQUIPMENT as AGRA_MOT_EQUIPMENT,
  EXCEL_MOT_SECTIONS as AGRA_MOT_SECTIONS,
  getExcelMotDetailedChecklistItems as getAgraMotDetailedChecklistItems,
  getExcelMotDetailedItemCount as getAgraMotDetailedItemCount,
  getExcelMotHeading as getAgraMotHeading,
  letteredChecklistItems,
  letteredLabel,
} from "./excel-mot-checklist";

export function isAgraSite(slug?: string | null, name?: string | null) {
  return slug === "agra" || name === "Agra";
}

export function getAgraMotChecks(name: string): readonly string[] {
  return EXCEL_MOT_DETAILED_CHECKLIST[name] || [];
}
