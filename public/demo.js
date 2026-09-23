/* Presentation page for the demonstration scenarios.
 *
 * Reads GET /api/scenarios, so every figure shown here is recomputed by the
 * same model the simulator uses. Nothing is hardcoded: if the dataset or the
 * formula changes, this page changes with it.
 *
 * "Открыть в симуляторе" hands the plan over through the same localStorage
 * draft the app already restores on boot. The app revalidates that draft
 * against the server, so this page cannot push an illegal state into it.
 */

const STORAGE = 'akim-simulator-v1';
const content = document.getElementById('content');

const TEXT = {
  ru: {
    eyebrow: 'Команда Seniors · Astana Innovations',
    title: 'Почему нельзя чинить только богатый район',
    lede: 'Два плана. Одни и те же пять мероприятий за одни и те же 100 единиц. Разница только в том, какой район получает деньги.',
    openApp: 'Открыть симулятор',
    loading: 'Загружаем сценарии…',
    footer: 'Все числа рассчитаны сервером по той же модели, что и в симуляторе. Синтетические данные; это учебная модель, а не прогноз по Астане.',
    baseline: 'базовый 52.56',
    avg: 'Средний балл города',
    worst: 'Слабейший район',
    open: 'Открыть в симуляторе',
    allScenarios: 'Все сценарии',
    scenario: 'Сценарий',
    score: 'Score',
    delta: 'Разница',
    optimum: 'Доказанный оптимум',
    optimumNote: 'Перебраны все допустимые планы: каждое сочетание пяти мероприятий и каждое распределение по районам.',
    punchA: 'План с более высоким средним баллом города проигрывает',
    punchB: 'балла.',
    punchC: 'Score на 70% состоит из среднего по городу и на 30% — из балла худшего района. Поэтому вложить всё в сильный район не получится: город силён настолько, насколько силён его слабейший район.',
    failed: 'Не удалось загрузить сценарии. Запущен ли сервер?',
    handedOver: 'План передан в симулятор',
  },
  en: {
    eyebrow: 'Team Seniors · Astana Innovations',
    title: 'Why fixing only the wealthy district fails',
    lede: 'Two plans. The same five initiatives for the same 100 units. The only difference is which district gets the money.',
    openApp: 'Open the simulator',
    loading: 'Loading scenarios…',
    footer: 'Every figure is computed by the same model the simulator uses. Synthetic data; an educational model, not a forecast for Astana.',
    baseline: 'baseline 52.56',
    avg: 'City average',
    worst: 'Weakest district',
    open: 'Open in the simulator',
    allScenarios: 'All scenarios',
    scenario: 'Scenario',
    score: 'Score',
    delta: 'Change',
    optimum: 'Proven optimum',
    optimumNote: 'Every valid plan was enumerated: each combination of five initiatives and each district assignment.',
    punchA: 'The plan with the higher city average loses by',
    punchB: 'points.',
    punchC: 'The Score is 70% the city average and 30% the weakest district alone. Pouring everything into a strong district cannot win: a city is only as strong as its weakest district.',
    failed: 'Could not load the scenarios. Is the server running?',
    handedOver: 'Plan handed to the simulator',
  },
};

let language = 'ru';
let payload = null;
let datasetVersion = null;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
));
const t = key => TEXT[language][key];
const fixed = value => Number(value).toFixed(2);
const signed = value => `${value > 0 ? '+' : ''}${fixed(value)}`;

function applyStaticText() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-t]').forEach(node => {
    const key = node.dataset.t;
    if (TEXT[language][key] !== undefined && node.id !== 'content') node.textContent = t(key);
  });
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language));
  });
}

function titleOf(scenario) {
  return language === 'en' ? scenario.titleEn : scenario.title;
}

function summaryOf(scenario) {
  return language === 'en' ? scenario.summaryEn : scenario.summary;
}

