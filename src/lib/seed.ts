import {
  DEFAULT_CURRENCY,
  DEFAULT_DEVICE_TOKEN,
  DEFAULT_LOCALE,
  DEFAULT_SCREEN_ID,
  DEFAULT_TIME_ZONE,
} from "./constants";
import type { AppState, PricingRule, Screen } from "./types";
import { generateId, nowIso } from "./utils";

function createDefaultScreen(): Screen {
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
    deviceToken: DEFAULT_DEVICE_TOKEN,
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
    timeBands: [
      { label: "journee", startHour: 10, endHour: 17, factor: 1.1 },
      { label: "fin-de-journee", startHour: 17, endHour: 23, factor: 1.45 },
      { label: "soir", startHour: 23, endHour: 24, factor: 1.2 },
      { label: "matin", startHour: 0, endHour: 10, factor: 1 },
    ],
    occupancyBands: [
      { label: "faible", minRatio: 0, maxRatio: 0.25, factor: 1 },
      { label: "moderee", minRatio: 0.25, maxRatio: 0.5, factor: 1.08 },
      { label: "dense", minRatio: 0.5, maxRatio: 0.75, factor: 1.18 },
      { label: "tendue", minRatio: 0.75, maxRatio: 1.01, factor: 1.32 },
    ],
    updatedAt: nowIso(),
  };
}

export function createSeedState(): AppState {
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
        token: DEFAULT_DEVICE_TOKEN,
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
