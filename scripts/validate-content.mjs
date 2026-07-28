#!/usr/bin/env node
/**
 * validate-content.mjs — schema and consistency checks for /content.
 * Run with `npm run validate`. Exits 1 on error so CI can block a bad build.
 */
// Forces Node to treat the file as an ES module regardless of any package.json setting built-in Node modules.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

//Builds an absolute path.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, 'content', p), 'utf8')); //Helper function

//Error storage
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// --- Grammar -----------------------------------------------------------------
const grammar = [...read('grammar/a1.json'), ...read('grammar/a2.json')];
const grammarIds = new Set(); //Tracking duplicate IDs

for (const lesson of grammar) {
  const where = `grammar ${lesson.id ?? '(missing id)'}`;
  //loops over required property names
  for (const field of ['id', 'level', 'order', 'category', 'title', 'titleEn', 'summary']) {
    if (!lesson[field]) fail(`${where}: missing "${field}"`);
  }
  if (grammarIds.has(lesson.id)) fail(`${where}: duplicate id`); //Duplicate ID detection
  grammarIds.add(lesson.id);
  if (!['A1', 'A2'].includes(lesson.level)) fail(`${where}: level must be A1 or A2`); //Only these values are allowed
  if (!Array.isArray(lesson.blocks) || !lesson.blocks.length) fail(`${where}: no content blocks`);

  //A warning is generated if there are fewer than three practice questions.
  if (!Array.isArray(lesson.practice) || lesson.practice.length < 3)
    warn(`${where}: fewer than 3 practice questions`);

  for (const block of lesson.blocks ?? []) {
    if (!['prose', 'table', 'examples', 'pitfall', 'tip'].includes(block.type)) {
      fail(`${where}: unknown block type "${block.type}"`);
    }

    //Table validation
    if (block.type === 'table') {
      if (!block.head?.length) fail(`${where}: table with no header`);
      for (const row of block.rows ?? []) {
        if (row.length !== block.head.length) {
          fail(`${where}: table row has ${row.length} cells, header has ${block.head.length}`);
        }
      }
    }
  }

  //Practice question validation - entries() returns both the index and the value,
  for (const [i, q] of (lesson.practice ?? []).entries()) {
    const qw = `${where} practice[${i}]`;
    //Only two types are allowed
    if (!['mcq', 'fill'].includes(q.type)) fail(`${qw}: unknown type "${q.type}"`);
    if (!q.q) fail(`${qw}: no question text`);
    if (!q.why) warn(`${qw}: no explanation`);
    if (q.type === 'mcq') {
      //MCQ validation
      if (!Array.isArray(q.options) || q.options.length < 2)
        fail(`${qw}: needs at least 2 options`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) {
        fail(`${qw}: answer index ${q.answer} is out of range`);
      }
    }
    if (q.type === 'fill' && !q.answer) fail(`${qw}: no answer`);
  }
}

// --- Vocabulary --------------------------------------------------------------
const POS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'num', 'prep', 'conj', 'pron'];
const vocabFiles = ['core', 'daily', 'food', 'world', 'social', 'abstract'];
const vocabulary = vocabFiles.flatMap((f) => read(`vocabulary/${f}.json`));
const vocabIds = new Set();
const seenFrench = new Map();

for (const word of vocabulary) {
  const where = `vocab ${word.id ?? '(missing id)'}`;
  for (const field of ['id', 'fr', 'en', 'pos', 'level', 'theme']) {
    if (!word[field]) fail(`${where}: missing "${field}"`);
  }
  if (vocabIds.has(word.id)) fail(`${where}: duplicate id`);
  vocabIds.add(word.id);
  if (!['A1', 'A2'].includes(word.level)) fail(`${where}: level must be A1 or A2`);
  if (!POS.includes(word.pos)) fail(`${where}: unknown pos "${word.pos}"`);
  if (word.pos === 'noun' && !word.gender) warn(`${where}: noun with no gender`);
  if (word.gender && !['m', 'f', 'mf'].includes(word.gender))
    fail(`${where}: gender must be m, f or mf`);
  if (!word.examples?.length) fail(`${where}: no example sentence`);
  for (const ex of word.examples ?? []) {
    if (!ex.fr || !ex.en) fail(`${where}: incomplete example`);
  }
  if (seenFrench.has(word.fr))
    warn(`${where}: "${word.fr}" also appears as ${seenFrench.get(word.fr)}`);
  else seenFrench.set(word.fr, word.id);
}

