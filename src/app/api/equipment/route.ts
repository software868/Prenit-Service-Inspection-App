import { prisma } from "@/lib/prisma";
import { nestEquipmentChecklist, selectNamedCatalog } from "@/lib/hierarchy-utils";
import {
  getMgpsDetailedChecks,
  getMgpsEquipmentNames,
  getMotDetailedChecks,
  getMotEquipmentNames,
  usesExcelChecklists,
} from "@/lib/site-checklists";
import { getStaticEquipment } from "@/lib/static-hierarchy";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const locationId = searchParams.get("locationId");

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    try {
      const equipment = await prisma.equipment.findMany({
        where: {
          sectionId,
          ...(locationId ? { locationId } : { locationId: null }),
        },
        include: {
          checklistItems: { orderBy: { order: "asc" } },
          section: { include: { department: { include: { site: true } } } },
        },
        orderBy: { order: "asc" },
      });

      if (equipment.length > 0) {
        const nested = nestEquipmentChecklist(equipment);
        const siteSlug = equipment[0].section.department.site.slug;
        const departmentSlug = equipment[0].section.department.slug;
        if (!usesExcelChecklists(siteSlug)) {
          return NextResponse.json(nested);
        }

        const catalog = locationId
          ? getMotEquipmentNames(siteSlug)
          : equipment[0].section.slug === "mgps"
            ? getMgpsEquipmentNames(siteSlug, departmentSlug)
            : null;

        if (!catalog) {
          return NextResponse.json(nested);
        }

        return NextResponse.json(
          nested.map((eq) => ({
            ...eq,
            checklistItems: selectNamedCatalog(eq.checklistItems, catalog).map((item) => ({
              ...item,
              children: item.children
                ? selectNamedCatalog(
                    item.children,
                    locationId
                      ? getMotDetailedChecks(item.name, siteSlug)
                      : getMgpsDetailedChecks(item.name, siteSlug, departmentSlug)
                  )
                : item.children,
            })),
          }))
        );
      }
    } catch {
      // fall through to static data
    }

    return NextResponse.json(getStaticEquipment(sectionId, locationId));
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const locationId = searchParams.get("locationId");
    if (sectionId) {
      return NextResponse.json(getStaticEquipment(sectionId, locationId));
    }
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}
