import { NextResponse } from "next/server";
import { DEFAULT_SCREEN_ID } from "@/lib/constants";
import { mutateState } from "@/lib/store";
import { buildPlayerFeed } from "@/lib/workflow";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const screenId = url.searchParams.get("screenId") ?? DEFAULT_SCREEN_ID;
  const token = url.searchParams.get("token") ?? "";

  const feed = await mutateState((state) => buildPlayerFeed(state, screenId, token));

  if (!feed) {
    return NextResponse.json({ error: "Unauthorized player device." }, { status: 401 });
  }

  return NextResponse.json(feed);
}