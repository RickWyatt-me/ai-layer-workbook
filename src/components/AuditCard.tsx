import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgent } from '../hooks/useAgent';
import { useAudit, type Audit } from '../hooks/useAudit';
import { useRepo } from '../hooks/useRepo';
import { useSettings } from '../hooks/useSettings';
import {
  isFindingsArray,
  streamAudit,
  tryParsePartialFindings,
  type AnthropicError,
  type AnthropicUsage,
  type Finding,
} from '../lib/anthropic';
import {
  buildAuditSystemPrompt,
  buildAuditUserMessage,
} from '../lib/audit-prompt';
import { estimateCostUsd, formatUsd } from '../lib/pricing';
import FindingCard from './FindingCard';

type Status = 'idle' | 'streaming';

function buildMarkdownTable(audit: Audit): string {
  if (audit.findings.length === 0) return audit.rawText;
  const esc = (s: string) =>
    s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  const header = '| Area | Severity | Body | Next step |';
  const divider = '| --- | --- | --- | --- |';
  const rows = audit.findings.map(
    (f) =>
      `| ${esc(f.area)} | ${esc(f.severity)} | ${esc(f.body)} | ${esc(f.suggested_next_step)} |`,
  );
  return [header, divider, ...rows].join('\n');
}

function openSettings() {
  // TODO (C2): lift SettingsDialog open-state into context once a second
  // component needs to trigger it. For C1 we reach across to the Topbar's
  // gear button by id — brittle if the id or element type changes, but a
  // silent no-op if the lookup fails (no console noise, no exceptions).
  const btn = document.getElementById('settings-btn');
  if (btn instanceof HTMLButtonElement) btn.click();
}