function card(scenario, isWinner) {
  return `
    <div class="card${isWinner ? ' win' : ''}">
      <h2>${escapeHtml(titleOf(scenario))}</h2>
      <p class="why">${escapeHtml(summaryOf(scenario))}</p>
      <div class="score">${fixed(scenario.score)} <small>${escapeHtml(t('baseline'))}</small></div>
      <div class="delta ${scenario.delta >= 0 ? 'up' : 'down'}">${signed(scenario.delta)}</div>
      <dl class="stats">
        <dt>${escapeHtml(t('avg'))}</dt><dd class="${isWinner ? '' : 'flag'}">${fixed(scenario.weightedAverage)}</dd>
        <dt>${escapeHtml(t('worst'))}</dt><dd>${fixed(scenario.minDistrict)}</dd>
      </dl>
      <div class="bar" style="margin:16px 0 0">
        <button type="button" data-open="${escapeHtml(scenario.id)}">${escapeHtml(t('open'))}</button>
      </div>
    </div>`;
}

function render() {
  applyStaticText();
  if (!payload) return;

  const byId = Object.fromEntries(payload.scenarios.map(item => [item.id, item]));
  const [wealthyId, weakestId] = payload.controlledPair;
  const wealthy = byId[wealthyId];
  const weakest = byId[weakestId];
  const gap = weakest.score - wealthy.score;

  const ranked = [...payload.scenarios].sort((a, b) => b.score - a.score);
  const bestScore = ranked[0].score;

  content.className = '';
  content.innerHTML = `
    <div class="pair">
      ${card(wealthy, false)}
      ${card(weakest, true)}
    </div>

    <div class="punch">
      <p style="margin:0 0 8px"><b>${escapeHtml(t('punchA'))} ${fixed(gap)} ${escapeHtml(t('punchB'))}</b></p>
      <p style="margin:0">${escapeHtml(t('punchC'))}</p>
    </div>

    <h3>${escapeHtml(t('allScenarios'))}</h3>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(t('scenario'))}</th>
            <th class="n">${escapeHtml(t('avg'))}</th>
            <th class="n">${escapeHtml(t('worst'))}</th>
            <th class="n">${escapeHtml(t('score'))}</th>
            <th class="n">${escapeHtml(t('delta'))}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${ranked.map(item => `
            <tr${item.score === bestScore ? ' class="best"' : ''}>
              <td>${escapeHtml(titleOf(item))}</td>
              <td class="n">${fixed(item.weightedAverage)}</td>
              <td class="n">${fixed(item.minDistrict)}</td>
              <td class="n">${fixed(item.score)}</td>
              <td class="n">${signed(item.delta)}</td>
              <td class="n"><button type="button" data-open="${escapeHtml(item.id)}">${escapeHtml(t('open'))}</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function handOver(scenarioId) {
  const scenario = payload.scenarios.find(item => item.id === scenarioId);
  if (!scenario) return;
  try {
    localStorage.setItem(STORAGE, JSON.stringify({
      version: datasetVersion,
      decisions: scenario.decisions,
      name: titleOf(scenario),
      saved: [],
    }));
  } catch {
    // Private windows and blocked storage simply open the simulator empty.
  }
  window.location.href = '/';
}

document.addEventListener('click', event => {
  const languageButton = event.target.closest('[data-lang]');
  if (languageButton) {
    language = languageButton.dataset.lang;
    render();
    return;
  }
  const openButton = event.target.closest('[data-open]');
  if (openButton) handOver(openButton.dataset.open);
});

(async function boot() {
  applyStaticText();
  try {
    const [scenarios, bootstrap] = await Promise.all([
      fetch('/api/scenarios').then(response => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      }),
      // Only the dataset version, so the simulator accepts the handed-over draft.
      fetch('/api/bootstrap').then(response => response.ok ? response.json() : null).catch(() => null),
    ]);
    payload = scenarios;
    datasetVersion = bootstrap ? bootstrap.version : null;
    render();
  } catch {
    content.className = 'err';
    content.textContent = t('failed');
  }
})();
