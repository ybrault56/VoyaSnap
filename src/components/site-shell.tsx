import Link from "next/link";
import { SUPPORTED_LOCALES } from "@/lib/constants";
import type { TravelerDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteShell({
  locale,
  dictionary,
  pathSuffix = "",
  children,
}: {
  locale: Locale;
  dictionary: TravelerDictionary;
  pathSuffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#050816] text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-divider mb-8 flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              href={`/${locale}`}
              className="app-chip inline-flex rounded-full px-4 py-2 text-sm font-semibold uppercase"
            >
              Screen Me
            </Link>
            <p className="max-w-2xl text-pretty text-sm app-text-muted">
              QR booking, moderation queue and giant-screen playback in one app.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <nav className="flex flex-wrap gap-2 text-sm font-medium">
              <Link
                className="app-button-secondary rounded-full px-4 py-2"
                href={`/${locale}/submit`}
              >
                {dictionary.common.submit}
              </Link>
              <Link className="app-button-secondary rounded-full px-4 py-2" href="/admin">
                {dictionary.common.admin}
              </Link>
              <Link className="app-button-secondary rounded-full px-4 py-2" href="/player">
                {dictionary.common.player}
              </Link>
            </nav>
            <div className="flex flex-wrap gap-2 text-xs font-medium uppercase app-text-muted">
              {SUPPORTED_LOCALES.map((candidate) => (
                <Link
                  key={candidate}
                  href={`/${candidate}${pathSuffix}`}
                  className={cn(
                    "rounded-full px-3 py-2",
                    candidate === locale
                      ? "app-chip"
                      : "app-button-secondary",
                  )}
                >
                  {candidate}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
