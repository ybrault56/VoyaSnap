import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { buildOrderSnapshot } from "@/lib/workflow";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;
  const state = await readState();
  const snapshot = buildOrderSnapshot(state, publicToken);

  if (!snapshot) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}