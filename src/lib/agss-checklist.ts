import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

export const AGSS_NAME = "AGSS" as const;

export const AGSS_COMPONENTS = [
  "Electrical Panel",
  "Motor Sound Check",
  "Pressure Check",
  "Cut Off Check",
  "Remote Switch Outside OT",
  "Filters",
  "Exhaust Do Not Obstruct Signage",
  "Ventilation",
  "AGS Signage",
  "Flow Direction Arrows",
  "Master Alarm Connection",
] as const;

export type AgssComponentName = (typeof AGSS_COMPONENTS)[number];

export const AGSS_COMPONENT_DETAILED_CHECKLIST: Record<
  AgssComponentName,
  readonly string[]
> = {
  "Electrical Panel": [
    "MCB Check",
    "Connector Check",
    "Volt Meter Check",
    "Ampere Meter Check",
    "Phase Preventer Check",
  ],
  "Motor Sound Check": ["Motor Sound Check"],
  "Pressure Check": ["Pressure Check"],
  "Cut Off Check": ["Cut Off Check"],
  "Remote Switch Outside OT": ["Working Check"],
  Filters: ["Working Check"],
  "Exhaust Do Not Obstruct Signage": ["Working Check"],
  Ventilation: ["Working Check"],
  "AGS Signage": ["Working Check"],
  "Flow Direction Arrows": ["Working Check"],
  "Master Alarm Connection": ["Working Check"],
};

export function isAgss(name: string): boolean {
  return name === AGSS_NAME;
}

export function isAgssComponent(name: string): name is AgssComponentName {
  return name in AGSS_COMPONENT_DETAILED_CHECKLIST;
}

export function getAgssComponentCount(): number {
  return AGSS_COMPONENTS.length;
}

export function getAgssComponentDetailedCount(componentName: string): number {
  if (!isAgssComponent(componentName)) return 0;
  return AGSS_COMPONENT_DETAILED_CHECKLIST[componentName].length;
}

export function getAgssComponentDetailedItems(
  componentItemId: string,
  componentName: string
): ChecklistItemResponse[] {
  if (!isAgssComponent(componentName)) {
    return [];
  }

  return AGSS_COMPONENT_DETAILED_CHECKLIST[componentName].map((name) => ({
    checklistItemId: `${componentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function buildAgssComponentChildren(parentItemId: string) {
  return AGSS_COMPONENTS.map((name, index) => ({
    id: `${parentItemId}--${slugify(name)}`,
    name,
    order: index + 1,
  }));
}
