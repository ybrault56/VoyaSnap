import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation";
import { applyAdminSession, authenticateAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  const session = authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login?error=credentials", request.url), 303);
  }

  const redirectTarget = parsed.data.redirectTo && parsed.data.redirectTo.startsWith("/")
    ? parsed.data.redirectTo
    : "/admin";
  const response = NextResponse.redirect(new URL(redirectTarget, request.url), 303);
  return applyAdminSession(response, session);
}