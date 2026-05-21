import { createContext, useContext } from 'react';

export interface GlossaryPosition {
  x: number;
  y: number;
}

export interface GlossaryContextValue {
  show: (term: string, pos: GlossaryPosition) => void;
  hide: () => void;
}

export const GlossaryContext = createContext<GlossaryContextValue | null>(null);

const NOOP_CTX: GlossaryContextValue = {
  show: () => undefined,
  hide: () => undefined,
};

export function useGlossaryPopup(): GlossaryContextValue {
  return useContext(GlossaryContext) ?? NOOP_CTX;
}
