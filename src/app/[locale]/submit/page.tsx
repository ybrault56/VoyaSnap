import { SubmissionFlow } from "@/components/submission-flow";
import { SiteShell } from "@/components/site-shell";
import { getPricingRule, getTravelerCheckoutSettings } from "@/lib/delivery-rules";
import { getDictionary } from "@/lib/dictionaries";
import { resolveLocale } from "@/lib/locale";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const state = await readState();
  const checkoutSettings = getTravelerCheckoutSettings(getPricingRule(state));

  return (
    <SiteShell locale={locale} dictionary={dictionary} pathSuffix="/submit">
      <SubmissionFlow locale={locale} dictionary={dictionary} checkoutSettings={checkoutSettings} />
    </SiteShell>
  );
}
