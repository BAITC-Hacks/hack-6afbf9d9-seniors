import { translate, localizeMarkup, SUPPORTED_LANGUAGES } from './i18n.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, normalizeSettings, brightnessAppearance, createSoundPlayer } from './preferences.js';
import { storyText, storyDecisions, storyOptionAvailability } from './story.js';
import { renderStory } from './story-view.js';
import { createMusicPlayer } from './music.js';
import { createStoryProgress, normalizeStoryProgress, serializeStoryProgress, nextStoryProgress, commitStoryChoice, chooseStoryInquiry, setStoryAllocations } from './story-flow.js';
import { STORY_CATEGORIES, defaultAllocations, allocationSummary, plannedOptionAvailability } from './story-budget.js';
import { campaignText } from './campaign.js';
import { getVisibleDecisions } from './drama.js';

const app = document.querySelector('#app');
const toastElement = document.querySelector('#toast');
const STORAGE = 'akim-simulator-v1';
const STORY_STORAGE = 'akim-story-v1';
const preferences = (() => { try { return loadSettings(localStorage); } catch { return { ...DEFAULT_SETTINGS }; } })();
const state = { data: null, evaluation: null, decisions: [], category: 'transport', district: 'nura', mapMode: 'after', page: 'menu', name: translate('Мой городской сценарий', preferences.language), report: null, saved: [], busy: false, analyzing: false, targets: {}, undo: null, loading: true, loadError: '' };
state.story = { ...createStoryProgress(), selected: null, evaluation: null, sceneEvaluation: null, confirmRestart: false };
state.storyBusy = false;
state.storyRestorePending = false;
const sound = createSoundPlayer(() => preferences, window);
const music = createMusicPlayer(() => preferences, window);
const locale = () => ({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' })[preferences.language];
const localize = html => localizeMarkup(html, preferences.language);
let toastTimer;
const viewRevision = { decisions: state.decisions, name: state.name, page: state.page, draft: 0, departure: 0 };
let pendingFocus = null;

const icons = {
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  exit: '<path d="M9 3H4v18h5M13 12h9m-4-4 4 4-4 4M9 7v10"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  music: '<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="15" rx="3" ry="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart: '<path d="M4 3v17h17M8 15v-4M13 15V6M18 15V9"/>',
  compare: '<rect x="3" y="5" width="7" height="15" rx="1.5"/><rect x="14" y="3" width="7" height="17" rx="1.5"/><path d="M6 9h1M6 13h1M17 7h1M17 11h1"/>',
  book: '<path d="M12 5v15M12 5C8 2 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-5-2-9 1Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sparkle: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4M18 4h4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet: '<path d="M19 7V4H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V6"/><path d="M20 11h-5v5h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  transport: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M9 3v8M15 3v8M7 18v3M17 18v3M8 15h1M15 15h1"/>',
  green: '<path d="M19 4C6 1 1 13 9 17c8 4 14-4 10-13ZM5 21l10-11"/>',
  social: '<path d="M4 21V7h6V3h10v18M2 21h20M7 10v2M7 15v2M13 7h4M13 11h4M13 15h4M13 21v-3h4v3"/>',
  safety: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  services: '<path d="m14 5 5 5M9 10l-6 6 5 5 6-6M12 3a6 6 0 0 0 7 8l3-3-5-1-1-5-4 1Z"/>',
  city: '<path d="M3 21V9h6v12M9 21V3h8v18M17 21V12h4v9M1 21h22M12 7h2M12 11h2M12 15h2M5 12h1M5 16h1"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  compass: '<path d="m12 3 6 18-6-4-6 4 6-18Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  print: '<path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7zM16 11h1"/>',
  refresh: '<path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
  flag: '<path d="M5 21V3c5-3 9 4 14 1v11c-5 3-9-4-14-1"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.city}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (value, digits = 2) => Number(value || 0).toLocaleString(locale(), { maximumFractionDigits: digits });
const signed = value => `${value > 0 ? '+' : ''}${num(value)}`;
const directionCount = decisions => `${new Set(decisions.map(d => d.categoryId)).size} ${new Set(decisions.map(d => d.categoryId)).size === 5 ? 'направлений' : 'направления'}`;
const category = id => state.data.categories.find(c => c.id === id);
const initiative = id => state.data.initiatives.find(m => m.id === id);
const district = id => state.data.districts.find(d => d.id === id);
const tones = { transport: ['#718967', '#eff3e9'], green: ['#659363', '#eaf4e7'], social: ['#b19365', '#f7f0e5'], safety: ['#6c89a4', '#ebf1f7'], services: ['#9781a3', '#f1ecf4'] };
const categoryIcon = id => `<span class="category-icon" style="--cat:${tones[id][0]};--tint:${tones[id][1]}">${icon(id)}</span>`;
const mapPositions = { esil: [46, 73], almaty: [78, 33], saryarka: [22, 24], baikonur: [51, 23], nura: [20, 69] };
const categoryCodes = { transport: ['T1', 'T2'], green: ['E1', 'E2'], social: ['S1', 'S2'], safety: ['B1', 'B2'], services: ['C1', 'C2'] };
const indicatorTitles = { T1: 'Разгрузка дорог', T2: 'Доступность транспорта', E1: 'Озеленение', E2: 'Качество воздуха', S1: 'Школы и детсады', S2: 'Первичная медицина', B1: 'Безопасность улиц', B2: 'Безопасность движения', C1: 'Надёжность ЖКХ', C2: 'Обращения жителей' };

async function api(path, decisions, language) {
  let response;
  try {
    response = await fetch(path, { signal: AbortSignal.timeout(path.includes('analyze') ? 65000 : 10000), ...(decisions === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions, ...(language ? { language } : {}) }) }) });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'Сервер не успел ответить. Попробуйте ещё раз.' : 'Нет связи с сервером. Проверьте, запущено ли приложение.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(typeof result.error === 'string' ? result.error : result.error?.message || result.message || 'Не удалось выполнить запрос.'), { status: response.status });
  return result;
}

function toast(message, isError = false, undo = false) {
  clearTimeout(toastTimer);
  toastElement.innerHTML = localize(`${esc(message)}${undo ? '<button data-action="undo">Вернуть</button>' : ''}`);
  toastElement.className = `toast visible ${isError ? 'error' : ''}`;
  toastTimer = setTimeout(() => { toastElement.className = 'toast'; }, undo ? 10000 : 5500);
}

function persist() {
  if (!state.data || state.loading || state.loadError) return;
  try { localStorage.setItem(STORAGE, JSON.stringify({ version: state.data.version, decisions: state.decisions, name: state.name, saved: state.saved })); }
  catch { toast('Хранилище браузера недоступно. Экспортируйте отчёт, чтобы сохранить результат.', true); }
}

function syncViewRevision() {
  if (viewRevision.decisions !== state.decisions || viewRevision.name !== state.name) {
    viewRevision.draft += 1;
    viewRevision.decisions = state.decisions;
    viewRevision.name = state.name;
  }
  if (viewRevision.page !== state.page) {
    if (!['simulation', 'report'].includes(state.page)) viewRevision.departure += 1;
    viewRevision.page = state.page;
  }
}

function focusArea(element) {
  return element.closest('.initiative-card') ? 'catalog' : element.closest('.scenario') ? 'scenario' : element.closest('.sidebar') ? 'sidebar' : 'main';
}

function captureRenderFocus() {
  const element = document.activeElement;
  if (!element || !app.contains(element)) return null;
  const attributes = {};
  for (const key of ['action', 'id', 'page', 'category', 'district', 'mode', 'target', 'storyBudget']) {
    if (element.dataset?.[key] !== undefined) attributes[key] = element.dataset[key];
  }
  if (!element.id && !element.name && !Object.keys(attributes).length) return null;
  return { id: element.id, name: element.name, tag: element.tagName, attributes, area: focusArea(element),
    start: typeof element.selectionStart === 'number' ? element.selectionStart : null,
    end: typeof element.selectionEnd === 'number' ? element.selectionEnd : null };
}

function restoreRenderFocus(snapshot) {
  pendingFocus = null;
  if (!snapshot) return;
  const controls = [...app.querySelectorAll('button, a, input, select, [tabindex]')];
  const matches = element => snapshot.id ? element.id === snapshot.id
    : snapshot.name ? element.name === snapshot.name
    : element.tagName === snapshot.tag && Object.entries(snapshot.attributes).every(([key, value]) => element.dataset?.[key] === value);
  let target = controls.find(element => matches(element) && focusArea(element) === snapshot.area)
    || controls.find(matches);
  if (!target && snapshot.attributes.id) {
    target = controls.find(element => element.dataset?.id === snapshot.attributes.id && ['add', 'remove'].includes(element.dataset?.action));
  }
  if (!target || target.disabled) {
    if (state.busy || state.analyzing) pendingFocus = snapshot;
    target = document.querySelector('#main');
  }
  target?.focus({ preventScroll: true });
  if (snapshot.start !== null && target?.name === snapshot.name && typeof target.setSelectionRange === 'function') {
    target.setSelectionRange(snapshot.start, snapshot.end);
  }
}

let mapSvgPromise;
let currentMapDeltas = {};

function evaluationDeltas(result) {
  const evaluation = result.evaluation || result;
  return result.deltas || evaluation.deltas || Object.fromEntries(
    (evaluation.districts || []).map(d => [d.id, d.delta]),
  );
}

function updateMapColors(deltas) {
  currentMapDeltas = deltas && typeof deltas === 'object' && !Array.isArray(deltas) ? { ...deltas } : {};
  const svg = document.querySelector('#city-map svg');
  if (!svg?.querySelectorAll) return; // The map may not be mounted yet.
  for (const [id, delta] of Object.entries(currentMapDeltas)) {
    // Only known districts and finite numbers; never interpolate untrusted selectors.
    if (!Object.hasOwn(mapPositions, id) || typeof delta !== 'number' || !Number.isFinite(delta)) continue;
    const color = delta > 0 ? '#84cc16' : delta < 0 ? '#ef4444' : '#94a3b8';
    for (const region of svg.querySelectorAll('[id], [class]')) {
      if (region.id !== id && !region.classList.contains(id)) continue;
      const shapes = region.matches('path, polygon, polyline, rect, circle, ellipse')
        ? [region] : region.querySelectorAll('path, polygon, polyline, rect, circle, ellipse');
      for (const shape of shapes) shape.style.setProperty('fill', color);
    }
  }
}

async function mountCityMap() {
  const container = document.querySelector('#city-map');
  if (!container?.isConnected || typeof DOMParser === 'undefined') return;
  try {
    // Load only the bundled same-origin asset. Keep the image fallback on failure.
    mapSvgPromise ||= fetch('/city-map.svg', { signal: AbortSignal.timeout(10000) })
      .then(response => {
        if (!response.ok) throw new Error('Map unavailable');
        return response.text();
      }).then(source => {
        const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
        const svg = parsed.documentElement;
        if (parsed.querySelector('parsererror') || svg.localName !== 'svg') throw new Error('Invalid SVG');
        // Do not insert active content, external references or event handlers.
        svg.querySelectorAll('script, foreignObject, style, a, animate, animateTransform, set').forEach(el => el.remove());
        for (const el of [svg, ...svg.querySelectorAll('*')]) {
          for (const attr of [...el.attributes]) {
            if (/^on/i.test(attr.name) || attr.name === 'style' || attr.localName === 'href' && !attr.value.startsWith('#')) el.removeAttributeNode(attr);
          }
        }
        return svg;
      }).catch(error => { mapSvgPromise = null; throw error; });
    const template = await mapSvgPromise;
    if (!container.isConnected) return; // A newer render replaced this container.
    const svg = document.importNode(template, true);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    container.replaceChildren(svg);
    updateMapColors(currentMapDeltas);
  } catch { /* The static map remains available if loading or parsing fails. */ }
}

function render() {
  const pageChanged = viewRevision.page !== state.page;
  const focus = !pageChanged && document.activeElement?.id === 'main' && pendingFocus ? pendingFocus : captureRenderFocus();
  syncViewRevision();
  applyPreferences();
  void music.setScene(state.page === 'exited' ? null : state.page === 'story' && state.story.phase === 'ending' && !Number.isInteger(state.story.replayIndex) ? 'finale' : 'ambient');
  if (state.page === 'story') {
    // Interactions reveal the current scene; entering a different scene starts
    // its entrance animation. Full text remains in the accessible document.
    const dialogueKey = JSON.stringify([state.story.phase, state.story.step, state.story.introStep, state.story.replayIndex, state.story.choices, state.story.inquiries, preferences.language]);
    if (state.story.dialogueKey !== dialogueKey) {
      state.story.dialogueKey = dialogueKey;
      state.story.dialogueExpanded = false;
    }
    app.innerHTML = renderStory({ data: state.data, story: state.story, language: preferences.language, busy: state.storyBusy || state.busy || state.analyzing, icon, num, signed });
    restoreRenderFocus(focus);
    return;
  }
  if (['menu', 'modes', 'settings', 'exited'].includes(state.page)) {
    app.innerHTML = localize(state.page === 'menu' ? menuView() : state.page === 'modes' ? modeView() : state.page === 'settings' ? settingsView() : exitView());
    restoreRenderFocus(focus);
    return;
  }
  const nav = [ ['simulation', 'grid', 'Симулятор'], ['report', 'chart', 'Анализ сценария'], ['compare', 'compare', 'Сравнение'], ['method', 'book', 'Как это работает'] ];
  const pageName = nav.find(n => n[0] === state.page)[2];
  app.innerHTML = `<aside class="sidebar">
    <a class="brand" href="#simulation" data-action="nav" data-page="simulation"><img src="/favicon.svg" alt=""/><span>Аким на 5 часов<small>ASTANA CITY LAB</small></span></a>
    <div class="nav-label">ВАШ ГОРОД</div><nav class="nav" aria-label="Основная навигация">${nav.map(([page, name, label]) => `<button class="nav-btn ${state.page === page ? 'active' : ''}" data-action="nav" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${page === 'compare' && state.saved.length ? `<span class="nav-count">${state.saved.length}</span>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="side-note"><span class="note-icon">${icon('green')}</span><strong>Город начинается с вас</strong><p>Пять решений сегодня.<br/>Качество жизни — на годы вперёд.</p></div><div class="team"><span class="avatar">S</span><div><strong>Команда Seniors</strong><small>Городская лаборатория</small></div>${icon('chevron')}</div></div>
  </aside><div class="workspace"><header class="topbar"><div class="breadcrumbs">Городская лаборатория ${icon('chevron')} <b>${pageName}</b></div><div class="mobile-brand"><img src="/favicon.svg" alt=""/>Аким на 5 часов</div><div class="top-actions"><span class="status-label"><i class="live-dot"></i>Синтетический город</span><button class="game-menu-shortcut" data-action="game-menu" aria-label="Главное меню">${icon('menu')}<span>Главное меню</span></button><button class="game-menu-shortcut" data-action="story-resume" aria-label="${esc(storyText('backToStory', preferences.language))}">${icon('book')}<span data-i18n-skip>${esc(storyText('backToStory', preferences.language))}</span></button><button class="help-btn" data-action="nav" data-page="method">${icon('help')}Правила симулятора</button></div></header>
  <main class="main" id="main" tabindex="-1">${state.page === 'simulation' ? simulationView() : state.page === 'report' ? reportView() : state.page === 'compare' ? comparisonView() : methodologyView()}<footer class="bottom-bar"><span>${icon('city')}ASTANA CITY LAB <strong>· Сделаем город лучше вместе</strong></span><span>Учебная модель · Данные условные · Seniors, 2026</span></footer></main></div>`;
  app.innerHTML = localize(app.innerHTML);
  updateMapColors(state.mapMode === 'before'
    ? Object.fromEntries(Object.keys(mapPositions).map(id => [id, 0]))
    : evaluationDeltas(state.evaluation || {}));
  void mountCityMap();
  restoreRenderFocus(focus);
}

function applyPreferences() {
  const appearance = brightnessAppearance(preferences.brightness);
  document.documentElement.lang = preferences.language;
  document.documentElement.style.setProperty('--brightness-color', appearance.color);
  document.documentElement.style.setProperty('--brightness-opacity', String(appearance.opacity));
  document.title = translate('Аким на 5 часов', preferences.language) + ' · Astana City Lab';
  const skip = document.querySelector('.skip-link');
  if (skip) skip.textContent = translate('Перейти к содержимому', preferences.language);
}

function updatePreference(key, value) {
  Object.assign(preferences, normalizeSettings({ ...preferences, [key]: value }));
  applyPreferences();
  try { if (!saveSettings(localStorage, preferences)) throw new Error('Storage unavailable'); }
  catch { toast('Настройки действуют до закрытия вкладки: хранилище браузера недоступно.', true); }
  if (preferences.muted || preferences.volume === 0) sound.stop();
  void music.sync();
}

function menuView() {
  return `<main class="game-screen" id="main" tabindex="-1"><div class="menu-content">
    <div class="game-brand"><img src="/favicon.svg" alt=""/><div>Аким на 5 часов<small>ASTANA CITY LAB</small></div></div>
    <div class="menu-copy"><div class="eyebrow">Астана · Симулятор городских решений</div><h1 data-i18n-skip>${esc(storyText('title', preferences.language))}</h1><p data-i18n-skip>${esc(storyText('subtitle', preferences.language))}</p></div>
    <nav class="menu-actions" aria-label="Главное меню">
      <button class="menu-button primary" data-action="start-game" ${state.loading ? 'disabled' : ''}>${icon('play')}<span data-i18n-skip>${esc(campaignText('start', preferences.language))}</span><span class="menu-button-number" aria-hidden="true">01</span></button>
      <button class="menu-button" data-action="open-settings">${icon('settings')}<span>Настройки</span><span class="menu-button-number" aria-hidden="true">02</span></button>
      <button class="menu-button exit" data-action="exit-game">${icon('exit')}<span>Выйти из симулятора</span><span class="menu-button-number" aria-hidden="true">03</span></button>
    </nav>
    <p class="menu-session-note ${state.loadError ? 'error' : ''}" role="status">${state.loading ? 'Загружаем районы и инициативы…' : state.loadError ? esc(state.loadError) : state.story.choices.length || state.decisions.length ? 'Ваш сценарий сохранён.' : 'Ваши решения сохраняются при выходе.'}</p>
    <footer class="menu-footer">${icon('shield')}<span>Учебная модель · Данные условные · Seniors, 2026</span></footer>
  </div><aside class="menu-scene" aria-hidden="true"><img src="/city-map.svg" alt=""/><div class="menu-scene-note"><span>ASTANA · CITY OF TOMORROW</span><h2>Большие перемены начинаются с малого.</h2><div class="menu-facts"><div><strong>5</strong><span>районов</span></div><div><strong>100</strong><span>единиц бюджета</span></div><div><strong>∞</strong><span>возможностей</span></div></div></div></aside></main>`;
}

function modeView() {
  const c = key => esc(campaignText(key, preferences.language));
  return `<main class="game-screen mode-screen" id="main" tabindex="-1"><div class="menu-content">
    <div class="game-brand"><img src="/favicon.svg" alt=""/><div>Аким на 5 часов<small>ASTANA CITY LAB</small></div></div>
    <div class="menu-copy" data-i18n-skip><div class="eyebrow">ASTANA CITY LAB</div><h1>${c('modeTitle')}</h1><p>${c('modeHint')}</p></div>
    <nav class="menu-actions mode-actions" aria-label="${c('modeTitle')}" data-i18n-skip>
      <button class="menu-button primary" data-action="mode-story">${icon('book')}<span><strong>${c('storyMode')}</strong><small>${c('storyModeHint')}</small></span><span class="menu-button-number" aria-hidden="true">01</span></button>
      <button class="menu-button" data-action="mode-free">${icon('grid')}<span><strong>${c('freeMode')}</strong><small>${c('freeModeHint')}</small></span><span class="menu-button-number" aria-hidden="true">02</span></button>
      <button class="menu-button exit" data-action="game-menu">${icon('arrow')}<span>${c('backMenu')}</span><span class="menu-button-number" aria-hidden="true">03</span></button>
    </nav><p class="menu-session-note">${state.loadError ? esc(state.loadError) : 'Ваши решения сохраняются при выходе.'}</p>
    <footer class="menu-footer">${icon('shield')}<span>Учебная модель · Данные условные · Seniors, 2026</span></footer>
    </div><aside class="menu-scene" aria-hidden="true"><img src="/city-map.svg" alt=""/><div class="menu-scene-note"><span>ASTANA · CITY OF TOMORROW</span><h2 data-i18n-skip>${c('modeHint')}</h2></div></aside></main>`;
}

function settingsView() {
  return `<main class="settings-screen" id="main" tabindex="-1"><section class="settings-card" aria-labelledby="settings-title">
    <button class="settings-back" data-action="game-menu">${icon('arrow')}Назад</button>
    <header class="settings-header"><div class="eyebrow">ASTANA CITY LAB</div><h1 id="settings-title">Настройки</h1><p>Настройте симулятор под себя</p></header>
    <div class="settings-body"><section class="setting-row" aria-labelledby="volume-title">
      <div class="setting-label">${icon('volume')}<div><strong id="volume-title">Звуки интерфейса</strong><span>Громкость звуков</span></div></div>
      <div class="setting-range"><input id="volume" name="volume" type="range" min="0" max="100" step="1" value="${preferences.volume}" data-setting="volume" aria-label="Громкость звуков" aria-valuetext="${preferences.volume}%"/><output for="volume" id="volume-value">${preferences.volume}%</output></div>
      <div class="setting-control"><button class="setting-toggle" data-action="toggle-sound" aria-pressed="${!preferences.muted}" aria-label="Звуки интерфейса">${icon('volume')}<span>${preferences.muted ? 'Выключен' : 'Включён'}</span></button><button class="btn" data-action="test-sound" ${preferences.muted || !preferences.volume ? 'disabled' : ''}>${icon('play')}Проверить звук</button></div>
    </section><section class="setting-row" aria-labelledby="music-title">
      <div class="setting-label">${icon('music')}<div><strong id="music-title">Фоновая музыка</strong><span>Спокойная тема для встреч и отдельная мелодия финала.</span></div></div>
      <div class="setting-range"><input id="musicVolume" name="musicVolume" type="range" min="0" max="100" step="1" value="${preferences.musicVolume}" data-setting="musicVolume" aria-label="Громкость музыки" aria-valuetext="${preferences.musicVolume}%"/><output for="musicVolume" id="musicVolume-value">${preferences.musicVolume}%</output></div>
      <div class="setting-control"><button class="setting-toggle" data-action="toggle-music" aria-pressed="${preferences.musicEnabled}" aria-label="Фоновая музыка">${icon('music')}<span>${preferences.musicEnabled ? 'Включена' : 'Выключена'}</span></button><span class="music-control-note">Независимо от звуков интерфейса</span></div>
    </section><section class="setting-row" aria-labelledby="brightness-title">
      <div class="setting-label">${icon('sun')}<div><strong id="brightness-title">Яркость симулятора</strong><span>Стандартная яркость — 100%.</span></div></div>
      <div class="setting-range"><input id="brightness" name="brightness" type="range" min="50" max="120" step="1" value="${preferences.brightness}" data-setting="brightness" aria-label="Яркость симулятора" aria-valuetext="${preferences.brightness}%"/><output for="brightness" id="brightness-value">${preferences.brightness}%</output></div>
      <div class="brightness-preview">${icon('sun')}<span>Город начинается с вас</span></div>
    </section><section class="setting-row" aria-labelledby="language-title">
      <div class="setting-label">${icon('language')}<div><strong id="language-title">Язык</strong><span>Язык интерфейса и новых отчётов</span></div></div>
      <select id="language" name="language" class="setting-language" data-setting="language" aria-labelledby="language-title">${SUPPORTED_LANGUAGES.map(l => `<option value="${l.id}" lang="${l.id}" data-i18n-skip ${preferences.language === l.id ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select>
    </section></div><div class="settings-actions"><button class="btn" data-action="reset-settings">${icon('refresh')}Сбросить настройки</button><button class="btn primary" data-action="game-menu">Вернуться в меню ${icon('arrow')}</button></div><p class="settings-note">Изменения сохраняются автоматически.</p>
  </section></main>`;
}

function exitView() {
  return `<main class="exit-screen" id="main" tabindex="-1"><section class="exit-card">${icon('check')}<h1>Работа с симулятором завершена</h1><p>Ваш сценарий сохранён.<br/>Теперь можно закрыть эту вкладку.</p><button class="btn primary" data-action="game-menu">${icon('arrow')}Снова в меню</button></section></main>`;
}

function openScreen(page) {
  state.page = page;
  sound.setActive(page !== 'exited');
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('#main')?.focus({ preventScroll: true });
}

function persistStory() {
  if (!state.data || state.loading || state.loadError || state.storyRestorePending) return;
  try {
    // Keep the storage key so version-one saves can be migrated in place.
    localStorage.setItem(STORY_STORAGE, JSON.stringify(serializeStoryProgress(state.story, state.data.version)));
  } catch { toast('Хранилище браузера недоступно. Экспортируйте отчёт, чтобы сохранить результат.', true); }
}

async function evaluateStoryScene(progress, evaluation) {
  const count = getVisibleDecisions(progress).length;
  return count === progress.choices.length ? evaluation
    : count ? api('/api/evaluate', storyDecisions(progress.choices.slice(0, count))) : state.data.baseline;
}

async function moveStory(action) {
  if (state.storyBusy || state.busy || state.analyzing) return;
  const progress = nextStoryProgress(state.story, action);
  await applyStoryProgress(progress);
}

async function applyStoryProgress(progress) {
  if (state.storyBusy || state.busy || state.analyzing) return;
  if (!progress) return;
  const page = state.page;
  const enteringEnding = progress.phase === 'ending' && state.story.phase !== 'ending';
  state.storyBusy = true;
  render();
  try {
    // Revisit the city's state at this point without deleting later decisions.
    const changesDecisions = JSON.stringify(progress.choices) !== JSON.stringify(state.story.choices);
    const evaluation = changesDecisions ? await api('/api/evaluate', storyDecisions(progress.choices)) : state.story.evaluation;
    const sceneEvaluation = await evaluateStoryScene(progress, evaluation);
    Object.assign(state.story, progress, { evaluation, sceneEvaluation, selected: progress.choices[progress.step] ?? null, confirmRestart: false, confirmReplan: false, replayIndex: null, replayEvaluation: null, focusDistrict: null });
    state.story.budgetDraft = progress.phase === 'planning'
      ? { ...(progress.allocations || defaultAllocations(state.data.initiatives, state.data.budget, progress.choices)) } : null;
    persistStory();
    if (state.page === page) {
      openScreen('story');
      if (enteringEnding) celebrateResult(evaluation?.score);
    }
  } catch (error) { toast(error.message, true); }
  finally { state.storyBusy = false; render(); }
}

function updateStoryBudget(target, commit = true) {
  if (state.page !== 'story' || state.story.phase !== 'planning' || state.storyBusy || state.busy || state.analyzing) return;
  const categoryId = target.dataset.storyBudget;
  const requested = Number(target.value);
  if (!STORY_CATEGORIES.includes(categoryId) || !Number.isFinite(requested)) return;
  const draft = state.story.budgetDraft || state.story.allocations || defaultAllocations(state.data.initiatives, state.data.budget, state.story.choices);
  const summary = allocationSummary(draft, state.story.choices, state.data.initiatives, state.data.budget);
  const maximum = state.data.budget - summary.allocated + draft[categoryId];
  const amount = Math.min(maximum, Math.max(summary.minimumByCategory[categoryId], Math.round(requested)));
  state.story.budgetDraft = { ...draft, [categoryId]: amount };
  target.value = String(amount);
  if (commit) render();
  else {
    // Keep the dragged slider in the DOM until pointer/keyboard interaction ends.
    const updated = allocationSummary(state.story.budgetDraft, state.story.choices, state.data.initiatives, state.data.budget);
    for (const [id, value] of [[`story-budget-value-${categoryId}`, amount], [`story-budget-remaining-${categoryId}`, amount - updated.spentByCategory[categoryId]], ['story-plan-allocated', updated.allocated], ['story-plan-reserve', updated.reserve]]) {
      const output = document.querySelector(`#${id}`);
      if (output) output.textContent = String(value);
    }
    target.setAttribute?.('aria-valuetext', String(amount));
  }
}

async function confirmStoryChoice() {
  if (state.storyBusy || state.story.phase !== 'meeting' || state.story.step >= 5) return;
  const { choices, step, selected } = state.story;
  const availability = plannedOptionAvailability(choices, step, selected, state.data.initiatives, state.data.budget, state.story.allocations);
  if (!availability.allowed) { toast(availability.reason === 'allocation' ? campaignText('allocationLocked', preferences.language) : storyText(availability.reason === 'budget' ? 'locked' : availability.reason, preferences.language), true); return; }
  if (choices[step] === selected) return;
  const progress = commitStoryChoice(state.story, selected);
  if (!progress) return;
  state.storyBusy = true;
  render();
  try {
    const evaluation = await api('/api/evaluate', storyDecisions(progress.choices));
    Object.assign(state.story, progress);
    state.story.evaluation = evaluation;
    state.story.sceneEvaluation = evaluation;
    persistStory();
    void sound.play('success');
  } catch (error) { toast(error.message, true); }
  finally { state.storyBusy = false; render(); }
}

async function openStoryScenario(withAnalysis = false) {
  if (state.storyBusy || state.busy || state.analyzing || state.story.choices.length !== 5) return;
  syncViewRevision();
  const departure = viewRevision.departure;
  const sourcePage = state.page;
  if (await setDecisions(storyDecisions(state.story.choices))) {
    state.name = storyText('title', preferences.language);
    state.report = null;
    persist();
    syncViewRevision();
    if (sourcePage !== state.page || departure !== viewRevision.departure) return;
    openScreen('simulation');
    if (withAnalysis) await analyze();
  }
}

async function openStoryReplay(index) {
  if (state.storyBusy || state.busy || state.analyzing || state.story.phase !== 'ending' || state.story.choices.length !== 5 || !Number.isInteger(index) || index < 0 || index >= 5) return;
  const sourceStory = state.story;
  const sourcePage = state.page;
  syncViewRevision();
  const departure = viewRevision.departure;
  state.storyBusy = true;
  render();
  try {
    const evaluation = await api('/api/evaluate', storyDecisions(sourceStory.choices.slice(0, index + 1)));
    syncViewRevision();
    if (state.story !== sourceStory || state.page !== sourcePage || viewRevision.departure !== departure) return;
    // Replay is a read-only view. Its results never replace the canonical
    // ending, choices, free-mode draft or saved progress.
    Object.assign(sourceStory, { replayIndex: index, replayEvaluation: evaluation, focusDistrict: null });
    openScreen('story');
  } catch (error) { toast(error.message, true); }
  finally { state.storyBusy = false; render(); }
}

async function restoreStory() {
  state.story = { ...createStoryProgress(), selected: null, evaluation: state.data.baseline, sceneEvaluation: state.data.baseline, confirmRestart: false };
  state.storyRestorePending = false;
  let restored;
  try {
    const saved = JSON.parse(localStorage.getItem(STORY_STORAGE) || 'null');
    restored = saved?.datasetVersion === state.data.version ? normalizeStoryProgress(saved) : null;
  } catch { return; /* Malformed or unavailable storage starts a fresh session. */ }
  if (!restored) return;
  if (restored.allocations && !allocationSummary(restored.allocations, restored.choices, state.data.initiatives, state.data.budget).valid) restored.allocations = null;
  const { choices, step } = restored;
  if (choices.length && !storyOptionAvailability(choices, choices.length - 1, choices.at(-1), state.data.initiatives, state.data.budget).allowed) return;
  // A valid save is never replaced until its server evaluation succeeds.
  // Network errors reach boot's retry UI; exit cannot overwrite this save.
  state.storyRestorePending = true;
  const evaluation = choices.length ? await api('/api/evaluate', storyDecisions(choices)) : state.data.baseline;
  const sceneEvaluation = await evaluateStoryScene(restored, evaluation);
  state.story = { ...restored, selected: choices[step] ?? null, evaluation, sceneEvaluation, confirmRestart: false };
  if (restored.phase === 'planning') state.story.budgetDraft = { ...(restored.allocations || defaultAllocations(state.data.initiatives, state.data.budget, restored.choices)) };
  state.storyRestorePending = false;
}

function pageHeader(eyebrow, title, subtitle, buttons = '') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${buttons ? `<div class="head-buttons">${buttons}</div>` : ''}</div>`;
}

function simulationView() {
  const e = state.evaluation;
  return `${pageHeader('Астана · Симулятор городских решений', 'Ваш город. Ваши решения.', 'Распределите бюджет и посмотрите, как изменится жизнь города.', `<button class="btn" data-action="preset" ${state.busy ? 'disabled' : ''}>${icon('sparkle')}Пример из задания</button><button class="btn primary" data-action="reset" ${state.busy ? 'disabled' : ''}>${icon('plus')}Новый сценарий</button>`)}
  <section class="stats" aria-label="Показатели сценария">
    <div class="stat-card" id="budget-counter"><div class="stat-title">${icon('wallet')}Доступный бюджет</div><span class="stat-badge">${icon('wallet')}</span><div class="stat-value">${num(e.remaining)}<span class="unit">из ${e.budget} ед.</span></div><div class="budget-track" aria-label="Использовано ${e.spent} из ${e.budget}"><span style="width:${e.spent / e.budget * 100}%"></span></div><div class="stat-foot">Распределено <strong>${e.spent} ед.</strong> · одинаковый старт для всех</div></div>
    <div class="stat-card score-card"><div class="stat-title">${icon('green')}Astana Quality of Life Score</div><span class="stat-badge">${icon('chart')}</span><div class="stat-value">${num(e.score)}<span class="unit">/ 100</span>${e.delta ? `<span class="delta ${e.delta < 0 ? 'negative' : 'positive'}">${signed(e.delta)}</span>` : ''}</div><div class="stat-foot">${state.decisions.length ? 'Прогноз через 8 кварталов' : 'Исходное качество жизни города'}</div></div>
    <div class="stat-card"><div class="stat-title">${icon('layers')}Ваши управленческие решения</div><span class="stat-badge">${icon('flag')}</span><div class="stat-value">${state.decisions.length}<span class="unit">/ 5 решений</span></div><div class="decision-dots" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<span class="${i < state.decisions.length ? 'filled' : ''}"></span>`).join('')}</div><div class="stat-foot">${state.decisions.length === 5 ? 'Все решения приняты. Время оценить результат.' : 'До 2 мероприятий из одного направления'}</div></div>
  </section>
  ${state.analyzing ? '<div class="loading-line" role="status"><span class="loader"></span>Анализируем сценарий. Проверяем эффекты, риски и компромиссы…</div>' : ''}
  <div class="overview-grid">${mapView()}${scenarioView()}</div>
  <section class="catalog" aria-labelledby="catalog-title"><div class="section-header"><div><h2 id="catalog-title">Инвестиции в будущее города</h2><p>Выберите инициативы, которые действительно важны.</p></div><span class="quiet-label">${icon('clock')}Горизонт планирования — 2 года</span></div>
  <div class="category-tabs" role="tablist" aria-label="Направление инициатив">${state.data.categories.map(c => `<button id="tab-${c.id}" role="tab" aria-selected="${c.id === state.category}" aria-controls="initiative-list" class="category-tab ${c.id === state.category ? 'active' : ''}" data-action="category" data-category="${c.id}">${icon(c.id)}${esc(c.shortName || c.name)}<span class="tab-count">${state.data.initiatives.filter(m => m.categoryId === c.id).length}</span></button>`).join('')}</div>
  <div id="initiative-list" class="initiative-grid" role="tabpanel" aria-labelledby="tab-${state.category}">${state.data.initiatives.filter(m => m.categoryId === state.category).map(initiativeView).join('')}</div>
  <div class="catalog-note">${icon('info')}На карточках показан эффект за 8 кварталов с учётом срока запуска. Все показатели: от 0 до 100, больше — лучше. Синергии учитываются отдельно.</div></section>`;
}

