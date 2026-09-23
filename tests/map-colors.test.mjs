import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const region = (id, classes = []) => ({
  id, classList: { contains: name => classes.includes(name) },
  matches: () => true,
  style: { setProperty(name, value) { this[name] = value; } },
});
const esil = region('esil');
const almaty = region('', ['almaty']);
const nura = region('nura');
const unrelated = region('river');
const context = vm.createContext({
  mapPositions: { esil: [], almaty: [], nura: [] },
  document: { querySelector: () => ({ querySelectorAll: () => [esil, almaty, nura, unrelated] }) },
});
vm.runInContext(source.slice(source.indexOf('let mapSvgPromise;'), source.indexOf('async function mountCityMap()')), context);
context.deltas = { esil: 1.2, almaty: -0.2, nura: 0, river: 2, 'bad"]': 1 };
vm.runInContext('updateMapColors(deltas)', context);
assert.equal(esil.style.fill, '#84cc16');
assert.equal(almaty.style.fill, '#ef4444');
assert.equal(nura.style.fill, '#94a3b8');
assert.equal(unrelated.style.fill, undefined);
context.deltas = { esil: NaN, almaty: '1', nura: Infinity };
vm.runInContext('updateMapColors(deltas)', context);
assert.equal(esil.style.fill, '#84cc16');
assert.equal(almaty.style.fill, '#ef4444');
context.document.querySelector = () => null;
vm.runInContext('updateMapColors({esil: -1}); updateMapColors(null)', context);
const converted = vm.runInContext('evaluationDeltas({evaluation: {districts: [{id: "esil", delta: 2}]}})', context);
assert.equal(converted.esil, 2);
assert.equal(vm.runInContext('evaluationDeltas({final_score: 55, deltas: {nura: -1}}).nura', context), -1);
const svg = await readFile(new URL('../public/city-map.svg', import.meta.url), 'utf8');
for (const id of ['esil', 'almaty', 'nura', 'baikonur', 'saryarka']) assert.ok(svg.includes(`id="${id}"`));
console.log('PASS: map colors, ID/class targeting, missing DOM, invalid values and response formats.');
