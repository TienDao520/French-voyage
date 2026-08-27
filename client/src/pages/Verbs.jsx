import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { verbs } from '../lib/content.js';
import { GROUPS, conjugateOne, displayName } from '../lib/conjugate.js';
import { GroupChip, LevelBadge, Empty } from '../components/Bits.jsx';

/**
 * Accent-blind comparison, so typing "etudier" finds "étudier".
 *
 * NFD splits an accented character into its base letter plus a combining mark
 * ("é" becomes "e" + U+0301); the range \u0300-\u036f is exactly those marks,
 * so stripping it leaves plain ASCII letters.
 *
 * TODO(step 13): this is the first sighting of `fold`. Step 13 builds it
 * properly in lib/text.js — tested, and tolerant of elision and spacing too —
 * and this local copy gets deleted in favour of that import.
 */
function fold(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function Verbs() {
  const [group, setGroup] = useState('all');
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');

  // Counted once, from the whole list — the numbers on the filter buttons must
  // not change as you filter, or they stop meaning "how many exist".
  const counts = useMemo(() => {
    const map = {};
    for (const v of verbs) map[v.group] = (map[v.group] || 0) + 1;
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = fold(query);
    return verbs.filter(
      (v) =>
        (group === 'all' || v.group === group) &&
        (level === 'all' || v.level === level) &&
        (!q || fold(displayName(v)).includes(q) || fold(v.en).includes(q)),
    );
  }, [group, level, query]);

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">{verbs.length} verbs · 7 tenses · generated, not stored</p>
        <h1 className="mb-2">Verbs</h1>
        <p className="text-muted-2" style={{ maxWidth: '64ch' }}>
          French Voyage stores only what cannot be worked out: the present tense, the future stem,
          the past participle and the auxiliary. Everything else is computed on the fly — the
          imparfait from the nous-form, the conditional from the future stem, the compound tenses
          from the participle. Fewer stored strings means fewer typos, and a typo in a conjugation
          table is a mistake you would go on to memorise.
        </p>
      </header>

      <div className="d-flex flex-wrap gap-2 align-items-center">
        <div className="btn-group flex-wrap" role="group" aria-label="Filter by verb group">
          <button
            type="button"
            className={`btn btn-sm ${group === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setGroup('all')}
          >
            All ({verbs.length})
          </button>
          {Object.entries(GROUPS).map(([key, g]) => (
            <button
              type="button"
              key={key}
              className={`btn btn-sm ${group === key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setGroup(key)}
            >
              {g.label} ({counts[key] || 0})
            </button>
          ))}
        </div>

        <div className="btn-group flex-wrap" role="group" aria-label="Filter by level">
          {['all', 'A1', 'A2'].map((l) => (
            <button
              type="button"
              key={l}
              className={`btn btn-sm ${level === l ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setLevel(l)}
            >
              {l === 'all' ? 'Both levels' : l}
            </button>
          ))}
        </div>

        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search verbs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search verbs by French or English"
        />
      </div>

      {/* aria-live tells a screen reader to announce the new count after a
          keystroke, because the change happens far from the input. */}
      <p className="small text-muted-2 mb-0" aria-live="polite">
        Showing {filtered.length} of {verbs.length}
      </p>

      {filtered.length === 0 ? (
        <Empty title="No verbs match">Try a shorter search, or clear the group filter.</Empty>
      ) : (
        <div className="row g-3">
          {filtered.map((verb) => (
            <div className="col-md-6 col-xl-4" key={verb.id}>
              <Link
                to={`/verbs/${verb.id}`}
                className="panel p-3 h-100 d-block text-decoration-none text-reset"
              >
                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                  {/* displayName, not infinitive: reflexives are stored as
                      "lever" because that is what gets conjugated, but a
                      learner must always read "se lever". */}
                  <h2 className="h6 mb-0 fr" lang="fr">
                    {displayName(verb)}
                  </h2>
                  <LevelBadge level={verb.level} />
                </div>
                <p className="small text-muted-2 mb-2">{verb.en}</p>
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <GroupChip group={verb.group} short />
                  {/* A live sample straight from the engine: proof on the index
                      page that nothing here was hand-typed. */}
                  <code
                    className="small text-muted-2 text-truncate"
                    style={{ fontFamily: 'var(--fv-mono)' }}
                    lang="fr"
                  >
                    {conjugateOne(verb, 'passeCompose', verb.impersonal ? 2 : 0)}
                  </code>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Verbs;
