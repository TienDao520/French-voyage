import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { storage, EMPTY_STATE } from '../lib/storage.js';
import { newCard, grade, isoDay } from '../lib/srs.js';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const dirty = useRef(false);

  // Load once on mount. `alive` guards against a late result arriving after
  // unmount (or after StrictMode's dev-only double-mount discards the first).
  useEffect(() => {
    let alive = true;
    storage.load().then((loaded) => {
      if (alive) {
        setState(loaded);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Debounced save — studying produces bursts of tiny writes; wait for a
  // 400 ms quiet moment, then write once. The cleanup cancels the pending
  // timer whenever state changes again: that cancellation IS the debounce.
  useEffect(() => {
    if (loading || !dirty.current) return undefined;
    const id = setTimeout(() => storage.save(state), 400);
    return () => clearTimeout(id);
  }, [state, loading]);

  // Every mutation passes through here: mark unsaved work, then update.
  function mutate(fn) {
    dirty.current = true;
    setState(fn);
  }

  const value = useMemo(
    () => ({
      state,

      recordLesson: (lessonId, { correct, total }) =>
        mutate((s) => ({
          ...s,
          lessons: {
            ...s.lessons,
            [lessonId]: {
              completedAt: Date.now(),
              best: Math.max(s.lessons[lessonId]?.best ?? 0, correct),
              total,
              attempts: (s.lessons[lessonId]?.attempts ?? 0) + 1,
            },
          },
        })),

      recordQuiz: (quizId, { correct, total }) =>
        mutate((s) => {
          const prev = s.quizzes[quizId] || { runs: 0, bestPct: 0, lastPct: 0 };
          const pct = total ? Math.round((correct / total) * 100) : 0;
          return {
            ...s,
            quizzes: {
              ...s.quizzes,
              [quizId]: {
                runs: prev.runs + 1,
                bestPct: Math.max(prev.bestPct, pct),
                lastPct: pct,
                lastAt: Date.now(),
              },
            },
          };
        }),

      // Grade one card: update its schedule and tick today's history count.
      reviewCard: (cardId, g) =>
        mutate((s) => {
          const card = s.cards[cardId] || newCard(cardId);
          const day = isoDay();
          return {
            ...s,
            cards: { ...s.cards, [cardId]: grade(card, g) },
            history: { ...s.history, [day]: (s.history[day] ?? 0) + 1 },
          };
        }),

      resetAll: () => mutate(() => ({ ...EMPTY_STATE })),

      loading,
      mode: storage.mode,
    }),
    [state, loading],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
