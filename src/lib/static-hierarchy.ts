import { OT_DETAILED_CHECKLIST, OT_EQUIPMENT_LIST, isOtEquipmentName } from "./ot-detailed-checklist";
import {
  ELECTRICAL_DETAILED_CHECKLIST,
  isElectricalDetailedEquipment,
} from "./electrical-detailed-checklist";
import {
  HVAC_DETAILED_CHECKLIST,
  isHvacDetailedEquipment,
} from "./hvac-detailed-checklist";
import {
  MGPS_ALL_EQUIPMENT,
  MGPS_SITE_DETAILED_CHECKLIST,
  isMgpsSiteEquipment,
} from "./mgps-site-checklist";
import {
  buildNestedComponentChildren,
  isNestedParentEquipment,
} from "./nested-equipment-checklist";
import {
  EXTRA_SITES,
  getExtraSiteHospitals,
  type ExtraHospital,
  type SiteService,
} from "./extra-sites";
import { slugify } from "./utils";

import {
  EXCEL_MOT_DETAILED_CHECKLIST,
  EXCEL_MOT_EQUIPMENT,
} from "./excel-mot-checklist";
import { getExcelMgpsCatalog } from "./excel-mgps-checklist";

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

const OT_EQUIPMENT = [...OT_EQUIPMENT_LIST];
const MGPS_EQUIPMENT = [...MGPS_ALL_EQUIPMENT];

function id(prefix: string, index: number) {
  return `${prefix}${index.toString().padStart(24 - prefix.length, "0")}`;
}

function buildChecklistItems(equipmentId: string, names: string[]) {
  return names.map((name, i) => {
    const parentId = id(`ci${equipmentId.slice(-4)}`, i + 1);
    const children = isOtEquipmentName(name)
      ? OT_DETAILED_CHECKLIST[name].map((childName, j) => ({
          id: `${parentId}--${slugify(childName)}`,
          name: childName,
          order: j + 1,
        }))
      : isElectricalDetailedEquipment(name)
        ? ELECTRICAL_DETAILED_CHECKLIST[name].map((childName, j) => ({
            id: `${parentId}--${slugify(childName)}`,
            name: childName,
            order: j + 1,
          }))
        : isHvacDetailedEquipment(name)
          ? HVAC_DETAILED_CHECKLIST[name].map((childName, j) => ({
              id: `${parentId}--${slugify(childName)}`,
              name: childName,
              order: j + 1,
            }))
          : isMgpsSiteEquipment(name)
            ? MGPS_SITE_DETAILED_CHECKLIST[name].map((childName, j) => ({
                id: `${parentId}--${slugify(childName)}`,
                name: childName,
                order: j + 1,
              }))
          : isNestedParentEquipment(name)
            ? buildNestedComponentChildren(name, parentId)
            : undefined;

    return {
      id: parentId,
      equipmentId,
      name,
      slug: slugify(name),
      order: i + 1,
      ...(children ? { children } : {}),
    };
  });
}

function buildOtSection(sectionId: string, prefix: string) {
  const locations = Array.from({ length: 8 }, (_, i) => ({
    id: id(`loc${sectionId.slice(-4)}`, i + 1),
    sectionId,
    name: `OT-${i + 1}`,
    slug: slugify(`${prefix}-ot-${i + 1}`),
    order: i + 1,
  }));

  const equipment = locations.map((location) => {
    const equipmentId = id(`eq${location.id.slice(-6)}`, 1);
    return {
      id: equipmentId,
      sectionId,
      locationId: location.id,
      name: "OT Equipment Checklist",
      slug: `ot-equipment-${location.id}`,
      order: 1,
      checklistItems: buildChecklistItems(equipmentId, OT_EQUIPMENT),
    };
  });

  return { locations, equipment };
}

