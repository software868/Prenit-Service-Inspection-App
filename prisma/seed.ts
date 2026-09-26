import { PrismaClient, UserRole } from "@prisma/client";
import {
  isGasManifold,
  MANIFOLD_COMPONENT_DETAILED_CHECKLIST,
  isManifoldComponent,
} from "../src/lib/mgps-manifold-checklist";
import {
  isMedicalAirCompressor,
  MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST,
} from "../src/lib/medical-air-compressor-checklist";
import {
  isMedicalVacuum,
  MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST,
} from "../src/lib/medical-vacuum-checklist";
import {
  AGSS_COMPONENT_DETAILED_CHECKLIST,
  isAgss,
} from "../src/lib/agss-checklist";
import {
  OT_DETAILED_CHECKLIST,
  OT_EQUIPMENT_LIST,
  isOtEquipmentName,
} from "../src/lib/ot-detailed-checklist";
import {
  ELECTRICAL_DETAILED_CHECKLIST,
  isElectricalDetailedEquipment,
} from "../src/lib/electrical-detailed-checklist";
import {
  HVAC_DETAILED_CHECKLIST,
  isHvacDetailedEquipment,
} from "../src/lib/hvac-detailed-checklist";
import {
  MGPS_ALL_EQUIPMENT,
  MGPS_SITE_DETAILED_CHECKLIST,
  isMgpsSiteEquipment,
} from "../src/lib/mgps-site-checklist";
import { getNestedComponentNames } from "../src/lib/nested-equipment-checklist";
import { EXTRA_SITES, getExtraSiteHospitals, isKanpurSite } from "../src/lib/extra-sites";
import {
  EXCEL_MOT_DETAILED_CHECKLIST,
  EXCEL_MOT_EQUIPMENT,
} from "../src/lib/excel-mot-checklist";
import { getExcelMgpsCatalog } from "../src/lib/excel-mgps-checklist";

