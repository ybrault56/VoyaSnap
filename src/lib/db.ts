import { PrismaClient } from "@prisma/client";
import { isDatabaseConfigured } from "./env";

declare global {
  var __screenMePrisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!globalThis.__screenMePrisma__) {
    globalThis.__screenMePrisma__ = new PrismaClient();
  }

  return globalThis.__screenMePrisma__;
}