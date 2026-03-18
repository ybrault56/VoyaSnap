import { createHmac } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { MEDIA_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS } from "./constants";
import { sanitizeFileName } from "./utils";

const uploadSecret = process.env.MEDIA_URL_SECRET ?? "screen-me-dev-secret";
const uploadsDirectory = path.join(process.cwd(), ".data", "uploads");

function signPayload(payload: string) {
  return createHmac("sha256", uploadSecret).update(payload).digest("hex");
}

export function createSignedUpload(storageKey: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_URL_TTL_SECONDS;
  const signature = signPayload(`upload:${storageKey}:${expiresAt}`);

  return {
    expiresAt,
    signature,
    uploadUrl: `/api/uploads/binary/${storageKey}?expires=${expiresAt}&signature=${signature}`,
  };
}

export function verifySignedUpload(storageKey: string, expiresAt: number, signature: string) {
  if (Date.now() / 1000 > expiresAt) {
    return false;
  }

  return signPayload(`upload:${storageKey}:${expiresAt}`) === signature;
}

export function createSignedMediaUrl(storageKey: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + MEDIA_URL_TTL_SECONDS;
  const signature = signPayload(`media:${storageKey}:${expiresAt}`);
  return `/api/media/${storageKey}?expires=${expiresAt}&signature=${signature}`;
}

export function verifySignedMediaUrl(storageKey: string, expiresAt: number, signature: string) {
  if (Date.now() / 1000 > expiresAt) {
    return false;
  }

  return signPayload(`media:${storageKey}:${expiresAt}`) === signature;
}

export async function writeUploadedFile(storageKey: string, buffer: Buffer) {
  const filePath = path.join(uploadsDirectory, storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

export async function readUploadedFile(storageKey: string) {
  const filePath = path.join(uploadsDirectory, storageKey);
  return readFile(filePath);
}

export function createStorageKey(fileName: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeName = sanitizeFileName(fileName);
  const stamp = now.getTime();
  return `${year}/${month}/${stamp}-${safeName}`;
}
