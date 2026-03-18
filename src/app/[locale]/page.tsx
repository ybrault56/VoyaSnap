import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import { resolveLocale } from "@/lib/locale";
import { SiteShell } from "@/components/site-shell";

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const dictionary = getDictionary(locale);

  return (
    <SiteShell locale={locale} dictionary={dictionary}>
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-[2.5rem] border border-stone-300 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase text-amber-700">{dictionary.home.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold text-stone-950 sm:text-6xl">
            {dictionary.home.title}
          </h1>
          <p className="mt-6 max-w-3xl text-pretty text-lg text-stone-600 sm:text-xl">
            {dictionary.home.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/submit`}
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400"
            >
              {dictionary.home.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/submit#tracking`}
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:border-stone-400"
            >
              {dictionary.home.ctaSecondary}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[2rem] border border-stone-300 bg-stone-950 p-6 text-stone-50 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-300">{dictionary.home.featurePricingTitle}</p>
            <p className="mt-3 text-pretty text-sm text-stone-300">{dictionary.home.featurePricingBody}</p>
          </article>
          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">{dictionary.home.featureQueueTitle}</p>
            <p className="mt-3 text-pretty text-sm text-stone-600">{dictionary.home.featureQueueBody}</p>
          </article>
          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">{dictionary.home.featureModerationTitle}</p>
            <p className="mt-3 text-pretty text-sm text-stone-600">{dictionary.home.featureModerationBody}</p>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[2.5rem] border border-stone-300 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase text-amber-700">{dictionary.home.stepsTitle}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dictionary.home.steps.map((step, index) => (
            <article key={step} className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold tabular-nums text-amber-700">0{index + 1}</p>
              <p className="mt-3 text-pretty text-sm text-stone-700">{step}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}