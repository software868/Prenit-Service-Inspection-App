import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const HVAC_DETAILED_EQUIPMENT = [
  "Compressor",
  "Cooling Coil",
  "Cassette Unit",
  "AHU",
  "Pre Filter",
] as const;

export type HvacDetailedEquipmentName = (typeof HVAC_DETAILED_EQUIPMENT)[number];

export const HVAC_DETAILED_CHECKLIST: Record<
  HvacDetailedEquipmentName,
  readonly string[]
> = {
  Compressor: ["Working Check", "Filter Check"],
  "Cooling Coil": ["Working Check", "Filter Check"],
  "Cassette Unit": ["Working Check", "Filter Check"],
  AHU: ["Working Check", "Filter Check"],
  "Pre Filter": ["Filter Check", "Working Check"],
};

export function isHvacDetailedEquipment(
  name: string
): name is HvacDetailedEquipmentName {
  return name in HVAC_DETAILED_CHECKLIST;
}

export function getHvacDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  if (!isHvacDetailedEquipment(equipmentName)) {
    return [];
  }

  return HVAC_DETAILED_CHECKLIST[equipmentName].map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function getHvacDetailedItemCount(equipmentName: string): number {
  if (!isHvacDetailedEquipment(equipmentName)) return 0;
  return HVAC_DETAILED_CHECKLIST[equipmentName].length;
}
