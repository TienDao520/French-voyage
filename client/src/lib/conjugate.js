/**
 * conjugate.js — French Voyage's conjugation engine.
 *
 * The idea
 * --------
 * The obvious way to ship conjugation tables is to type out every form of every
 * verb. 80 verbs x 7 tenses x 6 persons is 3,360 strings, every one of them a
 * chance to introduce a typo that a learner would then memorise. Worse: a typo
 * in data is invisible. Nothing crashes. It just quietly teaches the wrong word.
 *
 * So `content/verbs/verbs.json` stores only what genuinely cannot be derived —
 * the six present-tense forms, the future stem, the past participle and the
 * auxiliary — roughly 14 strings per verb. This module derives the other ~30
 * from the rules French actually follows:
 *
 *   imparfait        = (nous-form minus -ons) + ais/ais/ait/ions/iez/aient
 *   futur simple     = futurStem + ai/as/a/ons/ez/ont
 *   conditionnel     = futurStem + the imparfait endings
 *   subjonctif       = (ils-form minus -ent) + e/es/e/ions/iez/ent
 *   passé composé    = auxiliary (present)   + participle
 *   plus-que-parfait = auxiliary (imparfait) + participle
 *   futur antérieur  = auxiliary (futur)     + participle
 *
 * Everything else in this file exists to handle the places where French breaks
 * its own rules: être's ét- stem, the -ger/-cer spelling changes, elision,
 * reflexive pronouns, past-participle agreement, and impersonal verbs.
 *
 * The whole module is pure: no React, no DOM, no imports. That is what lets
 * `scripts/check-conjugation.mjs` run the exact same code under plain Node.
 */

/** The six persons, in the order every printed French conjugation chart uses. */
export const PERSONS = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'];

/** English hints for the person column. The reference codebase exports these and
 *  never uses them; the table in this project actually shows them. */
export const PERSON_LABELS_EN = ['I', 'you', 'he/she/one', 'we', 'you (pl.)', 'they'];

const REFLEXIVE_PRONOUNS = ['me', 'te', 'se', 'nous', 'vous', 'se'];

const IMPARFAIT_ENDINGS = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];
const FUTUR_ENDINGS = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];
const SUBJONCTIF_ENDINGS = ['e', 'es', 'e', 'ions', 'iez', 'ent'];

/** The two auxiliaries, hard-coded so the engine never has to look itself up
 *  (avoir's own passé composé needs avoir — that recursion has to stop somewhere). */
const AUX = {
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    imparfait: ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient'],
    futur: ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'],
    conditionnel: ['aurais', 'aurais', 'aurait', 'aurions', 'auriez', 'auraient'],
  },
  être: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'],
    futur: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
    conditionnel: ['serais', 'serais', 'serait', 'serions', 'seriez', 'seraient'],
  },
};

/**
 * Present subjunctive for the verbs that refuse the ils-form rule. Six forms
 * each, because most of them change stem between the singular and nous/vous
 * (que je boive, but que nous buvions).
 */
const SUBJONCTIF_IRREGULAR = {
  être: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
  avoir: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
  aller: ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'],
  faire: ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent'],
  pouvoir: ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent'],
  savoir: ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent'],
  vouloir: ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'],
  falloir: [null, null, 'faille', null, null, null],
  prendre: ['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent'],
  comprendre: ['comprenne', 'comprennes', 'comprenne', 'comprenions', 'compreniez', 'comprennent'],
  apprendre: ['apprenne', 'apprennes', 'apprenne', 'apprenions', 'appreniez', 'apprennent'],
  venir: ['vienne', 'viennes', 'vienne', 'venions', 'veniez', 'viennent'],
  devenir: ['devienne', 'deviennes', 'devienne', 'devenions', 'deveniez', 'deviennent'],
  boire: ['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent'],
  devoir: ['doive', 'doives', 'doive', 'devions', 'deviez', 'doivent'],
  recevoir: ['reçoive', 'reçoives', 'reçoive', 'recevions', 'receviez', 'reçoivent'],
  voir: ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient'],
  croire: ['croie', 'croies', 'croie', 'croyions', 'croyiez', 'croient'],
  mourir: ['meure', 'meures', 'meure', 'mourions', 'mouriez', 'meurent'],
};

