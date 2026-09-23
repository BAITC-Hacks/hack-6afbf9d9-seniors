import { getStory } from './story.js';
import { translate } from './i18n.js';

export const JURY_SLIDE_SECONDS = 25;
export const JURY_SLIDE_COUNT = 6;
export const JURY_ROUTE = Object.freeze([
  Object.freeze({ initiativeId: 'M7', categoryId: 'social', districtId: 'nura' }),
  Object.freeze({ initiativeId: 'M5', categoryId: 'green', districtId: 'saryarka' }),
  Object.freeze({ initiativeId: 'M1', categoryId: 'transport', districtId: 'almaty' }),
  Object.freeze({ initiativeId: 'M10', categoryId: 'safety', districtId: 'nura' }),
  Object.freeze({ initiativeId: 'M12', categoryId: 'services', districtId: null }),
]);

const words = {
  menuTitle: ['Презентация для жюри', 'Қазыларға арналған таныстырылым', 'Jury presentation'],
  menuHint: ['Весь симулятор за 2 минуты 30 секунд', 'Бүкіл симулятор 2 минут 30 секундта', 'The simulator in 2 minutes 30 seconds'],
  label: ['Демонстрация · 2:30', 'Көрсетілім · 2:30', 'Presentation · 2:30'],
  pause: ['Пауза', 'Кідірту', 'Pause'],
  resume: ['Продолжить', 'Жалғастыру', 'Resume'],
  previous: ['Назад', 'Артқа', 'Previous'],
  next: ['Далее', 'Әрі қарай', 'Next'],
  exit: ['В меню', 'Мәзірге', 'Back to menu'],
  restart: ['Показать заново', 'Қайта көрсету', 'Show again'],
  about: ['О симуляторе и команде', 'Симулятор және команда туралы', 'About the simulator and team'],
  progress: ['Слайд {current} из {total}', '{total} слайдтың {current}-сі', 'Slide {current} of {total}'],
  seconds: ['{seconds} с до следующего слайда', 'Келесі слайдқа дейін {seconds} с', '{seconds}s until the next slide'],
  paused: ['Показ приостановлен', 'Көрсетілім кідіртілді', 'Presentation paused'],
  finished: ['Показ завершён', 'Көрсетілім аяқталды', 'Presentation complete'],
  loading: ['Загружаем серверные расчёты…', 'Сервер есептеулерін жүктеудеміз…', 'Loading server calculations…'],
  notice: ['Синтетические данные. Иллюстративная карта. Отдельная демонстрация не меняет ваши решения и сохранения.', 'Жасанды деректер. Шартты карта. Бөлек көрсетілім шешімдеріңіз бен сақтауларыңызды өзгертпейді.', 'Synthetic data and an illustrative map. This separate demonstration leaves your decisions and saves unchanged.'],
  problem: ['Проблема', 'Мәселе', 'The problem'],
  appointment: ['Назначение', 'Тағайындау', 'The appointment'],
  decisions: ['Пять решений', 'Бес шешім', 'Five decisions'],
  city: ['Изменения города', 'Қаладағы өзгерістер', 'A changing city'],
  event: ['Испытание', 'Сынақ', 'The stress test'],
  finale: ['Результат', 'Нәтиже', 'The result'],
  budget: ['Единиц бюджета', 'Бюджет бірлігі', 'Budget units'],
  hours: ['Часов полномочий', 'Өкілеттік сағаты', 'Hours in charge'],
  districts: ['Районов', 'Аудан', 'Districts'],
  before: ['До решений', 'Шешімдерге дейін', 'Before decisions'],
  after: ['Прогноз плана', 'Жоспар болжамы', 'Plan forecast'],
  withEvent: ['Прогноз при событии', 'Оқиға кезіндегі болжам', 'Forecast under the event'],
  eventChange: ['Влияние события на Score', 'Оқиғаның Score-ға әсері', 'Event impact on Score'],
  spent: ['Утверждено', 'Бекітілді', 'Committed'],
  remaining: ['Осталось', 'Қалды', 'Remaining'],
  cityWide: ['Весь город', 'Бүкіл қала', 'City-wide'],
  afterStep: ['Score после решения', 'Шешімнен кейінгі Score', 'Score after this decision'],
  critical: ['Показателей ниже 40', '40-тан төмен көрсеткіш', 'Indicators below 40'],
  horizon: ['Горизонт прогноза — 8 кварталов', 'Болжам кезеңі — 8 тоқсан', 'Forecast horizon: 8 quarters'],
  comparison: ['До решений → прогноз', 'Шешімдерге дейін → болжам', 'Before decisions → forecast'],
  problemTitle: ['Одного бюджета на все желания не хватит.', 'Бір бюджет барлық тілекке жетпейді.', 'One budget cannot meet every wish.'],
  problemBody: ['Родители ждут места в школе, жители — чистый воздух, пассажиры — удобный транспорт. Симулятор помогает увидеть не только пользу решения, но и то, что останется за его пределами.', 'Ата-аналар мектептен орын, тұрғындар таза ауа, жолаушылар ыңғайлы көлік күтеді. Симулятор шешімнің пайдасын ғана емес, оның шегінен тыс қалатын қажеттіліктерді де көрсетеді.', 'Parents need school places, residents need clean air and passengers need reliable transport. The simulator reveals both what a decision improves and which needs it leaves unmet.'],
  problemQuote: ['«За каждой строкой отчёта — чей-то обычный день».', '«Есептің әр жолында біреудің күнделікті өмірі тұр».', '“Behind each row of a report is someone’s ordinary day.”'],
  appointmentTitle: ['Вы — временный аким. Город уже ждёт.', 'Сіз — уақытша әкімсіз. Қала сізді күтіп тұр.', 'You are the temporary mayor. The city is waiting.'],
  appointmentBody: ['Срочный звонок прерывает работу в городской лаборатории. До 14:00 нужно выслушать жителей, распределить лимиты и утвердить ровно пять инициатив. Персонажи помнят предыдущие решения.', 'Шұғыл қоңырау қалалық зертханадағы жұмысты бөлді. 14:00-ге дейін тұрғындарды тыңдап, шектерді бөліп, дәл бес бастаманы бекіту керек. Кейіпкерлер алдыңғы шешімдерді есте сақтайды.', 'An urgent call interrupts your work at the city laboratory. Before 14:00, hear the residents, allocate limits and approve exactly five initiatives. Characters remember earlier decisions.'],
  appointmentQuote: ['«Не обещайте всё сразу. Объясните, с чего начнём».', '«Бәрін бірден уәде етпеңіз. Неден бастайтынымызды түсіндіріңіз».', '“Do not promise everything at once. Explain where we begin.”'],
  decisionsTitle: ['Один возможный маршрут. Пять обязательств.', 'Бір ықтимал бағыт. Бес міндеттеме.', 'One possible route. Five commitments.'],
  decisionsBody: ['Это заранее выбранный допустимый пример для показа. Цены и промежуточные результаты получены от сервера; в симуляторе участник выбирает свой план.', 'Бұл — көрсетілімге алдын ала таңдалған жарамды мысал. Бағалар мен аралық нәтижелер серверден алынған; симуляторда қатысушы өз жоспарын таңдайды.', 'This is a preselected valid demonstration route. Prices and intermediate results come from the server; participants choose their own plans in the simulator.'],
  cityTitle: ['Решения становятся видимыми на карте.', 'Шешімдер картада көрінеді.', 'Decisions become visible on the map.'],
  cityBody: ['Каждый район меняется по общей модели. Score учитывает средний результат, самый слабый район и критические показатели. Это прогноз на два года; город не перестраивается за один день.', 'Әр аудан ортақ модель бойынша өзгереді. Score орташа нәтижені, ең әлсіз ауданды және сыни көрсеткіштерді ескереді. Бұл — екі жылдық болжам; қала бір күнде қайта құрылмайды.', 'Every district follows the same model. The Score considers the city average, the weakest district and critical indicators. This is a two-year forecast; the city is not rebuilt in a day.'],
  eventTitle: ['А если город столкнётся с неожиданностью?', 'Ал қала күтпеген жағдайға тап болса ше?', 'What if the city faces a disruption?'],
  eventBody: ['Отдельный стресс-тест проверяет тот же план при городском событии. Результат помогает обсудить устойчивость решений и не заменяет основной Score.', 'Бөлек стресс-тест сол жоспарды қалалық оқиға кезінде тексереді. Нәтиже шешімдердің төзімділігін талқылауға көмектеседі және негізгі Score-ды алмастырмайды.', 'A separate stress test evaluates the same plan under a city event. It supports a discussion of resilience without replacing the main Score.'],
  eventFallback: ['Расчёт события недоступен. Основной сценарий остаётся рассчитанным; числовой результат стресс-теста появится после ответа сервера.', 'Оқиға есебі қолжетімсіз. Негізгі сценарий есептелген күйде қалады; стресс-тест нәтижесі сервер жауабынан кейін пайда болады.', 'The event calculation is unavailable. The main scenario remains evaluated; numerical stress-test results require a server response.'],
  eventSeparate: ['Отдельный прогноз устойчивости • основной план сохранён', 'Төзімділіктің бөлек болжамы • негізгі жоспар сақталды', 'Separate resilience forecast • main plan preserved'],
  finaleTitle: ['Не просто число. Решение, которое можно объяснить.', 'Жай сан емес. Түсіндіруге болатын шешім.', 'More than a number. A decision you can explain.'],
  finaleBody: ['Одинаковые исходные условия, прозрачные ограничения и понятные последствия. История помогает услышать жителей, свободный режим — проверить другие идеи, а AI или деморазбор — обсудить компромиссы.', 'Бірдей бастапқы жағдай, ашық шектеулер және түсінікті салдар. Оқиға тұрғындарды тыңдауға, еркін режим басқа идеяларды тексеруге, ал AI немесе демоталдау ымыраларды талқылауға көмектеседі.', 'Equal starting conditions, transparent constraints and understandable consequences. The story gives residents a voice, free mode tests alternatives, and AI or demo analysis explains the trade-offs.'],
  evidenceTitle: ['Числа считает модель', 'Сандарды модель есептейді', 'The model calculates'],
  evidenceBody: ['Бюджет, эффекты, сроки и Score проверяются сервером.', 'Бюджет, әсерлер, мерзімдер және Score серверде тексеріледі.', 'The server verifies budgets, effects, timing and the Score.'],
  explanationTitle: ['Анализ объясняет выбор', 'Талдау таңдауды түсіндіреді', 'Analysis explains the choice'],
  explanationBody: ['AI получает рассчитанные результаты. Без ключа доступен явно обозначенный деморазбор.', 'AI есептелген нәтижелерді алады. Кілтсіз анық белгіленген демоталдау қолжетімді.', 'AI receives calculated results. Without a key, a clearly labelled demo explanation is available.'],
  repeatTitle: ['Результат воспроизводим', 'Нәтижені қайталауға болады', 'The result is reproducible'],
  repeatBody: ['Тот же набор инициатив даёт те же показатели. Сценарий можно сравнить, сохранить и пересмотреть.', 'Бірдей бастамалар жиыны бірдей көрсеткіштер береді. Сценарийді салыстыруға, сақтауға және қайта қарауға болады.', 'The same initiatives produce the same indicators. Scenarios can be compared, saved and reviewed.'],
};

