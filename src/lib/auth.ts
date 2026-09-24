import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ENGINEER";
};

const COOKIE = "prenit_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

function secret() {
  return process.env.AUTH_SECRET || "prenit-dev-auth-secret";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored?: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SEC * 1000 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser & {
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.id || !data.name || !data.email) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role === "ADMIN" ? "ADMIN" : "ENGINEER",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}

export function sessionCookieName() {
  return COOKIE;
}

export async function ensureDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@prenit.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";

  let found: { passwordHash: string | null; name: string } | null = null;
  try {
    found = await prisma.user.findUnique({ where: { email } });
  } catch {
    await prisma.$runCommandRaw({
      delete: "User",
      deletes: [{ q: { email }, limit: 1 }],
    });
  }

  if (found?.passwordHash) return;

  await insertUserDocument({
    name: found?.name || "Admin",
    email,
    role: "ADMIN",
    passwordHash: hashPassword(password),
  });
}

/** Prisma Mongo writes require a replica set. Raw insert works on a standalone server. */
export async function insertUserDocument(input: {
  name: string;
  email: string;
  role: "ADMIN" | "ENGINEER";
  passwordHash: string;
  replaceEmail?: string;
}) {
  const now = new Date().toISOString();
  if (input.replaceEmail) {
    await prisma.$runCommandRaw({
      update: "User",
      updates: [
        {
          q: { email: input.replaceEmail },
          u: {
            $set: {
              name: input.name,
              role: input.role,
              passwordHash: input.passwordHash,
              updatedAt: { $date: now },
            },
          },
        },
      ],
    });
    return;
  }

  await prisma.$runCommandRaw({
    delete: "User",
    deletes: [{ q: { email: input.email }, limit: 1 }],
  });

  await prisma.$runCommandRaw({
    insert: "User",
    documents: [
      {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.passwordHash,
        createdAt: { $date: now },
        updatedAt: { $date: now },
      },
    ],
  });
}

export function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === UserRole.ADMIN ? "ADMIN" : "ENGINEER",
  };
}
