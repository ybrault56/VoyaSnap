import { NextResponse } from "next/server";
import { readUploadedFile, verifySignedMediaUrl } from "@/lib/media";

const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

function getMimeType(storageKey: string) {
  const extension = storageKey.slice(storageKey.lastIndexOf(".")).toLowerCase();
  return mimeByExtension[extension] ?? "application/octet-stream";
}

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.join("/");
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";

  if (!verifySignedMediaUrl(storageKey, expires, signature)) {
    return NextResponse.json({ error: "Invalid or expired media signature." }, { status: 401 });
  }

  try {
    const file = await readUploadedFile(storageKey);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(storageKey),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
}