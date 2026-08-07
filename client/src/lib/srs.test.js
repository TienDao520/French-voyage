import { describe, it, expect } from 'vitest';
import { newCard, grade, GRADE, buildQueue, summarise, streakFrom, isoDay } from './srs.js';

const DAY = 86_400_000;

describe('srs scheduler', () => {
  it('starts a new card due immediately', () => {
    const c = newCard('voc-001');
    expect(c.due).toBeLessThanOrEqual(Date.now());
    expect(c.repetitions).toBe(0);
    expect(c.box).toBe(1);
    expect(c.ease).toBe(2.5);
  });

  it('schedules 1 day, then 6 days, then multiplies by ease', () => {
    const now = Date.now();
    let c = grade(newCard('x'), GRADE.GOOD, now);
    expect(c.interval).toBe(1);
    c = grade(c, GRADE.GOOD, now);
    expect(c.interval).toBe(6);
    c = grade(c, GRADE.GOOD, now);
    expect(c.interval).toBe(Math.round(6 * c.ease));
  });

  it('never mutates the card it was given', () => {
    const before = newCard('x');
    const snapshot = JSON.stringify(before);
    grade(before, GRADE.GOOD);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('resets the interval but only nudges ease on a lapse', () => {
    const now = Date.now();
    let c = grade(grade(grade(newCard('x'), GRADE.GOOD, now), GRADE.GOOD, now), GRADE.GOOD, now);
    const easeBefore = c.ease;
    c = grade(c, GRADE.AGAIN, now);
    expect(c.interval).toBe(0);
    expect(c.repetitions).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.ease).toBeCloseTo(easeBefore - 0.2, 5);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('never lets ease fall below the floor', () => {
    let c = newCard('x');
    for (let i = 0; i < 20; i += 1) c = grade(c, GRADE.AGAIN);
    expect(c.ease).toBe(1.3);
  });

  it('puts overdue cards before new ones in the queue', () => {
    const now = Date.now();
    const cards = { seen: { ...newCard('seen'), due: now - DAY, box: 2 } };
    const queue = buildQueue(['seen', 'fresh-1', 'fresh-2'], cards, { newPerDay: 5, now });
    expect(queue[0]).toBe('seen');
    expect(queue).toHaveLength(3);
  });

  it('caps the number of new cards per day', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `w${i}`);
    expect(buildQueue(ids, {}, { newPerDay: 10, maxSession: 40 })).toHaveLength(10);
  });

  it('summarises boxes, due count and accuracy', () => {
    const now = Date.now();
    const cards = {
      a: { ...newCard('a'), box: 1, due: now - 1, reviews: 4, lapses: 1 },
      b: { ...newCard('b'), box: 5, due: now + DAY, interval: 40, reviews: 6, lapses: 0 },
    };
    const s = summarise(cards, now);
    expect(s.seen).toBe(2);
    expect(s.due).toBe(1);
    expect(s.mature).toBe(1);
    expect(s.boxes[0]).toBe(1);
    expect(s.accuracy).toBe(90);
  });

  it('counts a streak of consecutive days ending today', () => {
    const today = isoDay();
    const yesterday = isoDay(new Date(Date.now() - DAY));
    expect(streakFrom({ [today]: 3, [yesterday]: 1 })).toBe(2);
    expect(streakFrom({})).toBe(0);
  });
});
