import { NextResponse } from "next/server";
import { createSignedUpload, createStorageKey } from "@/lib/media";
import { presignRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = presignRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload payload." }, { status: 400 });
  }

  const storageKey = createStorageKey(parsed.data.fileName);
  const signedUpload = await createSignedUpload(storageKey, parsed.data.mimeType);

  return NextResponse.json({
    storageKey,
    ...signedUpload,
  });
}