/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, type PrismaClient } from "@prisma/client";
import { DEFAULT_LOCALE } from "./constants";
import { getPrismaClient } from "./db";
import { sendNotificationEmail } from "./mail";
import { createSeedState } from "./seed";
import type {
  AppState,
  AuditEntry,
  CreditVoucher,
  DeviceSession,
  ModerationReview,
  NotificationEvent,
  Order,
  OrderItem,
  PlaySlot,
  PricingOccupancyBand,
  PricingRule,
  PricingTimeBand,
  Quote,
  QuoteBreakdown,
  Screen,
  Submission,
} from "./types";
import { nowIso } from "./utils";

const APP_STATE_LOCK_ID = 38092104;
let mutationQueue: Promise<unknown> = Promise.resolve();

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function requirePrismaClient() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return prisma;
}

const toDate = (value?: string | null) => (value ? new Date(value) : null);
const asIso = (value?: Date | null) => value?.toISOString();
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

function collectNewNotificationIds(previous: AppState, next: AppState) {
  const previousIds = new Set(previous.notificationEvents.map((notification) => notification.id));
  return next.notificationEvents
    .filter((notification) => !previousIds.has(notification.id))
    .map((notification) => notification.id);
}

const mapScreen = (record: any): Screen => ({
  id: record.id,
  slug: record.slug,
  name: record.name,
  locationLabel: record.locationLabel,
  timezone: record.timezone,
  currency: record.currency,
  isActive: record.isActive,
  playbackBufferSeconds: record.playbackBufferSeconds,
  fallbackHeadline: record.fallbackHeadline,
  fallbackBody: record.fallbackBody,
  deviceToken: record.deviceToken,
});

