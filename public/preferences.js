/** Local simulator preferences and small, generated interface sounds. No media downloads. */
export const SETTINGS_STORAGE = 'akim-preferences-v1';
export const DEFAULT_SETTINGS = Object.freeze({ volume: 50, muted: false, musicVolume: 30, musicEnabled: true, brightness: 100, language: 'ru' });

export function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const bounded = (key, min, max) => typeof source[key] === 'number' && Number.isFinite(source[key])
    ? Math.min(max, Math.max(min, Math.round(source[key]))) : DEFAULT_SETTINGS[key];
  return {
    volume: bounded('volume', 0, 100),
    muted: typeof source.muted === 'boolean' ? source.muted : DEFAULT_SETTINGS.muted,
    musicVolume: bounded('musicVolume', 0, 100),
    musicEnabled: typeof source.musicEnabled === 'boolean' ? source.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
    brightness: bounded('brightness', 50, 120),
    language: ['ru', 'kk', 'en'].includes(source.language) ? source.language : DEFAULT_SETTINGS.language,
  };
}

export function loadSettings(storage) {
  try { return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_STORAGE) || 'null')); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(storage, value) {
  try { storage.setItem(SETTINGS_STORAGE, JSON.stringify(normalizeSettings(value))); return true; }
  catch { return false; }
}

/** Output overlay values rather than filtering the app, which would break fixed navigation. */
export function brightnessAppearance(value) {
  const brightness = normalizeSettings({ brightness: value }).brightness;
  return { color: brightness <= 100 ? '#000000' : '#ffffff', opacity: Math.abs(brightness - 100) / 100 };
}

export function createSoundPlayer(getPreferences, environment = globalThis) {
  let context;
  let generation = 0;
  let active = true;
  const voices = new Set();

  async function play(kind = 'click') {
    const prefs = getPreferences();
    if (!active || prefs.muted || prefs.volume === 0 || environment.document?.hidden) return false;
    const AudioContext = environment.AudioContext || environment.webkitAudioContext;
    if (!AudioContext) return false;
    const ownGeneration = generation;
    try {
      if (!context || context.state === 'closed') context = new AudioContext();
      if (context.state === 'suspended') await context.resume();
      const latest = getPreferences();
      if (ownGeneration !== generation || !active || latest.muted || latest.volume === 0 || environment.document?.hidden) return false;
      const at = context.currentTime;
      const cues = {
        success: [523.25, 659.25], error: [220], click: [440],
        headquarters: [196, 293.66, 392], city: [174.61, 261.63, 349.23],
        call: [659.25, 523.25, 659.25, 523.25], news: [392, 587.33, 783.99],
        alert: [220, 293.66, 220, 293.66],
      };
      const notes = cues[kind] || cues.click;
      for (const [index, frequency] of notes.entries()) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = at + index * 0.085;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.075 * (latest.volume / 100), start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        oscillator.connect(gain);
        gain.connect(context.destination);
        voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + 0.12);
      }
      return true;
    } catch { return false; }
  }

  function stop() {
    generation += 1;
    for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    voices.clear();
    if (context?.state === 'running') context.suspend().catch(() => {});
  }

  return {
    play, stop,
    setActive(value) { active = Boolean(value); if (!active) stop(); },
  };
}
