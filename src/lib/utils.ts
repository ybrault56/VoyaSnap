import { clsx, type ClassValue } from "clsx";
import { randomBytes, randomUUID } from "crypto";
import { twMerge } from "tailwind-merge";
import { DEFAULT_CURRENCY, DEFAULT_TIME_ZONE } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nowIso() {
  return new Date().toISOString();
}

export function addMinutes(dateIso: string, minutes: number) {
  return new Date(new Date(dateIso).getTime() + minutes * 60_000).toISOString();
}

export function addSeconds(dateIso: string, seconds: number) {
  return new Date(new Date(dateIso).getTime() + seconds * 1_000).toISOString();
}

export function formatCurrency(amountCents: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

export function formatDateTime(
  value: string | undefined,
  locale = "fr-FR",
  timeZone = DEFAULT_TIME_ZONE,
) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function getHourInTimeZone(value: string, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(value));
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number(hourPart);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function generateId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function createPublicToken() {
  return randomBytes(6).toString("base64url");
}

export function coerceNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 80);
}

export function sortByDateAscending<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(getDate(left) ?? 0).getTime();
    const rightTime = new Date(getDate(right) ?? 0).getTime();
    return leftTime - rightTime;
  });
}

export function parseMaybeNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
