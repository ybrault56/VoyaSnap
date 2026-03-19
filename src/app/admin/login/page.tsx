import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { isAdminAuthConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  config:
    "Admin auth is not configured yet. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
  credentials: "Invalid email or password.",
  invalid: "The submitted login form is invalid.",
  forbidden: "Your session does not grant access to this admin area.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/admin";
  const authConfigured = isAdminAuthConfigured();

  return (
    <div className="min-h-dvh bg-[#050816] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[2rem] app-shell p-8">
        <p className="app-kicker text-sm font-semibold uppercase">Admin access</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-slate-50">
          Sign in to Screen Me
        </h1>
        <p className="mt-3 text-pretty text-sm app-text-muted">
          Use the admin credentials defined in the environment. Sessions are stored
          in a signed, httpOnly cookie.
        </p>

        {!authConfigured ? (
          <div className="mt-6 rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            {errorMessages.config}
          </div>
        ) : null}

        {errorKey ? (
          <div className="mt-6 rounded-[1.5rem] border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
            {errorMessages[errorKey] ?? "Login failed."}
          </div>
        ) : null}

        <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              className="app-input w-full rounded-2xl px-4 py-3"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              className="app-input w-full rounded-2xl px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={!authConfigured}
            className="app-button-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
