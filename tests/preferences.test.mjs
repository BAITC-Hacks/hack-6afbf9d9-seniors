import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE, normalizeSettings, loadSettings, saveSettings, brightnessAppearance, createSoundPlayer } from '../public/preferences.js';
import { translate, localizeMarkup } from '../public/i18n.js';

assert.deepEqual(normalizeSettings(null), { ...DEFAULT_SETTINGS });
assert.deepEqual(normalizeSettings({ volume: 500, brightness: -10, muted: 'yes', language: 'invalid' }), { ...DEFAULT_SETTINGS, volume: 100, brightness: 50 });
assert.equal(normalizeSettings({ volume: NaN, brightness: Infinity }).brightness, 100);
assert.equal(normalizeSettings({ volume: '60' }).volume, DEFAULT_SETTINGS.volume);
assert.deepEqual(loadSettings({ getItem: () => '{bad json' }), { ...DEFAULT_SETTINGS });
assert.deepEqual(loadSettings({ getItem() { throw new Error('No storage'); } }), { ...DEFAULT_SETTINGS });
const stored = new Map();
const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
assert.equal(saveSettings(storage, { volume: 0, muted: true, brightness: 120, language: 'kk' }), true);
assert.equal(JSON.parse(stored.get(SETTINGS_STORAGE)).language, 'kk');
assert.deepEqual(loadSettings(storage), { ...DEFAULT_SETTINGS, volume: 0, muted: true, brightness: 120, language: 'kk' });
assert.equal(normalizeSettings({ musicVolume: -1 }).musicVolume, 0);
assert.equal(normalizeSettings({ musicVolume: 101 }).musicVolume, 100);
assert.equal(normalizeSettings({ musicVolume: 43.7 }).musicVolume, 44);
assert.equal(normalizeSettings({ musicVolume: '90', musicEnabled: 'false' }).musicVolume, 30);
assert.equal(normalizeSettings({ musicVolume: NaN, musicEnabled: null }).musicEnabled, true);
assert.equal(saveSettings(storage, { ...DEFAULT_SETTINGS, muted: true, musicEnabled: false, musicVolume: 17 }), true);
assert.equal(loadSettings(storage).musicEnabled, false);
assert.equal(loadSettings(storage).musicVolume, 17);
assert.equal(loadSettings(storage).muted, true);
assert.equal(saveSettings({ setItem() { throw new Error('Quota'); } }, DEFAULT_SETTINGS), false);
assert.deepEqual(brightnessAppearance(50), { color: '#000000', opacity: .5 });
assert.deepEqual(brightnessAppearance(100), { color: '#000000', opacity: 0 });
assert.deepEqual(brightnessAppearance(120), { color: '#ffffff', opacity: .2 });

let prefs = { ...DEFAULT_SETTINGS };
const scheduled = [];
const gains = [];
let stopped = 0;
let suspended = 0;
class FakeAudioContext {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; suspended += 1; }
  createOscillator() {
    return { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {},
      start(at) { scheduled.push(at); }, stop() { stopped += 1; } };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime(value) { gains.push(value); }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}
const audio = createSoundPlayer(() => prefs, { AudioContext: FakeAudioContext });
assert.equal(await audio.play(), true);
assert.equal(scheduled.length, 1);
assert.equal(gains[0], .0375);
prefs.volume = 100;
await audio.play('success');
assert.equal(scheduled.length, 3);
assert.equal(gains[1], .075);
prefs.muted = true;
assert.equal(await audio.play(), false);
prefs.muted = false;
prefs.volume = 0;
assert.equal(await audio.play(), false);
prefs.volume = 50;
audio.setActive(false);
assert.equal(await audio.play(), false);
assert.ok(stopped >= 3);
assert.ok(suspended > 0);
audio.setActive(true);
assert.equal(await audio.play(), true);
assert.equal(await createSoundPlayer(() => prefs, {}).play(), false);

let resumeLater;
class WaitingAudioContext extends FakeAudioContext {
  resume() { return new Promise(resolve => { resumeLater = () => { this.state = 'running'; resolve(); }; }); }
}
const waitingAudio = createSoundPlayer(() => prefs, { AudioContext: WaitingAudioContext });
const pending = waitingAudio.play();
waitingAudio.setActive(false);
resumeLater();
assert.equal(await pending, false, 'Leaving the simulator cancels sounds waiting for audio permission.');

assert.equal(translate('Запустить симулятор', 'en'), 'Start simulator');
assert.equal(translate('Настройки', 'kk'), 'Баптаулар');
const html = '<button aria-label="Запустить симулятор" data-action="start-game">Запустить симулятор</button><input value="Запустить симулятор"><span data-i18n-skip>Запустить симулятор</span>';
const localized = localizeMarkup(html, 'en');
assert.ok(localized.includes('aria-label="Start simulator"'));
assert.ok(localized.includes('data-action="start-game"'));
assert.ok(localized.includes('value="Запустить симулятор"'));
assert.ok(localized.includes('<span data-i18n-skip>Запустить симулятор</span>'));
assert.equal(localizeMarkup(html, 'ru'), html);
console.log('PASS: preferences validation/storage, brightness, audio gain/mute/exit, localization boundaries.');