const mapSubmission = (record: any): Submission => ({
  id: record.id,
  mediaType: record.mediaType,
  locale: record.locale,
  title: record.title,
  messageText: record.messageText ?? undefined,
  storageKey: record.storageKey ?? undefined,
  originalFileName: record.originalFileName ?? undefined,
  mimeType: record.mimeType ?? undefined,
  fileSizeBytes: record.fileSizeBytes ?? undefined,
  width: record.width ?? undefined,
  height: record.height ?? undefined,
  clipDurationSeconds: record.clipDurationSeconds ?? undefined,
  audioWillBeMuted: record.audioWillBeMuted,
  scanStatus: record.scanStatus,
  previewUrl: record.previewUrl ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapQuote = (record: any): Quote => ({
  id: record.id,
  screenId: record.screenId,
  locale: record.locale,
  mediaType: record.mediaType,
  renderDurationSeconds: record.renderDurationSeconds,
  repeatEveryMinutes: record.repeatEveryMinutes,
  requestedWindowStartAt: record.requestedWindowStartAt.toISOString(),
  requestedWindowEndAt: record.requestedWindowEndAt.toISOString(),
  voucherCode: record.voucherCode ?? undefined,
  breakdown: record.breakdownJson as QuoteBreakdown,
  currency: record.currency,
  estimatedFirstPlayAt: asIso(record.estimatedFirstPlayAt),
  expiresAt: record.expiresAt.toISOString(),
  createdAt: record.createdAt.toISOString(),
});
const mapOrder = (record: any): Order => ({
  id: record.id,
  publicToken: record.publicToken,
  locale: record.locale,
  customerName: record.customerName,
  customerEmail: record.customerEmail,
  customerPhone: record.customerPhone,
  status: record.status,
  quoteId: record.quoteId,
  itemIds: record.items.map((item: { id: string }) => item.id),
  paymentMode: record.paymentMode,
  paymentSessionId: record.paymentSessionId ?? undefined,
  paymentReference: record.paymentReference ?? undefined,
  stripeEventId: record.stripeEventId ?? undefined,
  appliedVoucherCode: record.appliedVoucherCode ?? undefined,
  totalCents: record.totalCents,
  currency: record.currency,
  requestedWindowStartAt: record.requestedWindowStartAt.toISOString(),
  requestedWindowEndAt: record.requestedWindowEndAt.toISOString(),
  estimatedFirstPlayAt: asIso(record.estimatedFirstPlayAt),
  actualFirstPlayAt: asIso(record.actualFirstPlayAt),
  paidAt: asIso(record.paidAt),
  approvedAt: asIso(record.approvedAt),
  rejectedAt: asIso(record.rejectedAt),
  rightsAccepted: record.rightsAccepted,
  policyAccepted: record.policyAccepted,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapOrderItem = (record: any): OrderItem => ({
  id: record.id,
  orderId: record.orderId,
  submissionId: record.submissionId,
  screenId: record.screenId,
  mediaType: record.mediaType,
  renderDurationSeconds: record.renderDurationSeconds,
  repeatEveryMinutes: record.repeatEveryMinutes,
  requestedWindowStartAt: record.requestedWindowStartAt.toISOString(),
  requestedWindowEndAt: record.requestedWindowEndAt.toISOString(),
  quoteBreakdown: record.quoteBreakdownJson as QuoteBreakdown,
  scheduledSlotIds: record.scheduledSlotIds,
  messageTemplate: record.messageTemplate,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapPlaySlot = (record: any): PlaySlot => ({
  id: record.id,
  screenId: record.screenId,
  orderItemId: record.orderItemId,
  submissionId: record.submissionId,
  startAt: record.startAt.toISOString(),
  endAt: record.endAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: record.status,
});

const mapModerationReview = (record: any): ModerationReview => ({
  id: record.id,
  orderId: record.orderId,
  orderItemId: record.orderItemId,
  status: record.status,
  reason: record.reason ?? undefined,
  reviewerRole: record.reviewerRole,
  reviewerName: record.reviewerName,
  createdAt: record.createdAt.toISOString(),
});

const mapPricingRule = (record: any): PricingRule => ({
  id: record.id,
  screenId: record.screenId,
  name: record.name,
  currency: record.currency,
  basePriceCents: record.basePriceJson as PricingRule["basePriceCents"],
  durationStepSeconds: record.durationStepSeconds,
  durationStepCents: record.durationStepCents,
  repeatPlayCents: record.repeatPlayCents,
  minimumRenderDurationSeconds: record.minimumRenderDurationSeconds ?? record.durationStepSeconds,
  minimumRepeatMinutes: record.minimumRepeatMinutes ?? 10,
  maximumDynamicUpliftPercent: record.maximumDynamicUpliftPercent ?? 25,
  promoVideoUrl: record.promoVideoUrl ?? undefined,
  promoPosterUrl: record.promoPosterUrl ?? undefined,
  timeBands: record.timeBandsJson as PricingTimeBand[],
  occupancyBands: record.occupancyBandsJson as PricingOccupancyBand[],
  updatedAt: record.updatedAt.toISOString(),
});

const mapVoucher = (record: any): CreditVoucher => ({
  id: record.id,
  code: record.code,
  orderId: record.orderId,
  orderItemId: record.orderItemId,
  amountCents: record.amountCents,
  currency: record.currency,
  email: record.email,
  reason: record.reason,
  status: record.status,
  expiresAt: asIso(record.expiresAt),
  redeemedAt: asIso(record.redeemedAt),
  createdAt: record.createdAt.toISOString(),
});

const mapNotification = (record: any): NotificationEvent => ({
  id: record.id,
  orderId: record.orderId,
  kind: record.kind,
  channel: record.channel,
  recipient: record.recipient,
  payload: record.payloadJson as NotificationEvent["payload"],
  sentAt: asIso(record.sentAt),
  deliveryError: record.deliveryError ?? undefined,
  createdAt: record.createdAt.toISOString(),
});

const mapDeviceSession = (record: any): DeviceSession => ({
  id: record.id,
  screenId: record.screenId,
  deviceName: record.deviceName,
  token: record.token,
  status: record.status,
  lastHeartbeatAt: asIso(record.lastHeartbeatAt),
  lastFeedAt: asIso(record.lastFeedAt),
});

const mapAuditEntry = (record: any): AuditEntry => ({
  id: record.id,
  actorRole: record.actorRole,
  action: record.action,
  entityType: record.entityType,
  entityId: record.entityId,
  summary: record.summary,
  createdAt: record.createdAt.toISOString(),
});

async function replaceState(client: DatabaseClient, state: AppState) {
  await client.playSlot.deleteMany();
  await client.moderationReview.deleteMany();
  await client.creditVoucher.deleteMany();
  await client.notificationEvent.deleteMany();
  await client.orderItem.deleteMany();
  await client.order.deleteMany();
  await client.submission.deleteMany();
  await client.quote.deleteMany();
  await client.deviceSession.deleteMany();
  await client.pricingRule.deleteMany();
  await client.auditEntry.deleteMany();
  await client.processedWebhookEvent.deleteMany();
  await client.screen.deleteMany();

  if (state.screens.length > 0) {
    await client.screen.createMany({ data: state.screens.map((screen) => ({
      id: screen.id,
      slug: screen.slug,
      name: screen.name,
      locationLabel: screen.locationLabel,
      timezone: screen.timezone,
      currency: screen.currency,
      isActive: screen.isActive,
      playbackBufferSeconds: screen.playbackBufferSeconds,
      fallbackHeadline: screen.fallbackHeadline,
      fallbackBody: screen.fallbackBody,
      deviceToken: screen.deviceToken,
    })) });
  }

  if (state.pricingRules.length > 0) {
    await client.pricingRule.createMany({ data: state.pricingRules.map((rule) => ({
      id: rule.id,
      screenId: rule.screenId,
      name: rule.name,
      currency: rule.currency,
      basePriceJson: asJson(rule.basePriceCents),
      durationStepSeconds: rule.durationStepSeconds,
      durationStepCents: rule.durationStepCents,
      repeatPlayCents: rule.repeatPlayCents,
      minimumRenderDurationSeconds: rule.minimumRenderDurationSeconds,
      minimumRepeatMinutes: rule.minimumRepeatMinutes,
      maximumDynamicUpliftPercent: rule.maximumDynamicUpliftPercent,
      promoVideoUrl: rule.promoVideoUrl ?? null,
      promoPosterUrl: rule.promoPosterUrl ?? null,
      timeBandsJson: asJson(rule.timeBands),
      occupancyBandsJson: asJson(rule.occupancyBands),
      updatedAt: new Date(rule.updatedAt),
    })) });
  }

  if (state.quotes.length > 0) {
    await client.quote.createMany({ data: state.quotes.map((quote) => ({
      id: quote.id,
      screenId: quote.screenId,
      locale: quote.locale,
      mediaType: quote.mediaType as never,
      renderDurationSeconds: quote.renderDurationSeconds,
      repeatEveryMinutes: quote.repeatEveryMinutes ?? null,
      requestedWindowStartAt: new Date(quote.requestedWindowStartAt),
      requestedWindowEndAt: new Date(quote.requestedWindowEndAt),
      voucherCode: quote.voucherCode ?? null,
      breakdownJson: asJson(quote.breakdown),
      currency: quote.currency,
      estimatedFirstPlayAt: toDate(quote.estimatedFirstPlayAt),
      expiresAt: new Date(quote.expiresAt),
      createdAt: new Date(quote.createdAt),
    })) });
  }
  if (state.submissions.length > 0) {
    await client.submission.createMany({ data: state.submissions.map((submission) => ({
      id: submission.id,
      mediaType: submission.mediaType as never,
      locale: submission.locale,
      title: submission.title,
      messageText: submission.messageText ?? null,
      storageKey: submission.storageKey ?? null,
      originalFileName: submission.originalFileName ?? null,
      mimeType: submission.mimeType ?? null,
      fileSizeBytes: submission.fileSizeBytes ?? null,
      width: submission.width ?? null,
      height: submission.height ?? null,
      clipDurationSeconds: submission.clipDurationSeconds ?? null,
      audioWillBeMuted: submission.audioWillBeMuted,
      scanStatus: submission.scanStatus,
      previewUrl: submission.previewUrl ?? null,
      createdAt: new Date(submission.createdAt),
      updatedAt: new Date(submission.updatedAt),
    })) });
  }

  if (state.orders.length > 0) {
    await client.order.createMany({ data: state.orders.map((order) => ({
      id: order.id,
      publicToken: order.publicToken,
      locale: order.locale,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      status: order.status as never,
      quoteId: order.quoteId,
      paymentMode: order.paymentMode,
      paymentSessionId: order.paymentSessionId ?? null,
      paymentReference: order.paymentReference ?? null,
      stripeEventId: order.stripeEventId ?? null,
      appliedVoucherCode: order.appliedVoucherCode ?? null,
      totalCents: order.totalCents,
      currency: order.currency,
      requestedWindowStartAt: new Date(order.requestedWindowStartAt),
      requestedWindowEndAt: new Date(order.requestedWindowEndAt),
      estimatedFirstPlayAt: toDate(order.estimatedFirstPlayAt),
      actualFirstPlayAt: toDate(order.actualFirstPlayAt),
      paidAt: toDate(order.paidAt),
      approvedAt: toDate(order.approvedAt),
      rejectedAt: toDate(order.rejectedAt),
      rightsAccepted: order.rightsAccepted,
      policyAccepted: order.policyAccepted,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    })) });
  }

  if (state.orderItems.length > 0) {
    await client.orderItem.createMany({ data: state.orderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      submissionId: item.submissionId,
      screenId: item.screenId,
      mediaType: item.mediaType as never,
      renderDurationSeconds: item.renderDurationSeconds,
      repeatEveryMinutes: item.repeatEveryMinutes ?? null,
      requestedWindowStartAt: new Date(item.requestedWindowStartAt),
      requestedWindowEndAt: new Date(item.requestedWindowEndAt),
      quoteBreakdownJson: asJson(item.quoteBreakdown),
      scheduledSlotIds: item.scheduledSlotIds,
      messageTemplate: item.messageTemplate,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })) });
  }

  if (state.playSlots.length > 0) {
    await client.playSlot.createMany({ data: state.playSlots.map((slot) => ({
      id: slot.id,
      screenId: slot.screenId,
      orderItemId: slot.orderItemId,
      submissionId: slot.submissionId,
      startAt: new Date(slot.startAt),
      endAt: new Date(slot.endAt),
      durationSeconds: slot.durationSeconds,
      status: slot.status as never,
    })) });
  }

  if (state.moderationReviews.length > 0) {
    await client.moderationReview.createMany({ data: state.moderationReviews.map((review) => ({
      id: review.id,
      orderId: review.orderId,
      orderItemId: review.orderItemId,
      status: review.status as never,
      reason: review.reason ?? null,
      reviewerRole: review.reviewerRole as never,
      reviewerName: review.reviewerName,
      createdAt: new Date(review.createdAt),
    })) });
  }

  if (state.creditVouchers.length > 0) {
    await client.creditVoucher.createMany({ data: state.creditVouchers.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      orderId: voucher.orderId,
      orderItemId: voucher.orderItemId,
      amountCents: voucher.amountCents,
      currency: voucher.currency,
      email: voucher.email,
      reason: voucher.reason,
      status: voucher.status as never,
      expiresAt: toDate(voucher.expiresAt),
      redeemedAt: toDate(voucher.redeemedAt),
      createdAt: new Date(voucher.createdAt),
    })) });
  }

  if (state.notificationEvents.length > 0) {
    await client.notificationEvent.createMany({ data: state.notificationEvents.map((notification) => ({
      id: notification.id,
      orderId: notification.orderId,
      kind: notification.kind,
      channel: notification.channel,
      recipient: notification.recipient,
      payloadJson: asJson(notification.payload),
      sentAt: toDate(notification.sentAt),
      deliveryError: notification.deliveryError ?? null,
      createdAt: new Date(notification.createdAt),
    })) });
  }

  if (state.deviceSessions.length > 0) {
    await client.deviceSession.createMany({ data: state.deviceSessions.map((device) => ({
      id: device.id,
      screenId: device.screenId,
      deviceName: device.deviceName,
      token: device.token,
      status: device.status,
      lastHeartbeatAt: toDate(device.lastHeartbeatAt),
      lastFeedAt: toDate(device.lastFeedAt),
    })) });
  }

  if (state.auditEntries.length > 0) {
    await client.auditEntry.createMany({ data: state.auditEntries.map((entry) => ({
      id: entry.id,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: new Date(entry.createdAt),
    })) });
  }

  if (state.processedWebhookEventIds.length > 0) {
    await client.processedWebhookEvent.createMany({ data: state.processedWebhookEventIds.map((eventId) => ({
      eventId,
      orderId: state.orders.find((order) => order.stripeEventId === eventId)?.id ?? null,
      processedAt: new Date(),
    })) });
  }
}

