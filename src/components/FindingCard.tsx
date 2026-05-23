import type { Finding } from '../lib/anthropic';
import SeverityChip from './SeverityChip';

export default function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="finding-card" aria-labelledby={`finding-${finding.id}`}>
      <header className="finding-card__header">
        <h4 id={`finding-${finding.id}`}>{finding.area}</h4>
        <SeverityChip severity={finding.severity} />
      </header>
      <p className="finding-card__body">{finding.body}</p>
      <p className="finding-card__next">
        <strong>Next:</strong> {finding.suggested_next_step}
      </p>
    </article>
  );
}
