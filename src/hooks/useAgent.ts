import { STORAGE_KEYS } from '../lib/storage-keys';
import { usePersistedEnum } from './usePersistedEnum';

export const AGENTS = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Cline',
  'Other',
] as const;

export type Agent = (typeof AGENTS)[number];

function isAgent(v: string | null): v is Agent {
  return v !== null && (AGENTS as readonly string[]).includes(v);
}

export function useAgent(): {
  agent: Agent;
  setAgent: (a: Agent) => void;
} {
  const [agent, setAgent] = usePersistedEnum(
    STORAGE_KEYS.agent,
    isAgent,
    'Claude Code',
  );
  return { agent, setAgent };
}
