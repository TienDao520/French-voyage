#!/usr/bin/env node
/**
 * check-conjugation.mjs — run the conjugation engine over every verb and
 * report anything that comes out wrong. `npm run check:verbs`.
 *
 * Why this exists as well as validate-content.mjs
 * -----------------------------------------------
 * validate-content.mjs checks the *shape* of the data: required fields, unique
 * ids, six present forms. It cannot tell you that a verb produces "je sommesais"
 * in the imparfait, because that string is not in the JSON — the engine invents
 * it. Only running the engine finds that class of bug.
 *
 * The trick that makes this possible is that lib/conjugate.js imports nothing.
 * No React, no DOM, no bundler. So plain Node can import the exact same module
 * the browser runs — not a copy, not a port. If this script passes, the app is
 * running verified code.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PERSONS,
  TENSES,
  bareForm,
  conjugateAll,
  displayName,
  imperatif,
} from '../client/src/lib/conjugate.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const verbs = JSON.parse(readFileSync(resolve(root, 'content/verbs/verbs.json'), 'utf8'));

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// A form that made it out of the engine intact should never contain these.
// "undefined" appears when an array is short; " '" means an elision was built
// from an empty string; a double space means a stem or ending was blank.
const JUNK = [
  [/undefined|NaN/, 'contains undefined or NaN'],
  [/\s'/, 'has a space before an apostrophe'],
  [/ {2}/, 'has a double space'],
  [/^\s|\s$/, 'has leading or trailing whitespace'],
];

let generated = 0;
let stored = 0;

for (const verb of verbs) {
  const name = displayName(verb);
  const table = conjugateAll(verb);

  // Precondition, not output. The imparfait rule is "strip -ons from the
  // nous-form"; if the nous-form has no -ons to strip, the rule silently
  // returns the whole word and every imparfait form is quietly wrong —
  // "je sommesais" passes every output check below, because it is a
  // perfectly well-formed string. It is just not French. So test the
  // assumption the rule rests on, which is the only place the bug is visible.
  if (!verb.imparfaitStem) {
    const nous = verb.present[3];
    if (!nous) {
      fail(`${name}: no nous-form and no imparfaitStem — the imparfait cannot be derived`);
    } else if (!nous.endsWith('ons')) {
      fail(`${name}: nous-form "${nous}" does not end in -ons, so it needs an imparfaitStem`);
    }
  }

  stored +=
    verb.present.filter(Boolean).length +
    [verb.futurStem, verb.participle, verb.aux, verb.imparfaitStem].filter(Boolean).length +
    (verb.imperatif?.filter(Boolean).length ?? 0);

  for (const tense of TENSES) {
    const row = table[tense.key];

    if (!Array.isArray(row) || row.length !== PERSONS.length) {
      fail(`${name} / ${tense.label}: expected ${PERSONS.length} slots, got ${row?.length}`);
      continue;
    }

    row.forEach((form, i) => {
      const where = `${name} / ${tense.label} / ${PERSONS[i]}`;

      // An impersonal verb SHOULD be blank everywhere but the third person.
      // Anywhere else, a blank is a hole in the table.
      const shouldBeMissing = Boolean(verb.impersonal) && i !== 2;
      if (!form) {
        if (!shouldBeMissing) fail(`${where}: no form produced`);
        return;
      }
      if (shouldBeMissing) {
        fail(`${where}: impersonal verb produced "${form}"`);
        return;
      }

      generated += 1;
      for (const [pattern, why] of JUNK) {
        if (pattern.test(form)) fail(`${where}: "${form}" ${why}`);
      }

      // Stripping the subject must leave something behind. If it does not, the
      // drill in step 13 would present an empty answer box.
      if (!bareForm(form)) fail(`${where}: "${form}" reduces to nothing`);

      // Elision sanity: "je" before a vowel should have become "j'".
      if (/^je [aeiouâàéèêëîïôöûùüy]/i.test(form) && !verb.aspirateH) {
        warn(`${where}: "${form}" — je did not elide before a vowel`);
      }
    });
  }

  const imp = imperatif(verb);
  if (imp) {
    generated += imp.length;
    if (verb.impersonal) fail(`${name}: impersonal verbs have no imperative`);
    for (const row of imp) {
      if (!row.form?.trim()) fail(`${name} / impératif / ${row.person}: blank`);
    }
  } else if (!verb.impersonal) {
    warn(`${name}: no imperative stored`);
  }
}

// --- Report ------------------------------------------------------------------
const bar = '─'.repeat(56);
console.log(bar);
console.log('French Voyage conjugation check');
console.log(bar);
console.log(`  verbs             ${verbs.length}`);
console.log(`  strings stored    ${stored}`);
console.log(`  forms generated   ${generated}`);
console.log(
  `  never typed       ${generated - stored}  (${Math.round((1 - stored / generated) * 100)}% of the table)`,
);
console.log(bar);

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(bar);
if (errors.length) {
  console.error(`${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`Every verb conjugates cleanly. ${warnings.length} warning(s).`);
