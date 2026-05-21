import { Link } from 'react-router-dom';
import { NAV_FLAT, indexOfSlug } from '../data/nav';

interface PagerProps {
  slug: string;
}

export default function Pager({ slug }: PagerProps) {
  const idx = indexOfSlug(slug);
  if (idx === -1) return null;

  const prev = idx > 0 ? NAV_FLAT[idx - 1] : null;
  const next = idx < NAV_FLAT.length - 1 ? NAV_FLAT[idx + 1] : null;

  return (
    <nav className="pager" aria-label="Page navigation">
      {prev ? (
        <Link to={`/${prev.slug}`} className="pager-link pager-prev">
          <span className="pager-direction">← Previous</span>
          <span className="pager-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={`/${next.slug}`} className="pager-link pager-next">
          <span className="pager-direction">Next →</span>
          <span className="pager-title">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
