import { useMemo, useState } from 'react';
import Flashcard from '../components/Flashcard.jsx';
import { vocabulary, themes } from '../lib/content.js';
import { buildQueue, formatInterval, GRADE } from '../lib/srs.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

function Cards() {
  const { state, reviewCard, loading } = useProgress();
  const { settings } = useSettings();

  const [theme, setTheme] = useState('all');
  const [direction, setDirection] = useState('fr-en');
  const [done, setDone] = useState(0);
  // Bumping this rebuilds the queue on demand — see the comment on `queue`.
  const [round, setRound] = useState(0);

  const pool = useMemo(
    () => (theme === 'all' ? vocabulary : vocabulary.filter((v) => v.theme === theme)),
    [theme],
  );

  // The queue is frozen for the session on purpose. If it recomputed on every
  // grade, the card you just answered would vanish mid-animation and the list
  // would reshuffle under your hands. `round` is the deliberate escape hatch.
  const queue = useMemo(
    () =>
      buildQueue(
        pool.map((v) => v.id),
        state.cards,
        { newPerDay: settings.newPerDay, maxSession: settings.sessionSize },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, round, settings.newPerDay, settings.sessionSize, loading],
  );

  const currentId = queue[done];
  const card = vocabulary.find((v) => v.id === currentId);
  const srsCard = currentId ? state.cards[currentId] : null;

  function handleGrade(g) {
    reviewCard(currentId, g);
    // AGAIN means "show me again soon" — push it to the end of this session
    // rather than dropping it, so a forgotten word gets a second chance today.
    setDone((d) => d + 1);
    if (g === GRADE.AGAIN) queue.push(currentId);
  }

  function restart() {
    setDone(0);
    setRound((r) => r + 1);
  }

  if (loading) return <p className="text-muted-2">Loading your progress…</p>;

  if (!card) {
    return (
      <div className="stack" style={{ maxWidth: 520 }}>
        <h2>Session complete</h2>
        <p className="en">
          {done > 0
            ? `You reviewed ${done} card${done === 1 ? '' : 's'}. Come back when they're due.`
            : 'Nothing is due right now — pick another theme or start a new round.'}
        </p>
        <button className="btn btn-primary" onClick={restart}>
          New session
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="d-flex flex-wrap gap-3 align-items-end justify-content-between">
        <div>
          <h2 className="mb-1">Flashcards</h2>
          <p className="eyebrow mb-0">
            {done + 1} of {queue.length}
            {srsCard ? ` · seen ${srsCard.reviews}× · box ${srsCard.box}` : ' · new card'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              restart();
            }}
          >
            <option value="all">All themes ({vocabulary.length})</option>
            {themes.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.count})
              </option>
            ))}
          </select>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setDirection((d) => (d === 'fr-en' ? 'en-fr' : 'fr-en'))}
            title="Swap which side you see first"
          >
            {direction === 'fr-en' ? 'FR → EN' : 'EN → FR'}
          </button>
        </div>
      </div>

      <div className="meter">
        <span style={{ width: `${(done / Math.max(queue.length, 1)) * 100}%` }} />
      </div>

      <Flashcard
        key={currentId}
        card={card}
        direction={direction}
        box={srsCard?.box}
        showEnglish={settings.showEnglish}
        onGrade={handleGrade}
      />

      {srsCard && (
        <p className="text-center small text-muted-2 mb-0">
          Currently scheduled {formatInterval(srsCard.interval)}
        </p>
      )}
    </div>
  );
}

export default Cards;