const prisma = new PrismaClient();

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /I\/O error|closed|RetryableWriteError|P2010|P1001|timeout|Server selection/i.test(
        message
      );
      if (!retryable || i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

const OT_EQUIPMENT = [...OT_EQUIPMENT_LIST];

const ELECTRICAL_EQUIPMENT = [
  "Electrical Panel",
  "Tube Light",
  "PPL",
  "IPS",
  "UPS",
  "MCB",
  "Switch Socket",
];

const HVAC_EQUIPMENT = [
  "Compressor",
  "Cooling Coil",
  "Cassette Unit",
  "AHU",
  "Pre Filter",
];

const MGPS_EQUIPMENT = [...MGPS_ALL_EQUIPMENT];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureChecklistItem(data: {
  equipmentId: string;
  name: string;
  slug: string;
  order: number;
  parentId?: string | null;
  alternateSlugs?: string[];
}) {
  const slugs = [data.slug, ...(data.alternateSlugs || [])];
  const existingBySlug = await prisma.checklistItem.findFirst({
    where: {
      equipmentId: data.equipmentId,
      slug: { in: slugs },
    },
  });
  if (existingBySlug) return existingBySlug;

  const existingByName = await prisma.checklistItem.findFirst({
    where: {
      equipmentId: data.equipmentId,
      name: data.name,
      parentId: data.parentId || null,
    },
  });
  if (existingByName) return existingByName;

  return withRetry(() =>
    prisma.checklistItem.create({
      data: {
        equipmentId: data.equipmentId,
        name: data.name,
        slug: data.slug,
        order: data.order,
        ...(data.parentId ? { parentId: data.parentId } : {}),
      },
    })
  );
}

function nestedDetailedItems(parentName: string, componentName: string): readonly string[] {
  if (isGasManifold(parentName) && isManifoldComponent(componentName)) {
    return MANIFOLD_COMPONENT_DETAILED_CHECKLIST[componentName];
  }
  if (isMedicalAirCompressor(parentName) && componentName in MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST) {
    return MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST[
      componentName as keyof typeof MEDICAL_AIR_COMPRESSOR_COMPONENT_DETAILED_CHECKLIST
    ];
  }
  if (isMedicalVacuum(parentName) && componentName in MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST) {
    return MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST[
      componentName as keyof typeof MEDICAL_VACUUM_COMPONENT_DETAILED_CHECKLIST
    ];
  }
  if (isAgss(parentName) && componentName in AGSS_COMPONENT_DETAILED_CHECKLIST) {
    return AGSS_COMPONENT_DETAILED_CHECKLIST[
      componentName as keyof typeof AGSS_COMPONENT_DETAILED_CHECKLIST
    ];
  }
  return [];
}

async function ensureNestedComponents(
  equipmentId: string,
  parentName: string,
  parentId: string
) {
  const components = getNestedComponentNames(parentName);
  for (let j = 0; j < components.length; j++) {
    const componentName = components[j];
    const component = await ensureChecklistItem({
      equipmentId,
      parentId,
      name: componentName,
      slug: slugify(`${parentName}-${componentName}`),
      order: j + 1,
    });

    const detailedItems = nestedDetailedItems(parentName, componentName);
    for (let k = 0; k < detailedItems.length; k++) {
      const childName = detailedItems[k];
      await ensureChecklistItem({
        equipmentId,
        parentId: component.id,
        name: childName,
        slug: slugify(`${parentName}-${componentName}-${childName}`),
        alternateSlugs: [slugify(`${componentName}-${childName}`)],
        order: k + 1,
      });
    }
  }
}

async function ensureTwoLevelItems(
  equipmentId: string,
  names: readonly string[],
  detailed: Record<string, readonly string[]>
) {
  const existing = await prisma.checklistItem.findMany({
    where: { equipmentId },
  });
  const bySlug = new Map(existing.map((item) => [item.slug, item]));
  const parentByName = new Map(
    existing.filter((item) => !item.parentId).map((item) => [item.name, item])
  );

  const missingParents = names
    .map((name, i) => ({
      equipmentId,
      name,
      slug: slugify(name),
      order: i + 1,
    }))
    .filter((item) => !bySlug.has(item.slug) && !parentByName.has(item.name));

  if (missingParents.length > 0) {
    await prisma.checklistItem.createMany({ data: missingParents });
  }

  const allItems = await prisma.checklistItem.findMany({
    where: { equipmentId },
  });
  const parents = new Map(
    allItems.filter((item) => !item.parentId).map((item) => [item.name, item])
  );
  const childSlugs = new Set(allItems.map((item) => item.slug));
  const childByParentName = new Set(
    allItems
      .filter((item) => item.parentId)
      .map((item) => `${item.parentId}::${item.name}`)
  );

  const missingChildren: {
    equipmentId: string;
    parentId: string;
    name: string;
    slug: string;
    order: number;
  }[] = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const parent = parents.get(name);
    if (!parent) continue;
    const checks = detailed[name] || [];
    for (let j = 0; j < checks.length; j++) {
      const childName = checks[j];
      const slug = slugify(`${name}-${childName}`);
      if (childSlugs.has(slug) || childByParentName.has(`${parent.id}::${childName}`)) {
        continue;
      }
      missingChildren.push({
        equipmentId,
        parentId: parent.id,
        name: childName,
        slug,
        order: j + 1,
      });
      childSlugs.add(slug);
      childByParentName.add(`${parent.id}::${childName}`);
    }
  }

  if (missingChildren.length > 0) {
    await prisma.checklistItem.createMany({ data: missingChildren });
  }
}

async function ensureExcelMotItems(equipmentId: string) {
  await ensureTwoLevelItems(equipmentId, EXCEL_MOT_EQUIPMENT, EXCEL_MOT_DETAILED_CHECKLIST);
}

async function ensureExcelMgpsItems(equipmentId: string, departmentSlug: string) {
  const catalog = getExcelMgpsCatalog(departmentSlug);
  await ensureTwoLevelItems(equipmentId, catalog.names, catalog.detailed);
}

