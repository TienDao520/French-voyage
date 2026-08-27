import { describe, it, expect } from 'vitest';
import {
  PERSONS,
  TENSES,
  bareForm,
  conjugateAll,
  conjugateOne,
  displayName,
  imparfaitStem,
  imperatif,
} from './conjugate.js';
import { verbs } from './content.js';

/**
 * Look up by id first, then by infinitive. Ids matter here: `appeler` and
 * `s'appeler` are two entries sharing one infinitive, so a bare infinitive
 * lookup is ambiguous for exactly the verbs the reflexive tests care about.
 */
const find = (key) => verbs.find((v) => v.id === key) ?? verbs.find((v) => v.infinitive === key);

/** Tiny helper so the assertions below read like a conjugation chart. */
const forms = (key, tenseKey) => conjugateAll(find(key))[tenseKey];

describe('derived stems', () => {
  it('takes the imparfait stem from the nous-form', () => {
    expect(imparfaitStem(find('parler'))).toBe('parl'); // parlons -> parl
    expect(imparfaitStem(find('choisir'))).toBe('choisiss'); // choisissons -> choisiss
    expect(imparfaitStem(find('boire'))).toBe('buv'); // buvons -> buv
  });

  it('honours the override for être, whose nous-form gives no stem', () => {
    // "nous sommes" has no -ons to strip. Without the override this returns
    // "sommes" and every imparfait form is wrong.
    expect(imparfaitStem(find('être'))).toBe('ét');
    expect(forms('être', 'imparfait')[0]).toBe("j'étais");
  });
});

describe('simple tenses', () => {
  it('builds the imparfait from the stem plus fixed endings', () => {
    expect(forms('parler', 'imparfait')).toEqual([
      'je parlais',
      'tu parlais',
      'il/elle/on parlait',
      'nous parlions',
      'vous parliez',
      'ils/elles parlaient',
    ]);
  });

  it('builds the futur from futurStem, and the conditionnel from the same stem', () => {
    expect(forms('être', 'futurSimple')[0]).toBe('je serai');
    expect(forms('être', 'conditionnelPresent')[0]).toBe('je serais');
    // Same stem, different endings — that is the entire relationship.
    expect(forms('aller', 'futurSimple')[0]).toBe("j'irai");
    expect(forms('aller', 'conditionnelPresent')[0]).toBe("j'irais");
  });
});

describe('spelling changes that protect pronunciation', () => {
  it('keeps the buffer e in -ger verbs before a, and drops it before i', () => {
    const imp = forms('manger', 'imparfait');
    expect(imp[0]).toBe('je mangeais'); // e kept: g must stay soft before a
    expect(imp[3]).toBe('nous mangions'); // e dropped: i already softens the g
  });

  it('writes ç in -cer verbs before a, and reverts to c before i', () => {
    const imp = forms('commencer', 'imparfait');
    expect(imp[0]).toBe('je commençais');
    expect(imp[3]).toBe('nous commencions');
  });
});

describe('elision', () => {
  it("contracts je to j' before a vowel", () => {
    expect(forms('avoir', 'present')[0]).toBe("j'ai");
    expect(forms('parler', 'present')[0]).toBe('je parle'); // consonant: no elision
  });

  it('treats a silent h as a vowel', () => {
    expect(forms('habiter', 'present')[0]).toBe("j'habite");
  });

  it('leaves h aspiré alone when the verb says so', () => {
    // No verb in the content is aspirate yet, so this proves the escape hatch
    // works before someone adds haïr and quietly gets "j'hais".
    const hair = { ...find('choisir'), infinitive: 'haïr', aspirateH: true, present: ['hais'] };
    expect(forms('choisir', 'present')[0]).toBe('je choisis');
    expect(conjugateOne(hair, 'present', 0)).toBe('je hais');
  });
});

describe('compound tenses', () => {
  it('uses the auxiliary the verb declares', () => {
    expect(forms('parler', 'passeCompose')[0]).toBe("j'ai parlé"); // avoir
    expect(forms('partir', 'passeCompose')[0]).toBe('je suis parti(e)'); // être
  });

  it('marks optional participle agreement only for être verbs', () => {
    const pc = forms('partir', 'passeCompose');
    expect(pc[0]).toBe('je suis parti(e)'); // one person
    expect(pc[3]).toBe('nous sommes parti(e)s'); // plural: s is certain
    expect(pc[4]).toBe('vous êtes parti(e)(s)'); // vous: number is ambiguous
    expect(forms('parler', 'passeCompose')[3]).toBe('nous avons parlé'); // no agreement
  });

  it('swaps only the auxiliary between the three compound tenses', () => {
    expect(forms('parler', 'plusQueParfait')[0]).toBe("j'avais parlé");
    expect(forms('partir', 'plusQueParfait')[0]).toBe("j'étais parti(e)");
  });
});

