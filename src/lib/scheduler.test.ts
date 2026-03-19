import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_ID } from "./constants";
import { createSeedState } from "./seed";
import { approveOrderItem, createOrder } from "./workflow";
import { summarizeTrafficWindow } from "./delivery-rules";

describe("scheduler", () => {
  it("avoids slot overlap for approved orders in the same window", () => {
    const state = createSeedState();
    const basePayload = {
      locale: "fr" as const,
      screenId: DEFAULT_SCREEN_ID,
      mediaType: "message" as const,
      title: "Boardwalk hello",
      messageText: "Hello promenade",
      renderDurationSeconds: 10,
      repeatEveryMinutes: null,
      requestedWindowStartAt: "2026-07-10T10:00:00.000Z",
      requestedWindowEndAt: "2026-07-10T11:00:00.000Z",
      customerName: "Aline",
      customerEmail: "aline@example.com",
      customerPhone: "+33123456789",
      rightsAccepted: true,
      policyAccepted: true,
    };

    const first = createOrder(state, basePayload, "simulated");
    const second = createOrder(
      state,
      {
        ...basePayload,
        title: "Second memory",
        messageText: "A second postcard",
        customerEmail: "second@example.com",
      },
      "simulated",
    );

    approveOrderItem(state, first.item.id, "Team", "moderator");
    approveOrderItem(state, second.item.id, "Team", "moderator");

    const [slotA, slotB] = [...state.playSlots].sort(
      (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    );

    expect(state.playSlots).toHaveLength(2);
    expect(new Date(slotB.startAt).getTime()).toBeGreaterThanOrEqual(
      new Date(slotA.endAt).getTime() + 15_000,
    );
  });

  it("keeps promo reserve by respecting the sellable capacity cap", () => {
    const state = createSeedState();
    const rule = state.pricingRules[0];

    rule.timeBands = rule.timeBands.map((band) => ({
      ...band,
      maxSellableRatio: 0.2,
    }));

    const basePayload = {
      locale: "fr" as const,
      screenId: DEFAULT_SCREEN_ID,
      mediaType: "message" as const,
      title: "Reserved promo",
      messageText: "Promo reserve test",
      renderDurationSeconds: 30,
      repeatEveryMinutes: 5,
      requestedWindowStartAt: "2026-07-10T10:00:00.000Z",
      requestedWindowEndAt: "2026-07-10T11:00:00.000Z",
      customerName: "Aline",
      customerEmail: "aline@example.com",
      customerPhone: "+33123456789",
      rightsAccepted: true,
      policyAccepted: true,
    };

    const first = createOrder(state, basePayload, "simulated");
    const second = createOrder(
      state,
      {
        ...basePayload,
        title: "Second memory",
        customerEmail: "second@example.com",
      },
      "simulated",
    );

    approveOrderItem(state, first.item.id, "Team", "moderator");
    approveOrderItem(state, second.item.id, "Team", "moderator");

    const summary = summarizeTrafficWindow(
      rule,
      state.playSlots,
      basePayload.requestedWindowStartAt,
      basePayload.requestedWindowEndAt,
    );

    expect(summary.groups.every((group) => group.usedMs <= group.sellableMs + 1)).toBe(true);
  });
});
