import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { civicText, getReputation, getAchievements, getCivicFinale } from '../public/civic.js';
import { renderCivicReputation, renderCivicFinale } from '../public/civic-view.js';
import { renderHQMap } from '../public/drama-view.js';

// Golden snapshots exported by Python city_model.evaluate for dataset v1.
// No city effects or Score are recalculated in this test.
const snapshots = [{"budget":100,"spent":0,"remaining":100,"delta":0,"criticalCount":2,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":0},{"id":"green","delta":0},{"id":"social","delta":0},{"id":"safety","delta":0},{"id":"services","delta":0}],"decisions":[],"districts":[{"id":"esil","before":62.99,"after":62.99,"delta":0,"metrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":57.06,"delta":0,"metrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":54.65,"delta":0,"metrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":56.63,"delta":0,"metrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":49.18,"delta":0,"metrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[]},{"budget":100,"spent":93,"remaining":7,"delta":2.78,"criticalCount":1,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":1.35},{"id":"green","delta":0.96},{"id":"social","delta":0.8},{"id":"safety","delta":1.14},{"id":"services","delta":2.44}],"decisions":[{"initiativeId":"M1","categoryId":"transport","districtId":"almaty","scope":"district","cost":18,"lag":2},{"initiativeId":"M5","categoryId":"green","districtId":"saryarka","scope":"district","cost":25,"lag":3},{"initiativeId":"M7","categoryId":"social","districtId":"nura","scope":"district","cost":24,"lag":3},{"initiativeId":"M10","categoryId":"safety","districtId":"nura","scope":"district","cost":12,"lag":1},{"initiativeId":"M12","categoryId":"services","districtId":null,"scope":"city","cost":14,"lag":1}],"districts":[{"id":"esil","before":62.99,"after":63.43,"delta":0.44,"metrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":74.38},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":58.62,"delta":1.56,"metrics":{"T1":44.5,"T2":81.75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":64.38},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":56.3,"delta":1.65,"metrics":{"T1":50,"T2":70,"E1":42,"E2":48.75,"S1":62,"S2":68,"B1":58,"B2":55,"C1":47.5,"C2":59.38},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":57.07,"delta":0.44,"metrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":62.38},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":52,"delta":2.82,"metrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":48,"S2":35,"B1":67.5,"B2":51.75,"C1":60,"C2":54.38},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[{"initiativeId":"M1","effects":{"T1":4.5,"T2":6.75}},{"initiativeId":"M5","effects":{"E2":8.75,"C1":2.5}},{"initiativeId":"M7","effects":{"S1":10}},{"initiativeId":"M10","effects":{"B1":10.5,"B2":1.75}},{"initiativeId":"M12","effects":{"C2":4.375}}]},{"budget":100,"spent":100,"remaining":0,"delta":3.15,"criticalCount":1,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":2.16},{"id":"green","delta":2.21},{"id":"social","delta":0.8},{"id":"safety","delta":1.14},{"id":"services","delta":2.19}],"decisions":[{"initiativeId":"M3","categoryId":"transport","districtId":"almaty","scope":"district","cost":30,"lag":4},{"initiativeId":"M6","categoryId":"green","districtId":null,"scope":"city","cost":20,"lag":4},{"initiativeId":"M7","categoryId":"social","districtId":"nura","scope":"district","cost":24,"lag":3},{"initiativeId":"M10","categoryId":"safety","districtId":"nura","scope":"district","cost":12,"lag":1},{"initiativeId":"M12","categoryId":"services","districtId":null,"scope":"city","cost":14,"lag":1}],"districts":[{"id":"esil","before":62.99,"after":63.82,"delta":0.83,"metrics":{"T1":45,"T2":62,"E1":70.5,"E2":73.5,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":74.38},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":59.91,"delta":2.85,"metrics":{"T1":48,"T2":85,"E1":52.5,"E2":58.5,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":64.38},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":55.48,"delta":0.83,"metrics":{"T1":50,"T2":70,"E1":44.5,"E2":41.5,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":59.38},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":57.46,"delta":0.83,"metrics":{"T1":52,"T2":68,"E1":57.5,"E2":51.5,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":62.38},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":52.39,"delta":3.21,"metrics":{"T1":55,"T2":40,"E1":47.5,"E2":66.5,"S1":48,"S2":35,"B1":67.5,"B2":51.75,"C1":60,"C2":54.38},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[{"initiativeId":"M3","effects":{"T1":8,"T2":10,"E2":2}},{"initiativeId":"M6","effects":{"E1":2.5,"E2":1.5}},{"initiativeId":"M7","effects":{"S1":10}},{"initiativeId":"M10","effects":{"B1":10.5,"B2":1.75}},{"initiativeId":"M12","effects":{"C2":4.375}}]},{"budget":100,"spent":93,"remaining":7,"delta":2.71,"criticalCount":1,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":2.02},{"id":"green","delta":1.32},{"id":"social","delta":0.8},{"id":"safety","delta":0.99},{"id":"services","delta":2.19}],"decisions":[{"initiativeId":"M3","categoryId":"transport","districtId":"almaty","scope":"district","cost":30,"lag":4},{"initiativeId":"M4","categoryId":"green","districtId":"saryarka","scope":"district","cost":15,"lag":2},{"initiativeId":"M7","categoryId":"social","districtId":"nura","scope":"district","cost":24,"lag":3},{"initiativeId":"M11","categoryId":"safety","districtId":"nura","scope":"district","cost":10,"lag":1},{"initiativeId":"M12","categoryId":"services","districtId":null,"scope":"city","cost":14,"lag":1}],"districts":[{"id":"esil","before":62.99,"after":63.43,"delta":0.44,"metrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":74.38},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":59.52,"delta":2.46,"metrics":{"T1":48,"T2":85,"E1":50,"E2":57,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":64.38},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":56.28,"delta":1.63,"metrics":{"T1":50,"T2":70,"E1":51,"E2":42.25,"S1":62,"S2":68,"B1":59.5,"B2":55,"C1":45,"C2":59.38},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":57.07,"delta":0.44,"metrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":62.38},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":51.49,"delta":2.31,"metrics":{"T1":53.25,"T2":40,"E1":45,"E2":65,"S1":48,"S2":35,"B1":55,"B2":60.5,"C1":60,"C2":54.38},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[{"initiativeId":"M3","effects":{"T1":8,"T2":10,"E2":2}},{"initiativeId":"M4","effects":{"E1":9,"E2":2.25,"B1":1.5}},{"initiativeId":"M7","effects":{"S1":10}},{"initiativeId":"M11","effects":{"B2":10.5,"T1":-1.75}},{"initiativeId":"M12","effects":{"C2":4.375}}]},{"budget":100,"spent":67,"remaining":33,"delta":2.45,"criticalCount":1,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":1.21},{"id":"green","delta":1.06},{"id":"social","delta":0.42},{"id":"safety","delta":1.2},{"id":"services","delta":2.19}],"decisions":[{"initiativeId":"M1","categoryId":"transport","districtId":"almaty","scope":"district","cost":18,"lag":2},{"initiativeId":"M4","categoryId":"green","districtId":"saryarka","scope":"district","cost":15,"lag":2},{"initiativeId":"M9","categoryId":"social","districtId":"nura","scope":"district","cost":10,"lag":1},{"initiativeId":"M11","categoryId":"safety","districtId":"nura","scope":"district","cost":10,"lag":1},{"initiativeId":"M12","categoryId":"services","districtId":null,"scope":"city","cost":14,"lag":1}],"districts":[{"id":"esil","before":62.99,"after":63.43,"delta":0.44,"metrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":74.38},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":58.62,"delta":1.56,"metrics":{"T1":44.5,"T2":81.75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":64.38},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":56.28,"delta":1.63,"metrics":{"T1":50,"T2":70,"E1":51,"E2":42.25,"S1":62,"S2":68,"B1":59.5,"B2":55,"C1":45,"C2":59.38},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":57.07,"delta":0.44,"metrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":62.38},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":51.2,"delta":2.02,"metrics":{"T1":53.25,"T2":40,"E1":45,"E2":65,"S1":40.62,"S2":37.62,"B1":57.62,"B2":60.5,"C1":60,"C2":54.38},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[{"initiativeId":"M1","effects":{"T1":4.5,"T2":6.75}},{"initiativeId":"M4","effects":{"E1":9,"E2":2.25,"B1":1.5}},{"initiativeId":"M9","effects":{"S1":2.625,"S2":2.625,"B1":2.625}},{"initiativeId":"M11","effects":{"B2":10.5,"T1":-1.75}},{"initiativeId":"M12","effects":{"C2":4.375}}]},{"budget":100,"spent":83,"remaining":17,"delta":2.78,"criticalCount":1,"baselineCriticalCount":2,"metrics":[{"id":"transport","delta":1.35},{"id":"green","delta":1.06},{"id":"social","delta":0.8},{"id":"safety","delta":1.29},{"id":"services","delta":2.19}],"decisions":[{"initiativeId":"M1","categoryId":"transport","districtId":"almaty","scope":"district","cost":18,"lag":2},{"initiativeId":"M4","categoryId":"green","districtId":"saryarka","scope":"district","cost":15,"lag":2},{"initiativeId":"M7","categoryId":"social","districtId":"nura","scope":"district","cost":24,"lag":3},{"initiativeId":"M10","categoryId":"safety","districtId":"nura","scope":"district","cost":12,"lag":1},{"initiativeId":"M12","categoryId":"services","districtId":null,"scope":"city","cost":14,"lag":1}],"districts":[{"id":"esil","before":62.99,"after":63.43,"delta":0.44,"metrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":74.38},"baselineMetrics":{"T1":45,"T2":62,"E1":68,"E2":72,"S1":48,"S2":55,"B1":78,"B2":60,"C1":75,"C2":70}},{"id":"almaty","before":57.06,"after":58.62,"delta":1.56,"metrics":{"T1":44.5,"T2":81.75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":64.38},"baselineMetrics":{"T1":40,"T2":75,"E1":50,"E2":55,"S1":60,"S2":65,"B1":62,"B2":52,"C1":50,"C2":60}},{"id":"saryarka","before":54.65,"after":56.28,"delta":1.63,"metrics":{"T1":50,"T2":70,"E1":51,"E2":42.25,"S1":62,"S2":68,"B1":59.5,"B2":55,"C1":45,"C2":59.38},"baselineMetrics":{"T1":50,"T2":70,"E1":42,"E2":40,"S1":62,"S2":68,"B1":58,"B2":55,"C1":45,"C2":55}},{"id":"baikonur","before":56.63,"after":57.07,"delta":0.44,"metrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":62.38},"baselineMetrics":{"T1":52,"T2":68,"E1":55,"E2":50,"S1":58,"S2":60,"B1":52,"B2":58,"C1":55,"C2":58}},{"id":"nura","before":49.18,"after":52,"delta":2.82,"metrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":48,"S2":35,"B1":67.5,"B2":51.75,"C1":60,"C2":54.38},"baselineMetrics":{"T1":55,"T2":40,"E1":45,"E2":65,"S1":38,"S2":35,"B1":55,"B2":50,"C1":60,"C2":50}}],"contributions":[{"initiativeId":"M1","effects":{"T1":4.5,"T2":6.75}},{"initiativeId":"M4","effects":{"E1":9,"E2":2.25,"B1":1.5}},{"initiativeId":"M7","effects":{"S1":10}},{"initiativeId":"M10","effects":{"B1":10.5,"B2":1.75}},{"initiativeId":"M12","effects":{"C2":4.375}}]}];
const raw = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const hydrate = evaluation => ({ ...evaluation,
  metrics: evaluation.metrics.map(metric => ({ ...metric, name: raw.categories.find(item => item.id === metric.id).name })),
  districts: evaluation.districts.map(district => ({ ...district, name: raw.districts.find(item => item.id === district.id).name })),
  decisions: evaluation.decisions.map(decision => ({ ...decision, title: raw.initiatives.find(item => item.id === decision.initiativeId).title })),
});
const evaluations = snapshots.map(hydrate);
const data = { ...raw, baseline: evaluations[0] };
const paths = [[], [0, 1, 0, 0, 0], [0, 2, 2, 0, 0], [0, 0, 2, 1, 0], [2, 0, 0, 1, 0], [0, 0, 0, 0, 0]];
const storyAt = index => ({ choices: [...paths[index]], phase: index ? 'ending' : 'intro', step: index ? 5 : 0 });
const evaluation = evaluations[1];
const story = storyAt(1);
const context = { data, evaluation, story, language: 'en', icon: () => '', num: value => String(value), signed: value => `${value > 0 ? '+' : ''}${value}` };
const snapshot = JSON.stringify({ data, evaluations, story });

