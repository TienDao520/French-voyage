/**
 * Bits.jsx — the small presentational pieces that show up on more than one page.
 *
 * These are not "components" in any grand sense; they are named CSS. The point
 * is that `<LevelBadge level="A1" />` says what it means, while
 * `<span className="badge-level a1">A1</span>` says how it looks. When the
 * design changes, exactly one file changes.
 *
 * This file grows through the remaining steps — the progress dashboard adds
 * Meter and Stat in step 15.
 */

import { GROUPS } from '../lib/conjugate.js';

/** A1 / A2 — the CEFR level a piece of content belongs to. */
export function LevelBadge({ level }) {
  if (!level) return null;
  return <span className={`badge-level ${level.toLowerCase()}`}>{level}</span>;
}

/** The coloured dot + label for a verb group. Falls back to "irregular",
 *  which is the honest default for a verb that follows no pattern. */
export function GroupChip({ group, short = false }) {
  const g = GROUPS[group] || GROUPS.irregular;
  return <span className={`group-chip ${g.tone}`}>{short ? g.short : g.label}</span>;
}

/** An empty state that says what to do next, not just that nothing is here. */
export function Empty({ title, children }) {
  return (
    <div className="panel p-4 text-center">
      <h3 className="h5 mb-2">{title}</h3>
      <p className="text-muted-2 mb-0">{children}</p>
    </div>
  );
}