async function ensureOtEquipmentItems(equipmentId: string) {
  for (let i = 0; i < OT_EQUIPMENT.length; i++) {
    const name = OT_EQUIPMENT[i];
    const parent = await ensureChecklistItem({
      equipmentId,
      name,
      slug: slugify(name),
      order: i + 1,
    });

    if (!isOtEquipmentName(name)) continue;
    const detailedItems = OT_DETAILED_CHECKLIST[name];
    for (let j = 0; j < detailedItems.length; j++) {
      const childName = detailedItems[j];
      await ensureChecklistItem({
        equipmentId,
        parentId: parent.id,
        name: childName,
        slug: slugify(`${name}-${childName}`),
        order: j + 1,
      });
    }
  }
}

async function ensureSectionEquipmentItems(equipmentId: string, equipmentNames: string[]) {
  for (let i = 0; i < equipmentNames.length; i++) {
    const name = equipmentNames[i];
    const parent = await ensureChecklistItem({
      equipmentId,
      name,
      slug: slugify(name),
      order: i + 1,
    });

    if (isElectricalDetailedEquipment(name)) {
      const detailedItems = ELECTRICAL_DETAILED_CHECKLIST[name];
      for (let j = 0; j < detailedItems.length; j++) {
        const childName = detailedItems[j];
        await ensureChecklistItem({
          equipmentId,
          parentId: parent.id,
          name: childName,
          slug: slugify(`${name}-${childName}`),
          order: j + 1,
        });
      }
    }

    if (isHvacDetailedEquipment(name)) {
      const detailedItems = HVAC_DETAILED_CHECKLIST[name];
      for (let j = 0; j < detailedItems.length; j++) {
        const childName = detailedItems[j];
        await ensureChecklistItem({
          equipmentId,
          parentId: parent.id,
          name: childName,
          slug: slugify(`${name}-${childName}`),
          order: j + 1,
        });
      }
    }

    if (isMgpsSiteEquipment(name)) {
      const detailedItems = MGPS_SITE_DETAILED_CHECKLIST[name];
      for (let j = 0; j < detailedItems.length; j++) {
        const childName = detailedItems[j];
        await ensureChecklistItem({
          equipmentId,
          parentId: parent.id,
          name: childName,
          slug: slugify(`${name}-${childName}`),
          order: j + 1,
        });
      }
    }

    if (
      isGasManifold(name) ||
      isMedicalAirCompressor(name) ||
      isMedicalVacuum(name) ||
      isAgss(name)
    ) {
      await ensureNestedComponents(equipmentId, name, parent.id);
    }
  }
}

async function ensureOTLocations(sectionId: string, prefix: string, otCount = 8) {
  const existing = await prisma.location.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
  });
  if (existing.length >= otCount) return existing;
  if (existing.length === 0) return createOTLocations(sectionId, prefix, otCount);

  const locations = [...existing];
  for (let i = existing.length + 1; i <= otCount; i++) {
    const name = `OT-${i}`;
    const location = await prisma.location.create({
      data: {
        sectionId,
        name,
        slug: slugify(`${prefix}-${name}`),
        order: i,
      },
    });
    locations.push(location);
  }
  return locations;
}

async function ensureOTEquipmentForSection(
  sectionId: string,
  prefix: string,
  excel = false,
  otCount = 8
) {
  const locations = await ensureOTLocations(sectionId, prefix, otCount);
  for (const location of locations) {
    const existing = await prisma.equipment.findFirst({
      where: { sectionId, locationId: location.id },
    });
    if (existing) {
      if (excel) await ensureExcelMotItems(existing.id);
      else await ensureOtEquipmentItems(existing.id);
      continue;
    }
    const equipment = await prisma.equipment.create({
      data: {
        sectionId,
        locationId: location.id,
        name: "OT Equipment Checklist",
        slug: `ot-equipment-${location.id}`,
        order: 1,
      },
    });
    if (excel) await ensureExcelMotItems(equipment.id);
    else await ensureOtEquipmentItems(equipment.id);
  }
}

async function ensureMotSection(
  departmentId: string,
  prefix: string,
  order: number,
  excel = false,
  otCount = 8
) {
  let section = await prisma.section.findFirst({
    where: { departmentId, slug: "mot" },
  });
  if (!section) {
    section = await prisma.section.create({
      data: {
        departmentId,
        name: "MOT",
        slug: "mot",
        order,
      },
    });
  }
  await ensureOTEquipmentForSection(section.id, prefix, excel, otCount);
}

