import { useEffect, useState } from 'react';

type Listener = (next: string) => void;

const LISTENERS = new Map<string, Set<Listener>>();

function subscribe(key: string, fn: Listener) {
  let bucket = LISTENERS.get(key);
  if (!bucket) {
    bucket = new Set();
    LISTENERS.set(key, bucket);
  }
  bucket.add(fn);
  return () => {
    bucket?.delete(fn);
  };
}

function broadcast(key: string, next: string) {
  const bucket = LISTENERS.get(key);
  if (!bucket) return;
  for (const fn of bucket) fn(next);
}

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

  useEffect(() => {
    return subscribe(key, (next) => {
      if (isValid(next)) setValue(next);
    });
  }, [key, isValid]);

  const update = (next: T) => {
    setValue(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, next);
    }
    broadcast(key, next);
  };

  return [value, update];
}
