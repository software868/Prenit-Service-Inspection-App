import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const MEDICAL_VACUUM_NAME = "Medical Vacuum" as const;

export const MEDICAL_VACUUM_COMPONENTS = [
  "Electrical Control Panel",
  "Medical Compressor",
  "NRV",
  "Bacterial Filter",
  "Exhaust Filter",
  "Pressure Check",
  "Anti-vibration Pads",
  "Stack Fasteners",
  "Auto Start/Stop (560 to 650 mmHg)",
  "Tank Sensor Wiring",
  "Filters and Trap Bottles",
  "Exhaust Signage",
  "Ventilation",
  "Pump and Tank Signage",
  "Auto Start/Stop Warning Label",
  "Flow Direction Arrows",
  "Master Alarm Connection",
] as const;

export type MedicalVacuumComponentName = (typeof MEDICAL_VACUUM_COMPONENTS)[number];

export const MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST: Record<
  MedicalVacuumComponentName,
  readonly string[]
> = {
  "Electrical Control Panel": [
    "MCB Check",
    "Connector Check",
    "Volt Meter Check",
    "Ampere Meter Check",
    "Phase Preventer Check",
  ],
  "Medical Compressor": [
    "MCB Check",
    "Contactor Check",
    "Overload Relay Check",
    "PLC Check",
    "Compressor Working Check",
    "Intake Filter Check",
    "Belt Check",
    "Vibration Pad Check",
    "Belt Safety Cover Check",
    "Air Cooling Coil Check",
    "Manual On/Off or Auto Check",
  ],
  NRV: ["Leakage Check", "High Pressure Check"],
  "Bacterial Filter": ["Filter Check"],
  "Exhaust Filter": ["Filter Check"],
  "Pressure Check": ["Pressure Check"],
  "Anti-vibration Pads": ["Working Check"],
  "Stack Fasteners": ["Working Check"],
  "Auto Start/Stop (560 to 650 mmHg)": ["Working Check"],
  "Tank Sensor Wiring": ["Working Check"],
  "Filters and Trap Bottles": ["Working Check"],
  "Exhaust Signage": ["Working Check"],
  Ventilation: ["Working Check"],
  "Pump and Tank Signage": ["Working Check"],
  "Auto Start/Stop Warning Label": ["Working Check"],
  "Flow Direction Arrows": ["Working Check"],
  "Master Alarm Connection": ["Working Check"],
};

export function isMedicalVacuum(name: string): boolean {
  return name === MEDICAL_VACUUM_NAME;
}

export function isMedicalVacuumComponent(
  name: string
): name is MedicalVacuumComponentName {
  return name in MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST;
}

export function getMedicalVacuumComponentCount(): number {
  return MEDICAL_VACUUM_COMPONENTS.length;
}

export function getMedicalVacuumComponentDetailedCount(componentName: string): number {
  if (!isMedicalVacuumComponent(componentName)) return 0;
  return MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST[componentName].length;
}

export function getMedicalVacuumComponentDetailedItems(
  componentItemId: string,
  componentName: string
): ChecklistItemResponse[] {
  if (!isMedicalVacuumComponent(componentName)) {
    return [];
  }

  return MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST[componentName].map((name) => ({
    checklistItemId: `${componentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function buildMedicalVacuumComponentChildren(parentItemId: string) {
  return MEDICAL_VACUUM_COMPONENTS.map((name, index) => ({
    id: `${parentItemId}--${slugify(name)}`,
    name,
    order: index + 1,
  }));
}