function districtCategoryValue(d, id) {
  const codes = categoryCodes[id];
  const indicators = codes.map(code => state.data.indicators?.find(i => i.id === code) || { id: code, weight: .1 });
  const weight = indicators.reduce((s, i) => s + i.weight, 0);
  const values = state.mapMode === 'before' ? d.baselineMetrics : d.metrics;
  return indicators.reduce((s, i) => s + (values?.[i.id] || 0) * i.weight, 0) / weight;
}

function mapView() {
  const current = state.evaluation.districts.find(d => d.id === state.district);
  return `<section class="panel" aria-label="Карта и показатели районов"><div class="panel-header"><div><h2 class="panel-title">Пульс города</h2><p class="panel-subtitle">5 районов. Одно общее будущее.</p></div><div class="map-mode" aria-label="Показатели на карте"><button class="${state.mapMode === 'before' ? 'active' : ''}" data-action="map-mode" data-mode="before" aria-pressed="${state.mapMode === 'before'}">Сейчас</button><button class="${state.mapMode === 'after' ? 'active' : ''}" data-action="map-mode" data-mode="after" aria-pressed="${state.mapMode === 'after'}">Прогноз</button></div></div>
  <div class="map-canvas"><div id="city-map" class="map-art"><img class="map-art" src="/city-map.svg" alt="Схематическая карта Астаны с рекой Есиль и городской застройкой"/></div><div class="map-compass">С${icon('compass')}</div>${state.evaluation.districts.map(d => { const pos = mapPositions[d.id]; const score = state.mapMode === 'before' ? d.before : d.after; return `<button class="map-pill ${d.id === state.district ? 'active' : ''} ${score < 53 ? 'low' : ''}" style="left:${pos[0]}%;top:${pos[1]}%" data-action="district" data-district="${d.id}" aria-pressed="${d.id === state.district}" aria-label="Район ${esc(d.name)}, оценка ${num(score)}">${esc(d.name)}<b>${num(score, 1)}</b></button>`; }).join('')}<span class="map-watermark">СХЕМАТИЧЕСКАЯ КАРТА · ГРАНИЦЫ УСЛОВНЫ</span><div class="map-legend">Ниже<span class="legend-scale"></span>Выше</div></div>
  <div class="district-summary"><div><strong>${esc(current.name)}</strong><small>${num(current.population * 100, 0)}% населения города</small></div><div class="mini-indicators">${state.data.categories.map(c => { const value = districtCategoryValue(current, c.id); return `<div class="mini-indicator"><div><span>${esc(c.shortName || c.name)}</span><b>${num(value, 0)}</b></div><div class="tiny-track"><span style="width:${Math.min(100, value)}%"></span></div></div>`; }).join('')}</div></div></section>`;
}