/**
 * Elision. French drops the vowel of je/me/te/se/que before another vowel
 * sound: je + ai -> j'ai, se + appelle -> s'appelle.
 *
 * "h" is the trap. A French h is silent, so most h-words elide (j'habite).
 * But a handful are "h aspiré" — historically Germanic — and block elision
 * (je hais, not j'hais). There is no rule; it is memorised per word. So the
 * verb carries the exception as data (`aspirateH: true` in verbs.json) and the
 * engine asks the verb rather than guessing. No verb in the current content is
 * aspirate, but the door is open, and the field is now a documented part of the
 * schema instead of a bug waiting for someone to add "haïr".
 */
const ELIDING_LETTERS = 'aeiouâàéèêëîïôöûùüy';

function startsWithVowelSound(word, verb) {
  if (!word) return false;
  const first = word[0].toLowerCase();
  if (first === 'h') return !verb?.aspirateH;
  return ELIDING_LETTERS.includes(first);
}

/** Attach the subject pronoun, eliding "je" to "j'" where French requires it. */
function withSubject(verb, index, form) {
  if (!form) return null;
  const subject = verb.impersonal ? 'il' : PERSONS[index];
  if (subject === 'je' && startsWithVowelSound(form, verb)) return `j'${form}`;
  return `${subject} ${form}`;
}

/** Attach the reflexive pronoun (me/te/se…), eliding before a vowel sound.
 *  nous and vous have no vowel to drop, which the length check encodes. */
function withReflexive(verb, index, form) {
  if (!form) return null;
  const pronoun = REFLEXIVE_PRONOUNS[index];
  if (pronoun.length === 2 && startsWithVowelSound(form, verb)) {
    return `${pronoun[0]}'${form}`;
  }
  return `${pronoun} ${form}`;
}

/**
 * Glue a stem to an ending, applying the two French spelling rules that exist
 * only to protect pronunciation:
 *
 *   -ger  keeps a buffer e so the g stays soft before a/o (mangeais),
 *         and drops it before i, where the i already softens (mangions)
 *   -cer  writes ç before a/o (commençais) and reverts to c before i
 *         (commencions)
 *
 * Both rules fire on the *stem*, which is why they live here and not in each
 * tense function: imparfait, subjonctif and conditionnel all reuse this.
 */
function join(stem, ending) {
  const softVowelFollows = ending.startsWith('i') || ending.startsWith('e');
  if (softVowelFollows && /ge$/.test(stem)) return stem.slice(0, -1) + ending;
  if (softVowelFollows && /ç$/.test(stem)) return `${stem.slice(0, -1)}c${ending}`;
  return stem + ending;
}

/** Derive the imparfait stem from the nous-form, unless the verb overrides it.
 *  être is the only verb in French where this rule fails outright: nous sommes
 *  gives no stem at all, so verbs.json carries imparfaitStem: "ét". */
export function imparfaitStem(verb) {
  if (verb.imparfaitStem) return verb.imparfaitStem;
  const nous = verb.present[3];
  if (!nous) return null;
  return nous.replace(/ons$/, '');
}

/**
 * Past participle with the agreement letters French writes when the auxiliary
 * is être. Shown in brackets exactly as printed charts do — parti(e),
 * parti(e)s, parti(e)(s) — because the ending depends on the speaker's gender
 * and number, which the app cannot know.
 */
function participleFor(verb, index) {
  const p = verb.participle;
  if (verb.aux !== 'être') return p;
  switch (index) {
    case 0:
    case 1:
    case 2:
      return `${p}(e)`; // one person: (e) if feminine
    case 3:
    case 5:
      return `${p}(e)s`; // several people: always s, (e) if all feminine
    case 4:
      return `${p}(e)(s)`; // vous is ambiguous: one polite person, or many
    default:
      return p;
  }
}

