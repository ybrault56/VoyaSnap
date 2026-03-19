import { DEFAULT_SCREEN_ID } from "./constants";
import { createSignedMediaUrl } from "./media";
import { getPricingRule } from "./delivery-rules";
import { buildQuote, redeemVoucher, updatePricingRule } from "./pricing";
import { recomputeSchedule, deriveSlotStatus } from "./scheduler";
import type {
  AdminRole,
  AppState,
  CreditVoucher,
  NotificationKind,
  Order,
  OrderItem,
  OrderRequest,
  OrderSnapshot,
  PlaySlot,
  PlayerFeedEntry,
  PricingRule,
} from "./types";
import { createPublicToken, generateId, nowIso } from "./utils";

function addAudit(
  state: AppState,
  actorRole: "system" | AdminRole | "traveler",
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  state.auditEntries.unshift({
    id: generateId("audit"),
    actorRole,
    action,
    entityType,
    entityId,
    summary,
    createdAt: nowIso(),
  });
}

function queueNotification(
  state: AppState,
  orderId: string,
  recipient: string,
  kind: NotificationKind,
  subject: string,
  body: string,
) {
  state.notificationEvents.unshift({
    id: generateId("notif"),
    orderId,
    kind,
    channel: "email",
    recipient,
    payload: { subject, body },
    createdAt: nowIso(),
  });
}

function getOrderBundle(state: AppState, orderId: string) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    return undefined;
  }

  const item = state.orderItems.find((candidate) => candidate.orderId === order.id);
  const submission = item
    ? state.submissions.find((candidate) => candidate.id === item.submissionId)
    : undefined;
  const quote = state.quotes.find((candidate) => candidate.id === order.quoteId);

  if (!item || !submission || !quote) {
    return undefined;
  }

  return { order, item, submission, quote };
}

function getOrderBundleByItem(state: AppState, orderItemId: string) {
  const item = state.orderItems.find((candidate) => candidate.id === orderItemId);
  if (!item) {
    return undefined;
  }

  const order = state.orders.find((candidate) => candidate.id === item.orderId);
  const submission = state.submissions.find((candidate) => candidate.id === item.submissionId);
  const quote = order ? state.quotes.find((candidate) => candidate.id === order.quoteId) : undefined;

  if (!order || !submission || !quote) {
    return undefined;
  }

  return { order, item, submission, quote };
}

function deriveOrderStatusFromSlots(order: Order, slots: PlaySlot[]) {
  if (order.status === "rejected_credit_issued" || order.status === "cancelled") {
    return order.status;
  }

  const derivedSlots = slots.map((slot) => deriveSlotStatus(slot));

  if (derivedSlots.includes("playing")) {
    return "playing";
  }

  if (derivedSlots.length > 0 && derivedSlots.every((slot) => slot === "completed")) {
    return "completed";
  }

  return order.status;
}

function syncOrderTiming(order: Order, slots: PlaySlot[]) {
  const sortedSlots = [...slots].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );

  order.actualFirstPlayAt = sortedSlots[0]?.startAt;
}

function createVoucher(order: Order, item: OrderItem, reason: string): CreditVoucher {
  return {
    id: generateId("voucher"),
    code: `SM-${createPublicToken().toUpperCase()}`,
    orderId: order.id,
    orderItemId: item.id,
    amountCents: order.totalCents,
    currency: order.currency,
    email: order.customerEmail,
    reason,
    status: "active",
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString(),
  };
}

