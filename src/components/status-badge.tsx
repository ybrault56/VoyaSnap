import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<OrderStatus, string> = {
  draft: "border-slate-700 bg-slate-900/80 text-slate-300",
  quoted: "border-slate-700 bg-slate-900/80 text-slate-300",
  checkout_pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  paid_pending_moderation: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  approved_scheduled: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  rejected_credit_issued: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  playing: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  completed: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  cancelled: "border-slate-600 bg-slate-900/70 text-slate-400",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tabular-nums",
        statusStyles[status],
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
