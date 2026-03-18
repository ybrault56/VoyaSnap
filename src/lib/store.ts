import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AppState } from "./types";
import { createSeedState } from "./seed";
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

export async function readState() {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw) as AppState;
}

export async function mutateState<T>(
  mutator: (draft: AppState) => Promise<T> | T,
) {
  const task = mutationQueue.then(async () => {
    const current = await readState();
    const draft = structuredClone(current) as AppState;
    const result = await mutator(draft);
    draft.updatedAt = nowIso();
    await writeFile(storePath, JSON.stringify(draft, null, 2), "utf8");
    return result;
  });

  mutationQueue = task.catch(() => undefined);
  return task;
}

export async function resetState() {
  await ensureStoreFile();
  await writeFile(storePath, JSON.stringify(createSeedState(), null, 2), "utf8");
}
