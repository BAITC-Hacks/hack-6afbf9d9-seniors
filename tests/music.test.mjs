/** Music behavior checks with an entirely fake audio graph and clock.
 * Run: node tests/music.test.mjs. No sound, browser, server or dependency needed.
 */
import assert from 'node:assert/strict';
import { createMusicPlayer } from '../public/music.js';

const flushMicrotasks = async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); };

function harness(options = {}) {
  const rig = {
    preferences: { musicEnabled: true, musicVolume: 30, volume: 75, muted: false },
    document: { hidden: false }, contexts: [], timers: new Map(), pendingResumes: [],
    now: 0, timerId: 0, scheduledTimers: 0, clearedTimers: 0,
    deferResume: false, rejectResume: false, ...options,
  };
  class AudioParam {
    constructor(value = 0) { this.value = value; this.events = []; }
    record(type, value, at) { this.value = value; this.events.push({ type, value, at }); return this; }
    setValueAtTime(value, at) { return this.record('set', value, at); }
    linearRampToValueAtTime(value, at) { return this.record('linear', value, at); }
    exponentialRampToValueAtTime(value, at) { return this.record('exponential', value, at); }
    setTargetAtTime(value, at, constant) { this.events.push({ type: 'target', value, at, constant }); this.value = value; return this; }
    cancelScheduledValues(at) { this.events.push({ type: 'cancel', at }); return this; }
    cancelAndHoldAtTime(at) { this.events.push({ type: 'hold', at }); return this; }
  }
  class AudioNode {
    constructor(context) { this.context = context; this.connections = new Set(); this.disconnected = false; }
    connect(destination) { this.connections.add(destination); this.disconnected = false; return destination; }
    disconnect() { this.connections.clear(); this.disconnected = true; }
  }
  class Oscillator extends AudioNode {
    constructor(context) {
      super(context);
      this.type = 'sine'; this.frequency = new AudioParam(440); this.detune = new AudioParam();
      this.startCalls = []; this.stopCalls = []; this.startTime = null; this.stopTime = Infinity; this.ended = false;
      this.onended = null;
    }
    start(at = this.context.currentTime) {
      assert.equal(this.startTime, null, 'An oscillator can only be started once.');
      this.startTime = at; this.startCalls.push(at);
    }
    stop(at = this.context.currentTime) {
      this.stopCalls.push(at); this.stopTime = at;
      if (at <= this.context.currentTime) this.end();
    }
    end() { if (!this.ended) { this.ended = true; this.onended?.(); } }
  }
  class FakeAudioContext {
    constructor() {
      if (rig.throwConstruction) throw new Error('Audio unavailable');
      this.state = 'suspended'; this.currentTime = 0;
      this.destination = { kind: 'destination', context: this };
      this.gains = []; this.oscillators = []; this.resumeCalls = 0; this.suspendCalls = 0;
      rig.contexts.push(this);
    }
    resume() {
      this.resumeCalls += 1;
      if (rig.rejectResume) return Promise.reject(new Error('Audio permission was denied'));
      if (rig.deferResume) return new Promise((resolve, reject) => rig.pendingResumes.push({
        resolve: () => { this.state = 'running'; resolve(); }, reject,
      }));
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() { this.suspendCalls += 1; this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createOscillator() { const node = new Oscillator(this); this.oscillators.push(node); return node; }
    createGain() {
      const node = new AudioNode(this); node.gain = new AudioParam(1); this.gains.push(node); return node;
    }
  }
  rig.environment = {
    AudioContext: FakeAudioContext,
    document: rig.document,
    setTimeout(callback, delay = 0) {
      assert.ok(Number.isFinite(delay) && delay > 0, 'The scheduler must yield instead of creating a busy loop.');
      const id = ++rig.timerId;
      rig.scheduledTimers += 1;
      rig.timers.set(id, { callback, due: rig.now + delay });
      return id;
    },
    clearTimeout(id) { if (rig.timers.delete(id)) rig.clearedTimers += 1; },
  };
  rig.advanceNext = async () => {
    const next = [...rig.timers.entries()].sort((a, b) => a[1].due - b[1].due)[0];
    assert.ok(next, 'Expected an audio scheduling timer.');
    const [id, task] = next;
    rig.timers.delete(id);
    const elapsed = task.due - rig.now;
    rig.now = task.due;
    for (const context of rig.contexts) {
      if (context.state === 'running') context.currentTime += elapsed / 1000;
      for (const oscillator of context.oscillators) {
        if (oscillator.stopTime <= context.currentTime) oscillator.end();
      }
    }
    await task.callback();
    await flushMicrotasks();
  };
  rig.liveOscillators = () => rig.contexts.flatMap(context => context.oscillators)
    .filter(node => node.startTime !== null && !node.ended && !node.disconnected);
  rig.startedCount = () => rig.contexts.reduce((total, context) => total + context.oscillators.filter(node => node.startCalls.length).length, 0);
  rig.masterGain = () => rig.contexts.flatMap(context => context.gains)
    .find(node => node.connections.has(node.context.destination));
  rig.resolveResumes = async () => {
    const pending = rig.pendingResumes.splice(0);
    for (const resume of pending) resume.resolve();
    await flushMicrotasks();
  };
  rig.player = createMusicPlayer(() => rig.preferences, rig.environment);
  return rig;
}

function assertSilent(rig, label) {
  assert.equal(rig.timers.size, 0, `${label}: scheduler timer must be cleared.`);
  assert.equal(rig.liveOscillators().length, 0, `${label}: scheduled and playing notes must be stopped.`);
  for (const context of rig.contexts) assert.notEqual(context.state, 'running', `${label}: the audio context must be suspended.`);
}

const lazy = harness();
assert.equal(await lazy.player.setScene('ambient'), false);
assert.equal(await lazy.player.sync(), false);
assert.equal(await lazy.player.setScene('finale'), false);
assert.equal(lazy.contexts.length, 0, 'Choosing a scene before a gesture must not instantiate AudioContext.');
assert.equal(lazy.timers.size, 0);
assert.equal(await lazy.player.setScene(null), false);
assert.equal(await lazy.player.unlock(), false, 'An unlocked player with no selected scene stays silent.');
assert.equal(lazy.startedCount(), 0);
assert.equal(lazy.timers.size, 0);
lazy.player.stop();

const ambient = harness();
await ambient.player.setScene('ambient');
assert.equal(await ambient.player.unlock(), true);
assert.equal(ambient.contexts.length, 1);
assert.ok(ambient.startedCount() > 0, 'Unlocking an ambient scene must schedule actual notes.');
assert.equal(ambient.timers.size, 1, 'Only one scheduler should own the repeating background track.');
const ambientContext = ambient.contexts[0];
const firstTimerIds = [...ambient.timers.keys()];
const firstScheduled = ambient.scheduledTimers;
const firstStarted = ambient.startedCount();
for (let i = 0; i < 4; i += 1) {
  assert.equal(await ambient.player.setScene('ambient'), true);
  assert.equal(await ambient.player.sync(), true);
  assert.equal(await ambient.player.unlock(), true);
}
assert.equal(ambient.contexts.length, 1, 'Repeated render synchronization must reuse the context.');
assert.equal(ambient.startedCount(), firstStarted, 'Repeated synchronization must not restart the melody.');
assert.equal(ambient.scheduledTimers, firstScheduled, 'Repeated synchronization must not reset the scheduler timer.');
assert.deepEqual([...ambient.timers.keys()], firstTimerIds);
for (let i = 0; i < 20; i += 1) await ambient.advanceNext();
assert.ok(ambient.startedCount() > firstStarted, 'The scheduler must continue the ambient melody over time.');
assert.equal(ambient.timers.size, 1, 'Repeating music must not multiply scheduler loops.');
assert.equal(ambient.contexts.length, 1);

const master = ambient.masterGain();
assert.ok(master, 'A master gain must control background music volume.');
const lowGain = master.gain.value;
const volumeTimer = [...ambient.timers.keys()];
const volumeNotes = ambient.startedCount();
ambient.preferences.musicVolume = 80;
assert.equal(await ambient.player.sync(), true);
assert.ok(master.gain.value > lowGain, 'Increasing music volume must update the running master gain.');
assert.ok(master.gain.value > 0 && master.gain.value <= 1, 'The master gain should remain in a bounded audible range.');
assert.equal(ambient.startedCount(), volumeNotes, 'A volume adjustment must not restart notes.');
assert.deepEqual([...ambient.timers.keys()], volumeTimer);
const musicGain = master.gain.value;
ambient.preferences.volume = 0;
ambient.preferences.muted = true;
assert.equal(await ambient.player.sync(), true, 'Muting interface sounds must not mute independently configured music.');
assert.equal(master.gain.value, musicGain);
assert.deepEqual([...ambient.timers.keys()], volumeTimer);
ambient.preferences.musicEnabled = false;
assert.equal(await ambient.player.sync(), false);
assertSilent(ambient, 'Music disabled');
assert.ok(ambientContext.suspendCalls > 0);
ambient.preferences.musicEnabled = true;
assert.equal(await ambient.player.sync(), true);
assert.equal(ambient.contexts.length, 1, 'Enabling music again reuses its context.');
assert.equal(ambient.timers.size, 1);
ambient.preferences.musicVolume = 0;
assert.equal(await ambient.player.sync(), false);
assertSilent(ambient, 'Zero music volume');
ambient.preferences.musicVolume = 30;
assert.equal(await ambient.player.sync(), true);
ambient.document.hidden = true;
assert.equal(await ambient.player.sync(), false);
assertSilent(ambient, 'Hidden tab');
const hiddenCount = ambient.startedCount();
assert.equal(await ambient.player.sync(), false);
assert.equal(ambient.startedCount(), hiddenCount, 'A hidden tab must not keep scheduling notes.');
ambient.document.hidden = false;
assert.equal(await ambient.player.sync(), true);
assert.ok(ambient.startedCount() > hiddenCount, 'Visibility can resume an eligible unlocked scene.');

// A missed visibility event is still caught by the scheduler itself.
ambient.document.hidden = true;
await ambient.advanceNext();
assertSilent(ambient, 'Scheduler notices a hidden tab');
ambient.document.hidden = false;
ambient.preferences.musicEnabled = false;
assert.equal(await ambient.player.sync(), false, 'Becoming visible must not override disabled music.');
assertSilent(ambient, 'Visible but disabled');
ambient.preferences.musicEnabled = true;
await ambient.player.sync();
ambient.player.stop();
await flushMicrotasks();
assertSilent(ambient, 'Explicit stop');
assert.equal(await ambient.player.sync(), true, 'An explicit stop preserves the chosen scene for a later eligible sync.');
assert.equal(await ambient.player.setScene(null), false);
assertSilent(ambient, 'Exit clears the scene');
const exitedCount = ambient.startedCount();
ambient.document.hidden = true;
await ambient.player.sync();
ambient.document.hidden = false;
await ambient.player.sync();
await ambient.player.unlock();
assertSilent(ambient, 'Exit remains silent after visibility and another gesture');
assert.equal(ambient.startedCount(), exitedCount);

const ambientTune = harness();
const finaleTune = harness();
await ambientTune.player.setScene('ambient');
await finaleTune.player.setScene('finale');
await ambientTune.player.unlock();
await finaleTune.player.unlock();
const tuneFingerprint = rig => rig.contexts[0].oscillators.map(node => ({
  frequency: node.frequency.value, type: node.type,
  starts: node.startTime, duration: node.stopTime - node.startTime,
}));
assert.notDeepEqual(tuneFingerprint(ambientTune), tuneFingerprint(finaleTune), 'The finale must play a distinct composition.');
const oldAmbientNodes = [...ambientTune.contexts[0].oscillators];
assert.equal(await ambientTune.player.setScene('finale'), true);
assert.ok(oldAmbientNodes.every(node => node.ended || node.disconnected), 'Switching to the finale must stop the previous scene’s notes.');
assert.equal(ambientTune.contexts.length, 1, 'Changing musical scenes must not create another audio context.');
assert.equal(ambientTune.timers.size, 1);
const finaleStarted = ambientTune.startedCount();
const finaleTimer = [...ambientTune.timers.keys()];
await ambientTune.player.setScene('finale');
await ambientTune.player.sync();
assert.equal(ambientTune.startedCount(), finaleStarted);
assert.deepEqual([...ambientTune.timers.keys()], finaleTimer);
ambientTune.player.stop();
finaleTune.player.stop();

for (const cancel of ['stop', 'exit', 'hidden', 'hidden-without-sync', 'disabled', 'zero']) {
  const waiting = harness({ deferResume: true });
  await waiting.player.setScene('ambient');
  const pendingUnlock = waiting.player.unlock();
  await flushMicrotasks();
  assert.equal(waiting.contexts.length, 1);
  assert.ok(waiting.pendingResumes.length > 0, 'The race check must actually be waiting for audio permission.');
  assert.equal(waiting.startedCount(), 0);
  let cancelling;
  if (cancel === 'stop') waiting.player.stop();
  if (cancel === 'exit') cancelling = waiting.player.setScene(null);
  if (cancel === 'hidden') { waiting.document.hidden = true; cancelling = waiting.player.sync(); }
  if (cancel === 'hidden-without-sync') waiting.document.hidden = true;
  if (cancel === 'disabled') { waiting.preferences.musicEnabled = false; cancelling = waiting.player.sync(); }
  if (cancel === 'zero') { waiting.preferences.musicVolume = 0; cancelling = waiting.player.sync(); }
  await waiting.resolveResumes();
  assert.equal(await pendingUnlock, false, `A pending unlock cancelled by ${cancel} must not start the old scene.`);
  await cancelling;
  await flushMicrotasks();
  assert.equal(waiting.startedCount(), 0, `${cancel} cannot leave notes scheduled after a delayed resume.`);
  assertSilent(waiting, `Delayed resume cancelled by ${cancel}`);
}

const concurrent = harness({ deferResume: true });
await concurrent.player.setScene('ambient');
const simultaneous = [concurrent.player.unlock(), concurrent.player.unlock(), concurrent.player.sync(), concurrent.player.setScene('ambient')];
await flushMicrotasks();
assert.equal(concurrent.contexts.length, 1);
await concurrent.resolveResumes();
await Promise.all(simultaneous);
assert.ok(concurrent.startedCount() > 0);
assert.equal(concurrent.timers.size, 1, 'Concurrent unlocks and render syncs must converge on one scheduler.');
concurrent.player.stop();
await flushMicrotasks();
assertSilent(concurrent, 'Concurrent player stopped');

for (const initial of [
  { preferences: { musicEnabled: false, musicVolume: 30 } },
  { preferences: { musicEnabled: true, musicVolume: 0 } },
  { document: { hidden: true } },
]) {
  const blocked = harness(initial);
  await blocked.player.setScene('ambient');
  assert.equal(await blocked.player.unlock(), false);
  assert.equal(blocked.startedCount(), 0);
  assert.equal(blocked.timers.size, 0);
  assertSilent(blocked, 'Initially ineligible player');
}
const unsupported = createMusicPlayer(() => ({ musicEnabled: true, musicVolume: 30 }), {});
assert.equal(await unsupported.setScene('ambient'), false);
assert.equal(await unsupported.unlock(), false);
assert.equal(await unsupported.sync(), false);
assert.doesNotThrow(() => unsupported.stop());
const failedConstruction = harness({ throwConstruction: true });
await failedConstruction.player.setScene('ambient');
assert.equal(await failedConstruction.player.unlock(), false);
assert.equal(failedConstruction.timers.size, 0);
const rejected = harness({ rejectResume: true });
await rejected.player.setScene('ambient');
assert.equal(await rejected.player.unlock(), false);
assertSilent(rejected, 'Resume rejection');
rejected.rejectResume = false;
assert.equal(await rejected.player.unlock(), true, 'A later permitted gesture can recover from a rejected resume.');
rejected.player.stop();

console.log('Music checks passed: lazy permission, independent volume, ambient/finale scheduling, no duplicate loops, visibility/exit cleanup, delayed-resume races, unavailable audio and recovery.');
