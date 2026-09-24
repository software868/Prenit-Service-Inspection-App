import { getSessionUser } from "@/lib/auth";
import { uploadInspectionImage } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a photo to upload" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      return NextResponse.json({ error: "Only photo files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Photo must be under 8 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadInspectionImage(buffer);

    return NextResponse.json({
      url: uploaded.secure_url,
      fileName: file.name,
      bytes: uploaded.bytes,
    });
  } catch (error) {
    console.error("Photo upload failed:", error);
    return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
  }
}
