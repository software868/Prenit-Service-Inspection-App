import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

const PENDANT_CHECKS = [
  "Gas Outlet Check",
  "Electrical Socket Check",
  "Pendant Up/Down Movement Check",
  "Brake Check",
  "Motor Check",
  "Data Socket RJ-45 (2 Nos)",
  "Gas supply",
] as const;

/** Top-level OT equipment selectable under each OT location */
export const OT_EQUIPMENT_LIST = [
  "Pendant",
  "X-Ray Viewer",
  "Scrub Sink",
  "OT Light Camera",
  "Surgeon Control Panel",
  "Medical Recorder",
  "Wall Panel & Ceiling Panel",
  "OT Table",
  "Sliding Door / Hermetically Sealed OT Door",
  "TUV / Theatre Vacuum Unit",
  "Storage Unit",
  "Hatch Box",
  "PACS Monitor",
  "PRD",
  "HEPA Filter",
  "DB Box",
  "Medical Gas Alarm",
  "View Window",
  "Wall Paneling",
  "Ceiling Paneling",
  "Laminar Air Flow System",
  "Internal HVAC ducting and exhaust system",
  "PVC Flooring",
  "Operating List Board",
  "Pendants for Anesthetist",
  "Peripheral Lighting and clean room luminaries",
  "Isolation Panel",
  "Monitor Status",
  "UPS",
] as const;

export type OtEquipmentName = (typeof OT_EQUIPMENT_LIST)[number];

/** Detailed inspection checks per OT equipment */
export const OT_DETAILED_CHECKLIST: Record<OtEquipmentName, readonly string[]> = {
  Pendant: [...PENDANT_CHECKS],
  "X-Ray Viewer": ["Dimming Check", "On/Off Check"],
  "Scrub Sink": [
    "Manifold / Foot Pedal Check",
    "Solenoid Valve Check",
    "Sensor Check",
    "Timer Check",
    "Power Supply Check",
    "Thermostatic mixing",
  ],
  "OT Light Camera": [
    "Light On/Off Check",
    "Dimming Check",
    "Endo Check",
    "Camera On/Off Check",
    "Camera Zooming Check",
    "Light Movement Check (Up/Down, Tilt)",
    "Controls at light head",
    "All LEDs working status",
  ],
  "Surgeon Control Panel": [
    "HEPA Filter Status",
    "Real-Time Clock",
    "Anesthesia Countdown Check",
    "PPL On/Off",
    "PPL Dimming",
    "Medical Gas Status",
    "Differential Pressure Check",
    "Temperature Status",
    "Humidity Status",
    "BMS Control (0 to 10 Volt)",
    "Telephone Working Check",
    "Left Time Check",
    "Display Working",
  ],
  "Medical Recorder": ["Recording System Working Check", "Touch Working Check"],
  "Wall Panel & Ceiling Panel": ["Finishing Check"],
  "OT Table": [
    "On/Off Check",
    "Control Check",
    "Position Check",
    "Brake Check",
    "Leg Gas Spring Check",
    "Head Gas Spring Check",
    "Manual Working Check",
    "Oil Leakage Check",
    "Pedal Check",
  ],
  "Sliding Door / Hermetically Sealed OT Door": [
    "Controller Check",
    "Door Open/Close Check",
    "Foot Switch Check",
    "Magic Switch Check",
    "Grid Roller Check",
    "Motor Pulley Check",
    "Belt Check",
    "Hermetic Seal Check",
    "Beam Sensor Check",
    "Runner Wheel Check",
    "Door Battery",
    "Door Hand Switch / Sensor working",
  ],
  "TUV / Theatre Vacuum Unit": [
    "Suction Section Check",
    "Change Over Switch Check",
    "Jar Kit Check",
    "Suction Pressure Check",
  ],
  "Storage Unit": ["Lock Check", "Glass Opening Smoothness Check"],
  "Hatch Box": [
    "Open/Close Check",
    "Magnetic Lock Check",
    "UV Lamp Check",
    "Normal Light Check",
  ],
  "PACS Monitor": ["Touch Working Check", "On/Off Check"],
  PRD: ["Flap Movement Check"],
  "HEPA Filter": ["Dirty or Clean Check", "Diffuser Cloth Check"],
  "DB Box": [
    "MCB Check",
    "Working Check",
    "Connector Check",
    "SMPS Check",
    "Dimmer Card Check",
    "Cooling Fan",
    "Wiring",
  ],
  "Medical Gas Alarm": ["Normal Condition Check", "Low Condition Check"],
  "View Window": ["Motorized Blind Check"],
  "Wall Paneling": ["Paint"],
  "Ceiling Paneling": ["Paint"],
  "Laminar Air Flow System": ["H-14 HEPA Filters", "Diffuser Sheet"],
  "Internal HVAC ducting and exhaust system": ["Return Air Grills"],
  "PVC Flooring": ["Finishing of flooring"],
  "Operating List Board": ["Working Check"],
  "Pendants for Anesthetist": [...PENDANT_CHECKS],
  "Peripheral Lighting and clean room luminaries": ["Finishing", "Dimming"],
  "Isolation Panel": ["Cooling Fan", "MCBs", "Temp Sensor"],
  "Monitor Status": ["Working Check"],
  UPS: ["Battery Status"],
};

export function isOtEquipmentName(name: string): name is OtEquipmentName {
  return name in OT_DETAILED_CHECKLIST;
}

export function getOtDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  if (!isOtEquipmentName(equipmentName)) {
    return [];
  }

  return OT_DETAILED_CHECKLIST[equipmentName].map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function getOtDetailedItemCount(equipmentName: string): number {
  if (!isOtEquipmentName(equipmentName)) return 0;
  return OT_DETAILED_CHECKLIST[equipmentName].length;
}
