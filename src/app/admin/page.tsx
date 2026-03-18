import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { readState } from "@/lib/store";
import { listModerationQueue, listOrderSnapshots } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const state = await readState();
  const moderationQueue = listModerationQueue(state);
  const orders = listOrderSnapshots(state);
  const pricingRule = state.pricingRules[0];
  const playSlots = [...state.playSlots].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );

  return (
    <div className="min-h-dvh bg-stone-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2.5rem] border border-stone-300 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase text-amber-700">Admin moderation</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold text-stone-950">Back-office Screen Me</h1>
          <p className="mt-3 max-w-3xl text-pretty text-base text-stone-600">
            Roles in v1: moderator approves or rejects content, ops_admin tunes pricing and recomputes schedules.
          </p>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-amber-700">Moderation queue</p>
                <p className="mt-2 text-sm text-stone-600">Paid orders waiting for a human decision.</p>
              </div>
              <form action="/api/admin/schedule/recompute" method="post">
                <input type="hidden" name="screenId" value="promenade-main" />
                <input type="hidden" name="actorRole" value="ops_admin" />
                <input type="hidden" name="redirectTo" value="/admin" />
                <button className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400">
                  Recompute schedule
                </button>
              </form>
            </div>

            {moderationQueue.length > 0 ? (
              <div className="mt-6 space-y-4">
                {moderationQueue.map((snapshot) => (
                  <div key={snapshot.order.id} className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-stone-900">{snapshot.submission.title}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {snapshot.order.customerName} · {snapshot.order.customerEmail}
                        </p>
                        <p className="mt-2 text-sm text-stone-500 tabular-nums">
                          ETA {formatDateTime(snapshot.order.estimatedFirstPlayAt)}
                        </p>
                      </div>
                      <StatusBadge status={snapshot.displayStatus} />
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr]">
                      <form action={`/api/admin/moderation/${snapshot.item.id}/approve`} method="post" className="flex gap-2">
                        <input type="hidden" name="reviewerName" value="Equipe moderation" />
                        <input type="hidden" name="actorRole" value="moderator" />
                        <input type="hidden" name="redirectTo" value="/admin" />
                        <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                          Approve
                        </button>
                      </form>
                      <form action={`/api/admin/moderation/${snapshot.item.id}/reject`} method="post" className="flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="reviewerName" value="Equipe moderation" />
                        <input type="hidden" name="actorRole" value="moderator" />
                        <input type="hidden" name="redirectTo" value="/admin" />
                        <input
                          name="reason"
                          required
                          placeholder="Reason for rejection"
                          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-amber-500"
                        />
                        <button className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
                          Reject + voucher
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
                Queue is empty. <Link href="/fr/submit" className="font-semibold text-amber-700">Create a traveler order</Link> to test moderation.
              </div>
            )}
          </article>

          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">Pricing rule</p>
            <p className="mt-2 text-sm text-stone-600">Ops admins can tune the live pricing engine without redeploying.</p>
            <form action="/api/admin/pricing" method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="actorRole" value="ops_admin" />
              <input type="hidden" name="reviewerName" value="Equipe operations" />
              <label className="space-y-2 text-sm font-medium text-stone-700">
                <span>Image base (cents)</span>
                <input name="imageBaseCents" defaultValue={pricingRule.basePriceCents.image} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 tabular-nums outline-none focus:border-amber-500" />
              </label>
              <label className="space-y-2 text-sm font-medium text-stone-700">
                <span>Video base (cents)</span>
                <input name="videoBaseCents" defaultValue={pricingRule.basePriceCents.video} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 tabular-nums outline-none focus:border-amber-500" />
              </label>
              <label className="space-y-2 text-sm font-medium text-stone-700">
                <span>Message base (cents)</span>
                <input name="messageBaseCents" defaultValue={pricingRule.basePriceCents.message} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 tabular-nums outline-none focus:border-amber-500" />
              </label>
              <label className="space-y-2 text-sm font-medium text-stone-700">
                <span>Duration step surcharge</span>
                <input name="durationStepCents" defaultValue={pricingRule.durationStepCents} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 tabular-nums outline-none focus:border-amber-500" />
              </label>
              <label className="space-y-2 text-sm font-medium text-stone-700 sm:col-span-2">
                <span>Repeat surcharge</span>
                <input name="repeatPlayCents" defaultValue={pricingRule.repeatPlayCents} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 tabular-nums outline-none focus:border-amber-500" />
              </label>
              <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 sm:col-span-2">
                Update pricing
              </button>
            </form>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">Upcoming play slots</p>
            {playSlots.length > 0 ? (
              <div className="mt-4 space-y-3">
                {playSlots.slice(0, 12).map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div>
                      <p className="font-medium text-stone-900">{formatDateTime(slot.startAt)} → {formatDateTime(slot.endAt)}</p>
                      <p className="mt-1 text-stone-500">{slot.orderItemId}</p>
                    </div>
                    <p className="tabular-nums text-stone-500">{slot.durationSeconds}s</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-600">No future slot reserved yet.</p>
            )}
          </article>

          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">Issued vouchers</p>
            {state.creditVouchers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {state.creditVouchers.map((voucher) => (
                  <div key={voucher.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <p className="font-medium text-stone-900">{voucher.code}</p>
                    <p className="mt-2 text-stone-600">{voucher.reason}</p>
                    <p className="mt-2 tabular-nums text-stone-500">{formatCurrency(voucher.amountCents, voucher.currency)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-600">No credit voucher issued yet.</p>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">Recent orders</p>
            {orders.length > 0 ? (
              <div className="mt-4 space-y-3">
                {orders.slice(0, 10).map((snapshot) => (
                  <div key={snapshot.order.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-stone-900">{snapshot.submission.title}</p>
                        <p className="mt-1 text-stone-500">{snapshot.order.publicToken} · {snapshot.order.customerEmail}</p>
                      </div>
                      <StatusBadge status={snapshot.displayStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-600">No order created yet.</p>
            )}
          </article>

          <article className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-amber-700">Audit log</p>
            <div className="mt-4 space-y-3">
              {state.auditEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-900">{entry.action}</p>
                  <p className="mt-1 text-pretty text-stone-600">{entry.summary}</p>
                  <p className="mt-2 text-xs tabular-nums text-stone-500">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}