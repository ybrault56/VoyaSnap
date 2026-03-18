import { NextResponse } from "next/server";
import { mutateState } from "@/lib/store";
import { rejectOrderItem } from "@/lib/workflow";
import { rejectModerationSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await request.formData();
  const parsed = rejectModerationSchema.safeParse({
    reviewerName: formData.get("reviewerName"),
    actorRole: formData.get("actorRole"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid moderation payload." }, { status: 400 });
  }

  const result = await mutateState((state) =>
    rejectOrderItem(
      state,
      id,
      parsed.data.reviewerName,
      parsed.data.actorRole,
      parsed.data.reason,
    ),
  );

  if (!result) {
    return NextResponse.json({ error: "Order item not found." }, { status: 404 });
  }

  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.length > 0) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({ ok: true, orderId: result.order.id, voucher: result.voucher?.code });
}