async function ensureMgpsSection(
  departmentId: string,
  order: number,
  options?: { excel?: boolean; departmentSlug?: string }
) {
  let section = await prisma.section.findFirst({
    where: { departmentId, slug: "mgps" },
  });
  if (!section) {
    section = await prisma.section.create({
      data: {
        departmentId,
        name: "MGPS",
        slug: "mgps",
        order,
      },
    });
  }

  const existingEq = await prisma.equipment.findFirst({
    where: { sectionId: section.id, locationId: null },
  });
  if (options?.excel) {
    const departmentSlug = options.departmentSlug || "";
    if (!existingEq) {
      await createExcelMgpsEquipment(section.id, departmentSlug);
    } else {
      await ensureExcelMgpsItems(existingEq.id, departmentSlug);
    }
    return;
  }

  if (!existingEq) {
    await createSectionEquipment(section.id, MGPS_EQUIPMENT, "MGPS Equipment");
  } else {
    await ensureSectionEquipmentItems(existingEq.id, MGPS_EQUIPMENT);
  }
}

async function syncExtraSites() {
  console.log("Syncing extra cities...");

  for (const [index, extra] of EXTRA_SITES.entries()) {
    let site = await prisma.site.findFirst({ where: { slug: extra.slug } });
    if (!site) {
      site = await prisma.site.create({
        data: {
          name: extra.name,
          slug: extra.slug,
          order: index + 2,
        },
      });
    }

    const hospitals = getExtraSiteHospitals(extra);
    for (const [hIndex, hospital] of hospitals.entries()) {
      let dept = await prisma.department.findFirst({
        where: { siteId: site.id, slug: hospital.slug },
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            siteId: site.id,
            name: hospital.name,
            slug: hospital.slug,
            order: hIndex + 1,
          },
        });
      }

      for (const [sIndex, service] of hospital.services.entries()) {
        if (service === "MOT") {
          await ensureMotSection(
            dept.id,
            `${extra.slug}-${hospital.slug}`,
            sIndex + 1,
            true,
            hospital.otCount || 8
          );
        } else {
          await ensureMgpsSection(dept.id, sIndex + 1, {
            excel: true,
            departmentSlug: hospital.slug,
          });
        }
      }
    }
  }

  console.log("Extra cities sync complete.");
}

async function syncMissingChecklistItems() {
  console.log("Syncing missing checklist items...");

  const otEquipment = await prisma.equipment.findMany({
    where: { name: "OT Equipment Checklist" },
    include: { section: { include: { department: { include: { site: true } } } } },
  });
  for (const equipment of otEquipment) {
    if (isKanpurSite(equipment.section.department.site.slug)) {
      await ensureOtEquipmentItems(equipment.id);
    } else {
      await ensureExcelMotItems(equipment.id);
    }
  }

  const mgpsEquipment = await prisma.equipment.findMany({
    where: { name: "MGPS Equipment" },
    include: { section: { include: { department: { include: { site: true } } } } },
  });
  for (const equipment of mgpsEquipment) {
    const department = equipment.section.department;
    if (isKanpurSite(department.site.slug)) {
      await ensureSectionEquipmentItems(equipment.id, MGPS_EQUIPMENT);
    } else {
      await ensureExcelMgpsItems(equipment.id, department.slug);
    }
  }

  console.log("Checklist sync complete.");
}

async function createOTLocations(sectionId: string, prefix: string, otCount = 8) {
  const locations = [];
  for (let i = 1; i <= otCount; i++) {
    const name = `OT-${i}`;
    const location = await prisma.location.create({
      data: {
        sectionId,
        name,
        slug: slugify(`${prefix}-${name}`),
        order: i,
      },
    });
    locations.push(location);
  }
  return locations;
}

async function createOTEquipment(sectionId: string, locations: { id: string }[]) {
  for (const location of locations) {
    const equipment = await prisma.equipment.create({
      data: {
        sectionId,
        locationId: location.id,
        name: "OT Equipment Checklist",
        slug: `ot-equipment-${location.id}`,
        order: 1,
      },
    });
    await ensureOtEquipmentItems(equipment.id);
  }
}