describe('reflexive verbs', () => {
  it('puts the pronoun between subject and verb, eliding where needed', () => {
    expect(forms('v-se-lever', 'present')[0]).toBe('je me lève');
    expect(forms('v-se-lever', 'present')[3]).toBe('nous nous levons'); // no elision
    expect(forms('v-s-appeler', 'present')[0]).toBe("je m'appelle"); // me -> m'
  });

  it('wraps the whole auxiliary in the passé composé, not just the participle', () => {
    // je me suis levé — not "je suis me levé".
    expect(forms('v-se-lever', 'passeCompose')[0]).toBe('je me suis levé(e)');
    expect(forms('v-se-lever', 'passeCompose')[1]).toBe("tu t'es levé(e)"); // te -> t'
  });

  it('names itself with the reflexive pronoun', () => {
    expect(displayName(find('v-se-lever'))).toBe('se lever');
    expect(displayName(find('v-appeler'))).toBe('appeler');
    expect(displayName(find('v-s-appeler'))).toBe("s'appeler");
  });
});

describe('impersonal verbs', () => {
  it('produces only the third person singular', () => {
    const p = forms('falloir', 'present');
    expect(p[2]).toBe('il faut');
    expect(p.filter(Boolean)).toHaveLength(1);
  });

  it('uses bare "il", never "il/elle/on"', () => {
    expect(forms('falloir', 'futurSimple')[2]).toBe('il faudra');
    expect(forms('falloir', 'subjonctifPresent')[2]).toBe("qu'il faille");
  });
});

describe('subjonctif', () => {
  it('derives from the ils-form, borrowing the nous stem for nous and vous', () => {
    const s = forms('parler', 'subjonctifPresent');
    expect(s[0]).toBe('que je parle'); // parlent -> parl + e
    expect(s[3]).toBe('que nous parlions'); // imparfait stem + ions
  });

  it('uses the override table where French refuses the rule', () => {
    expect(forms('boire', 'subjonctifPresent')[0]).toBe('que je boive');
    expect(forms('boire', 'subjonctifPresent')[3]).toBe('que nous buvions');
    expect(forms('être', 'subjonctifPresent')[2]).toBe("qu'il/elle/on soit");
  });

  it("elides que before a vowel — qu'il, que j'aie", () => {
    expect(forms('avoir', 'subjonctifPresent')[0]).toBe("que j'aie");
    expect(forms('avoir', 'subjonctifPresent')[5]).toBe("qu'ils/elles aient");
  });
});

describe('impératif', () => {
  it('reads the stored forms — three persons only', () => {
    expect(imperatif(find('être'))).toEqual([
      { person: 'tu', form: 'sois' },
      { person: 'nous', form: 'soyons' },
      { person: 'vous', form: 'soyez' },
    ]);
  });

  it('returns null when the verb has no imperative', () => {
    expect(imperatif(find('falloir'))).toBeNull();
  });
});

describe('bareForm', () => {
  it('strips the subject and the subjunctive que, keeping the reflexive pronoun', () => {
    expect(bareForm("qu'il/elle/on soit")).toBe('soit');
    expect(bareForm("qu'il faille")).toBe('faille');
    expect(bareForm("j'ai mangé")).toBe('ai mangé');
    expect(bareForm('ils/elles seront')).toBe('seront');
    expect(bareForm('je me lève')).toBe('me lève');
    expect(bareForm('nous nous levons')).toBe('nous levons');
  });

  it('survives null', () => {
    expect(bareForm(null)).toBeNull();
  });
});

// The real safety net: whatever anyone adds to verbs.json later, the engine
// must produce a complete table for it. This is the test that catches a
// missing futurStem or a five-element present array on the day it lands.
describe('every verb in the content', () => {
  it('conjugates without holes', () => {
    const holes = [];
    for (const verb of verbs) {
      const table = conjugateAll(verb);
      for (const tense of TENSES) {
        table[tense.key].forEach((form, i) => {
          const expectedMissing = verb.impersonal && i !== 2;
          if (!form && !expectedMissing) {
            holes.push(`${displayName(verb)} / ${tense.label} / ${PERSONS[i]}`);
          }
        });
      }
    }
    expect(holes).toEqual([]);
  });

  it('never emits undefined or NaN into a form', () => {
    const junk = [];
    for (const verb of verbs) {
      const table = conjugateAll(verb);
      for (const tense of TENSES) {
        for (const form of table[tense.key]) {
          if (form && /undefined|NaN|null/.test(form)) junk.push(`${displayName(verb)}: ${form}`);
        }
      }
    }
    expect(junk).toEqual([]);
  });
});
