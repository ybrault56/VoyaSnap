import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  SUPPORTED_LOCALES,
} from "./constants";

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type CurrencyCode = typeof DEFAULT_CURRENCY;
export type TimeZoneName = typeof DEFAULT_TIME_ZONE;
export type MediaType = "image" | "video" | "message";
export type SubmissionScanStatus = "pending" | "clean" | "flagged";
export type ModerationStatus = "approved" | "rejected";
export type OrderStatus =
  | "draft"
  | "quoted"
  | "checkout_pending"
  | "paid_pending_moderation"
  | "approved_scheduled"
  | "rejected_credit_issued"
  | "playing"
  | "completed"
  | "cancelled";
export type PlaySlotStatus = "scheduled" | "playing" | "completed" | "cancelled";
export type VoucherStatus = "active" | "redeemed" | "expired";
export type AdminRole = "moderator" | "ops_admin";
export type PaymentMode = "simulated" | "stripe";
export type NotificationKind =
  | "payment_confirmed"
  | "moderation_approved"
  | "moderation_rejected"
  | "eta_updated"
  | "playback_completed"
  | "voucher_issued";

export type Screen = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  timezone: TimeZoneName;
  currency: CurrencyCode;
  isActive: boolean;
  playbackBufferSeconds: number;
  fallbackHeadline: string;
  fallbackBody: string;
  deviceToken: string;
};