/** Build a compound tense: auxiliary in `auxTense`, then the past participle. */
function compound(verb, auxTense) {
  const aux = AUX[verb.aux][auxTense];
  return PERSONS.map((_, i) => {
    if (verb.impersonal && i !== 2) return null;
    let form = `${aux[i]} ${participleFor(verb, i)}`;
    // Order matters: the reflexive pronoun goes before the auxiliary
    // (je me suis levé), so it wraps the whole auxiliary + participle.
    if (verb.reflexive) form = withReflexive(verb, i, form);
    return withSubject(verb, i, form);
  });
}

/** Build a simple tense from one stem plus a set of endings. */
function simple(verb, stem, endings) {
  if (!stem) return PERSONS.map(() => null);
  return PERSONS.map((_, i) => {
    if (verb.impersonal && i !== 2) return null;
    let form = join(stem, endings[i]);
    if (verb.reflexive) form = withReflexive(verb, i, form);
    return withSubject(verb, i, form);
  });
}

export function present(verb) {
  return PERSONS.map((_, i) => {
    let form = verb.present[i];
    if (!form) return null;
    if (verb.reflexive) form = withReflexive(verb, i, form);
    return withSubject(verb, i, form);
  });
}

export function imparfait(verb) {
  return simple(verb, imparfaitStem(verb), IMPARFAIT_ENDINGS);
}

export function futurSimple(verb) {
  return simple(verb, verb.futurStem, FUTUR_ENDINGS);
}

/** Conditional = the future stem wearing the imparfait's endings. That is the
 *  whole rule, and it is why futurStem earns its place in the JSON. */
export function conditionnelPresent(verb) {
  return simple(verb, verb.futurStem, IMPARFAIT_ENDINGS);
}

export function passeCompose(verb) {
  return compound(verb, 'present');
}

export function plusQueParfait(verb) {
  return compound(verb, 'imparfait');
}

export function futurAnterieur(verb) {
  return compound(verb, 'futur');
}

export function conditionnelPasse(verb) {
  return compound(verb, 'conditionnel');
}

/**
 * Present subjunctive. The rule: take the ils/elles present form, drop -ent,
 * add the subjunctive endings — nous and vous borrow the imparfait stem
 * instead. About twenty verbs ignore this and live in SUBJONCTIF_IRREGULAR.
 *
 * The subjunctive is always quoted with "que", and que elides too, so this is
 * the one tense that assembles its own prefix rather than calling withSubject.
 */
export function subjonctifPresent(verb) {
  const override = SUBJONCTIF_IRREGULAR[verb.infinitive];
  const forms =
    override ??
    PERSONS.map((_, i) => {
      const ilsStem = (verb.present[5] || '').replace(/ent$/, '');
      const stem = i === 3 || i === 4 ? imparfaitStem(verb) : ilsStem;
      if (!stem) return null;
      return join(stem, SUBJONCTIF_ENDINGS[i]);
    });

  return PERSONS.map((_, i) => {
    if (verb.impersonal && i !== 2) return null;
    let form = forms[i];
    if (!form) return null;
    if (verb.reflexive) form = withReflexive(verb, i, form);

    const subject = verb.impersonal ? 'il' : PERSONS[i];
    if (subject === 'je') {
      return startsWithVowelSound(form, verb) ? `que j'${form}` : `que je ${form}`;
    }
    // qu'il, qu'elles, qu'on — que elides before the subject, not the verb.
    if (startsWithVowelSound(subject, verb)) return `qu'${subject} ${form}`;
    return `que ${subject} ${form}`;
  });
}

/** The imperative is stored per verb, not derived: its stem changes are
 *  unpredictable (sois, aie, sache, va) and reflexives invert the pronoun
 *  (lève-toi). Three forms only — French has no first- or third-person singular
 *  imperative. */
