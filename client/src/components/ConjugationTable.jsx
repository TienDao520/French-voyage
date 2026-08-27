import { useMemo } from 'react';
import {
  PERSONS,
  PERSON_LABELS_EN,
  TENSES,
  TENSE_KEYS,
  conjugateAll,
  imperatif,
} from '../lib/conjugate.js';

/**
 * Every tense of one verb, side by side.
 *
 * Two deliberate choices:
 *
 * 1. Monospace cells (.conj-table in theme.scss). The endings line up
 *    vertically, and the vertical pattern IS the lesson — -ais -ais -ait
 *    -ions -iez -aient is far easier to see as a column than as prose.
 *
 * 2. The left column carries the ENGLISH person, not the French pronoun. The
 *    French pronoun is already inside every cell, because elision means it has
 *    to be ("j'ai", not "je ai"). Repeating it would be noise; the English is
 *    the thing a beginner actually needs at a glance.
 */
export default function ConjugationTable({ verb, tenses = TENSE_KEYS }) {
  // conjugateAll walks 7 tenses x 6 persons. Cheap, but it runs on every
  // keystroke of the parent's state if we let it — so memoise on the verb.
  const table = useMemo(() => conjugateAll(verb), [verb]);
  const imp = useMemo(() => imperatif(verb), [verb]);

  const shown = TENSES.filter((t) => tenses.includes(t.key));
  const rows = PERSONS.map((_, i) => i).filter((i) => !verb.impersonal || i === 2);

  return (
    <>
      {/* .table-scroll lets the table overflow sideways on a phone instead of
          squeezing the columns until the forms wrap mid-word. */}
      <div className="table-scroll panel-flat p-2">
        <table className="conj-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Person</span>
              </th>
              {shown.map((t) => (
                <th scope="col" key={t.key}>
                  {t.label}
                  <span className="ms-1 text-muted-2" style={{ fontWeight: 400 }}>
                    {t.level}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={PERSONS[i]}>
                <th scope="row" className="person">
                  {PERSON_LABELS_EN[i]}
                </th>
                {shown.map((t) => (
                  <td key={t.key} lang="fr">
                    {table[t.key][i] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {imp && (
        <div className="mt-3">
          <p className="eyebrow mb-2">Impératif</p>
          <div className="d-flex flex-wrap gap-3">
            {imp.map((row) => (
              <span key={row.person} className="d-inline-flex align-items-baseline gap-2">
                <span className="small text-muted-2">{row.person}</span>
                {/* Step 14 hangs a SpeakButton here. */}
                <strong className="fr" lang="fr">
                  {row.form}
                </strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
