/**
 * content.js — the single entry point to everything in /content.
 *
 * Vite resolves `@content` to the repository's content directory (see
 * vite.config.js), so the JSON stays framework-agnostic: the same files feed
 * the React app, the validation script and — from step 17 — the SQLite seeder.
 *
 * These are static imports, so Vite bundles and tree-shakes them at build
 * time. No fetch, no loading state, no network: the content IS the app.
 */

import a1 from '@content/grammar/a1.json';
import a2 from '@content/grammar/a2.json';
import vocCore from '@content/vocabulary/core.json';
import vocDaily from '@content/vocabulary/daily.json';
import vocFood from '@content/vocabulary/food.json';
import vocWorld from '@content/vocabulary/world.json';
import vocSocial from '@content/vocabulary/social.json';
import vocAbstract from '@content/vocabulary/abstract.json';
import verbsData from '@content/verbs/verbs.json';
import dialoguesData from '@content/reading/dialogues.json';
import passagesData from '@content/reading/passages.json';
import tcfData from '@content/speaking/tcf.json';
import pronounQuiz from '@content/quizzes/pronouns.json';

export const grammar = [...a1, ...a2];

export const vocabulary = [
  ...vocCore,
  ...vocDaily,
  ...vocFood,
  ...vocWorld,
  ...vocSocial,
  ...vocAbstract,
];

export const verbs = verbsData;
export const dialogues = dialoguesData;
export const passages = passagesData;
export const tcf = tcfData;
export const quizzes = { pronouns: pronounQuiz };

export const grammarCategories = [...new Set(grammar.map((l) => l.category))];

// A Set removes duplicates; spreading it back gives a sorted, unique list.
export const themes = [...new Set(vocabulary.map((v) => v.theme))].sort().map((name) => ({
  name,
  count: vocabulary.filter((v) => v.theme === name).length,
  a1: vocabulary.filter((v) => v.theme === name && v.level === 'A1').length,
}));

/** Live counts — the footer and Home page read these instead of hardcoding. */
export const stats = {
  grammar: grammar.length,
  grammarA1: a1.length,
  grammarA2: a2.length,
  vocabulary: vocabulary.length,
  verbs: verbs.length,
  themes: themes.length,
  practice: grammar.reduce((s, l) => s + l.practice.length, 0),
  dialogues: dialogues.length,
  passages: passages.length,
  speakingPrompts: tcf.task2.prompts.length,
};

export const findLesson = (id) => grammar.find((l) => l.id === id);
export const findVerb = (id) => verbs.find((v) => v.id === id);
export const findWord = (id) => vocabulary.find((v) => v.id === id);
