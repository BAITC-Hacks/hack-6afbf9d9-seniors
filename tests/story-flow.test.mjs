/** Pure navigation, save migration and grounded ending checks; no server required. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getStory, storyDecisions } from '../public/story.js';
import { FLOW_VERSION, STORY_EVENT_IDS, createStoryProgress, normalizeStoryProgress, serializeStoryProgress, nextStoryProgress, commitStoryChoice, chooseStoryInquiry, setStoryAllocations, classifyEnding } from '../public/story-flow.js';
import { defaultAllocations } from '../public/story-budget.js';

const data = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
const jsonClone = value => JSON.parse(JSON.stringify(value));
const story = getStory();
const fresh = { choices: [], step: 0, phase: 'intro', introStep: 0, allocations: null, inquiries: [null, null, null, null, null], council: null, planReturn: null, eventId: null };
assert.equal(FLOW_VERSION, 3);
assert.deepEqual(createStoryProgress(), fresh);
const independent = createStoryProgress();
independent.choices.push(2);
independent.inquiries[0] = 1;
assert.deepEqual(createStoryProgress(), fresh);

let progress = createStoryProgress();
assert.deepEqual(nextStoryProgress(progress, 'meeting-next'), progress);
assert.deepEqual(nextStoryProgress(progress, 'intro-back'), progress);
assert.deepEqual(nextStoryProgress(progress, 'planning-open'), progress);
for (let screen = 1; screen <= 3; screen += 1) {
  progress = nextStoryProgress(progress, 'intro-next');
  assert.equal(progress.phase, 'intro');
  assert.equal(progress.introStep, screen);
}
assert.equal(nextStoryProgress(progress, 'intro-back').introStep, 2);
progress = nextStoryProgress(progress, 'intro-next');
assert.deepEqual(progress, { ...fresh, phase: 'planning', introStep: 3 });
assert.deepEqual(nextStoryProgress(progress, 'planning-cancel'), progress, 'Opening planning is a required chapter.');
assert.deepEqual(setStoryAllocations(progress, { social: -1 }), progress);
const allocations = defaultAllocations(data.initiatives, data.budget);
progress = setStoryAllocations(progress, allocations);
assert.equal(progress.phase, 'briefing');
assert.deepEqual(progress.allocations, allocations);
assert.deepEqual(nextStoryProgress(progress, 'meeting-next'), progress);

for (let step = 0; step < 5; step += 1) {
  const before = jsonClone(progress);
  assert.equal(progress.phase, 'briefing');
  assert.deepEqual(chooseStoryInquiry(progress, 99), before);
  progress = chooseStoryInquiry(progress, step % 2);
  assert.equal(progress.phase, 'discovery');
  assert.equal(progress.inquiries[step], step % 2);
  assert.equal(nextStoryProgress(progress, 'back').phase, 'briefing');
  assert.deepEqual(commitStoryChoice(progress, 0), progress, 'Inquiry screens cannot buy a project.');
  progress = nextStoryProgress(progress, 'discovery-next');
  assert.equal(progress.phase, 'meeting');
  assert.equal(nextStoryProgress(progress, 'back').phase, 'discovery');
  assert.deepEqual(nextStoryProgress(progress, 'meeting-next'), progress, 'A meeting cannot advance without an accepted choice.');
  assert.deepEqual(commitStoryChoice(progress, 99), progress);
  progress = commitStoryChoice(progress, 0);
  assert.equal(progress.step, step);
  assert.equal(progress.choices.length, step + 1);
  const planning = nextStoryProgress(progress, 'planning-open');
  assert.equal(planning.phase, 'planning');
  assert.deepEqual(planning.planReturn, { phase: 'meeting', step });
  assert.deepEqual(nextStoryProgress(planning, 'planning-cancel'), progress);
  assert.deepEqual(setStoryAllocations(planning, allocations), progress);
  progress = nextStoryProgress(progress, 'meeting-next');
  assert.equal(progress.phase, 'transition');
  assert.equal(progress.step, step);
  assert.equal(nextStoryProgress(progress, 'back').step, step);
  assert.equal(nextStoryProgress(progress, 'back').phase, 'meeting');
  assert.deepEqual(commitStoryChoice(progress, 1), progress);
  const encoded = serializeStoryProgress(progress, data.version);
  assert.deepEqual(normalizeStoryProgress(encoded), { version: FLOW_VERSION, ...progress });
  progress = nextStoryProgress(progress, 'transition-next');
  assert.equal(progress.step, step + 1);
  assert.equal(progress.phase, step === 4 ? 'ending' : step === 2 ? 'council' : 'briefing');
  if (progress.phase === 'council') {
    const held = nextStoryProgress(progress, 'council-hold');
    assert.equal(held.phase, 'briefing');
    assert.equal(held.council, 'hold');
    assert.equal(nextStoryProgress(progress, 'back').step, 2);
    progress = nextStoryProgress(progress, 'council-review');
    assert.equal(progress.phase, 'planning');
    assert.equal(progress.council, 'review');
    assert.deepEqual(progress.planReturn, { phase: 'briefing', step: 3 });
    assert.deepEqual(normalizeStoryProgress(serializeStoryProgress(progress, data.version)), { version: 3, ...progress });
    progress = setStoryAllocations(progress, allocations);
    assert.equal(progress.phase, 'briefing');
    assert.equal(progress.council, 'review');
  }
}
const completed = jsonClone(progress);
assert.equal(nextStoryProgress(completed, 'back').step, 4);
assert.equal(nextStoryProgress(completed, 'back').phase, 'meeting');
assert.deepEqual(nextStoryProgress(completed, 'meeting-next'), completed);
const revisited = nextStoryProgress(completed, 'edit');
assert.equal(revisited.step, 0);
assert.deepEqual(revisited.choices, completed.choices);
const changed = commitStoryChoice(revisited, 2);
assert.deepEqual(changed.choices, [2]);
assert.deepEqual(changed.inquiries, [0, null, null, null, null]);
assert.equal(changed.council, null);
assert.deepEqual(changed.allocations, allocations);
assert.deepEqual(completed.choices, [0, 0, 0, 0, 0]);
const replanned = nextStoryProgress({ ...completed, step: 2, phase: 'meeting' }, 'replan');
assert.deepEqual(replanned.choices, [0, 0]);
assert.deepEqual(replanned.inquiries, [0, 1, 0, null, null]);
assert.equal(replanned.council, null);
assert.equal(replanned.phase, 'planning');
assert.deepEqual(replanned.planReturn, { phase: 'meeting', step: 2 });
assert.deepEqual(replanned.allocations, completed.allocations);
assert.deepEqual(normalizeStoryProgress(serializeStoryProgress(replanned, data.version)), { version: 3, ...replanned });
assert.deepEqual(nextStoryProgress(completed, 'replan'), completed);
const inquiryOnly = chooseStoryInquiry({ ...completed, step: 0, phase: 'briefing' }, 1);
assert.deepEqual(inquiryOnly.choices, completed.choices, 'Research never discards confirmed financial decisions.');
assert.deepEqual(inquiryOnly.inquiries, [1, null, null, null, null]);
assert.equal(inquiryOnly.council, 'review');
assert.deepEqual(chooseStoryInquiry({ ...completed, step: 0, phase: 'briefing' }, 0).inquiries, completed.inquiries);
assert.deepEqual(nextStoryProgress(completed, 'restart'), fresh);
const frozen = Object.freeze({ ...completed, choices: Object.freeze([...completed.choices]), inquiries: Object.freeze([...completed.inquiries]), allocations: Object.freeze({ ...allocations }) });
assert.doesNotThrow(() => nextStoryProgress(frozen, 'edit'));
assert.doesNotThrow(() => chooseStoryInquiry({ ...frozen, step: 0, phase: 'briefing' }, 1));

// Legacy campaigns retain decisions and resume without imposing a new plan.
const oldCompleted = { ...fresh, choices: [0, 0, 0, 0, 0], step: 5, phase: 'ending', introStep: 3 };
assert.deepEqual(normalizeStoryProgress({ version: 1, choices: [], step: 0 }), { version: 3, ...fresh });
assert.deepEqual(normalizeStoryProgress({ version: 1, choices: [1, 2], step: 1, evaluation: { score: 100 } }), {
  version: 3, ...fresh, choices: [1, 2], step: 1, phase: 'meeting', introStep: 3,
});
assert.deepEqual(normalizeStoryProgress({ version: 1, choices: [0, 0, 0, 0, 0], step: 5 }), { version: 3, ...oldCompleted });
const oldSave = { version: 2, datasetVersion: data.version, decisionIds: ['M7', 'M4', 'M1', 'M10', 'M12'], step: 5, phase: 'ending', introStep: 3 };
assert.deepEqual(normalizeStoryProgress(oldSave), { version: 3, ...oldCompleted });
assert.equal(normalizeStoryProgress({ ...oldSave, step: 2, phase: 'meeting' }).phase, 'meeting');
assert.equal(normalizeStoryProgress({ version: 2, decisionIds: [], phase: 'meeting', step: 0 }).phase, 'intro');
assert.equal(normalizeStoryProgress({ ...oldSave, phase: 'transition', step: 4 }).phase, 'transition');
assert.equal(nextStoryProgress({ ...oldCompleted, step: 2, phase: 'meeting' }, 'back').step, 1, 'Legacy meetings with no inquiry retain their old back path.');

const serialized = serializeStoryProgress({ ...completed, evaluation: { score: 999 }, ending: 'forged' }, data.version);
assert.deepEqual(serialized, { version: 3, datasetVersion: data.version, decisionIds: ['M7', 'M4', 'M1', 'M10', 'M12'], step: 5, phase: 'ending', introStep: 3, allocations, inquiries: [0, 1, 0, 1, 0], council: 'review', planReturn: null, eventId: null });
assert.deepEqual(normalizeStoryProgress({ ...serialized, choices: [2], evaluation: { score: 999 } }), { version: 3, ...completed });
assert.deepEqual(normalizeStoryProgress(serializeStoryProgress({ ...fresh, introStep: 2 }, data.version)), { version: 3, ...fresh, introStep: 2 });
for (const invalid of [null, [], {}, { version: 0 }, { version: 4 }, { version: 1, choices: [99] },
  { version: 2, decisionIds: null }, { version: 3, decisionIds: ['M99'] },
  { version: 3, decisionIds: ['M4'] }, { version: 3, decisionIds: ['M7', 'M7'] },
  { version: 3, decisionIds: [null] }, { version: 3, decisionIds: ['M7', 'M4', 'M1', 'M10', 'M12', 'M14'] }]) {
  assert.equal(normalizeStoryProgress(invalid), null);
}
const sparse = new Array(1);
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: sparse }), null);
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: [], phase: 'transition', step: 0 }).phase, 'meeting');
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: ['M7'], phase: 'intro', step: 0 }).phase, 'meeting');
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: ['M7'], phase: 'ending', step: 1 }).phase, 'meeting');
assert.equal(normalizeStoryProgress({ ...serialized, phase: 'meeting' }).phase, 'ending');
assert.equal(normalizeStoryProgress({ ...serialized, step: -1, phase: 'unknown' }).phase, 'ending');
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: [], phase: 'intro', introStep: 8 }).introStep, 0);
assert.throws(() => serializeStoryProgress({ choices: [99] }, data.version), TypeError);
const forged = normalizeStoryProgress({ ...serialized, allocations: { ...allocations, green: '20' }, inquiries: [true, -1, '0', 1, 6], council: 'magic', planReturn: { phase: 'ending', step: 5 }, extra: 99 });
assert.equal(forged.allocations, null);
assert.deepEqual(forged.inquiries, [null, null, null, 1, null]);
assert.equal(forged.council, null);
assert.equal(forged.planReturn, null);
assert.equal(Object.hasOwn(forged, 'extra'), false);
const forgedFuture = normalizeStoryProgress({ version: 3, decisionIds: [], phase: 'briefing', inquiries: [1, 1, 1, 1, 1], council: 'hold' });
assert.deepEqual(forgedFuture.inquiries, [1, null, null, null, null]);
assert.equal(forgedFuture.council, null);
assert.equal(normalizeStoryProgress({ version: 3, decisionIds: [], phase: 'discovery', inquiries: [] }).phase, 'meeting');
assert.equal(normalizeStoryProgress({ ...serialized, phase: 'planning', planReturn: { phase: 'meeting', step: 99 } }).planReturn, null);
assert.deepEqual(nextStoryProgress(completed, 'planning-open'), completed, 'The ending cannot open planning at nonexistent meeting five.');
for (const planReturn of [null, { phase: 'ending', step: 5 }, { phase: 'meeting', step: 5 }, { phase: 'unknown', step: 5 }]) {
  const restored = normalizeStoryProgress({ ...serialized, phase: 'planning', planReturn });
  assert.equal(restored.phase, 'ending');
  assert.equal(restored.planReturn, null);
  assert.equal(setStoryAllocations(restored, allocations).phase, 'ending');
}
for (const planReturn of [null, { phase: 'ending', step: 2 }, { phase: 'meeting', step: 99 }, { phase: 'unknown', step: 2 }]) {
  const restored = normalizeStoryProgress({ ...serialized, step: 2, phase: 'planning', planReturn });
  assert.equal(restored.phase, 'meeting', 'Broken return flags fall back to the existing meeting.');
  assert.equal(restored.planReturn, null);
}

// An event belongs to the day. Navigation and branch edits cannot draw another,
// while saved forecast numbers never become trusted state.
assert.deepEqual(STORY_EVENT_IDS, ['harsh-winter', 'heating-main-burst', 'population-surge', 'traffic-accidents']);
assert.ok(Object.isFrozen(STORY_EVENT_IDS));
for (const eventId of STORY_EVENT_IDS) {
  const eventDay = { ...completed, eventId };
  const eventSave = serializeStoryProgress({ ...eventDay, eventForecast: { score: 999 }, eventEffects: { T1: 100 } }, data.version);
  assert.equal(eventSave.eventId, eventId);
  assert.equal(Object.hasOwn(eventSave, 'eventForecast'), false);
  assert.equal(Object.hasOwn(eventSave, 'eventEffects'), false);
  assert.deepEqual(normalizeStoryProgress(jsonClone(eventSave)), { version: 3, ...eventDay });
  const editDay = nextStoryProgress(eventDay, 'edit');
  assert.equal(editDay.eventId, eventId);
  const earlierDay = nextStoryProgress(editDay, 'replan');
  assert.equal(earlierDay.choices.length, 0);
  assert.equal(earlierDay.eventId, eventId, 'A hidden event is retained when revisiting a prefix before its reveal.');
  const restoredDay = normalizeStoryProgress(serializeStoryProgress(earlierDay, data.version));
  assert.equal(restoredDay.eventId, eventId);
  const revisedDay = commitStoryChoice(setStoryAllocations(restoredDay, allocations), 2);
  assert.equal(revisedDay.eventId, eventId);
  assert.equal(nextStoryProgress(revisedDay, 'meeting-next').eventId, eventId);
  assert.equal(nextStoryProgress(eventDay, 'back').eventId, eventId);
  assert.deepEqual(nextStoryProgress(eventDay, 'restart'), fresh);
}
for (const eventId of [undefined, null, '', 'smog-episode', 'school-overcrowding', 'unknown', [], {}, 0, true]) {
  assert.equal(normalizeStoryProgress({ ...serialized, eventId }).eventId, null);
}
const oldV3Save = { ...serialized };
delete oldV3Save.eventId;
assert.deepEqual(normalizeStoryProgress(oldV3Save), { version: 3, ...completed });
assert.equal(normalizeStoryProgress({ ...oldSave, eventId: STORY_EVENT_IDS[0] }).eventId, null, 'The legacy v2 schema never carried an event.');

// Independent test-only oracle reads the supplied city data. It is not imported
// by the simulator or its classifier. The same route counts were also checked against
// Python city_model.evaluate: 127 affordable routes reach all five ending styles.
const catalogue = new Map(data.initiatives.map(item => [item.id, item]));
const baseline = Object.fromEntries(data.districts.map(district => [district.id, { ...district.metrics }]));
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const assess = state => {
  const districts = data.districts.map(district => ({ id: district.id, score: data.indicators.reduce((sum, indicator) => sum + indicator.weight * state[district.id][indicator.id], 0), population: district.population }));
  const minimum = Math.min(...districts.map(district => district.score));
  const average = districts.reduce((sum, district) => sum + district.score * district.population, 0);
  const critical = Object.values(state).flatMap(metrics => Object.values(metrics)).filter(value => value < 40).length;
  return { score: 0.7 * average + 0.3 * minimum - critical, critical };
};
const before = assess(baseline);
assert.equal(round(before.score), 52.56);
function evaluatePath(path) {
  const decisions = storyDecisions(path).map(decision => ({ ...decision, cost: catalogue.get(decision.initiativeId).cost, lag: catalogue.get(decision.initiativeId).lag }));
  const spent = decisions.reduce((sum, decision) => sum + decision.cost, 0);
  if (spent > data.budget) return null;
  const state = jsonClone(baseline);
  for (const decision of decisions) {
    const measure = catalogue.get(decision.initiativeId);
    const targets = measure.scope === 'city' ? Object.keys(state) : [decision.districtId];
    for (const district of targets) for (const [code, effect] of Object.entries(measure.effects)) state[district][code] += effect * (data.horizon - measure.lag) / data.horizon;
  }
  for (const synergy of data.rules.synergies) {
    if (synergy.initiativeIds.every(id => decisions.some(decision => decision.initiativeId === id))) {
      const target = decisions.find(decision => decision.initiativeId === synergy.targetInitiativeId).districtId;
      for (const [code, effect] of Object.entries(synergy.effects)) state[target][code] += effect;
    }
  }
  for (const metrics of Object.values(state)) for (const code of Object.keys(metrics)) metrics[code] = Math.max(0, Math.min(100, metrics[code]));
  const after = assess(state);
  const metrics = data.categories.map(category => {
    const indicators = data.indicators.filter(indicator => indicator.categoryId === category.id);
    const weight = indicators.reduce((sum, indicator) => sum + indicator.weight, 0);
    const mean = source => data.districts.reduce((sum, district) => sum + district.population * indicators.reduce((subtotal, indicator) => subtotal + indicator.weight * source[district.id][indicator.id], 0) / weight, 0);
    return { id: category.id, delta: round(mean(state) - mean(baseline)) };
  });
  return { decisions: decisions.sort((a, b) => Number(a.initiativeId.slice(1)) - Number(b.initiativeId.slice(1))), metrics, spent, budget: data.budget, remaining: data.budget - spent, criticalCount: after.critical, score: round(after.score), delta: round(after.score - before.score) };
}
const paths = story.reduce((prefixes, meeting) => prefixes.flatMap(prefix => meeting.choices.map((_, index) => [...prefix, index])), [[]]);
const counts = {};
for (const path of paths) {
  const evaluation = evaluatePath(path);
  if (!evaluation) continue;
  const snapshot = jsonClone(evaluation);
  const result = classifyEnding(evaluation, data.initiatives);
  counts[result.id] = (counts[result.id] || 0) + 1;
  assert.deepEqual(evaluation, snapshot, 'Classification cannot change model results.');
  assert.equal(classifyEnding({ ...evaluation, decisions: [...evaluation.decisions].reverse() }, data.initiatives).id, result.id, 'Canonical server ordering cannot change the narrative style.');
  for (const language of ['ru', 'kk', 'en']) {
    const localized = classifyEnding(evaluation, data.initiatives, language);
    assert.equal(localized.id, result.id);
    assert.equal(localized.reasons.length, 3);
    for (const text of [localized.title, localized.body, ...localized.reasons]) {
      assert.ok(text.length > 10);
      assert.doesNotMatch(text, /undefined|NaN|\{\w+\}/);
      if (language === 'en') assert.doesNotMatch(text, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
    }
  }
}
assert.deepEqual(counts, { social: 24, strained: 30, balanced: 16, green: 21, quick: 36 });
assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 127);
const examples = {
  social: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 2]],
  strained: [[0, 0, 0, 0, 1], [0, 0, 0, 1, 1]],
  balanced: [[0, 0, 2, 1, 0], [1, 0, 0, 0, 1]],
  green: [[0, 1, 0, 0, 0], [0, 1, 0, 1, 0]],
  quick: [[2, 0, 0, 0, 0], [2, 0, 0, 0, 2]],
};
for (const [id, routes] of Object.entries(examples)) for (const route of routes) assert.equal(classifyEnding(evaluatePath(route), data.initiatives).id, id);
const green = evaluatePath(examples.green[0]);
const belowThreshold = jsonClone(green);
belowThreshold.metrics.find(metric => metric.id === 'green').delta = 0.89;
assert.equal(classifyEnding(belowThreshold, data.initiatives).id, 'balanced');
belowThreshold.metrics.find(metric => metric.id === 'green').delta = 0.9;
assert.equal(classifyEnding(belowThreshold, data.initiatives).id, 'green');
const atBudgetLimit = evaluatePath(examples.strained[1]);
assert.equal(atBudgetLimit.remaining, 5);
assert.equal(classifyEnding({ ...atBudgetLimit, criticalCount: 0 }, data.initiatives).id, 'balanced');
assert.equal(classifyEnding(evaluatePath([1, 2, 0, 0, 0]), data.initiatives).id, 'social', 'Tied largest category spending counts as a social priority.');
assert.equal(classifyEnding(green, data.initiatives, 'unknown').title, classifyEnding(green, data.initiatives, 'ru').title);
assert.throws(() => classifyEnding({ ...green, decisions: [] }, data.initiatives), TypeError);
assert.throws(() => classifyEnding({ ...green, score: NaN }, data.initiatives), TypeError);
const changedResult = classifyEnding(green, data.initiatives);
changedResult.reasons.length = 0;
assert.equal(classifyEnding(green, data.initiatives).reasons.length, 3);
console.log('PASS: v3 planning, inquiries, council, explicit replan, immutable branches, v1/v2 migration, durable saves and five localized endings across 127 affordable routes.');
