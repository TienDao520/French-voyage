import { useSettings } from '../context/SettingsContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';

function Settings() {
  const { settings, set, reset } = useSettings();
  const { state, resetAll, mode } = useProgress();

  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <h2>Settings</h2>

      <label className="d-block">
        <span className="eyebrow d-block mb-1">Theme</span>
        <select
          className="form-select"
          value={settings.theme}
          onChange={(e) => set({ theme: e.target.value })}
        >
          <option value="auto">Auto (follow system)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label className="d-flex align-items-center gap-2">
        <input
          type="checkbox"
          className="form-check-input"
          checked={settings.showEnglish}
          onChange={(e) => set({ showEnglish: e.target.checked })}
        />
        Show English translations
      </label>

      <p className="en mb-0">
        Cards studied so far: {Object.keys(state.cards).length} · storage: {mode}
      </p>

      <div className="d-flex gap-2">
        <button className="btn btn-outline-secondary btn-sm" onClick={reset}>
          Reset settings
        </button>
        <button className="btn btn-outline-danger btn-sm" onClick={resetAll}>
          Reset progress
        </button>
      </div>
    </div>
  );
}

export default Settings;
