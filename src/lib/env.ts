import type { AdminRole } from "./types";

function readTrimmed(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readBoolean(name: string, fallback = false) {
  const value = readTrimmed(name);
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumber(name: string, fallback: number) {
  const value = readTrimmed(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAppUrl() {
  return readTrimmed("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "");
}

export function getMediaSigningSecret() {
  return readTrimmed("MEDIA_URL_SECRET") ?? "screen-me-dev-secret";
}

export function isDatabaseConfigured() {
  return Boolean(readTrimmed("DATABASE_URL"));
}

export function getDatabaseUrl() {
  const value = readTrimmed("DATABASE_URL");
  if (!value) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return value;
}

export type ObjectStorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function getObjectStorageConfig(): ObjectStorageConfig | null {
  const bucket = readTrimmed("S3_BUCKET");
  const region = readTrimmed("S3_REGION");
  const accessKeyId = readTrimmed("S3_ACCESS_KEY_ID");
  const secretAccessKey = readTrimmed("S3_SECRET_ACCESS_KEY");

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    region,
    endpoint: readTrimmed("S3_ENDPOINT"),
    accessKeyId,
    secretAccessKey,
    forcePathStyle: readBoolean("S3_FORCE_PATH_STYLE", false),
  };
}

export function isObjectStorageConfigured() {
  return getObjectStorageConfig() !== null;
}

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  replyTo?: string;
};

export function getEmailConfig(): EmailConfig | null {
  const host = readTrimmed("SMTP_HOST");
  const from = readTrimmed("EMAIL_FROM");

  if (!host || !from) {
    return null;
  }

  return {
    host,
    port: readNumber("SMTP_PORT", 587),
    secure: readBoolean("SMTP_SECURE", false),
    user: readTrimmed("SMTP_USER"),
    password: readTrimmed("SMTP_PASSWORD"),
    from,
    replyTo: readTrimmed("EMAIL_REPLY_TO"),
  };
}

export function isEmailConfigured() {
  return getEmailConfig() !== null;
}

export type AdminCredentials = {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  sessionSecret: string;
};

export function getAdminCredentials(): AdminCredentials | null {
  const email = readTrimmed("ADMIN_EMAIL");
  const password = readTrimmed("ADMIN_PASSWORD");
  const sessionSecret = readTrimmed("ADMIN_SESSION_SECRET");

  if (!email || !password || !sessionSecret) {
    return null;
  }

  const roleValue = readTrimmed("ADMIN_ROLE");
  const role: AdminRole = roleValue === "moderator" ? "moderator" : "ops_admin";

  return {
    email,
    password,
    name: readTrimmed("ADMIN_NAME") ?? "Screen Me Admin",
    role,
    sessionSecret,
  };
}

export function isAdminAuthConfigured() {
  return getAdminCredentials() !== null;
}

export function getPlayerDeviceToken() {
  return readTrimmed("PLAYER_DEVICE_TOKEN");
}