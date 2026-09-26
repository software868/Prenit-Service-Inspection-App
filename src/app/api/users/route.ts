import { findUserByEmail, getSessionUser, hashPassword, insertUserDocument } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "ADMIN" ? UserRole.ADMIN : UserRole.ENGINEER;

  if (!name || !email || password.length < 4) {
    return NextResponse.json(
      { error: "Name, email, and a password (min 4 characters) are required" },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  await insertUserDocument({
    name,
    email,
    role: role === UserRole.ADMIN ? "ADMIN" : "ENGINEER",
    passwordHash: hashPassword(password),
  });

  const user = await findUserByEmail(email);
  return NextResponse.json(
    user
      ? { id: user.id, name: user.name, email: user.email, role: user.role }
      : { name, email, role }
  );
}
