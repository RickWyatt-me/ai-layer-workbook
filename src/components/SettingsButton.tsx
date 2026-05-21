interface SettingsButtonProps {
  open: boolean;
  onClick: () => void;
}

export default function SettingsButton({ open, onClick }: SettingsButtonProps) {
  return (
    <button
      id="settings-btn"
      className="icon-btn"
      type="button"
      aria-label="Open settings"
      title="Settings"
      aria-expanded={open}
      aria-controls="settings-dialog"
      onClick={onClick}
    >
      ⚙
    </button>
  );
}
