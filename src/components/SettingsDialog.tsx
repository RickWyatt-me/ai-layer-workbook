import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AGENTS, type Agent, useAgent } from '../hooks/useAgent';
import { usePersona } from '../hooks/usePersona';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import {
  FAST_MODELS,
  GENERATE_MODELS,
  type FastModel,
  type GenerateModel,
} from '../lib/models';
import { STORAGE_KEYS } from '../lib/storage-keys';
import PrivacyExplainer from './PrivacyExplainer';

const FOCUSABLE_SELECTOR =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const PAT_URL = 'https://github.com/settings/tokens?type=beta';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const {
    settings,
    setAnthropicKey,
    setGithubPat,
    setGenerateModel,
    setFastModel,
  } = useSettings();
  const { agent, setAgent } = useAgent();
  const { theme, toggleTheme } = useTheme();
  const { persona } = usePersona();

  const previouslyOpen = useRef(false);
  const [confirming, setConfirming] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (open) {
      previouslyOpen.current = true;
      const dialog = document.getElementById('settings-dialog');
      const initial =
        document.getElementById('anthropic-key') ??
        dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      initial?.focus();

      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
          return;
        }
        if (e.key !== 'Tab' || !dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }

    if (previouslyOpen.current) {
      setConfirming(false);
      document.getElementById('settings-btn')?.focus();
    }
  }, [open]);

  if (!open) return null;

  const onConfirmClear = () => {
    if (typeof window === 'undefined') return;
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore — storage unavailable
    }
    // Reload so every hook re-initialises from clean storage. Single source of
    // truth for "what defaults look like" lives in each hook's parseStored.
    window.location.reload();
  };

  const personaSummary =
    persona.repoName === 'your-repo' && persona.languages.length === 0
      ? 'Not personalized yet.'
      : `${persona.repoName}${
          persona.languages.length > 0
            ? ` · ${persona.languages.join(', ')}`
            : ''
        } · ${persona.layout}`;

  return createPortal(
    <div className="settings-backdrop" onClick={onClose}>
      <div
        id="settings-dialog"
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-dialog__header">
          <h2 id="settings-dialog-title">Settings</h2>
          <button
            className="icon-btn"
            type="button"
            aria-label="Close settings"
            title="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="settings-dialog__section">
          <div className="persona-field">
            <label htmlFor="anthropic-key">Anthropic API key</label>
            <input
              id="anthropic-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={settings.anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-…"
            />
            <p className="settings-dialog__hint">
              Stored in this browser's local storage. Sent only to{' '}
              <code>api.anthropic.com</code> when you use a Draft button.
            </p>
          </div>
        </div>

        <div className="settings-dialog__section">
          <div className="persona-field">
            <label htmlFor="github-pat">GitHub token (optional)</label>
            <input
              id="github-pat"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={settings.githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              placeholder="github_pat_…"
            />
            <p className="settings-dialog__hint">
              Only needed for private repos. Sent only to{' '}
              <code>api.github.com</code>.{' '}
              <a href={PAT_URL} target="_blank" rel="noopener noreferrer">
                Create a fine-grained PAT →
              </a>
            </p>
          </div>
        </div>

        <div className="settings-dialog__section">
          <div className="persona-field">
            <label htmlFor="generate-model">Generate model</label>
            <select
              id="generate-model"
              value={settings.generateModel}
              onChange={(e) =>
                setGenerateModel(e.target.value as GenerateModel)
              }
            >
              {GENERATE_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="settings-dialog__hint">
              Used for Audit, Draft CLAUDE.md, and Draft skill.
            </p>
          </div>

          <div className="persona-field">
            <label htmlFor="fast-model">Fast model</label>
            <select
              id="fast-model"
              value={settings.fastModel}
              onChange={(e) => setFastModel(e.target.value as FastModel)}
              disabled={FAST_MODELS.length < 2}
            >
              {FAST_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="settings-dialog__hint">
              {FAST_MODELS.length < 2
                ? 'Only one fast model available — selectable when more land.'
                : 'Used for small, fast jobs.'}
            </p>
          </div>
        </div>

        <div className="settings-dialog__section">
          <div className="persona-field">
            <label htmlFor="agent-select">Your coding agent</label>
            <select
              id="agent-select"
              value={agent}
              onChange={(e) => setAgent(e.target.value as Agent)}
            >
              {AGENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="persona-field">
            <label>Theme</label>
            <button
              type="button"
              className="btn settings-dialog__theme-btn"
              onClick={toggleTheme}
            >
              {theme === 'light' ? '◐ Switch to dark' : '◑ Switch to light'}
            </button>
          </div>
        </div>

        <div className="settings-dialog__section">
          <div className="persona-field">
            <label>Personalize</label>
            <p className="settings-dialog__hint">{personaSummary}</p>
            <Link
              to="/your-picture"
              className="settings-dialog__edit-link"
              onClick={onClose}
            >
              Edit on the “Your codebase picture” page →
            </Link>
          </div>
        </div>

        <div className="settings-dialog__section">
          <PrivacyExplainer />
        </div>

        <div className="settings-dialog__section settings-dialog__section--last">
          {!confirming ? (
            <button
              type="button"
              className="settings-clear-btn"
              onClick={() => setConfirming(true)}
            >
              Clear all keys &amp; settings
            </button>
          ) : (
            <div className="settings-confirm">
              <p>Sure? This cannot be undone. The page will reload.</p>
              <div className="settings-confirm__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-clear-btn settings-clear-btn--confirm"
                  onClick={onConfirmClear}
                >
                  Confirm — wipe everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
