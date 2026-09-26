import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export function letteredLabel(index: number, name: string) {
  return `${String.fromCharCode(97 + index)}. ${name}`;
}

export function letteredChecklistItems(items: ChecklistItemResponse[]): ChecklistItemResponse[] {
  return items.map((item, index) => ({
    ...item,
    name: /^\s*(?:[a-z]|\d+)\.\s/i.test(item.name) ? item.name : letteredLabel(index, item.name),
  }));
}

const PENDANT_EXCEL_CHECKS = [
  "Up & Down Movement",
  "Braking",
  "Electrical switch & Sockets",
  "Gas outlets",
  "Data Socket RJ-45-2 Nos",
  "Gas supply",
] as const;

/** Shared MOT Excel: numbered heading, only lettered points are checked. */
export const EXCEL_MOT_SECTIONS = [
  { no: 1, name: "Wall Paneling", checks: ["Paint"] },
  { no: 2, name: "Ceiling Paneling", checks: ["Paint"] },
  { no: 3, name: "Laminar Air Flow System", checks: ["H-14 HEPA Filters", "Diffuser Sheet"] },
  { no: 4, name: "Internal HVAC ducting and exhaust system", checks: ["Return Air Grills"] },
  { no: 5, name: "PVC Flooring", checks: ["Finishing of flooring"] },
  {
    no: 6,
    name: "Hermetically Sealed Doors",
    checks: [
      "Door Functioning",
      "Door Sensors",
      "Door footswitch working",
      "Door Hand Switch / Sensor working",
      "Door Battery",
    ],
  },
  {
    no: 7,
    name: "Touch Screen Control Panel",
    checks: [
      "Display Working",
      "Medical Alarm with High, Low and Normal indicator",
      "Control for general lighting: ON/OFF and dimming control",
      "Digital room pressure indicator",
      "HEPA Filter differential pressure",
    ],
  },
  { no: 8, name: "Pressure Relief Dampers", checks: [] },
  { no: 9, name: "Operating List Board", checks: [] },
  { no: 10, name: "X-Ray View Box", checks: ["Dimming"] },
  { no: 11, name: "Scrub Sink", checks: ["Thermostatic mixing", "Infrared sensors", "Foot operation"] },
  { no: 12, name: "Storage Unit", checks: [] },
  { no: 13, name: "Pendants for Anesthetist", checks: [...PENDANT_EXCEL_CHECKS] },
  { no: 14, name: "Pendants for Surgeon", checks: [...PENDANT_EXCEL_CHECKS] },
  { no: 15, name: "Peripheral Lighting and clean room luminaries", checks: ["Finishing", "Dimming"] },
  { no: 16, name: "Electrical Installation", checks: ["Main DB", "Cooling Fan", "MCBs", "Wiring"] },
  { no: 17, name: "Isolation Panel", checks: ["Cooling Fan", "MCBs", "Temp Sensor"] },
  { no: 18, name: "OT light status", checks: ["Controls at light head", "Dimming", "All LEDs working status"] },
  { no: 19, name: "OT light Camera Status", checks: [] },
  { no: 20, name: "Monitor Status", checks: [] },
  { no: 21, name: "HD Recorder status", checks: [] },
  { no: 22, name: "PACS Monitor", checks: [] },
  { no: 23, name: "UPS", checks: ["Battery Status"] },
] as const;

export const EXCEL_MOT_EQUIPMENT = EXCEL_MOT_SECTIONS.map((section) => section.name);

export type ExcelMotEquipmentName = (typeof EXCEL_MOT_EQUIPMENT)[number];

export const EXCEL_MOT_DETAILED_CHECKLIST: Record<string, readonly string[]> = Object.fromEntries(
  EXCEL_MOT_SECTIONS.map((section) => [section.name, section.checks])
);

export function getExcelMotHeading(name: string) {
  const section = EXCEL_MOT_SECTIONS.find((item) => item.name === name);
  return section ? `${section.no}. ${section.name}` : name;
}

export function isExcelMotEquipment(name: string): name is ExcelMotEquipmentName {
  return name in EXCEL_MOT_DETAILED_CHECKLIST;
}

export function getExcelMotDetailedItemCount(equipmentName: string): number {
  const checks = EXCEL_MOT_DETAILED_CHECKLIST[equipmentName];
  if (!checks) return 0;
  return checks.length || 1;
}

export function getExcelMotDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  const checks = EXCEL_MOT_DETAILED_CHECKLIST[equipmentName];
  if (!checks) return [];
  if (checks.length === 0) {
    return [
      {
        checklistItemId: `${parentItemId}--heading`,
        name: getExcelMotHeading(equipmentName),
        status: null,
        remarks: "",
      },
    ];
  }
  return checks.map((name, index) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name: letteredLabel(index, name),
    status: null,
    remarks: "",
  }));
}
