import {
  getNestedComponentDetailedItems,
  isNestedParentEquipment,
} from "./nested-equipment-checklist";
import { getOtDetailedChecklistItems } from "./ot-detailed-checklist";
import { getElectricalDetailedChecklistItems } from "./electrical-detailed-checklist";
import { getHvacDetailedChecklistItems } from "./hvac-detailed-checklist";
import { getMgpsSiteDetailedChecklistItems } from "./mgps-site-checklist";
import {
  getMgpsDetailedChecklistItems,
  getMotDetailedChecklistItems,
  usesExcelChecklists,
} from "./site-checklists";
import type { ChecklistItemResponse, SelectionPath } from "./types";

type EquipmentItem = {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
};

function mergeDetailedChildren(
  children: { id: string; name: string }[] | undefined,
  codeItems: ChecklistItemResponse[]
): ChecklistItemResponse[] | null {
  if (!codeItems.length && !children?.length) return null;
  if (!codeItems.length) {
    return (children || []).map((child) => ({
      checklistItemId: child.id,
      name: child.name,
      status: null,
      remarks: "",
    }));
  }

  const byName = new Map((children || []).map((child) => [child.name, child]));
  return codeItems.map((item) => {
    const existing = byName.get(item.name);
    return existing
      ? {
          checklistItemId: existing.id,
          name: existing.name,
          status: null,
          remarks: "",
        }
      : item;
  });
}

function isExcelSelection(selection: SelectionPath) {
  return usesExcelChecklists(selection.siteSlug, selection.siteName);
}

function getExcelDetailedItems(selection: SelectionPath): ChecklistItemResponse[] {
  if (!selection.checklistItemId || !selection.checklistItemName) return [];

  if (selection.locationId) {
    return getMotDetailedChecklistItems(
      selection.checklistItemId,
      selection.checklistItemName,
      selection.siteSlug,
      selection.siteName
    );
  }

  return getMgpsDetailedChecklistItems(
    selection.checklistItemId,
    selection.checklistItemName,
    selection.siteSlug,
    selection.departmentSlug,
    selection.siteName,
    selection.departmentName
  );
}

export function resolveChecklistItems(
  activeSelection: SelectionPath,
  equipment?: { checklistItems: EquipmentItem[] }
): ChecklistItemResponse[] {
  const excel = isExcelSelection(activeSelection);

  if (
    !excel &&
    activeSelection.parentChecklistItemName &&
    isNestedParentEquipment(activeSelection.parentChecklistItemName) &&
    activeSelection.checklistItemId &&
    activeSelection.checklistItemName
  ) {
    const detailed = getNestedComponentDetailedItems(
      activeSelection.parentChecklistItemName,
      activeSelection.checklistItemId,
      activeSelection.checklistItemName
    );
    if (detailed.length > 0) return detailed;
  }

  if (!equipment) {
    if (excel) {
      return getExcelDetailedItems(activeSelection);
    }

    if (activeSelection.locationId && activeSelection.checklistItemId && activeSelection.checklistItemName) {
      return getOtDetailedChecklistItems(
        activeSelection.checklistItemId,
        activeSelection.checklistItemName
      );
    }
    if (activeSelection.checklistItemId && activeSelection.checklistItemName) {
      const electricalDetailed = getElectricalDetailedChecklistItems(
        activeSelection.checklistItemId,
        activeSelection.checklistItemName
      );
      if (electricalDetailed.length > 0) return electricalDetailed;

      const hvacDetailed = getHvacDetailedChecklistItems(
        activeSelection.checklistItemId,
        activeSelection.checklistItemName
      );
      if (hvacDetailed.length > 0) return hvacDetailed;

      const mgpsSiteDetailed = getMgpsSiteDetailedChecklistItems(
        activeSelection.checklistItemId,
        activeSelection.checklistItemName
      );
      if (mgpsSiteDetailed.length > 0) return mgpsSiteDetailed;
    }
    return [];
  }

  if (activeSelection.checklistItemId && activeSelection.checklistItemName) {
    const parentItem = equipment.checklistItems.find(
      (item) => item.id === activeSelection.checklistItemId
    );

    const codeItems = excel
      ? getExcelDetailedItems(activeSelection)
      : activeSelection.locationId
        ? getOtDetailedChecklistItems(
            activeSelection.checklistItemId,
            activeSelection.checklistItemName
          )
        : getElectricalDetailedChecklistItems(
            activeSelection.checklistItemId,
            activeSelection.checklistItemName
          ).concat(
            getHvacDetailedChecklistItems(
              activeSelection.checklistItemId,
              activeSelection.checklistItemName
            ),
            getMgpsSiteDetailedChecklistItems(
              activeSelection.checklistItemId,
              activeSelection.checklistItemName
            )
          );

    const merged = mergeDetailedChildren(parentItem?.children, codeItems);
    if (merged?.length) return merged;

    if (excel) {
      const excelDetailed = getExcelDetailedItems(activeSelection);
      if (excelDetailed.length > 0) return excelDetailed;
    }

    if (activeSelection.locationId) {
      const otDetailed = getOtDetailedChecklistItems(
        activeSelection.checklistItemId,
        activeSelection.checklistItemName
      );
      if (otDetailed.length > 0) return otDetailed;
    }

    const electricalDetailed = getElectricalDetailedChecklistItems(
      activeSelection.checklistItemId,
      activeSelection.checklistItemName
    );
    if (electricalDetailed.length > 0) return electricalDetailed;

    const hvacDetailed = getHvacDetailedChecklistItems(
      activeSelection.checklistItemId,
      activeSelection.checklistItemName
    );
    if (hvacDetailed.length > 0) return hvacDetailed;

    const mgpsSiteDetailed = getMgpsSiteDetailedChecklistItems(
      activeSelection.checklistItemId,
      activeSelection.checklistItemName
    );
    if (mgpsSiteDetailed.length > 0) return mgpsSiteDetailed;

    const match = equipment.checklistItems.find(
      (item) => item.id === activeSelection.checklistItemId
    );
    if (match) {
      return [
        {
          checklistItemId: match.id,
          name: match.name,
          status: null,
          remarks: "",
        },
      ];
    }
  }

  return equipment.checklistItems.map((item) => ({
    checklistItemId: item.id,
    name: item.name,
    status: null,
    remarks: "",
  }));
}
