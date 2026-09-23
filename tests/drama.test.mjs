import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dramaText, getCityBeat, getVisibleDecisions, getEventFeed, getConsequences, getFinalSummary, highlightDialogue } from '../public/drama.js';
import { getStory, storyDecisions } from '../public/story.js';
import { getTransition } from '../public/narrative.js';

const data = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const route = [0, 1, 0, 0, 0];
const completed = { choices: route, step: 5, phase: 'ending', inquiries: [0, 1, 0, 1, 0], council: 'review' };
// Recorded from city_model.evaluate for M7/Nura, M5/Saryarka, M1/Almaty,
// M10/Nura and M12/city, dataset version 1. This fixture contains server
// results; this test does not implement any city-model arithmetic.
const recorded = {
  budget: 100, spent: 93, remaining: 7, score: 55.34, delta: 2.78, criticalCount: 1,
  metrics: [
    { id: 'transport', before: 55.64, after: 56.99, delta: 1.35 },
    { id: 'green', before: 55.55, after: 56.51, delta: 0.96 },
    { id: 'social', before: 55.42, after: 56.22, delta: 0.8 },
    { id: 'safety', before: 59.16, after: 60.3, delta: 1.14 },
    { id: 'services', before: 58.92, after: 61.36, delta: 2.44 },
  ],
  districts: [
    { id: 'esil', metrics: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 74.38 } },
    { id: 'almaty', metrics: { T1: 44.5, T2: 81.75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 64.38 } },
    { id: 'saryarka', metrics: { T1: 50, T2: 70, E1: 42, E2: 48.75, S1: 62, S2: 68, B1: 58, B2: 55, C1: 47.5, C2: 59.38 } },
    { id: 'baikonur', metrics: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 62.38 } },
    { id: 'nura', metrics: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 48, S2: 35, B1: 67.5, B2: 51.75, C1: 60, C2: 54.38 } },
  ],
  decisions: [
    { initiativeId: 'M1', categoryId: 'transport', districtId: 'almaty', scope: 'district', cost: 18, lag: 2 },
    { initiativeId: 'M5', categoryId: 'green', districtId: 'saryarka', scope: 'district', cost: 25, lag: 3 },
    { initiativeId: 'M7', categoryId: 'social', districtId: 'nura', scope: 'district', cost: 24, lag: 3 },
    { initiativeId: 'M10', categoryId: 'safety', districtId: 'nura', scope: 'district', cost: 12, lag: 1 },
    { initiativeId: 'M12', categoryId: 'services', districtId: null, scope: 'city', cost: 14, lag: 1 },
  ],
  contributions: [
    { initiativeId: 'M1', effects: { T1: 4.5, T2: 6.75 } },
    { initiativeId: 'M5', effects: { E2: 8.75, C1: 2.5 } },
    { initiativeId: 'M7', effects: { S1: 10 } },
    { initiativeId: 'M10', effects: { B1: 10.5, B2: 1.75 } },
    { initiativeId: 'M12', effects: { C2: 4.375 } },
  ],
};
const evaluation = {
  ...recorded,
  metrics: recorded.metrics.map(metric => ({ ...metric, name: data.categories.find(category => category.id === metric.id).name })),
  districts: recorded.districts.map(district => ({ ...district, name: data.districts.find(item => item.id === district.id).name })),
  decisions: recorded.decisions.map(decision => ({ ...decision, title: data.initiatives.find(item => item.id === decision.initiativeId).title })),
};
const untouched = JSON.stringify({ data, evaluation, completed });

assert.deepEqual(getVisibleDecisions(completed), storyDecisions(route));
assert.deepEqual(getVisibleDecisions(null), []);
assert.deepEqual(getVisibleDecisions({}), []);
assert.deepEqual(getVisibleDecisions({ ...completed, phase: 'intro', step: 0 }), []);
assert.deepEqual(getVisibleDecisions({ ...completed, phase: 'planning', step: 0, planReturn: null }), []);
assert.deepEqual(getVisibleDecisions({ ...completed, phase: 'unknown' }), []);
for (let step = 0; step < 5; step += 1) {
  for (const phase of ['briefing', 'discovery', 'council', 'meeting', 'transition']) {
    const count = ['briefing', 'discovery', 'council'].includes(phase) ? step : step + 1;
    const story = { ...completed, phase, step };
    assert.deepEqual(getVisibleDecisions(story), storyDecisions(route.slice(0, count)));
    assert.deepEqual(getVisibleDecisions({ ...story, replayIndex: 4 }), getVisibleDecisions(story), 'Stale replay state cannot reveal future decisions in live scenes.');
    assert.deepEqual(getVisibleDecisions({ ...story, phase: 'planning', planReturn: { phase, step } }), getVisibleDecisions(story));
    const events = getEventFeed(story, 'en');
    assert.equal(events.length, count);
    for (let index = 0; index < count; index += 1) {
      assert.equal(events[index].initiativeId, storyDecisions(route)[index].initiativeId);
      assert.equal(events[index].text, getTransition(index, route.slice(0, index + 1), 'en').lines[0]);
      assert.match(events[index].time, /^\d{2}:\d{2}$/);
    }
  }
  const replay = { ...completed, replayIndex: step };
  assert.deepEqual(getVisibleDecisions(replay), storyDecisions(route.slice(0, step + 1)));
  assert.equal(getEventFeed(replay).length, step + 1);
}
assert.equal(getVisibleDecisions({ ...completed, replayIndex: -1 }).length, 5);
assert.equal(getVisibleDecisions({ ...completed, replayIndex: 5 }).length, 5);
assert.deepEqual(getVisibleDecisions({ phase: 'briefing', step: 2, choices: [0, 1, 99] }), storyDecisions([0, 1]));

