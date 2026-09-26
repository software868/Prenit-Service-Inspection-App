export const DIRECT_DEPARTMENT_SLUG = "direct";
export const KANPUR_SLUG = "kanpur";

export type SiteService = "MOT" | "MGPS";

export type ExtraHospital = {
  name: string;
  slug: string;
  services: SiteService[];
  otCount?: number;
};

export type ExtraSite = {
  name: string;
  slug: string;
  hospitals?: ExtraHospital[];
  services?: SiteService[];
  otCount?: number;
};

export const EXTRA_SITES: ExtraSite[] = [
  { name: "Vijayawada", slug: "vijayawada", services: ["MGPS"] },
  {
    name: "Gorakhpur",
    slug: "gorakhpur",
    hospitals: [
      { name: "AIIMS Gorakhpur", slug: "aiims-gorakhpur", services: ["MOT", "MGPS"], otCount: 15 },
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
  {
    name: "BHU",
    slug: "bhu",
    hospitals: [
      { name: "Emergency", slug: "bhu-emergency", services: ["MGPS"] },
      { name: "Pediatric", slug: "bhu-pediatric", services: ["MGPS"] },
      { name: "IPD", slug: "bhu-ipd", services: ["MGPS"] },
      { name: "Ayurveda", slug: "bhu-ayurveda", services: ["MGPS"] },
      { name: "MCH", slug: "bhu-mch", services: ["MGPS"] },
    ],
  },
  { name: "Bathinda", slug: "bathinda", services: ["MOT", "MGPS"], otCount: 16 },
  { name: "Kozhikode", slug: "kozhikode", services: ["MOT", "MGPS"], otCount: 19 },
  { name: "Burla", slug: "burla", services: ["MOT"], otCount: 9 },
  { name: "Alappuzha", slug: "alappuzha", services: ["MOT"], otCount: 8 },
  { name: "Ambala", slug: "ambala", services: ["MOT"], otCount: 2 },
  { name: "Bhavnagar", slug: "bhavnagar", services: ["MOT"] },
  { name: "Darbhanga", slug: "darbhanga", services: ["MOT"], otCount: 8 },
  { name: "Goa", slug: "goa", services: ["MGPS"] },
  { name: "Indore", slug: "indore", services: ["MOT"], otCount: 10 },
  { name: "Jaipur", slug: "jaipur", services: ["MOT"], otCount: 6 },
  { name: "Aurangabad", slug: "aurangabad", services: ["MGPS"] },
  { name: "Bellary", slug: "bellary", services: ["MGPS"] },
  { name: "Berhampur", slug: "berhampur", services: ["MGPS"] },
  { name: "Meerut", slug: "meerut", services: ["MGPS"] },
  { name: "Prayagraj", slug: "prayagraj", services: ["MGPS"] },
  { name: "Rewa", slug: "rewa", services: ["MGPS"] },
  { name: "Thanjavur", slug: "thanjavur", services: ["MGPS"] },
  { name: "Agra", slug: "agra", services: ["MOT", "MGPS"], otCount: 5 },
  { name: "Gaya", slug: "gaya", services: ["MOT", "MGPS"], otCount: 8 },
  { name: "Jhansi", slug: "jhansi", services: ["MGPS"] },
  { name: "Latur", slug: "latur", services: ["MOT", "MGPS"], otCount: 8 },
  { name: "Tirunelveli", slug: "tirunelveli", services: ["MGPS"] },
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
      otCount: site.otCount,
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
