import { prisma } from "@/lib/prisma";
import { nestEquipmentChecklist, selectNamedCatalog } from "@/lib/hierarchy-utils";
import {
  getMgpsDetailedChecks,
  getMgpsEquipmentNames,
  getMotDetailedChecks,
  getMotEquipmentNames,
  usesExcelChecklists,
} from "@/lib/site-checklists";
import { getStaticHierarchy } from "@/lib/static-hierarchy";
import { NextResponse } from "next/server";

function applySiteCatalogs<
  T extends {
    slug: string;
    departments: {
      slug: string;
      sections: {
        slug: string;
        equipment: {
          locationId: string | null;
          checklistItems: { name: string; children?: { name: string }[] }[];
        }[];
      }[];
    }[];
  },
>(sites: T[]) {
  return sites.map((site) => ({
    ...site,
    departments: site.departments.map((dept) => ({
      ...dept,
      sections: dept.sections.map((section) => {
        if (!usesExcelChecklists(site.slug)) return section;
        const catalog =
          section.slug === "mgps"
            ? getMgpsEquipmentNames(site.slug, dept.slug)
            : section.slug === "mot" || Boolean(section.equipment.some((eq) => eq.locationId))
              ? getMotEquipmentNames(site.slug)
              : null;
        if (!catalog) return section;
        return {
          ...section,
          equipment: section.equipment.map((eq) => ({
            ...eq,
            checklistItems: selectNamedCatalog(eq.checklistItems, catalog).map((item) => ({
              ...item,
              children: item.children
                ? selectNamedCatalog(
                    item.children,
                    section.slug === "mgps"
                      ? getMgpsDetailedChecks(item.name, site.slug, dept.slug)
                      : getMotDetailedChecks(item.name, site.slug)
                  )
                : item.children,
            })),
          })),
        };
      }),
    })),
  }));
}

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      orderBy: { order: "asc" },
      include: {
        departments: {
          orderBy: { order: "asc" },
          include: {
            sections: {
              orderBy: { order: "asc" },
              include: {
                locations: { orderBy: { order: "asc" } },
                equipment: {
                  orderBy: { order: "asc" },
                  include: {
                    checklistItems: { orderBy: { order: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (sites.length > 0) {
      const nested = applySiteCatalogs(
        sites.map((site) => ({
          ...site,
          departments: site.departments.map((dept) => ({
            ...dept,
            sections: dept.sections.map((section) => ({
              ...section,
              equipment: nestEquipmentChecklist(section.equipment),
            })),
          })),
        }))
      );
      return NextResponse.json(nested);
    }

    return NextResponse.json(getStaticHierarchy());
  } catch (error) {
    console.error("Failed to fetch hierarchy, using static data:", error);
    return NextResponse.json(getStaticHierarchy());
  }
}
