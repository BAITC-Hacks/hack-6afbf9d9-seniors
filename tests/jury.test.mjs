/** node tests/jury.test.mjs — no browser, server or wall-clock waits. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JURY_SLIDE_COUNT, JURY_SLIDE_SECONDS, JURY_ROUTE, juryText, renderJury, createJuryClock } from '../public/jury.js';

function fakeEnvironment() {
  let time = 0;
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  const document = {
    visibilityState: 'visible', hidden: false,
    addEventListener(type, listener) { assert.equal(type, 'visibilitychange'); listeners.add(listener); },
    removeEventListener(type, listener) { assert.equal(type, 'visibilitychange'); listeners.delete(listener); },
  };
  const environment = {
    now: () => time,
    setTimeout: (callback, delay) => { const id = ++nextId; pending.set(id, { callback, at: time + delay }); return id; },
    clearTimeout: id => pending.delete(id),
    document,
  };
  const run = milliseconds => {
    const target = time + milliseconds;
    let executions = 0;
    while (pending.size) {
      const [id, task] = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (task.at > target) break;
      assert.ok(++executions < 10000, 'Timer must not busy-loop.');
      pending.delete(id);
      time = task.at;
      task.callback();
      assert.ok(pending.size <= 1, 'Only one presentation timer may exist.');
    }
    time = target;
  };
  const hide = hidden => {
    document.hidden = hidden;
    document.visibilityState = hidden ? 'hidden' : 'visible';
    [...listeners].forEach(listener => listener());
  };
  return { environment, run, hide, pending, listeners, jump: milliseconds => { time += milliseconds; } };
}

assert.equal(JURY_SLIDE_COUNT * JURY_SLIDE_SECONDS, 150);
assert.equal(JURY_ROUTE.length, 5);
assert.deepEqual(JURY_ROUTE.map(choice => choice.initiativeId), ['M7', 'M5', 'M1', 'M10', 'M12']);
assert.ok(Object.isFrozen(JURY_ROUTE) && JURY_ROUTE.every(Object.isFrozen));

// A complete 2:30 presentation advances five times, then releases everything.
{
  const fake = fakeEnvironment();
  const ticks = [];
  const slides = [];
  const clock = createJuryClock({ environment: fake.environment, onTick: state => ticks.push(state), onAdvance: index => slides.push(index) });
  assert.equal(fake.pending.size, 0);
  assert.equal(fake.listeners.size, 0);
  clock.start();
  assert.equal(fake.pending.size, 1);
  assert.equal(fake.listeners.size, 1);
  fake.run(24999);
  assert.equal(clock.getState().index, 0);
  assert.equal(clock.getState().remaining, 1);
  fake.run(1);
  assert.equal(clock.getState().index, 1);
  assert.equal(clock.getState().remaining, 25);
  fake.run(125000);
  assert.deepEqual(slides, [1, 2, 3, 4, 5]);
  assert.deepEqual(clock.getState(), { index: 5, remaining: 0, paused: true, running: false, finished: true });
  assert.equal(fake.pending.size, 0);
  assert.equal(fake.listeners.size, 0);
  assert.equal(ticks.length, 151, 'Only whole-second changes should repaint, not every timer poll.');
  assert.ok(ticks.every(state => state.remaining >= 0 && state.remaining <= 25));
  fake.run(300000);
  clock.resume();
  assert.equal(fake.pending.size, 0, 'A finished presentation cannot restart through Resume.');
  clock.start();
  assert.equal(clock.getState().finished, false);
  assert.equal(clock.getState().index, 0);
  assert.equal(fake.pending.size, 1);
  clock.stop();
  assert.equal(fake.pending.size, 0);
  assert.equal(fake.listeners.size, 0);
}

// Pausing preserves fractional remaining time; time in a hidden tab is excluded.
{
  const fake = fakeEnvironment();
  const clock = createJuryClock({ environment: fake.environment });
  clock.start();
  fake.run(1250);
  clock.pause();
  assert.equal(clock.getState().remaining, 24);
  assert.equal(fake.pending.size, 0);
  fake.run(90000);
  clock.resume();
  fake.run(23749);
  assert.equal(clock.getState().index, 0);
  fake.run(1);
  assert.equal(clock.getState().index, 1);
  fake.run(3200);
  fake.hide(true);
  assert.equal(clock.getState().paused, true);
  assert.equal(fake.pending.size, 0);
  const frozen = clock.getState();
  fake.run(120000);
  clock.resume();
  assert.deepEqual(clock.getState(), frozen, 'Resume while hidden cannot restart the timer.');
  fake.hide(false);
  assert.equal(fake.pending.size, 0, 'Returning to the tab keeps an intentional pause.');
  clock.resume();
  assert.equal(fake.pending.size, 1);
  clock.stop();
  const stopped = clock.getState();
  fake.run(999999);
  fake.hide(true);
  fake.hide(false);
  assert.deepEqual(clock.getState(), stopped);
  assert.equal(fake.listeners.size, 0);
}

// Navigation keeps a pause; starting hidden is safe; repeated starts do not leak.
{
  const fake = fakeEnvironment();
  const clock = createJuryClock({ environment: fake.environment });
  fake.hide(true);
  clock.start(2);
  assert.equal(clock.getState().paused, true);
  assert.equal(fake.pending.size, 0);
  fake.hide(false);
  clock.seek(4);
  assert.equal(clock.getState().paused, true);
  assert.equal(clock.getState().remaining, 25);
  clock.resume();
  clock.seek(1);
  assert.equal(clock.getState().paused, false);
  assert.equal(fake.pending.size, 1);
  for (let count = 0; count < 20; count += 1) clock.start(2);
  assert.equal(fake.pending.size, 1);
  assert.equal(fake.listeners.size, 1);
  clock.seek(99);
  assert.equal(clock.getState().index, 5);
  clock.seek(-9);
  assert.equal(clock.getState().index, 0);
  clock.seek(NaN);
  assert.equal(clock.getState().index, 0);
  clock.pause();
  clock.pause();
  assert.equal(fake.pending.size, 0);
  clock.stop();
  clock.stop();
  assert.equal(fake.listeners.size, 0);
}

// State snapshots are detached; a callback may safely stop the presentation.
{
  const fake = fakeEnvironment();
  const clock = createJuryClock({ environment: fake.environment, onTick: state => { state.index = 999; } });
  clock.start();
  assert.equal(clock.getState().index, 0);
  const snapshot = clock.getState();
  snapshot.index = -1;
  assert.equal(clock.getState().index, 0);
  clock.stop();
  let interrupted;
  interrupted = createJuryClock({ environment: fake.environment, onAdvance: () => interrupted.stop() });
  interrupted.start();
  fake.run(25000);
  assert.equal(interrupted.getState().running, false);
  assert.equal(fake.pending.size, 0);
  assert.equal(fake.listeners.size, 0);
}

// A throttled callback does not skip several unseen slides to catch up.
{
  const fake = fakeEnvironment();
  const slides = [];
  const clock = createJuryClock({ environment: fake.environment, onAdvance: slide => slides.push(slide) });
  clock.start();
  fake.jump(100000);
  const [id, task] = [...fake.pending][0];
  fake.pending.delete(id);
  task.callback();
  assert.deepEqual(slides, [1]);
  assert.equal(clock.getState().remaining, 25);
  clock.stop();
}

const source = JSON.parse(await readFile(new URL('../data/city.json', import.meta.url), 'utf8'));
// Deliberately distinctive renderer fixtures: these are not reference model results.
const scores = [52.56, 53.13, 55.91, 56.44, 57.88, 59.23];
const evaluations = scores.map((score, index) => ({
  score, delta: score - scores[0], spent: index * 17, remaining: 100 - index * 17,
  criticalCount: index === 0 ? 2 : 1,
  districts: source.districts.map((district, number) => ({ id: district.id, before: 45 + number, after: 45 + number + index, delta: index })),
  metrics: source.categories.map((category, number) => ({ id: category.id, name: category.name, before: 50, after: 50 + number, delta: number })),
}));
const data = { ...source, baseline: evaluations[0] };
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); }
  return value;
}
deepFreeze(data);
deepFreeze(evaluations);
const format = value => value.toFixed(2);
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
const keys = ['menuTitle', 'menuHint', 'label', 'pause', 'resume', 'previous', 'next', 'exit', 'restart', 'about', 'progress', 'seconds', 'paused', 'finished', 'loading', 'notice', 'problem', 'appointment', 'decisions', 'city', 'event', 'finale'];
for (const language of ['ru', 'kk', 'en']) {
  for (const key of keys) {
    const value = juryText(key, language, { current: 1, total: 6, seconds: 25 });
    assert.ok(value.trim());
    assert.notEqual(value, key);
    assert.doesNotMatch(value, /\{\w+\}/);
  }
  for (let index = 0; index < 6; index += 1) {
    const props = { data, evaluations, language, index, num: format, signed };
    const html = renderJury(props);
    assert.match(html, /class="jury-screen"/);
    assert.match(html, /data-i18n-skip/);
    assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
    assert.doesNotMatch(html, /\bundefined\b|NaN|\[object Object\]/);
    assert.doesNotMatch(html, /data-action="(?:story-|preset|add-|evaluate|analyze)/);
    for (const action of ['jury-prev', 'jury-next', 'jury-toggle', 'jury-exit']) assert.ok(html.includes(`data-action="${action}"`));
    if (language === 'en') assert.doesNotMatch(html, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
    if (index === 2) {
      for (const score of scores.slice(1)) assert.ok(html.includes(format(score)), 'Every decision prefix must use its own server evaluation.');
      assert.equal((html.match(/class="jury-decision jury-category-/g) || []).length, 5);
    }
    if (index === 3 || index === 5) assert.ok(html.includes('59.23'), 'Use the supplied result, never a hardcoded demo score.');
    if (index === 4) {
      assert.ok(html.includes(juryText('eventFallback', language)));
      const eventResult = deepFreeze({
        event: { title: { ru: 'Проверка сети', kk: 'Желіні тексеру', en: 'Network check' }, description: { ru: 'Условное событие', kk: 'Шартты оқиға', en: 'Synthetic event' } },
        evaluation: { score: 59.23 }, forecast: { score: 51.13, criticalCount: 3 },
      });
      const eventHtml = renderJury({ ...props, eventResult });
      assert.ok(eventHtml.includes('59.23') && eventHtml.includes('51.13') && eventHtml.includes('-8.10'));
      assert.doesNotMatch(eventHtml, /\[object Object\]/);
      assert.ok(eventHtml.includes(juryText('eventSeparate', language)));
      if (language === 'en') assert.doesNotMatch(eventHtml, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
    }
    const paused = renderJury({ ...props, paused: true, remaining: 13 });
    assert.ok(paused.includes(juryText('paused', language)));
    assert.ok(paused.includes(juryText('resume', language)));
    const busy = renderJury({ ...props, busy: true });
    assert.match(busy, /aria-busy="true"/);
    assert.ok(busy.includes(juryText('loading', language)));
  }
  const finished = renderJury({ data, evaluations, language, index: 5, paused: true, remaining: 0 });
  assert.ok(finished.includes(juryText('finished', language)));
  assert.doesNotMatch(finished, /data-action="jury-toggle"/);
  assert.match(finished, /data-action="about-simulator"/);
}

const attack = '<img src=x onerror=alert(1)>';
const poisoned = { ...data, initiatives: data.initiatives.map(item => ({ ...item, title: attack })) };
const safe = renderJury({ data: poisoned, evaluations, index: 2 });
assert.ok(safe.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(!safe.includes(attack));
const poisonedEvent = renderJury({ data, evaluations, index: 4, eventResult: { event: { title: attack }, evaluation: { score: 1 }, forecast: { score: 0 } } });
assert.ok(poisonedEvent.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(!poisonedEvent.includes(attack));
assert.match(renderJury({ data, evaluations, index: -1 }), /jury-slide-0/);
assert.match(renderJury({ data, evaluations, index: 100 }), /jury-slide-5/);
assert.doesNotMatch(renderJury({ data: {}, busy: true }), /\bundefined\b|NaN|\[object Object\]/);
assert.equal(juryText('menuTitle', 'unsupported'), juryText('menuTitle', 'ru'));
console.log('Jury presentation checks passed: 150-second lifecycle, pause/resume/visibility/navigation cleanup, 6 slides in 3 languages, read-only rendering and escaped data.');
