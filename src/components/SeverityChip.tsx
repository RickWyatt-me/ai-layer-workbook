import type { Severity } from '../lib/anthropic';

const LABELS: Record<Severity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export default function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span className={`severity-chip severity-chip--${severity}`}>
      {LABELS[severity]}
    </span>
  );
}
