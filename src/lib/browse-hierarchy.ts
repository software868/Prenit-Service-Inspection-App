import { EXCEL_MOT_EQUIPMENT } from "./excel-mot-checklist";
import { getExcelMgpsCatalog } from "./excel-mgps-checklist";
import {
  EXTRA_SITES,
  getExtraSiteHospitals,
  type ExtraHospital,
  type SiteService,
} from "./extra-sites";
import { MGPS_ALL_EQUIPMENT } from "./mgps-site-checklist";
import { OT_EQUIPMENT_LIST } from "./ot-detailed-checklist";
import { slugify } from "./utils";

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

function id(prefix: string, index: number) {
  return `${prefix}${index.toString().padStart(24 - prefix.length, "0")}`;
}

const extraIds = {
  site: 2,
  dept: 10,
  sect: 20,
  loc: 100,
  eq: 100,
};

function nextExtraId(kind: "xsi" | "xdp" | "xsc" | "xlc" | "xeq") {
  const key =
    kind === "xsi" ? "site" : kind === "xdp" ? "dept" : kind === "xsc" ? "sect" : kind === "xlc" ? "loc" : "eq";
  const value = extraIds[key];
  extraIds[key] += 1;
  return id(kind, value);
}

function parentItems(equipmentId: string, names: readonly string[]) {
  return names.map((name, i) => ({
    id: `${equipmentId}--${slugify(name)}`,
    name,
    slug: slugify(name),
    order: i + 1,
  }));
}

function buildOtSection(sectionId: string, prefix: string, names: readonly string[]) {
  const locations = Array.from({ length: 8 }, (_, i) => ({
    id: prefix.startsWith("cnds") || prefix.startsWith("pmssy")
      ? id(`loc${sectionId.slice(-4)}`, i + 1)
      : nextExtraId("xlc"),
    sectionId,
    name: `OT-${i + 1}`,
    slug: slugify(`${prefix}-ot-${i + 1}`),
    order: i + 1,
  }));

  const equipment = locations.map((location, index) => {
    const equipmentId =
      prefix.startsWith("cnds") || prefix.startsWith("pmssy")
        ? id(`eq${location.id.slice(-6)}`, 1)
        : nextExtraId("xeq");
    return {
      id: equipmentId,
      name: "OT Equipment Checklist",
      slug: `ot-equipment-${location.id}`,
      locationId: location.id,
      checklistItems: parentItems(equipmentId, names),
      order: index + 1,
    };
  });

  return { locations, equipment };
}

function buildSectionEquipment(
  sectionId: string,
  names: readonly string[],
  label: string,
  extra = false
) {
  const equipmentId = extra ? nextExtraId("xeq") : id(`eq${sectionId.slice(-6)}`, 1);
  return [
    {
      id: equipmentId,
      name: label,
      slug: slugify(label),
      locationId: null,
      checklistItems: parentItems(equipmentId, names),
    },
  ];
}

function buildExtraMotSection(sectionId: string, prefix: string, otCount = 8) {
  const locations = Array.from({ length: otCount }, (_, i) => ({
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
      name: "OT Equipment Checklist",
      slug: `ot-equipment-${location.id}`,
      locationId: location.id,
      checklistItems: parentItems(
        equipmentId,
        EXCEL_MOT_EQUIPMENT
      ),
    };
  });

  return { locations, equipment };
}

function buildExtraHospitalSections(
  departmentId: string,
  hospital: ExtraHospital,
  prefix: string
) {
  return hospital.services.map((service: SiteService, index) => {
    const sectionId = nextExtraId("xsc");
    if (service === "MOT") {
      const mot = buildExtraMotSection(sectionId, prefix, hospital.otCount || 8);
      return {
        id: sectionId,
        name: "MOT",
        slug: "mot",
        locations: mot.locations,
        equipment: mot.equipment,
        order: index + 1,
      };
    }

    const catalog = getExcelMgpsCatalog(hospital.slug);
    return {
      id: sectionId,
      name: "MGPS",
      slug: "mgps",
      locations: [],
      equipment: buildSectionEquipment(sectionId, catalog.names, "MGPS Equipment", true),
      order: index + 1,
    };
  });
}

function buildExtraSites() {
  extraIds.site = 2;
  extraIds.dept = 10;
  extraIds.sect = 20;
  extraIds.loc = 100;
  extraIds.eq = 100;

  return EXTRA_SITES.map((extra, siteIndex) => {
    const siteId = nextExtraId("xsi");
    const hospitals = getExtraSiteHospitals(extra);
    return {
      id: siteId,
      name: extra.name,
      slug: extra.slug,
      departments: hospitals.map((hospital, deptIndex) => {
        const departmentId = nextExtraId("xdp");
        return {
          id: departmentId,
          name: hospital.name,
          slug: hospital.slug,
          sections: buildExtraHospitalSections(
            departmentId,
            hospital,
            `${extra.slug}-${hospital.slug}`
          ),
          order: deptIndex + 1,
        };
      }),
      order: siteIndex + 2,
    };
  });
}

export function getBrowseHierarchy() {
  const siteId = id("site", 1);
  const cndsId = id("dept", 1);
  const pmssyId = id("dept", 2);
  const otSectionId = id("sect", 1);
  const electricalSectionId = id("sect", 2);
  const hvacSectionId = id("sect", 3);
  const pmssyOtSectionId = id("sect", 4);
  const pmssyElectricalSectionId = id("sect", 6);
  const pmssyMgpsSectionId = id("sect", 5);

  const cndsOt = buildOtSection(otSectionId, "cnds", OT_EQUIPMENT_LIST);
  const pmssyOt = buildOtSection(pmssyOtSectionId, "pmssy", OT_EQUIPMENT_LIST);

  return [
    {
      id: siteId,
      name: "Kanpur",
      slug: "kanpur",
      departments: [
        {
          id: cndsId,
          name: "CNDS",
          slug: "cnds",
          sections: [
            {
              id: otSectionId,
              name: "Operation Theatres",
              slug: "operation-theatres",
              locations: cndsOt.locations,
              equipment: cndsOt.equipment,
            },
            {
              id: electricalSectionId,
              name: "Electrical Section",
              slug: "electrical-section",
              locations: [],
              equipment: buildSectionEquipment(
                electricalSectionId,
                ELECTRICAL_EQUIPMENT,
                "Electrical Equipment"
              ),
            },
            {
              id: hvacSectionId,
              name: "HVAC",
              slug: "hvac",
              locations: [],
              equipment: buildSectionEquipment(hvacSectionId, HVAC_EQUIPMENT, "HVAC Equipment"),
            },
          ],
        },
        {
          id: pmssyId,
          name: "PMSSY",
          slug: "pmssy",
          sections: [
            {
              id: pmssyOtSectionId,
              name: "OT",
              slug: "ot",
              locations: pmssyOt.locations,
              equipment: pmssyOt.equipment,
            },
            {
              id: pmssyElectricalSectionId,
              name: "Electrical Section",
              slug: "electrical-section",
              locations: [],
              equipment: buildSectionEquipment(
                pmssyElectricalSectionId,
                ELECTRICAL_EQUIPMENT,
                "Electrical Equipment"
              ),
            },
            {
              id: pmssyMgpsSectionId,
              name: "MGPS",
              slug: "mgps",
              locations: [],
              equipment: buildSectionEquipment(
                pmssyMgpsSectionId,
                MGPS_ALL_EQUIPMENT,
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