function buildSectionEquipment(sectionId: string, names: string[], label: string) {
  const equipmentId = id(`eq${sectionId.slice(-6)}`, 1);
  return [
    {
      id: equipmentId,
      sectionId,
      locationId: null,
      name: label,
      slug: slugify(label),
      order: 1,
      checklistItems: buildChecklistItems(equipmentId, names),
    },
  ];
}

const extraIds = {
  site: 2,
  dept: 10,
  sect: 20,
  loc: 100,
  eq: 100,
  ci: 1000,
};

function nextExtraId(kind: "xsi" | "xdp" | "xsc" | "xlc" | "xeq" | "xci") {
  const key =
    kind === "xsi"
      ? "site"
      : kind === "xdp"
        ? "dept"
        : kind === "xsc"
          ? "sect"
          : kind === "xlc"
            ? "loc"
            : kind === "xeq"
              ? "eq"
              : "ci";
  const value = extraIds[key];
  extraIds[key] += 1;
  return id(kind, value);
}

function buildExtraChecklistItems(
  equipmentId: string,
  names: readonly string[],
  detailed: Record<string, readonly string[]>
) {
  return names.map((name, i) => {
    const parentId = nextExtraId("xci");
    const checks = detailed[name];
    const children = checks?.map((childName, j) => ({
      id: `${parentId}--${slugify(childName)}`,
      name: childName,
      order: j + 1,
    }));

    return {
      id: parentId,
      equipmentId,
      name,
      slug: slugify(name),
      order: i + 1,
      ...(children?.length ? { children } : {}),
    };
  });
}

function buildExtraMotSection(sectionId: string, prefix: string) {
  const locations = Array.from({ length: 8 }, (_, i) => ({
    id: nextExtraId("xlc"),
    sectionId,
    name: `OT-${i + 1}`,
    slug: slugify(`${prefix}-ot-${i + 1}`),
    order: i + 1,
  }));

  const equipment = locations.map((location) => {
    const equipmentId = nextExtraId("xeq");
    return {
      id: equipmentId,
      sectionId,
      locationId: location.id,
      name: "OT Equipment Checklist",
      slug: `ot-equipment-${location.id}`,
      order: 1,
      checklistItems: buildExtraChecklistItems(
        equipmentId,
        EXCEL_MOT_EQUIPMENT,
        EXCEL_MOT_DETAILED_CHECKLIST
      ),
    };
  });

  return { locations, equipment };
}

function buildExtraMgpsEquipment(sectionId: string, departmentSlug: string) {
  const catalog = getExcelMgpsCatalog(departmentSlug);
  const equipmentId = nextExtraId("xeq");
  return [
    {
      id: equipmentId,
      sectionId,
      locationId: null,
      name: "MGPS Equipment",
      slug: "mgps-equipment",
      order: 1,
      checklistItems: buildExtraChecklistItems(equipmentId, catalog.names, catalog.detailed),
    },
  ];
}

function buildExtraHospitalSections(
  departmentId: string,
  hospital: ExtraHospital,
  prefix: string
) {
  return hospital.services.map((service: SiteService, index) => {
    const sectionId = nextExtraId("xsc");
    if (service === "MOT") {
      const mot = buildExtraMotSection(sectionId, prefix);
      return {
        id: sectionId,
        departmentId,
        name: "MOT",
        slug: "mot",
        order: index + 1,
        locations: mot.locations,
        equipment: mot.equipment,
      };
    }

    return {
      id: sectionId,
      departmentId,
      name: "MGPS",
      slug: "mgps",
      order: index + 1,
      locations: [],
      equipment: buildExtraMgpsEquipment(sectionId, hospital.slug),
    };
  });
}

