import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getDictionary } from "@/lib/dictionaries";
import { resolveLocale } from "@/lib/locale";

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
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-shell rounded-[2.5rem] p-8 sm:p-10">
          <p className="app-kicker text-sm font-semibold uppercase">
            {dictionary.home.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold text-slate-50 sm:text-6xl">
            {dictionary.home.title}
          </h1>
          <p className="mt-6 max-w-3xl text-pretty text-lg app-text-muted sm:text-xl">
            {dictionary.home.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/submit`}
              className="app-button-primary rounded-full px-6 py-3 text-sm font-semibold"
            >
              {dictionary.home.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/submit#tracking`}
              className="app-button-secondary rounded-full px-6 py-3 text-sm font-semibold"
            >
              {dictionary.home.ctaSecondary}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="app-shell rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.home.featurePricingTitle}
            </p>
            <p className="mt-3 text-pretty text-sm app-text-muted">
              {dictionary.home.featurePricingBody}
            </p>
          </article>
          <article className="app-shell-muted rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.home.featureQueueTitle}
            </p>
            <p className="mt-3 text-pretty text-sm app-text-muted">
              {dictionary.home.featureQueueBody}
            </p>
          </article>
          <article className="app-shell-muted rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.home.featureModerationTitle}
            </p>
            <p className="mt-3 text-pretty text-sm app-text-muted">
              {dictionary.home.featureModerationBody}
            </p>
          </article>
        </div>
      </section>

      <section className="app-shell mt-6 rounded-[2.5rem] p-8 sm:p-10">
        <p className="app-kicker text-sm font-semibold uppercase">
          {dictionary.home.stepsTitle}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dictionary.home.steps.map((step, index) => (
            <article key={step} className="app-shell-muted rounded-[1.75rem] p-5">
              <p className="text-sm font-semibold tabular-nums text-cyan-200">
                0{index + 1}
              </p>
              <p className="mt-3 text-pretty text-sm text-slate-200">{step}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
