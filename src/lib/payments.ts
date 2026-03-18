import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

function getStripeClient() {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    stripeClient = null;
    return stripeClient;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_APP_URL);
}

export async function createStripeCheckoutSession(input: {
  orderId: string;
  publicToken: string;
  amountCents: number;
  locale: string;
  customerEmail: string;
  title: string;
}) {
  const stripe = getStripeClient();
  if (!stripe || !process.env.NEXT_PUBLIC_APP_URL) {
    return undefined;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/${input.locale}/orders/${input.publicToken}?checkout=success`,
    cancel_url: `${appUrl}/${input.locale}/submit?checkout=cancelled`,
    customer_email: input.customerEmail,
    client_reference_id: input.orderId,
    metadata: {
      orderId: input.orderId,
      publicToken: input.publicToken,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: {
            name: `Diffusion Screen Me - ${input.title}`,
          },
          unit_amount: input.amountCents,
        },
      },
    ],
  });
}

export async function parseStripeEvent(request: Request) {
  const rawBody = await request.text();
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (stripe && signature && webhookSecret) {
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  return JSON.parse(rawBody) as {
    id: string;
    type: string;
    data: {
      object: {
        client_reference_id?: string;
        metadata?: { orderId?: string };
        payment_intent?: string;
        id?: string;
      };
    };
  };
}