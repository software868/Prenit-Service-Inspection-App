import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

const OXYGEN_STANDARD = [
  "Ramp / manifold connections tightness",
  "Pigtail pipes connected properly",
  "Middle frame and chain fixed",
  "Emergency manifold signage (Oxygen Control Panel)",
  "Cylinders fixed properly",
  "Auto change over working",
  "Gauges showing proper pressure",
  "Pressure regulators working",
  "Safety valves fixed",
  "Flow direction and colour code arrows",
] as const;

const NITROUS_STANDARD = [
  "Ramp / manifold connections tightness",
  "Pigtail pipes connected properly",
  "Middle frame and chain fixed",
  "Emergency manifold signage (right bank / left bank)",
  "Cylinders fixed properly",
  "Auto change over working",
  "Gauges showing proper pressure",
  "Pressure regulators working",
  "Mainline valve at reachable height",
  "Nitrous oxide heater installed",
  "Flow direction and colour code arrows",
] as const;

const COMPRESSED_AIR_STANDARD = [
  "Anti-vibration pads installed",
  "Compressor stacks fixed with fasteners",
  "Auto start/stop (7.1 to 8.3 bar)",
  "Leakage up to reducing station",
  "After cooler start/stop automatically",
  "Auto drain valves working",
  "Drain line outside plant for tank and dryer",
  "Dew point monitor working on dryer",
  "One dryer running, other in standby",
  "Danger Hot Line sign",
  "Auto start/stop warning label",
  "Flow direction arrows on each line",
  "Master alarm connection from compressor panel",
] as const;

const VACUUM_STANDARD = [
  "Anti-vibration pads installed",
  "Vacuum pump stack fixed with fasteners",
  "Auto start/stop (560 to 650 mmHg)",
  "Tank sensor wiring to control panel",
  "Filters and trap bottles installed",
  "Exhaust line with Do not obstruct signage",
  "Proper ventilation available",
  "Signage for vacuum pump and tank",
  "Auto start/stop warning label",
  "Flow direction arrows on each line",
  "Master alarm connection from vacuum panel",
] as const;

const AGSS_STANDARD = [
  "Remote switch outside OT working on auto",
  "Filters fixed firmly",
  "Exhaust line with Do not obstruct signage",
  "Proper ventilation available",
  "Signage for AGS system",
  "Flow direction arrows (minimum 3m)",
  "Master alarm connection from AGS panel",
] as const;

const MASTER_ALARM = [
  "Master Alarm configuration",
  "Volume of alarm beep should be listenable",
  "Door fixed properly",
  "Connected with internet",
  "Connected with switch box",
  "Connected with all area alarms",
] as const;

const TESTING_POINTS = [
  "Outlets fixed at proper height",
  "Isolation valves fixed at proper height",
] as const;

const SIGNAGE = [
  "Red caution line on floor for all equipment",
  "No smoking / No naked flame",
  "Do's and Don'ts",
  "Do not obstruct label on exhaust pipes",
  "Signage for all equipment",
] as const;

const TRENCH = [
  "Saddles firmly fixed",
  "Colour coding and arrow stickers on copper pipe / main line",
  "Sleeves where pipe crosses or touches floor / wall",
  "Painting as per HTM 02-01",
] as const;

const ISOLATION_VALVE = [
  "Position as per as-built drawing",
  "Floor isolation valves above ceiling indicated on trap door",
  "Trap door provided",
] as const;

const AREA_ALARM = [
  "Alarm fixed properly",
  "Wiring under conduit or batten",
  "Pressure switch connected and configured",
  "Alarm pressure switch above ceiling indicated on trap door / false ceiling",
  "Naming of area served indicated",
] as const;

const VALVE_BOX = [
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
] as const;

const OUTLET_POINTS = [
  "Proper flushing done before use",
  "Outlets fixed with proper covers and probes",
  "Down drops straight and proper",
  "Proper gap between copper pipes and other services with sleeves",
  "Color coding with arrow stickers",
  "Cross connection testing",
  "Signage with flow direction",
  "Leakage check",
] as const;

const BED_HEAD = [
  "Firmly fixed and height maintained",
  "All openings covered",
  "Down drops straight with proper saddling",
  "Color coding as per standard",
  "Cross connection testing",
  "Signage with flow direction and color code",
  "Leakage check",
  "All accessories installed",
] as const;