const keys = 'hq time meeting agenda visits cityFeed cityPulse budget decisions acceptedDecisions impact now later future before forecast measureContribution contributionNotice wholePlan chooseReply you continue showAll live syntheticTransmission districtDetails mapTitle noDecisions changes noChanges decisionContext details confirm achievements problems address style replay replayHint replayNotice replayNext replayPrevious replayPrev replayClose replayProgress finalMap finalDetails scene camera message call news map lag wholeCity lastDecision funding selectedReply indicatorDetails replayTitle forecastMap openingBudget futureAfterLag noConfirmedDecision'.split(' ');
for (const language of ['ru', 'kk', 'en']) {
  for (const key of keys) {
    const value = dramaText(key, language, { current: 2, total: 5, lag: 3 });
    assert.notEqual(value, key, 'Every visible label has a translation: ' + key);
    assert.doesNotMatch(value, /undefined|NaN|\{\w+\}/);
    if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
  }
  const channels = [];
  const titles = [];
  for (let step = 0; step < 5; step += 1) {
    const beat = getCityBeat(step, completed, language);
    channels.push(beat.channel);
    titles.push(beat.title);
    assert.ok(beat.body.length > 100);
    assert.ok(beat.speaker.length > 5);
    assert.ok(data.districts.some(item => item.id === beat.districtId));
    assert.deepEqual(beat, getCityBeat(step, { choices: route.slice(0, step) }, language), 'Current/future decisions cannot alter the premeeting transmission.');
    assert.deepEqual(beat, getCityBeat(step, { choices: [...route.slice(0, step), 99, 99] }, language));
    if (language === 'en') assert.doesNotMatch([beat.title, beat.body, beat.speaker].join(' '), /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
    if (step > 0) {
      const variants = getStory()[step - 1].choices.map((_, index) => getCityBeat(step, { choices: [...route.slice(0, step - 1), index] }, language).body);
      assert.equal(new Set(variants).size, variants.length, 'Each previous choice gets its own response.');
    }
  }
  assert.equal(new Set(channels).size, 5);
  assert.equal(new Set(titles).size, 5);
  const events = getEventFeed(completed, language);
  assert.equal(events.length, 5);
  assert.ok(events.every(event => event.text.length > 50));
  const summary = getFinalSummary(data, evaluation, completed, language);
  assert.equal(summary.address.length, 3);
  assert.equal(summary.achievements.length, 3);
  assert.equal(summary.problems.length, 2);
  assert.equal(summary.style.id, 'green');
  for (const entry of [summary.address, summary.achievements.flatMap(item => [item.label, item.detail]), summary.problems.flatMap(item => [item.label, item.detail]), [summary.style.title, summary.style.body, ...summary.style.reasons]]) {
    const text = entry.join(' ');
    assert.doesNotMatch(text, /undefined|NaN|\{\w+\}/);
    if (language === 'en') assert.doesNotMatch(text, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
  }
  const facts = getConsequences(data, evaluation, 'M10', language);
  assert.equal(facts.changes.find(item => item.indicatorId === 'B1').delta, 10.5, 'The measure contributes 10.5; district total includes a separate +2 synergy.');
  assert.deepEqual(facts.districtIds, ['nura']);
  assert.equal(facts.lag, 1);
  assert.equal(facts.reaction, getTransition(3, route, language, data).lines[0]);
  assert.doesNotMatch(facts.reaction, /undefined|NaN/);
  if (language === 'en') assert.doesNotMatch([facts.title, facts.reaction, ...facts.changes.map(item => item.indicatorName)].join(' '), /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
}
assert.equal(getCityBeat(5, completed), null);
assert.equal(getCityBeat(-1, completed), null);
assert.equal(getCityBeat(1.5, completed), null);
assert.ok(getCityBeat(0, null));
assert.equal(getCityBeat(0, completed, 'unknown').title, getCityBeat(0, completed, 'ru').title);

const summary = getFinalSummary(data, evaluation, completed, 'en');
assert.deepEqual(summary.achievements.map(item => item.label), ['City services', 'Transport', 'Safety']);
assert.match(summary.achievements[0].detail, /58\.92.*61\.36.*\+2\.44/);
assert.match(summary.problems[0].detail, /35 \/ 100.*below 40/);
assert.match(summary.problems[1].detail, /40 \/ 100/);
assert.doesNotMatch(summary.problems[1].detail, /below 40|critical/i, 'Exactly40 is not a critical indicator.');
assert.match(summary.address[0], /93 of 100.*7 left/);
assert.match(summary.address[1], /55\.34.*\+2\.78/);
const noImprovements = { ...evaluation, metrics: evaluation.metrics.map(metric => ({ ...metric, delta: 0 })) };
assert.equal(getFinalSummary(data, noImprovements, completed).achievements.length, 0);
const fallback = getFinalSummary(data, { ...evaluation, districts: [] }, completed, 'en');
assert.equal(fallback.problems.length, 2);
assert.ok(fallback.problems.every(item => /did not enter/.test(item.detail)));
assert.throws(() => getFinalSummary(data, { ...evaluation, decisions: [] }, completed), TypeError);

const city = getConsequences(data, evaluation, 'M12', 'en');
assert.deepEqual(city.districtIds, ['esil', 'almaty', 'saryarka', 'baikonur', 'nura']);
assert.equal(city.changes[0].delta, 4.375, 'Keep server precision; presentation must not round or rescale contributions.');
for (const missing of [null, {}, { decisions: [], contributions: [] }, { decisions: {}, contributions: {} }]) assert.equal(getConsequences(data, missing, 'M10'), null);
assert.equal(getConsequences(data, evaluation, 'M99'), null);
assert.equal(getConsequences(data, { ...evaluation, contributions: [] }, 'M10'), null, 'Never fall back to unscaled catalogue effects.');
const sentinel = clone(evaluation);
sentinel.contributions.find(item => item.initiativeId === 'M10').effects.B1 = 7.125;
sentinel.decisions.find(item => item.initiativeId === 'M10').effects = { B1: 999 };
assert.equal(getConsequences(data, sentinel, 'M10').changes.find(item => item.indicatorId === 'B1').delta, 7.125);
const otherDistrict = clone(evaluation);
otherDistrict.decisions.find(item => item.initiativeId === 'M10').districtId = 'esil';
const otherFacts = getConsequences(data, otherDistrict, 'M10', 'en');
assert.deepEqual(otherFacts.districtIds, ['esil'], 'Use the evaluated target, not the story default or contribution target.');
assert.doesNotMatch(otherFacts.reaction, /Nura/, 'Non-story scenarios use a generic response, not a fabricated story prefix.');

const escaped = highlightDialogue('<img src=x onerror="evil()">Budget & school <script>alert(1)</script>', 'en');
assert.match(escaped, /&lt;img.*&quot;evil\(\)&quot;/);
assert.match(escaped, /<mark>Budget<\/mark>/);
assert.match(escaped, /<mark>school<\/mark>/);
assert.doesNotMatch(escaped, /<(?!\/?mark>)/);
assert.equal(highlightDialogue('chair repair budgetary', 'en'), 'chair repair budgetary');
assert.match(highlightDialogue('Бюджет школы и сроки', 'ru'), /<mark>Бюджет<\/mark>.*<mark>школы<\/mark>.*<mark>сроки<\/mark>/);
assert.match(highlightDialogue('Мектепке бюджет бөлінді', 'kk'), /<mark>Мектепке<\/mark>.*<mark>бюджет<\/mark>/);
assert.equal(highlightDialogue(null), '');
assert.equal(dramaText('unknown'), 'unknown');
assert.equal(dramaText('budget', 'unknown'), dramaText('budget', 'ru'));
for (const language of ['ru', 'kk', 'en']) {
  assert.notEqual(dramaText('schematicRoutes', language), 'schematicRoutes');
  assert.ok(dramaText('schematicRoutes', language).length > 30);
}
assert.equal(JSON.stringify({ data, evaluation, completed }), untouched, 'Presentation cannot mutate model data or save state.');
console.log('PASS: five localized city channels, causal prefixes, replay isolation, server-only contributions, final summaries and safe dialogue highlighting.');
