import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

const PENDANT_EXCEL_CHECKS = [
  "Up / Down movement",
  "Braking",
  "Electrical switch and sockets",
  "Gas outlets",
  "Data Socket RJ-45 (2 Nos)",
  "Gas supply",
] as const;

/** MOT equipment from the shared Excel MOT sheet (all MOT files are identical). */
export const EXCEL_MOT_EQUIPMENT = [
  "Wall Paneling",
  "Ceiling Paneling",
  "Laminar Air Flow System",
  "Internal HVAC ducting and exhaust system",
  "PVC Flooring",
  "Hermetically Sealed Doors",
  "Touch Screen Control Panel",
  "Pressure Relief Dampers",
  "Operating List Board",
  "X-Ray View Box",
  "Scrub Sink",
  "Storage Unit",
  "Pendants for Anesthetist",
  "Pendants for Surgeon",
  "Peripheral Lighting and clean room luminaries",
  "Electrical Installation",
  "Isolation Panel",
  "OT light status",
  "OT light Camera Status",
  "Monitor Status",
  "HD Recorder status",
  "PACS Monitor",
  "UPS",
] as const;

export type ExcelMotEquipmentName = (typeof EXCEL_MOT_EQUIPMENT)[number];

export const EXCEL_MOT_DETAILED_CHECKLIST: Record<ExcelMotEquipmentName, readonly string[]> = {
  "Wall Paneling": ["Paint"],
  "Ceiling Paneling": ["Paint"],
  "Laminar Air Flow System": ["H-14 HEPA Filters", "Diffuser Sheet"],
  "Internal HVAC ducting and exhaust system": ["Return Air Grills"],
  "PVC Flooring": ["Finishing of flooring"],
  "Hermetically Sealed Doors": [
    "Door Functioning",
    "Door Sensors",
    "Door footswitch working",
    "Door Hand Switch / Sensor working",
    "Door Battery",
  ],
  "Touch Screen Control Panel": [
    "Display Working",
    "Medical Alarm with High, Low and Normal indicator",
    "Control for general lighting: ON/OFF and dimming control",
    "Digital room pressure indicator",
    "HEPA Filter differential pressure",
  ],
  "Pressure Relief Dampers": ["Working Check"],
  "Operating List Board": ["Working Check"],
  "X-Ray View Box": ["Dimming"],
  "Scrub Sink": ["Thermostatic mixing", "Infrared sensors", "Foot operation"],
  "Storage Unit": ["Working Check"],
  "Pendants for Anesthetist": [...PENDANT_EXCEL_CHECKS],
  "Pendants for Surgeon": [...PENDANT_EXCEL_CHECKS],
  "Peripheral Lighting and clean room luminaries": ["Finishing", "Dimming"],
  "Electrical Installation": ["Main DB", "Cooling Fan", "MCBs", "Wiring"],
  "Isolation Panel": ["Cooling Fan", "MCBs", "Temp Sensor"],
  "OT light status": ["Controls at light head", "Dimming", "All LEDs working status"],
  "OT light Camera Status": ["Working Check"],
  "Monitor Status": ["Working Check"],
  "HD Recorder status": ["Working Check"],
  "PACS Monitor": ["Working Check"],
  UPS: ["Battery Status"],
};

export function isExcelMotEquipment(name: string): name is ExcelMotEquipmentName {
  return name in EXCEL_MOT_DETAILED_CHECKLIST;
}

export function getExcelMotDetailedItemCount(equipmentName: string): number {
  if (!isExcelMotEquipment(equipmentName)) return 0;
  return EXCEL_MOT_DETAILED_CHECKLIST[equipmentName].length;
}

export function getExcelMotDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  if (!isExcelMotEquipment(equipmentName)) return [];
  return EXCEL_MOT_DETAILED_CHECKLIST[equipmentName].map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}
