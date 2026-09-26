import {
  createSessionToken,
  describeDatabaseError,
  ensureDefaultAdmin,
  findUserByEmail,
  sessionCookieName,
  sessionCookieOptions,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await ensureDefaultAdmin();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionUser = toSessionUser(user);
    const response = NextResponse.json(sessionUser);
    response.cookies.set(sessionCookieName(), createSessionToken(sessionUser), sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: describeDatabaseError(error) }, { status: 500 });
  }
}
