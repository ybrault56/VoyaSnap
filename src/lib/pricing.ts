import { DEFAULT_CURRENCY } from "./constants";
import {
  applyPlaybackMinimums,
  getPricingRule,
  summarizeTrafficWindow,
} from "./delivery-rules";
import type { AppState, CreditVoucher, PricingRule, Quote, QuoteRequest } from "./types";
import { estimateOccurrences, planRequestedSlots } from "./scheduler";
import { clamp, generateId, nowIso } from "./utils";

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
  const pricingRule = getPricingRule(state, screenId);
  const slots = state.playSlots.filter(
    (slot) => slot.screenId === screenId && slot.status !== "cancelled",
  );

  return summarizeTrafficWindow(
    pricingRule,
    slots,
    requestedWindowStartAt,
    requestedWindowEndAt,
  ).sellableOccupancyRatio;
}

function computeDynamicUpliftPercent(rule: PricingRule, baseTrafficPercent: number, ratio: number) {
  const remaining = Math.max(0, rule.maximumDynamicUpliftPercent - baseTrafficPercent);
  const liveDemandPercent = Math.round(remaining * Math.pow(ratio, 1.35));

  return {
    liveDemandPercent,
    dynamicUpliftPercent: clamp(
      baseTrafficPercent + liveDemandPercent,
      0,
      rule.maximumDynamicUpliftPercent,
    ),
  };
}

export function buildQuote(state: AppState, input: QuoteRequest) {
  const pricingRule = getPricingRule(state, input.screenId);
  const playback = applyPlaybackMinimums(
    pricingRule,
    input.renderDurationSeconds,
    input.repeatEveryMinutes,
  );
  const plan = planRequestedSlots(
    state,
    input.screenId,
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
    playback.renderDurationSeconds,
    playback.repeatEveryMinutes,
  );
  const occurrences = estimateOccurrences(
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
    playback.renderDurationSeconds,
    playback.repeatEveryMinutes,
  );

  if (!plan.canFitAllOccurrences) {
    throw new Error(
      "Ce creneau est presque complet. Elargissez la plage ou augmentez l'intervalle de rediffusion.",
    );
  }

  const basePriceCents = pricingRule.basePriceCents[input.mediaType];
  const durationSteps = Math.max(
    0,
    Math.ceil(
      (playback.renderDurationSeconds - pricingRule.durationStepSeconds) /
        pricingRule.durationStepSeconds,
    ),
  );
  const durationSurchargeCents = durationSteps * pricingRule.durationStepCents;
  const repeatSurchargeCents = Math.max(0, occurrences - 1) * pricingRule.repeatPlayCents;
  const subtotalBeforeFactors =
    basePriceCents + durationSurchargeCents + repeatSurchargeCents;
  const traffic = summarizeTrafficWindow(
    pricingRule,
    state.playSlots.filter(
      (slot) => slot.screenId === input.screenId && slot.status !== "cancelled",
    ),
    input.requestedWindowStartAt,
    input.requestedWindowEndAt,
  );
  const { liveDemandPercent, dynamicUpliftPercent } = computeDynamicUpliftPercent(
    pricingRule,
    traffic.weightedBaseUpliftPercent,
    traffic.sellableOccupancyRatio,
  );
  const subtotalWithDynamicPricing = Math.round(
    subtotalBeforeFactors * (1 + dynamicUpliftPercent / 100),
  );
  const voucher = getActiveVoucher(state, input.voucherCode);
  const voucherDiscountCents = Math.min(
    voucher?.amountCents ?? 0,
    subtotalWithDynamicPricing,
  );
  const totalCents = Math.max(0, subtotalWithDynamicPricing - voucherDiscountCents);

  const quote: Quote = {
    id: generateId("quote"),
    screenId: input.screenId,
    locale: input.locale,
    mediaType: input.mediaType,
    renderDurationSeconds: playback.renderDurationSeconds,
    repeatEveryMinutes: playback.repeatEveryMinutes,
    requestedWindowStartAt: input.requestedWindowStartAt,
    requestedWindowEndAt: input.requestedWindowEndAt,
    voucherCode: voucher?.code,
    breakdown: {
      basePriceCents,
      durationSurchargeCents,
      repeatSurchargeCents,
      timeWindowFactor: Number(
        (1 + traffic.weightedBaseUpliftPercent / 100).toFixed(2),
      ),
      occupancyFactor: Number((1 + liveDemandPercent / 100).toFixed(2)),
      occupancyRatio: traffic.sellableOccupancyRatio,
      dynamicUpliftPercent,
      baseTrafficUpliftPercent: traffic.weightedBaseUpliftPercent,
      liveDemandUpliftPercent: liveDemandPercent,
      trafficLabel: traffic.dominantBand.trafficLabel,
      occupancyLabel: traffic.occupancyBand.label,
      maxSellableRatio: traffic.weightedMaxSellableRatio,
      voucherDiscountCents,
      estimatedOccurrences: occurrences,
      subtotalCents: subtotalWithDynamicPricing,
      totalCents,
      labels: [traffic.dominantBand.label, traffic.occupancyBand.label],
    },
    currency: pricingRule.currency ?? DEFAULT_CURRENCY,
    estimatedFirstPlayAt: plan.firstStartAt,
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
    minimumRenderDurationSeconds: number;
    minimumRepeatMinutes: number;
    maximumDynamicUpliftPercent: number;
    promoVideoUrl?: string;
    promoPosterUrl?: string;
    timeBands: PricingRule["timeBands"];
  },
) {
  rule.basePriceCents.image = input.imageBaseCents;
  rule.basePriceCents.video = input.videoBaseCents;
  rule.basePriceCents.message = input.messageBaseCents;
  rule.durationStepCents = input.durationStepCents;
  rule.repeatPlayCents = input.repeatPlayCents;
  rule.minimumRenderDurationSeconds = input.minimumRenderDurationSeconds;
  rule.minimumRepeatMinutes = input.minimumRepeatMinutes;
  rule.maximumDynamicUpliftPercent = clamp(input.maximumDynamicUpliftPercent, 0, 25);
  rule.promoVideoUrl = input.promoVideoUrl?.trim() || undefined;
  rule.promoPosterUrl = input.promoPosterUrl?.trim() || undefined;
  rule.timeBands = input.timeBands;
  rule.updatedAt = nowIso();
}
