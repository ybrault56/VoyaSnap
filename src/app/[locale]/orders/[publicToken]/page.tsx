import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { getDictionary } from "@/lib/dictionaries";
import { resolveLocale } from "@/lib/locale";
import { readState } from "@/lib/store";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { buildOrderSnapshot } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ locale: string; publicToken: string }>;
}) {
  const { locale: rawLocale, publicToken } = await params;
  const locale = resolveLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const state = await readState();
  const snapshot = buildOrderSnapshot(state, publicToken);

  if (!snapshot) {
    notFound();
  }

  return (
    <SiteShell locale={locale} dictionary={dictionary} pathSuffix={`/orders/${publicToken}`}>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <article className="app-shell rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.tracking.title}
            </p>
            <h1 className="mt-4 text-balance text-3xl font-semibold text-slate-50">
              {snapshot.submission.title}
            </h1>
            <p className="mt-3 text-pretty text-sm app-text-muted">
              {dictionary.tracking.subtitle}
            </p>
            <div className="mt-5">
              <StatusBadge status={snapshot.displayStatus} />
            </div>
            <dl className="mt-6 space-y-4 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="app-text-muted">{dictionary.tracking.status}</dt>
                <dd>{snapshot.displayStatus}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="app-text-muted">{dictionary.tracking.eta}</dt>
                <dd className="text-right tabular-nums">
                  {formatDateTime(snapshot.order.estimatedFirstPlayAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="app-text-muted">{dictionary.tracking.firstPlay}</dt>
                <dd className="text-right tabular-nums">
                  {formatDateTime(snapshot.order.actualFirstPlayAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="app-text-muted">{dictionary.tracking.window}</dt>
                <dd className="text-right tabular-nums">
                  {formatDateTime(snapshot.order.requestedWindowStartAt)} →{" "}
                  {formatDateTime(snapshot.order.requestedWindowEndAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="app-text-muted">Total</dt>
                <dd className="tabular-nums">
                  {formatCurrency(snapshot.order.totalCents, snapshot.order.currency)}
                </dd>
              </div>
            </dl>
          </article>

          <article className="app-shell-muted rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.tracking.voucher}
            </p>
            {snapshot.voucher ? (
              <div className="mt-4 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-lg font-semibold text-cyan-100">
                  {snapshot.voucher.code}
                </p>
                <p className="mt-2 text-sm app-text-muted">{snapshot.voucher.reason}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">
                No voucher issued for this order.
              </p>
            )}
          </article>
        </div>

        <div className="space-y-6">
          <article className="app-shell rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.tracking.slots}
            </p>
            {snapshot.slots.length > 0 ? (
              <div className="mt-4 space-y-3">
                {snapshot.slots.map((slot) => (
                  <div key={slot.id} className="app-shell-muted rounded-[1.5rem] p-4 text-sm">
                    <p className="font-medium text-slate-100">
                      {formatDateTime(slot.startAt)} → {formatDateTime(slot.endAt)}
                    </p>
                    <p className="mt-1 tabular-nums app-text-muted">
                      {slot.durationSeconds}s · {slot.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">
                No reserved slot yet. The order is still waiting for moderation or scheduling.
              </p>
            )}
          </article>

          <article className="app-shell rounded-[2rem] p-6">
            <p className="app-kicker text-sm font-semibold uppercase">
              {dictionary.tracking.notifications}
            </p>
            {snapshot.notifications.length > 0 ? (
              <div className="mt-4 space-y-3">
                {snapshot.notifications.map((notification) => (
                  <div key={notification.id} className="app-shell-muted rounded-[1.5rem] p-4 text-sm">
                    <p className="font-medium text-slate-100">
                      {notification.payload.subject}
                    </p>
                    <p className="mt-2 text-pretty app-text-muted">
                      {notification.payload.body}
                    </p>
                    <p className="mt-2 text-xs tabular-nums app-text-muted">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">
                No notification has been queued yet.
              </p>
            )}
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