function scenarioView() {
  const e = state.evaluation;
  return `<section class="panel scenario" aria-label="Выбранный сценарий"><div class="panel-header"><h2 class="panel-title">Ваш сценарий</h2><span class="count-pill">${state.decisions.length} / 5</span></div><input class="scenario-name" name="scenario-name" aria-label="Название сценария" maxlength="70" value="${esc(state.name)}" placeholder="Название сценария"/>
  <div class="scenario-items">${state.decisions.length ? state.decisions.map(d => { const m = initiative(d.initiativeId); return `<div class="scenario-item">${categoryIcon(m.categoryId)}<div class="scenario-item-info"><strong>${esc(m.title)}</strong><small>${esc(d.districtId ? district(d.districtId).name : 'Весь город')} · ${m.id}</small></div><b class="scenario-item-cost">${m.cost}</b><button class="remove-btn" data-action="remove" data-id="${m.id}" aria-label="Убрать ${esc(m.title)}" ${state.busy ? 'disabled' : ''}>${icon('close')}</button></div>`; }).join('') : `<div class="empty-scenario"><span class="empty-icon">${icon('layers')}</span><p>Начните с одного решения</p><small>Добавляйте инициативы из каталога ниже. Каждое решение имеет значение.</small></div>`}</div>
  <div class="scenario-footer"><div class="scenario-total"><span>Стоимость сценария</span><b>${e.spent} <span>/ ${e.budget} ед.</span></b></div><button class="btn primary full" data-action="analyze" ${!e.complete || state.busy || state.analyzing ? 'disabled' : ''}>${icon('sparkle')}${state.analyzing ? 'Анализируем…' : 'Оценить мой сценарий'}${icon('arrow')}</button><p class="scenario-hint">${e.complete ? 'Получите итоговый Score и разбор решений' : `Добавьте ещё ${5 - state.decisions.length} ${5 - state.decisions.length === 1 ? 'решение' : (5 - state.decisions.length < 5 ? 'решения' : 'решений')}, чтобы получить анализ`}</p><div class="scenario-help">${icon('shield')}Бюджет и правила проверяются автоматически</div></div></section>`;
}

