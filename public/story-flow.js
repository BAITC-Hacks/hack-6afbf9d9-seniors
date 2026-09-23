import { STORY_VERSION, normalizeStory, storyDecisions, getStory } from './story.js';

export const FLOW_VERSION = 2;
const INTRO_SCREENS = 4;
const meetingIds = getStory().map(meeting => meeting.choices.map(choice => choice.initiativeId));
const MEETING_COUNT = meetingIds.length;

export function createStoryProgress() {
  return { choices: [], step: 0, phase: 'intro', introStep: 0 };
}

function normalizeFields(value) {
  const legacy = normalizeStory({ version: STORY_VERSION, choices: value?.choices, step: value?.step });
  if (!legacy) return null;
  const { choices, step } = legacy;
  const fallback = step === MEETING_COUNT ? 'ending' : 'meeting';
  let phase = value.phase;
  const validPhase = (phase === 'intro' && choices.length === 0 && step === 0)
    || (phase === 'meeting' && step < MEETING_COUNT)
    || (phase === 'transition' && step < MEETING_COUNT && choices[step] !== undefined)
    || (phase === 'ending' && choices.length === MEETING_COUNT && step === MEETING_COUNT);
  if (!validPhase) phase = fallback;
  const introStep = phase === 'intro'
    ? Number.isInteger(value.introStep) && value.introStep >= 0 && value.introStep < INTRO_SCREENS ? value.introStep : 0
    : INTRO_SCREENS - 1;
  return { choices, step, phase, introStep };
}

/** Migrate v1 indexed saves; v2 uses durable initiative IDs in meeting order.
 * Dataset compatibility and authoritative reevaluation remain the app's job.
 * Saved scores, text, flags and unknown extra fields are deliberately ignored.
 */
export function normalizeStoryProgress(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
  if (saved.version === STORY_VERSION) {
    const legacy = normalizeStory(saved);
    if (!legacy) return null;
    return {
      version: FLOW_VERSION,
      ...normalizeFields({ ...legacy, phase: legacy.choices.length ? legacy.step === MEETING_COUNT ? 'ending' : 'meeting' : 'intro', introStep: 0 }),
    };
  }
  if (saved.version !== FLOW_VERSION || !Array.isArray(saved.decisionIds) || saved.decisionIds.length > MEETING_COUNT) return null;
  const choices = [];
  for (let step = 0; step < saved.decisionIds.length; step += 1) {
    const id = saved.decisionIds[step];
    if (typeof id !== 'string') return null;
    const index = meetingIds[step].indexOf(id);
    if (index < 0) return null;
    choices.push(index);
  }
  const progress = normalizeFields({ choices, step: saved.step, phase: saved.phase, introStep: saved.introStep });
  return progress ? { version: FLOW_VERSION, ...progress } : null;
}

export function serializeStoryProgress(state, datasetVersion) {
  const progress = normalizeFields(state);
  if (!progress) throw new TypeError('Invalid story progress');
  return {
    version: FLOW_VERSION,
    datasetVersion,
    decisionIds: storyDecisions(progress.choices).map(decision => decision.initiativeId),
    step: progress.step,
    phase: progress.phase,
    introStep: progress.introStep,
  };
}

/** Pure navigation: it does not confirm choices, call APIs or change model values. */
export function nextStoryProgress(state, action) {
  const progress = normalizeFields(state) || createStoryProgress();
  if (action === 'restart') return createStoryProgress();
  if (action === 'intro-next' && progress.phase === 'intro') {
    return progress.introStep < INTRO_SCREENS - 1
      ? { ...progress, introStep: progress.introStep + 1 }
      : { ...progress, phase: 'meeting', step: 0 };
  }
  if (action === 'intro-back' && progress.phase === 'intro') return { ...progress, introStep: Math.max(0, progress.introStep - 1) };
  if (action === 'meeting-next' && progress.phase === 'meeting' && progress.choices[progress.step] !== undefined) return { ...progress, phase: 'transition' };
  if (action === 'transition-next' && progress.phase === 'transition') {
    const step = progress.step + 1;
    return { ...progress, step, phase: step === MEETING_COUNT ? 'ending' : 'meeting' };
  }
  if (action === 'back') {
    if (progress.phase === 'transition') return { ...progress, phase: 'meeting' };
    if (progress.phase === 'meeting' && progress.step > 0) return { ...progress, step: progress.step - 1 };
    if (progress.phase === 'ending') return { ...progress, phase: 'meeting', step: MEETING_COUNT - 1 };
  }
  if (action === 'edit') return { ...progress, phase: 'meeting', step: 0, introStep: INTRO_SCREENS - 1 };
  return progress;
}

/** Apply only after the app has validated availability and received /api/evaluate.
 * Changing an earlier answer discards its later branch, never the prior prefix.
 */
export function commitStoryChoice(state, index) {
  const progress = normalizeFields(state) || createStoryProgress();
  if (progress.phase !== 'meeting' || !Number.isInteger(index) || index < 0 || index >= meetingIds[progress.step]?.length) return progress;
  return { choices: [...progress.choices.slice(0, progress.step), index], step: progress.step, phase: 'meeting', introStep: INTRO_SCREENS - 1 };
}

