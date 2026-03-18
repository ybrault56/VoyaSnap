import { NextResponse } from "next/server";
import { DEFAULT_SCREEN_ID } from "@/lib/constants";
import { recomputeSchedule } from "@/lib/scheduler";
import { mutateState } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const screenId = String(formData.get("screenId") ?? DEFAULT_SCREEN_ID);
  const actorRole = String(formData.get("actorRole") ?? "moderator");

  if (actorRole !== "ops_admin") {
    return NextResponse.json({ error: "ops_admin role required." }, { status: 403 });
  }

  const slotCount = await mutateState((state) => {
    recomputeSchedule(state, screenId);
    return state.playSlots.filter((slot) => slot.screenId === screenId).length;
  });

  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.length > 0) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({ ok: true, slotCount });
}