async function createExcelMgpsEquipment(sectionId: string, departmentSlug: string) {
  const equipment = await prisma.equipment.create({
    data: {
      sectionId,
      name: "MGPS Equipment",
      slug: "mgps-equipment",
      order: 1,
    },
  });
  await ensureExcelMgpsItems(equipment.id, departmentSlug);
  return equipment;
}

async function createSectionEquipment(
  sectionId: string,
  equipmentNames: string[],
  equipmentLabel?: string
) {
  const equipment = await prisma.equipment.create({
    data: {
      sectionId,
      name: equipmentLabel || "Equipment Checklist",
      slug: slugify(equipmentLabel || "equipment-checklist"),
      order: 1,
    },
  });

  await ensureSectionEquipmentItems(equipment.id, equipmentNames);
  return equipment;
}

async function createBaseData() {
  await prisma.user.upsert({
    where: { email: "engineer@prenit.com" },
    update: {},
    create: {
      name: "Service Engineer",
      email: "engineer@prenit.com",
      role: UserRole.ENGINEER,
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@prenit.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@prenit.com",
      role: UserRole.ADMIN,
    },
  });

  const kanpur = await prisma.site.create({
    data: {
      name: "Kanpur",
      slug: "kanpur",
      order: 1,
    },
  });

  const cnds = await prisma.department.create({
    data: {
      siteId: kanpur.id,
      name: "CNDS",
      slug: "cnds",
      order: 1,
    },
  });

  const pmssy = await prisma.department.create({
    data: {
      siteId: kanpur.id,
      name: "PMSSY",
      slug: "pmssy",
      order: 2,
    },
  });

  const otSection = await prisma.section.create({
    data: {
      departmentId: cnds.id,
      name: "Operation Theatres",
      slug: "operation-theatres",
      order: 1,
    },
  });

  const electricalSection = await prisma.section.create({
    data: {
      departmentId: cnds.id,
      name: "Electrical Section",
      slug: "electrical-section",
      order: 2,
    },
  });

  const hvacSection = await prisma.section.create({
    data: {
      departmentId: cnds.id,
      name: "HVAC",
      slug: "hvac",
      order: 3,
    },
  });

  const cndsOtLocations = await createOTLocations(otSection.id, "cnds");
  await createOTEquipment(otSection.id, cndsOtLocations);
  await createSectionEquipment(electricalSection.id, ELECTRICAL_EQUIPMENT, "Electrical Equipment");
  await createSectionEquipment(hvacSection.id, HVAC_EQUIPMENT, "HVAC Equipment");

  const pmssyOtSection = await prisma.section.create({
    data: {
      departmentId: pmssy.id,
      name: "OT",
      slug: "ot",
      order: 1,
    },
  });

  const pmssyElectricalSection = await prisma.section.create({
    data: {
      departmentId: pmssy.id,
      name: "Electrical Section",
      slug: "electrical-section",
      order: 2,
    },
  });

  const pmssyMgpsSection = await prisma.section.create({
    data: {
      departmentId: pmssy.id,
      name: "MGPS",
      slug: "mgps",
      order: 3,
    },
  });

  const pmssyOtLocations = await createOTLocations(pmssyOtSection.id, "pmssy");
  await createOTEquipment(pmssyOtSection.id, pmssyOtLocations);
  await createSectionEquipment(
    pmssyElectricalSection.id,
    ELECTRICAL_EQUIPMENT,
    "Electrical Equipment"
  );
  await createSectionEquipment(pmssyMgpsSection.id, MGPS_EQUIPMENT, "MGPS Equipment");
}

async function main() {
  console.log("Seeding database...");

  const existing = await prisma.site.findFirst({ where: { slug: "kanpur" } });
  if (!existing) {
    await createBaseData();
    console.log("Database seeded successfully!");
  } else {
    console.log("Database already seeded. Inserting any missing checklist items...");
    await syncMissingChecklistItems();
  }

  await syncExtraSites();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
