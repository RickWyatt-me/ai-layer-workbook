import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { GLOSSARY_DEFS } from '../data/glossary';
import {
  GlossaryContext,
  type GlossaryContextValue,
} from '../hooks/useGlossaryPopup';

interface PopupState {
  visible: boolean;
  term: string | null;
  x: number;
  y: number;
}

export default function GlossaryPopup({ children }: { children?: ReactNode }) {
  const [state, setState] = useState<PopupState>({
    visible: false,
    term: null,
    x: 0,
    y: 0,
  });

  const show = useCallback<GlossaryContextValue['show']>((term, pos) => {
    if (!GLOSSARY_DEFS[term]) return;
    setState({ visible: true, term, x: pos.x, y: pos.y });
  }, []);
  const hide = useCallback<GlossaryContextValue['hide']>(() => {
    setState((s) => (s.visible ? { ...s, visible: false } : s));
  }, []);
  const ctx = useMemo<GlossaryContextValue>(
    () => ({ show, hide }),
    [show, hide],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        setState((s) => (s.visible ? { ...s, visible: false } : s));
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (!target.closest('.glossary-term')) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  }, []);

  const definition = state.term ? GLOSSARY_DEFS[state.term] : '';

  return (
    <GlossaryContext.Provider value={ctx}>
      {children}
      <div
        className={`glossary-popup${state.visible ? ' shown' : ''}`}
        style={{ left: `${state.x}px`, top: `${state.y}px` }}
        role="tooltip"
        aria-hidden={!state.visible}
      >
        {state.term && (
          <>
            <strong>{state.term}</strong>
            {definition}
          </>
        )}
      </div>
    </GlossaryContext.Provider>
  );
}