function buildExtraSites() {
  extraIds.site = 2;
  extraIds.dept = 10;
  extraIds.sect = 20;
  extraIds.loc = 100;
  extraIds.eq = 100;
  extraIds.ci = 1000;

  return EXTRA_SITES.map((extra, siteIndex) => {
    const siteId = nextExtraId("xsi");
    const hospitals = getExtraSiteHospitals(extra);

    return {
      id: siteId,
      name: extra.name,
      slug: extra.slug,
      order: siteIndex + 2,
      departments: hospitals.map((hospital, deptIndex) => {
        const departmentId = nextExtraId("xdp");
        return {
          id: departmentId,
          siteId,
          name: hospital.name,
          slug: hospital.slug,
          order: deptIndex + 1,
          sections: buildExtraHospitalSections(
            departmentId,
            hospital,
            `${extra.slug}-${hospital.slug}`
          ),
        };
      }),
    };
  });
}

export function getStaticHierarchy() {
  const siteId = id("site", 1);
  const cndsId = id("dept", 1);
  const pmssyId = id("dept", 2);
  const otSectionId = id("sect", 1);
  const electricalSectionId = id("sect", 2);
  const hvacSectionId = id("sect", 3);
  const pmssyOtSectionId = id("sect", 4);
  const pmssyElectricalSectionId = id("sect", 6);
  const pmssyMgpsSectionId = id("sect", 5);

  const cndsOt = buildOtSection(otSectionId, "cnds");
  const pmssyOt = buildOtSection(pmssyOtSectionId, "pmssy");

  return [
    {
      id: siteId,
      name: "Kanpur",
      slug: "kanpur",
      order: 1,
      departments: [
        {
          id: cndsId,
          siteId,
          name: "CNDS",
          slug: "cnds",
          order: 1,
          sections: [
            {
              id: otSectionId,
              departmentId: cndsId,
              name: "Operation Theatres",
              slug: "operation-theatres",
              order: 1,
              locations: cndsOt.locations,
              equipment: cndsOt.equipment,
            },
            {
              id: electricalSectionId,
              departmentId: cndsId,
              name: "Electrical Section",
              slug: "electrical-section",
              order: 2,
              locations: [],
              equipment: buildSectionEquipment(
                electricalSectionId,
                ELECTRICAL_EQUIPMENT,
                "Electrical Equipment"
              ),
            },
            {
              id: hvacSectionId,
              departmentId: cndsId,
              name: "HVAC",
              slug: "hvac",
              order: 3,
              locations: [],
              equipment: buildSectionEquipment(hvacSectionId, HVAC_EQUIPMENT, "HVAC Equipment"),
            },
          ],
        },
        {
          id: pmssyId,
          siteId,
          name: "PMSSY",
          slug: "pmssy",
          order: 2,
          sections: [
            {
              id: pmssyOtSectionId,
              departmentId: pmssyId,
              name: "OT",
              slug: "ot",
              order: 1,
              locations: pmssyOt.locations,
              equipment: pmssyOt.equipment,
            },
            {
              id: pmssyElectricalSectionId,
              departmentId: pmssyId,
              name: "Electrical Section",
              slug: "electrical-section",
              order: 2,
              locations: [],
              equipment: buildSectionEquipment(
                pmssyElectricalSectionId,
                ELECTRICAL_EQUIPMENT,
                "Electrical Equipment"
              ),
            },
            {
              id: pmssyMgpsSectionId,
              departmentId: pmssyId,
              name: "MGPS",
              slug: "mgps",
              order: 3,
              locations: [],
              equipment: buildSectionEquipment(
                pmssyMgpsSectionId,
                MGPS_EQUIPMENT,
                "MGPS Equipment"
              ),
            },
          ],
        },
      ],
    },
    ...buildExtraSites(),
  ];
}

export function getStaticEquipment(sectionId: string, locationId?: string | null) {
  const hierarchy = getStaticHierarchy();

  for (const site of hierarchy) {
    for (const dept of site.departments) {
      for (const section of dept.sections) {
        if (section.id !== sectionId) continue;
        return section.equipment.filter((eq) =>
          locationId ? eq.locationId === locationId : eq.locationId === null
        );
      }
    }
  }

  return [];
}
