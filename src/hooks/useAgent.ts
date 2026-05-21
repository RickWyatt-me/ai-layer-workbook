import { useEffect, useState } from 'react';

export const AGENTS = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Cline',
  'Other',
] as const;

export type Agent = (typeof AGENTS)[number];

const STORAGE_KEY = 'aiLayer.agent';

function initialAgent(): Agent {
  if (typeof window === 'undefined') return 'Claude Code';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (AGENTS as readonly string[]).includes(stored ?? '')
    ? (stored as Agent)
    : 'Claude Code';
}

export function useAgent(): {
  agent: Agent;
  setAgent: (a: Agent) => void;
} {
  const [agent, setAgentState] = useState<Agent>(initialAgent);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, agent);
  }, [agent]);

  return { agent, setAgent: setAgentState };
}
