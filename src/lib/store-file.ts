import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { sendNotificationEmail } from "./mail";
import { createSeedState } from "./seed";
import type { AppState } from "./types";
import { nowIso } from "./utils";

const dataDirectory = path.join(process.cwd(), ".data");
const storePath = path.join(dataDirectory, "screen-me-store.json");

let mutationQueue: Promise<unknown> = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, JSON.stringify(createSeedState(), null, 2), "utf8");
  }
}

async function persistState(state: AppState) {
  await writeFile(storePath, JSON.stringify(state, null, 2), "utf8");
}

function collectNewNotificationIds(previous: AppState, next: AppState) {
  const previousIds = new Set(previous.notificationEvents.map((notification) => notification.id));
  return next.notificationEvents
    .filter((notification) => !previousIds.has(notification.id))
    .map((notification) => notification.id);
}

async function flushNotifications(notificationIds: string[]) {
  if (notificationIds.length === 0) {
    return;
  }

  const state = await readFileState();
  let didChange = false;

  for (const notification of state.notificationEvents.filter((entry) => notificationIds.includes(entry.id))) {
    if (notification.sentAt) {
      continue;
    }

    const delivery = await sendNotificationEmail(notification);
    notification.sentAt = delivery.sentAt;
    notification.deliveryError = delivery.deliveryError;
    didChange = true;
  }

  if (didChange) {
    state.updatedAt = nowIso();
    await persistState(state);
  }
}

export async function readFileState() {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw) as AppState;
}

export async function mutateFileState<T>(
  mutator: (draft: AppState) => Promise<T> | T,
) {
  const task = mutationQueue.then(async () => {
    const current = await readFileState();
    const draft = structuredClone(current) as AppState;
    const result = await mutator(draft);
    draft.updatedAt = nowIso();
    const newNotificationIds = collectNewNotificationIds(current, draft);
    await persistState(draft);
    await flushNotifications(newNotificationIds);
    return result;
  });

  mutationQueue = task.catch(() => undefined);
  return task;
}

export async function resetFileState() {
  await ensureStoreFile();
  await persistState(createSeedState());
}