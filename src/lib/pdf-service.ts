import { fetchStaticMapImage } from "@/lib/reverse-geocode";
import { formatAccuracy, formatCoordinates } from "@/lib/geo";
import { formatDateOnly, formatTimeOnly } from "@/lib/utils";
import type { ServiceReport } from "@prisma/client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type ReportWithRelations = ServiceReport & {
  site: { name: string };
  submitLatitude?: number | null;
  submitLongitude?: number | null;
  submitAccuracy?: number | null;
  submitAddress?: string | null;
  submitMapUrl?: string | null;
  submitLocationAt?: Date | string | null;
  responses: {
    status: string | null;
    remarks: string | null;
    itemName: string;
    checklistItem: { name: string; order: number } | null;
  }[];
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateReportPDF(report: ReportWithRelations): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Prenit Service Inspection Report", 14, 12);
  doc.setFontSize(10);
  doc.text(report.reportNumber, 14, 20);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  let y = 38;

  const details = [
    ["Site", report.site.name],
    ["Path", report.breadcrumb],
    ["Engineer", report.engineerName],
    ["Status", report.status],
    ["Created", formatDateTime(report.createdAt)],
    ["Submitted", formatDateTime(report.submittedAt)],
  ];

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value), pageWidth - 60);
    doc.text(lines, 50, y);
    y += Math.max(6, lines.length * 5);
  });

  y += 4;

  const lat = report.submitLatitude;
  const lng = report.submitLongitude;
  if (lat != null && lng != null) {
    const mapBuffer = await fetchStaticMapImage(lat, lng);
    const mapHeight = mapBuffer ? 38 : 0;
    const address = report.submitAddress || "Pinned GPS location";
    const addressLines = doc.splitTextToSize(address, pageWidth - 40);
    const textBlock = addressLines.length * 4 + 8;
    const cardHeight = 12 + mapHeight + textBlock;
    if (y + cardHeight > 270) {
      doc.addPage();
      y = 18;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Inspection Location", 18, y + 6);

    if (mapBuffer) {
      try {
        const dataUrl = `data:image/png;base64,${mapBuffer.toString("base64")}`;
        doc.addImage(dataUrl, "PNG", 18, y + 9, pageWidth - 36, 34, undefined, "FAST");
        doc.setFillColor(220, 38, 38);
        doc.circle(pageWidth / 2, y + 26, 2.2, "F");

        const stamp = report.submitLocationAt || report.submittedAt || report.createdAt;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, y + 11, 42, 12, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(formatTimeOnly(stamp), 22, y + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(formatDateOnly(stamp), 22, y + 20);
      } catch {
        // address block still prints if the map image is invalid
      }
    }

    const textY = y + 10 + mapHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(addressLines, 18, textY);

    const accuracy = formatAccuracy(report.submitAccuracy);
    const meta = [
      formatCoordinates(lat, lng),
      accuracy,
      report.submitLocationAt ? formatDateTime(report.submitLocationAt) : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(meta, 18, textY + addressLines.length * 4);

    y += cardHeight + 6;
  }

  const tableData = report.responses
    .sort((a, b) => (a.checklistItem?.order ?? 0) - (b.checklistItem?.order ?? 0))
    .map((r, i) => [
      String(i + 1),
      r.itemName || r.checklistItem?.name || "-",
      r.status || "-",
      r.remarks || "-",
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Checklist Item", "Status", "Remarks"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 62 },
      2: { cellWidth: 22 },
      3: { cellWidth: 88 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated by Prenit Service Inspection App", 14, finalY + 10);

  return Buffer.from(doc.output("arraybuffer"));
}
