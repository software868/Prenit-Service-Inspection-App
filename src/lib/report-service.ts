import { uploadInspectionImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { resolveSubmitLocation } from "@/lib/reverse-geocode";
import type { StoredSubmitLocation } from "@/lib/geo";
import { generateReportNumber } from "@/lib/utils";
import type { ChecklistItemResponse, SubmitLocationInput } from "@/lib/types";
import { AttachmentType, Prisma, ReportStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function newObjectId() {
  return randomBytes(12).toString("hex");
}

function oid(id: string) {
  return { $oid: id };
}

function mongoDate(date = new Date()) {
  return { $date: date.toISOString() };
}

async function rawCommand(command: Prisma.InputJsonObject) {
  await prisma.$runCommandRaw(command);
}

interface SaveReportInput {
  id?: string;
  siteId: string;
  siteSlug?: string;
  siteName?: string;
  departmentId: string;
  departmentSlug?: string;
  departmentName?: string;
  sectionId: string;
  sectionSlug?: string;
  sectionName?: string;
  locationId?: string;
  locationSlug?: string;
  locationName?: string;
  equipmentId: string;
  engineerId?: string;
  engineerName: string;
  breadcrumb: string;
  status: "DRAFT" | "SUBMITTED";
  responses: ChecklistItemResponse[];
  submitLocation?: SubmitLocationInput | null;
}

function isMongoObjectId(value?: string | null): value is string {
  return Boolean(value && /^[a-f0-9]{24}$/i.test(value));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureSite(name: string, slug: string) {
  const existing =
    (await prisma.site.findFirst({ where: { slug } })) ||
    (await prisma.site.findFirst({ where: { name } }));
  if (existing) return existing;

  const id = newObjectId();
  const now = mongoDate();
  await rawCommand({
    insert: "Site",
    documents: [{ _id: oid(id), name, slug, order: 0, createdAt: now, updatedAt: now }],
  });
  const created = await prisma.site.findUnique({ where: { id } });
  if (!created) throw new Error("Could not save site");
  return created;
}

async function ensureDepartment(siteId: string, name: string, slug: string) {
  const existing = await prisma.department.findFirst({
    where: { siteId, OR: [{ slug }, { name }] },
  });
  if (existing) return existing;

  const id = newObjectId();
  const now = mongoDate();
  await rawCommand({
    insert: "Department",
    documents: [
      {
        _id: oid(id),
        siteId: oid(siteId),
        name,
        slug,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  const created = await prisma.department.findUnique({ where: { id } });
  if (!created) throw new Error("Could not save department");
  return created;
}

async function ensureSection(departmentId: string, name: string, slug: string) {
  const existing = await prisma.section.findFirst({
    where: { departmentId, OR: [{ slug }, { name }] },
  });
  if (existing) return existing;

  const id = newObjectId();
  const now = mongoDate();
  await rawCommand({
    insert: "Section",
    documents: [
      {
        _id: oid(id),
        departmentId: oid(departmentId),
        name,
        slug,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  const created = await prisma.section.findUnique({ where: { id } });
  if (!created) throw new Error("Could not save section");
  return created;
}

async function ensureLocation(sectionId: string, name: string, slug: string) {
  const existing = await prisma.location.findFirst({
    where: { sectionId, OR: [{ slug }, { name }] },
  });
  if (existing) return existing;

  const id = newObjectId();
  const now = mongoDate();
  await rawCommand({
    insert: "Location",
    documents: [
      {
        _id: oid(id),
        sectionId: oid(sectionId),
        name,
        slug,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  const created = await prisma.location.findUnique({ where: { id } });
  if (!created) throw new Error("Could not save location");
  return created;
}

async function ensureEquipment(
  sectionId: string,
  locationId: string | null,
  name: string,
  slug: string
) {
  const existing = await prisma.equipment.findFirst({
    where: { sectionId, locationId, slug },
  });
  if (existing) return existing;

  const id = newObjectId();
  const now = mongoDate();
  await rawCommand({
    insert: "Equipment",
    documents: [
      {
        _id: oid(id),
        sectionId: oid(sectionId),
        locationId: locationId ? oid(locationId) : null,
        name,
        slug,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  const created = await prisma.equipment.findUnique({ where: { id } });
  if (!created) throw new Error("Could not save equipment");
  return created;
}

async function resolveInspectionIds(input: SaveReportInput) {
  const siteName = input.siteName?.trim() || "Site";
  const siteSlug = input.siteSlug?.trim() || slugify(siteName);
  const site = await ensureSite(siteName, siteSlug);

  const departmentName = input.departmentName?.trim() || "Department";
  const departmentSlug = input.departmentSlug?.trim() || slugify(departmentName);
  const department = await ensureDepartment(site.id, departmentName, departmentSlug);

  const sectionName = input.sectionName?.trim() || "Section";
  const sectionSlug = input.sectionSlug?.trim() || slugify(sectionName);
  const section = await ensureSection(department.id, sectionName, sectionSlug);

  const wantsLocation = Boolean(input.locationName || input.locationSlug);
  const location = wantsLocation
    ? await ensureLocation(
        section.id,
        input.locationName?.trim() || "Location",
        input.locationSlug?.trim() || slugify(input.locationName || "location")
      )
    : null;

  const equipmentName = "Inspection";
  const equipmentSlug = location ? `inspection-${location.slug}` : "inspection";
  const equipment = await ensureEquipment(
    section.id,
    location?.id ?? null,
    equipmentName,
    equipmentSlug
  );

  return {
    siteId: site.id,
    departmentId: department.id,
    sectionId: section.id,
    locationId: location?.id ?? null,
    equipmentId: equipment.id,
  };
}

async function saveAttachment(
  reportId: string,
  checklistItemId: string | null,
  type: AttachmentType,
  dataUrl: string,
  fileName: string,
  itemName = ""
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const storedName =
    type === AttachmentType.PHOTO && itemName ? `${itemName}::${safeName}` : safeName;

  let filePath = "";
  let mimeType = "application/octet-stream";
  let size = 0;

  if (type === AttachmentType.PHOTO && /^https?:\/\//i.test(dataUrl)) {
    filePath = dataUrl;
    mimeType = "image/jpeg";
  } else {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return;

    mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    size = buffer.length;

    if (type === AttachmentType.PHOTO) {
      const uploaded = await uploadInspectionImage(buffer);
      filePath = uploaded.secure_url;
    } else {
      const uploadDir = path.join(process.cwd(), "public", "uploads", reportId);
      await mkdir(uploadDir, { recursive: true });
      filePath = `/uploads/${reportId}/${safeName}`;
      await writeFile(
        path.join(process.cwd(), "public", "uploads", reportId, safeName),
        buffer
      );
    }
  }

  await rawCommand({
    insert: "Attachment",
    documents: [
      {
        _id: oid(newObjectId()),
        reportId: oid(reportId),
        checklistItemId: checklistItemId || null,
        type,
        fileName: storedName,
        filePath,
        mimeType,
        size,
        createdAt: mongoDate(),
      },
    ],
  });
}

function submitLocationDoc(location: StoredSubmitLocation | null) {
  if (!location) {
    return {
      submitLatitude: null,
      submitLongitude: null,
      submitAccuracy: null,
      submitAddress: null,
      submitMapUrl: null,
      submitLocationAt: null,
    };
  }

  return {
    submitLatitude: location.latitude,
    submitLongitude: location.longitude,
    submitAccuracy: location.accuracy,
    submitAddress: location.address,
    submitMapUrl: location.mapUrl,
    submitLocationAt: mongoDate(location.capturedAt),
  };
}

export async function saveServiceReport(input: SaveReportInput) {
  const status =
    input.status === "SUBMITTED" ? ReportStatus.SUBMITTED : ReportStatus.DRAFT;

  const ids = await resolveInspectionIds(input);
  const resolvedLocation =
    status === ReportStatus.SUBMITTED
      ? await resolveSubmitLocation(input.submitLocation)
      : null;

  const reportData = {
    siteId: ids.siteId,
    departmentId: ids.departmentId,
    sectionId: ids.sectionId,
    locationId: ids.locationId,
    equipmentId: ids.equipmentId,
    engineerId: isMongoObjectId(input.engineerId) ? input.engineerId : undefined,
    engineerName: input.engineerName,
    breadcrumb: input.breadcrumb,
    status,
    submittedAt: status === ReportStatus.SUBMITTED ? new Date() : null,
  };

  const now = mongoDate();
  const existingId = isMongoObjectId(input.id) ? input.id : undefined;
  let reportId = existingId;

  const reportDoc = {
    siteId: oid(reportData.siteId),
    departmentId: oid(reportData.departmentId),
    sectionId: oid(reportData.sectionId),
    locationId: reportData.locationId ? oid(reportData.locationId) : null,
    equipmentId: oid(reportData.equipmentId),
    engineerId: reportData.engineerId ? oid(reportData.engineerId) : null,
    engineerName: reportData.engineerName,
    breadcrumb: reportData.breadcrumb,
    status: reportData.status,
    submittedAt: reportData.submittedAt ? mongoDate(reportData.submittedAt) : null,
    updatedAt: now,
    ...(resolvedLocation ? submitLocationDoc(resolvedLocation) : {}),
  };

  if (existingId) {
    await rawCommand({
      update: "ServiceReport",
      updates: [{ q: { _id: oid(existingId) }, u: { $set: reportDoc } }],
    });
    await rawCommand({
      delete: "ChecklistResponse",
      deletes: [{ q: { reportId: oid(existingId) }, limit: 0 }],
    });
    await rawCommand({
      delete: "Attachment",
      deletes: [{ q: { reportId: oid(existingId) }, limit: 0 }],
    });
  } else {
    reportId = newObjectId();
    await rawCommand({
      insert: "ServiceReport",
      documents: [
        {
          _id: oid(reportId),
          ...reportDoc,
          reportNumber: generateReportNumber(),
          createdAt: now,
        },
      ],
    });
  }

  const report = { id: reportId! };

  for (const response of input.responses) {
    const statusValue =
      response.status === "OK" || response.status === "NOT_OK" || response.status === "NA"
        ? response.status
        : null;

    await rawCommand({
      insert: "ChecklistResponse",
      documents: [
        {
          _id: oid(newObjectId()),
          reportId: oid(report.id),
          itemName: response.name,
          status: statusValue,
          remarks: response.remarks || null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    if (response.photoData) {
      await saveAttachment(
        report.id,
        response.checklistItemId,
        AttachmentType.PHOTO,
        response.photoData,
        response.photoFileName || `photo-${response.checklistItemId}.jpg`,
        response.name
      );
    }

    if (response.audioData) {
      await saveAttachment(
        report.id,
        response.checklistItemId,
        AttachmentType.AUDIO,
        response.audioData,
        response.audioFileName || `audio-${response.checklistItemId}.webm`
      );
    }
  }

  return prisma.serviceReport.findUnique({
    where: { id: report.id },
    include: {
      responses: {
        include: { checklistItem: true },
        orderBy: { checklistItem: { order: "asc" } },
      },
      attachments: true,
      site: true,
    },
  });
}

export async function getReports(filters?: {
  status?: ReportStatus;
  siteId?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.siteId) where.siteId = filters.siteId;
  if (filters?.search) {
    where.OR = [
      { reportNumber: { contains: filters.search, mode: "insensitive" } },
      { engineerName: { contains: filters.search, mode: "insensitive" } },
      { breadcrumb: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.serviceReport.findMany({
    where,
    select: {
      id: true,
      reportNumber: true,
      breadcrumb: true,
      engineerName: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      site: { select: { id: true, name: true } },
      responses: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function parseMongoDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value !== null && "$date" in value) {
    return parseMongoDate((value as { $date: unknown }).$date);
  }
  return null;
}

async function readSubmitLocationFields(id: string) {
  const empty = {
    submitLatitude: null as number | null,
    submitLongitude: null as number | null,
    submitAccuracy: null as number | null,
    submitAddress: null as string | null,
    submitMapUrl: null as string | null,
    submitLocationAt: null as Date | null,
  };

  try {
    const result = (await prisma.$runCommandRaw({
      find: "ServiceReport",
      filter: { _id: oid(id) },
      projection: {
        submitLatitude: 1,
        submitLongitude: 1,
        submitAccuracy: 1,
        submitAddress: 1,
        submitMapUrl: 1,
        submitLocationAt: 1,
      },
      limit: 1,
    })) as { cursor?: { firstBatch?: Record<string, unknown>[] } };

    const doc = result.cursor?.firstBatch?.[0];
    if (!doc) return empty;

    return {
      submitLatitude: typeof doc.submitLatitude === "number" ? doc.submitLatitude : null,
      submitLongitude: typeof doc.submitLongitude === "number" ? doc.submitLongitude : null,
      submitAccuracy: typeof doc.submitAccuracy === "number" ? doc.submitAccuracy : null,
      submitAddress: typeof doc.submitAddress === "string" ? doc.submitAddress : null,
      submitMapUrl: typeof doc.submitMapUrl === "string" ? doc.submitMapUrl : null,
      submitLocationAt: parseMongoDate(doc.submitLocationAt),
    };
  } catch {
    return empty;
  }
}

export async function getReportById(id: string) {
  const report = await prisma.serviceReport.findUnique({
    where: { id },
    include: {
      site: { select: { id: true, name: true } },
      attachments: {
        select: { type: true, fileName: true, filePath: true },
      },
      responses: {
        select: {
          id: true,
          status: true,
          remarks: true,
          itemName: true,
          checklistItem: { select: { name: true, order: true } },
        },
        orderBy: { checklistItem: { order: "asc" } },
      },
    },
  });

  if (!report) return null;

  const location = await readSubmitLocationFields(id);
  return { ...report, ...location };
}

export async function saveReportSubmitLocation(reportId: string, rawLocation: unknown) {
  if (!isMongoObjectId(reportId)) return null;

  const resolved = await resolveSubmitLocation(rawLocation);
  if (!resolved) return getReportById(reportId);

  await rawCommand({
    update: "ServiceReport",
    updates: [
      {
        q: { _id: oid(reportId) },
        u: {
          $set: {
            ...submitLocationDoc(resolved),
            updatedAt: mongoDate(),
          },
        },
      },
    ],
  });

  return getReportById(reportId);
}
