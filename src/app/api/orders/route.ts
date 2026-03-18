import { NextResponse } from "next/server";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/payments";
import { mutateState } from "@/lib/store";
import { markOrderPaid, createOrder } from "@/lib/workflow";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = orderRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order payload." }, { status: 400 });
  }

  const wantsStripe = isStripeConfigured();
  const created = await mutateState((state) =>
    createOrder(state, parsed.data, wantsStripe ? "stripe" : "simulated"),
  );

  if (wantsStripe) {
    const session = await createStripeCheckoutSession({
      orderId: created.order.id,
      publicToken: created.order.publicToken,
      amountCents: created.order.totalCents,
      locale: created.order.locale,
      customerEmail: created.order.customerEmail,
      title: created.submission.title,
    });

    if (session?.url) {
      await mutateState((state) => {
        const order = state.orders.find((candidate) => candidate.id === created.order.id);
        if (order) {
          order.paymentSessionId = session.id;
        }
      });

      return NextResponse.json({
        orderPublicToken: created.order.publicToken,
        trackingUrl: `/${created.order.locale}/orders/${created.order.publicToken}`,
        checkoutUrl: session.url,
      });
    }

    await mutateState((state) => {
      markOrderPaid(state, created.order.id, "stripe-fallback-simulated");
    });
  }

  return NextResponse.json({
    orderPublicToken: created.order.publicToken,
    trackingUrl: `/${created.order.locale}/orders/${created.order.publicToken}`,
  });
}