export const STORAGE_KEYS = {
  theme: 'aiLayer.theme',
  agent: 'aiLayer.agent',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
