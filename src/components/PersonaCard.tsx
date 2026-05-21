import { useEffect, useRef, useState } from 'react';
import { usePersona, type RepoLayout } from '../hooks/usePersona';

const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'swift', label: 'Swift (iOS)' },
  { value: 'kotlin', label: 'Kotlin (Android)' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'other', label: 'Other' },
];

export default function PersonaCard() {
  const { persona, setPersona } = usePersona();

  const [repoName, setRepoName] = useState(
    persona.repoName === 'your-repo' ? '' : persona.repoName,
  );
  const [languages, setLanguages] = useState<string[]>(persona.languages);
  const [layout, setLayout] = useState<RepoLayout>(persona.layout);
  const [topLevelDirs, setTopLevelDirs] = useState(persona.topLevelDirs);
  const [status, setStatus] = useState('');
  const statusTimeout = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (statusTimeout.current !== null)
        window.clearTimeout(statusTimeout.current);
    },
    [],
  );

  // Resync local form state when persona changes externally (e.g. RepoFetcher
  // populates it after a successful GitHub fetch). A user mid-typing during a
  // fetch will see their input replaced — acceptable because the fetch is
  // user-initiated and the source is shown above.
  useEffect(() => {
    setRepoName(persona.repoName === 'your-repo' ? '' : persona.repoName);
    setLanguages(persona.languages);
    setLayout(persona.layout);
    setTopLevelDirs(persona.topLevelDirs);
  }, [persona]);

  const toggleLanguage = (value: string) => {
    setLanguages((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const onApply = () => {
    setPersona({
      repoName: repoName.trim() || 'your-repo',
      languages,
      layout,
      topLevelDirs,
    });
    setStatus('✓ Saved. Workbook updated.');
    if (statusTimeout.current !== null)
      window.clearTimeout(statusTimeout.current);
    statusTimeout.current = window.setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="persona-card">
      <h3>Personalize</h3>
      <p
        style={{
          color: 'var(--ink-soft)',
          fontSize: '.9rem',
          marginBottom: '1.2rem',
        }}
      >
        Everything stays in your browser. Nothing is sent anywhere. Update
        anytime.
      </p>

      <div className="persona-field">
        <label htmlFor="repoName">Repo name</label>
        <input
          type="text"
          id="repoName"
          placeholder="vox"
          autoComplete="off"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
        />
      </div>

      <div className="persona-field">
        <label>Primary languages (select all that apply)</label>
        <div className="lang-grid" id="langGrid">
          {LANGUAGE_OPTIONS.map((opt) => (
            <label key={opt.value}>
              <input
                type="checkbox"
                value={opt.value}
                checked={languages.includes(opt.value)}
                onChange={() => toggleLanguage(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="persona-field">
        <label htmlFor="layout">Repo layout</label>
        <select
          id="layout"
          value={layout}
          onChange={(e) => setLayout(e.target.value as RepoLayout)}
        >
          <option value="single">Single repo (everything in one place)</option>
          <option value="multi">
            Multi-repo (one repo per service/platform)
          </option>
          <option value="mono">
            Monorepo with packages/services subfolders
          </option>
        </select>
      </div>

      <div className="persona-field">
        <label htmlFor="topLevelDirs">
          Top-level folders (one per line, optional)
        </label>
        <textarea
          id="topLevelDirs"
          placeholder={'ios\nandroid\nshared\ndocs'}
          value={topLevelDirs}
          onChange={(e) => setTopLevelDirs(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn"
        id="personalizeBtn"
        onClick={onApply}
      >
        Apply &amp; save
      </button>
      <span
        id="personalizeStatus"
        style={{
          marginLeft: '1rem',
          fontSize: '.85rem',
          color: 'var(--ok)',
        }}
      >
        {status}
      </span>
    </div>
  );
}