export function imperatif(verb) {
  if (!verb.imperatif) return null;
  const rows = [
    { person: 'tu', form: verb.imperatif[0] },
    { person: 'nous', form: verb.imperatif[1] },
    { person: 'vous', form: verb.imperatif[2] },
  ].filter((row) => row.form);
  return rows.length ? rows : null;
}

/** Every tense this app teaches, in the order the printed charts use.
 *  `level` drives the A1/A2 filter on the verb page. */
export const TENSES = [
  { key: 'present', label: 'Présent', labelEn: 'Present', level: 'A1', build: present },
  {
    key: 'passeCompose',
    label: 'Passé composé',
    labelEn: 'Perfect',
    level: 'A1',
    build: passeCompose,
  },
  { key: 'imparfait', label: 'Imparfait', labelEn: 'Imperfect', level: 'A2', build: imparfait },
  {
    key: 'plusQueParfait',
    label: 'Plus-que-parfait',
    labelEn: 'Pluperfect',
    level: 'A2',
    build: plusQueParfait,
  },
  {
    key: 'futurSimple',
    label: 'Futur simple',
    labelEn: 'Simple future',
    level: 'A2',
    build: futurSimple,
  },
  {
    key: 'conditionnelPresent',
    label: 'Conditionnel',
    labelEn: 'Conditional',
    level: 'A2',
    build: conditionnelPresent,
  },
  {
    key: 'subjonctifPresent',
    label: 'Subjonctif',
    labelEn: 'Present subjunctive',
    level: 'A2',
    build: subjonctifPresent,
  },
];

export const TENSE_KEYS = TENSES.map((t) => t.key);

/** Produce the complete table for one verb: every tense, every person. */
export function conjugateAll(verb) {
  const table = {};
  for (const tense of TENSES) table[tense.key] = tense.build(verb);
  table.imperatif = imperatif(verb);
  return table;
}

/** One form, for the drills that arrive in step 13: verb x tense x person. */
export function conjugateOne(verb, tenseKey, personIndex) {
  const tense = TENSES.find((t) => t.key === tenseKey);
  if (!tense) return null;
  return tense.build(verb)[personIndex] ?? null;
}

/** Colour and label key for a verb group — mirrors the printed study charts,
 *  and the `tone` matches a class in theme.scss. */
export const GROUPS = {
  er: { label: '1st group (-er)', short: '-er', tone: 'group-er' },
  ir: { label: '2nd group (-ir)', short: '-ir', tone: 'group-ir' },
  re: { label: '3rd group (-re)', short: '-re', tone: 'group-re' },
  irregular: { label: 'Irregular', short: 'irrég.', tone: 'group-irregular' },
};

/** How the verb should be written when it is named rather than conjugated.
 *  Reflexives are stored under their bare infinitive (lever) because that is
 *  what gets conjugated, but a learner should always read "se lever". */
export function displayName(verb) {
  return verb.display || verb.infinitive;
}

/**
 * Conjugated forms carry their pronoun so elision and the subjunctive "que"
 * come out right ("j'ai", "qu'il soit"). A drill needs the bare verb too,
 * because that is what a learner types into the box.
 *
 *   bareForm("qu'il/elle/on soit") -> "soit"
 *   bareForm("qu'il faille")       -> "faille"   (impersonal: bare "il")
 *   bareForm("je me lève")         -> "me lève"  (reflexive pronoun stays)
 *   bareForm("j'ai mangé")         -> "ai mangé"
 *
 * Alternation order is load-bearing: "il/elle/on" and "ils/elles" must be
 * tried before the bare "il", or "ils/elles seront" would lose only the "il"
 * and leave the nonsense "s/elles seront".
 */
const SUBJECT_PREFIX = /^(j'|je|tu|il\/elle\/on|ils\/elles|il|nous|vous)\s*/i;

export function bareForm(form) {
  if (!form) return form;
  return String(form)
    .replace(/^qu[e']\s*/i, '')
    .replace(SUBJECT_PREFIX, '')
    .trim();
}
