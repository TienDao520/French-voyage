/**
 * srs.js — French Voyage's spaced-repetition scheduler.
 *
 * A modified SM-2. Each card carries an ease factor, a repetition count, an
 * interval in days and a Leitner box number used only for display. Grading a
 * card returns a brand-new card object; nothing is mutated, which keeps React
 * state updates predictable and the whole thing trivial to unit-test.
 *
 * Grades follow the four-button convention of every paper flashcard system
 * this project descends from:
 *
 *   0  again    — got it wrong, show it again this session
 *   1  hard     — right, but it hurt
 *   2  good     — right
 *   3  easy     — instant recall
 */

export const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export const GRADE_LABELS = [
  { grade: 0, label: 'Again', hint: 'Show this one again shortly', key: '1' },
  { grade: 1, label: 'Hard', hint: 'Correct, but slow', key: '2' },
  { grade: 2, label: 'Good', hint: 'Correct', key: '3' },
  { grade: 3, label: 'Easy', hint: 'Instant', key: '4' },
];

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DAY = 86_400_000;
export const BOX_COUNT = 5;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** A card that has never been seen. Due immediately — new material waits for nobody. */
export function newCard(id) {
  return {
    id,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    box: 1,
    due: Date.now(),
    lapses: 0,
    reviews: 0,
    lastGrade: null,
    lastReviewed: null,
  };
}

/**
 * Apply a grade and return the updated card.
 *
 * The schedule is deliberately shallow at the start — 1 day, then 6, then
 * multiplied by the ease factor. A wrong answer resets the interval but only
 * nudges the ease down, so one bad day does not destroy a mature card.
 *
 * `now` is a parameter, not a Date.now() call inside, so tests can pin time.
 */
export function grade(card, g, now = Date.now()) {
  // Spread first: every field below is written on the COPY, never the original.
  const next = { ...card, reviews: card.reviews + 1, lastGrade: g, lastReviewed: now };

  if (g === GRADE.AGAIN) {
    next.repetitions = 0;
    next.lapses = card.lapses + 1;
    next.interval = 0;
    next.box = 1;
    next.ease = clamp(card.ease - 0.2, MIN_EASE, MAX_EASE);
    next.due = now + 60_000; // back in about a minute, inside this session
    return next;
  }

  const easeDelta = { [GRADE.HARD]: -0.15, [GRADE.GOOD]: 0, [GRADE.EASY]: 0.15 }[g];
  next.ease = clamp(card.ease + easeDelta, MIN_EASE, MAX_EASE);
  next.repetitions = card.repetitions + 1;

  if (next.repetitions === 1) {
    next.interval = g === GRADE.EASY ? 3 : 1;
  } else if (next.repetitions === 2) {
    next.interval = g === GRADE.HARD ? 4 : 6;
  } else {
    const factor = g === GRADE.HARD ? 1.2 : next.ease;
    next.interval = Math.round(card.interval * factor * (g === GRADE.EASY ? 1.3 : 1));
  }

  next.interval = Math.max(1, next.interval);
  next.box = clamp(
    Math.min(BOX_COUNT, next.repetitions + (g === GRADE.EASY ? 1 : 0)),
    1,
    BOX_COUNT,
  );
  next.due = now + next.interval * DAY;
  return next;
}

/** Cards whose due date has passed, hardest (lowest box) first. */
export function dueCards(cards, now = Date.now()) {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due);
}

/**
 * Build a study queue: everything overdue, then new cards up to the daily cap.
 * Returns ids, so the caller decides what a "card" actually contains.
 */
export function buildQueue(
  allIds,
  cards,
  { newPerDay = 15, maxSession = 40, now = Date.now() } = {},
) {
  const due = dueCards(cards, now).map((c) => c.id);
  const unseen = allIds.filter((id) => !cards[id]).slice(0, newPerDay);
  return [...due, ...unseen].slice(0, maxSession);
}

/** Headline numbers for the dashboard (step 15). */
export function summarise(cards, now = Date.now()) {
  const list = Object.values(cards);
  const boxes = Array.from({ length: BOX_COUNT }, () => 0);
  let due = 0;
  let mature = 0;
  for (const c of list) {
    boxes[clamp(c.box, 1, BOX_COUNT) - 1] += 1;
    if (c.due <= now) due += 1;
    if (c.interval >= 21) mature += 1; // 3 weeks — the usual "known" threshold
  }
  return {
    seen: list.length,
    due,
    mature,
    boxes,
    accuracy: accuracyOf(list),
  };
}

function accuracyOf(list) {
  const reviews = list.reduce((s, c) => s + c.reviews, 0);
  if (!reviews) return null; // null, not 0: "no data" is not "0% correct"
  const lapses = list.reduce((s, c) => s + c.lapses, 0);
  return Math.round(((reviews - lapses) / reviews) * 100);
}

/** Human-readable "next review in…" for the UI. */
export function formatInterval(days) {
  if (days < 1) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 30) return `in ${days} days`;
  if (days < 365) return `in ${Math.round(days / 30)} months`;
  return `in ${(days / 365).toFixed(1)} years`;
}

/** Consecutive days ending today on which at least one review happened. */
export function streakFrom(history) {
  const days = new Set(Object.keys(history || {}));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Yesterday still counts if today has not been studied yet — no punishing
  // someone at 9am for not having studied yet.
  if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(isoDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Local calendar day as YYYY-MM-DD — the key shape used by history. */
export function isoDay(d = new Date()) {
  const date = new Date(d);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
