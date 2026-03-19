import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { mutateState } from "@/lib/store";
import { approveOrderItem } from "@/lib/workflow";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession("moderator");
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const formData = await request.formData();
  const result = await mutateState((state) =>
    approveOrderItem(state, id, auth.session.name, auth.session.role),
  );

  if (!result) {
    return NextResponse.json({ error: "Order item not found." }, { status: 404 });
  }

  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.length > 0) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({ ok: true, orderId: result.order.id });
}