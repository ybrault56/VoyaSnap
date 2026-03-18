import { DEFAULT_CURRENCY, DEFAULT_SCREEN_ID, DEFAULT_TIME_ZONE } from "./constants";
import type {
  AppState,
  CreditVoucher,
  PricingRule,
  Quote,
  QuoteRequest,
} from "./types";
import { estimateOccurrences, findFirstAvailableStart } from "./scheduler";
import { generateId, getHourInTimeZone, nowIso } from "./utils";

function getPricingRule(state: AppState, screenId = DEFAULT_SCREEN_ID) {
  return (
    state.pricingRules.find((rule) => rule.screenId === screenId) ?? state.pricingRules[0]
  );
}

function getTimeBandFactor(rule: PricingRule, requestedWindowStartAt: string) {
  const hour = getHourInTimeZone(requestedWindowStartAt, DEFAULT_TIME_ZONE);
  return (
    rule.timeBands.find((candidate) => hour >= candidate.startHour && hour < candidate.endHour) ??
    rule.timeBands[0]
  );
}

function getOccupancyBand(rule: PricingRule, ratio: number) {
  return (
    rule.occupancyBands.find(
      (band) => ratio >= band.minRatio && ratio < band.maxRatio,
    ) ?? rule.occupancyBands[rule.occupancyBands.length - 1]
  );
}

function getActiveVoucher(state: AppState, code: string | undefined) {
  if (!code) {
    return undefined;
  }

  return state.creditVouchers.find(
    (voucher) =>
      voucher.code.toLowerCase() === code.toLowerCase() && voucher.status === "active",
  );
}

export function computeWindowOccupancyRatio(
  state: AppState,
  screenId: string,
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
) {
  const windowStart = new Date(requestedWindowStartAt).getTime();
  const windowEnd = new Date(requestedWindowEndAt).getTime();
  const windowDurationMs = Math.max(windowEnd - windowStart, 1);

  const usedMs = state.playSlots
    .filter((slot) => slot.screenId === screenId && slot.status !== "cancelled")
    .reduce((total, slot) => {
      const slotStart = new Date(slot.startAt).getTime();
      const slotEnd = new Date(slot.endAt).getTime();
      const overlap = Math.max(0, Math.min(windowEnd, slotEnd) - Math.max(windowStart, slotStart));
      return total + overlap;
    }, 0);

  return Math.min(usedMs / windowDurationMs, 1);
}

export function buildQuote(state: AppState, input: QuoteRequest) {
  const pricingRule = getPricingRule(state, input.screenId);
  const occurrences = estimateOccurrences(
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
    input.renderDurationSeconds,
    input.repeatEveryMinutes ?? null,
  );
  const basePriceCents = pricingRule.basePriceCents[input.mediaType];
  const durationSteps = Math.max(
    0,
    Math.ceil(
      (input.renderDurationSeconds - pricingRule.durationStepSeconds) /
        pricingRule.durationStepSeconds,
    ),
  );
  const durationSurchargeCents = durationSteps * pricingRule.durationStepCents;
  const repeatSurchargeCents = Math.max(0, occurrences - 1) * pricingRule.repeatPlayCents;
  const subtotalBeforeFactors =
    basePriceCents + durationSurchargeCents + repeatSurchargeCents;

  const timeBand = getTimeBandFactor(pricingRule, input.requestedWindowStartAt);
  const occupancyRatio = computeWindowOccupancyRatio(
    state,
    input.screenId,
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
  );
  const occupancyBand = getOccupancyBand(pricingRule, occupancyRatio);
  const factorAppliedSubtotal = Math.round(
    subtotalBeforeFactors * timeBand.factor * occupancyBand.factor,
  );
  const voucher = getActiveVoucher(state, input.voucherCode);
  const voucherDiscountCents = Math.min(voucher?.amountCents ?? 0, factorAppliedSubtotal);
  const totalCents = Math.max(0, factorAppliedSubtotal - voucherDiscountCents);
  const estimatedFirstPlayAt = findFirstAvailableStart(
    state,
    input.screenId,
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
    input.renderDurationSeconds,
  );

  const quote: Quote = {
    id: generateId("quote"),
    screenId: input.screenId,
    locale: input.locale,
    mediaType: input.mediaType,
    renderDurationSeconds: input.renderDurationSeconds,
    repeatEveryMinutes: input.repeatEveryMinutes,
    requestedWindowStartAt: input.requestedWindowStartAt,
    requestedWindowEndAt: input.requestedWindowEndAt,
    voucherCode: voucher?.code,
    breakdown: {
      basePriceCents,
      durationSurchargeCents,
      repeatSurchargeCents,
      timeWindowFactor: timeBand.factor,
      occupancyFactor: occupancyBand.factor,
      occupancyRatio,
      voucherDiscountCents,
      estimatedOccurrences: occurrences,
      subtotalCents: factorAppliedSubtotal,
      totalCents,
      labels: [timeBand.label, occupancyBand.label],
    },
    currency: pricingRule.currency ?? DEFAULT_CURRENCY,
    estimatedFirstPlayAt,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };

  return { quote, voucher };
}

export function redeemVoucher(voucher: CreditVoucher | undefined) {
  if (!voucher || voucher.status !== "active") {
    return;
  }

  voucher.status = "redeemed";
  voucher.redeemedAt = nowIso();
}

export function updatePricingRule(
  rule: PricingRule,
  input: {
    imageBaseCents: number;
    videoBaseCents: number;
    messageBaseCents: number;
    durationStepCents: number;
    repeatPlayCents: number;
  },
) {
  rule.basePriceCents.image = input.imageBaseCents;
  rule.basePriceCents.video = input.videoBaseCents;
  rule.basePriceCents.message = input.messageBaseCents;
  rule.durationStepCents = input.durationStepCents;
  rule.repeatPlayCents = input.repeatPlayCents;
  rule.updatedAt = nowIso();
}