const endingCopy = {
  ru: {
    social: ['Город для семей', 'Вы сделали школы или медицину одним из главных бюджетных приоритетов. Это вклад в жизнь семей; результат проектов проявляется после их запуска.', ['На социальную инфраструктуру выделено {socialSpent} из {spent} потраченных единиц.', 'Прирост среднего показателя социальной сферы: {socialDelta}.', 'Показателей ниже 40 осталось: {critical}.']],
    green: ['Зелёный курс', 'Чистое топливо или городское озеленение стали заметной частью вашего решения. Модель показывает улучшение экологии; для реализации этих проектов потребуется время.', ['На экологические меры выделено {greenSpent} единиц бюджета.', 'Прирост среднего показателя экологии: {greenDelta}.', 'Итоговый Score: {score}; изменение к исходному уровню: {delta}.']],
    quick: ['Первые шаги быстрее', 'Вы выбрали не менее трёх мер с запуском через один квартал. Первые изменения начнутся раньше, но быстрые меры не закрывают все долгосрочные потребности города.', ['Мер с запуском через один квартал: {fastCount} из {count}.', 'Неиспользованный бюджет: {remaining} из {budget}.', 'Показателей ниже 40 осталось: {critical}.']],
    balanced: ['Баланс городских задач', 'Вы сочетали разные меры развития города. Итог зависит от их воздействия на средние показатели, самый слабый район и оставшиеся критические потребности.', ['Финансирование получили направления: {categoryCount} из 5.', 'Потрачено {spent} из {budget} единиц бюджета.', 'Итоговый Score: {score}; изменение к исходному уровню: {delta}.']],
    strained: ['Бюджет на пределе', 'Сценарий остался в рамках бюджета, но свободных средств почти нет, а критические показатели сохраняются. Для следующего шага придётся внимательно сравнить замены выбранных мер.', ['Неиспользованный бюджет: {remaining} из {budget}.', 'Показателей ниже 40 осталось: {critical}.', 'Итоговый Score: {score}; изменение к исходному уровню: {delta}.']],
  },
  kk: {
    social: ['Отбасыларға арналған қала', 'Сіз мектептерді немесе медицинаны негізгі бюджеттік басымдықтардың біріне айналдырдыңыз. Бұл — отбасылардың өміріне салынған инвестиция; нәтиже жобалар іске қосылғаннан кейін көрінеді.', ['Әлеуметтік инфрақұрылымға жұмсалған {spent} бірліктің {socialSpent} бірлігі бөлінді.', 'Әлеуметтік саланың орташа көрсеткішінің өсімі: {socialDelta}.', '40-тан төмен қалған көрсеткіштер саны: {critical}.']],
    green: ['Жасыл бағыт', 'Таза отын немесе қаланы көгалдандыру шешіміңіздің елеулі бөлігі болды. Модель экологиялық көрсеткіштердің жақсарғанын көрсетеді; жобаларды іске асыруға уақыт қажет.', ['Экологиялық шараларға бюджеттің {greenSpent} бірлігі бөлінді.', 'Экологияның орташа көрсеткішінің өсімі: {greenDelta}.', 'Қорытынды Score: {score}; бастапқы деңгейден өзгеріс: {delta}.']],
    quick: ['Жылдам алғашқы қадамдар', 'Сіз бір тоқсаннан кейін іске қосылатын кемінде үш шараны таңдадыңыз. Алғашқы өзгерістер ертерек басталады, бірақ жылдам шаралар қаланың барлық ұзақ мерзімді қажеттіліктерін өтемейді.', ['Бір тоқсаннан кейін іске қосылатын шаралар: {count} шараның {fastCount}-і.', 'Пайдаланылмаған бюджет: {budget} бірліктің {remaining} бірлігі.', '40-тан төмен қалған көрсеткіштер саны: {critical}.']],
    balanced: ['Қала міндеттерінің теңгерімі', 'Сіз қаланы дамытудың әртүрлі шараларын үйлестірдіңіз. Нәтиже олардың орташа көрсеткіштерге, ең әлсіз ауданға және қалған сыни қажеттіліктерге әсеріне байланысты.', ['Қаржыландырылған бағыттар: 5 бағыттың {categoryCount}-і.', 'Бюджеттегі {budget} бірліктің {spent} бірлігі жұмсалды.', 'Қорытынды Score: {score}; бастапқы деңгейден өзгеріс: {delta}.']],
    strained: ['Бюджет шегінде', 'Сценарий бюджет шегінен шыққан жоқ, бірақ бос қаражат аз, ал сыни көрсеткіштер сақталды. Келесі қадам үшін таңдалған шараларды ауыстыру нұсқаларын мұқият салыстыру қажет.', ['Пайдаланылмаған бюджет: {budget} бірліктің {remaining} бірлігі.', '40-тан төмен қалған көрсеткіштер саны: {critical}.', 'Қорытынды Score: {score}; бастапқы деңгейден өзгеріс: {delta}.']],
  },
  en: {
    social: ['A city for families', 'You made schools or healthcare one of your main budget priorities. This invests in family life; project benefits emerge after implementation begins.', ['Social infrastructure received {socialSpent} of the {spent} units spent.', 'Improvement in the average social infrastructure indicator: {socialDelta}.', 'Indicators still below 40: {critical}.']],
    green: ['A greener direction', 'Cleaner fuel or citywide greening became a significant part of your plan. The model shows environmental improvement; these projects need time to take effect.', ['Environmental initiatives received {greenSpent} budget units.', 'Improvement in the average environment indicator: {greenDelta}.', 'Final Score: {score}; change from the baseline: {delta}.']],
    quick: ['Faster first steps', 'You chose at least three initiatives that start after one quarter. Initial changes begin sooner, but quick initiatives do not cover every long-term need of the city.', ['Initiatives starting after one quarter: {fastCount} of {count}.', 'Unspent budget: {remaining} of {budget}.', 'Indicators still below 40: {critical}.']],
    balanced: ['Balancing the city’s needs', 'You combined different urban development initiatives. The result depends on their effects on average indicators, the weakest district and remaining critical needs.', ['Categories receiving funding: {categoryCount} of 5.', 'Budget spent: {spent} of {budget} units.', 'Final Score: {score}; change from the baseline: {delta}.']],
    strained: ['A stretched budget', 'Your scenario stays within the budget, but little funding remains and some indicators are still critical. The next step calls for carefully comparing replacements for selected initiatives.', ['Unspent budget: {remaining} of {budget}.', 'Indicators still below 40: {critical}.', 'Final Score: {score}; change from the baseline: {delta}.']],
  },
};

