import CopyButton from './CopyButton';

interface CodeBlockProps {
  lang: string;
  children: string;
}

export default function CodeBlock({ lang, children }: CodeBlockProps) {
  return (
    <pre>
      <code className={`language-${lang}`}>{children}</code>
      <CopyButton text={children} />
    </pre>
  );
}
