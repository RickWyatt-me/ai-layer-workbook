import { useEffect, useRef, useState } from 'react';
import { usePersona } from '../hooks/usePersona';
import { useRepo } from '../hooks/useRepo';
import { useSettings } from '../hooks/useSettings';
import {
  derivePersonaFromRepo,
  fetchRepo,
  isGithubError,
  parseRepoUrl,
  type GithubError,
} from '../lib/github';

export default function RepoFetcher() {
  const { settings } = useSettings();
  const { repo, setRepo, clear } = useRepo();
  const { setPersona } = usePersona();

  const [url, setUrl] = useState<string>(repo?.url ?? '');
  const [status, setStatus] = useState<'idle' | 'fetching'>('idle');
  const [error, setError] = useState<GithubError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runFetch = async (sourceUrl: string) => {
    setError(null);
    const parsed = parseRepoUrl(sourceUrl);
    if (!parsed) {
      setError({
        kind: 'invalid-url',
        message: "That doesn't look like a GitHub URL.",
        next: 'Use the form https://github.com/owner/repo (or git@github.com:owner/repo).',
      });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('fetching');
    try {
      const fetched = await fetchRepo(
        parsed,
        settings.githubPat,
        controller.signal,
      );
      setRepo(fetched);
      setPersona(derivePersonaFromRepo(fetched));
      setStatus('idle');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus('idle');
      setError(
        isGithubError(err)
          ? err
          : {
              kind: 'network',
              message: 'Could not reach GitHub.',
              next: 'Check your connection and try again.',
            },
      );
    }
  };

  const onFetch = () => {
    void runFetch(url);
  };

  const onRefresh = () => {
    void runFetch(repo?.url ?? url);
  };

  const onClear = () => {
    abortRef.current?.abort();
    setUrl('');
    setError(null);
    setStatus('idle');
    clear();
  };

  const fetching = status === 'fetching';
  const fetchDisabled = fetching || !url.trim();

  return (
    <section className="repo-fetcher" aria-labelledby="repo-fetcher-title">
      <h3 id="repo-fetcher-title">Fetch from GitHub</h3>
      <p className="repo-fetcher__intro">
        Paste a GitHub URL. The workbook fills in the personalize fields below
        from your repo's metadata.
      </p>

      <div className="persona-field">
        <label htmlFor="repo-url">Your GitHub repo URL</label>
        <input
          id="repo-url"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn"
        onClick={onFetch}
        disabled={fetchDisabled}
      >
        {fetching ? 'Fetching…' : 'Fetch'}
      </button>

      {error ? (
        <p className="repo-fetcher__error" role="alert">
          {error.message} {error.next}
        </p>
      ) : fetching ? (
        <p className="repo-fetcher__status">Fetching from GitHub…</p>
      ) : repo ? (
        <p className="repo-fetcher__source">
          Filled from{' '}
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            {repo.owner}/{repo.repo}
          </a>
          .{' '}
          <button
            type="button"
            className="repo-fetcher__link-btn"
            onClick={onRefresh}
          >
            Refresh
          </button>{' '}
          <button
            type="button"
            className="repo-fetcher__link-btn"
            onClick={onClear}
          >
            Clear repo data
          </button>
        </p>
      ) : null}

      {repo?.treeTruncated ? (
        <p className="repo-fetcher__warn">
          This repo is large — only the first slice was indexed. Detection may
          be partial.
        </p>
      ) : null}

      <p className="repo-fetcher__hint">
        Need a GitHub token for a private repo? Open Settings (gear icon).
      </p>
    </section>
  );
}
