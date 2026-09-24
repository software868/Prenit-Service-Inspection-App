import { getSessionUser } from "@/lib/auth";
import { getReports, saveServiceReport } from "@/lib/report-service";
import { ReportStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ReportStatus | null;
    const siteId = searchParams.get("siteId") || undefined;
    const search = searchParams.get("search") || undefined;

    const reports = await getReports({
      status: status || undefined,
      siteId,
      search,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const body = await request.json();
    const report = await saveServiceReport({
      ...body,
      engineerName: session.name,
      engineerId: session.id,
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to save report:", error);
    const message = error instanceof Error ? error.message : "Failed to save report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
