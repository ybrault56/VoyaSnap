import { applyPlaybackMinimums, getPricingRule, summarizeTrafficWindow } from "./delivery-rules";
import type { AppState, PlaySlot } from "./types";
import { addMinutes, generateId } from "./utils";

type PlannedRequest = {
  firstStartAt?: string;
  scheduledStarts: string[];
  requestedOccurrences: number;
  canFitAllOccurrences: boolean;
};

export function estimateOccurrences(
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
  renderDurationSeconds: number,
  repeatEveryMinutes: number | null,
) {
  const start = new Date(requestedWindowStartAt).getTime();
  const end = new Date(requestedWindowEndAt).getTime();
  const windowSeconds = Math.max(0, Math.floor((end - start) / 1000));

  if (!repeatEveryMinutes) {
    return 1;
  }

  const intervalSeconds = repeatEveryMinutes * 60;
  const remaining = Math.max(0, windowSeconds - renderDurationSeconds);
  return 1 + Math.floor(remaining / intervalSeconds);
}

function overlaps(slot: PlaySlot, startMs: number, endMs: number, bufferSeconds: number) {
  const existingStart = new Date(slot.startAt).getTime();
  const existingEnd = new Date(slot.endAt).getTime() + bufferSeconds * 1000;
  return startMs < existingEnd && endMs > existingStart;
}

function buildRelevantSlots(state: AppState, screenId: string) {
  return state.playSlots
    .filter((slot) => slot.screenId === screenId && slot.status !== "cancelled")
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
}

function createOccurrenceTargets(
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
  renderDurationSeconds: number,
  repeatEveryMinutes: number | null,
) {
  const targets: string[] = [requestedWindowStartAt];

  if (!repeatEveryMinutes) {
    return targets;
  }

  const occurrences = estimateOccurrences(
    requestedWindowStartAt,
    requestedWindowEndAt,
    renderDurationSeconds,
    repeatEveryMinutes,
  );

  for (let index = 1; index < occurrences; index += 1) {
    targets.push(addMinutes(requestedWindowStartAt, index * repeatEveryMinutes));
  }

  return targets;
}

function canReserveCandidate(
  state: AppState,
  screenId: string,
  slots: PlaySlot[],
  candidate: PlaySlot,
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
) {
  const rule = getPricingRule(state, screenId);
  const summary = summarizeTrafficWindow(
    rule,
    [...slots, candidate],
    requestedWindowStartAt,
    requestedWindowEndAt,
  );

  return summary.groups.every((group) => group.usedMs <= group.sellableMs + 1);
}

export function planRequestedSlots(
  state: AppState,
  screenId: string,
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
  renderDurationSeconds: number,
  repeatEveryMinutes: number | null,
  existingSlots = buildRelevantSlots(state, screenId),
): PlannedRequest {
  const rule = getPricingRule(state, screenId);
  const screen = state.screens.find((candidate) => candidate.id === screenId);
  const playback = applyPlaybackMinimums(rule, renderDurationSeconds, repeatEveryMinutes);
  const bufferSeconds = screen?.playbackBufferSeconds ?? 15;
  const targets = createOccurrenceTargets(
    requestedWindowStartAt,
    requestedWindowEndAt,
    playback.renderDurationSeconds,
    playback.repeatEveryMinutes,
  );
  const plannedSlots = [...existingSlots];
  const scheduledStarts: string[] = [];

  for (const target of targets) {
    const windowEndMs = new Date(requestedWindowEndAt).getTime();
    let cursor = Math.max(
      new Date(target).getTime(),
      new Date(requestedWindowStartAt).getTime(),
    );

    while (cursor + playback.renderDurationSeconds * 1000 <= windowEndMs) {
      const endMs = cursor + playback.renderDurationSeconds * 1000;
      const collision = plannedSlots.find((slot) => overlaps(slot, cursor, endMs, bufferSeconds));

      if (collision) {
        cursor = new Date(collision.endAt).getTime() + bufferSeconds * 1000;
        continue;
      }

      const candidate: PlaySlot = {
        id: generateId("candidate"),
        screenId,
        orderItemId: "quote_preview",
        submissionId: "quote_preview",
        startAt: new Date(cursor).toISOString(),
        endAt: new Date(endMs).toISOString(),
        durationSeconds: playback.renderDurationSeconds,
        status: "scheduled",
      };

      if (
        !canReserveCandidate(
          state,
          screenId,
          plannedSlots,
          candidate,
          requestedWindowStartAt,
          requestedWindowEndAt,
        )
      ) {
        cursor += 60 * 1000;
        continue;
      }

      plannedSlots.push(candidate);
      plannedSlots.sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      );
      scheduledStarts.push(candidate.startAt);
      break;
    }
  }

  return {
    firstStartAt: scheduledStarts[0],
    scheduledStarts,
    requestedOccurrences: targets.length,
    canFitAllOccurrences: scheduledStarts.length === targets.length,
  };
}

