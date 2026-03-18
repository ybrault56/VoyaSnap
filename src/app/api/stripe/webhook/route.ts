import { NextResponse } from "next/server";
import { parseStripeEvent } from "@/lib/payments";
import { mutateState } from "@/lib/store";
import { markOrderPaid } from "@/lib/workflow";

export const runtime = "nodejs";

type CheckoutSessionShape = {
  client_reference_id?: string;
  metadata?: { orderId?: string };
  payment_intent?: string;
  id?: string;
};

export async function POST(request: Request) {
  try {
    const event = await parseStripeEvent(request);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as CheckoutSessionShape;
      const orderId = String(session.client_reference_id ?? session.metadata?.orderId ?? "");
      const paymentReference = String(session.payment_intent ?? session.id ?? "manual");

      if (!orderId) {
        return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
      }

      await mutateState((state) => {
        markOrderPaid(state, orderId, paymentReference, event.id);
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook parsing failed." },
      { status: 400 },
    );
  }
}