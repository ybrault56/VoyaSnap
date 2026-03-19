import { isDatabaseConfigured } from "./env";
import { mutateDbState, readDbState, resetDbState } from "./store-db";
import { mutateFileState, readFileState, resetFileState } from "./store-file";

export async function readState() {
  if (isDatabaseConfigured()) {
    return readDbState();
  }

  return readFileState();
}

export async function mutateState<T>(
  mutator: Parameters<typeof mutateFileState<T>>[0],
) {
  if (isDatabaseConfigured()) {
    return mutateDbState(mutator);
  }

  return mutateFileState(mutator);
}

export async function resetState() {
  if (isDatabaseConfigured()) {
    return resetDbState();
  }

  return resetFileState();
}