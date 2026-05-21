import { Fragment } from 'react';
import { GLOSSARY_DL } from '../data/glossary';

export default function Glossary() {
  return (
    <>
      <span className="section-num">15</span>
      <div className="eyebrow">Reference</div>
      <h1>Glossary</h1>
      <p className="lede">Every technical term, in plain language.</p>

      <dl className="kvgrid" id="glossaryList">
        {GLOSSARY_DL.map((entry) => (
          <Fragment key={entry.term}>
            <dt>{entry.term}</dt>
            <dd>{entry.definition}</dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}
