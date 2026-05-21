import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('failed');
    }
  };

  const label =
    state === 'copied' ? 'Copied ✓' : state === 'failed' ? 'Failed' : 'Copy';
  const className = state === 'copied' ? 'copy-btn copied' : 'copy-btn';

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