const budgetShakeTimers = new WeakMap();

function shakeBudget() {
  const counter = document.querySelector(state.page === 'story' ? '.story-budget' : '#budget-counter');
  if (!counter?.classList) return;
  clearTimeout(budgetShakeTimers.get(counter));
  counter.classList.remove('shake');
  void counter.offsetWidth; // Restart the animation even on repeated clicks.
  counter.classList.add('shake');
  budgetShakeTimers.set(counter, setTimeout(() => {
    counter.classList.remove('shake');
    budgetShakeTimers.delete(counter);
  }, 500));
}

function blockedReason(m, target) {
  if (state.decisions.some(d => d.initiativeId === m.id)) return '';
  if (state.decisions.length >= 5) return 'Уже выбрано 5 решений. Уберите одно для замены.';
  if (m.cost > state.evaluation.remaining) return `Не хватает ${m.cost - state.evaluation.remaining} ед. бюджета.`;
  if (state.decisions.filter(d => d.categoryId === m.categoryId).length >= 2) return 'Можно выбрать до 2 мер из одного направления.';
  if ((m.id === 'M1' && state.decisions.some(d => d.initiativeId === 'M3')) || (m.id === 'M3' && state.decisions.some(d => d.initiativeId === 'M1'))) return 'M1 и M3 несовместимы: выберите BRT или ЛРТ.';
  for (const pair of [['M4', 'M7'], ['M5', 'M13']]) {
    if (pair.includes(m.id) && state.decisions.some(d => d.initiativeId === pair.find(id => id !== m.id) && d.districtId === target)) return `Конфликт с ${pair.find(id => id !== m.id)} в этом районе. Выберите другой район.`;
  }
  return '';
}