export function listOrderSnapshots(state: AppState): OrderSnapshot[] {
  const snapshots: OrderSnapshot[] = [];

  for (const order of state.orders) {
    const snapshot = buildOrderSnapshot(state, order.publicToken);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots.sort(
    (left, right) =>
      new Date(right.order.createdAt).getTime() - new Date(left.order.createdAt).getTime(),
  );
}

export function listModerationQueue(state: AppState): OrderSnapshot[] {
  return listOrderSnapshots(state).filter(
    (snapshot): snapshot is OrderSnapshot =>
      snapshot.order.status === "paid_pending_moderation",
  );
}

export function buildOrderSnapshot(state: AppState, publicToken: string) {
  const order = state.orders.find((candidate) => candidate.publicToken === publicToken);
  if (!order) {
    return undefined;
  }

  const item = state.orderItems.find((candidate) => candidate.orderId === order.id);
  const submission = item
    ? state.submissions.find((candidate) => candidate.id === item.submissionId)
    : undefined;
  const quote = state.quotes.find((candidate) => candidate.id === order.quoteId);
  if (!item || !submission || !quote) {
    return undefined;
  }

  const slots = state.playSlots.filter((slot) => slot.orderItemId === item.id);
  const reviews = state.moderationReviews.filter((review) => review.orderId === order.id);
  const voucher = state.creditVouchers.find((candidate) => candidate.orderId === order.id);
  const notifications = state.notificationEvents.filter(
    (notification) => notification.orderId === order.id,
  );

  syncOrderTiming(order, slots);

  return {
    order,
    item,
    submission,
    quote,
    slots,
    reviews,
    voucher,
    notifications,
    displayStatus: deriveOrderStatusFromSlots(order, slots),
  };
}

export function createOrder(state: AppState, input: OrderRequest, paymentMode: "simulated" | "stripe") {
  const { quote, voucher } = buildQuote(state, input);
  const createdAt = nowIso();
  const submissionId = generateId("submission");
  const orderId = generateId("order");
  const orderItemId = generateId("item");

  const submission = {
    id: submissionId,
    mediaType: input.mediaType,
    locale: input.locale,
    title: input.title,
    messageText: input.messageText,
    storageKey: input.storageKey,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    width: input.width,
    height: input.height,
    clipDurationSeconds: input.clipDurationSeconds,
    audioWillBeMuted: input.mediaType === "video",
    scanStatus: "pending" as const,
    previewUrl: input.storageKey ? createSignedMediaUrl(input.storageKey) : undefined,
    createdAt,
    updatedAt: createdAt,
  };

  const orderItem: OrderItem = {
    id: orderItemId,
    orderId,
    submissionId,
    screenId: input.screenId,
    mediaType: input.mediaType,
    renderDurationSeconds: quote.renderDurationSeconds,
    repeatEveryMinutes: quote.repeatEveryMinutes,
    requestedWindowStartAt: input.requestedWindowStartAt,
    requestedWindowEndAt: input.requestedWindowEndAt,
    quoteBreakdown: quote.breakdown,
    scheduledSlotIds: [],
    messageTemplate: "postcard",
    createdAt,
    updatedAt: createdAt,
  };

  const order: Order = {
    id: orderId,
    publicToken: createPublicToken(),
    locale: input.locale,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: paymentMode === "stripe" ? "checkout_pending" : "paid_pending_moderation",
    quoteId: quote.id,
    itemIds: [orderItem.id],
    paymentMode,
    appliedVoucherCode: voucher?.code,
    totalCents: quote.breakdown.totalCents,
    currency: quote.currency,
    requestedWindowStartAt: input.requestedWindowStartAt,
    requestedWindowEndAt: input.requestedWindowEndAt,
    estimatedFirstPlayAt: quote.estimatedFirstPlayAt,
    rightsAccepted: input.rightsAccepted,
    policyAccepted: input.policyAccepted,
    createdAt,
    updatedAt: createdAt,
    paidAt: paymentMode === "simulated" ? createdAt : undefined,
  };

  state.quotes.unshift(quote);
  state.submissions.unshift(submission);
  state.orderItems.unshift(orderItem);
  state.orders.unshift(order);

  if (paymentMode === "simulated") {
    redeemVoucher(voucher);
    queueNotification(
      state,
      order.id,
      order.customerEmail,
      "payment_confirmed",
      "Confirmation de commande Screen Me",
      `Votre commande ${order.publicToken} est payee et en attente de moderation.`,
    );
    addAudit(state, "traveler", "order.paid.simulated", "order", order.id, "Commande payee en mode simulation.");
  } else {
    addAudit(state, "traveler", "order.checkout.started", "order", order.id, "Session Checkout Stripe preparee.");
  }

  return { order, item: orderItem, submission, quote };
}

export function markOrderPaid(
  state: AppState,
  orderId: string,
  paymentReference: string,
  eventId?: string,
) {
  if (eventId && state.processedWebhookEventIds.includes(eventId)) {
    return getOrderBundle(state, orderId);
  }

  const bundle = getOrderBundle(state, orderId);
  if (!bundle) {
    return undefined;
  }

  bundle.order.status = "paid_pending_moderation";
  bundle.order.paymentReference = paymentReference;
  bundle.order.paidAt = nowIso();
  bundle.order.updatedAt = nowIso();

  if (eventId) {
    bundle.order.stripeEventId = eventId;
    state.processedWebhookEventIds.push(eventId);
  }

  if (bundle.order.appliedVoucherCode) {
    const voucher = state.creditVouchers.find(
      (candidate) => candidate.code === bundle.order.appliedVoucherCode,
    );
    redeemVoucher(voucher);
  }

  queueNotification(
    state,
    bundle.order.id,
    bundle.order.customerEmail,
    "payment_confirmed",
    "Paiement confirme",
    `Votre commande ${bundle.order.publicToken} est bien reglee et attend la moderation.`,
  );
  addAudit(state, "system", "order.paid", "order", bundle.order.id, "Paiement confirme via webhook Stripe.");

  return bundle;
}

export function approveOrderItem(
  state: AppState,
  orderItemId: string,
  reviewerName: string,
  actorRole: AdminRole,
) {
  const bundle = getOrderBundleByItem(state, orderItemId);
  if (!bundle) {
    return undefined;
  }

  bundle.order.status = "approved_scheduled";
  bundle.order.approvedAt = nowIso();
  bundle.order.updatedAt = nowIso();
  bundle.submission.scanStatus = "clean";
  state.moderationReviews.unshift({
    id: generateId("review"),
    orderId: bundle.order.id,
    orderItemId: bundle.item.id,
    status: "approved",
    reviewerRole: actorRole,
    reviewerName,
    createdAt: nowIso(),
  });

  recomputeSchedule(state, bundle.item.screenId);
  const slots = state.playSlots.filter((slot) => slot.orderItemId === bundle.item.id);
  syncOrderTiming(bundle.order, slots);

  queueNotification(
    state,
    bundle.order.id,
    bundle.order.customerEmail,
    "moderation_approved",
    "Contenu approuve",
    `Votre contenu ${bundle.submission.title} est approuve. Premiere diffusion estimee: ${bundle.order.actualFirstPlayAt ?? bundle.order.estimatedFirstPlayAt ?? "a planifier"}.`,
  );
  addAudit(state, actorRole, "moderation.approved", "orderItem", bundle.item.id, "Contenu approuve et planifie.");

  return bundle;
}

export function rejectOrderItem(
  state: AppState,
  orderItemId: string,
  reviewerName: string,
  actorRole: AdminRole,
  reason: string,
) {
  const bundle = getOrderBundleByItem(state, orderItemId);
  if (!bundle) {
    return undefined;
  }

  bundle.order.status = "rejected_credit_issued";
  bundle.order.rejectedAt = nowIso();
  bundle.order.updatedAt = nowIso();
  bundle.submission.scanStatus = "flagged";

  for (const slot of state.playSlots.filter((candidate) => candidate.orderItemId === bundle.item.id)) {
    slot.status = "cancelled";
  }

  const voucher = createVoucher(bundle.order, bundle.item, reason);
  state.creditVouchers.unshift(voucher);
  state.moderationReviews.unshift({
    id: generateId("review"),
    orderId: bundle.order.id,
    orderItemId: bundle.item.id,
    status: "rejected",
    reason,
    reviewerRole: actorRole,
    reviewerName,
    createdAt: nowIso(),
  });

  queueNotification(
    state,
    bundle.order.id,
    bundle.order.customerEmail,
    "moderation_rejected",
    "Contenu refuse",
    `Votre contenu a ete refuse pour la raison suivante: ${reason}. Un code promo ${voucher.code} vous a ete envoye.`,
  );
  queueNotification(
    state,
    bundle.order.id,
    bundle.order.customerEmail,
    "voucher_issued",
    "Code promo Screen Me",
    `Code promo: ${voucher.code}. Montant: ${voucher.amountCents / 100} ${voucher.currency}.`,
  );
  addAudit(state, actorRole, "moderation.rejected", "orderItem", bundle.item.id, "Contenu refuse et voucher emis.");

  return { ...bundle, voucher };
}

export function updatePricing(
  state: AppState,
  input: {
    imageBaseCents: number;
    videoBaseCents: number;
    messageBaseCents: number;
    durationStepCents: number;
    repeatPlayCents: number;
    minimumRenderDurationSeconds: number;
    minimumRepeatMinutes: number;
    maximumDynamicUpliftPercent: number;
    promoVideoUrl?: string;
    promoPosterUrl?: string;
    timeBands: PricingRule["timeBands"];
  },
  reviewerName: string,
) {
  const rule = state.pricingRules.find((candidate) => candidate.screenId === DEFAULT_SCREEN_ID);
  if (!rule) {
    return undefined;
  }

  updatePricingRule(rule as PricingRule, input);
  addAudit(state, "ops_admin", "pricing.updated", "pricingRule", rule.id, `Regles tarifaires mises a jour par ${reviewerName}.`);
  return rule;
}

export function buildPlayerFeed(state: AppState, screenId: string, token: string) {
  const screen = state.screens.find((candidate) => candidate.id === screenId);
  const device = state.deviceSessions.find(
    (candidate) => candidate.screenId === screenId && candidate.token === token,
  );

  if (!screen || !device) {
    return undefined;
  }

  const pricingRule = getPricingRule(state, screenId);

  device.lastFeedAt = nowIso();
  device.status = "online";

  const entries: PlayerFeedEntry[] = [];

  for (const slot of state.playSlots
    .filter((candidate) => candidate.screenId === screenId && deriveSlotStatus(candidate) !== "cancelled")
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())) {
    const item = state.orderItems.find((candidate) => candidate.id === slot.orderItemId);
    const submission = item
      ? state.submissions.find((candidate) => candidate.id === item.submissionId)
      : undefined;
    const order = item
      ? state.orders.find((candidate) => candidate.id === item.orderId)
      : undefined;

    if (!item || !submission || !order) {
      continue;
    }

    entries.push({
      slotId: slot.id,
      orderPublicToken: order.publicToken,
      title: submission.title,
      renderType: submission.mediaType,
      startAt: slot.startAt,
      endAt: slot.endAt,
      durationSeconds: slot.durationSeconds,
      signedUrl: submission.storageKey ? createSignedMediaUrl(submission.storageKey) : undefined,
      messageText: submission.messageText,
    });
  }

  return {
    screen,
    device,
    now: nowIso(),
    fallback: {
      headline: screen.fallbackHeadline,
      body: screen.fallbackBody,
      promoVideoUrl: pricingRule.promoVideoUrl,
      promoPosterUrl: pricingRule.promoPosterUrl,
    },
    entries,
  };
}

export function recordHeartbeat(state: AppState, screenId: string, token: string) {
  const device = state.deviceSessions.find(
    (candidate) => candidate.screenId === screenId && candidate.token === token,
  );
  if (!device) {
    return undefined;
  }

  device.lastHeartbeatAt = nowIso();
  device.status = "online";
  addAudit(state, "system", "player.heartbeat", "deviceSession", device.id, "Heartbeat player recu.");
  return device;
}
