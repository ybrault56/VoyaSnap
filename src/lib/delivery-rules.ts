import { DEFAULT_SCREEN_ID } from "./constants";
import type {
  AppState,
  PlaySlot,
  PricingOccupancyBand,
  PricingRule,
  PricingTimeBand,
  TravelerCheckoutSettings,
} from "./types";
import { clamp, getHourInTimeZone } from "./utils";

const DEFAULT_MIN_RENDER_DURATION_SECONDS = 10;
const DEFAULT_MIN_REPEAT_MINUTES = 10;
const DEFAULT_MAX_DYNAMIC_UPLIFT_PERCENT = 25;
const DEFAULT_MAX_SELLABLE_RATIO = 0.82;
const MIN_DYNAMIC_STEP = 60_000;
const MAX_DYNAMIC_SLICES = 180;

type TrafficWindowGroup = {
  key: string;
  band: PricingTimeBand;
  windowDurationMs: number;
  sellableMs: number;
  usedMs: number;
};

export type TrafficWindowSummary = {
  dominantBand: PricingTimeBand;
  occupancyBand: PricingOccupancyBand;
  weightedBaseUpliftPercent: number;
  weightedMaxSellableRatio: number;
  usedMs: number;
  sellableMs: number;
  windowDurationMs: number;
  sellableOccupancyRatio: number;
  rawOccupancyRatio: number;
  groups: TrafficWindowGroup[];
};

function normalizeTimeBand(band: PricingTimeBand): PricingTimeBand {
  const factor = Number.isFinite(band.factor) ? band.factor : 1;
  const baseUpliftPercent = clamp(
    Number.isFinite(band.baseUpliftPercent)
      ? band.baseUpliftPercent
      : Math.round((factor - 1) * 100),
    0,
    25,
  );

  return {
    ...band,
    trafficLabel: band.trafficLabel?.trim() || band.label,
    factor,
    baseUpliftPercent,
    maxSellableRatio: clamp(
      Number.isFinite(band.maxSellableRatio) ? band.maxSellableRatio : DEFAULT_MAX_SELLABLE_RATIO,
      0.35,
      0.95,
    ),
  };
}

function normalizeOccupancyBand(band: PricingOccupancyBand): PricingOccupancyBand {
  const factor = Number.isFinite(band.factor) ? band.factor : 1;

  return {
    ...band,
    factor,
    upliftPercent: clamp(
      Number.isFinite(band.upliftPercent)
        ? band.upliftPercent
        : Math.round((factor - 1) * 100),
      0,
      25,
    ),
  };
}

export function normalizePricingRule(rule: PricingRule): PricingRule {
  return {
    ...rule,
    minimumRenderDurationSeconds: clamp(
      Number.isFinite(rule.minimumRenderDurationSeconds)
        ? rule.minimumRenderDurationSeconds
        : Math.max(DEFAULT_MIN_RENDER_DURATION_SECONDS, rule.durationStepSeconds),
      5,
      60,
    ),
    minimumRepeatMinutes: clamp(
      Number.isFinite(rule.minimumRepeatMinutes)
        ? rule.minimumRepeatMinutes
        : DEFAULT_MIN_REPEAT_MINUTES,
      5,
      180,
    ),
    maximumDynamicUpliftPercent: clamp(
      Number.isFinite(rule.maximumDynamicUpliftPercent)
        ? rule.maximumDynamicUpliftPercent
        : DEFAULT_MAX_DYNAMIC_UPLIFT_PERCENT,
      0,
      25,
    ),
    promoVideoUrl: rule.promoVideoUrl?.trim() || undefined,
    promoPosterUrl: rule.promoPosterUrl?.trim() || undefined,
    timeBands: rule.timeBands.map(normalizeTimeBand),
    occupancyBands: rule.occupancyBands.map(normalizeOccupancyBand),
  };
}

export function getPricingRule(state: AppState, screenId = DEFAULT_SCREEN_ID) {
  const rule =
    state.pricingRules.find((candidate) => candidate.screenId === screenId) ??
    state.pricingRules[0];

  if (!rule) {
    throw new Error("Pricing rule not found.");
  }

  return normalizePricingRule(rule);
}

export function getTimeBand(rule: PricingRule, value: string) {
  const hour = getHourInTimeZone(value);
  return rule.timeBands.find((candidate) => hour >= candidate.startHour && hour < candidate.endHour)
    ?? rule.timeBands[0];
}

export function getOccupancyBand(rule: PricingRule, ratio: number) {
  return (
    rule.occupancyBands.find(
      (band) => ratio >= band.minRatio && ratio < band.maxRatio,
    ) ?? rule.occupancyBands[rule.occupancyBands.length - 1]
  );
}

function buildWindowSlices(startMs: number, endMs: number) {
  const windowDurationMs = Math.max(endMs - startMs, MIN_DYNAMIC_STEP);
  const stepMs = clamp(
    Math.ceil(windowDurationMs / MAX_DYNAMIC_SLICES),
    MIN_DYNAMIC_STEP,
    15 * MIN_DYNAMIC_STEP,
  );
  const slices: Array<{ startMs: number; endMs: number }> = [];

  for (let cursor = startMs; cursor < endMs; cursor += stepMs) {
    slices.push({
      startMs: cursor,
      endMs: Math.min(endMs, cursor + stepMs),
    });
  }

  return slices;
}

