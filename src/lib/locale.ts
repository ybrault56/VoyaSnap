import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./constants";
import type { Locale } from "./types";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined): Locale {
  return value && isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
