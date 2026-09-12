import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const MEDICAL_AIR_COMPRESSOR_NAME = "Medical Air Compressor & Dryer" as const;

export const MEDICAL_AIR_COMPRESSOR_COMPONENTS = [
  "Electrical Control Panel",
  "Medical Compressor",
  "NRV",
  "Dryness Check",
  "Anti-vibration Pads",
  "Stack Fasteners",
  "Auto Start/Stop (7.1 to 8.3 bar)",
  "After Cooler",
  "Auto Drain Valves",
  "Drain Line",
  "Dew Point Monitor",
  "Dryer Standby Mode",
  "Danger Hot Line Sign",
  "Auto Start/Stop Warning Label",
  "Flow Direction Arrows",
  "Master Alarm Connection",
] as const;

export type MedicalAirCompressorComponentName =
  (typeof MEDICAL_AIR_COMPRESSOR_COMPONENTS)[number];

export const MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST: Record<
  MedicalAirCompressorComponentName,
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
  "Dryness Check": [
    "Pre Filter Check",
    "Post Filter Check",
    "Bacterial Filter Check",
    "Carbon Filter Check",
    "Air Dryness Check",
  ],
  "Anti-vibration Pads": ["Working Check"],
  "Stack Fasteners": ["Working Check"],
  "Auto Start/Stop (7.1 to 8.3 bar)": ["Working Check"],
  "After Cooler": ["Working Check"],
  "Auto Drain Valves": ["Working Check"],
  "Drain Line": ["Working Check"],
  "Dew Point Monitor": ["Working Check"],
  "Dryer Standby Mode": ["Working Check"],
  "Danger Hot Line Sign": ["Working Check"],
  "Auto Start/Stop Warning Label": ["Working Check"],
  "Flow Direction Arrows": ["Working Check"],
  "Master Alarm Connection": ["Working Check"],
};

export function isMedicalAirCompressor(name: string): boolean {
  return name === MEDICAL_AIR_COMPRESSOR_NAME;
}

export function isMedicalAirCompressorComponent(
  name: string
): name is MedicalAirCompressorComponentName {
  return name in MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST;
}

export function getMedicalAirCompressorComponentCount(): number {
  return MEDICAL_AIR_COMPRESSOR_COMPONENTS.length;
}

export function getMedicalAirCompressorComponentDetailedCount(
  componentName: string
): number {
  if (!isMedicalAirCompressorComponent(componentName)) return 0;
  return MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST[componentName].length;
}

export function getMedicalAirCompressorComponentDetailedItems(
  componentItemId: string,
  componentName: string
): ChecklistItemResponse[] {
  if (!isMedicalAirCompressorComponent(componentName)) {
    return [];
  }

  return MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST[componentName].map(
    (name) => ({
      checklistItemId: `${componentItemId}--${slugify(name)}`,
      name,
      status: null,
      remarks: "",
    })
  );
}

export function buildMedicalAirCompressorComponentChildren(parentItemId: string) {
  return MEDICAL_AIR_COMPRESSOR_COMPONENTS.map((name, index) => ({
    id: `${parentItemId}--${slugify(name)}`,
    name,
    order: index + 1,
  }));
}
