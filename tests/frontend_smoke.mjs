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
let downloaded;
let downloadClicks = 0;
const context = vm.createContext({
  ...localization, ...gamePreferences,
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
  window: { scrollTo() {}, print() {} },
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
await click('start-game');
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
assert.equal(run('preferences.volume'), 23);
assert.equal(run('preferences.brightness'), 70);
await click('toggle-sound');
assert.equal(run('preferences.muted'), true);
await events.change({ target: { dataset: { setting: 'language' }, value: 'en' } });
assert.ok(nodes.app.innerHTML.includes('Settings'));
assert.equal(context.document.documentElement.lang, 'en');
await click('game-menu');
assert.ok(nodes.app.innerHTML.includes('Start game'));
assert.ok(nodes.app.innerHTML.includes('Exit game'));
await click('start-game');
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
await click('reset-settings');
assert.equal(run('preferences.language'), 'ru');
assert.equal(run('preferences.brightness'), 100);
await click('game-menu');
const decisionsBeforeExit = run('decisionKey(state.decisions)');
await click('exit-game');
assert.equal(run('state.page'), 'exited');
assert.ok(nodes.app.innerHTML.includes('Игра завершена'));
assert.equal(run('decisionKey(state.decisions)'), decisionsBeforeExit);
await click('game-menu');
await click('start-game');
assert.equal(run('state.page'), 'simulation');

console.log('PASS: frontend workflows, reports, history, menu, settings, language, storage and exit.');
