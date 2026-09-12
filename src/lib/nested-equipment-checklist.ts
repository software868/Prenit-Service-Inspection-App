import {
  buildManifoldComponentChildren,
  getManifoldComponentCount,
  getManifoldComponentDetailedCount,
  getManifoldComponentDetailedItems,
  getManifoldComponents,
  isGasManifold,
  normalizeGasManifoldName,
} from "./mgps-manifold-checklist";
import {
  buildMedicalAirCompressorComponentChildren,
  getMedicalAirCompressorComponentCount,
  getMedicalAirCompressorComponentDetailedCount,
  getMedicalAirCompressorComponentDetailedItems,
  isMedicalAirCompressor,
  MEDICAL_AIR_COMPRESSOR_COMPONENTS,
} from "./medical-air-compressor-checklist";
import {
  buildMedicalVacuumComponentChildren,
  getMedicalVacuumComponentCount,
  getMedicalVacuumComponentDetailedCount,
  getMedicalVacuumComponentDetailedItems,
  isMedicalVacuum,
  MEDICAL_VACUUM_COMPONENTS,
} from "./medical-vacuum-checklist";
import {
  AGSS_COMPONENTS,
  buildAgssComponentChildren,
  getAgssComponentCount,
  getAgssComponentDetailedCount,
  getAgssComponentDetailedItems,
  isAgss,
} from "./agss-checklist";
import type { ChecklistItemResponse } from "./types";

export function isNestedParentEquipment(name: string): boolean {
  return (
    isGasManifold(normalizeGasManifoldName(name)) ||
    isMedicalAirCompressor(name) ||
    isMedicalVacuum(name) ||
    isAgss(name)
  );
}

export function getNestedComponentCount(parentName: string): number {
  if (isGasManifold(normalizeGasManifoldName(parentName))) {
    return getManifoldComponentCount(parentName);
  }
  if (isMedicalAirCompressor(parentName)) {
    return getMedicalAirCompressorComponentCount();
  }
  if (isMedicalVacuum(parentName)) {
    return getMedicalVacuumComponentCount();
  }
  if (isAgss(parentName)) {
    return getAgssComponentCount();
  }
  return 0;
}

export function getNestedComponentDetailedCount(
  parentName: string,
  componentName: string
): number {
  if (isGasManifold(normalizeGasManifoldName(parentName))) {
    return getManifoldComponentDetailedCount(componentName);
  }
  if (isMedicalAirCompressor(parentName)) {
    return getMedicalAirCompressorComponentDetailedCount(componentName);
  }
  if (isMedicalVacuum(parentName)) {
    return getMedicalVacuumComponentDetailedCount(componentName);
  }
  if (isAgss(parentName)) {
    return getAgssComponentDetailedCount(componentName);
  }
  return 0;
}

export function getNestedComponentDetailedItems(
  parentName: string,
  componentItemId: string,
  componentName: string
): ChecklistItemResponse[] {
  if (isGasManifold(normalizeGasManifoldName(parentName))) {
    return getManifoldComponentDetailedItems(componentItemId, componentName);
  }
  if (isMedicalAirCompressor(parentName)) {
    return getMedicalAirCompressorComponentDetailedItems(
      componentItemId,
      componentName
    );
  }
  if (isMedicalVacuum(parentName)) {
    return getMedicalVacuumComponentDetailedItems(componentItemId, componentName);
  }
  if (isAgss(parentName)) {
    return getAgssComponentDetailedItems(componentItemId, componentName);
  }
  return [];
}

export function getNestedComponentNames(parentName: string): readonly string[] {
  if (isGasManifold(normalizeGasManifoldName(parentName))) {
    return getManifoldComponents(parentName);
  }
  if (isMedicalAirCompressor(parentName)) {
    return MEDICAL_AIR_COMPRESSOR_COMPONENTS;
  }
  if (isMedicalVacuum(parentName)) {
    return MEDICAL_VACUUM_COMPONENTS;
  }
  if (isAgss(parentName)) {
    return AGSS_COMPONENTS;
  }
  return [];
}

export function buildNestedComponentChildren(parentName: string, parentItemId: string) {
  if (isGasManifold(normalizeGasManifoldName(parentName))) {
    return buildManifoldComponentChildren(parentItemId, parentName);
  }
  if (isMedicalAirCompressor(parentName)) {
    return buildMedicalAirCompressorComponentChildren(parentItemId);
  }
  if (isMedicalVacuum(parentName)) {
    return buildMedicalVacuumComponentChildren(parentItemId);
  }
  if (isAgss(parentName)) {
    return buildAgssComponentChildren(parentItemId);
  }
  return [];
}
