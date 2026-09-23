/**
 * Optional JavaScript regression checks, without browser or npm dependencies.
 * Start `py server.py`, then run `node tests/frontend_smoke.mjs` (Node 18+).
 * Only bootstrap/evaluate call the server. AI responses are always mocked.
 * These checks exercise state and generated HTML, not browser layout.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import vm from 'node:vm';
import * as localization from '../public/i18n.js';
import * as gamePreferences from '../public/preferences.js';
import * as storyModel from '../public/story.js';
import * as storyPresentation from '../public/story-view.js';
import * as storyFlow from '../public/story-flow.js';
import { createMusicPlayer } from '../public/music.js';

function localApi(path, decisions) {
  return new Promise((resolve, reject) => {
    const body = decisions === undefined ? null : JSON.stringify({ decisions });
    const req = request({
      hostname: '127.0.0.1', port: Number(process.env.TEST_PORT || 8080), path,
      method: body ? 'POST' : 'GET', timeout: 5000,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) throw new Error(`HTTP ${response.statusCode}: ${data}`);
          resolve(JSON.parse(data));
        } catch (error) { reject(error); }
      });
      response.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Start the simulator on port 8080 before running this test.')));
    req.end(body);
  });
}

const bootstrap = await localApi('/api/bootstrap');
const choices = [['M7', 'nura'], ['M8', 'nura'], ['M10', 'nura'], ['M12'], ['M5', 'saryarka']]
  .map(([initiativeId, districtId]) => ({
    initiativeId, categoryId: bootstrap.initiatives.find(m => m.id === initiativeId).categoryId,
    ...(districtId ? { districtId } : {}),
  }));
const evaluation = await localApi('/api/evaluate', choices);
const example = {
  evaluation,
  analysis: {
    mode: 'demo', summary: 'Демонстрационный тестовый разбор.',
    strengths: ['Нура получила улучшения.'], risks: ['Эффект появляется с задержкой.'],
    recommendations: ['Сравните альтернативный сценарий.'], notice: 'Тест без вызова LLM.',
  },
};
const nodes = {
  app: { innerHTML: '', contains: () => false, querySelectorAll: () => [] },
  toast: { innerHTML: '', className: '' }, main: { id: 'main', focus() {} },
};
const storage = new Map();
const events = {};
const windowEvents = {};
const musicCalls = [];
let downloaded;
let downloadClicks = 0;
const context = vm.createContext({
  ...localization, ...gamePreferences, ...storyModel, ...storyPresentation, ...storyFlow,
  createMusicPlayer(getPreferences, environment) {
    const player = createMusicPlayer(getPreferences, environment);
    return Object.fromEntries(['unlock', 'setScene', 'sync', 'stop'].map(method => [method, (...args) => {
      musicCalls.push([method, ...args]);
      return player[method](...args);
    }]));
  },
  bootstrap, example,
  document: {
    documentElement: { lang: 'ru', style: { setProperty() {} } },
    activeElement: null,
    querySelector: selector => selector === '#app' ? nodes.app : selector === '#toast' ? nodes.toast : nodes.main,
    addEventListener: (name, handler) => { events[name] = handler; },
    createElement: () => ({ click() { downloadClicks += 1; } }),
  },
  setTimeout() {}, clearTimeout() {},
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  Blob: class { constructor(parts) { downloaded = parts.join(''); } },
  AbortSignal: { timeout() {} }, structuredClone: value => JSON.parse(JSON.stringify(value)),
  crypto: { randomUUID: () => 'test-id' },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  window: { scrollTo() {}, print() {}, addEventListener: (name, handler) => { windowEvents[name] = handler; } },
});
const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(/boot\(\);\s*$/, ''), context);
const run = code => vm.runInContext(code, context);
const click = (action, extra = {}) => events.click({
  target: { closest: () => ({ dataset: { action, ...extra } }) }, preventDefault() {},
});

run('state.data=bootstrap; state.evaluation=bootstrap.baseline; state.loading=false; render();');
assert.ok(nodes.app.innerHTML.includes('Начать игру'));
assert.equal((nodes.app.innerHTML.match(/data-action=/g) || []).length, 3);
assert.ok(musicCalls.some(call => call[0] === 'setScene' && call[1] === 'ambient'));
assert.ok(!musicCalls.some(call => call[0] === 'unlock'), 'Rendering alone never unlocks autoplay.');
await events.click({ isTrusted: false, target: { closest: () => null } });
assert.ok(!musicCalls.some(call => call[0] === 'unlock'), 'Synthetic clicks cannot unlock music.');
await events.click({ isTrusted: true, target: { closest: () => null } });
assert.equal(musicCalls.filter(call => call[0] === 'unlock').length, 1);
await click('start-game');
assert.equal(run('state.page'), 'story');
assert.equal(run('state.story.phase'), 'intro');
assert.equal(run('state.story.introStep'), 0);
assert.ok(!nodes.app.innerHTML.includes('data-action="story-select"'));
await click('intro-next');
assert.equal(run('state.story.introStep'), 1);
await run('restoreStory()');
assert.equal(run('state.story.introStep'), 1, 'The prologue resumes on the saved frame.');
await click('intro-back');
for (let frame = 0; frame < 4; frame += 1) {
  assert.equal(run('state.story.introStep'), frame);
  assert.equal(run('state.story.evaluation.remaining'), 100);
  await click('intro-next');
}
assert.equal(run('state.story.phase'), 'meeting');
assert.equal(run('state.story.choices.length'), 0);
assert.ok(nodes.app.innerHTML.includes('Айгуль Садыкова'));
assert.ok(nodes.app.innerHTML.includes('/portraits/character-0.png'));
await click('story-simulator');
assert.ok(nodes.app.innerHTML.includes('52,56'));
assert.ok(nodes.app.innerHTML.includes('city-map.svg'));
assert.equal(bootstrap.budget, 100);
assert.equal(evaluation.score, 56.54);

const optimum = await localApi('/api/optimize', choices);
context.fetch = async path => ({ ok: true, json: async () => path === '/api/optimize' ? optimum : path === '/api/analyze' ? example : evaluation });
await click('preset');
assert.equal(run('state.decisions.length'), 5);
assert.equal(run('state.evaluation.spent'), 95);
await click('analyze');
assert.equal(run('state.page'), 'report');
assert.ok(nodes.app.innerHTML.includes('M10+M12'));
assert.ok(nodes.app.innerHTML.includes('Демонстрационный разбор'));
assert.equal(run('state.saved.length'), 1);
assert.ok(nodes.app.innerHTML.includes('data-action="optimize"'));
await click('optimize');
assert.equal(run('state.report.optimizer.bestScore'), optimum.bestScore);
assert.equal(run('state.report.optimizing'), false);
assert.ok(!nodes.app.innerHTML.includes('data-action="optimize"'));
for (const page of ['simulation', 'report', 'compare', 'method']) {
  await click('nav', { page });
  assert.ok(!/undefined|NaN/.test(nodes.app.innerHTML), `Invalid generated HTML on ${page}`);
}

await click('export');
assert.equal(downloadClicks, 1);
assert.equal(JSON.parse(downloaded).evaluation.score, 56.54);
assert.equal(JSON.parse(downloaded).datasetVersion, bootstrap.version);

context.broken = run('({...state.report, evaluation:{...state.report.evaluation, decisions:[null,null,null,null,null]}})');
assert.equal(await run('restoreSavedReport(broken,state.data.version)'), null);
context.forged = run('({...state.report, evaluation:{...state.report.evaluation, score:999}})');
assert.equal((await run('restoreSavedReport(forged,state.data.version)')).evaluation.score, 56.54);
assert.equal(await run('restoreSavedReport(forged,"old-version")'), null);

let resolveAnalysis;
context.fetch = () => new Promise(resolve => { resolveAnalysis = resolve; });
run('state.page="simulation"; state.report=null; state.saved=[]; render();');
const pending = run('analyze()');
assert.equal(run('state.analyzing'), true);
run('state.decisions=[]; state.evaluation=bootstrap.baseline; state.name="New draft"; render();');
resolveAnalysis({ ok: true, json: async () => example });
await pending;
assert.equal(run('state.page'), 'simulation');
assert.equal(run('state.report'), null);
assert.equal(run('state.saved.length'), 1);
assert.equal(run('state.analyzing'), false);

context.fetch = async () => ({ ok: false, json: async () => ({ error: 'Budget rejection' }) });
assert.equal(await run('setDecisions([{categoryId:"transport",initiativeId:"M1",districtId:"nura"}])'), false);
assert.equal(run('state.decisions.length'), 0);
assert.equal(run('state.evaluation.score'), 52.56);
assert.equal(run('state.busy'), false);

await click('game-menu');
await click('open-settings');
assert.equal(run('state.page'), 'settings');
assert.ok(nodes.app.innerHTML.includes('id="volume"'));
assert.ok(nodes.app.innerHTML.includes('id="brightness"'));
assert.ok(nodes.app.innerHTML.includes('id="language"'));
const input = (setting, value) => events.input({ target: { dataset: { setting }, value, setAttribute() {} } });
input('volume', '23');
input('brightness', '70');
assert.ok(nodes.app.innerHTML.includes('id="musicVolume"'));
assert.ok(nodes.app.innerHTML.includes('data-action="toggle-music"'));
input('musicVolume', '17');
assert.equal(run('preferences.musicVolume'), 17);
assert.equal(run('preferences.musicEnabled'), true);
await click('toggle-music');
assert.equal(run('preferences.musicEnabled'), false);
assert.equal(run('preferences.volume'), 23);
await click('toggle-music');
assert.equal(run('preferences.volume'), 23);
assert.equal(run('preferences.brightness'), 70);
await click('toggle-sound');
assert.equal(run('preferences.muted'), true);
assert.equal(run('preferences.musicEnabled'), true, 'Muting interface sounds does not mute music.');
await events.change({ target: { dataset: { setting: 'language' }, value: 'en' } });
assert.ok(nodes.app.innerHTML.includes('Settings'));
assert.ok(nodes.app.innerHTML.includes('Background music'));
assert.equal(context.document.documentElement.lang, 'en');
await click('game-menu');
assert.ok(nodes.app.innerHTML.includes('Start game'));
assert.ok(nodes.app.innerHTML.includes('Exit game'));
await click('start-game');
assert.ok(nodes.app.innerHTML.includes('Aigul'));
await click('story-simulator');
assert.ok(nodes.app.innerHTML.includes('Your city. Your decisions.'));
assert.equal(run('state.evaluation.score'), 52.56);
await click('game-menu');
await click('open-settings');
await events.change({ target: { dataset: { setting: 'language' }, value: 'kk' } });
assert.ok(nodes.app.innerHTML.includes('Баптаулар'));
const savedPreferences = JSON.parse(storage.get(gamePreferences.SETTINGS_STORAGE));
assert.equal(savedPreferences.language, 'kk');
assert.equal(savedPreferences.volume, 23);
assert.equal(savedPreferences.brightness, 70);
assert.equal(savedPreferences.musicVolume, 17);
assert.equal(savedPreferences.musicEnabled, true);
await click('reset-settings');
assert.equal(run('preferences.language'), 'ru');
assert.equal(run('preferences.brightness'), 100);
assert.equal(run('preferences.musicVolume'), 30);
assert.equal(run('preferences.musicEnabled'), true);
await click('game-menu');
const decisionsBeforeExit = run('decisionKey(state.decisions)');
await click('exit-game');
assert.equal(run('state.page'), 'exited');
assert.deepEqual(musicCalls.at(-1), ['setScene', null]);
assert.ok(nodes.app.innerHTML.includes('Игра завершена'));
assert.equal(run('decisionKey(state.decisions)'), decisionsBeforeExit);
await click('game-menu');
await click('start-game');
assert.equal(run('state.page'), 'story');

// A full story uses real server calculations and leaves the sandbox draft intact.
context.fetch = async (path, options) => ({ ok: true, json: async () => path === '/api/analyze' ? example : await localApi(path, options?.body ? JSON.parse(options.body).decisions : undefined) });
for (let step = 0; step < 5; step += 1) {
  assert.equal(run('state.story.step'), step);
  assert.equal(run('state.story.selected'), null);
  assert.ok(nodes.app.innerHTML.includes(`/portraits/character-${step}.png`));
  assert.ok(!/\{(?:current|total)\}/.test(nodes.app.innerHTML), 'Progress labels must interpolate their counts.');
  await click('story-select', { id: '0' });
  assert.equal(run('state.story.choices.length'), step, 'A preview must not spend money.');
  await click('story-confirm');
  assert.equal(run('state.story.choices.length'), step + 1);
  assert.equal(run('state.story.evaluation.decisions.length'), step + 1);
  assert.ok(nodes.app.innerHTML.includes('story-acknowledgement'));
  await click('story-next');
  assert.equal(run('state.story.phase'), 'transition');
  assert.equal(run('state.story.step'), step);
  assert.ok(nodes.app.innerHTML.includes('data-action="transition-next"'));
  assert.ok(!nodes.app.innerHTML.includes('data-action="story-select"'));
  await click('story-back');
  assert.equal(run('state.story.phase'), 'meeting');
  assert.equal(run('state.story.step'), step, 'Back from a reaction returns to its own meeting.');
  await click('story-next');
  const savedChoices = run('JSON.stringify(state.story.choices)');
  await run('restoreStory()');
  assert.equal(run('state.story.phase'), 'transition', 'Reload preserves the city reaction scene.');
  assert.equal(run('JSON.stringify(state.story.choices)'), savedChoices);
  await click('transition-next');
}
assert.equal(run('state.story.step'), 5);
assert.equal(run('state.story.phase'), 'ending');
assert.deepEqual(musicCalls.at(-1), ['setScene', 'finale']);
assert.equal(run('state.story.evaluation.spent'), 83);
assert.equal(run('state.story.evaluation.complete'), true);
assert.equal(run('decisionKey(state.decisions)'), decisionsBeforeExit);
assert.ok(nodes.app.innerHTML.includes('ASTANA QUALITY OF LIFE SCORE'));
assert.ok(!/undefined|NaN/.test(nodes.app.innerHTML));
const storyScore = run('state.story.evaluation.score');
const storySave = storage.get('akim-story-v1');
run('state.story.choices=[]; state.story.step=0; state.story.evaluation=null');
await run('restoreStory()');
assert.equal(run('state.story.step'), 5);
assert.equal(run('state.story.choices.length'), 5);
assert.equal(run('state.story.evaluation.score'), storyScore);
assert.equal(JSON.parse(storySave).datasetVersion, bootstrap.version);
assert.equal(JSON.parse(storySave).version, 2);
assert.deepEqual(JSON.parse(storySave).decisionIds, ['M7', 'M4', 'M1', 'M10', 'M12']);
assert.equal(JSON.parse(storySave).choices, undefined, 'New saves use stable initiative IDs.');

// All five endings must be reachable with real validated server calculations.
const endingExamples = {
  social: [0, 0, 0, 0, 0], green: [0, 1, 0, 0, 0], quick: [2, 0, 0, 0, 0],
  balanced: [0, 0, 2, 1, 0], strained: [0, 0, 0, 0, 1],
};
for (const [id, indices] of Object.entries(endingExamples)) {
  const result = await localApi('/api/evaluate', storyModel.storyDecisions(indices));
  for (const language of ['ru', 'kk', 'en']) {
    const ending = storyFlow.classifyEnding(result, bootstrap.initiatives, language);
    assert.equal(ending.id, id);
    assert.ok(ending.title && ending.body && ending.reasons.length);
  }
}

// Legacy saves continue their meeting and keep the original choices.
storage.set('akim-story-v1', JSON.stringify({ version: 1, datasetVersion: bootstrap.version, choices: [0, 1], step: 1 }));
await run('restoreStory()');
assert.equal(run('state.story.phase'), 'meeting');
assert.equal(run('state.story.step'), 1);
assert.equal(run('JSON.stringify(state.story.choices)'), '[0,1]');
storage.set('akim-story-v1', storySave);
await run('restoreStory()');

// Revisiting a meeting is harmless until a different answer is confirmed.
const healthyFetch = context.fetch;
context.fetch = async () => { throw new Error('Temporary prefix-evaluation failure'); };
await click('story-edit');
assert.equal(run('state.story.phase'), 'ending', 'Failed scene evaluation leaves the current scene intact.');
assert.equal(run('state.story.choices.length'), 5);
assert.equal(run('state.storyBusy'), false);
context.fetch = healthyFetch;
await click('story-edit');
assert.equal(run('state.story.choices.length'), 5);
assert.equal(run('state.story.evaluation.spent'), 83, 'Revisiting keeps the full confirmed plan.');
assert.equal(run('state.story.sceneEvaluation.spent'), 24, 'The scene shows only decisions made by this point.');
assert.equal(run('state.story.sceneEvaluation.remaining'), 76);
assert.equal(run('state.story.sceneEvaluation.decisions.length'), 1);
await click('story-next');
assert.equal(run('state.story.phase'), 'transition');
assert.equal(run('state.story.sceneEvaluation.decisions.length'), 1, 'Early maps cannot reveal later initiatives or synergies.');
await run('restoreStory()');
assert.equal(run('state.story.sceneEvaluation.spent'), 24, 'Restoring an early scene reevaluates its own prefix.');
assert.equal(run('state.story.evaluation.spent'), 83);
await click('story-back');
await click('story-select', { id: '2' });
assert.equal(run('state.story.choices.length'), 5);
await click('story-confirm');
assert.equal(run('state.story.choices.length'), 1);
assert.equal(run('state.story.evaluation.spent'), 10);
assert.notEqual(run('state.story.evaluation.score'), storyScore);
await click('story-restart');
await click('story-restart-cancel');
assert.equal(run('state.story.choices.length'), 1);
await click('story-restart');
await click('story-restart-confirm');
assert.equal(run('state.story.choices.length'), 0);
assert.equal(run('state.story.evaluation.remaining'), 100);
assert.equal(run('state.story.phase'), 'intro');
for (let frame = 0; frame < 4; frame += 1) await click('intro-next');

// Expensive choices are blocked before they make the final meetings impossible.
for (const id of ['0', '1']) {
  await click('story-select', { id });
  await click('story-confirm');
  await click('story-next');
  await click('transition-next');
}
await click('story-select', { id: '2' }); // 24 + 25 + 30 + minimum 10 + 14 = 103.
assert.equal(run('state.story.selected'), null);
assert.ok(nodes.app.innerHTML.includes('story-choice-reason'));
assert.equal(run('state.story.evaluation.spent'), 49);
await click('story-select', { id: '0' });
context.fetch = async () => ({ ok: false, json: async () => ({ error: 'Story evaluation rejected' }) });
await click('story-confirm');
assert.equal(run('state.story.choices.length'), 2);
assert.equal(run('state.storyBusy'), false);

// Corrupt progress is discarded; stored numeric results are always ignored.
storage.set('akim-story-v1', JSON.stringify({ version: 1, datasetVersion: bootstrap.version, choices: [99], step: 1 }));
await run('restoreStory()');
assert.equal(run('state.story.choices.length'), 0);
storage.set('akim-story-v1', storySave);
context.fetch = async (path, options) => ({ ok: true, json: async () => await localApi(path, options?.body ? JSON.parse(options.body).decisions : undefined) });
await run('restoreStory()');
await click('story-open-scenario');
assert.equal(run('state.page'), 'simulation');
assert.equal(run('state.evaluation.score'), storyScore);
assert.equal(run('state.decisions.length'), 5);
assert.equal(run('state.story.choices.length'), 5);

// The story hands its own calculation to the existing analysis/report flow.
await click('story-resume');
context.fetch = async (path, options) => {
  const payload = JSON.parse(options.body);
  const evaluated = await localApi('/api/evaluate', payload.decisions);
  return { ok: true, json: async () => path === '/api/analyze' ? { evaluation: evaluated, analysis: { ...example.analysis, language: payload.language } } : evaluated };
};
await click('story-analyze');
assert.equal(run('state.page'), 'report');
assert.equal(run('state.report.evaluation.score'), storyScore);
assert.equal(run('state.report.evaluation.spent'), 83);

// A response cannot reopen the game after the player has left it.
await click('story-resume');
let resolveStoryTransfer;
context.fetch = () => new Promise(resolve => { resolveStoryTransfer = resolve; });
const transfer = click('story-open-scenario');
await click('exit-game');
resolveStoryTransfer({ ok: true, json: async () => evaluation });
await transfer;
assert.equal(run('state.page'), 'exited');

// A transient restore failure must not erase valid saved progress on exit.
const preservedStory = storage.get('akim-story-v1');
const preservedDraft = storage.get('akim-simulator-v1');
context.fetch = async path => {
  if (path === '/api/bootstrap') return { ok: true, json: async () => bootstrap };
  throw new Error('Temporary network failure');
};
run('state.page="menu"');
await run('boot()');
assert.equal(run('state.storyRestorePending'), true);
assert.ok(run('state.loadError.length') > 0);
await click('exit-game');
assert.equal(storage.get('akim-story-v1'), preservedStory);
assert.equal(storage.get('akim-simulator-v1'), preservedDraft);
context.fetch = async (path, options) => ({ ok: true, json: async () => await localApi(path, options?.body ? JSON.parse(options.body).decisions : undefined) });
await click('game-menu');
await click('start-game');
assert.equal(run('state.page'), 'story');
assert.equal(run('state.storyRestorePending'), false);
assert.equal(run('state.story.choices.length'), 5);
assert.equal(run('state.loadError'), '');

// A failed draft/report restore must preserve stored data too, even when an
// empty story needs no evaluation and therefore cannot catch the outage first.
const completeStorySave = storage.get('akim-story-v1');
const completeSimulatorSave = storage.get('akim-simulator-v1');
const recoveryReport = { id: 'recovery', name: 'Saved report', savedAt: '2026-09-23T10:00:00.000Z', ...example };
for (const failure of ['draft', 'report']) {
  storage.set('akim-story-v1', JSON.stringify(storyFlow.serializeStoryProgress(storyFlow.createStoryProgress(), bootstrap.version)));
  const original = JSON.stringify({ version: bootstrap.version, name: 'Saved plan', decisions: failure === 'draft' ? choices : [], saved: failure === 'report' ? [recoveryReport] : [] });
  storage.set('akim-simulator-v1', original);
  context.fetch = async path => {
    if (path === '/api/bootstrap') return { ok: true, json: async () => bootstrap };
    throw new Error('Temporary restore outage');
  };
  run('state.page="menu"');
  await run('boot()');
  assert.ok(run('state.loadError.length') > 0);
  await click('exit-game');
  assert.equal(storage.get('akim-simulator-v1'), original, `${failure} data survives a network outage.`);
}
context.recoveryReport = recoveryReport;
context.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: 'Invalid saved decisions' }) });
assert.equal(await run('restoreSavedReport(recoveryReport,state.data.version)'), null, 'An actual validation rejection still discards an invalid report.');
context.fetch = healthyFetch;
storage.set('akim-story-v1', completeStorySave);
storage.set('akim-simulator-v1', completeSimulatorSave);
run('state.page="menu"');
await run('boot()');
assert.equal(run('state.loadError'), '');
assert.equal(run('state.story.choices.length'), 5);

context.document.hidden = true;
events.visibilitychange();
assert.deepEqual(musicCalls.at(-1), ['sync']);
context.document.hidden = false;
events.visibilitychange();
assert.deepEqual(musicCalls.at(-1), ['sync']);
windowEvents.pagehide();
assert.deepEqual(musicCalls.at(-1), ['stop']);
windowEvents.pageshow();
assert.deepEqual(musicCalls.at(-1), ['sync']);

console.log('PASS: frontend workflows, reports, history, menu, settings, story, budget, language, storage and exit.');