assert.deepEqual(getReputation(data, evaluations[0], storyAt(0)).items.map(item => item.value), [50, 50, 50, 50]);
assert.deepEqual(getReputation(data, evaluation, story).items.map(item => item.value), [58, 59, 55, 63]);
assert.deepEqual(getReputation(data, evaluation, story), getReputation(data, evaluation, story), 'Rendering does not accumulate reputation.');
const high = clone(evaluation);
high.metrics.forEach(metric => { metric.delta = 200; });
assert.ok(getReputation(data, high, story).items.every(item => item.value === 100));
high.metrics.forEach(metric => { metric.delta = -200; });
assert.ok(getReputation(data, high, story).items.every(item => item.value === 0));
const wrongPrefix = { ...story, step: 2, phase: 'briefing' };
assert.equal(getReputation(data, evaluation, wrongPrefix).ready, false, 'Do not expose full-plan reputation before its server prefix has been evaluated.');
assert.ok(getReputation(data, evaluation, wrongPrefix).items.every(item => item.value === null));
assert.ok(getAchievements(data, evaluation, wrongPrefix).every(item => !item.earned));
assert.equal(getReputation(data, evaluation, { ...story, replayIndex: 0 }).ready, false);
assert.equal(getReputation(data, evaluation, { ...story, replayIndex: 4 }).ready, true);
assert.equal(getCivicFinale(data, evaluation, wrongPrefix).profile.id, 'pending');
const duplicate = { ...evaluation, decisions: evaluation.decisions.map(() => evaluation.decisions[0]) };
assert.equal(getReputation(data, duplicate, story).ready, false);
assert.equal(getReputation(data, { ...evaluation, metrics: [] }, story).ready, false);

