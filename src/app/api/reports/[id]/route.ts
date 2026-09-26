import { getSessionUser } from "@/lib/auth";
import { getReportById, saveReportSubmitLocation } from "@/lib/report-service";
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

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getReportById(id);
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    const report = await saveReportSubmitLocation(id, body.submitLocation);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to save report location:", error);
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }
}
