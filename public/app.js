const app = document.querySelector('#app');
const toastElement = document.querySelector('#toast');
const STORAGE = 'akim-simulator-v1';
const state = { data: null, evaluation: null, decisions: [], category: 'transport', district: 'nura', mapMode: 'after', page: 'simulation', name: 'Мой городской сценарий', report: null, saved: [], busy: false, analyzing: false, targets: {}, undo: null };
let toastTimer;
const viewRevision = { decisions: state.decisions, name: state.name, page: state.page, draft: 0, departure: 0 };
let pendingFocus = null;

const icons = {
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
const num = (value, digits = 2) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: digits });
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

async function api(path, decisions) {
  let response;
  try {
    response = await fetch(path, { signal: AbortSignal.timeout(path.includes('analyze') ? 65000 : 10000), ...(decisions === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }) }) });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'Сервер не успел ответить. Попробуйте ещё раз.' : 'Нет связи с сервером. Проверьте, запущено ли приложение.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || result.message || 'Не удалось выполнить запрос.');
  return result;
}

function toast(message, isError = false, undo = false) {
  clearTimeout(toastTimer);
  toastElement.innerHTML = `${esc(message)}${undo ? '<button data-action="undo">Вернуть</button>' : ''}`;
  toastElement.className = `toast visible ${isError ? 'error' : ''}`;
  toastTimer = setTimeout(() => { toastElement.className = 'toast'; }, undo ? 10000 : 5500);
}

