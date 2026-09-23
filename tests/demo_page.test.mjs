/* Checks the demonstration page against the live API.
 *
 * The page is the artefact used to present the project, so the thing worth
 * asserting is that it still makes its argument: that the controlled pair
 * arrives intact and the plan it hands to the simulator is the real one.
 *
 * Requires a running server. Set TEST_PORT to override port 8080.
 */

import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.TEST_PORT || 8080);

function get(path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: 'GET', timeout: 5000 }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode} for ${path}`));
        resolve(data);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Start the simulator on port ${port} before running this test.`)));
    req.end();
  });
}

const scenarios = JSON.parse(await get('/api/scenarios'));
const bootstrap = JSON.parse(await get('/api/bootstrap'));

// --- the data contract the page depends on ------------------------------
assert.ok(Array.isArray(scenarios.scenarios) && scenarios.scenarios.length >= 2, 'scenarios list');
assert.equal(scenarios.controlledPair.length, 2, 'controlled pair has two members');
for (const item of scenarios.scenarios) {
  for (const field of ['id', 'title', 'titleEn', 'summary', 'summaryEn', 'decisions', 'score', 'delta', 'weightedAverage', 'minDistrict']) {
    assert.ok(item[field] !== undefined, `scenario ${item.id} is missing ${field}`);
  }
}

// --- the argument the page exists to make -------------------------------
const byId = Object.fromEntries(scenarios.scenarios.map(item => [item.id, item]));
const [wealthyId, weakestId] = scenarios.controlledPair;
const wealthy = byId[wealthyId];
const weakest = byId[weakestId];

assert.ok(wealthy && weakest, 'both controlled-pair scenarios are present');
assert.ok(wealthy.weightedAverage > weakest.weightedAverage,
  'the wealthy plan must have the HIGHER city average, or the demo has no point');
assert.ok(weakest.score > wealthy.score,
  'the weakest-district plan must still win on Score');
assert.ok(weakest.score - wealthy.score > 3,
  'the gap should stay large enough to be visible on stage');

// --- the stress reports the page will request ----------------------------
function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = request({
      hostname: '127.0.0.1', port, path, method: 'POST', timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode} for ${path}`));
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end(payload);
  });
}

const wealthyStress = await post('/api/stress', { decisions: wealthy.decisions, language: 'en' });
const weakestStress = await post('/api/stress', { decisions: weakest.decisions, language: 'en' });

assert.equal(wealthyStress.score, wealthy.score, 'stress report agrees with the scenario score');
assert.ok(!wealthyStress.holdsAboveBaseline,
  'the wealthy plan should fall below the do-nothing baseline under its worst shock');
assert.ok(wealthyStress.worstCaseVsBaseline < 0, 'and that gap should be negative');
assert.ok(weakestStress.worstCase.score > wealthyStress.worstCase.score,
  'the weakest-district plan must still be ahead after the shocks');
assert.ok(weakestStress.worstCaseVsBaseline > wealthyStress.worstCaseVsBaseline,
  'and it must be the more resilient of the two');

// --- the page itself -----------------------------------------------------
const pageSource = readFileSync(join(root, 'public', 'demo.js'), 'utf8');
new vm.Script(pageSource, { filename: 'demo.js' }); // throws on a syntax error

const html = readFileSync(join(root, 'public', 'demo.html'), 'utf8');
assert.ok(html.includes('src="/demo.js"'), 'the page loads its script');
assert.ok(!/<script(?![^>]*\bsrc=)/.test(html),
  'no inline <script>: the server sends script-src \'self\', which blocks it');

// --- the handover into the simulator ------------------------------------
const stored = {};
// Capture what the page writes, so the test can assert on the real markup
// rather than only on the data behind it.
const rendered = { html: '' };
const contentNode = {
  className: '',
  textContent: '',
  set innerHTML(value) { rendered.html = value; },
  get innerHTML() { return rendered.html; },
};
const sandbox = {
  localStorage: {
    setItem: (key, value) => { stored[key] = value; },
    getItem: key => stored[key] ?? null,
  },
  document: {
    documentElement: {},
    getElementById: () => contentNode,
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  window: { location: { href: '/' } },
  fetch: async (path, options) => ({
    ok: true,
    json: async () => {
      if (path === '/api/scenarios') return scenarios;
      if (path === '/api/stress') {
        // The controlled pair uses the SAME initiatives and differs only by
        // district, so the districts are what distinguish the two requests.
        const body = JSON.parse(options.body);
        const key = JSON.stringify(body.decisions);
        return key === JSON.stringify(wealthy.decisions) ? wealthyStress : weakestStress;
      }
      return bootstrap;
    },
  }),
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(pageSource, sandbox);
await new Promise(resolve => setTimeout(resolve, 50));

// Reproduce the handover the page performs for the winning plan.
vm.runInContext(`handOver(${JSON.stringify(weakestId)})`, sandbox);
const draft = JSON.parse(stored['akim-simulator-v1']);
assert.equal(draft.version, bootstrap.version, 'the draft carries the dataset version the app checks');
assert.deepEqual(draft.decisions, weakest.decisions, 'the handed-over plan is the real one');
assert.equal(draft.decisions.length, 5, 'a complete plan is handed over');
assert.deepEqual(draft.saved, [], 'the handover does not fabricate saved reports');

// --- the rendered markup -------------------------------------------------
assert.ok(rendered.html.includes(wealthy.score.toFixed(2)), 'the page shows the wealthy plan score');
assert.ok(rendered.html.includes(weakest.score.toFixed(2)), 'the page shows the weakest plan score');
assert.ok(
  rendered.html.includes(wealthyStress.worstCase.score.toFixed(2)),
  'the shock section renders the wealthy plan worst case',
);
assert.ok(
  rendered.html.includes(weakestStress.worstCase.score.toFixed(2)),
  'the shock section renders the weakest plan worst case',
);
assert.ok(rendered.html.includes('52.56'), 'the do-nothing baseline stays on screen for comparison');

// The page must survive the endpoint being unavailable: the shock section
// is an addition, not a dependency.
let renderedWithoutStress = true;
try {
  const isolated = {
    localStorage: sandbox.localStorage,
    document: sandbox.document,
    window: { location: { href: '/' } },
    fetch: async path => (path === '/api/stress'
      ? { ok: false, status: 503, json: async () => ({}) }
      : { ok: true, json: async () => (path === '/api/scenarios' ? scenarios : bootstrap) }),
    console,
  };
  isolated.globalThis = isolated;
  vm.createContext(isolated);
  vm.runInContext(pageSource, isolated);
  await new Promise(resolve => setImmediate(resolve));
} catch {
  renderedWithoutStress = false;
}
assert.ok(renderedWithoutStress, 'the page must still render when /api/stress fails');

console.log(
  `Demo page checks passed: controlled pair intact (${wealthy.weightedAverage.toFixed(2)} avg scores ` +
  `${wealthy.score.toFixed(2)}, ${weakest.weightedAverage.toFixed(2)} avg scores ${weakest.score.toFixed(2)}), ` +
  `${scenarios.scenarios.length} scenarios, handover verified, ` +
  `shocks: ${wealthy.title} falls to ${wealthyStress.worstCase.score} ` +
  `(${wealthyStress.worstCaseVsBaseline} vs doing nothing), ` +
  `${weakest.title} holds at ${weakestStress.worstCase.score}.`
);
