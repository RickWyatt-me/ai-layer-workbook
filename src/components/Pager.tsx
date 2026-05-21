import { Link } from 'react-router-dom';
import { NAV_FLAT, nextSlug, prevSlug } from '../data/nav';

interface PagerProps {
  slug: string;
}

function titleOf(slug: string): string {
  return NAV_FLAT.find((item) => item.slug === slug)?.title ?? '';
}

export default function Pager({ slug }: PagerProps) {
  const prev = prevSlug(slug);
  const next = nextSlug(slug);

  return (
    <nav className="pager" aria-label="Page navigation">
      {prev ? (
        <Link to={`/${prev}`} className="pager-link pager-prev">
          <span className="pager-direction">← Previous</span>
          <span className="pager-title">{titleOf(prev)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={`/${next}`} className="pager-link pager-next">
          <span className="pager-direction">Next →</span>
          <span className="pager-title">{titleOf(next)}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
