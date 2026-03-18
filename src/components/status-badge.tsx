import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const statusStyles: Record<OrderStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  quoted: "bg-stone-200 text-stone-700",
  checkout_pending: "bg-amber-100 text-amber-900",
  paid_pending_moderation: "bg-orange-100 text-orange-900",
  approved_scheduled: "bg-emerald-100 text-emerald-900",
  rejected_credit_issued: "bg-rose-100 text-rose-900",
  playing: "bg-sky-100 text-sky-900",
  completed: "bg-stone-800 text-stone-50",
  cancelled: "bg-stone-300 text-stone-800",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium tabular-nums",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}