const names = ['Голос районов', 'Ни одного лишнего тенге', 'Зелёный курс', 'Сначала люди', 'Аким за пять часов'];
assert.deepEqual(getAchievements(data, evaluation, story).map(item => item.label), names);
assert.ok(getAchievements(data, evaluations[0], storyAt(0)).every(item => !item.earned));
const allEarned = getAchievements(data, evaluations[2], storyAt(2));
assert.equal(evaluations[2].spent, 100);
assert.ok(allEarned.every(item => item.earned), 'All five milestones are reachable in one valid server-evaluated scenario.');
assert.equal(getAchievements(data, evaluation, story).find(item => item.id === 'exact').earned, false);
assert.equal(getAchievements(data, evaluation, story).find(item => item.id === 'people').earned, true);

for (const [index, profile] of [[1, 'green'], [2, 'crisis'], [3, 'reformer'], [4, 'balanced'], [5, 'social']]) {
  const report = getCivicFinale(data, evaluations[index], storyAt(index), 'en');
  assert.equal(report.profile.id, profile);
  assert.ok(report.winners.length > 0);
  assert.ok(report.winners.every(item => item.delta > 0));
  assert.deepEqual(report.winners.map(item => item.delta), [...report.winners.map(item => item.delta)].sort((left, right) => right - left));
}
const finale = getCivicFinale(data, evaluation, story, 'en');
assert.equal(finale.winners[0].districtId, 'nura');
assert.equal(finale.winners[0].delta, 2.82);
assert.match(finale.winners[0].detail, /49\.18.*52.*\+2\.82/);
assert.ok(finale.tradeoffs.some(item => item.id === 'waiting'));
assert.ok(finale.tradeoffs.some(item => item.id === 'unmet' && /35\/100/.test(item.detail)));
const crossing = getCivicFinale(data, evaluations[3], storyAt(3), 'en').tradeoffs.find(item => item.id === 'crossing');
assert.ok(crossing);
assert.match(crossing.detail, /T1 -1\.75.*Nura/);
const alteredContribution = clone(evaluations[3]);
alteredContribution.contributions.find(item => item.initiativeId === 'M11').effects.T1 = -0.25;
assert.match(getCivicFinale(data, alteredContribution, storyAt(3), 'en').tradeoffs.find(item => item.id === 'crossing').detail, /T1 -0\.25/);