export type Submission = {
  id: string;
  mediaType: MediaType;
  locale: Locale;
  title: string;
  messageText?: string;
  storageKey?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  clipDurationSeconds?: number;
  audioWillBeMuted: boolean;
  scanStatus: SubmissionScanStatus;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuoteBreakdown = {
  basePriceCents: number;
  durationSurchargeCents: number;
  repeatSurchargeCents: number;
  timeWindowFactor: number;
  occupancyFactor: number;
  occupancyRatio: number;
  dynamicUpliftPercent: number;
  baseTrafficUpliftPercent: number;
  liveDemandUpliftPercent: number;
  trafficLabel: string;
  occupancyLabel: string;
  maxSellableRatio: number;
  voucherDiscountCents: number;
  estimatedOccurrences: number;
  subtotalCents: number;
  totalCents: number;
  labels: string[];
};

export type Quote = {
  id: string;
  screenId: string;
  locale: Locale;
  mediaType: MediaType;
  renderDurationSeconds: number;
  repeatEveryMinutes?: number | null;
  requestedWindowStartAt: string;
  requestedWindowEndAt: string;
  voucherCode?: string;
  breakdown: QuoteBreakdown;
  currency: CurrencyCode;
  estimatedFirstPlayAt?: string;
  expiresAt: string;
  createdAt: string;
};

export type Order = {
  id: string;
  publicToken: string;
  locale: Locale;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  quoteId: string;
  itemIds: string[];
  paymentMode: PaymentMode;
  paymentSessionId?: string;
  paymentReference?: string;
  stripeEventId?: string;
  appliedVoucherCode?: string;
  totalCents: number;
  currency: CurrencyCode;
  requestedWindowStartAt: string;
  requestedWindowEndAt: string;
  estimatedFirstPlayAt?: string;
  actualFirstPlayAt?: string;
  paidAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rightsAccepted: boolean;
  policyAccepted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  submissionId: string;
  screenId: string;
  mediaType: MediaType;
  renderDurationSeconds: number;
  repeatEveryMinutes?: number | null;
  requestedWindowStartAt: string;
  requestedWindowEndAt: string;
  quoteBreakdown: QuoteBreakdown;
  scheduledSlotIds: string[];
  messageTemplate: "postcard";
  createdAt: string;
  updatedAt: string;
};

export type PlaySlot = {
  id: string;
  screenId: string;
  orderItemId: string;
  submissionId: string;
  startAt: string;
  endAt: string;
  durationSeconds: number;
  status: PlaySlotStatus;
};

export type ModerationReview = {
  id: string;
  orderId: string;
  orderItemId: string;
  status: ModerationStatus;
  reason?: string;
  reviewerRole: AdminRole;
  reviewerName: string;
  createdAt: string;
};

export type PricingTimeBand = {
  label: string;
  trafficLabel: string;
  startHour: number;
  endHour: number;
  factor: number;
  baseUpliftPercent: number;
  maxSellableRatio: number;
};

export type PricingOccupancyBand = {
  label: string;
  minRatio: number;
  maxRatio: number;
  factor: number;
  upliftPercent: number;
};

export type PricingRule = {
  id: string;
  screenId: string;
  name: string;
  currency: CurrencyCode;
  basePriceCents: Record<MediaType, number>;
  durationStepSeconds: number;
  durationStepCents: number;
  repeatPlayCents: number;
  minimumRenderDurationSeconds: number;
  minimumRepeatMinutes: number;
  maximumDynamicUpliftPercent: number;
  promoVideoUrl?: string;
  promoPosterUrl?: string;
  timeBands: PricingTimeBand[];
  occupancyBands: PricingOccupancyBand[];
  updatedAt: string;
};

export type CreditVoucher = {
  id: string;
  code: string;
  orderId: string;
  orderItemId: string;
  amountCents: number;
  currency: CurrencyCode;
  email: string;
  reason: string;
  status: VoucherStatus;
  expiresAt?: string;
  redeemedAt?: string;
  createdAt: string;
};

export type NotificationEvent = {
  id: string;
  orderId: string;
  kind: NotificationKind;
  channel: "email";
  recipient: string;
  payload: {
    subject: string;
    body: string;
  };
  sentAt?: string;
  deliveryError?: string;
  createdAt: string;
};

export type DeviceSession = {
  id: string;
  screenId: string;
  deviceName: string;
  token: string;
  status: "unknown" | "online" | "offline";
  lastHeartbeatAt?: string;
  lastFeedAt?: string;
};

export type AuditEntry = {
  id: string;
  actorRole: "system" | AdminRole | "traveler";
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
};

export type AppState = {
  version: number;
  defaultLocale: typeof DEFAULT_LOCALE;
  screens: Screen[];
  pricingRules: PricingRule[];
  submissions: Submission[];
  quotes: Quote[];
  orders: Order[];
  orderItems: OrderItem[];
  playSlots: PlaySlot[];
  moderationReviews: ModerationReview[];
  creditVouchers: CreditVoucher[];
  notificationEvents: NotificationEvent[];
  deviceSessions: DeviceSession[];
  auditEntries: AuditEntry[];
  processedWebhookEventIds: string[];
  updatedAt: string;
};

export type QuoteRequest = {
  locale: Locale;
  screenId: string;
  mediaType: MediaType;
  renderDurationSeconds: number;
  repeatEveryMinutes?: number | null;
  requestedWindowStartAt: string;
  requestedWindowEndAt: string;
  voucherCode?: string;
};

export type OrderRequest = QuoteRequest & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;
  messageText?: string;
  storageKey?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  clipDurationSeconds?: number;
  rightsAccepted: boolean;
  policyAccepted: boolean;
};

export type PlayerFeedEntry = {
  slotId: string;
  orderPublicToken: string;
  title: string;
  renderType: MediaType;
  startAt: string;
  endAt: string;
  durationSeconds: number;
  signedUrl?: string;
  messageText?: string;
};

export type OrderSnapshot = {
  order: Order;
  item: OrderItem;
  submission: Submission;
  quote: Quote;
  slots: PlaySlot[];
  reviews: ModerationReview[];
  voucher?: CreditVoucher;
  notifications: NotificationEvent[];
  displayStatus: OrderStatus;
};

export type TravelerCheckoutSettings = {
  minimumRenderDurationSeconds: number;
  minimumRepeatMinutes: number;
  maximumDynamicUpliftPercent: number;
  durationOptions: number[];
  repeatOptions: number[];
  promoVideoUrl?: string;
  promoPosterUrl?: string;
  timeBands: Array<{
    label: string;
    trafficLabel: string;
    startHour: number;
    endHour: number;
    baseUpliftPercent: number;
    maxSellableRatio: number;
  }>;
};
