"use client";

import { getBrowseHierarchy } from "@/lib/browse-hierarchy";

export interface HierarchyData {
  id: string;
  name: string;
  slug: string;
  departments: {
    id: string;
    name: string;
    slug: string;
    sections: {
      id: string;
      name: string;
      slug: string;
      locations: { id: string; name: string; slug: string }[];
      equipment: {
        id: string;
        name: string;
        slug: string;
        locationId: string | null;
        checklistItems: {
          id: string;
          name: string;
          slug: string;
          order: number;
          children?: { id: string; name: string; slug: string; order: number }[];
        }[];
      }[];
    }[];
  }[];
}

const STATIC_HIERARCHY = getBrowseHierarchy() as HierarchyData[];

export function useHierarchy() {
  return { data: STATIC_HIERARCHY, loading: false, offline: false };
}

export function findSite(data: HierarchyData[] | null, siteId: string) {
  return data?.find((s) => s.id === siteId);
}

export function findDepartment(
  data: HierarchyData[] | null,
  siteId: string,
  deptId: string
) {
  return findSite(data, siteId)?.departments.find((d) => d.id === deptId);
}

export function findSection(
  data: HierarchyData[] | null,
  siteId: string,
  deptId: string,
  sectionId: string
) {
  return findDepartment(data, siteId, deptId)?.sections.find((s) => s.id === sectionId);
}

export function findLocation(
  data: HierarchyData[] | null,
  siteId: string,
  deptId: string,
  sectionId: string,
  locationId: string
) {
  return findSection(data, siteId, deptId, sectionId)?.locations.find(
    (l) => l.id === locationId
  );
}
