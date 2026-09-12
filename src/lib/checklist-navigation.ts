import type { SelectionPath } from "./types";

export function buildChecklistUrl(
  selection: SelectionPath,
  breadcrumb: string,
  engineerName?: string
): string {
  const params = new URLSearchParams();

  (Object.keys(selection) as (keyof SelectionPath)[]).forEach((key) => {
    const value = selection[key];
    if (value) params.set(key, value);
  });

  params.set("breadcrumb", breadcrumb);
  if (engineerName?.trim()) {
    params.set("engineerName", engineerName.trim());
  }

  return `/checklist?${params.toString()}`;
}

export function parseChecklistParams(
  searchParams: URLSearchParams
): { selection: SelectionPath; breadcrumb: string; engineerName: string } | null {
  const siteId = searchParams.get("siteId");
  const departmentId = searchParams.get("departmentId");
  const sectionId = searchParams.get("sectionId");
  const equipmentId = searchParams.get("equipmentId");

  if (!siteId || !departmentId || !sectionId || !equipmentId) {
    return null;
  }

  const selection: SelectionPath = {
    siteId,
    siteName: searchParams.get("siteName") || undefined,
    siteSlug: searchParams.get("siteSlug") || undefined,
    departmentId,
    departmentName: searchParams.get("departmentName") || undefined,
    departmentSlug: searchParams.get("departmentSlug") || undefined,
    sectionId,
    sectionName: searchParams.get("sectionName") || undefined,
    sectionSlug: searchParams.get("sectionSlug") || undefined,
    locationId: searchParams.get("locationId") || undefined,
    locationName: searchParams.get("locationName") || undefined,
    locationSlug: searchParams.get("locationSlug") || undefined,
    equipmentId,
    equipmentName: searchParams.get("equipmentName") || undefined,
    checklistItemId: searchParams.get("checklistItemId") || undefined,
    checklistItemName: searchParams.get("checklistItemName") || undefined,
    parentChecklistItemId: searchParams.get("parentChecklistItemId") || undefined,
    parentChecklistItemName: searchParams.get("parentChecklistItemName") || undefined,
  };

  const breadcrumb = searchParams.get("breadcrumb") || "";
  const engineerName = searchParams.get("engineerName") || "";

  return { selection, breadcrumb, engineerName };
}

export function hasValidSelection(selection: SelectionPath): boolean {
  return Boolean(
    selection.siteId &&
      selection.departmentId &&
      selection.sectionId &&
      selection.equipmentId
  );
}

export function buildBreadcrumbNavItems(
  selection: SelectionPath,
  breadcrumb: string
): { label: string; href?: string }[] {
  const labels = breadcrumb
    .split(" > ")
    .map((part) => part.trim())
    .filter(Boolean);

  const { siteId, departmentId, sectionId, locationId, parentChecklistItemId, parentChecklistItemName } =
    selection;

  const siteBase = siteId ? `/sites/${siteId}` : undefined;
  const skipHospital = Boolean(
    selection.siteName &&
      selection.departmentName &&
      selection.siteName === selection.departmentName
  );

  return labels.map((label, index) => {
    const isLast = index === labels.length - 1;
    if (isLast) return { label };

    if (index === 0 && siteBase) {
      return {
        label,
        href: skipHospital && departmentId ? `${siteBase}/departments/${departmentId}` : siteBase,
      };
    }

    if (skipHospital) {
      if (index === 1 && siteBase && departmentId && sectionId) {
        return { label, href: `${siteBase}/departments/${departmentId}/sections/${sectionId}` };
      }

      if (index === 2 && siteBase && departmentId && sectionId) {
        if (locationId) {
          return {
            label,
            href: `${siteBase}/departments/${departmentId}/sections/${sectionId}/locations/${locationId}`,
          };
        }

        if (parentChecklistItemId && parentChecklistItemName) {
          return {
            label,
            href: `${siteBase}/departments/${departmentId}/sections/${sectionId}/manifold/${parentChecklistItemId}?name=${encodeURIComponent(parentChecklistItemName)}`,
          };
        }
      }

      return { label };
    }

    if (index === 1 && siteBase && departmentId) {
      return { label, href: `${siteBase}/departments/${departmentId}` };
    }

    if (index === 2 && siteBase && departmentId && sectionId) {
      return { label, href: `${siteBase}/departments/${departmentId}/sections/${sectionId}` };
    }

    if (index === 3 && siteBase && departmentId && sectionId) {
      if (locationId) {
        return {
          label,
          href: `${siteBase}/departments/${departmentId}/sections/${sectionId}/locations/${locationId}`,
        };
      }

      if (parentChecklistItemId && parentChecklistItemName) {
        return {
          label,
          href: `${siteBase}/departments/${departmentId}/sections/${sectionId}/manifold/${parentChecklistItemId}?name=${encodeURIComponent(parentChecklistItemName)}`,
        };
      }
    }

    return { label };
  });
}
