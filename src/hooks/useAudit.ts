import { useCallback, useEffect, useState } from 'react';
import {
  isFindingsArray,
  type AnthropicUsage,
  type Finding,
} from '../lib/anthropic';
import { isGenerateModel, type GenerateModel } from '../lib/models';
import { STORAGE_KEYS } from '../lib/storage-keys';

export interface Audit {
  repoOwner: string;
  repoName: string;
  repoFetchedAt: number;
  model: GenerateModel;
  agent: string;
  findings: Finding[];
  rawText: string;
  usage: AnthropicUsage;
  auditedAt: number;
}

function parseStored(raw: string | null): Audit | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Audit>;
    if (
      typeof p.repoOwner !== 'string' ||
      typeof p.repoName !== 'string' ||
      typeof p.repoFetchedAt !== 'number' ||
      !isGenerateModel(p.model) ||
      typeof p.agent !== 'string' ||
      !isFindingsArray(p.findings) ||
      typeof p.rawText !== 'string' ||
      !p.usage ||
      typeof p.usage.input_tokens !== 'number' ||
      typeof p.usage.output_tokens !== 'number' ||
      typeof p.auditedAt !== 'number'
    ) {
      return null;
    }
    return p as Audit;
  } catch {
    return null;
  }
}

const LISTENERS = new Set<(a: Audit | null) => void>();

function broadcast(a: Audit | null) {
  for (const fn of LISTENERS) fn(a);
}

export function useAudit(): {
  audit: Audit | null;
  setAudit: (next: Audit) => void;
  clear: () => void;
} {
  const [audit, setLocal] = useState<Audit | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.audit));
  });

  useEffect(() => {
    const handler = (next: Audit | null) => setLocal(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const setAudit = useCallback((next: Audit) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(next));
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
        window.localStorage.removeItem(STORAGE_KEYS.audit);
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(null);
    broadcast(null);
  }, []);

  return { audit, setAudit, clear };
}