async function ensureDatabaseSeeded(client: DatabaseClient) {
  if ((await client.screen.count()) > 0) {
    return;
  }

  await replaceState(client, createSeedState());
}

async function loadState(client: DatabaseClient): Promise<AppState> {
  const [screens, pricingRules, submissions, quotes, orders, orderItems, playSlots, moderationReviews, creditVouchers, notificationEvents, deviceSessions, auditEntries, processedWebhookEvents] = await Promise.all([
    client.screen.findMany(),
    client.pricingRule.findMany(),
    client.submission.findMany(),
    client.quote.findMany(),
    client.order.findMany({
      select: {
        id: true,
        publicToken: true,
        locale: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        status: true,
        quoteId: true,
        paymentMode: true,
        paymentSessionId: true,
        paymentReference: true,
        stripeEventId: true,
        appliedVoucherCode: true,
        totalCents: true,
        currency: true,
        requestedWindowStartAt: true,
        requestedWindowEndAt: true,
        estimatedFirstPlayAt: true,
        actualFirstPlayAt: true,
        paidAt: true,
        approvedAt: true,
        rejectedAt: true,
        rightsAccepted: true,
        policyAccepted: true,
        createdAt: true,
        updatedAt: true,
        items: { select: { id: true } },
      },
    }),
    client.orderItem.findMany(),
    client.playSlot.findMany(),
    client.moderationReview.findMany(),
    client.creditVoucher.findMany(),
    client.notificationEvent.findMany(),
    client.deviceSession.findMany(),
    client.auditEntry.findMany(),
    client.processedWebhookEvent.findMany({ orderBy: { processedAt: "asc" } }),
  ]);
  return {
    version: 1,
    defaultLocale: DEFAULT_LOCALE,
    screens: screens.map(mapScreen),
    pricingRules: pricingRules.map(mapPricingRule),
    submissions: submissions.map(mapSubmission),
    quotes: quotes.map(mapQuote),
    orders: orders.map(mapOrder),
    orderItems: orderItems.map(mapOrderItem),
    playSlots: playSlots.map(mapPlaySlot),
    moderationReviews: moderationReviews.map(mapModerationReview),
    creditVouchers: creditVouchers.map(mapVoucher),
    notificationEvents: notificationEvents.map(mapNotification),
    deviceSessions: deviceSessions.map(mapDeviceSession),
    auditEntries: auditEntries.map(mapAuditEntry),
    processedWebhookEventIds: processedWebhookEvents.map((entry) => entry.eventId),
    updatedAt: nowIso(),
  };
}

