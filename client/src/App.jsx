import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';

// Lazy-loaded: each becomes its own chunk, downloaded only when visited.
// lazy() tells React to load each page only when it's first visited.
// This reduces the initial bundle size and speeds up the first page load.
const Home = lazy(() => import('./pages/Home.jsx')); //returns a Promise -> When React asks for this page, perform the import.
const Grammar = lazy(() => import('./pages/Grammar.jsx'));
const LessonDetail = lazy(() => import('./pages/LessonDetail.jsx'));
const Vocabulary = lazy(() => import('./pages/Vocabulary.jsx'));
const Cards = lazy(() => import('./pages/Cards.jsx'));
const Verbs = lazy(() => import('./pages/Verbs.jsx'));
const VerbDetail = lazy(() => import('./pages/VerbDetail.jsx'));
const Quizzes = lazy(() => import('./pages/Quizzes.jsx'));
const Reading = lazy(() => import('./pages/Reading.jsx'));
const Speaking = lazy(() => import('./pages/Speaking.jsx'));
const Progress = lazy(() => import('./pages/Progress.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function App() {
  return (
    // While a lazy-loaded page is downloading, show this fallback.
    <Suspense fallback={<p className="container py-5 text-muted-2">Loading…</p>}>
      <Routes>
        {/* All child routes share the Layout component */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="grammar" element={<Grammar />} />
          {/* Dynamic route parameter */}
          <Route path="grammar/:lessonId" element={<LessonDetail />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="cards" element={<Cards />} />
          <Route path="verbs" element={<Verbs />} />
          <Route path="verbs/:verbId" element={<VerbDetail />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="quizzes/:quizId" element={<Quizzes />} />
          <Route path="reading" element={<Reading />} />
          <Route path="speaking" element={<Speaking />} />
          <Route path="progress" element={<Progress />} />
          <Route path="settings" element={<Settings />} />
          {/* Catch-all: redirect unknown URLs back to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
