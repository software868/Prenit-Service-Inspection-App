import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const ELECTRICAL_DETAILED_EQUIPMENT = [
  "Electrical Panel",
  "Tube Light",
  "PPL",
] as const;

export type ElectricalDetailedEquipmentName =
  (typeof ELECTRICAL_DETAILED_EQUIPMENT)[number];

export const ELECTRICAL_DETAILED_CHECKLIST: Record<
  ElectricalDetailedEquipmentName,
  readonly string[]
> = {
  "Electrical Panel": ["MCB Check", "Contactor Check", "Wiring Check"],
  "Tube Light": ["On/Off Check", "Switch Socket Check"],
  PPL: ["Working Check", "On/Off Check", "Dimming Check"],
};

export function isElectricalDetailedEquipment(
  name: string
): name is ElectricalDetailedEquipmentName {
  return name in ELECTRICAL_DETAILED_CHECKLIST;
}

export function getElectricalDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  if (!isElectricalDetailedEquipment(equipmentName)) {
    return [];
  }

  return ELECTRICAL_DETAILED_CHECKLIST[equipmentName].map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function getElectricalDetailedItemCount(equipmentName: string): number {
  if (!isElectricalDetailedEquipment(equipmentName)) return 0;
  return ELECTRICAL_DETAILED_CHECKLIST[equipmentName].length;
}
