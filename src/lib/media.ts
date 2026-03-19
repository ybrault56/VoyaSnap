import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { MEDIA_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS } from "./constants";
import { getMediaSigningSecret, getObjectStorageConfig } from "./env";
import { sanitizeFileName } from "./utils";

const uploadSecret = getMediaSigningSecret();
const uploadsDirectory = path.join(process.cwd(), ".data", "uploads");

let s3Client: S3Client | null | undefined;

function getS3Client() {
  if (s3Client !== undefined) {
    return s3Client;
  }

  const config = getObjectStorageConfig();
  if (!config) {
    s3Client = null;
    return s3Client;
  }

  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return s3Client;
}

function signPayload(payload: string) {
  return createHmac("sha256", uploadSecret).update(payload).digest("hex");
}

export async function createSignedUpload(storageKey: string, mimeType: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_URL_TTL_SECONDS;
  const client = getS3Client();
  const config = getObjectStorageConfig();

  if (client && config) {
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        ContentType: mimeType,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );

    return {
      expiresAt,
      signature: "s3",
      uploadUrl,
    };
  }

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

export async function writeUploadedFile(
  storageKey: string,
  buffer: Buffer,
  mimeType = "application/octet-stream",
) {
  const client = getS3Client();
  const config = getObjectStorageConfig();

  if (client && config) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return;
  }

  const filePath = path.join(uploadsDirectory, storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

export async function readUploadedFile(storageKey: string) {
  const client = getS3Client();
  const config = getObjectStorageConfig();

  if (client && config) {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      }),
    );

    if (!response.Body) {
      throw new Error("Media not found.");
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

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