export function juryText(key, language = 'ru', vars = {}) {
  const column = language === 'kk' ? 1 : language === 'en' ? 2 : 0;
  const text = Object.hasOwn(words, key) ? words[key][column] : String(key);
  return text.replace(/\{(\w+)\}/g, (placeholder, name) => Object.hasOwn(vars, name) ? String(vars[name]) : placeholder);
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clampIndex = value => Number.isInteger(value) ? Math.max(0, Math.min(JURY_SLIDE_COUNT - 1, value)) : 0;
const positions = { esil: [52, 74], almaty: [78, 37], saryarka: [22, 27], baikonur: [51, 24], nura: [23, 69] };
const slideKeys = ['problem', 'appointment', 'decisions', 'city', 'event', 'finale'];

/** Render only. No storage, requests, timers, mutations, or scoring take place here. */
export function renderJury({ data, evaluations = [], language = 'ru', index = 0, paused = false, remaining = JURY_SLIDE_SECONDS, busy = false, icon = () => '', num = value => value.toFixed(2), signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}`, eventResult = null }) {
  const current = clampIndex(index);
  const seconds = finite(remaining) ? Math.max(0, Math.min(JURY_SLIDE_SECONDS, Math.ceil(remaining))) : JURY_SLIDE_SECONDS;
  const t = (key, vars) => escape(juryText(key, language, vars));
  const tr = value => escape(translate(value && typeof value === 'object' ? value[language] || value.ru || value.en || '' : value, language));
  const number = value => finite(value) ? escape(num(value)) : '—';
  const difference = value => finite(value) ? escape(signed(value)) : '—';
  const baseline = evaluations[0] || data?.baseline || {};
  const result = evaluations[5] || null;
  const districts = data?.districts || [];
  const initiatives = data?.initiatives || [];
  const meetings = getStory(language);
  const title = t(`${slideKeys[current]}Title`);
  const intro = t(`${slideKeys[current]}Body`);
  const completed = current === JURY_SLIDE_COUNT - 1 && seconds === 0;
  const controls = (action, label, symbol = '', disabled = false, primary = false) => `<button class="jury-button ${primary ? 'jury-primary' : ''}" data-action="${action}" ${disabled ? 'disabled' : ''}>${symbol ? icon(symbol) : ''}${label}</button>`;
  const metric = (label, value, detail = '') => `<div class="jury-metric"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</div>`;
  const scoreComparison = () => `<div class="jury-score-comparison">${metric(t('before'), number(baseline.score))}<span class="jury-score-arrow" aria-hidden="true">→</span>${metric(t('after'), number(result?.score), difference(result?.delta))}</div>`;
  const map = (evaluation = baseline, showChanges = false) => `<div class="jury-map"><img src="/city-map.svg" alt=""/>${districts.map(district => {
    const [x, y] = positions[district.id] || [50, 50];
    const districtResult = evaluation?.districts?.find(item => item.id === district.id);
    return `<div class="jury-map-label ${showChanges && districtResult?.delta > 0 ? 'is-improved' : ''}" style="--jury-x:${x}%;--jury-y:${y}%"><span>${tr(district.name)}</span><strong>${showChanges ? `${number(districtResult?.before)} <i>→</i> ${number(districtResult?.after)}` : number(districtResult?.after ?? districtResult?.before)}</strong>${showChanges ? `<small>${difference(districtResult?.delta)}</small>` : ''}</div>`;
  }).join('')}<span class="jury-map-caption">${showChanges ? t('horizon') : 'ASTANA CITY LAB'}</span></div>`;
  let content;
  if (current === 0) {
    content = `<div class="jury-split"><div class="jury-narration"><h1>${title}</h1><p>${intro}</p><blockquote>${t('problemQuote')}</blockquote><div class="jury-facts">${metric(t('budget'), number(data?.budget))}${metric(t('districts'), String(districts.length))}${metric(t('critical'), number(baseline.criticalCount))}</div></div><div class="jury-map-frame">${map()}</div></div>`;
  } else if (current === 1) {
    content = `<div class="jury-split jury-appointment"><figure class="jury-portrait"><img src="/portraits/character-4.png" alt="${escape(meetings[4].name)}"/><figcaption><strong>${escape(meetings[4].name)}</strong><span>${escape(meetings[4].role)}</span></figcaption><div class="jury-call-tag">${icon('clock')}08:27</div></figure><div class="jury-narration"><h1>${title}</h1><p>${intro}</p><blockquote>${t('appointmentQuote')}</blockquote><div class="jury-facts">${metric(t('hours'), '5')}${metric(t('budget'), number(data?.budget))}${metric(t('decisions'), '5')}</div></div></div>`;
  } else if (current === 2) {
    content = `<div class="jury-slide-heading"><h1>${title}</h1><p>${intro}</p></div><ol class="jury-decision-list">${JURY_ROUTE.map((decision, step) => {
      const measure = initiatives.find(item => item.id === decision.initiativeId);
      const district = districts.find(item => item.id === decision.districtId);
      const prefix = evaluations[step + 1];
      return `<li class="jury-decision jury-category-${decision.categoryId}"><img src="/portraits/character-${step}.png" alt="${escape(meetings[step].name)}"/><span class="jury-decision-index">${String(step + 1).padStart(2, '0')}</span><div class="jury-decision-copy"><strong>${tr(measure?.title || decision.initiativeId)}</strong><span>${district ? tr(district.name) : t('cityWide')}</span></div><div class="jury-decision-cost"><strong>${number(measure?.cost)}</strong><span>${t('budget')}</span></div><div class="jury-prefix"><span>${t('afterStep')}</span><b>${number(prefix?.score)}</b></div></li>`;
    }).join('')}</ol><div class="jury-decision-total">${metric(t('spent'), number(result?.spent), `/ ${number(data?.budget)}`)}${metric(t('remaining'), number(result?.remaining))}<p>${t('horizon')}</p></div>`;
  } else if (current === 3) {
    const improvements = [...(result?.metrics || [])].sort((a, b) => b.delta - a.delta).filter(item => item.delta > 0).slice(0, 3);
    content = `<div class="jury-slide-heading"><h1>${title}</h1><p>${intro}</p></div><div class="jury-results-layout"><div class="jury-map-frame">${map(result, true)}</div><div class="jury-results-summary">${scoreComparison()}<div class="jury-improvements">${improvements.map(item => `<div><span>${tr(item.name)}</span><b>${difference(item.delta)}</b></div>`).join('')}</div><div class="jury-critical">${t('critical')} <strong>${number(baseline.criticalCount)} → ${number(result?.criticalCount)}</strong></div></div></div>`;
  } else if (current === 4) {
    const event = eventResult?.event;
    const original = eventResult?.evaluation;
    const forecast = eventResult?.forecast;
    const valid = finite(original?.score) && finite(forecast?.score);
    const eventName = event?.name || event?.title;
    const eventDescription = event?.description || event?.summary;
    content = `<div class="jury-split jury-event"><div class="jury-narration"><div class="jury-event-signal">${icon('info')}${t('event')}</div><h1>${title}</h1><p>${intro}</p>${eventName ? `<h2>${tr(eventName)}</h2>` : ''}${eventDescription ? `<p class="jury-event-description">${tr(eventDescription)}</p>` : ''}<p class="jury-event-note">${t('eventSeparate')}</p></div><div class="jury-stress-panel">${valid ? `<div class="jury-stress-values">${metric(t('after'), number(original.score))}${metric(t('withEvent'), number(forecast.score))}</div><div class="jury-stress-delta">${metric(t('eventChange'), difference(forecast.score - original.score))}</div>${finite(forecast.criticalCount) ? `<div class="jury-critical">${t('critical')} <strong>${number(forecast.criticalCount)}</strong></div>` : ''}` : `<div class="jury-stress-empty">${icon('info')}<p>${t('eventFallback')}</p></div>`}</div></div>`;
  } else {
    content = `<div class="jury-split jury-finale"><div class="jury-narration"><h1>${title}</h1><p>${intro}</p>${scoreComparison()}<div class="jury-final-actions">${controls('about-simulator', t('about'), 'info')}${controls('jury-restart', t('restart'), 'refresh')}</div></div><div class="jury-value-list">${['evidence', 'explanation', 'repeat'].map((key, item) => `<article><span>${String(item + 1).padStart(2, '0')}</span><div><h2>${t(`${key}Title`)}</h2><p>${t(`${key}Body`)}</p></div></article>`).join('')}<div class="jury-people" aria-hidden="true">${meetings.map(meeting => `<img src="/portraits/character-${meeting.portrait}.png" alt=""/>`).join('')}</div></div></div>`;
  }
  return `<main class="jury-screen" id="main" data-i18n-skip tabindex="-1"><header class="jury-header"><div class="jury-brand"><img src="/favicon.svg" alt=""/><div>ASTANA CITY LAB<strong>${t('menuTitle')}</strong></div></div>${controls('jury-exit', t('exit'), 'close')}</header><div class="jury-topline"><span>${t('label')}</span><span>${t('progress', { current: current + 1, total: JURY_SLIDE_COUNT })}</span></div><ol class="jury-progress" aria-label="${t('menuTitle')}">${slideKeys.map((key, step) => `<li class="${step === current ? 'is-current' : step < current ? 'is-done' : ''}" ${step === current ? 'aria-current="step"' : ''}><span>${String(step + 1).padStart(2, '0')}</span>${t(key)}</li>`).join('')}</ol><section class="jury-slide jury-slide-${current}" aria-label="${t(slideKeys[current])}" ${busy ? 'aria-busy="true"' : ''}>${busy ? `<div class="jury-loading">${icon('clock')}<p>${t('loading')}</p></div>` : content}</section><footer class="jury-footer"><p class="jury-notice">${t('notice')}</p><div class="jury-controls">${controls('jury-prev', t('previous'), '', busy || current === 0)}${controls(completed ? 'jury-restart' : 'jury-toggle', completed ? t('restart') : t(paused ? 'resume' : 'pause'), completed ? 'refresh' : 'clock', busy, true)}${controls('jury-next', t('next'), 'arrow', busy || current === JURY_SLIDE_COUNT - 1)}<span class="jury-countdown" role="timer" aria-live="off">${t(completed ? 'finished' : paused ? 'paused' : 'seconds', { seconds })}</span></div></footer></main>`;
}

/** A single, deadline-based timer with explicit lifecycle and injectable time. */
export function createJuryClock({ onTick = () => {}, onAdvance = () => {}, environment = {} } = {}) {
  const now = environment.now || (() => Date.now());
  const schedule = environment.setTimeout || globalThis.setTimeout.bind(globalThis);
  const cancel = environment.clearTimeout || globalThis.clearTimeout.bind(globalThis);
  const document = Object.hasOwn(environment, 'document') ? environment.document : globalThis.document;
  let state = { index: 0, remaining: JURY_SLIDE_SECONDS, paused: true, running: false, finished: false };
  let timer = null;
  let deadline = 0;
  let remainingMs = JURY_SLIDE_SECONDS * 1000;
  let listening = false;
  const getState = () => ({ ...state });
  const emit = () => onTick(getState());
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  const sync = () => {
    if (state.running && !state.paused) remainingMs = Math.max(0, deadline - now());
    state.remaining = Math.ceil(remainingMs / 1000);
  };
  const detach = () => { if (listening) document?.removeEventListener?.('visibilitychange', onVisibility); listening = false; };
  const attach = () => { if (!listening && document?.addEventListener) { document.addEventListener('visibilitychange', onVisibility); listening = true; } };
  const isHidden = () => document?.visibilityState === 'hidden' || document?.hidden === true;
  const queue = () => {
    clear();
    if (state.running && !state.paused && !state.finished) timer = schedule(tick, Math.min(250, Math.max(1, remainingMs)));
  };
  function tick() {
    timer = null;
    if (!state.running || state.paused || state.finished) return;
    if (isHidden()) { pause(); return; }
    const previousRemaining = state.remaining;
    let advanced = false;
    sync();
    if (remainingMs <= 0) {
      if (state.index >= JURY_SLIDE_COUNT - 1) {
        state = { ...state, remaining: 0, paused: true, running: false, finished: true };
        detach();
        emit();
        return;
      }
      state = { ...state, index: state.index + 1, remaining: JURY_SLIDE_SECONDS };
      advanced = true;
      remainingMs = JURY_SLIDE_SECONDS * 1000;
      deadline = now() + remainingMs;
      onAdvance(state.index);
    }
    if (advanced || state.remaining !== previousRemaining) emit();
    queue();
  }
  function onVisibility() { if (isHidden()) pause(); }
  function start(index = 0) {
    clear();
    state = { index: clampIndex(index), remaining: JURY_SLIDE_SECONDS, paused: isHidden(), running: true, finished: false };
    remainingMs = JURY_SLIDE_SECONDS * 1000;
    deadline = now() + remainingMs;
    attach();
    emit();
    queue();
    return getState();
  }
  function pause() {
    if (!state.running || state.paused) return getState();
    sync();
    clear();
    state.paused = true;
    emit();
    return getState();
  }
  function resume() {
    if (!state.running || !state.paused || state.finished || isHidden()) return getState();
    deadline = now() + remainingMs;
    state.paused = false;
    emit();
    queue();
    return getState();
  }
  function seek(index) {
    sync();
    clear();
    const paused = state.paused || isHidden() || !state.running;
    state = { index: clampIndex(index), remaining: JURY_SLIDE_SECONDS, paused, running: true, finished: false };
    remainingMs = JURY_SLIDE_SECONDS * 1000;
    deadline = now() + remainingMs;
    attach();
    emit();
    queue();
    return getState();
  }
  function stop() {
    sync();
    clear();
    detach();
    state = { ...state, paused: true, running: false };
    return getState();
  }
  return { start, pause, resume, seek, stop, getState };
}