function persist() {
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
  for (const key of ['action', 'id', 'page', 'category', 'district', 'mode', 'target']) {
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

function render() {
  const pageChanged = viewRevision.page !== state.page;
  const focus = !pageChanged && document.activeElement?.id === 'main' && pendingFocus ? pendingFocus : captureRenderFocus();
  syncViewRevision();
  const nav = [ ['simulation', 'grid', 'Симулятор'], ['report', 'chart', 'Анализ сценария'], ['compare', 'compare', 'Сравнение'], ['method', 'book', 'Как это работает'] ];
  const pageName = nav.find(n => n[0] === state.page)[2];
  app.innerHTML = `<aside class="sidebar">
    <a class="brand" href="#simulation" data-action="nav" data-page="simulation"><img src="/favicon.svg" alt=""/><span>Аким на 5 часов<small>ASTANA CITY LAB</small></span></a>
    <div class="nav-label">ВАШ ГОРОД</div><nav class="nav" aria-label="Основная навигация">${nav.map(([page, name, label]) => `<button class="nav-btn ${state.page === page ? 'active' : ''}" data-action="nav" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${page === 'compare' && state.saved.length ? `<span class="nav-count">${state.saved.length}</span>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="side-note"><span class="note-icon">${icon('green')}</span><strong>Город начинается с вас</strong><p>Пять решений сегодня.<br/>Качество жизни — на годы вперёд.</p></div><div class="team"><span class="avatar">S</span><div><strong>Команда Seniors</strong><small>Городская лаборатория</small></div>${icon('chevron')}</div></div>
  </aside><div class="workspace"><header class="topbar"><div class="breadcrumbs">Городская лаборатория ${icon('chevron')} <b>${pageName}</b></div><div class="mobile-brand"><img src="/favicon.svg" alt=""/>Аким на 5 часов</div><div class="top-actions"><span class="status-label"><i class="live-dot"></i>Синтетический город</span><button class="help-btn" data-action="nav" data-page="method">${icon('help')}Правила игры</button></div></header>
  <main class="main" id="main" tabindex="-1">${state.page === 'simulation' ? simulationView() : state.page === 'report' ? reportView() : state.page === 'compare' ? comparisonView() : methodologyView()}<footer class="bottom-bar"><span>${icon('city')}ASTANA CITY LAB <strong>· Сделаем город лучше вместе</strong></span><span>Учебная модель · Данные условные · Seniors, 2026</span></footer></main></div>`;
  restoreRenderFocus(focus);
}

function pageHeader(eyebrow, title, subtitle, buttons = '') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${buttons ? `<div class="head-buttons">${buttons}</div>` : ''}</div>`;
}

function simulationView() {
  const e = state.evaluation;
  return `${pageHeader('Астана · Симулятор городских решений', 'Ваш город. Ваши решения.', 'Распределите бюджет и посмотрите, как изменится жизнь города.', `<button class="btn" data-action="preset" ${state.busy ? 'disabled' : ''}>${icon('sparkle')}Пример из задания</button><button class="btn primary" data-action="reset" ${state.busy ? 'disabled' : ''}>${icon('plus')}Новый сценарий</button>`)}
  <section class="stats" aria-label="Показатели сценария">
    <div class="stat-card"><div class="stat-title">${icon('wallet')}Доступный бюджет</div><span class="stat-badge">${icon('wallet')}</span><div class="stat-value">${num(e.remaining)}<span class="unit">из ${e.budget} ед.</span></div><div class="budget-track" aria-label="Использовано ${e.spent} из ${e.budget}"><span style="width:${e.spent / e.budget * 100}%"></span></div><div class="stat-foot">Распределено <strong>${e.spent} ед.</strong> · одинаковый старт для всех</div></div>
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
  <div class="map-canvas"><img class="map-art" src="/city-map.svg" alt="Схематическая карта Астаны с рекой Есиль и городской застройкой"/><div class="map-compass">С${icon('compass')}</div>${state.evaluation.districts.map(d => { const pos = mapPositions[d.id]; const score = state.mapMode === 'before' ? d.before : d.after; return `<button class="map-pill ${d.id === state.district ? 'active' : ''} ${score < 53 ? 'low' : ''}" style="left:${pos[0]}%;top:${pos[1]}%" data-action="district" data-district="${d.id}" aria-pressed="${d.id === state.district}" aria-label="Район ${esc(d.name)}, оценка ${num(score)}">${esc(d.name)}<b>${num(score, 1)}</b></button>`; }).join('')}<span class="map-watermark">СХЕМАТИЧЕСКАЯ КАРТА · ГРАНИЦЫ УСЛОВНЫ</span><div class="map-legend">Ниже<span class="legend-scale"></span>Выше</div></div>
  <div class="district-summary"><div><strong>${esc(current.name)}</strong><small>${num(current.population * 100, 0)}% населения города</small></div><div class="mini-indicators">${state.data.categories.map(c => { const value = districtCategoryValue(current, c.id); return `<div class="mini-indicator"><div><span>${esc(c.shortName || c.name)}</span><b>${num(value, 0)}</b></div><div class="tiny-track"><span style="width:${Math.min(100, value)}%"></span></div></div>`; }).join('')}</div></div></section>`;
}

function scenarioView() {
  const e = state.evaluation;
  return `<section class="panel scenario" aria-label="Выбранный сценарий"><div class="panel-header"><h2 class="panel-title">Ваш сценарий</h2><span class="count-pill">${state.decisions.length} / 5</span></div><input class="scenario-name" name="scenario-name" aria-label="Название сценария" maxlength="70" value="${esc(state.name)}" placeholder="Название сценария"/>
  <div class="scenario-items">${state.decisions.length ? state.decisions.map(d => { const m = initiative(d.initiativeId); return `<div class="scenario-item">${categoryIcon(m.categoryId)}<div class="scenario-item-info"><strong>${esc(m.title)}</strong><small>${esc(d.districtId ? district(d.districtId).name : 'Весь город')} · ${m.id}</small></div><b class="scenario-item-cost">${m.cost}</b><button class="remove-btn" data-action="remove" data-id="${m.id}" aria-label="Убрать ${esc(m.title)}" ${state.busy ? 'disabled' : ''}>${icon('close')}</button></div>`; }).join('') : `<div class="empty-scenario"><span class="empty-icon">${icon('layers')}</span><p>Начните с одного решения</p><small>Добавляйте инициативы из каталога ниже. Каждое решение имеет значение.</small></div>`}</div>
  <div class="scenario-footer"><div class="scenario-total"><span>Стоимость сценария</span><b>${e.spent} <span>/ ${e.budget} ед.</span></b></div><button class="btn primary full" data-action="analyze" ${!e.complete || state.busy || state.analyzing ? 'disabled' : ''}>${icon('sparkle')}${state.analyzing ? 'Анализируем…' : 'Оценить мой сценарий'}${icon('arrow')}</button><p class="scenario-hint">${e.complete ? 'Получите итоговый Score и разбор решений' : `Добавьте ещё ${5 - state.decisions.length} ${5 - state.decisions.length === 1 ? 'решение' : (5 - state.decisions.length < 5 ? 'решения' : 'решений')}, чтобы получить анализ`}</p><div class="scenario-help">${icon('shield')}Бюджет и правила проверяются автоматически</div></div></section>`;
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
  return `<article class="initiative-card ${selected ? 'selected' : ''}" data-measure="${m.id}"><div class="initiative-top">${categoryIcon(m.categoryId)}<span class="measure-id">${m.id}</span><span class="scope-chip">${icon(m.scope === 'city' ? 'city' : 'pin')}${m.scope === 'city' ? 'Весь город' : 'Один район'}</span></div><h3>${esc(m.title)}</h3><p class="initiative-description">${esc(m.description)}</p><div class="effect-chips">${Object.entries(m.effects).map(([id, value]) => { const effect = value * (8 - m.lag) / 8; return `<span class="effect-chip ${effect < 0 ? 'negative' : ''}" title="${esc(indicatorTitles[id])}">${id} ${signed(effect)} ${esc(indicatorTitles[id])}</span>`; }).join('')}</div><div class="initiative-meta"><b>${m.cost} <small>ед.</small></b><span>${icon('clock')}Запуск через ${m.lag} кв.</span></div>
  ${m.scope === 'district' ? `<select class="card-select" data-target="${m.id}" aria-label="Район для ${esc(m.title)}" ${state.busy ? 'disabled' : ''}>${state.data.districts.map(d => `<option value="${d.id}" ${d.id === target ? 'selected' : ''}>${esc(d.name)}${d.id === 'nura' ? ' · приоритетный район' : ''}</option>`).join('')}</select>` : `<div class="city-target">${icon('city')}Эффект во всех пяти районах</div>`}
  <button class="btn add-btn full ${selected ? 'selected' : ''}" data-action="${selected ? 'remove' : 'add'}" data-id="${m.id}" ${blocked || state.busy ? 'disabled' : ''}>${icon(selected ? 'check' : 'plus')}${selected ? 'В сценарии · убрать' : 'Добавить в сценарий'}</button>${blocked ? `<p class="blocked-reason">${esc(blocked)}</p>` : ''}</article>`;
}

function reportView() {
  if (!state.report) return `${pageHeader('От решений к результатам', 'Будущее города в цифрах', 'Сначала соберите сценарий — здесь появится его подробный разбор.')}<section class="panel empty-page">${icon('chart')}<h2>Каким станет ваш город?</h2><p>Выберите ровно 5 мероприятий и нажмите «Оценить мой сценарий». Сравним показатели, найдём сильные стороны и объясним компромиссы.</p><button class="btn primary" data-action="nav" data-page="simulation">Перейти к решениям ${icon('arrow')}</button></section>`;
  const { evaluation: e, analysis: a } = state.report;
  const same = decisionKey(state.decisions) === decisionKey(e.decisions);
  const metricRows = e.metrics.map(m => `<div class="metric-compare-row"><span>${esc(category(m.id)?.shortName || m.name)}</span><div class="metric-compare-track"><span class="before" style="width:${m.before}%"></span><span class="after" style="width:${m.after}%"></span></div><b>${signed(m.delta)}</b></div>`).join('');
  return `${pageHeader('Анализ городского сценария', esc(state.report.name || 'Ваш сценарий'), 'Измеримый результат. Понятные последствия. Следующий шаг.', `<button class="btn" data-action="export">${icon('download')}Скачать JSON</button><button class="btn primary" data-action="print">${icon('print')}Печать отчёта</button>`)}
  ${!same ? '<div class="draft-warning">Это сохранённый результат. Текущие решения изменились — выполните анализ заново, чтобы обновить отчёт.</div>' : ''}
  <section class="report-hero"><div class="score-ring" style="--score:${Math.max(0, Math.min(100, e.score))}"><div><b>${num(e.score)}</b><span>QUALITY OF LIFE SCORE</span></div></div><div><div class="eyebrow">Астана через 8 кварталов</div><h2>${e.delta > 0 ? 'У города есть изменения к лучшему' : 'У каждого решения есть последствия'}</h2><p>${esc(a.summary)}</p><div class="report-tags"><span class="tag ${e.delta < 0 ? 'negative' : 'positive'}">${signed(e.delta)} к исходным ${num(e.baselineScore)}</span><span class="tag">${e.spent} из ${e.budget} ед.</span><span class="tag">5 решений · ${directionCount(e.decisions)}</span></div></div></section>
  ${a.mode !== 'ai' ? `<div class="analysis-notice">${icon('info')}<span><strong>Демонстрационный разбор · без LLM.</strong> ${esc(a.notice || 'API-ключ не настроен. Объяснение сформировано правилами по рассчитанным данным. Для AI-разбора подключите OpenAI на сервере.')}</span></div>` : `<div class="analysis-notice">${icon('sparkle')}<span><strong>AI-анализ · OpenAI.</strong> Числа рассчитаны моделью; AI объясняет эффекты и компромиссы. ${esc(a.notice || '')}</span></div>`}
  <div class="report-grid"><section class="panel"><h2>${icon('green')}Что удалось улучшить</h2>${insightList(a.strengths)}</section><section class="panel"><h2>${icon('shield')}Риски и компромиссы</h2>${insightList(a.risks)}</section><section class="panel"><h2>${icon('sparkle')}Следующие шаги</h2>${insightList(a.recommendations)}</section><section class="panel"><h2>${icon('chart')}Изменения по направлениям</h2><div class="metric-comparison">${metricRows}</div><p class="panel-subtitle" style="margin-top:18px">Светлая полоса — исходный уровень, тёмная — прогноз.</p></section></div>
  <section class="panel content-panel report-section"><h2>Каждый район имеет значение</h2><div class="table-scroll"><table><thead><tr><th>Район</th><th>Доля населения</th><th>Сейчас</th><th>Через 2 года</th><th>Изменение</th><th>Показателей &lt; 40</th></tr></thead><tbody>${e.districts.map(d => `<tr><td>${esc(d.name)}</td><td>${num(d.population * 100)}%</td><td>${num(d.before)}</td><td>${num(d.after)}</td><td class="${d.delta >= 0 ? 'positive' : 'negative'}">${signed(d.delta)}</td><td>${Object.values(d.metrics).filter(v => v < 40).length}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel content-panel"><h2>Из чего складывается Score</h2><div class="formula-box">0,7 × ${num(e.weightedAverage)} + 0,3 × ${num(e.minDistrict)} − ${e.criticalCount} = ${num(e.score)}</div><p>70% — средневзвешенная оценка города, 30% — оценка самого слабого района. За каждый показатель строго ниже 40 вычитается 1 балл. Расчёт выполняется до округления.</p><div class="formula-breakdown"><div>Среднее по городу<b>${num(e.weightedAverage)}</b></div><div>Самый слабый район<b>${num(e.minDistrict)}</b></div><div>Критические показатели<b>${e.criticalCount}</b></div></div></section>
  <section class="panel content-panel"><h2>Пять решений вашего сценария</h2><div class="table-scroll"><table><thead><tr><th>Мера</th><th>Мероприятие</th><th>Район</th><th>Стоимость</th><th>Запуск</th><th>Эффект за 8 кварталов</th></tr></thead><tbody>${e.decisions.map(d => { const m = initiative(d.initiativeId); return `<tr><td>${esc(m.id)}</td><td>${esc(m.title)}</td><td>${esc(d.districtId ? district(d.districtId).name : 'Весь город')}</td><td>${m.cost} ед.</td><td>${m.lag} кв.</td><td>${Object.entries(m.effects).map(([id, value]) => `${id} ${signed(value * (8 - m.lag) / 8)}`).join('; ')}</td></tr>`; }).join('')}</tbody></table></div><p class="panel-subtitle">Эффекты показаны до ограничения показателей диапазоном 0–100. Изменения Score рассчитаны до округления, поэтому разница отображённых чисел может отличаться на 0,01.</p></section>
  ${e.synergies?.length ? `<section class="panel content-panel"><h2>Сработавшие синергии</h2><ul>${e.synergies.map(s => `<li><strong>${esc(s.id)}</strong> · ${esc(s.districtName)}: ${Object.entries(s.effects).map(([id, value]) => `${id} ${signed(value)}`).join(', ')}. ${esc(s.title)}.</li>`).join('')}</ul><p>Дополнительные бонусы применены без уменьшения на лаг.</p></section>` : ''}
  <section class="panel content-panel"><h2>Все показатели: до → после</h2>${indicatorTable(e.districts, true)}</section>
  <div class="no-print"><button class="btn primary" data-action="nav" data-page="simulation">${icon('refresh')}Продолжить эксперимент</button><button class="btn text-btn" data-action="nav" data-page="compare">Сравнить сценарии ${icon('arrow')}</button></div>`;
}

function insightList(items) { return `<ul class="insight-list">${(items || []).map(text => `<li>${esc(text)}</li>`).join('')}</ul>`; }
function decisionKey(decisions) { return JSON.stringify(decisions.map(d => [d.initiativeId, d.districtId || null]).sort((a, b) => a[0].localeCompare(b[0]))); }

function comparisonView() {
  return `${pageHeader('Лаборатория сценариев', 'У каждого города есть альтернативы', 'Сравните результаты команд или разные подходы к развитию города.', '<button class="btn primary" data-action="nav" data-page="simulation">'+icon('plus')+'К симулятору</button>')}
  ${state.saved.length ? `<div class="analysis-notice">${icon('info')}Сценарии сохраняются в этом браузере. У всех одинаковые исходные данные и бюджет 100 ед. Экспортируйте JSON, чтобы передать результат команде.</div><div class="compare-cards">${[...state.saved].sort((a, b) => b.evaluation.score - a.evaluation.score).map((r, index) => `<section class="panel comparison-card"><span class="tag">${index === 0 ? 'Лучший результат' : 'Альтернативный сценарий'}</span><h2>${esc(r.name)}</h2><span class="compare-date">${esc(new Date(r.savedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))}</span><div class="comparison-score">${num(r.evaluation.score)} <span class="delta">${signed(r.evaluation.delta)}</span></div><p>${r.evaluation.spent} / 100 ед. · Критических показателей: ${r.evaluation.criticalCount}</p><div class="compare-actions"><button class="btn small primary" data-action="open-report" data-id="${esc(r.id)}">Посмотреть отчёт</button><button class="btn small" data-action="load-report" data-id="${esc(r.id)}">Изменить решения</button></div></section>`).join('')}</div>` : `<section class="panel empty-page">${icon('compare')}<h2>Один город — разные стратегии</h2><p>Завершённые анализы появятся здесь автоматически. Соберите первый сценарий, затем измените решения и сравните результаты.</p><button class="btn primary" data-action="nav" data-page="simulation">Собрать первый сценарий ${icon('arrow')}</button></section>`}`;
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
  render();
  const requestedRevision = viewRevision.draft;
  const requestedDeparture = viewRevision.departure;
  const requestedReport = state.report;
  try {
    const result = await api('/api/analyze', requestedDecisions);
    const saved = { ...result, name: requestedName, savedAt: new Date().toISOString(), id: crypto.randomUUID() };
    const matching = state.saved.findIndex(r => decisionKey(r.evaluation.decisions) === decisionKey(requestedDecisions) && r.name === requestedName);
    if (matching >= 0) state.saved.splice(matching, 1);
    state.saved.unshift(saved);
    state.saved = state.saved.slice(0, 12);
    persist();
    syncViewRevision();
    const stillCurrent = requestedRevision === viewRevision.draft && requestedDeparture === viewRevision.departure
      && decisionKey(requestedDecisions) === decisionKey(state.decisions)
      && requestedName === (state.name.trim() || 'Мой городской сценарий')
      && state.report === requestedReport && !state.busy && ['simulation', 'report'].includes(state.page);
    if (stillCurrent) {
      state.report = saved;
      state.page = 'report';
      window.scrollTo({ top: 0, behavior: 'instant' });
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
  if (!button || button.disabled) return;
  event.preventDefault();
  const action = button.dataset.action;
  if (action === 'nav') { state.page = button.dataset.page; render(); window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('#main').focus({ preventScroll: true }); }
  if (action === 'category') { state.category = button.dataset.category; render(); document.querySelector(`#tab-${state.category}`).focus({ preventScroll: true }); }
  if (action === 'district') { state.district = button.dataset.district; render(); }
  if (action === 'map-mode') { state.mapMode = button.dataset.mode; render(); }
  if (action === 'add') {
    const m = initiative(button.dataset.id); const target = state.targets[m.id] || state.district;
    const reason = blockedReason(m, target);
    if (reason) { toast(reason, true); return; }
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
  if (target.matches('[data-target]')) {
    const id = target.dataset.target;
    const selected = state.decisions.find(d => d.initiativeId === id);
    if (selected) await setDecisions(state.decisions.map(d => d.initiativeId === id ? { ...d, districtId: target.value } : d));
    else { state.targets[id] = target.value; render(); }
  }
});
document.addEventListener('input', event => {
  if (event.target.name === 'scenario-name') { state.name = event.target.value; persist(); }
});
document.addEventListener('keydown', event => {
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
      analysis: { mode: analysis.mode, summary: analysis.summary, strengths: [...analysis.strengths], risks: [...analysis.risks], recommendations: [...analysis.recommendations], ...(analysis.notice === undefined ? {} : { notice: analysis.notice }) },
    };
  } catch { return null; }
}

async function boot() {
  try {
    state.data = await api('/api/bootstrap'); state.evaluation = state.data.baseline;
    let stored;
    try { stored = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { /* Empty or unavailable storage starts a fresh session. */ }
    if (stored?.version === state.data.version) {
      if (typeof stored.name === 'string') state.name = stored.name.slice(0, 70);
      const restoredReports = Array.isArray(stored.saved)
        ? Promise.all(stored.saved.slice(0, 12).map(report => restoreSavedReport(report, stored.version)))
        : Promise.resolve([]);
      if (Array.isArray(stored.decisions) && stored.decisions.length) {
        try { state.evaluation = await api('/api/evaluate', stored.decisions); state.decisions = stored.decisions; }
        catch { state.decisions = []; toast('Сохранённый черновик не прошёл проверку. Открыт новый сценарий.', true); }
      }
      state.saved = (await restoredReports).filter(Boolean);
      state.report = state.saved.find(r => decisionKey(r.evaluation.decisions) === decisionKey(state.decisions)) || null;
    }
    render();
  } catch (error) {
    app.innerHTML = `<div class="initial-loader">${icon('city')}<h1>Не удалось загрузить город</h1><p>${esc(error.message)}</p><button class="btn primary" data-action="retry">Повторить загрузку</button></div>`;
  }
}
boot();
