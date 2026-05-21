import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';

export type RepoLayout = 'single' | 'multi' | 'mono';

export interface Persona {
  repoName: string;
  languages: string[];
  layout: RepoLayout;
  topLevelDirs: string;
}

const DEFAULT_PERSONA: Persona = {
  repoName: 'your-repo',
  languages: [],
  layout: 'single',
  topLevelDirs: '',
};

function isLayout(v: unknown): v is RepoLayout {
  return v === 'single' || v === 'multi' || v === 'mono';
}

function parseStored(raw: string | null): Persona {
  if (!raw) return DEFAULT_PERSONA;
  try {
    const parsed = JSON.parse(raw) as Partial<Persona>;
    return {
      repoName:
        typeof parsed.repoName === 'string' && parsed.repoName.trim()
          ? parsed.repoName
          : DEFAULT_PERSONA.repoName,
      languages: Array.isArray(parsed.languages)
        ? parsed.languages.filter((l): l is string => typeof l === 'string')
        : [],
      layout: isLayout(parsed.layout) ? parsed.layout : DEFAULT_PERSONA.layout,
      topLevelDirs:
        typeof parsed.topLevelDirs === 'string' ? parsed.topLevelDirs : '',
    };
  } catch {
    return DEFAULT_PERSONA;
  }
}

const LISTENERS = new Set<(p: Persona) => void>();

function broadcast(p: Persona) {
  for (const fn of LISTENERS) fn(p);
}

export function usePersona(): {
  persona: Persona;
  setPersona: (next: Persona) => void;
} {
  const [persona, setLocal] = useState<Persona>(() => {
    if (typeof window === 'undefined') return DEFAULT_PERSONA;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.persona));
  });

  useEffect(() => {
    const handler = (next: Persona) => setLocal(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const setPersona = useCallback((next: Persona) => {
    const cleaned: Persona = {
      ...next,
      repoName: next.repoName.trim() || 'your-repo',
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.persona,
          JSON.stringify(cleaned),
        );
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(cleaned);
    broadcast(cleaned);
  }, []);

  return { persona, setPersona };
}