function initiativeView(m) {
  const selected = state.decisions.find(d => d.initiativeId === m.id);
  const target = selected?.districtId || state.targets[m.id] || state.district;
  const blocked = blockedReason(m, target);
  const overBudget = !selected && state.decisions.length < 5 && m.cost > state.evaluation.remaining;
  return `<article class="initiative-card ${selected ? 'selected' : ''}" data-measure="${m.id}"><div class="initiative-top">${categoryIcon(m.categoryId)}<span class="measure-id">${m.id}</span><span class="scope-chip">${icon(m.scope === 'city' ? 'city' : 'pin')}${m.scope === 'city' ? 'Весь город' : 'Один район'}</span></div><h3>${esc(m.title)}</h3><p class="initiative-description">${esc(m.description)}</p><div class="effect-chips">${Object.entries(m.effects).map(([id, value]) => { const effect = value * (8 - m.lag) / 8; return `<span class="effect-chip ${effect < 0 ? 'negative' : ''}" title="${esc(indicatorTitles[id])}">${id} ${signed(effect)} ${esc(indicatorTitles[id])}</span>`; }).join('')}</div><div class="initiative-meta"><b>${m.cost} <small>ед.</small></b><span>${icon('clock')}Запуск через ${m.lag} кв.</span></div>
  ${m.scope === 'district' ? `<select class="card-select" data-target="${m.id}" aria-label="Район для ${esc(m.title)}" ${state.busy ? 'disabled' : ''}>${state.data.districts.map(d => `<option value="${d.id}" ${d.id === target ? 'selected' : ''}>${esc(d.name)}${d.id === 'nura' ? ' · приоритетный район' : ''}</option>`).join('')}</select>` : `<div class="city-target">${icon('city')}Эффект во всех пяти районах</div>`}
  <button class="btn add-btn full ${selected ? 'selected' : ''}" data-action="${selected ? 'remove' : 'add'}" data-id="${m.id}" ${state.busy || (blocked && !overBudget) ? 'disabled' : ''} ${overBudget ? 'aria-disabled="true"' : ''}>${icon(selected ? 'check' : 'plus')}${selected ? 'В сценарии · убрать' : 'Добавить в сценарий'}</button>${blocked ? `<p class="blocked-reason">${esc(blocked)}</p>` : ''}</article>`;
}

function optimizerView() {
  const advice = state.report.optimizer;
  return `<section class="panel content-panel report-section"><h2>Как улучшить мой план?</h2>
    <p>Сравните результат с лучшим допустимым планом для этой модели города.</p>
    ${advice ? `<div class="formula-breakdown"><div>Ваш Score<b>${num(advice.currentScore)}</b></div><div>Лучший Score<b>${num(advice.bestScore)}</b></div><div>Можно прибавить<b>${num(advice.gap)}</b></div></div>
      <h3>Оптимальные пять решений</h3><ul>${advice.bestPlan.map(d => `<li>${esc(d.initiativeId)} · ${esc(initiative(d.initiativeId).title)} · ${esc(d.districtId ? district(d.districtId).name : 'Весь город')}</li>`).join('')}</ul>
      <p><span>Проверено допустимых планов:</span> ${num(advice.plansExamined)}</p>` :
      `<button class="btn primary" data-action="optimize" ${state.report.optimizing ? 'disabled' : ''}>${state.report.optimizing ? 'Сравниваем…' : 'Показать лучший план'}</button>`}
    </section>`;
}

function celebrateResult(final_score) {
  if (typeof final_score !== 'number' || !Number.isFinite(final_score) || final_score <= 52.56) return;
  if (typeof window.confetti !== 'function') return;
  try {
    window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  } catch { /* Optional animation must never interrupt the result screen. */ }
}