async function flushNotifications(notificationIds: string[]) {
  if (notificationIds.length === 0) {
    return;
  }

  const prisma = requirePrismaClient();
  const notifications = await prisma.notificationEvent.findMany({
    where: { id: { in: notificationIds } },
    orderBy: { createdAt: "asc" },
  });

  for (const record of notifications) {
    if (record.sentAt) {
      continue;
    }

    const delivery = await sendNotificationEmail(mapNotification(record));
    await prisma.notificationEvent.update({
      where: { id: record.id },
      data: {
        sentAt: toDate(delivery.sentAt),
        deliveryError: delivery.deliveryError ?? null,
      },
    });
  }
}

export async function readDbState() {
  const prisma = requirePrismaClient();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${APP_STATE_LOCK_ID})`);
    await ensureDatabaseSeeded(tx);
  });

  return loadState(prisma);
}

export async function mutateDbState<T>(mutator: (draft: AppState) => Promise<T> | T) {
  const prisma = requirePrismaClient();
  const task = mutationQueue.then(async () => {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${APP_STATE_LOCK_ID})`);
        await ensureDatabaseSeeded(tx);
        const current = await loadState(tx);
        const draft = structuredClone(current) as AppState;
        const result = await mutator(draft);
        draft.updatedAt = nowIso();
        const notificationIds = collectNewNotificationIds(current, draft);
        await replaceState(tx, draft);
        return { result, notificationIds };
      },
      { timeout: 60000 },
    );

    await flushNotifications(outcome.notificationIds);
    return outcome.result;
  });

  mutationQueue = task.catch(() => undefined);
  return task;
}

export async function resetDbState() {
  const prisma = requirePrismaClient();
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${APP_STATE_LOCK_ID})`);
      await replaceState(tx, createSeedState());
    },
    { timeout: 60000 },
  );
}