/** Shared MGPS Excel sheet used by almost every city. */
export const EXCEL_MGPS_DETAILED_CHECKLIST: Record<string, readonly string[]> = {
  "Plant Room": ["Leakage testing"],
  "Oxygen System": [...OXYGEN_STANDARD],
  "Nitrous Oxide System": [...NITROUS_STANDARD],
  "Compressed Air System": [...COMPRESSED_AIR_STANDARD],
  "Vacuum System": [...VACUUM_STANDARD],
  "AGSS System": [...AGSS_STANDARD],
  "Master Alarm": [...MASTER_ALARM],
  "Testing Points": [...TESTING_POINTS],
  "Signage and Color coding": [...SIGNAGE],
  "Trench & Riser": [...TRENCH],
  "Isolation Valve": [...ISOLATION_VALVE],
  "Area Alarm": [...AREA_ALARM],
  "Valve Box": [...VALVE_BOX],
  "Outlet Points inside Room": [...OUTLET_POINTS],
  "Bed Head Panels": [...BED_HEAD],
};

/** NMCH Kota MGPS Excel has no AGSS section. */
export const NMCH_KOTA_MGPS_DETAILED_CHECKLIST: Record<string, readonly string[]> = {
  "Plant Room": ["Leakage testing"],
  "Oxygen System": [...OXYGEN_STANDARD],
  "Nitrous Oxide System": [...NITROUS_STANDARD],
  "Compressed Air System (Anesthesia)": [...COMPRESSED_AIR_STANDARD],
  "Vacuum System (Anesthesia)": [...VACUUM_STANDARD],
  "Master Alarm": [...MASTER_ALARM],
  "Testing Points": [...TESTING_POINTS],
  "Signage and Color coding": [...SIGNAGE],
  "Trench & Riser": [...TRENCH],
  "Isolation Valve": [...ISOLATION_VALVE],
  "Area Alarm": [...AREA_ALARM],
  "Valve Box": [...VALVE_BOX],
  "Outlet Points inside Room": [...OUTLET_POINTS],
  "Bed Head Panels": [...BED_HEAD],
};

