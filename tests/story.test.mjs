/** Pure story regression checks: node tests/story.test.mjs. No server required. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STORY_VERSION, getStory, storyText, storyDecisions, normalizeStory, storyOptionAvailability } from '../public/story.js';

const data = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
const initiatives = new Map(data.initiatives.map(initiative => [initiative.id, initiative]));
const districts = new Set(data.districts.map(district => district.id));
const expectedChoices = [
  [['M7', 'nura'], ['M8', 'nura'], ['M9', 'nura']],
  [['M4', 'saryarka'], ['M5', 'saryarka'], ['M6', null]],
  [['M1', 'almaty'], ['M2', null], ['M3', 'almaty']],
  [['M10', 'nura'], ['M11', 'nura']],
  [['M12', null], ['M13', 'nura'], ['M14', null]],
];
const canonicalDecisions = indices => indices.map((choice, meeting) => {
  const [initiativeId, districtId] = expectedChoices[meeting][choice];
  return { initiativeId, categoryId: initiatives.get(initiativeId).categoryId, districtId };
});

// This oracle reads rules from the dataset and uses a Cartesian product of the
// specified story choices. It does not use the implementation's branch search.
const paths = expectedChoices.reduce((prefixes, options) => prefixes.flatMap(prefix => options.map((_, choice) => [...prefix, choice])), [[]]);
const oracle = paths.map(path => {
  const decisions = canonicalDecisions(path);
  const byId = new Map(decisions.map(decision => [decision.initiativeId, decision]));
  const counts = decisions.reduce((result, decision) => {
    result[decision.categoryId] = (result[decision.categoryId] || 0) + 1;
    return result;
  }, {});
  const conflict = data.rules.incompatibilities.some(rule => {
    const selected = rule.initiativeIds.map(id => byId.get(id));
    return selected.every(Boolean) && (rule.scope === 'global' || selected.every(decision => decision.districtId === selected[0].districtId));
  });
  const valid = decisions.length === data.rules.requiredDecisions && byId.size === decisions.length
    && Object.values(counts).every(count => count <= data.rules.maxPerCategory) && !conflict;
  const cost = decisions.reduce((total, decision) => total + initiatives.get(decision.initiativeId).cost, 0);
  return { path, decisions, valid, cost };
});

assert.equal(STORY_VERSION, 1);
assert.equal(paths.length, 162);
assert.equal(oracle.filter(result => result.valid && result.cost <= 100).length, 127);
assert.equal(Math.min(...oracle.filter(result => result.valid).map(result => result.cost)), 67);
assert.equal(Math.max(...oracle.filter(result => result.valid).map(result => result.cost)), 119);

let availabilityChecks = 0;
for (const result of oracle) {
  assert.deepEqual(storyDecisions(result.path), result.decisions);
  for (let step = 0; step < expectedChoices.length; step += 1) {
    const prefix = result.path.slice(0, step);
    const choice = result.path[step];
    const candidate = [...prefix, choice];
    const completions = oracle.filter(completion => completion.valid && candidate.every((index, i) => completion.path[i] === index));
    assert.ok(completions.length, `The specified story prefix must have a compatible completion: ${candidate}`);
    const minimumTotal = Math.min(...completions.map(completion => completion.cost));
    for (const budget of [100, minimumTotal - 1, minimumTotal]) {
      assert.deepEqual(storyOptionAvailability(prefix, step, choice, data.initiatives, budget), {
        allowed: minimumTotal <= budget,
        reason: minimumTotal <= budget ? '' : 'budget',
        minimumTotal,
      }, `Incorrect completion check for ${candidate}, budget ${budget}`);
      availabilityChecks += 1;
    }
    // Editing a previous meeting must not reserve money for obsolete answers.
    assert.deepEqual(storyOptionAvailability(result.path, step, choice, data.initiatives),
      storyOptionAvailability(prefix, step, choice, data.initiatives));
  }
}

// Every affordable choice reachable through the UI leaves another affordable
// choice, until all five meetings have been completed.
const reachable = [[]];
let reachableCompleted = 0;
for (let cursor = 0; cursor < reachable.length; cursor += 1) {
  const prefix = reachable[cursor];
  if (prefix.length === 5) { reachableCompleted += 1; continue; }
  const allowed = expectedChoices[prefix.length].flatMap((_, choice) =>
    storyOptionAvailability(prefix, prefix.length, choice, data.initiatives).allowed ? [[...prefix, choice]] : []);
  assert.ok(allowed.length, `A reachable prefix cannot lead to a dead end: ${prefix}`);
  reachable.push(...allowed);
}
assert.equal(reachableCompleted, 127);

const expectRejected = (args, reason = 'invalid') => assert.deepEqual(storyOptionAvailability(...args), { allowed: false, reason, minimumTotal: null });
for (const args of [
  [null, 0, 0, data.initiatives],
  [new Array(1), 1, 0, data.initiatives],
  [[3], 1, 0, data.initiatives],
  [[], -1, 0, data.initiatives],
  [[], 1, 0, data.initiatives],
  [[], 0.5, 0, data.initiatives],
  [[], 0, -1, data.initiatives],
  [[], 0, 3, data.initiatives],
  [[], 0, '0', data.initiatives],
  [[0, 0, 0], 3, 2, data.initiatives],
  [[0, 0, 0, 0, 0], 5, 0, data.initiatives],
  [[], 0, 0, data.initiatives, -1],
  [[], 0, 0, data.initiatives, NaN],
  [[], 0, 0, data.initiatives, Infinity],
  [[], 0, 0, data.initiatives, '100'],
]) expectRejected(args);
expectRejected([[], 0, 0, null], 'unavailable');
expectRejected([[], 0, 0, []], 'unavailable');
for (const changed of [{ cost: -1 }, { cost: Infinity }, { cost: NaN }, { cost: '24' }, { categoryId: 'transport' }, { scope: 'city' }]) {
  const catalogue = data.initiatives.map(initiative => initiative.id === 'M7' ? { ...initiative, ...changed } : initiative);
  expectRejected([[], 0, 0, catalogue], 'unavailable');
}
expectRejected([[], 0, 0, data.initiatives.filter(initiative => initiative.categoryId !== 'safety')], 'unavailable');
const scarceCatalogue = data.initiatives.filter(initiative => ['M7', 'M4', 'M1', 'M11', 'M12'].includes(initiative.id));
assert.deepEqual(storyOptionAvailability([], 0, 0, scarceCatalogue), { allowed: true, reason: '', minimumTotal: 81 });
const moreExpensiveCatalogue = data.initiatives.map(initiative => ({ ...initiative, cost: initiative.cost + 10 }));
const expensive = storyOptionAvailability([], 0, 0, moreExpensiveCatalogue);
assert.equal(expensive.minimumTotal, 131);
assert.equal(expensive.allowed, false);
assert.equal(expensive.reason, 'budget');

for (const malformed of [
  null, undefined, [], 'saved', 1,
  {}, { version: 0, choices: [] }, { version: '1', choices: [] },
  { version: STORY_VERSION }, { version: STORY_VERSION, choices: null },
  { version: STORY_VERSION, choices: {} }, { version: STORY_VERSION, choices: '0' },
  ...[[3], [-1], [0.5], ['0'], [null], [undefined], [0, 0, 0, 2], [0, 0, 0, 0, 3], [0, 0, 0, 0, 0, 0], new Array(1)]
    .map(choices => ({ version: STORY_VERSION, choices })),
]) assert.equal(normalizeStory(malformed), null, `Invalid save accepted: ${JSON.stringify(malformed)}`);
for (const choices of [null, {}, '0', [3], [undefined], new Array(2), [0, 0, 0, 2], [0, 0, 0, 0, 0, 0]]) assert.deepEqual(storyDecisions(choices), []);
assert.deepEqual(storyDecisions([]), []);
assert.deepEqual(normalizeStory({ version: STORY_VERSION, choices: [] }), { version: STORY_VERSION, choices: [], step: 0 });
for (const step of [undefined, -1, 3, 0.5, '1', null, NaN, Infinity]) {
  assert.deepEqual(normalizeStory({ version: STORY_VERSION, choices: [1, 2], step }), { version: STORY_VERSION, choices: [1, 2], step: 2 });
}
for (const step of [0, 1, 2]) {
  assert.deepEqual(normalizeStory({ version: STORY_VERSION, choices: [1, 2], step }), { version: STORY_VERSION, choices: [1, 2], step });
}
assert.equal(normalizeStory({ version: STORY_VERSION, choices: [0, 0, 0, 0, 0], step: 5 }).step, 5);
const saved = { version: STORY_VERSION, choices: [0, 1], step: 0, evaluation: { score: 100 }, arbitrary: true };
const normalized = normalizeStory(saved);
assert.deepEqual(normalized, { version: STORY_VERSION, choices: [0, 1], step: 0 });
normalized.choices[0] = 2;
assert.equal(saved.choices[0], 0, 'Normalizing must not retain a mutable reference to stored choices.');

const requiredTextKeys = [
  'title', 'subtitle', 'meeting', 'hours', 'budget', 'remaining', 'choicesTitle', 'back', 'next', 'finish', 'menu', 'simulator', 'restart',
  'confirmRestart', 'cancel', 'accept', 'selected', 'locked', 'resume', 'epilogue', 'endingTitle', 'endingBody', 'viewReport', 'editChoices',
  'effectTiming', 'progress', 'saved', 'spent', 'score', 'improved', 'unresolved', 'before', 'after', 'noImprovements', 'critical', 'missed',
  'analyze', 'analyzing', 'complete', 'decision', 'available', 'total', 'changeWarning', 'restartHint', 'backToStory', 'opening', 'futureCost',
  'notFunded', 'district', 'city', 'outcome', 'hourUnit', 'evaluating',
];
const russian = getStory('ru');
for (const language of ['ru', 'kk', 'en']) {
  const story = getStory(language);
  assert.equal(story.length, 5);
  assert.equal(new Set(story.map(meeting => meeting.id)).size, 5);
  assert.deepEqual(story.map(meeting => meeting.time), ['09:00', '10:00', '11:00', '12:00', '13:00']);
  assert.deepEqual(story.map(meeting => meeting.portrait), [0, 1, 2, 3, 4]);
  for (const [step, meeting] of story.entries()) {
    const prose = [meeting.name, meeting.role, meeting.districtName, meeting.title, ...meeting.lines];
    assert.ok(meeting.lines.length >= 2 && meeting.lines.length <= 3);
    assert.equal(meeting.choices.length, expectedChoices[step].length);
    for (const [choiceIndex, choice] of meeting.choices.entries()) {
      prose.push(choice.reply, choice.acknowledgement);
      const initiative = initiatives.get(choice.initiativeId);
      assert.ok(initiative, 'Story choices must use actual catalogue initiatives.');
      assert.deepEqual([choice.initiativeId, choice.districtId], expectedChoices[step][choiceIndex]);
      assert.equal(choice.categoryId, initiative.categoryId);
      assert.ok(initiative.scope === 'city' ? choice.districtId === null : districts.has(choice.districtId));
      if (language !== 'ru') {
        assert.notEqual(choice.reply, russian[step].choices[choiceIndex].reply);
        assert.notEqual(choice.acknowledgement, russian[step].choices[choiceIndex].acknowledgement);
      }
    }
    for (const value of prose) {
      assert.equal(typeof value, 'string');
      assert.ok(value.trim().length, 'Every narrative field must have real copy.');
      if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
    }
    if (language !== 'ru') {
      assert.notEqual(meeting.title, russian[step].title);
      for (const [index, line] of meeting.lines.entries()) assert.notEqual(line, russian[step].lines[index]);
    }
  }
  for (const key of requiredTextKeys) {
    const value = storyText(key, language, { current: 2, total: 5, cost: 81 });
    assert.ok(value.trim());
    assert.notEqual(value, key, `Missing ${language} UI copy: ${key}`);
    assert.doesNotMatch(value, /\{(?:current|total|cost)\}/);
    if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
  }
}
assert.deepEqual(getStory(), russian);
assert.deepEqual(getStory('unknown'), russian);
assert.equal(storyText('title', 'unknown'), storyText('title', 'ru'));
assert.equal(storyText('missing-key', 'en'), 'missing-key');
assert.match(storyText('futureCost', 'en', { cost: 81 }), /81/);
const copy = getStory();
copy[0].choices[0].initiativeId = 'not-a-real-initiative';
copy[0].choices[0].reply = 'changed';
copy[0].lines[0] = 'changed';
assert.deepEqual(getStory(), russian, 'Returned narratives must not allow mutation of later sessions.');
const decisionsCopy = storyDecisions([0]);
decisionsCopy[0].districtId = 'changed';
assert.deepEqual(storyDecisions([0]), canonicalDecisions([0]));

console.log(`Story checks passed: 162 routes, 127 affordable endings, ${availabilityChecks} budget/completion checks, 3 languages, saved progress validation.`);
