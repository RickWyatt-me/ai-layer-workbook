import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import type { Repo } from '../lib/github';

function parseStored(raw: string | null): Repo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Repo>;
    if (
      typeof parsed.url !== 'string' ||
      typeof parsed.owner !== 'string' ||
      typeof parsed.repo !== 'string' ||
      typeof parsed.defaultBranch !== 'string' ||
      !Array.isArray(parsed.tree) ||
      typeof parsed.languages !== 'object' ||
      parsed.languages === null ||
      typeof parsed.fetchedAt !== 'number'
    ) {
      return null;
    }
    return parsed as Repo;
  } catch {
    return null;
  }
}

const LISTENERS = new Set<(r: Repo | null) => void>();

function broadcast(r: Repo | null) {
  for (const fn of LISTENERS) fn(r);
}

export function useRepo(): {
  repo: Repo | null;
  setRepo: (next: Repo) => void;
  clear: () => void;
} {
  const [repo, setLocal] = useState<Repo | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.repo));
  });

  useEffect(() => {
    const handler = (next: Repo | null) => setLocal(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const setRepo = useCallback((next: Repo) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEYS.repo, JSON.stringify(next));
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(next);
    broadcast(next);
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.repo);
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(null);
    broadcast(null);
  }, []);

  return { repo, setRepo, clear };
}