/** Narrative styles, not a second score or an AI judgement.
 * Priority is intentional and deterministic:
 * 1. strained: <=5 units remain AND at least one critical indicator remains;
 * 2. quick: at least 3 selected measures have a one-quarter launch lag;
 * 3. social: M7/M8 selected and social spending is a largest category (ties count);
 * 4. green: M5/M6 selected and the model's average green delta is >=0.9;
 * 5. balanced: the remaining mixed approaches.
 * The current 127 affordable story routes reach all five styles (30/36/24/21/16).
 * All numbers below come from the server evaluation; this function never scores.
 */
export function classifyEnding(evaluation, initiatives, language = 'ru') {
  if (!evaluation || !Array.isArray(evaluation.decisions) || evaluation.decisions.length !== MEETING_COUNT || !Array.isArray(evaluation.metrics) || !Array.isArray(initiatives)) throw new TypeError('A complete evaluated scenario is required');
  const catalog = new Map(initiatives.map(item => [item.id, item]));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  for (const key of ['remaining', 'spent', 'budget', 'criticalCount', 'score', 'delta']) {
    if (!finite(evaluation[key])) throw new TypeError(`Missing evaluated ${key}`);
  }
  const selected = evaluation.decisions.map(decision => {
    const source = catalog.get(decision.initiativeId);
    if (!source || !finite(decision.cost) || !finite(decision.lag) || decision.categoryId !== source.categoryId) throw new TypeError('Invalid evaluated initiative');
    return decision;
  });
  const metricDeltas = new Map(evaluation.metrics.map(metric => [metric.id, metric.delta]));
  if (!finite(metricDeltas.get('social')) || !finite(metricDeltas.get('green'))) throw new TypeError('Missing evaluated category changes');
  const ids = new Set(selected.map(item => item.initiativeId));
  const spending = selected.reduce((totals, item) => ({ ...totals, [item.categoryId]: (totals[item.categoryId] || 0) + item.cost }), {});
  const fastCount = selected.filter(item => item.lag === 1).length;
  let id;
  if (evaluation.remaining <= 5 && evaluation.criticalCount > 0) id = 'strained';
  else if (fastCount >= 3) id = 'quick';
  else if ((ids.has('M7') || ids.has('M8')) && (spending.social || 0) >= Math.max(...Object.values(spending))) id = 'social';
  else if ((ids.has('M5') || ids.has('M6')) && metricDeltas.get('green') >= 0.9) id = 'green';
  else id = 'balanced';
  const lang = Object.hasOwn(endingCopy, language) ? language : 'ru';
  const number = new Intl.NumberFormat({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }[lang], { maximumFractionDigits: 2 });
  const signed = value => `${value > 0 ? '+' : ''}${number.format(value)}`;
  const vars = {
    socialSpent: number.format(spending.social || 0), greenSpent: number.format(spending.green || 0),
    socialDelta: signed(metricDeltas.get('social')), greenDelta: signed(metricDeltas.get('green')),
    fastCount, count: selected.length, categoryCount: Object.keys(spending).length,
    remaining: number.format(evaluation.remaining), spent: number.format(evaluation.spent), budget: number.format(evaluation.budget),
    critical: evaluation.criticalCount, score: number.format(evaluation.score), delta: signed(evaluation.delta),
  };
  const [title, body, reasons] = endingCopy[lang][id];
  return { id, title, body, reasons: reasons.map(reason => reason.replace(/\{(\w+)\}/g, (_, key) => vars[key])) };
}
