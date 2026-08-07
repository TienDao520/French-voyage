import { useEffect, useState } from 'react';
import { GRADE_LABELS } from '../lib/srs.js';

// The stamp carries the part of speech, so it's information rather than
// decoration — the postcard equivalent of chouette's playing-card suits.
const STAMPS = {
  noun: { mark: 'NOM', tone: 'black' },
  verb: { mark: 'VB', tone: 'red' },
  adj: { mark: 'ADJ', tone: 'red' },
  adv: { mark: 'ADV', tone: 'black' },
  phrase: { mark: '✦', tone: 'black' },
  num: { mark: '№', tone: 'black' },
  prep: { mark: '→', tone: 'red' },
  conj: { mark: '&', tone: 'black' },
  pron: { mark: 'PRO', tone: 'red' },
};

const GENDERS = { m: 'masculine', f: 'feminine', mf: 'masc. or fem.' };

function stampFor(pos) {
  return STAMPS[pos] || STAMPS.phrase;
}

/**
 * The signature component: a vocabulary item drawn as a postcard. The front
 * carries the word and a stamp box; the back wears the par-avion border and
 * carries the translation, like a message written home.
 */
export default function Flashcard({ card, direction = 'fr-en', onGrade, box, showEnglish = true }) {
  const [flipped, setFlipped] = useState(false);
  const stamp = stampFor(card.pos);
  const front = direction === 'fr-en' ? card.fr : card.en;
  const back = direction === 'fr-en' ? card.en : card.fr;

  // A new card (or a direction switch) must always arrive face-down.
  useEffect(() => setFlipped(false), [card.id, direction]);

  // Keyboard: Space flips; 1–4 grade, but only once the answer is visible —
  // grading a card you haven't seen would be self-deception.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Space would otherwise scroll the page
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) return;
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (idx >= 0) onGrade(idx);
    };
    window.addEventListener('keydown', onKey);
    // Cleanup matters: without it, every card mounted would stack another
    // listener and one keypress would grade several cards.
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onGrade]);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className={`flip-scene ${flipped ? 'is-flipped' : ''}`} style={{ aspectRatio: '7 / 5' }}>
        <div className="flip-inner">
          {/* FRONT — a blank postcard: stamp, corner mark, the word */}
          <button
            type="button"
            className={`flip-face deck-card suit-${stamp.tone} w-100 h-100 border-0 p-4`}
            onClick={() => setFlipped(true)}
            aria-label="Show the answer"
          >
            <span className="pip pip-tl">{box ?? card.level}</span>
            <span className="stamp">{stamp.mark}</span>
            <p className="eyebrow mb-2">{card.theme}</p>
            <h2 className="fr mb-1" lang={direction === 'fr-en' ? 'fr' : 'en'}>
              {front}
            </h2>
            {direction === 'fr-en' && card.gender && (
              <p className="small text-muted-2 mb-0">{GENDERS[card.gender]}</p>
            )}
            <p className="small text-muted-2 mt-auto mb-0">
              <span className="kbd">Space</span> to flip
            </p>
          </button>

          {/* BACK — the airmail side, where the message is written */}
          <div className="flip-face flip-face-back">
            <div className="card-back w-100 h-100 flex-column text-center p-4">
              <h2 className="mb-2" style={{ fontSize: '1.3rem' }}>
                {back}
              </h2>
              {showEnglish && card.examples?.[0] && (
                <>
                  <p className="fr mb-1" lang="fr" style={{ fontSize: '0.95rem' }}>
                    {card.examples[0].fr}
                  </p>
                  <p className="en mb-0" style={{ fontSize: '0.85rem' }}>
                    {card.examples[0].en}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {flipped ? (
          <div className="d-flex gap-2">
            {GRADE_LABELS.map((g) => (
              <button
                key={g.grade}
                className={`btn btn-sm flex-fill ${
                  g.grade === 0
                    ? 'btn-outline-danger'
                    : g.grade === 3
                      ? 'btn-outline-success'
                      : 'btn-outline-secondary'
                }`}
                onClick={() => onGrade(g.grade)}
                title={g.hint}
              >
                {g.label}
                <span className="kbd ms-1 d-none d-sm-inline">{g.key}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-primary w-100" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}
