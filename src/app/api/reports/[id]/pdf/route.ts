import { getReportById } from "@/lib/report-service";
import { generateReportPDF } from "@/lib/pdf-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const pdfBuffer = await generateReportPDF(report);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.reportNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
