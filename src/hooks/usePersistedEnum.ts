import { useState } from 'react';

export function usePersistedEnum<T extends string>(
  key: string,
  isValid: (v: string | null) => v is T,
  fallback: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    const stored = window.localStorage.getItem(key);
    return isValid(stored) ? stored : fallback;
  });

  const update = (next: T) => {
    setValue(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, next);
    }
  };

  return [value, update];
}
