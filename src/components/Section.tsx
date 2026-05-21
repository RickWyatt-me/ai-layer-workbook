import Pager from './Pager';
import { indexOfSlug, navNumber } from '../data/nav';

interface SectionProps {
  slug: string;
  title: string;
}

export default function Section({ slug, title }: SectionProps) {
  const idx = indexOfSlug(slug);
  return (
    <article className="page active" id={`page-${slug}`}>
      <div className="eyebrow">Section {navNumber(idx)}</div>
      <h1>{title}</h1>
      <p className="lede">
        Placeholder. The full content for this section will be ported verbatim
        from <code>ai-layer-workbook-v1.html</code> in step 4 onward.
      </p>
      <hr />
      <Pager slug={slug} />
    </article>
  );
}
