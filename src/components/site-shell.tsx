import Link from "next/link";
import { SUPPORTED_LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { TravelerDictionary } from "@/lib/dictionaries";

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
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-stone-300 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href={`/${locale}`} className="text-sm font-semibold uppercase text-amber-700">
              Screen Me
            </Link>
            <p className="mt-2 max-w-2xl text-pretty text-sm text-stone-600">
              QR booking, moderation queue and giant-screen playback in one app.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex flex-wrap gap-2 text-sm font-medium text-stone-700">
              <Link className="rounded-full border border-stone-300 px-3 py-2 hover:border-stone-400" href={`/${locale}/submit`}>
                {dictionary.common.submit}
              </Link>
              <Link className="rounded-full border border-stone-300 px-3 py-2 hover:border-stone-400" href="/admin">
                {dictionary.common.admin}
              </Link>
              <Link className="rounded-full border border-stone-300 px-3 py-2 hover:border-stone-400" href="/player">
                {dictionary.common.player}
              </Link>
            </nav>
            <div className="flex flex-wrap gap-2 text-xs font-medium uppercase text-stone-500">
              {SUPPORTED_LOCALES.map((candidate) => (
                <Link
                  key={candidate}
                  href={`/${candidate}${pathSuffix}`}
                  className={cn(
                    "rounded-full border px-3 py-2",
                    candidate === locale
                      ? "border-amber-500 bg-amber-100 text-amber-900"
                      : "border-stone-300 bg-white text-stone-600 hover:border-stone-400",
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
