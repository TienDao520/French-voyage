import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

const DEFAULTS = {
  theme: 'auto', // auto | light | dark
  showEnglish: true, // hide translations for immersion practice
  speechRate: 0.95, // Web Speech API rate — used in step 14
  newPerDay: 15, // flashcard session limits — used in step 11
  sessionSize: 30,
};

export function SettingsProvider({ children }) {
  // In-memory only for now — step 09 teaches this state to survive a refresh.
  const [settings, setSettings] = useState(DEFAULTS);

  // Apply the theme choice to <html data-theme="...">, and while the choice
  // is 'auto', follow the operating system's preference live.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'auto' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    // cleanup function - React removes the event listener
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);

  // It remembers a calculated value so React doesn't recreate it unnecessarily.
  // React reuses the same object until one of its dependencies changes.
  const value = useMemo(
    () => ({
      settings,
      set: (patch) => setSettings((s) => ({ ...s, ...patch })), //...s, copies everything - ...patch  overwrites matching properties
      reset: () => setSettings({ ...DEFAULTS }), //creates a new object instead of reusing the existing one.
    }),
    [settings],
  );

  // where the "shared box" gets filled.
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
// Instead of writing this in every component:
// const ctx = useContext(SettingsContext);
export function useSettings() {
  const ctx = useContext(SettingsContext);
  // If there is no Provider above this component
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
