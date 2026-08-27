import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { findVerb, verbs } from '../lib/content.js';
import { TENSES, conjugateAll, displayName, imperatif } from '../lib/conjugate.js';
import ConjugationTable from '../components/ConjugationTable.jsx';
import { GroupChip, LevelBadge } from '../components/Bits.jsx';

/**
 * Count what verbs.json actually holds for this verb against what the engine
 * hands back. This is the page's quiet argument for its own architecture: the
 * ratio is roughly 1 stored string to 3 generated forms, and every string that
 * is not stored is a typo that cannot happen.
 */
function countForms(verb) {
  const stored =
    verb.present.filter(Boolean).length +
    [verb.futurStem, verb.participle, verb.aux, verb.imparfaitStem].filter(Boolean).length +
    (verb.imperatif?.filter(Boolean).length ?? 0);

  const table = conjugateAll(verb);
  const generated =
    TENSES.reduce((sum, t) => sum + table[t.key].filter(Boolean).length, 0) +
    (imperatif(verb)?.length ?? 0);

  return { stored, generated, derived: generated - stored };
}

function VerbDetail() {
  const { verbId } = useParams();
  const navigate = useNavigate();
  const verb = findVerb(verbId);

  // 'all' | 'A1' — beginners should be able to hide the four A2 tenses and
  // look at just the two that matter first.
  const [scope, setScope] = useState('all');
  const shownTenses = useMemo(
    () => TENSES.filter((t) => scope === 'all' || t.level === scope).map((t) => t.key),
    [scope],
  );

  const index = verbs.findIndex((v) => v.id === verbId);
  const prev = index > 0 ? verbs[index - 1] : null;
  const next = index >= 0 ? verbs[index + 1] : null;

  // Left/right arrows walk the list. The guard matters: without it, moving the
  // caret inside a text box would also change the page.
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && prev) navigate(`/verbs/${prev.id}`);
      if (e.key === 'ArrowRight' && next) navigate(`/verbs/${next.id}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, navigate]);

  // Hooks must run in the same order on every render, so this early return has
  // to come after all of them — never inside a condition above.
  if (!verb) {
    return (
      <div className="panel p-4">
        <h1 className="h4">Verb not found</h1>
        <p className="text-muted-2">
          No verb has the id <code>{verbId}</code>.
        </p>
        <Link to="/verbs">← Back to the verb list</Link>
      </div>
    );
  }

  const { stored, generated, derived } = countForms(verb);

  return (
    <article className="stack">
      <header>
        <Link to="/verbs" className="small">
          ← All verbs
        </Link>
        <div className="d-flex align-items-center gap-3 mt-2 mb-1 flex-wrap">
          <h1 className="fr mb-0" lang="fr">
            {displayName(verb)}
          </h1>
          {/* Step 14 puts a SpeakButton here. */}
          <LevelBadge level={verb.level} />
          <GroupChip group={verb.group} />
        </div>
        <p className="h5 text-muted-2 fw-normal">{verb.en}</p>
        {verb.note && (
          <p className="callout callout-tip mb-0" style={{ maxWidth: '60ch' }}>
            {verb.note}
          </p>
        )}
      </header>

      <section>
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Conjugation</h2>
          <div className="btn-group btn-group-sm" role="group" aria-label="Which tenses to show">
            <button
              type="button"
              className={`btn ${scope === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setScope('all')}
            >
              All 7 tenses
            </button>
            <button
              type="button"
              className={`btn ${scope === 'A1' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setScope('A1')}
            >
              A1 only
            </button>
          </div>
        </div>

        <ConjugationTable verb={verb} tenses={shownTenses} />

        <div className="panel-flat p-3 mt-3">
          <p className="eyebrow mb-2">What is stored, and what is worked out</p>
          <p className="small mb-2">
            verbs.json holds <strong>{stored}</strong> strings for this verb — the six present
            forms, the future stem <strong lang="fr">{verb.futurStem}-</strong>, the participle{' '}
            <strong lang="fr">{verb.participle}</strong>, the auxiliary{' '}
            <strong lang="fr">{verb.aux}</strong>
            {verb.imperatif ? ' and the three imperatives' : ''}. The engine turns those into{' '}
            <strong>{generated}</strong> forms, so <strong>{derived}</strong> of them never had to
            be typed by hand.
          </p>
          <p className="small text-muted-2 mb-0">
            {verb.reflexive && 'Reflexive, so it always takes être. '}
            {verb.impersonal && 'Impersonal: it exists only in the third person singular. '}
            {verb.imparfaitStem &&
              `The imparfait stem is stored (${verb.imparfaitStem}-) because the nous-form gives none. `}
            {!verb.reflexive &&
              !verb.impersonal &&
              !verb.imparfaitStem &&
              'The imparfait stem comes from the nous-form; nothing here is a special case.'}
          </p>
        </div>
      </section>

      {/* Step 13 drops a PracticeRunner drill in here, once lib/text.js can
          compare a typed answer to "j'ai mangé" without punishing accents. */}

      <nav
        className="d-flex justify-content-between gap-3 pt-2"
        aria-label="Previous and next verb"
      >
        {prev ? (
          <Link className="btn btn-outline-secondary" to={`/verbs/${prev.id}`}>
            ← {displayName(prev)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn btn-outline-secondary ms-auto" to={`/verbs/${next.id}`}>
            {displayName(next)} →
          </Link>
        )}
      </nav>
    </article>
  );
}

export default VerbDetail;