/** Longer AIIMS Gorakhpur MGPS sheet in the Gorakhpur MOT & MGPS workbook. */
export const AIIMS_GORAKHPUR_MGPS_DETAILED_CHECKLIST: Record<string, readonly string[]> = {
  "Plant Room": ["Leakage testing"],
  "Oxygen System": [
    "Main control panel installed properly",
    "Ramp / manifold connections tightness",
    "Pigtail pipes connected properly",
    "Middle frame and chain fixed",
    "Emergency manifold signage (Oxygen Control Panel)",
    "Cylinders fixed properly",
    "Bypass line installed",
    "Emergency line connected with main control panel",
    "Main and emergency panels connected to master alarm",
    "Auto change over working",
    "Gauges showing proper pressure",
    "Pressure regulators working",
    "Safety valves fixed",
    "Mainline valve at reachable height",
    "Provision for LMO with valve and NRVs",
    "Signage for LMO connection / provision",
    "Proper saddling and sleeves where pipe crosses wall / electrical / fire pipes",
    "Flow direction and colour code arrows",
  ],
  "Nitrous Oxide System": [
    "Main control panel installed properly",
    "Ramp / manifold connections tightness",
    "Pigtail pipes connected properly",
    "Middle frame and chain fixed",
    "Emergency manifold signage (right bank / left bank)",
    "Cylinders fixed properly",
    "Bypass line installed with proper ball valve",
    "Emergency line connected with main control panel",
    "Main and emergency panels connected to master alarm",
    "Auto change over working",
    "Gauges showing proper pressure",
    "Pressure regulators working",
    "Safety valves fixed",
    "Mainline valve at reachable height",
    "Proper saddling and sleeves where pipe crosses wall / electrical / fire pipes",
    "Nitrous oxide heater installed",
    "Flow direction and colour code arrows",
  ],
  "Compressed Air System": [
    ...COMPRESSED_AIR_STANDARD.slice(0, 9),
    "Bypass for after cooler installed",
    "Signage for compressor, tank, after cooler, reducing station, air dryer",
    "Danger Hot Line sign",
    "Auto start/stop warning label",
    "Copper pipe coding as per HTM",
    "Flow direction arrows (minimum 3m)",
    "Sleeves wherever crossing electrical / fire pipes / walls",
  ],
  "Vacuum System": [
    "Anti-vibration pads installed",
    "Vacuum pump stack fixed with fasteners",
    "Auto start/stop (560 to 650 mmHg)",
    "Leakage checked at joints, valves, gauge and pressure switch",
    "Tank sensor wiring to control panel",
    "Filters and trap bottles installed",
    "Drain valve installed below the tank",
    "Exhaust line with Do not obstruct signage",
    "Proper ventilation available",
    "Signage for vacuum pump and tank",
    "Auto start/stop warning label",
    "Copper pipe coding as per HTM",
    "Flow direction arrows (minimum 3m)",
    "Sleeves wherever crossing electrical / fire pipes / walls",
    "Master alarm connection from vacuum panel",
  ],
  "AGSS System": [
    "AGSS stack fixed with fasteners",
    "Remote switch outside OT working on auto",
    "Leakage checked at joints, valves and gauge",
    "Filters fixed firmly",
    "Exhaust line with Do not obstruct signage",
    "Proper ventilation available",
    "Signage for AGS system",
    "Copper pipe coding as per HTM",
    "Flow direction arrows (minimum 3m)",
    "Sleeves wherever crossing electrical / fire pipes / walls",
    "Master alarm connection from AGS panel",
  ],
  "Master Alarm": [...MASTER_ALARM],
  "Testing Points": [...TESTING_POINTS],
  "Signage and Color coding": [...SIGNAGE],
  "Trench & Riser": [
    "Saddles firmly fixed with 1.2 to 1.5m spacing",
    "Colour coding and arrow stickers on copper pipe / main line",
    "Sleeves where pipe crosses or touches floor / wall",
    "Painting as per HTM 02-01",
  ],
  "Isolation Valve": [...ISOLATION_VALVE],
  "Area Alarm": [...AREA_ALARM],
  "Valve Box": [...VALVE_BOX],
  "Outlet Points inside Room": [...OUTLET_POINTS],
  "Bed Head Panels": [...BED_HEAD],
};

export const EXCEL_MGPS_EQUIPMENT = Object.keys(EXCEL_MGPS_DETAILED_CHECKLIST);
export const NMCH_KOTA_MGPS_EQUIPMENT = Object.keys(NMCH_KOTA_MGPS_DETAILED_CHECKLIST);
export const AIIMS_GORAKHPUR_MGPS_EQUIPMENT = Object.keys(
  AIIMS_GORAKHPUR_MGPS_DETAILED_CHECKLIST
);

export function getExcelMgpsCatalog(
  departmentSlug?: string | null,
  departmentName?: string | null
) {
  if (departmentSlug === "nmch-kota" || departmentName === "NMCH Kota") {
    return {
      names: NMCH_KOTA_MGPS_EQUIPMENT,
      detailed: NMCH_KOTA_MGPS_DETAILED_CHECKLIST,
    };
  }
  if (departmentSlug === "aiims-gorakhpur" || departmentName === "AIIMS Gorakhpur") {
    return {
      names: AIIMS_GORAKHPUR_MGPS_EQUIPMENT,
      detailed: AIIMS_GORAKHPUR_MGPS_DETAILED_CHECKLIST,
    };
  }
  return {
    names: EXCEL_MGPS_EQUIPMENT,
    detailed: EXCEL_MGPS_DETAILED_CHECKLIST,
  };
}

export function getExcelMgpsDetailedItemCount(
  equipmentName: string,
  departmentSlug?: string | null,
  departmentName?: string | null
): number {
  const { detailed } = getExcelMgpsCatalog(departmentSlug, departmentName);
  return detailed[equipmentName]?.length || 0;
}

export function getExcelMgpsDetailedChecklistItems(
  parentItemId: string,
  equipmentName: string,
  departmentSlug?: string | null,
  departmentName?: string | null
): ChecklistItemResponse[] {
  const { detailed } = getExcelMgpsCatalog(departmentSlug, departmentName);
  const checks = detailed[equipmentName];
  if (!checks) return [];
  return checks.map((name) => ({
    checklistItemId: `${parentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}
