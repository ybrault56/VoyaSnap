import { NextResponse } from "next/server";
import { mutateState } from "@/lib/store";
import { recordHeartbeat } from "@/lib/workflow";
import { heartbeatSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = heartbeatSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid heartbeat payload." }, { status: 400 });
  }

  const device = await mutateState((state) =>
    recordHeartbeat(state, parsed.data.screenId, parsed.data.token),
  );

  if (!device) {
    return NextResponse.json({ error: "Unauthorized player device." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, device });
}