export default function AuditCard() {
  const { settings } = useSettings();
  const { repo } = useRepo();
  const { agent } = useAgent();
  const { audit, setAudit, clear } = useAudit();

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<AnthropicError | null>(null);
  const [streamFindings, setStreamFindings] = useState<Finding[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const abortRef = useRef<AbortController | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const streamTextRef = useRef<string>('');

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  const hasKey = settings.anthropicKey.trim().length > 0;
  const hasRepo = repo !== null;
  const streaming = status === 'streaming';

  const onRun = async () => {
    if (!hasKey || !hasRepo || !repo) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    streamTextRef.current = '';
    setStreamFindings([]);
    setStatus('streaming');

    let finalUsage: AnthropicUsage = { input_tokens: 0, output_tokens: 0 };

    await streamAudit(
      {
        apiKey: settings.anthropicKey,
        body: {
          model: settings.generateModel,
          max_tokens: 4096,
          stream: true,
          system: buildAuditSystemPrompt(agent),
          messages: [{ role: 'user', content: buildAuditUserMessage(repo) }],
        },
      },
      {
        onTextDelta: (chunk) => {
          if (controller.signal.aborted) return;
          streamTextRef.current += chunk;
          setStreamFindings(tryParsePartialFindings(streamTextRef.current));
        },
        onUsage: (u) => {
          finalUsage = u;
        },
        onComplete: (fullText) => {
          if (controller.signal.aborted) return;
          let parsed: Finding[] = [];
          let parseOk = false;
          try {
            const cleaned = fullText
              .replace(/^\s*```(?:json)?\s*/i, '')
              .replace(/\n?```\s*$/i, '');
            const obj = JSON.parse(cleaned) as { findings?: unknown };
            if (isFindingsArray(obj.findings)) {
              parsed = obj.findings;
              parseOk = true;
            }
          } catch {
            // Final parse failed — keep rawText for fallback render.
          }
          setStatus('idle');
          setAudit({
            repoOwner: repo.owner,
            repoName: repo.repo,
            repoFetchedAt: repo.fetchedAt,
            model: settings.generateModel,
            agent,
            findings: parsed,
            // Empty rawText signals a clean parse; the fallback render branch
            // keys on `rawText.length > 0`, so empty findings render the
            // "no findings" empty state instead of the fallback.
            rawText: parseOk ? '' : fullText,
            usage: finalUsage,
            auditedAt: Date.now(),
          });
        },
        onError: (err) => {
          if (controller.signal.aborted) return;
          setStatus('idle');
          setError(err);
          // Clear any partial cards that streamed in before the failure so
          // the error block doesn't render alongside half-baked findings.
          streamTextRef.current = '';
          setStreamFindings([]);
        },
      },
      controller.signal,
    );
  };

  const onStop = () => {
    abortRef.current?.abort();
    setStatus('idle');
    streamTextRef.current = '';
    setStreamFindings([]);
  };

  const onClearCache = () => {
    abortRef.current?.abort();
    setStatus('idle');
    streamTextRef.current = '';
    setStreamFindings([]);
    setError(null);
    clear();
  };

  const onCopyMarkdown = async () => {
    if (!audit) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownTable(audit));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(
      () => setCopyState('idle'),
      1800,
    );
  };

  const repoChanged =
    audit &&
    repo &&
    (audit.repoOwner !== repo.owner || audit.repoName !== repo.repo);
  const repoRefetched =
    audit && repo && !repoChanged && audit.repoFetchedAt < repo.fetchedAt;

  const primaryLabel = streaming
    ? 'Stop'
    : audit
      ? 'Refetch audit'
      : 'Audit my repo';

  const primaryDisabled = !streaming && (!hasKey || !hasRepo);
  const primaryHandler = streaming ? onStop : onRun;

  const displayFindings = streaming ? streamFindings : (audit?.findings ?? []);

  // rawText is only populated when the final JSON parse failed (see onComplete).
  // Empty rawText with empty findings = legitimate empty audit; populated
  // rawText with empty findings = parse-failure fallback.
  const showFallback =
    !streaming &&
    audit &&
    audit.findings.length === 0 &&
    audit.rawText.length > 0;

  const showEmpty =
    !streaming &&
    audit &&
    audit.findings.length === 0 &&
    audit.rawText.length === 0;

  const canCopy =
    !streaming &&
    audit &&
    (audit.findings.length > 0 || audit.rawText.length > 0);

  return (
    <section className="audit-card" aria-labelledby="audit-card-title">
      <h3 id="audit-card-title">Audit my repo</h3>
      <p className="audit-card__intro">
        We send your repo's denoised tree, languages, and README to Anthropic
        with your stored key. The audit takes ~10–30 seconds and costs a few
        cents.
      </p>

      {repoChanged ? (
        <p className="audit-card__staleness">
          Cached audit was for{' '}
          <code>
            {audit.repoOwner}/{audit.repoName}
          </code>
          .{' '}
          <button
            type="button"
            className="audit-card__link-btn"
            onClick={onRun}
          >
            Refetch for {repo.owner}/{repo.repo}
          </button>
        </p>
      ) : repoRefetched ? (
        <p className="audit-card__staleness">
          Your repo was re-fetched since this audit ran.{' '}
          <button
            type="button"
            className="audit-card__link-btn"
            onClick={onRun}
          >
            Refetch audit
          </button>
        </p>
      ) : null}

      <div className="audit-card__actions">
        <button
          type="button"
          className="btn"
          onClick={primaryHandler}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
        {canCopy ? (
          <button type="button" className="btn ghost" onClick={onCopyMarkdown}>
            {copyState === 'copied'
              ? 'Copied ✓'
              : copyState === 'failed'
                ? 'Copy failed'
                : 'Copy as markdown'}
          </button>
        ) : null}
        {audit && !streaming ? (
          <button
            type="button"
            className="audit-card__link-btn"
            onClick={onClearCache}
          >
            Clear audit
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="audit-card__error" role="alert">
          {error.message} {error.next}
        </p>
      ) : !hasKey ? (
        <p className="audit-card__hint">
          Add your Anthropic API key in{' '}
          <button
            type="button"
            className="audit-card__link-btn"
            onClick={openSettings}
          >
            Settings
          </button>{' '}
          to enable in-page audit.
        </p>
      ) : !hasRepo ? (
        <p className="audit-card__hint">
          Paste your GitHub repo URL on the{' '}
          <Link to="/your-picture">Your codebase picture</Link> page first.
        </p>
      ) : null}

      {displayFindings.length > 0 ? (
        <div className="audit-card__findings">
          {displayFindings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      ) : null}

      {streaming && displayFindings.length === 0 ? (
        <p className="audit-card__status">Streaming from Anthropic…</p>
      ) : null}

      {showFallback ? (
        <div className="audit-card__fallback">
          <p>
            We couldn't structure the audit output. Here's the raw text — copy
            it into your agent or click Refetch.
          </p>
          <pre>{audit.rawText}</pre>
        </div>
      ) : null}

      {showEmpty ? (
        <p className="audit-card__hint">
          The audit returned no findings. Try Refetch.
        </p>
      ) : null}

      {audit && !streaming ? (
        <p className="audit-card__usage">
          Used {audit.usage.input_tokens.toLocaleString()} input +{' '}
          {audit.usage.output_tokens.toLocaleString()} output tokens ·{' '}
          {formatUsd(estimateCostUsd(audit.model, audit.usage))} · model:{' '}
          {audit.model}
        </p>
      ) : null}

      <p className="audit-card__hint">
        Your API key never leaves your browser except as an{' '}
        <code>x-api-key</code> header to <code>api.anthropic.com</code>.
      </p>
    </section>
  );
}
