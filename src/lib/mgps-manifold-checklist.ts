import type { ChecklistItemResponse } from "./types";
import { slugify } from "./utils";

/** O2, N2O, and CO2 manifolds share the same core component checklist structure */
export const GAS_MANIFOLD_EQUIPMENT = [
  "Oxygen Manifold with Control Panel",
  "N2O Manifold with Control Panel",
  "CO2 Manifold with Control Panel",
] as const;

/** Legacy name alias for cached/offline data */
export const GAS_MANIFOLD_ALIASES: Record<string, GasManifoldName> = {
  "O2 Manifold with Control Panel": "Oxygen Manifold with Control Panel",
};

export type GasManifoldName = (typeof GAS_MANIFOLD_EQUIPMENT)[number];

export const MANIFOLD_COMPONENTS = [
  "Pigtail",
  "NRV",
  "Pressure Gauge",
  "Primary Regulator",
  "Secondary Regulator",
  "Isolation Valve",
] as const;

export const OXYGEN_N2O_EXTRA_COMPONENTS = [
  "Ramp / Manifold Connection Tightness",
  "Middle Frame and Chain",
  "Cylinder Fixing",
  "Auto Change Over",
  "Safety Valves",
  "Flow Direction and Colour Code Arrows",
  "Emergency Manifold Signage",
] as const;

export const N2O_ONLY_EXTRA_COMPONENTS = [
  "Mainline Valve Height",
  "Nitrous Oxide Heater",
] as const;

export type ManifoldComponentName =
  | (typeof MANIFOLD_COMPONENTS)[number]
  | (typeof OXYGEN_N2O_EXTRA_COMPONENTS)[number]
  | (typeof N2O_ONLY_EXTRA_COMPONENTS)[number];

/** Detailed sub-checklist items per manifold component */
export const MANIFOLD_COMPONENT_DETAILED_CHECKLIST: Record<
  ManifoldComponentName,
  readonly string[]
> = {
  Pigtail: ["Crack Check", "Tightness Check"],
  NRV: ["Working Check"],
  "Pressure Gauge": ["Working Check"],
  "Primary Regulator": [
    "Working Check",
    "Diaphragm Kit Check",
    "Pressure Pin Check",
    "Pressure Safety Pin Check",
  ],
  "Secondary Regulator": [
    "Working Check",
    "Diaphragm Kit Check",
    "Pressure Pin Check",
    "Pressure Safety Pin Check",
  ],
  "Isolation Valve": [
    "Open / Close Check",
    "Leakage Check",
    "Pressure Status Check",
  ],
  "Ramp / Manifold Connection Tightness": ["Working Check"],
  "Middle Frame and Chain": ["Working Check"],
  "Cylinder Fixing": ["Working Check"],
  "Auto Change Over": ["Working Check"],
  "Safety Valves": ["Working Check"],
  "Flow Direction and Colour Code Arrows": ["Working Check"],
  "Emergency Manifold Signage": ["Working Check"],
  "Mainline Valve Height": ["Working Check"],
  "Nitrous Oxide Heater": ["Working Check"],
};

export function normalizeGasManifoldName(name: string): string {
  return GAS_MANIFOLD_ALIASES[name] || name;
}

export function isGasManifold(name: string): name is GasManifoldName {
  const normalized = normalizeGasManifoldName(name);
  return (GAS_MANIFOLD_EQUIPMENT as readonly string[]).includes(normalized);
}

export function isManifoldComponent(name: string): name is ManifoldComponentName {
  return name in MANIFOLD_COMPONENT_DETAILED_CHECKLIST;
}

export function getManifoldComponents(parentName: string): readonly string[] {
  const normalized = normalizeGasManifoldName(parentName);
  if (normalized === "N2O Manifold with Control Panel") {
    return [...MANIFOLD_COMPONENTS, ...OXYGEN_N2O_EXTRA_COMPONENTS, ...N2O_ONLY_EXTRA_COMPONENTS];
  }
  if (normalized === "Oxygen Manifold with Control Panel") {
    return [...MANIFOLD_COMPONENTS, ...OXYGEN_N2O_EXTRA_COMPONENTS];
  }
  return MANIFOLD_COMPONENTS;
}

export function getManifoldComponentCount(parentName?: string): number {
  if (!parentName) return MANIFOLD_COMPONENTS.length;
  return getManifoldComponents(parentName).length;
}

export function getManifoldComponentDetailedCount(componentName: string): number {
  if (!isManifoldComponent(componentName)) return 0;
  return MANIFOLD_COMPONENT_DETAILED_CHECKLIST[componentName].length;
}

export function getManifoldComponentDetailedItems(
  componentItemId: string,
  componentName: string
): ChecklistItemResponse[] {
  if (!isManifoldComponent(componentName)) {
    return [];
  }

  return MANIFOLD_COMPONENT_DETAILED_CHECKLIST[componentName].map((name) => ({
    checklistItemId: `${componentItemId}--${slugify(name)}`,
    name,
    status: null,
    remarks: "",
  }));
}

export function buildManifoldComponentChildren(parentItemId: string, parentName?: string) {
  return getManifoldComponents(parentName || "").map((name, index) => ({
    id: `${parentItemId}--${slugify(name)}`,
    name,
    order: index + 1,
  }));
}
