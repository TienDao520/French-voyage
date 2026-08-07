/**
 * storage.js — the app's one door to persistence.
 *
 * Everything talks to `storage`, never to localStorage directly. Today there
 * is one driver; in step 16 an API driver (the Express server) slots in
 * beside it, chosen by VITE_API_URL — and no consumer changes, because the
 * interface was designed for the slowest driver from day one.
 */

const KEY = 'fv:v1';

export const EMPTY_STATE = {
  cards: {}, // per-flashcard SRS state, keyed by card id (engine: step 10)
  lessons: {}, // grammar lesson results, keyed by lesson id
  quizzes: {}, // quiz results, keyed by quiz id
  history: {}, // reviews per day, keyed by ISO date
  settings: {}, // reserved for server sync (step 16); SettingsContext keeps its own key today
  updatedAt: 0,
};

const localDriver = {
  name: 'local',
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : { ...EMPTY_STATE };
    } catch {
      // Private browsing can forbid reads; a corrupted save can fail to parse.
      // Either way: start fresh rather than crash.
      return { ...EMPTY_STATE };
    }
  },
  async save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
      return true;
    } catch {
      return false; // quota exceeded or private mode — fail quietly, keep studying
    }
  },
};

// Step 16 adds: const apiDriver = { ... } and picks between them here.
const driver = localDriver;

export const storage = {
  mode: driver.name,
  load: () => driver.load(),
  save: (state) => driver.save(state),
};
