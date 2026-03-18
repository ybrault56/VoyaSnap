import { SubmissionFlow } from "@/components/submission-flow";
import { SiteShell } from "@/components/site-shell";
import { getDictionary } from "@/lib/dictionaries";
import { resolveLocale } from "@/lib/locale";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const dictionary = getDictionary(locale);

  return (
    <SiteShell locale={locale} dictionary={dictionary} pathSuffix="/submit">
      <SubmissionFlow locale={locale} dictionary={dictionary} />
    </SiteShell>
  );
}