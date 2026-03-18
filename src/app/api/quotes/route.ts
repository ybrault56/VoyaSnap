import { NextResponse } from "next/server";
import { buildQuote } from "@/lib/pricing";
import { mutateState } from "@/lib/store";
import { quoteRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = quoteRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid quote payload." }, { status: 400 });
  }

  const quote = await mutateState((state) => {
    const { quote: nextQuote } = buildQuote(state, parsed.data);
    state.quotes.unshift(nextQuote);
    return nextQuote;
  });

  return NextResponse.json({ quote });
}