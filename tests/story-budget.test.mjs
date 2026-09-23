import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getStory, storyDecisions, storyOptionAvailability } from '../public/story.js';
import { STORY_CATEGORIES, defaultAllocations, normalizeAllocations, allocationSummary, plannedOptionAvailability } from '../public/story-budget.js';

const data = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
const catalogue = data.initiatives;
const initial = defaultAllocations(catalogue, data.budget);
assert.deepEqual(STORY_CATEGORIES, ['social', 'green', 'transport', 'safety', 'services']);
assert.deepEqual(initial, { social: 24, green: 20, transport: 22, safety: 12, services: 16 });
const summary = allocationSummary(initial, [], catalogue, 100);
assert.deepEqual(summary, {
  allocated: 94, reserve: 6,
  spentByCategory: { social: 0, green: 0, transport: 0, safety: 0, services: 0 },
  minimumByCategory: { social: 10, green: 15, transport: 18, safety: 10, services: 14 },
  valid: true, reason: '',
});
assert.equal(allocationSummary({ ...initial, social: 9 }, [], catalogue).reason, 'minimum');
assert.equal(allocationSummary({ ...initial, social: 23 }, [0], catalogue).reason, 'committed');
assert.equal(allocationSummary(initial, [99], catalogue).reason, 'invalid');
assert.equal(allocationSummary(initial, [], null).reason, 'unavailable');
assert.equal(allocationSummary(initial, [], [], 100).reason, 'unavailable');
assert.equal(allocationSummary(initial, [0], catalogue.filter(item => item.id !== 'M7')).reason, 'unavailable');
assert.equal(allocationSummary(initial, new Array(1), catalogue).reason, 'invalid');
assert.equal(allocationSummary(initial, [0, 2, 1, 0, 2], catalogue).valid, true);
assert.deepEqual(allocationSummary(initial, [0, 2, 1, 0, 2], catalogue).spentByCategory, initial);

const normalized = normalizeAllocations(initial, catalogue, 100);
normalized.social = 0;
assert.equal(initial.social, 24, 'Normalization returns independent objects.');
for (const invalid of [null, [], {}, { ...initial, social: -1 }, { ...initial, social: 101 }, { ...initial, social: 24.5 },
  { ...initial, social: '24' }, { ...initial, social: NaN }, { ...initial, social: Infinity }, { ...initial, services: 100 },
  { ...initial, unknownCategory: 0 }, { ...initial, safety: undefined }, { ...initial, safety: true }]) {
  assert.equal(normalizeAllocations(invalid, catalogue, 100), null);
}
assert.equal(normalizeAllocations(initial, catalogue, NaN), null);
assert.equal(normalizeAllocations(initial, catalogue, -1), null);
assert.equal(normalizeAllocations(initial, catalogue, 99.5), null);
assert.deepEqual(normalizeAllocations({ social: 0, green: 0, transport: 0, safety: 0, services: 0 }, catalogue), { social: 0, green: 0, transport: 0, safety: 0, services: 0 });

assert.equal(plannedOptionAvailability([], 0, 0, catalogue, 100, initial).allowed, true);
assert.equal(plannedOptionAvailability([0], 1, 1, catalogue, 100, initial).reason, 'allocation', 'Cleaner fuel requires moving 5 reserve units to its category.');
const greener = { ...initial, green: 25 };
assert.equal(allocationSummary(greener, [0], catalogue).valid, true);
assert.equal(plannedOptionAvailability([0], 1, 1, catalogue, 100, greener).allowed, true);
assert.equal(plannedOptionAvailability([0, 1], 2, 2, catalogue, 100, greener).reason, 'budget', 'The original whole-route budget guard takes priority.');
assert.equal(plannedOptionAvailability([], 0, 0, catalogue, 100, {}).reason, 'allocation');
assert.equal(plannedOptionAvailability([], 9, 0, catalogue, 100, initial).reason, 'invalid');
assert.equal(plannedOptionAvailability([], 0, 0, null, 100, initial).reason, 'unavailable');

const changedCatalogue = catalogue.map(item => item.id === 'M7' ? { ...item, cost: 26 } : item);
assert.equal(defaultAllocations(changedCatalogue).social, 26, 'Opening caps read catalogue prices, not hard-coded economic values.');
assert.equal(allocationSummary(initial, [0], changedCatalogue).reason, 'committed');
assert.throws(() => defaultAllocations(null), TypeError);
assert.throws(() => defaultAllocations(catalogue, 60), RangeError);
assert.throws(() => defaultAllocations(catalogue, 100, [99]), TypeError);
assert.throws(() => defaultAllocations(catalogue, 100, [0, 1, 2, 0, 1]), RangeError);
const tight = defaultAllocations(catalogue, 67);
assert.equal(allocationSummary(tight, [], catalogue, 67).valid, true);
assert.deepEqual(tight, summary.minimumByCategory);

// All 127 original affordable complete routes remain available to migrated
// saves without envelopes, and every route can receive a valid new plan.
const story = getStory();
const paths = story.reduce((prefixes, meeting) => prefixes.flatMap(prefix => meeting.choices.map((_, index) => [...prefix, index])), [[]]);
let affordable = 0;
for (const path of paths) {
  const cost = storyDecisions(path).reduce((sum, decision) => sum + catalogue.find(item => item.id === decision.initiativeId).cost, 0);
  if (cost > 100) continue;
  affordable += 1;
  const snapshot = JSON.stringify(path);
  const plan = defaultAllocations(catalogue, 100, path);
  const report = allocationSummary(plan, path, catalogue, 100);
  assert.equal(report.valid, true);
  assert.ok(report.allocated <= 100);
  assert.ok(report.reserve >= 0);
  for (let step = 0; step < path.length; step += 1) {
    const legacy = plannedOptionAvailability(path, step, path[step], catalogue, 100, null);
    assert.deepEqual(legacy, storyOptionAvailability(path, step, path[step], catalogue, 100));
    assert.equal(legacy.allowed, true);
    assert.equal(plannedOptionAvailability(path, step, path[step], catalogue, 100, plan).allowed, true);
  }
  assert.equal(JSON.stringify(path), snapshot);
}
assert.equal(affordable, 127);
console.log('PASS: catalogue-based budget envelopes, future minimums, committed spending, reserve, allocation guards and 127 legacy routes.');
