import type { LoggerSettings } from "./types";

const SETTINGS_KEY = "loggerSettings";

export const DEFAULT_SETTINGS: LoggerSettings = {
  enabled: true,
  retentionHours: 2,
  maxEntries: 2_000,
  maxTextLength: 2_000
};

export function normalizeSettings(input: Partial<LoggerSettings> = {}): LoggerSettings {
  return {
    enabled: input.enabled ?? DEFAULT_SETTINGS.enabled,
    retentionHours: clampNumber(input.retentionHours, 0.1, 24 * 30, DEFAULT_SETTINGS.retentionHours),
    maxEntries: Math.floor(clampNumber(input.maxEntries, 50, 100_000, DEFAULT_SETTINGS.maxEntries)),
    maxTextLength: Math.floor(clampNumber(input.maxTextLength, 100, 10_000, DEFAULT_SETTINGS.maxTextLength))
  };
}

export async function getSettings(): Promise<LoggerSettings> {
  const result = await storageGet<{ [SETTINGS_KEY]?: Partial<LoggerSettings> }>(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY]);
}

export async function updateSettings(partial: Partial<LoggerSettings>): Promise<LoggerSettings> {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...partial });
  await storageSet({ [SETTINGS_KEY]: next });
  return next;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function storageGet<T>(keys: string): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result as T));
  });
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}
