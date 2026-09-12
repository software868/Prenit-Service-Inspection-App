import { prisma } from "@/lib/prisma";
import { generateReportNumber } from "@/lib/utils";
import type { ChecklistItemResponse } from "@/lib/types";
import { AttachmentType, ChecklistStatus, ReportStatus } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
  engineerName: string;
  breadcrumb: string;
  status: "DRAFT" | "SUBMITTED";
  responses: ChecklistItemResponse[];
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

async function resolveInspectionIds(input: SaveReportInput) {
  const site =
    (input.siteSlug
      ? await prisma.site.findFirst({ where: { slug: input.siteSlug } })
      : null) ||
    (isMongoObjectId(input.siteId)
      ? await prisma.site.findUnique({ where: { id: input.siteId } })
      : null) ||
    (input.siteName
      ? await prisma.site.findFirst({ where: { name: input.siteName } })
      : null);

  if (!site) {
    throw new Error("Site not found for this inspection");
  }

  const department =
    (input.departmentSlug
      ? await prisma.department.findFirst({
          where: { siteId: site.id, slug: input.departmentSlug },
        })
      : null) ||
    (isMongoObjectId(input.departmentId)
      ? await prisma.department.findFirst({
          where: { id: input.departmentId, siteId: site.id },
        })
      : null) ||
    (input.departmentName
      ? await prisma.department.findFirst({
          where: { siteId: site.id, name: input.departmentName },
        })
      : null);

  if (!department) {
    throw new Error("Department not found for this inspection");
  }

  const section =
    (input.sectionSlug
      ? await prisma.section.findFirst({
          where: { departmentId: department.id, slug: input.sectionSlug },
        })
      : null) ||
    (isMongoObjectId(input.sectionId)
      ? await prisma.section.findFirst({
          where: { id: input.sectionId, departmentId: department.id },
        })
      : null) ||
    (input.sectionName
      ? await prisma.section.findFirst({
          where: { departmentId: department.id, name: input.sectionName },
        })
      : null);

  if (!section) {
    throw new Error("Section not found for this inspection");
  }

  const wantsLocation = Boolean(input.locationSlug || input.locationName || input.locationId);
  const location = wantsLocation
    ? (input.locationSlug
        ? await prisma.location.findFirst({
            where: { sectionId: section.id, slug: input.locationSlug },
          })
        : null) ||
      (isMongoObjectId(input.locationId)
        ? await prisma.location.findFirst({
            where: { id: input.locationId, sectionId: section.id },
          })
        : null) ||
      (input.locationName
        ? await prisma.location.findFirst({
            where: {
              sectionId: section.id,
              OR: [
                { name: input.locationName },
                { slug: { endsWith: slugify(input.locationName) } },
              ],
            },
          })
        : null)
    : null;

  if (wantsLocation && !location) {
    throw new Error("Location not found for this inspection");
  }

  const equipment = location
    ? await prisma.equipment.findFirst({
        where: { sectionId: section.id, locationId: location.id },
        orderBy: { order: "asc" },
      })
    : await prisma.equipment.findFirst({
        where: { sectionId: section.id, locationId: null },
        orderBy: { order: "asc" },
      });

  if (!equipment) {
    throw new Error("Equipment not found for this inspection");
  }

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
  fileName: string
) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return;

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const uploadDir = path.join(process.cwd(), "public", "uploads", reportId);
  await mkdir(uploadDir, { recursive: true });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `/uploads/${reportId}/${safeName}`;
  await writeFile(path.join(process.cwd(), "public", "uploads", reportId, safeName), buffer);

  await prisma.attachment.create({
    data: {
      reportId,
      checklistItemId: checklistItemId || undefined,
      type,
      fileName: safeName,
      filePath,
      mimeType,
      size: buffer.length,
    },
  });
}

export async function saveServiceReport(input: SaveReportInput) {
  const status =
    input.status === "SUBMITTED" ? ReportStatus.SUBMITTED : ReportStatus.DRAFT;

  const ids = await resolveInspectionIds(input);

  const reportData = {
    siteId: ids.siteId,
    departmentId: ids.departmentId,
    sectionId: ids.sectionId,
    locationId: ids.locationId,
    equipmentId: ids.equipmentId,
    engineerName: input.engineerName,
    breadcrumb: input.breadcrumb,
    status,
    submittedAt: status === ReportStatus.SUBMITTED ? new Date() : null,
  };

  let report;
  const existingId = isMongoObjectId(input.id) ? input.id : undefined;

  if (existingId) {
    report = await prisma.serviceReport.update({
      where: { id: existingId },
      data: reportData,
    });

    await prisma.checklistResponse.deleteMany({ where: { reportId: report.id } });
    await prisma.attachment.deleteMany({ where: { reportId: report.id } });
  } else {
    report = await prisma.serviceReport.create({
      data: {
        ...reportData,
        reportNumber: generateReportNumber(),
      },
    });
  }

  for (const response of input.responses) {
    const checklistItemId =
      response.checklistItemId && /^[a-f0-9]{24}$/i.test(response.checklistItemId)
        ? response.checklistItemId
        : null;

    await prisma.checklistResponse.create({
      data: {
        reportId: report.id,
        checklistItemId,
        itemName: response.name,
        status: response.status
          ? (response.status as ChecklistStatus)
          : null,
        remarks: response.remarks || null,
      },
    });

    if (response.photoData) {
      await saveAttachment(
        report.id,
        response.checklistItemId,
        AttachmentType.PHOTO,
        response.photoData,
        response.photoFileName || `photo-${response.checklistItemId}.jpg`
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
    include: {
      site: true,
      responses: { include: { checklistItem: true } },
      attachments: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getReportById(id: string) {
  return prisma.serviceReport.findUnique({
    where: { id },
    include: {
      site: true,
      responses: {
        include: { checklistItem: true },
        orderBy: { checklistItem: { order: "asc" } },
      },
      attachments: true,
    },
  });
}
