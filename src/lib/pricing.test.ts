import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_ID } from "./constants";
import { buildQuote } from "./pricing";
import { createSeedState } from "./seed";

describe("pricing engine", () => {
  it("applies repeat pricing and voucher discount", () => {
    const state = createSeedState();
    state.creditVouchers.push({
      id: "voucher_test",
      code: "SM-TEST",
      orderId: "order_1",
      orderItemId: "item_1",
      amountCents: 500,
      currency: "EUR",
      email: "traveler@example.com",
      reason: "Compensation",
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const { quote } = buildQuote(state, {
      locale: "fr",
      screenId: DEFAULT_SCREEN_ID,
      mediaType: "image",
      renderDurationSeconds: 15,
      repeatEveryMinutes: 15,
      requestedWindowStartAt: "2026-07-10T17:00:00.000Z",
      requestedWindowEndAt: "2026-07-10T18:00:00.000Z",
      voucherCode: "SM-TEST",
    });

    expect(quote.breakdown.estimatedOccurrences).toBe(4);
    expect(quote.breakdown.repeatSurchargeCents).toBeGreaterThan(0);
    expect(quote.breakdown.voucherDiscountCents).toBe(500);
    expect(quote.breakdown.totalCents).toBeLessThan(quote.breakdown.subtotalCents);
  });

  it("applies playback minimums and caps the live uplift", () => {
    const state = createSeedState();
    const rule = state.pricingRules[0];

    rule.timeBands = rule.timeBands.map((band) => ({
      ...band,
      baseUpliftPercent: 20,
      factor: 1.2,
      maxSellableRatio: 0.4,
    }));

    for (let index = 0; index < 20; index += 1) {
      state.playSlots.push({
        id: `slot_${index}`,
        screenId: DEFAULT_SCREEN_ID,
        orderItemId: `item_${index}`,
        submissionId: `submission_${index}`,
        startAt: `2026-07-10T17:${String(index).padStart(2, "0")}:00.000Z`,
        endAt: `2026-07-10T17:${String(index).padStart(2, "0")}:20.000Z`,
        durationSeconds: 20,
        status: "scheduled",
      });
    }

    const { quote } = buildQuote(state, {
      locale: "fr",
      screenId: DEFAULT_SCREEN_ID,
      mediaType: "image",
      renderDurationSeconds: 5,
      repeatEveryMinutes: null,
      requestedWindowStartAt: "2026-07-10T17:00:00.000Z",
      requestedWindowEndAt: "2026-07-10T18:00:00.000Z",
    });

    expect(quote.renderDurationSeconds).toBe(rule.minimumRenderDurationSeconds);
    expect(quote.breakdown.dynamicUpliftPercent).toBeLessThanOrEqual(25);
    expect(quote.breakdown.maxSellableRatio).toBeLessThan(1);
  });
});
