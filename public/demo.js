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
    shockTitle: 'А если год окажется тяжёлым',
    shockLede: 'Score описывает хороший год. Шесть детерминированных потрясений пересчитывают город после того, как план уже применён.',
    plan: 'План',
    goodYear: 'Хороший год',
    worstCase: 'Худший случай',
    vsNothing: 'Против бездействия',
    worstShock: 'Худшее потрясение',
    belowBaseline: 'ниже, чем ничего не делать',
    shockPunch: 'Весь бюджет в Есиль — и одна суровая зима опускает город ниже отметки, которая досталась бы даром. Те же деньги в Нуре почти удерживают результат.',
    doNothing: 'Ничего не делать',
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
    shockTitle: 'And if the year goes badly',
    shockLede: 'The Score describes a good year. Six deterministic shocks re-score the city after the plan has already been applied.',
    plan: 'Plan',
    goodYear: 'Good year',
    worstCase: 'Worst case',
    vsNothing: 'vs doing nothing',
    worstShock: 'Worst shock',
    belowBaseline: 'worse than doing nothing',
    shockPunch: 'The whole budget into Yesil, and a single harsh winter drops the city below the score it would have had for free. The same money in Nura very nearly holds.',
    doNothing: 'Do nothing',
  },
};

let language = 'ru';
let payload = null;
let datasetVersion = null;
// Stress reports for the controlled pair, keyed by scenario id. Null until
// they load; the page renders without them rather than waiting.
let stressByScenario = null;

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

function shockSection(wealthy, weakest) {
  if (!stressByScenario) return '';
  const rows = [wealthy, weakest]
    .map(scenario => ({ scenario, report: stressByScenario[scenario.id] }))
    .filter(entry => entry.report);
  if (rows.length < 2) return '';

  const baseline = rows[0].report.baseline;

  return `
    <h3>${escapeHtml(t('shockTitle'))}</h3>
    <p class="lede" style="margin:0 0 14px">${escapeHtml(t('shockLede'))}</p>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(t('plan'))}</th>
            <th class="n">${escapeHtml(t('goodYear'))}</th>
            <th class="n">${escapeHtml(t('worstCase'))}</th>
            <th class="n">${escapeHtml(t('vsNothing'))}</th>
            <th>${escapeHtml(t('worstShock'))}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ scenario, report }) => {
            const below = !report.holdsAboveBaseline;
            return `
            <tr>
              <td>${escapeHtml(titleOf(scenario))}</td>
              <td class="n">${fixed(report.score)}</td>
              <td class="n ${below ? 'down' : 'up'}"><strong>${fixed(report.worstCase.score)}</strong></td>
              <td class="n ${report.worstCaseVsBaseline < 0 ? 'down' : 'up'}">${signed(report.worstCaseVsBaseline)}</td>
              <td>${escapeHtml(report.worstCase.title)}</td>
            </tr>`;
          }).join('')}
          <tr>
            <td style="color:var(--muted)">${escapeHtml(t('doNothing'))}</td>
            <td class="n" style="color:var(--muted)">${fixed(baseline)}</td>
            <td class="n" style="color:var(--muted)">${fixed(baseline)}</td>
            <td class="n" style="color:var(--muted)">0.00</td>
            <td style="color:var(--muted)">—</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="punch">
      <p style="margin:0">${escapeHtml(t('shockPunch'))}</p>
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

    ${shockSection(wealthy, weakest)}

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
    // The shock names come from the server in the requested language, so
    // they have to be fetched again rather than re-rendered.
    if (payload) loadStress();
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
    loadStress();
  } catch {
    content.className = 'err';
    content.textContent = t('failed');
  }
})();

/* Stress-test the controlled pair after the page is already on screen.
 * The section appears when the reports arrive; if the endpoint is missing
 * or fails, the page simply stays as it was rather than showing an error
 * for something it can do without. */
async function loadStress() {
  const [wealthyId, weakestId] = payload.controlledPair;
  const wanted = payload.scenarios.filter(item => [wealthyId, weakestId].includes(item.id));
  try {
    const reports = await Promise.all(wanted.map(async scenario => {
      const response = await fetch('/api/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: scenario.decisions, language }),
      });
      if (!response.ok) throw new Error(String(response.status));
      return [scenario.id, await response.json()];
    }));
    stressByScenario = Object.fromEntries(reports);
    render();
  } catch {
    stressByScenario = null;
  }
}
