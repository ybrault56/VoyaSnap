import { z } from "zod";
import {
  DEFAULT_SCREEN_ID,
  MAX_FILE_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_SECONDS,
  SUPPORTED_LOCALES,
} from "./constants";

const localeSchema = z.enum(SUPPORTED_LOCALES);
const mediaTypeSchema = z.enum(["image", "video", "message"]);

export const quoteRequestSchema = z
  .object({
    locale: localeSchema.default("fr"),
    screenId: z.string().min(1).default(DEFAULT_SCREEN_ID),
    mediaType: mediaTypeSchema,
    renderDurationSeconds: z.number().int().min(5).max(60),
    repeatEveryMinutes: z.number().int().min(5).max(180).nullable().optional(),
    requestedWindowStartAt: z.string().datetime(),
    requestedWindowEndAt: z.string().datetime(),
    voucherCode: z
      .string()
      .trim()
      .max(48)
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.requestedWindowEndAt) <= new Date(value.requestedWindowStartAt)) {
      ctx.addIssue({
        code: "custom",
        message: "La fin du creneau doit etre posterieure au debut.",
        path: ["requestedWindowEndAt"],
      });
    }
  });

export const orderRequestSchema = quoteRequestSchema.extend({
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.email(),
  customerPhone: z.string().trim().min(6).max(30),
  title: z.string().trim().min(2).max(80),
  messageText: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
  storageKey: z.string().trim().max(255).optional(),
  originalFileName: z.string().trim().max(MAX_FILE_NAME_LENGTH).optional(),
  mimeType: z.string().trim().max(120).optional(),
  fileSizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES).optional(),
  width: z.number().int().positive().max(7680).optional(),
  height: z.number().int().positive().max(4320).optional(),
  clipDurationSeconds: z.number().positive().max(MAX_VIDEO_SECONDS).optional(),
  rightsAccepted: z.boolean(),
  policyAccepted: z.boolean(),
});

export const presignRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(MAX_FILE_NAME_LENGTH),
  mimeType: z.string().trim().min(1).max(120),
  fileSizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const approveModerationSchema = z.object({
  reviewerName: z.string().trim().min(2).max(80).default("Equipe moderation"),
  actorRole: z.enum(["moderator", "ops_admin"]).default("moderator"),
});

export const rejectModerationSchema = approveModerationSchema.extend({
  reason: z.string().trim().min(5).max(300),
});

export const pricingUpdateSchema = z.object({
  actorRole: z.literal("ops_admin"),
  reviewerName: z.string().trim().min(2).max(80).default("Equipe operations"),
  imageBaseCents: z.number().int().min(0).max(100000),
  videoBaseCents: z.number().int().min(0).max(100000),
  messageBaseCents: z.number().int().min(0).max(100000),
  durationStepCents: z.number().int().min(0).max(10000),
  repeatPlayCents: z.number().int().min(0).max(10000),
});

export const heartbeatSchema = z.object({
  screenId: z.string().min(1),
  token: z.string().min(1),
});
