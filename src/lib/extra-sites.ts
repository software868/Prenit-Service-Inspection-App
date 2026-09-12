export const DIRECT_DEPARTMENT_SLUG = "direct";
export const KANPUR_SLUG = "kanpur";

export type SiteService = "MOT" | "MGPS";

export type ExtraHospital = {
  name: string;
  slug: string;
  services: SiteService[];
};

export type ExtraSite = {
  name: string;
  slug: string;
  hospitals?: ExtraHospital[];
  services?: SiteService[];
};

export const EXTRA_SITES: ExtraSite[] = [
  { name: "Vijayawada", slug: "vijayawada", services: ["MGPS"] },
  {
    name: "Gorakhpur",
    slug: "gorakhpur",
    hospitals: [
      { name: "AIIMS Gorakhpur", slug: "aiims-gorakhpur", services: ["MOT", "MGPS"] },
      { name: "BRD Gorakhpur", slug: "brd-gorakhpur", services: ["MGPS"] },
    ],
  },
  {
    name: "Kota",
    slug: "kota",
    hospitals: [
      { name: "GMC Kota", slug: "gmc-kota", services: ["MGPS"] },
      { name: "NMCH Kota", slug: "nmch-kota", services: ["MGPS"] },
    ],
  },
  { name: "BHU", slug: "bhu", services: ["MGPS"] },
  { name: "Bathinda", slug: "bathinda", services: ["MOT", "MGPS"] },
  { name: "Kozhikode", slug: "kozhikode", services: ["MOT", "MGPS"] },
  { name: "Burla", slug: "burla", services: ["MOT"] },
  { name: "Alappuzha", slug: "alappuzha", services: ["MOT"] },
  { name: "Ambala", slug: "ambala", services: ["MOT"] },
  { name: "Bhavnagar", slug: "bhavnagar", services: ["MOT"] },
  { name: "Darbhanga", slug: "darbhanga", services: ["MOT"] },
  { name: "Goa", slug: "goa", services: ["MOT", "MGPS"] },
  { name: "Indore", slug: "indore", services: ["MOT"] },
  { name: "Jaipur", slug: "jaipur", services: ["MOT"] },
  { name: "Aurangabad", slug: "aurangabad", services: ["MGPS"] },
  { name: "Bellary", slug: "bellary", services: ["MGPS"] },
  { name: "Berhampur", slug: "berhampur", services: ["MGPS"] },
  { name: "Meerut", slug: "meerut", services: ["MGPS"] },
  { name: "Prayagraj", slug: "prayagraj", services: ["MGPS"] },
  { name: "Rewa", slug: "rewa", services: ["MGPS"] },
  { name: "Thanjavur", slug: "thanjavur", services: ["MGPS"] },
  { name: "Agra", slug: "agra", services: ["MOT", "MGPS"] },
  { name: "Gaya", slug: "gaya", services: ["MOT", "MGPS"] },
  { name: "Jhansi", slug: "jhansi", services: ["MOT", "MGPS"] },
  { name: "Latur", slug: "latur", services: ["MOT", "MGPS"] },
  { name: "Tirunelveli", slug: "tirunelveli", services: ["MOT", "MGPS"] },
];

export function isDirectDepartment(slug?: string | null) {
  return slug === DIRECT_DEPARTMENT_SLUG;
}

export function isKanpurSite(slug?: string | null) {
  return slug === KANPUR_SLUG;
}

export function getExtraSiteHospitals(site: ExtraSite): ExtraHospital[] {
  if (site.hospitals?.length) return site.hospitals;
  return [
    {
      name: site.name,
      slug: DIRECT_DEPARTMENT_SLUG,
      services: site.services || [],
    },
  ];
}

export function formatServiceNames(names: string[]) {
  return names
    .map((name) => (name === "Operation Theatres" || name === "OT" ? "MOT" : name))
    .join(" + ");
}

export function getInspectionBreadcrumb(parts: {
  siteName: string;
  departmentName: string;
  departmentSlug?: string;
  rest: string[];
}) {
  const start = isDirectDepartment(parts.departmentSlug)
    ? [parts.siteName]
    : [parts.siteName, parts.departmentName];
  return [...start, ...parts.rest].filter(Boolean).join(" > ");
}

export function getSiteHomeSubtitle(site: {
  slug: string;
  departments: { name: string; slug: string; sections: { name: string }[] }[];
}) {
  if (isKanpurSite(site.slug)) {
    return `${site.departments.length} departments`;
  }

  const namedHospitals = site.departments.filter((dept) => !isDirectDepartment(dept.slug));
  if (namedHospitals.length >= 2) {
    return `${namedHospitals.length} Hospitals`;
  }
  if (namedHospitals.length === 1) {
    return namedHospitals[0].name;
  }

  return formatServiceNames(
    site.departments.flatMap((dept) => dept.sections.map((section) => section.name))
  );
}

export function getNavBreadcrumbs(args: {
  siteId: string;
  siteName?: string;
  departmentId: string;
  departmentName?: string;
  departmentSlug?: string;
  section?: { id: string; name?: string };
  current: string;
}) {
  const hideHospital = isDirectDepartment(args.departmentSlug);
  const cityHref = hideHospital
    ? `/sites/${args.siteId}/departments/${args.departmentId}`
    : `/sites/${args.siteId}`;

  const crumbs: { label: string; href?: string }[] = [
    { label: args.siteName || "Site", href: cityHref },
  ];

  if (!hideHospital) {
    crumbs.push({
      label: args.departmentName || "Hospital",
      href: `/sites/${args.siteId}/departments/${args.departmentId}`,
    });
  }

  if (args.section) {
    crumbs.push({
      label: args.section.name || "Section",
      href: `/sites/${args.siteId}/departments/${args.departmentId}/sections/${args.section.id}`,
    });
  }

  crumbs.push({ label: args.current });
  return crumbs;
}
