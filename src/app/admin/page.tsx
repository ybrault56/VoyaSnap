import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { requireAdminPageSession } from "@/lib/auth";
import { getPricingRule } from "@/lib/delivery-rules";
import { readState } from "@/lib/store";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { listModerationQueue, listOrderSnapshots } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPageSession();
  const state = await readState();
  const moderationQueue = listModerationQueue(state);
  const orders = listOrderSnapshots(state);
  const pricingRule = getPricingRule(state);
  const playSlots = [...state.playSlots].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );
  const canOperate = session.role === "ops_admin";

  return (
    <div className="min-h-dvh bg-[#050816] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2.5rem] app-shell p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-kicker text-sm font-semibold uppercase">Admin moderation</p>
              <h1 className="mt-3 text-balance text-4xl font-semibold text-slate-50">
                Back-office Screen Me
              </h1>
              <p className="mt-3 max-w-3xl text-pretty text-base app-text-muted">
                Session active pour {session.name} ({session.role}). Interface ops sombre et
                neon, adaptee aux actions rapides de moderation et de diffusion.
              </p>
            </div>
            <form action="/api/admin/logout" method="post">
              <button className="app-button-secondary rounded-full px-4 py-2 text-sm font-semibold">
                Log out
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[2rem] app-shell p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="app-kicker text-sm font-semibold uppercase">Moderation queue</p>
                <p className="mt-2 text-sm app-text-muted">
                  Paid orders waiting for a human decision.
                </p>
              </div>
              {canOperate ? (
                <form action="/api/admin/schedule/recompute" method="post">
                  <input type="hidden" name="screenId" value="promenade-main" />
                  <input type="hidden" name="redirectTo" value="/admin" />
                  <button className="app-button-secondary rounded-full px-4 py-2 text-sm font-semibold">
                    Recompute schedule
                  </button>
                </form>
              ) : null}
            </div>

            {moderationQueue.length > 0 ? (
              <div className="mt-6 space-y-4">
                {moderationQueue.map((snapshot) => (
                  <div key={snapshot.order.id} className="rounded-[1.75rem] app-shell-muted p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-slate-50">
                          {snapshot.submission.title}
                        </p>
                        <p className="mt-1 text-sm app-text-muted">
                          {snapshot.order.customerName} - {snapshot.order.customerEmail}
                        </p>
                        <p className="mt-2 text-sm tabular-nums text-cyan-100">
                          ETA {formatDateTime(snapshot.order.estimatedFirstPlayAt)}
                        </p>
                      </div>
                      <StatusBadge status={snapshot.displayStatus} />
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr]">
                      <form
                        action={`/api/admin/moderation/${snapshot.item.id}/approve`}
                        method="post"
                        className="flex gap-2"
                      >
                        <input type="hidden" name="redirectTo" value="/admin" />
                        <button className="app-button-primary rounded-full px-4 py-2 text-sm font-semibold">
                          Approve
                        </button>
                      </form>
                      <form
                        action={`/api/admin/moderation/${snapshot.item.id}/reject`}
                        method="post"
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input type="hidden" name="redirectTo" value="/admin" />
                        <input
                          name="reason"
                          required
                          placeholder="Reason for rejection"
                          className="app-input min-w-0 flex-1 rounded-full px-4 py-2 text-sm"
                        />
                        <button className="app-button-danger rounded-full px-4 py-2 text-sm font-semibold">
                          Reject + voucher
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.75rem] app-shell-muted p-6 text-sm app-text-muted">
                Queue is empty.{" "}
                <Link href="/fr/submit" className="font-semibold text-cyan-200">
                  Create a traveler order
                </Link>{" "}
                to test moderation.
              </div>
            )}
          </article>

          <article className="rounded-[2rem] app-shell p-6">
            <p className="app-kicker text-sm font-semibold uppercase">Diffusion rules</p>
            <p className="mt-2 text-sm app-text-muted">
              Auto-promo, minimum playback, sellable capacity and dynamic uplift are managed here.
            </p>
            {canOperate ? (
              <form action="/api/admin/pricing" method="post" className="mt-5 space-y-6">
                <input type="hidden" name="timeBandCount" value={pricingRule.timeBands.length} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Image base (cents)</span>
                    <input
                      name="imageBaseCents"
                      defaultValue={pricingRule.basePriceCents.image}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Video base (cents)</span>
                    <input
                      name="videoBaseCents"
                      defaultValue={pricingRule.basePriceCents.video}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Message base (cents)</span>
                    <input
                      name="messageBaseCents"
                      defaultValue={pricingRule.basePriceCents.message}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Duration step surcharge</span>
                    <input
                      name="durationStepCents"
                      defaultValue={pricingRule.durationStepCents}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 sm:col-span-2">
                    <span>Repeat surcharge</span>
                    <input
                      name="repeatPlayCents"
                      defaultValue={pricingRule.repeatPlayCents}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Minimum playback (seconds)</span>
                    <input
                      name="minimumRenderDurationSeconds"
                      defaultValue={pricingRule.minimumRenderDurationSeconds}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Minimum repeat interval (minutes)</span>
                    <input
                      name="minimumRepeatMinutes"
                      defaultValue={pricingRule.minimumRepeatMinutes}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Dynamic uplift cap (%)</span>
                    <input
                      name="maximumDynamicUpliftPercent"
                      defaultValue={pricingRule.maximumDynamicUpliftPercent}
                      className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                    />
                  </label>
                  <div className="rounded-[1.5rem] app-shell-muted p-4 text-sm app-text-muted">
                    The traveler never sees more than +{pricingRule.maximumDynamicUpliftPercent}%.
                    Unsold capacity stays available for the promo loop and for queue recovery.
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Promo video URL</span>
                    <input
                      name="promoVideoUrl"
                      defaultValue={pricingRule.promoVideoUrl}
                      className="app-input w-full rounded-2xl px-4 py-3"
                      placeholder="/videos/promo.mp4"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Promo poster URL</span>
                    <input
                      name="promoPosterUrl"
                      defaultValue={pricingRule.promoPosterUrl}
                      className="app-input w-full rounded-2xl px-4 py-3"
                      placeholder="/images/promo-poster.jpg"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Hourly traffic bands</p>
                    <p className="mt-1 text-sm app-text-muted">
                      The sellable cap preserves auto-promo time even when demand is high.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {pricingRule.timeBands.map((band, index) => (
                      <div
                        key={`${band.label}-${index}`}
                        className="grid gap-4 rounded-[1.5rem] app-shell-muted p-4 sm:grid-cols-2 xl:grid-cols-3"
                      >
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>Band label</span>
                          <input
                            name={`timeBands.${index}.label`}
                            defaultValue={band.label}
                            className="app-input w-full rounded-2xl px-4 py-3"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>Traffic label</span>
                          <input
                            name={`timeBands.${index}.trafficLabel`}
                            defaultValue={band.trafficLabel}
                            className="app-input w-full rounded-2xl px-4 py-3"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>Start hour</span>
                          <input
                            name={`timeBands.${index}.startHour`}
                            defaultValue={band.startHour}
                            className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>End hour</span>
                          <input
                            name={`timeBands.${index}.endHour`}
                            defaultValue={band.endHour}
                            className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>Base uplift (%)</span>
                          <input
                            name={`timeBands.${index}.baseUpliftPercent`}
                            defaultValue={band.baseUpliftPercent}
                            className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-200">
                          <span>Max sellable (%)</span>
                          <input
                            name={`timeBands.${index}.maxSellablePercent`}
                            defaultValue={Math.round(band.maxSellableRatio * 100)}
                            className="app-input w-full rounded-2xl px-4 py-3 tabular-nums"
                          />
                        </label>
                        <div className="rounded-[1.25rem] border border-white/8 bg-[#07101d] px-4 py-3 text-sm app-text-muted sm:col-span-2 xl:col-span-3">
                          Promo reserve: {Math.round((1 - band.maxSellableRatio) * 100)}% - uplift
                          starts at +{band.baseUpliftPercent}% for this band.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="app-button-primary rounded-full px-5 py-3 text-sm font-semibold">
                  Update diffusion rules
                </button>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] app-shell-muted p-5 text-sm app-text-muted">
                  Your current role is read-only for diffusion administration.
                </div>
                <div className="space-y-3">
                  {pricingRule.timeBands.map((band) => (
                    <div key={band.label} className="rounded-[1.5rem] app-shell-muted p-4 text-sm">
                      <p className="font-medium text-slate-100">
                        {band.label} ({band.startHour}h-{band.endHour}h)
                      </p>
                      <p className="mt-2 app-text-muted">
                        Traffic: {band.trafficLabel} - sellable cap{" "}
                        {Math.round(band.maxSellableRatio * 100)}% - promo reserve{" "}
                        {Math.round((1 - band.maxSellableRatio) * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] app-shell p-6">
            <p className="app-kicker text-sm font-semibold uppercase">Upcoming play slots</p>
            {playSlots.length > 0 ? (
              <div className="mt-4 space-y-3">
                {playSlots.slice(0, 12).map((slot) => (
                  <div
                    key={slot.id}
                    className="app-shell-muted flex items-center justify-between gap-4 rounded-[1.5rem] p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {formatDateTime(slot.startAt)} {"->"} {formatDateTime(slot.endAt)}
                      </p>
                      <p className="mt-1 app-text-muted">{slot.orderItemId}</p>
                    </div>
                    <p className="tabular-nums app-text-muted">{slot.durationSeconds}s</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">No future slot reserved yet.</p>
            )}
          </article>

          <article className="rounded-[2rem] app-shell p-6">
            <p className="app-kicker text-sm font-semibold uppercase">Issued vouchers</p>
            {state.creditVouchers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {state.creditVouchers.map((voucher) => (
                  <div key={voucher.id} className="app-shell-muted rounded-[1.5rem] p-4 text-sm">
                    <p className="font-medium text-slate-100">{voucher.code}</p>
                    <p className="mt-2 app-text-muted">{voucher.reason}</p>
                    <p className="mt-2 tabular-nums text-cyan-100">
                      {formatCurrency(voucher.amountCents, voucher.currency)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">No credit voucher issued yet.</p>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] app-shell p-6">
            <p className="app-kicker text-sm font-semibold uppercase">Recent orders</p>
            {orders.length > 0 ? (
              <div className="mt-4 space-y-3">
                {orders.slice(0, 10).map((snapshot) => (
                  <div key={snapshot.order.id} className="app-shell-muted rounded-[1.5rem] p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-100">{snapshot.submission.title}</p>
                        <p className="mt-1 app-text-muted">
                          {snapshot.order.publicToken} - {snapshot.order.customerEmail}
                        </p>
                      </div>
                      <StatusBadge status={snapshot.displayStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm app-text-muted">No order created yet.</p>
            )}
          </article>

          <article className="rounded-[2rem] app-shell p-6">
            <p className="app-kicker text-sm font-semibold uppercase">Audit log</p>
            <div className="mt-4 space-y-3">
              {state.auditEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="app-shell-muted rounded-[1.5rem] p-4 text-sm">
                  <p className="font-medium text-slate-100">{entry.action}</p>
                  <p className="mt-1 text-pretty app-text-muted">{entry.summary}</p>
                  <p className="mt-2 text-xs tabular-nums app-text-muted">
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
