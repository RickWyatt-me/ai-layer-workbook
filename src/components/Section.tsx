import type { JSX } from 'react';
import Pager from './Pager';
import Start from '../pages/Start';
import MentalModels from '../pages/MentalModels';
import HowItWorks from '../pages/HowItWorks';
import YourPicture from '../pages/YourPicture';
import Phase1 from '../pages/Phase1';
import Phase2 from '../pages/Phase2';
import Phase3 from '../pages/Phase3';
import Phase4 from '../pages/Phase4';
import Phase5 from '../pages/Phase5';
import Phase6 from '../pages/Phase6';
import Phase7 from '../pages/Phase7';
import Phase8 from '../pages/Phase8';
import Phase9 from '../pages/Phase9';
import Maintenance from '../pages/Maintenance';
import PromptLibrary from '../pages/PromptLibrary';
import Glossary from '../pages/Glossary';

interface SectionProps {
  slug: string;
}

const PAGES: Record<string, () => JSX.Element> = {
  start: Start,
  'mental-models': MentalModels,
  'how-it-works': HowItWorks,
  'your-picture': YourPicture,
  'phase-1': Phase1,
  'phase-2': Phase2,
  'phase-3': Phase3,
  'phase-4': Phase4,
  'phase-5': Phase5,
  'phase-6': Phase6,
  'phase-7': Phase7,
  'phase-8': Phase8,
  'phase-9': Phase9,
  maintenance: Maintenance,
  'prompt-library': PromptLibrary,
  glossary: Glossary,
};

export default function Section({ slug }: SectionProps) {
  const Page = PAGES[slug];
  if (!Page) return null;
  return (
    <article className="page" id={`page-${slug}`}>
      <Page />
      <Pager slug={slug} />
    </article>
  );
}