// --- Verbs -------------------------------------------------------------------
const verbs = read('verbs/verbs.json');
const verbIds = new Set(); //Track duplicate IDs

// Loop over every verb
for (const verb of verbs) {
  const where = `verb ${verb.id ?? '(missing id)'}`;
  for (const field of [
    'id',
    'infinitive',
    'en',
    'group',
    'aux',
    'participle',
    'futurStem',
    'level',
  ]) {
    if (!verb[field]) fail(`${where}: missing "${field}"`);
  }
  if (verbIds.has(verb.id)) fail(`${where}: duplicate id`);
  verbIds.add(verb.id);
  if (!['er', 'ir', 're', 'irregular'].includes(verb.group))
    fail(`${where}: unknown group "${verb.group}"`);
  if (!['avoir', 'être'].includes(verb.aux))
    fail(`${where}: aux must be avoir or être, found "${verb.aux}"`);
  //present.length !== 6 encodes a fact about French: there are exactly six persons. futurStem must end in r encodes another: the French future is built on an infinitive-like stem, so ser-, aur-, ir-, finir- all end in r.
  if (!Array.isArray(verb.present) || verb.present.length !== 6) {
    fail(`${where}: present must have exactly 6 forms, found ${verb.present?.length}`);
  }
  if (!verb.futurStem?.endsWith('r'))
    warn(`${where}: future stem "${verb.futurStem}" does not end in r`);
}

// --- Reading and speaking ----------------------------------------------------
for (const dialogue of read('reading/dialogues.json')) {
  const where = `dialogue ${dialogue.id}`;
  if (!dialogue.lines?.length) fail(`${where}: no lines`);
  for (const [i, line] of (dialogue.lines ?? []).entries()) {
    if (!line.fr || !line.en) fail(`${where} line[${i}]: missing fr or en`);
  }
}

for (const passage of read('reading/passages.json')) {
  const where = `passage ${passage.id}`;
  if (!passage.text || !passage.translation) fail(`${where}: missing text or translation`);
  if (!passage.questions?.length) fail(`${where}: no comprehension questions`);
  for (const [i, q] of (passage.questions ?? []).entries()) {
    if (q.answer < 0 || q.answer >= q.options.length)
      fail(`${where} question[${i}]: answer out of range`);
  }
}

const tcf = read('speaking/tcf.json');
if (!tcf.task1?.structure?.length) fail('tcf: task 1 has no structure');
if (!tcf.task2?.prompts?.length) fail('tcf: task 2 has no prompts');

// --- README consistency ------------------------------------------------------
// A README that overstates the content is worse than no README. These counts are
// parsed straight out of the coverage table so the two can never drift apart.
const actual = {
  'Grammar lessons': grammar.length,
  'Vocabulary cards': vocabulary.length,
  'Verbs conjugated': verbs.length,
  'Practice questions': grammar.reduce((s, l) => s + (l.practice?.length ?? 0), 0),
  'Annotated dialogues': read('reading/dialogues.json').length,
  'Reading passages': read('reading/passages.json').length,
  'TCF speaking prompts': tcf.task2.prompts.length,
  'Object-pronoun quiz bank': read('quizzes/pronouns.json').items.length,
};

const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
for (const [label, count] of Object.entries(actual)) {
  const row = readme.match(new RegExp(`^\\|\\s*${label}\\s*\\|.*$`, 'm'));
  if (!row) {
    warn(`README: no coverage row for "${label}"`);
    continue;
  }
  const claimed = row[0].match(/\*\*([\d,]+)\*\*/);
  if (!claimed) {
    warn(`README: could not read the total for "${label}"`);
    continue;
  }
  const stated = Number(claimed[1].replace(/,/g, ''));
  if (stated !== count) {
    fail(`README claims ${stated} for "${label}" but the content has ${count}`);
  }
}

// --- Report ------------------------------------------------------------------
const bar = '─'.repeat(56);
console.log(bar);
console.log('French Voyage content validation');
console.log(bar);
console.log(`  grammar lessons   ${grammar.length}`);
console.log(`  practice items    ${grammar.reduce((s, l) => s + (l.practice?.length ?? 0), 0)}`);
console.log(`  vocabulary cards  ${vocabulary.length}`);
console.log(`  verbs             ${verbs.length}`);
console.log(`  themes            ${new Set(vocabulary.map((v) => v.theme)).size}`);
console.log(bar);

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(bar);
if (errors.length) {
  console.error(`${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`Content is valid. ${warnings.length} warning(s).`);
