export default function PrivacyExplainer() {
  return (
    <section
      className="settings-privacy"
      aria-labelledby="privacy-explainer-title"
    >
      <h3 id="privacy-explainer-title">What stays in your browser</h3>
      <p>
        Your Anthropic API key, your GitHub token, your settings, your checklist
        progress, and your repo notes are stored only in this browser's local
        storage. They never leave your machine <em>except</em> to the
        destination services below.
      </p>

      <h3>What gets sent over the network</h3>
      <ul>
        <li>
          Your Anthropic API key is sent only to <code>api.anthropic.com</code>{' '}
          when you use a Draft button.
        </li>
        <li>
          Your GitHub token is sent only to <code>api.github.com</code> when you
          fetch a repo.
        </li>
        <li>
          Nothing else. There is no backend on this site to send anything to.
        </li>
      </ul>

      <h3>Clearing keys</h3>
      <p>
        Use <em>Clear all keys &amp; settings</em> below — or your browser's
        local-storage tools — to wipe everything instantly.
      </p>
    </section>
  );
}