const keys = 'reputation notice rules rounding pending trust business environment efficiency trustRule businessRule environmentRule efficiencyRule achievements achievementNotice earned locked voices voicesDetail exact exactDetail green greenDetail people peopleDetail day dayDetail profile profileNote profileSocial profileSocialBody profileGreen profileGreenBody profileCrisis profileCrisisBody profileReformer profileReformerBody profileBalanced profileBalancedBody winners winnerDetail noWinners tradeoffs crossing crossingDetail waiting waitingDetail unmet unmetDetail reviewNeeds reviewNeedsDetail mapLegend mapCritical mapImproving mapStable mapCategories'.split(' ');
for (const language of ['ru', 'kk', 'en']) {
  for (const key of keys) {
    const value = civicText(key, language, { budget: 100, before: 40, after: 45, delta: '+5', district: 'Nura', indicator: 'S2', count: 2, value: 35 });
    assert.notEqual(value, key);
    assert.doesNotMatch(value, /undefined|NaN|\{\w+\}/);
    if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
  }
  const report = getCivicFinale(data, evaluation, story, language);
  const prose = [report.profile.title, report.profile.body, ...report.winners.flatMap(item => [item.label, item.detail]), ...report.tradeoffs.flatMap(item => [item.label, item.detail]), ...report.achievements.flatMap(item => [item.label, item.detail])].join(' ');
  assert.doesNotMatch(prose, /undefined|NaN|\{\w+\}/);
  if (language === 'en') assert.doesNotMatch(prose, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
  const compact = renderCivicReputation({ ...context, language });
  assert.equal((compact.match(/<meter /g) || []).length, 4);
  assert.equal((compact.match(/<label for=/g) || []).length, 4);
  assert.match(compact, /<details class="civic-rules">/);
  const full = renderCivicFinale({ ...context, language });
  assert.equal((full.match(/data-achievement=/g) || []).length, 5);
  assert.doesNotMatch(full, /undefined|NaN|\{\w+\}/);
  const map = renderHQMap({ ...context, language });
  assert.match(map, /data-id="nura" data-state="critical"/);
  assert.match(map, /data-id="esil" data-state="improving"/);
  assert.match(map, /class="civic-map-legend"/);
  assert.match(map, /data-category="transport"/);
  assert.match(map, /hq-map-category-dots/);
  assert.doesNotMatch(map, /mapLegend|mapCritical|mapImproving|mapStable/);
}
const baselineMap = renderHQMap({ ...context, evaluation: data.baseline, story: storyAt(0) });
assert.match(baselineMap, /data-id="esil" data-state="stable"/);
assert.match(baselineMap, /data-id="nura" data-state="critical"/);
assert.doesNotMatch(baselineMap, /class="hq-map-routes"/);
const threshold = clone(data.baseline);
threshold.districts.find(item => item.id === 'nura').metrics.S1 = 40;
threshold.districts.find(item => item.id === 'nura').metrics.S2 = 40;
assert.match(renderHQMap({ ...context, evaluation: threshold, story: storyAt(0) }), /data-id="nura" data-state="stable"/);
const hostile = clone(data);
hostile.budget = '<img src=x onerror=alert(1)>';
assert.doesNotMatch(renderCivicFinale({ ...context, data: hostile }), /<img/);
assert.equal(JSON.stringify({ data, evaluations, story }), snapshot, 'Reputation, achievements, replay and map rendering cannot mutate model values or saves.');
assert.equal(civicText('notice', 'unknown'), civicText('notice', 'ru'));
console.log('PASS: four transparent narrative indices, five exact localized milestones, five leadership profiles, server-grounded tradeoffs and causal district states.');