export function findFirstAvailableStart(
  state: AppState,
  screenId: string,
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
  renderDurationSeconds: number,
  repeatEveryMinutes: number | null = null,
) {
  return planRequestedSlots(
    state,
    screenId,
    requestedWindowStartAt,
    requestedWindowEndAt,
    renderDurationSeconds,
    repeatEveryMinutes,
  ).firstStartAt;
}

function resetFutureSchedule(state: AppState, screenId: string) {
  const now = Date.now();
  const removableSlotIds = new Set(
    state.playSlots
      .filter(
        (slot) =>
          slot.screenId === screenId &&
          slot.status !== "completed" &&
          new Date(slot.startAt).getTime() >= now,
      )
      .map((slot) => slot.id),
  );

  state.playSlots = state.playSlots.filter((slot) => !removableSlotIds.has(slot.id));

  for (const item of state.orderItems.filter((candidate) => candidate.screenId === screenId)) {
    item.scheduledSlotIds = item.scheduledSlotIds.filter((slotId) => !removableSlotIds.has(slotId));
  }
}

export function recomputeSchedule(state: AppState, screenId: string) {
  resetFutureSchedule(state, screenId);

  const scheduledItems = state.orderItems
    .map((item) => ({
      item,
      order: state.orders.find((order) => order.id === item.orderId),
      submission: state.submissions.find((submission) => submission.id === item.submissionId),
    }))
    .filter(
      (entry) =>
        entry.item.screenId === screenId &&
        entry.order?.status === "approved_scheduled" &&
        entry.submission,
    )
    .sort((left, right) => {
      const leftApprovedAt = new Date(left.order?.approvedAt ?? left.order?.paidAt ?? 0).getTime();
      const rightApprovedAt = new Date(
        right.order?.approvedAt ?? right.order?.paidAt ?? 0,
      ).getTime();
      return leftApprovedAt - rightApprovedAt;
    });

  const activeSlots = buildRelevantSlots(state, screenId);

  for (const entry of scheduledItems) {
    const plan = planRequestedSlots(
      state,
      screenId,
      entry.item.requestedWindowStartAt,
      entry.item.requestedWindowEndAt,
      entry.item.renderDurationSeconds,
      entry.item.repeatEveryMinutes ?? null,
      activeSlots,
    );

    for (const startAt of plan.scheduledStarts) {
      const slot: PlaySlot = {
        id: generateId("slot"),
        screenId,
        orderItemId: entry.item.id,
        submissionId: entry.item.submissionId,
        startAt,
        endAt: new Date(
          new Date(startAt).getTime() + entry.item.renderDurationSeconds * 1000,
        ).toISOString(),
        durationSeconds: entry.item.renderDurationSeconds,
        status: "scheduled",
      };
      activeSlots.push(slot);
      activeSlots.sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      );
      state.playSlots.push(slot);
      entry.item.scheduledSlotIds.push(slot.id);
    }
  }
}

export function deriveSlotStatus(slot: PlaySlot, now = new Date()) {
  const current = now.getTime();
  const start = new Date(slot.startAt).getTime();
  const end = new Date(slot.endAt).getTime();

  if (slot.status === "cancelled") {
    return "cancelled";
  }

  if (current >= end) {
    return "completed";
  }

  if (current >= start && current < end) {
    return "playing";
  }

  return "scheduled";
}
