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

function localApi(path, decisions) {
  return new Promise((resolve, reject) => {
    const body = decisions === undefined ? null : JSON.stringify({ decisions });
    const req = request({
      hostname: '127.0.0.1', port: 8080, path,
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
  bootstrap, example,
  document: {
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
vm.runInContext(source.replace(/boot\(\);\s*$/, ''), context);
const run = code => vm.runInContext(code, context);
const click = (action, extra = {}) => events.click({
  target: { closest: () => ({ dataset: { action, ...extra } }) }, preventDefault() {},
});

run('state.data=bootstrap; state.evaluation=bootstrap.baseline; render();');
assert.ok(nodes.app.innerHTML.includes('52,56'));
assert.ok(nodes.app.innerHTML.includes('city-map.svg'));
assert.equal(bootstrap.budget, 100);
assert.equal(evaluation.score, 56.54);

context.fetch = async path => ({ ok: true, json: async () => path === '/api/analyze' ? example : evaluation });
await click('preset');
assert.equal(run('state.decisions.length'), 5);
assert.equal(run('state.evaluation.spent'), 95);
await click('analyze');
assert.equal(run('state.page'), 'report');
assert.ok(nodes.app.innerHTML.includes('M10+M12'));
assert.ok(nodes.app.innerHTML.includes('Демонстрационный разбор'));
assert.equal(run('state.saved.length'), 1);
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

console.log('PASS: frontend views, preset workflow, export, history validation, stale analysis, rejected mutation.');
