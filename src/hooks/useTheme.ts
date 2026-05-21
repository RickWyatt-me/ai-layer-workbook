import { useEffect } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { usePersistedEnum } from './usePersistedEnum';

export type Theme = 'light' | 'dark';

function isTheme(v: string | null): v is Theme {
  return v === 'light' || v === 'dark';
}

function systemPreference(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = usePersistedEnum(
    STORAGE_KEYS.theme,
    isTheme,
    systemPreference(),
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
  };
}
