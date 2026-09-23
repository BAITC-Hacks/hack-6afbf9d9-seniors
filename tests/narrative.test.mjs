/** Narrative continuity checks: node tests/narrative.test.mjs. No server needed. */
import assert from 'node:assert/strict';
import { getStory } from '../public/story.js';
import { narrativeText, getIntro, getMeeting, getTransition, getClosing } from '../public/narrative.js';

const languages = ['ru', 'kk', 'en'];
const choicesPerMeeting = [3, 3, 3, 2, 3];
const paths = choicesPerMeeting.reduce((prefixes, size) => prefixes.flatMap(prefix => Array.from({ length: size }, (_, choice) => [...prefix, choice])), [[]]);
const expectedInitiatives = new Set(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14']);
const supportedVisuals = new Set(['call', 'lab', 'map', 'briefing']);
const requiredKeys = ['intro', 'introProgress', 'next', 'enter', 'back', 'transition', 'nextMeeting', 'ending', 'decisionContext', 'forecastNotice',
  'resume', 'today', 'future', 'endingReason', 'viewJournal', 'availableReplies', 'shortTerm', 'hours', 'budget', 'decisions', 'callConnected', 'cityPulse'];
let prefixChecks = 0;

function verifyText(value, language) {
  assert.equal(typeof value, 'string');
  assert.ok(value.trim(), 'Narrative copy cannot be empty.');
  assert.doesNotMatch(value, /\b(?:undefined|null)\b/);
  if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
}
function verifyScene(scene, language) {
  for (const key of ['id', 'time', 'kicker', 'title', 'cta']) verifyText(scene[key], language);
  assert.match(scene.time, /^\d{2}:\d{2}$/);
  assert.ok(supportedVisuals.has(scene.visual));
  assert.ok(Array.isArray(scene.lines) && scene.lines.length >= 2);
  scene.lines.forEach(line => verifyText(line, language));
  if (scene.speaker !== undefined) verifyText(scene.speaker, language);
  if (scene.portrait !== undefined) assert.ok(Number.isInteger(scene.portrait) && scene.portrait >= 0 && scene.portrait <= 4);
}
const identifiers = choice => ({ initiativeId: choice.initiativeId, categoryId: choice.categoryId, districtId: choice.districtId });

for (const language of languages) {
  const intro = getIntro(language);
  assert.equal(intro.length, 4);
  assert.deepEqual(intro.map(scene => scene.visual), ['lab', 'call', 'map', 'briefing']);
  assert.equal(new Set(intro.map(scene => scene.id)).size, 4);
  intro.forEach(scene => verifyScene(scene, language));
  assert.equal(intro[1].portrait, 4, 'Aliya must make the opening call.');
  assert.equal(intro[3].cta, narrativeText('enter', language));
  assert.match(intro[3].lines.join(' '), /100/);
  assert.match(intro[3].lines.join(' '), /14:00/);
  for (let scene = 1; scene < intro.length; scene += 1) assert.ok(intro[scene].time > intro[scene - 1].time);
  for (const key of requiredKeys) {
    const value = narrativeText(key, language, { current: 2, total: 4 });
    verifyText(value, language);
    assert.notEqual(value, key, `Missing ${language} copy for ${key}.`);
    assert.doesNotMatch(value, /\{(?:current|total)\}/);
  }

  const original = getStory(language);
  const transitions = new Map();
  for (const path of paths) {
    for (let step = 0; step < 5; step += 1) {
      const meeting = getMeeting(step, path, language);
      const prefixOnly = getMeeting(step, path.slice(0, step), language);
      assert.deepEqual(meeting, prefixOnly, `Meeting ${step} leaked a current or future answer from ${path}.`);
      assert.deepEqual(getMeeting(step, [...path.slice(0, step), 999, undefined, null], language), prefixOnly,
        'Malformed future answers cannot alter an earlier meeting.');
      prefixChecks += 2;
      for (const key of ['name', 'role', 'districtName', 'title', 'cityNote']) verifyText(meeting[key], language);
      assert.equal(meeting.id, original[step].id);
      assert.equal(meeting.time, original[step].time);
      assert.equal(meeting.portrait, original[step].portrait);
      assert.deepEqual(meeting.choices.map(identifiers), original[step].choices.map(identifiers), 'Narrative branching must preserve actual measure choices, targets and order.');
      meeting.lines.forEach(line => verifyText(line, language));
      for (const choice of meeting.choices) for (const key of ['reply', 'acknowledgement', 'context']) verifyText(choice[key], language);

      const transition = getTransition(step, path, language);
      verifyScene(transition, language);
      verifyText(transition.cityNote, language);
      assert.equal(transition.portrait, original[step].portrait);
      assert.equal(transition.speaker, original[step].name);
      assert.deepEqual(transition, getTransition(step, path.slice(0, step + 1), language), 'A reaction cannot reveal later decisions.');
      assert.deepEqual(transition, getTransition(step, [...path.slice(0, step + 1), 999, null], language), 'Invalid future answers cannot change an existing reaction.');
      prefixChecks += 2;
      assert.equal(getTransition(step, path.slice(0, step), language), null, 'A reaction cannot exist before its choice is made.');
      const id = meeting.choices[path[step]].initiativeId;
      const prior = transitions.get(id);
      if (prior) assert.equal(transition.title, prior.title, 'A measure keeps its own reaction title across earlier branches.');
      else transitions.set(id, transition);
    }
    const closing = getClosing(path, language);
    verifyText(closing.title, language);
    assert.ok(closing.lines.length >= 4);
    closing.lines.forEach(line => verifyText(line, language));
    assert.match(closing.lines[0], /18:40/, 'The evening scene must be distinct from the two-year forecast.');
  }
  assert.deepEqual(new Set(transitions.keys()), expectedInitiatives);
  assert.equal(new Set([...transitions.values()].map(scene => scene.title)).size, 14, 'All 14 initiatives need a distinct reaction scene.');
  assert.equal(new Set([...transitions.values()].map(scene => scene.lines[0])).size, 14);
  assert.equal(new Set([...transitions.values()].map(scene => scene.id)).size, 14);
  assert.deepEqual(getStory(language), original, 'Narrative generation cannot mutate the canonical story.');

  // Each visitor must hear what happened at the immediately preceding meeting.
  for (let step = 1; step < 5; step += 1) {
    const variants = Array.from({ length: choicesPerMeeting[step - 1] }, (_, choice) => {
      const prefix = Array(step).fill(0);
      prefix[step - 1] = choice;
      return getMeeting(step, prefix, language);
    });
    assert.equal(new Set(variants.map(meeting => JSON.stringify(meeting.lines))).size, variants.length, `Visitor ${step} must react to each preceding choice.`);
    assert.equal(new Set(variants.map(meeting => meeting.cityNote)).size, variants.length);
    assert.equal(new Set(variants.map(meeting => JSON.stringify(meeting.choices))).size, variants.length);
  }
  // Aliya brings all four earlier decisions together, not just the last one.
  const advisorBaseline = getMeeting(4, [0, 0, 0, 0], language);
  for (let earlier = 0; earlier < 4; earlier += 1) {
    const prefix = [0, 0, 0, 0];
    prefix[earlier] = 1;
    const variant = getMeeting(4, prefix, language);
    assert.notDeepEqual(variant.lines, advisorBaseline.lines, `Aliya did not acknowledge decision ${earlier}.`);
    assert.notEqual(variant.cityNote, advisorBaseline.cityNote);
  }
  const school = getMeeting(4, [0, 0, 0, 0], language).choices.find(choice => choice.initiativeId === 'M13');
  const clinic = getMeeting(4, [1, 0, 0, 0], language).choices.find(choice => choice.initiativeId === 'M13');
  const sports = getMeeting(4, [2, 0, 0, 0], language).choices.find(choice => choice.initiativeId === 'M13');
  assert.notEqual(school.context, clinic.context);
  assert.notEqual(clinic.context, sports.context);
  assert.notEqual(school.reply, clinic.reply);
  const synergy = getMeeting(4, [0, 0, 0, 0], language).choices.find(choice => choice.initiativeId === 'M12');
  const noSynergy = getMeeting(4, [0, 0, 0, 1], language).choices.find(choice => choice.initiativeId === 'M12');
  for (const key of ['reply', 'context', 'acknowledgement']) assert.notEqual(synergy[key], noSynergy[key], `M10 + M12 needs its own ${key}.`);

  const evening = getClosing([0, 0, 0, 0, 0], language);
  for (const changed of [[0, 0, 0, 1, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 1], [0, 0, 0, 0, 2]]) {
    assert.notDeepEqual(getClosing(changed, language).lines, evening.lines, 'The evening must reflect safety, social and service priorities.');
  }
}

for (const step of [-1, 5, 1.5, undefined, null, NaN]) {
  assert.equal(getMeeting(step, [0, 0, 0, 0, 0]), null);
  assert.equal(getTransition(step, [0, 0, 0, 0, 0]), null);
}
assert.equal(getTransition(0, []), null);
assert.equal(getTransition(0, [3]), null);
assert.equal(getTransition(1, [0, 3]), null);
assert.equal(getTransition(0, new Array(1)), null);
assert.equal(getTransition(0, null), null);
assert.deepEqual(getIntro('unsupported'), getIntro('ru'));
assert.deepEqual(getMeeting(1, [0], 'unsupported'), getMeeting(1, [0], 'ru'));
assert.deepEqual(getClosing([0, 0, 0, 0, 0], 'unsupported'), getClosing([0, 0, 0, 0, 0], 'ru'));
assert.equal(narrativeText('missing'), 'missing');
assert.equal(narrativeText('intro', 'unsupported'), narrativeText('intro', 'ru'));
assert.equal(narrativeText('introProgress', 'en', { current: 2, total: 4 }), '2 of 4');

const originalMeeting = getMeeting(1, [0], 'en');
const mutableMeeting = getMeeting(1, [0], 'en');
mutableMeeting.lines[0] = 'changed';
mutableMeeting.choices[0].initiativeId = 'invalid';
mutableMeeting.choices[0].context = 'changed';
assert.deepEqual(getMeeting(1, [0], 'en'), originalMeeting);
const mutableIntro = getIntro('en');
mutableIntro[0].lines.push('changed');
assert.equal(getIntro('en')[0].lines.length, 2);
const schoolContext = getMeeting(4, [0, 0, 0, 0], 'en').choices.find(choice => choice.initiativeId === 'M13').context;
const clinicContext = getMeeting(4, [1, 0, 0, 0], 'en').choices.find(choice => choice.initiativeId === 'M13').context;
assert.match(schoolContext, /school/i);
assert.match(clinicContext, /clinic/i);
const synergyContext = getMeeting(4, [0, 0, 0, 0], 'en').choices.find(choice => choice.initiativeId === 'M12').context;
assert.match(synergyContext, /synergy/i);
assert.doesNotMatch(getMeeting(4, [], 'en').choices.find(choice => choice.initiativeId === 'M13').reply, /school|clinic|sports/i,
  'An incomplete prefix must not invent a social choice.');

console.log(`Narrative checks passed: 4-scene prologue, 14 unique reactions in 3 languages, ${prefixChecks} prefix-isolation checks, branching dialogue and evening continuity.`);