function sumOverlapMs(slots: PlaySlot[], startMs: number, endMs: number) {
  return slots.reduce((total, slot) => {
    if (slot.status === "cancelled") {
      return total;
    }

    const slotStartMs = new Date(slot.startAt).getTime();
    const slotEndMs = new Date(slot.endAt).getTime();
    return total + Math.max(0, Math.min(endMs, slotEndMs) - Math.max(startMs, slotStartMs));
  }, 0);
}

export function summarizeTrafficWindow(
  rule: PricingRule,
  slots: PlaySlot[],
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
): TrafficWindowSummary {
  const windowStartMs = new Date(requestedWindowStartAt).getTime();
  const windowEndMs = new Date(requestedWindowEndAt).getTime();
  const groups = new Map<string, TrafficWindowGroup>();
  const slices = buildWindowSlices(windowStartMs, windowEndMs);
  let weightedBaseUplift = 0;
  let weightedMaxSellable = 0;

  for (const slice of slices) {
    const durationMs = slice.endMs - slice.startMs;
    const midpoint = new Date(slice.startMs + durationMs / 2).toISOString();
    const band = getTimeBand(rule, midpoint);
    const key = `${band.label}:${band.startHour}-${band.endHour}`;
    const usedMs = sumOverlapMs(slots, slice.startMs, slice.endMs);
    const group = groups.get(key) ?? {
      key,
      band,
      windowDurationMs: 0,
      sellableMs: 0,
      usedMs: 0,
    };

    group.windowDurationMs += durationMs;
    group.sellableMs += durationMs * band.maxSellableRatio;
    group.usedMs += usedMs;
    groups.set(key, group);

    weightedBaseUplift += durationMs * band.baseUpliftPercent;
    weightedMaxSellable += durationMs * band.maxSellableRatio;
  }

  const groupList = [...groups.values()];
  const dominantBand =
    groupList.sort((left, right) => right.windowDurationMs - left.windowDurationMs)[0]?.band ??
    rule.timeBands[0];
  const windowDurationMs = Math.max(windowEndMs - windowStartMs, MIN_DYNAMIC_STEP);
  const usedMs = groupList.reduce((total, group) => total + group.usedMs, 0);
  const sellableMs = groupList.reduce((total, group) => total + group.sellableMs, 0);
  const sellableOccupancyRatio = sellableMs > 0 ? clamp(usedMs / sellableMs, 0, 1) : 1;
  const rawOccupancyRatio = clamp(usedMs / windowDurationMs, 0, 1);
  const occupancyBand = getOccupancyBand(rule, sellableOccupancyRatio);

  return {
    dominantBand,
    occupancyBand,
    weightedBaseUpliftPercent: Math.round(weightedBaseUplift / windowDurationMs),
    weightedMaxSellableRatio: weightedMaxSellable / windowDurationMs,
    usedMs,
    sellableMs,
    windowDurationMs,
    sellableOccupancyRatio,
    rawOccupancyRatio,
    groups: groupList,
  };
}

export function applyPlaybackMinimums(
  rule: PricingRule,
  renderDurationSeconds: number,
  repeatEveryMinutes: number | null | undefined,
) {
  return {
    renderDurationSeconds: Math.max(renderDurationSeconds, rule.minimumRenderDurationSeconds),
    repeatEveryMinutes:
      repeatEveryMinutes == null
        ? null
        : Math.max(repeatEveryMinutes, rule.minimumRepeatMinutes),
  };
}

export function getTravelerCheckoutSettings(rule: PricingRule): TravelerCheckoutSettings {
  const normalized = normalizePricingRule(rule);
  const durationOptions = [...new Set([
    normalized.minimumRenderDurationSeconds,
    10,
    15,
    20,
    30,
    45,
    60,
  ])]
    .filter((value) => value >= normalized.minimumRenderDurationSeconds && value <= 60)
    .sort((left, right) => left - right);
  const repeatOptions = [...new Set([
    normalized.minimumRepeatMinutes,
    15,
    20,
    30,
    45,
    60,
    90,
    120,
  ])]
    .filter((value) => value >= normalized.minimumRepeatMinutes && value <= 180)
    .sort((left, right) => left - right);

  return {
    minimumRenderDurationSeconds: normalized.minimumRenderDurationSeconds,
    minimumRepeatMinutes: normalized.minimumRepeatMinutes,
    maximumDynamicUpliftPercent: normalized.maximumDynamicUpliftPercent,
    durationOptions,
    repeatOptions,
    promoVideoUrl: normalized.promoVideoUrl,
    promoPosterUrl: normalized.promoPosterUrl,
    timeBands: normalized.timeBands.map((band) => ({
      label: band.label,
      trafficLabel: band.trafficLabel,
      startHour: band.startHour,
      endHour: band.endHour,
      baseUpliftPercent: band.baseUpliftPercent,
      maxSellableRatio: band.maxSellableRatio,
    })),
  };
}
