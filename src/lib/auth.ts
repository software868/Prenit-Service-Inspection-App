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

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mongoId(value: unknown): string {
  if (typeof value === "string") return value;
  const rec = asRecord(value);
  if (rec && typeof rec.$oid === "string") return rec.$oid;
  return "";
}

function mongoDate(date = new Date()) {
  return { $date: { $numberLong: String(date.getTime()) } };
}

export function describeDatabaseError(error: unknown) {
  const url = process.env.DATABASE_URL || "";
  if (!url) {
    return "DATABASE_URL is missing on the server. Add a MongoDB Atlas URL in Vercel.";
  }
  if (/(localhost|127\.0\.0\.1)/i.test(url)) {
    return "The live site cannot use local MongoDB. Set DATABASE_URL to a MongoDB Atlas connection string in Vercel.";
  }
  const message = error instanceof Error ? error.message : "";
  if (/P2031|replica set/i.test(message)) {
    return "MongoDB must be a replica set. Use MongoDB Atlas for Vercel.";
  }
  if (/ENOTFOUND|querySrv|ECONNREFUSED|Server selection timeout|authentication failed/i.test(message)) {
    return "Could not reach MongoDB. Check the Atlas URL, password, and Network Access (allow 0.0.0.0/0).";
  }
  return "Login failed. Check the DATABASE_URL environment variable on Vercel.";
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, passwordHash: true },
    });
    if (user) {
      return { ...user, passwordHash: user.passwordHash ?? null };
    }
  } catch {
    // Raw-inserted dates can break Prisma reads. Fall through to a raw find.
  }

  const result = asRecord(
    await prisma.$runCommandRaw({
      find: "User",
      filter: { email },
      limit: 1,
    })
  );
  const cursor = asRecord(result?.cursor);
  const batch = Array.isArray(cursor?.firstBatch) ? cursor.firstBatch : [];
  const doc = asRecord(batch[0]);
  if (!doc) return null;

  return {
    id: mongoId(doc._id),
    name: String(doc.name || ""),
    email: String(doc.email || email),
    role: doc.role === "ADMIN" ? UserRole.ADMIN : UserRole.ENGINEER,
    passwordHash: typeof doc.passwordHash === "string" ? doc.passwordHash : null,
  };
}

export async function ensureDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@prenit.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = hashPassword(password);
  const found = await findUserByEmail(email);

  if (found?.passwordHash) return;

  try {
    if (found) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });
      return;
    }
    await prisma.user.create({
      data: {
        name: "Admin",
        email,
        role: UserRole.ADMIN,
        passwordHash,
      },
    });
  } catch {
    await insertUserDocument({
      name: found?.name || "Admin",
      email,
      role: "ADMIN",
      passwordHash,
      replaceEmail: found ? email : undefined,
    });
  }
}

/** Prisma Mongo writes require a replica set. Raw insert works on a standalone server. */
export async function insertUserDocument(input: {
  name: string;
  email: string;
  role: "ADMIN" | "ENGINEER";
  passwordHash: string;
  replaceEmail?: string;
}) {
  const now = mongoDate();
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
              updatedAt: now,
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
        _id: { $oid: randomBytes(12).toString("hex") },
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.passwordHash,
        createdAt: now,
        updatedAt: now,
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
