import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const MGPS_NESTED_EQUIPMENT = [
  "Oxygen Manifold with Control Panel",
  "N2O Manifold with Control Panel",
  "CO2 Manifold with Control Panel",
  "Medical Air Compressor & Dryer",
  "Medical Vacuum",
  "AGSS",
] as const;

export const MGPS_SITE_EQUIPMENT = [
  "Plant Room",
  "Master Alarm",
  "Testing Points",
  "Signage and Color coding",
  "Trench & Riser",
  "Isolation Valve",
  "Area Alarm",
  "Valve Box",
  "Outlet Points inside Room",
  "Bed Head Panels",
] as const;

export const MGPS_ALL_EQUIPMENT = [
  ...MGPS_NESTED_EQUIPMENT,
  ...MGPS_SITE_EQUIPMENT,
] as const;

export type MgpsSiteEquipmentName = (typeof MGPS_SITE_EQUIPMENT)[number];

export const MGPS_SITE_DETAILED_CHECKLIST: Record<
  MgpsSiteEquipmentName,
  readonly string[]
> = {
  "Plant Room": ["Leakage testing"],
  "Master Alarm": [
    "Master Alarm configuration",
    "Volume of alarm beep should be listenable",
    "Door fixed properly",
    "Connected with internet",
    "Connected with switch box",
    "Connected with all area alarms",
  ],
  "Testing Points": [
    "Outlets fixed at proper height",
    "Isolation valves fixed at proper height",
  ],
  "Signage and Color coding": [
    "Red caution line on floor for all equipment",
    "No smoking / No naked flame",
    "Do's and Don'ts",
    "Do not obstruct label on exhaust pipes",
    "Signage for all equipment",
  ],
  "Trench & Riser": [
    "Saddles firmly fixed",
    "Colour coding and arrow stickers on copper pipe / main line",
    "Sleeves where pipe crosses or touches floor / wall",
    "Painting as per HTM 02-01",
  ],
  "Isolation Valve": [
    "Position as per as-built drawing",
    "Floor isolation valves above ceiling indicated on trap door",
    "Trap door provided",
  ],
  "Area Alarm": [
    "Alarm fixed properly",
    "Wiring under conduit or batten",
    "Pressure switch connected and configured",
    "Alarm pressure switch above ceiling indicated on trap door / false ceiling",
    "Naming of area served indicated",
  ],
  "Valve Box": [
    "Valve box installed properly",
    "Colour coding on drops with arrow stickers",
    "Colour coding inside valve box before valve",
    "Gap closed at false ceiling where copper pipe drops come through",
    "Flow direction indication stickers fixed",
    "Service specific stickers on the valve box",
    "Area and departments served indicated",
    "Valves working properly",
    "NIST installed",
    "Vacuum NIST cover provided",
    "Saddles fixed firmly",
    "Valve box height as per standard",
    "Naming of area served indicated",
  ],
  "Outlet Points inside Room": [
    "Proper flushing done before use",
    "Outlets fixed with proper covers and probes",
    "Down drops straight and proper",
    "Proper gap between copper pipes and other services with sleeves",
    "Color coding with arrow stickers",
    "Cross connection testing",
    "Signage with flow direction",
    "Leakage check",
  ],
  "Bed Head Panels": [
    "Firmly fixed and height maintained",
    "All openings covered",
    "Down drops straight with proper saddling",
    "Color coding as per standard",
    "Cross connection testing",
    "Signage with flow direction and color code",
    "Leakage check",
    "All accessories installed",
  ],
};

export function isMgpsSiteEquipment(name: string): name is MgpsSiteEquipmentName {
  return name in MGPS_SITE_DETAILED_CHECKLIST;
}

export function getMgpsSiteDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string
): ChecklistItemResponse[] {
  if (!isMgpsSiteEquipment(equipmentName)) {
    return [];
  }

  return MGPS_SITE_DETAILED_CHECKLIST[equipmentName].map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function getMgpsSiteDetailedItemCount(equipmentName: string): number {
  if (!isMgpsSiteEquipment(equipmentName)) return 0;
  return MGPS_SITE_DETAILED_CHECKLIST[equipmentName].length;
}
