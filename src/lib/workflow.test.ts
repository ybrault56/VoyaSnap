import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_ID } from "./constants";
import { createSeedState } from "./seed";
import { createOrder, rejectOrderItem } from "./workflow";

describe("workflow transitions", () => {
  it("issues a voucher when moderation rejects a paid order", () => {
    const state = createSeedState();
    const created = createOrder(
      state,
      {
        locale: "fr",
        screenId: DEFAULT_SCREEN_ID,
        mediaType: "message",
        title: "Rejected card",
        messageText: "This content will be rejected.",
        renderDurationSeconds: 10,
        repeatEveryMinutes: null,
        requestedWindowStartAt: "2026-07-10T10:00:00.000Z",
        requestedWindowEndAt: "2026-07-10T11:00:00.000Z",
        customerName: "Lucas",
        customerEmail: "lucas@example.com",
        customerPhone: "+33600000000",
        rightsAccepted: true,
        policyAccepted: true,
      },
      "simulated",
    );

    const result = rejectOrderItem(
      state,
      created.item.id,
      "Team",
      "moderator",
      "Policy mismatch",
    );

    expect(result?.order.status).toBe("rejected_credit_issued");
    expect(result?.voucher?.code).toMatch(/^SM-/);
    expect(state.creditVouchers).toHaveLength(1);
    expect(state.notificationEvents.some((event) => event.kind === "voucher_issued")).toBe(true);
  });
});