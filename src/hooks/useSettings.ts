import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import {
  DEFAULT_FAST_MODEL,
  DEFAULT_GENERATE_MODEL,
  isFastModel,
  isGenerateModel,
  type FastModel,
  type GenerateModel,
} from '../lib/models';

export interface Settings {
  anthropicKey: string;
  githubPat: string;
  generateModel: GenerateModel;
  fastModel: FastModel;
}

const DEFAULT_SETTINGS: Settings = {
  anthropicKey: '',
  githubPat: '',
  generateModel: DEFAULT_GENERATE_MODEL,
  fastModel: DEFAULT_FAST_MODEL,
};

function parseStored(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      anthropicKey:
        typeof parsed.anthropicKey === 'string' ? parsed.anthropicKey : '',
      githubPat: typeof parsed.githubPat === 'string' ? parsed.githubPat : '',
      generateModel: isGenerateModel(parsed.generateModel)
        ? parsed.generateModel
        : DEFAULT_GENERATE_MODEL,
      fastModel: isFastModel(parsed.fastModel)
        ? parsed.fastModel
        : DEFAULT_FAST_MODEL,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const LISTENERS = new Set<(s: Settings) => void>();

function broadcast(s: Settings) {
  for (const fn of LISTENERS) fn(s);
}

function persist(next: Settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
  } catch {
    // ignore — storage unavailable
  }
}

export function useSettings(): {
  settings: Settings;
  setAnthropicKey: (v: string) => void;
  setGithubPat: (v: string) => void;
  setGenerateModel: (v: GenerateModel) => void;
  setFastModel: (v: FastModel) => void;
  clearAll: () => void;
} {
  const [settings, setLocal] = useState<Settings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.settings));
  });

  useEffect(() => {
    const handler = (next: Settings) => setLocal(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setLocal((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      broadcast(next);
      return next;
    });
  }, []);

  const setAnthropicKey = useCallback(
    (v: string) => update({ anthropicKey: v }),
    [update],
  );
  const setGithubPat = useCallback(
    (v: string) => update({ githubPat: v }),
    [update],
  );
  const setGenerateModel = useCallback(
    (v: GenerateModel) => update({ generateModel: v }),
    [update],
  );
  const setFastModel = useCallback(
    (v: FastModel) => update({ fastModel: v }),
    [update],
  );

  const clearAll = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.settings);
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(DEFAULT_SETTINGS);
    broadcast(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    setAnthropicKey,
    setGithubPat,
    setGenerateModel,
    setFastModel,
    clearAll,
  };
}