function shareToTelegram(final_score = state.report?.evaluation?.score) {
  if (typeof final_score !== 'number' || !Number.isFinite(final_score)) return;
  const text = `Я набрал ${final_score} баллов в симуляторе Акима! А сможешь ли ты спасти город?`;
  const url = `https://t.me/share/url?url=${encodeURIComponent('https://hackalem.ai')}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function reportView() {
  if (!state.report) return `${pageHeader('От решений к результатам', 'Будущее города в цифрах', 'Сначала соберите сценарий — здесь появится его подробный разбор.')}<section class="panel empty-page">${icon('chart')}<h2>Каким станет ваш город?</h2><p>Выберите ровно 5 мероприятий и нажмите «Оценить мой сценарий». Сравним показатели, найдём сильные стороны и объясним компромиссы.</p><button class="btn primary" data-action="nav" data-page="simulation">Перейти к решениям ${icon('arrow')}</button></section>`;
  const { evaluation: e, analysis: a } = state.report;
  const same = decisionKey(state.decisions) === decisionKey(e.decisions);
  const metricRows = e.metrics.map(m => `<div class="metric-compare-row"><span>${esc(category(m.id)?.shortName || m.name)}</span><div class="metric-compare-track"><span class="before" style="width:${m.before}%"></span><span class="after" style="width:${m.after}%"></span></div><b>${signed(m.delta)}</b></div>`).join('');
  return `${pageHeader('Анализ городского сценария', `<span data-i18n-skip>${esc(state.report.name || 'Ваш сценарий')}</span>`, 'Измеримый результат. Понятные последствия. Следующий шаг.', `<button class="btn" data-action="export">${icon('download')}Скачать JSON</button><button class="btn primary" data-action="print">${icon('print')}Печать отчёта</button><button type="button" class="btn telegram-share" data-action="share-telegram">Поделиться в Telegram</button>`)}
    ${!same ? '<div class="draft-warning">Это сохранённый результат. Текущие решения изменились — выполните анализ заново, чтобы обновить отчёт.</div>' : ''}
    ${optimizerView()}
  <section class="report-hero"><div class="score-ring" style="--score:${Math.max(0, Math.min(100, e.score))}"><div><b>${num(e.score)}</b><span>QUALITY OF LIFE SCORE</span></div></div><div><div class="eyebrow">Астана через 8 кварталов</div><h2>${e.delta > 0 ? 'У города есть изменения к лучшему' : 'У каждого решения есть последствия'}</h2><p data-i18n-skip>${esc(a.summary)}</p><div class="report-tags"><span class="tag ${e.delta < 0 ? 'negative' : 'positive'}">${signed(e.delta)} к исходным ${num(e.baselineScore)}</span><span class="tag">${e.spent} из ${e.budget} ед.</span><span class="tag">5 решений · ${directionCount(e.decisions)}</span></div></div></section>
  ${(a.language || 'ru') !== preferences.language ? '<div class="draft-warning">Этот отчёт создан на другом языке. Выполните анализ заново, чтобы получить новый перевод.</div>' : ''}
  ${a.mode !== 'ai' ? `<div class="analysis-notice">${icon('info')}<span><strong>Демонстрационный разбор · без LLM.</strong> ${esc(a.notice || 'API-ключ не настроен. Объяснение сформировано правилами по рассчитанным данным. Для AI-разбора подключите OpenAI на сервере.')}</span></div>` : `<div class="analysis-notice">${icon('sparkle')}<span><strong>AI-анализ · OpenAI.</strong> Числа рассчитаны моделью; AI объясняет эффекты и компромиссы. ${esc(a.notice || '')}</span></div>`}
  <div class="report-grid"><section class="panel"><h2>${icon('green')}Что удалось улучшить</h2>${insightList(a.strengths)}</section><section class="panel"><h2>${icon('shield')}Риски и компромиссы</h2>${insightList(a.risks)}</section><section class="panel"><h2>${icon('sparkle')}Следующие шаги</h2>${insightList(a.recommendations)}</section><section class="panel"><h2>${icon('chart')}Изменения по направлениям</h2><div class="metric-comparison">${metricRows}</div><p class="panel-subtitle" style="margin-top:18px">Светлая полоса — исходный уровень, тёмная — прогноз.</p></section></div>
  <section class="panel content-panel report-section"><h2>Каждый район имеет значение</h2><div class="table-scroll"><table><thead><tr><th>Район</th><th>Доля населения</th><th>Сейчас</th><th>Через 2 года</th><th>Изменение</th><th>Показателей &lt; 40</th></tr></thead><tbody>${e.districts.map(d => `<tr><td>${esc(d.name)}</td><td>${num(d.population * 100)}%</td><td>${num(d.before)}</td><td>${num(d.after)}</td><td class="${d.delta >= 0 ? 'positive' : 'negative'}">${signed(d.delta)}</td><td>${Object.values(d.metrics).filter(v => v < 40).length}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel content-panel"><h2>Из чего складывается Score</h2><div class="formula-box">0,7 × ${num(e.weightedAverage)} + 0,3 × ${num(e.minDistrict)} − ${e.criticalCount} = ${num(e.score)}</div><p>70% — средневзвешенная оценка города, 30% — оценка самого слабого района. За каждый показатель строго ниже 40 вычитается 1 балл. Расчёт выполняется до округления.</p><div class="formula-breakdown"><div>Среднее по городу<b>${num(e.weightedAverage)}</b></div><div>Самый слабый район<b>${num(e.minDistrict)}</b></div><div>Критические показатели<b>${e.criticalCount}</b></div></div></section>
  <section class="panel content-panel"><h2>Пять решений вашего сценария</h2><div class="table-scroll"><table><thead><tr><th>Мера</th><th>Мероприятие</th><th>Район</th><th>Стоимость</th><th>Запуск</th><th>Эффект за 8 кварталов</th></tr></thead><tbody>${e.decisions.map(d => { const m = initiative(d.initiativeId); return `<tr><td>${esc(m.id)}</td><td>${esc(m.title)}</td><td>${esc(d.districtId ? district(d.districtId).name : 'Весь город')}</td><td>${m.cost} ед.</td><td>${m.lag} кв.</td><td>${Object.entries(m.effects).map(([id, value]) => `${id} ${signed(value * (8 - m.lag) / 8)}`).join('; ')}</td></tr>`; }).join('')}</tbody></table></div><p class="panel-subtitle">Эффекты показаны до ограничения показателей диапазоном 0–100. Изменения Score рассчитаны до округления, поэтому разница отображённых чисел может отличаться на 0,01.</p></section>
  ${e.synergies?.length ? `<section class="panel content-panel"><h2>Сработавшие синергии</h2><ul>${e.synergies.map(s => `<li><strong>${esc(s.id)}</strong> · ${esc(s.districtName)}: ${Object.entries(s.effects).map(([id, value]) => `${id} ${signed(value)}`).join(', ')}. ${esc(s.title)}.</li>`).join('')}</ul><p>Дополнительные бонусы применены без уменьшения на лаг.</p></section>` : ''}
  <section class="panel content-panel"><h2>Все показатели: до → после</h2>${indicatorTable(e.districts, true)}</section>
  <div class="no-print"><button class="btn primary" data-action="nav" data-page="simulation">${icon('refresh')}Продолжить эксперимент</button><button class="btn text-btn" data-action="nav" data-page="compare">Сравнить сценарии ${icon('arrow')}</button></div>`;
}

function insightList(items) { return `<ul class="insight-list">${(items || []).map(text => `<li data-i18n-skip>${esc(text)}</li>`).join('')}</ul>`; }
function decisionKey(decisions) { return JSON.stringify(decisions.map(d => [d.initiativeId, d.districtId || null]).sort((a, b) => a[0].localeCompare(b[0]))); }

function comparisonView() {
  return `${pageHeader('Лаборатория сценариев', 'У каждого города есть альтернативы', 'Сравните результаты команд или разные подходы к развитию города.', '<button class="btn primary" data-action="nav" data-page="simulation">'+icon('plus')+'К симулятору</button>')}
  ${state.saved.length ? `<div class="analysis-notice">${icon('info')}Сценарии сохраняются в этом браузере. У всех одинаковые исходные данные и бюджет 100 ед. Экспортируйте JSON, чтобы передать результат команде.</div><div class="compare-cards">${[...state.saved].sort((a, b) => b.evaluation.score - a.evaluation.score).map((r, index) => `<section class="panel comparison-card"><span class="tag">${index === 0 ? 'Лучший результат' : 'Альтернативный сценарий'}</span><h2 data-i18n-skip>${esc(r.name)}</h2><span class="compare-date">${esc(new Date(r.savedAt).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }))}</span><div class="comparison-score">${num(r.evaluation.score)} <span class="delta">${signed(r.evaluation.delta)}</span></div><p>${r.evaluation.spent} / 100 ед. · Критических показателей: ${r.evaluation.criticalCount}</p><div class="compare-actions"><button class="btn small primary" data-action="open-report" data-id="${esc(r.id)}">Посмотреть отчёт</button><button class="btn small" data-action="load-report" data-id="${esc(r.id)}">Изменить решения</button></div></section>`).join('')}</div>` : `<section class="panel empty-page">${icon('compare')}<h2>Один город — разные стратегии</h2><p>Завершённые анализы появятся здесь автоматически. Соберите первый сценарий, затем измените решения и сравните результаты.</p><button class="btn primary" data-action="nav" data-page="simulation">Собрать первый сценарий ${icon('arrow')}</button></section>`}`;
}

function indicatorTable(districts, comparison = false) {
  const codes = Object.keys(indicatorTitles);
  return `<div class="table-scroll"><table><thead><tr><th>Район</th>${codes.map(id => `<th title="${esc(indicatorTitles[id])}">${id}</th>`).join('')}<th>Оценка района</th></tr></thead><tbody>${districts.map(d => `<tr><td>${esc(d.name)}</td>${codes.map(id => `<td class="${d.metrics[id] < 40 ? 'critical-value' : ''}">${comparison && d.metrics[id] !== d.baselineMetrics[id] ? `${num(d.baselineMetrics[id])} → ` : ''}${num(d.metrics[id])}</td>`).join('')}<td>${num(d.after)}</td></tr>`).join('')}</tbody></table></div>`;
}

function methodologyView() {
  const rules = [ ['100 условных единиц', 'Единый бюджет. Остаток не сгорает и не даёт бонуса к Score.'], ['Ровно 5 решений', 'Каждое мероприятие можно выбрать только один раз. Порядок не влияет на результат.'], ['Не больше 2 мер из направления', 'Сценарий затронет минимум 3 направления. Охватывать все 5 необязательно.'], ['Выберите территорию', 'Районные меры работают только в выбранном районе, городские — во всех пяти.'], ['Проверьте совместимость', 'M1 и M3 нельзя сочетать. M4 и M7, а также M5 и M13 нельзя размещать в одном районе.'], ['Два года на изменения', 'Горизонт — 8 кварталов. Реализуется доля эффекта (8 − лаг) / 8.'] ];
  return `${pageHeader('Прозрачная модель', 'Как работают ваши решения', 'Точные правила из задания. Воспроизводимый расчёт. Никакой магии в числах.')}
  <div class="method-grid"><section class="panel content-panel"><h2>Правила городского эксперимента</h2>${rules.map(([title, text], i) => `<div class="method-rule"><span class="rule-no">${i + 1}</span><p><b>${title}</b><br/>${text}</p></div>`).join('')}</section><section class="panel content-panel"><h2>Формула качества жизни</h2><div class="formula-box">I′ = clip(I + Σ эффект × (8 − лаг) / 8<br/>+ синергии, 0, 100)<br/>D = Σ вес показателя × I′<br/>D_avg = Σ доля населения × D<br/><strong>Score = 0,7 × D_avg + 0,3 × min(D) − N_crit</strong></div><p>N_crit — число пар «район × показатель» со значением строго ниже 40. Сначала считаем все эффекты без промежуточного округления. Округление — только для отображения.</p><h3>Почему важен самый слабый район?</h3><p>30% итоговой оценки зависит от него. Это поощряет равномерное развитие, а штраф за критические значения не позволяет забыть о серьёзных проблемах.</p></section></div>
  <section class="panel content-panel"><h2>Исходные данные районов</h2><p>Синтетический учебный датасет из задания, не официальная статистика Астаны. Шкала 0–100: чем больше, тем лучше. Базовый Score: <strong>${num(state.data.baseline.score)}</strong>.</p>${indicatorTable(state.data.baseline.districts)}</section>
  <section class="panel content-panel"><h2>Показатели и веса</h2><div class="table-scroll"><table><thead><tr><th>Код</th><th>Показатель</th><th>Направление</th><th>Вес</th></tr></thead><tbody>${Object.entries(indicatorTitles).map(([id, name]) => { const meta = state.data.indicators?.find(i => i.id === id); return `<tr><td>${id}</td><td>${name}</td><td>${esc(category(meta?.categoryId)?.name || '')}</td><td>${num(meta?.weight || .1)}</td></tr>`; }).join('')}</tbody></table></div></section>
  <div class="method-grid"><section class="panel content-panel"><h2>Решения работают вместе</h2><p>Бонусы синергии фиксированные, без поправки на лаг:</p><ul><li><b>M1 + M2:</b> T1 +2 в районе M1.</li><li><b>M10 + M12:</b> B1 +2 в районе M10.</li><li><b>M5 + M6:</b> E2 +2 в районе M5.</li></ul></section><section class="panel content-panel"><h2>Роль искусственного интеллекта</h2><p>Код проверяет правила и рассчитывает числа. AI получает готовый расчёт, объясняет сильные стороны, риски и компромиссы, предлагает следующие шаги.</p><p style="margin-top:10px">${state.data.ai?.enabled ? 'OpenAI настроен на сервере. Если провайдер недоступен, приложение явно обозначит переход на демонстрационный разбор.' : 'Сейчас доступен демонстрационный разбор по правилам. Для LLM-анализа задайте OPENAI_API_KEY на сервере; инструкция находится в README.'}</p></section></div>`;
}

async function setDecisions(next, message = '') {
  if (state.busy) return false;
  state.busy = true;
  render();
  try {
    const evaluation = await api('/api/evaluate', next);
    state.decisions = next;
    state.evaluation = evaluation;
    updateMapColors(evaluationDeltas(evaluation));
    persist();
    if (message) toast(message);
    return true;
  } catch (error) { toast(error.message, true); return false; }
  finally { state.busy = false; render(); }
}

async function analyze() {
  if (state.analyzing || state.busy || !state.evaluation.complete) return;
  state.analyzing = true;
  const requestedDecisions = structuredClone(state.decisions);
  const requestedName = state.name.trim() || 'Мой городской сценарий';
  const requestedLanguage = preferences.language;
  render();
  const requestedRevision = viewRevision.draft;
  const requestedDeparture = viewRevision.departure;
  const requestedReport = state.report;
  try {
    const result = await api('/api/analyze', requestedDecisions, requestedLanguage);
    const saved = { ...result, analysis: { ...result.analysis, language: result.analysis.language || requestedLanguage }, name: requestedName, savedAt: new Date().toISOString(), id: crypto.randomUUID() };
    const matching = state.saved.findIndex(r => decisionKey(r.evaluation.decisions) === decisionKey(requestedDecisions) && r.name === requestedName);
    if (matching >= 0) state.saved.splice(matching, 1);
    state.saved.unshift(saved);
    state.saved = state.saved.slice(0, 12);
    persist();
    syncViewRevision();
    const stillCurrent = requestedRevision === viewRevision.draft && requestedDeparture === viewRevision.departure
      && decisionKey(requestedDecisions) === decisionKey(state.decisions)
      && requestedName === (state.name.trim() || 'Мой городской сценарий')
      && preferences.language === requestedLanguage && state.report === requestedReport && !state.busy && ['simulation', 'report'].includes(state.page);
    if (stillCurrent) {
      updateMapColors(evaluationDeltas(result));
      state.report = saved;
      state.page = 'report';
      celebrateResult(result.evaluation.score);
      window.scrollTo({ top: 0, behavior: 'instant' });
      void sound.play('success');
    }
    toast(stillCurrent ? 'Сценарий рассчитан и сохранён для сравнения.' : 'Анализ предыдущего сценария готов. Результат доступен в разделе «Сравнение».');
  } catch (error) { toast(error.message, true); }
  finally { state.analyzing = false; render(); }
}

function exportReport() {
  if (!state.report) return;
  const blob = new Blob([JSON.stringify({ datasetVersion: state.data.version, ...state.report }, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `astana-scenario-${state.report.evaluation.score}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  // Unlock synchronously in a real user gesture, including clicks on the menu background.
  if (event.isTrusted && button?.dataset.action !== 'exit-game') void music.unlock();
  if (!button || button.disabled) return;
  event.preventDefault();
  const action = button.dataset.action;
  if (state.page === 'story') state.story.dialogueExpanded = true;
  if (action === 'share-telegram') { shareToTelegram(); return; }
  if (action === 'optimize') {
    const report = state.report;
    if (!report || report.optimizing) return;
    report.optimizing = true;
    render();
    try {
      report.optimizer = await api('/api/optimize', report.evaluation.decisions);
    } catch (error) { toast(error.message, true); }
    finally {
      report.optimizing = false;
      if (state.report === report) render();
    }
    return;
  }
  if (!['exit-game', 'test-sound', 'toggle-sound'].includes(action)) void sound.play();
  if (['start-game', 'mode-story', 'mode-free'].includes(action)) {
    if (!state.data || state.loadError || state.storyRestorePending) { await boot(); if (!state.data || state.loadError) return; }
    openScreen(action === 'start-game' ? 'modes' : action === 'mode-story' ? 'story' : 'simulation');
    return;
  }
  if (action === 'story-simulator') { openScreen('simulation'); return; }
  if (action === 'story-resume') { openScreen('story'); return; }
  if (['intro-next', 'intro-back', 'transition-next', 'discovery-next'].includes(action)) { await moveStory(action); return; }
  if (action.startsWith('story-')) {
    if (state.storyBusy || state.busy || state.analyzing) return;
    if (action === 'story-replay') { await openStoryReplay(0); return; }
    if (action === 'story-replay-next') { if (Number.isInteger(state.story.replayIndex)) await openStoryReplay(state.story.replayIndex + 1); return; }
    if (action === 'story-replay-prev') { if (Number.isInteger(state.story.replayIndex)) await openStoryReplay(state.story.replayIndex - 1); return; }
    if (action === 'story-replay-close') {
      Object.assign(state.story, { replayIndex: null, replayEvaluation: null, focusDistrict: null });
      openScreen('story'); return;
    }
    if (action === 'story-map-district') {
      if (state.data.districts.some(district => district.id === button.dataset.id)) { state.story.focusDistrict = button.dataset.id; render(); }
      return;
    }
    if (action === 'story-dialogue-reveal') { state.story.dialogueExpanded = true; render(); return; }
    if (Number.isInteger(state.story.replayIndex)) return;
    if (action === 'story-plan-open') await moveStory('planning-open');
    if (action === 'story-plan-cancel') await moveStory('planning-cancel');
    if (action === 'story-plan-reset' && state.story.phase === 'planning') { state.story.budgetDraft = defaultAllocations(state.data.initiatives, state.data.budget, state.story.choices); render(); }
    if (action === 'story-plan-apply' && state.story.phase === 'planning') {
      const allocations = state.story.budgetDraft || state.story.allocations || defaultAllocations(state.data.initiatives, state.data.budget, state.story.choices);
      if (!allocationSummary(allocations, state.story.choices, state.data.initiatives, state.data.budget).valid) { toast(campaignText('planInvalid', preferences.language), true); return; }
      await applyStoryProgress(setStoryAllocations(state.story, allocations));
    }
    if (action === 'story-inquiry' && state.story.phase === 'briefing') await applyStoryProgress(chooseStoryInquiry(state.story, Number(button.dataset.id)));
    if (action === 'story-council-hold') await moveStory('council-hold');
    if (action === 'story-council-review') await moveStory('council-review');
    if (action === 'story-replan' && state.story.phase === 'meeting' && state.story.choices.length > state.story.step) { state.story.confirmReplan = true; render(); document.querySelector('[data-action="story-replan-confirm"]')?.focus(); }
    if (action === 'story-replan-cancel') { state.story.confirmReplan = false; render(); }
    if (action === 'story-replan-confirm' && state.story.confirmReplan) await moveStory('replan');
    if (action === 'story-select') {
      const selected = Number(button.dataset.id);
      if (state.story.phase === 'meeting') {
        const availability = plannedOptionAvailability(state.story.choices, state.story.step, selected, state.data.initiatives, state.data.budget, state.story.allocations);
        if (availability.allowed) { state.story.selected = selected; render(); }
        else if (availability.reason === 'budget') { toast(storyText('locked', preferences.language), true); shakeBudget(); }
      }
    }
    if (action === 'story-confirm') await confirmStoryChoice();
    if (action === 'story-next' && state.story.choices[state.story.step] === state.story.selected) await moveStory('meeting-next');
    if (action === 'story-back') await moveStory('back');
    if (action === 'story-edit') await moveStory('edit');
    if (action === 'story-restart') { state.story.confirmRestart = true; render(); document.querySelector('[data-action="story-restart-confirm"]')?.focus(); }
    if (action === 'story-restart-cancel') { state.story.confirmRestart = false; render(); document.querySelector('[data-action="story-restart"]')?.focus(); }
    if (action === 'story-restart-confirm' && state.story.confirmRestart) {
      state.story = { ...createStoryProgress(), selected: null, evaluation: state.data.baseline, sceneEvaluation: state.data.baseline, confirmRestart: false };
      persistStory(); openScreen('story');
    }
    if (action === 'story-analyze') await openStoryScenario(true);
    if (action === 'story-open-scenario') await openStoryScenario();
    return;
  }
  if (action === 'game-menu') { openScreen('menu'); return; }
  if (action === 'open-settings') { openScreen('settings'); return; }
  if (action === 'exit-game') {
    if (state.data) { persist(); persistStory(); }
    openScreen('exited');
    // The exit screen also works in normal tabs which browsers do not let scripts close.
    if (window.opener) { try { window.close(); } catch { /* User can close the tab. */ } }
    return;
  }
  if (action === 'toggle-sound') {
    updatePreference('muted', !preferences.muted); render();
    if (!preferences.muted) void sound.play();
    return;
  }
  if (action === 'toggle-music') {
    updatePreference('musicEnabled', !preferences.musicEnabled); render();
    return;
  }
  if (action === 'test-sound') {
    if (!await sound.play('success')) toast('Звук недоступен в этом браузере.', true);
    return;
  }
  if (action === 'reset-settings') {
    Object.assign(preferences, DEFAULT_SETTINGS);
    updatePreference('language', DEFAULT_SETTINGS.language); render();
    return;
  }
  if (action === 'nav') { state.page = button.dataset.page; render(); window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('#main').focus({ preventScroll: true }); }
  if (action === 'category') { state.category = button.dataset.category; render(); document.querySelector(`#tab-${state.category}`).focus({ preventScroll: true }); }
  if (action === 'district') { state.district = button.dataset.district; render(); }
  if (action === 'map-mode') { state.mapMode = button.dataset.mode; render(); }
  if (action === 'add') {
    const m = initiative(button.dataset.id); const target = state.targets[m.id] || state.district;
    const reason = blockedReason(m, target);
    if (reason) {
      toast(reason, true);
      if (state.decisions.length < 5 && m.cost > state.evaluation.remaining) shakeBudget();
      return;
    }
    await setDecisions([...state.decisions, { categoryId: m.categoryId, initiativeId: m.id, ...(m.scope === 'district' ? { districtId: target } : {}) }], `${m.id}: инициатива добавлена в сценарий.`);
  }
  if (action === 'remove') await setDecisions(state.decisions.filter(d => d.initiativeId !== button.dataset.id), 'Инициатива убрана. Бюджет пересчитан.');
  if (action === 'preset') {
    const preset = [['M7', 'nura'], ['M8', 'nura'], ['M10', 'nura'], ['M12'], ['M5', 'saryarka']].map(([id, districtId]) => ({ initiativeId: id, categoryId: initiative(id).categoryId, ...(districtId ? { districtId } : {}) }));
    const oldName = state.name; state.name = 'Пример из задания';
    if (!(await setDecisions(preset, 'Пример из задания: 5 решений, стоимость 95 ед.'))) state.name = oldName;
    render();
  }
  if (action === 'reset') {
    const previous = { decisions: structuredClone(state.decisions), name: state.name };
    const oldName = state.name; state.name = 'Новый городской сценарий';
    if (await setDecisions([])) { state.undo = previous; state.report = null; state.targets = {}; state.category = 'transport'; render(); toast('Новый сценарий: единый бюджет и исходные показатели.', false, true); }
    else { state.name = oldName; render(); }
  }
  if (action === 'undo' && state.undo) { const previous = state.undo; state.name = previous.name; if (await setDecisions(previous.decisions)) { state.undo = null; toast('Предыдущий сценарий восстановлен.'); } }
  if (action === 'analyze') await analyze();
  if (action === 'print') window.print();
  if (action === 'export') exportReport();
  if (action === 'open-report') { state.report = state.saved.find(r => r.id === button.dataset.id); state.page = 'report'; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  if (action === 'load-report') {
    const report = state.saved.find(r => r.id === button.dataset.id);
    const oldName = state.name; state.name = report.name;
    const decisions = report.evaluation.decisions.map(d => ({ categoryId: d.categoryId, initiativeId: d.initiativeId, ...(d.districtId ? { districtId: d.districtId } : {}) }));
    if (await setDecisions(decisions)) { state.page = 'simulation'; state.report = report; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
    else { state.name = oldName; render(); }
  }
  if (action === 'retry') boot();
});

document.addEventListener('change', async event => {
  const target = event.target;
  if (target.dataset?.storyBudget) { updateStoryBudget(target); return; }
  if (target.dataset?.setting === 'language') {
    updatePreference('language', target.value); render();
    return;
  }
  if (target.dataset?.setting === 'volume') { void sound.play(); return; }
  if (target.matches('[data-target]')) {
    const id = target.dataset.target;
    const selected = state.decisions.find(d => d.initiativeId === id);
    if (selected) await setDecisions(state.decisions.map(d => d.initiativeId === id ? { ...d, districtId: target.value } : d));
    else { state.targets[id] = target.value; render(); }
  }
});
document.addEventListener('input', event => {
  if (event.target.dataset?.storyBudget) { updateStoryBudget(event.target, false); return; }
  const key = event.target.dataset?.setting;
  if (['volume', 'musicVolume', 'brightness'].includes(key)) {
    updatePreference(key, Number(event.target.value));
    document.querySelector(`#${key}-value`).textContent = `${preferences[key]}%`;
    event.target.setAttribute('aria-valuetext', `${preferences[key]}%`);
    const test = document.querySelector('[data-action="test-sound"]');
    if (test) test.disabled = preferences.muted || !preferences.volume;
    return;
  }
  if (event.target.name === 'scenario-name') { state.name = event.target.value; persist(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sound.stop();
  void music.sync();
});
window.addEventListener('pagehide', () => { sound.stop(); music.stop(); });
window.addEventListener('pageshow', () => { void music.sync(); });
document.addEventListener('keydown', event => {
  if (event.isTrusted && !event.repeat && ['Enter', ' '].includes(event.key) && event.target.dataset?.action !== 'exit-game') void music.unlock();
  if (event.key === 'Escape' && ['settings', 'modes'].includes(state.page)) { event.preventDefault(); openScreen('menu'); return; }
  if (event.target.matches('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const ids = state.data.categories.map(c => c.id); const current = ids.indexOf(state.category);
    state.category = event.key === 'Home' ? ids[0] : event.key === 'End' ? ids.at(-1) : ids[(current + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
    render(); document.querySelector(`#tab-${state.category}`).focus({ preventScroll: true });
  }
});

async function restoreSavedReport(report, version) {
  try {
    if (version !== state.data.version || !report || typeof report !== 'object') return null;
    if (report.datasetVersion !== undefined && report.datasetVersion !== state.data.version) return null;
    if (typeof report.id !== 'string' || !report.id.trim() || report.id.length > 128) return null;
    if (typeof report.name !== 'string' || !report.name.trim() || report.name.length > 70) return null;
    if (typeof report.savedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(report.savedAt) || !Number.isFinite(Date.parse(report.savedAt))) return null;
    const analysis = report.analysis;
    if (!analysis || !['ai', 'demo'].includes(analysis.mode) || typeof analysis.summary !== 'string' || !analysis.summary.trim() || analysis.summary.length > 3000) return null;
    if (!['strengths', 'risks', 'recommendations'].every(key => Array.isArray(analysis[key]) && analysis[key].length <= 8 && analysis[key].every(item => typeof item === 'string' && item.trim() && item.length <= 1500))) return null;
    if (analysis.notice !== undefined && (typeof analysis.notice !== 'string' || analysis.notice.length > 3000)) return null;
    const source = report.evaluation?.decisions;
    if (!Array.isArray(source) || source.length !== 5 || source.some(item => !item || typeof item !== 'object' || typeof item.initiativeId !== 'string' || typeof item.categoryId !== 'string')) return null;
    const decisions = source.map(item => ({ categoryId: item.categoryId, initiativeId: item.initiativeId, districtId: item.districtId ?? null }));
    const evaluation = await api('/api/evaluate', decisions);
    if (!evaluation.complete || evaluation.decisions.length !== 5) return null;
    return {
      id: report.id, name: report.name, savedAt: report.savedAt, evaluation,
      analysis: { mode: analysis.mode, language: ['ru', 'kk', 'en'].includes(analysis.language) ? analysis.language : 'ru', summary: analysis.summary, strengths: [...analysis.strengths], risks: [...analysis.risks], recommendations: [...analysis.recommendations], ...(analysis.notice === undefined ? {} : { notice: analysis.notice }) },
    };
  } catch (error) {
    // Invalid saved decisions can be discarded; an unreachable server cannot
    // establish that a saved report is corrupt. Let boot preserve storage.
    if (error.status === 400) return null;
    throw error;
  }
}

async function boot() {
  state.loading = true;
  state.loadError = '';
  render();
  try {
    state.data = await api('/api/bootstrap'); state.evaluation = state.data.baseline;
    await restoreStory();
    let stored;
    try { stored = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { /* Empty or unavailable storage starts a fresh session. */ }
    if (stored?.version === state.data.version) {
      if (typeof stored.name === 'string') state.name = stored.name.slice(0, 70);
      const restoredReports = Array.isArray(stored.saved)
        ? Promise.all(stored.saved.slice(0, 12).map(report => restoreSavedReport(report, stored.version)))
        : Promise.resolve([]);
      const restoredDraft = Array.isArray(stored.decisions) && stored.decisions.length
        ? api('/api/evaluate', stored.decisions).then(evaluation => ({ evaluation, decisions: stored.decisions })).catch(error => {
          if (error.status !== 400) throw error;
          toast('Сохранённый черновик не прошёл проверку. Открыт новый сценарий.', true);
          return { evaluation: state.data.baseline, decisions: [] };
        })
        : Promise.resolve({ evaluation: state.data.baseline, decisions: [] });
      const [reports, draft] = await Promise.all([restoredReports, restoredDraft]);
      state.evaluation = draft.evaluation;
      state.decisions = draft.decisions;
      state.saved = reports.filter(Boolean);
      state.report = state.saved.find(r => decisionKey(r.evaluation.decisions) === decisionKey(state.decisions)) || null;
    }
  } catch (error) {
    state.loadError = error.message;
  } finally {
    state.loading = false;
    render();
  }
}
boot();
