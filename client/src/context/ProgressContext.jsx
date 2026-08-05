import { createContext, useContext, useMemo, useState } from 'react';

const ProgressContext = createContext(null);

// Everything the learner has done. This shape moves into lib/storage in
// step 09, when it learns to survive a refresh.
export const EMPTY_STATE = {
  cards: {}, // per-flashcard SRS state, keyed by card id (engine: step 10)
  lessons: {}, // grammar lesson results, keyed by lesson id
  quizzes: {}, // quiz results, keyed by quiz id
  history: {}, // reviews per day, keyed by ISO date
};

export function ProgressProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);

  const value = useMemo(
    () => ({
      state,

      recordLesson: (lessonId, { correct, total }) =>
        setState((s) => ({
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
        setState((s) => {
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

      // reviewCard arrives with the SRS engine in step 10.

      resetAll: () => setState({ ...EMPTY_STATE }),
    }),
    [state],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
