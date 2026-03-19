import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminCredentials, isAdminAuthConfigured } from "./env";
import type { AdminRole } from "./types";

const ADMIN_COOKIE_NAME = "screenme_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = {
  email: string;
  name: string;
  role: AdminRole;
  exp: number;
};

function createSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSession(session: AdminSession, secret: string) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createSignature(payload, secret);
  return `${payload}.${signature}`;
}

function decodeSession(token: string, secret: string): AdminSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(payload, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (parsed.exp <= Date.now()) {
      return null;
    }
    if (parsed.role !== "moderator" && parsed.role !== "ops_admin") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hasRequiredRole(session: AdminSession, requiredRole?: AdminRole) {
  if (!requiredRole) {
    return true;
  }

  if (requiredRole === "moderator") {
    return session.role === "moderator" || session.role === "ops_admin";
  }

  return session.role === "ops_admin";
}

export async function getAdminSession() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return decodeSession(token, credentials.sessionSecret);
}

export async function requireAdminPageSession(requiredRole?: AdminRole) {
  if (!isAdminAuthConfigured()) {
    redirect("/admin/login?error=config");
  }

  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  if (!hasRequiredRole(session, requiredRole)) {
    redirect("/admin/login?error=forbidden");
  }

  return session;
}

export async function requireAdminApiSession(requiredRole?: AdminRole) {
  if (!isAdminAuthConfigured()) {
    return {
      error: NextResponse.json({ error: "Admin authentication is not configured." }, { status: 500 }),
    };
  }

  const session = await getAdminSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized admin session." }, { status: 401 }),
    };
  }

  if (!hasRequiredRole(session, requiredRole)) {
    return {
      error: NextResponse.json({ error: "Insufficient admin role." }, { status: 403 }),
    };
  }

  return { session };
}

export function authenticateAdmin(email: string, password: string) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return null;
  }

  if (!safeEqual(email.trim().toLowerCase(), credentials.email.toLowerCase())) {
    return null;
  }

  if (!safeEqual(password, credentials.password)) {
    return null;
  }

  return {
    email: credentials.email,
    name: credentials.name,
    role: credentials.role,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  } satisfies AdminSession;
}

export function applyAdminSession(response: NextResponse, session: AdminSession) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return response;
  }

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: encodeSession(session, credentials.sessionSecret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}