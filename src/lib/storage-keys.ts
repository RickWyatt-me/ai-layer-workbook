export const STORAGE_KEYS = {
  theme: 'aiLayer.theme',
  agent: 'aiLayer.agent',
  settings: 'aiLayer.settings',
  persona: 'workbook:persona',
  checks: 'workbook:checks',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
