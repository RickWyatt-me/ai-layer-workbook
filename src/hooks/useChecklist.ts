import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';

type ChecklistState = Record<string, boolean>;

function parseStored(raw: string | null): ChecklistState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: ChecklistState = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v === true) out[k] = true;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

const LISTENERS = new Set<(s: ChecklistState) => void>();

function broadcast(s: ChecklistState) {
  for (const fn of LISTENERS) fn(s);
}

export function useChecklist(): {
  isChecked: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const [state, setState] = useState<ChecklistState>(() => {
    if (typeof window === 'undefined') return {};
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.checks));
  });

  useEffect(() => {
    const handler = (next: ChecklistState) => setState(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const next: ChecklistState = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            STORAGE_KEYS.checks,
            JSON.stringify(next),
          );
        } catch {
          // ignore
        }
      }
      broadcast(next);
      return next;
    });
  }, []);

  const isChecked = useCallback((id: string) => state[id] === true, [state]);

  return { isChecked, toggle };
}
