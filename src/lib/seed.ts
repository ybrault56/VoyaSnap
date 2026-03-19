import {
  DEFAULT_CURRENCY,
  DEFAULT_DEVICE_TOKEN,
  DEFAULT_LOCALE,
  DEFAULT_SCREEN_ID,
  DEFAULT_TIME_ZONE,
} from "./constants";
import { getPlayerDeviceToken } from "./env";
import type { AppState, PricingRule, Screen } from "./types";
import { generateId, nowIso } from "./utils";

function createDefaultScreen(): Screen {
  const deviceToken = getPlayerDeviceToken() ?? DEFAULT_DEVICE_TOKEN;

  return {
    id: DEFAULT_SCREEN_ID,
    slug: "promenade-principale",
    name: "Ecran promenade principale",
    locationLabel: "Rue touristique, zone front de mer",
    timezone: DEFAULT_TIME_ZONE,
    currency: DEFAULT_CURRENCY,
    isActive: true,
    playbackBufferSeconds: 15,
    fallbackHeadline: "Partagez votre souvenir sur grand ecran",
    fallbackBody:
      "Scannez le QR code, choisissez votre media et laissez Screen Me gerer la diffusion.",
    deviceToken,
  };
}

function createDefaultPricingRule(): PricingRule {
  return {
    id: "pricing_default",
    screenId: DEFAULT_SCREEN_ID,
    name: "Tarif promenade v1",
    currency: DEFAULT_CURRENCY,
    basePriceCents: {
      image: 1400,
      video: 2800,
      message: 1100,
    },
    durationStepSeconds: 5,
    durationStepCents: 250,
    repeatPlayCents: 450,
    minimumRenderDurationSeconds: 10,
    minimumRepeatMinutes: 10,
    maximumDynamicUpliftPercent: 25,
    promoVideoUrl: "",
    promoPosterUrl: "",
    timeBands: [
      {
        label: "matin",
        trafficLabel: "nul",
        startHour: 0,
        endHour: 10,
        factor: 1,
        baseUpliftPercent: 0,
        maxSellableRatio: 0.68,
      },
      {
        label: "journee",
        trafficLabel: "faible",
        startHour: 10,
        endHour: 17,
        factor: 1.06,
        baseUpliftPercent: 6,
        maxSellableRatio: 0.76,
      },
      {
        label: "fin-de-journee",
        trafficLabel: "fort",
        startHour: 17,
        endHour: 23,
        factor: 1.12,
        baseUpliftPercent: 12,
        maxSellableRatio: 0.82,
      },
      {
        label: "soir",
        trafficLabel: "faible",
        startHour: 23,
        endHour: 24,
        factor: 1.04,
        baseUpliftPercent: 4,
        maxSellableRatio: 0.72,
      },
    ],
    occupancyBands: [
      { label: "nul", minRatio: 0, maxRatio: 0.25, factor: 1, upliftPercent: 0 },
      { label: "faible", minRatio: 0.25, maxRatio: 0.5, factor: 1.05, upliftPercent: 5 },
      { label: "modere", minRatio: 0.5, maxRatio: 0.75, factor: 1.1, upliftPercent: 10 },
      { label: "fort", minRatio: 0.75, maxRatio: 1.01, factor: 1.15, upliftPercent: 15 },
    ],
    updatedAt: nowIso(),
  };
}

export function createSeedState(): AppState {
  const deviceToken = getPlayerDeviceToken() ?? DEFAULT_DEVICE_TOKEN;

  return {
    version: 1,
    defaultLocale: DEFAULT_LOCALE,
    screens: [createDefaultScreen()],
    pricingRules: [createDefaultPricingRule()],
    submissions: [],
    quotes: [],
    orders: [],
    orderItems: [],
    playSlots: [],
    moderationReviews: [],
    creditVouchers: [],
    notificationEvents: [],
    deviceSessions: [
      {
        id: generateId("device"),
        screenId: DEFAULT_SCREEN_ID,
        deviceName: "Player principal",
        token: deviceToken,
        status: "unknown",
      },
    ],
    auditEntries: [
      {
        id: generateId("audit"),
        actorRole: "system",
        action: "seed.initialized",
        entityType: "state",
        entityId: "app",
        summary: "Initialisation du socle Screen Me.",
        createdAt: nowIso(),
      },
    ],
    processedWebhookEventIds: [],
    updatedAt: nowIso(),
  };
}
