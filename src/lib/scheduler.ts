import type { AppState, OrderItem, PlaySlot } from "./types";
import { addMinutes, generateId } from "./utils";

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

export function findFirstAvailableStart(
  state: AppState,
  screenId: string,
  requestedWindowStartAt: string,
  requestedWindowEndAt: string,
  renderDurationSeconds: number,
) {
  const screen = state.screens.find((candidate) => candidate.id === screenId);
  const bufferSeconds = screen?.playbackBufferSeconds ?? 15;
  const windowStartMs = new Date(requestedWindowStartAt).getTime();
  const windowEndMs = new Date(requestedWindowEndAt).getTime();
  const relevantSlots = state.playSlots
    .filter((slot) => slot.screenId === screenId && slot.status !== "cancelled")
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  let cursor = windowStartMs;

  while (cursor + renderDurationSeconds * 1000 <= windowEndMs) {
    const nextEnd = cursor + renderDurationSeconds * 1000;
    const collision = relevantSlots.find((slot) =>
      overlaps(slot, cursor, nextEnd, bufferSeconds),
    );

    if (!collision) {
      return new Date(cursor).toISOString();
    }

    cursor = new Date(collision.endAt).getTime() + bufferSeconds * 1000;
  }

  return undefined;
}

function createOccurrenceTargets(item: OrderItem) {
  const targets: string[] = [item.requestedWindowStartAt];
  if (!item.repeatEveryMinutes) {
    return targets;
  }

  const occurrences = estimateOccurrences(
    item.requestedWindowStartAt,
    item.requestedWindowEndAt,
    item.renderDurationSeconds,
    item.repeatEveryMinutes,
  );

  for (let index = 1; index < occurrences; index += 1) {
    targets.push(addMinutes(item.requestedWindowStartAt, index * item.repeatEveryMinutes));
  }

  return targets;
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
  const screen = state.screens.find((candidate) => candidate.id === screenId);
  const bufferSeconds = screen?.playbackBufferSeconds ?? 15;
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

  const activeSlots = state.playSlots
    .filter((slot) => slot.screenId === screenId && slot.status !== "cancelled")
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  for (const entry of scheduledItems) {
    const targets = createOccurrenceTargets(entry.item);

    for (const target of targets) {
      const windowEndMs = new Date(entry.item.requestedWindowEndAt).getTime();
      let cursor = Math.max(
        new Date(target).getTime(),
        new Date(entry.item.requestedWindowStartAt).getTime(),
      );

      while (cursor + entry.item.renderDurationSeconds * 1000 <= windowEndMs) {
        const endMs = cursor + entry.item.renderDurationSeconds * 1000;
        const collision = activeSlots.find((slot) =>
          overlaps(slot, cursor, endMs, bufferSeconds),
        );

        if (!collision) {
          const slot: PlaySlot = {
            id: generateId("slot"),
            screenId,
            orderItemId: entry.item.id,
            submissionId: entry.item.submissionId,
            startAt: new Date(cursor).toISOString(),
            endAt: new Date(endMs).toISOString(),
            durationSeconds: entry.item.renderDurationSeconds,
            status: "scheduled",
          };
          activeSlots.push(slot);
          activeSlots.sort(
            (left, right) =>
              new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
          );
          state.playSlots.push(slot);
          entry.item.scheduledSlotIds.push(slot.id);
          break;
        }

        cursor = new Date(collision.endAt).getTime() + bufferSeconds * 1000;
      }
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
