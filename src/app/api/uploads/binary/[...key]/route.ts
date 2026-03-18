import { NextResponse } from "next/server";
import { verifySignedUpload, writeUploadedFile } from "@/lib/media";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.join("/");
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";

  if (!verifySignedUpload(storageKey, expires, signature)) {
    return NextResponse.json({ error: "Invalid or expired upload signature." }, { status: 401 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  await writeUploadedFile(storageKey, buffer);

  return new NextResponse(null, { status: 204 });
}