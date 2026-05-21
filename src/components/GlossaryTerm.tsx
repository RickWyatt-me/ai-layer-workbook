import type { MouseEvent, ReactNode } from 'react';
import { useGlossaryPopup } from '../hooks/useGlossaryPopup';

interface GlossaryTermProps {
  term: string;
  children: ReactNode;
}

function position(target: Element) {
  const r = target.getBoundingClientRect();
  const x = Math.min(r.left, window.innerWidth - 300);
  const y = r.bottom + 6;
  return { x, y };
}

export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const popup = useGlossaryPopup();

  const open = (e: MouseEvent<HTMLSpanElement>) => {
    popup.show(term, position(e.currentTarget));
  };

  return (
    <span
      className="glossary-term"
      data-term={term}
      onMouseEnter={open}
      onMouseLeave={() => popup.hide()}
      onClick={open}
    >
      {children}
    </span>
  );
}
