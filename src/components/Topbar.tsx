import { useState } from 'react';
import { AGENTS, type Agent, useAgent } from '../hooks/useAgent';
import { useTheme } from '../hooks/useTheme';
import SettingsButton from './SettingsButton';
import SettingsDialog from './SettingsDialog';

interface TopbarProps {
  drawerOpen: boolean;
  onMenuClick: () => void;
}

export default function Topbar({ drawerOpen, onMenuClick }: TopbarProps) {
  const { agent, setAgent } = useAgent();
  const { theme, toggleTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <button
          id="menu-btn"
          className="menu-btn"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="sidebar-nav"
          onClick={onMenuClick}
        >
          ☰
        </button>

        <div className="topbar-right">
          <label className="agent-picker">
            <span className="agent-picker-label">Your agent →</span>
            <select
              className="picker"
              value={agent}
              onChange={(e) => setAgent(e.target.value as Agent)}
              aria-label="Which coding agent you use"
            >
              {AGENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <button
            className="icon-btn"
            type="button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === 'light' ? '◐' : '◑'}
          </button>

          <SettingsButton
            open={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          />
        </div>
      </header>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
