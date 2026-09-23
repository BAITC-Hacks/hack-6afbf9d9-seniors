import { getVisibleDecisions, getConsequences } from './drama.js';
import { translate } from './i18n.js';

const copy = {
  jury: ['Презентация для жюри · 2½ минуты', 'Қазыларға таныстырылым · 2½ минут', 'Jury presentation · 2½ minutes'],
  about: ['Команда и AI-прозрачность', 'Команда және AI ашықтығы', 'Team and AI transparency'],
  back: ['Вернуться в меню', 'Мәзірге оралу', 'Back to menu'],
  news: ['Городская лента · решение утверждено', 'Қала жаңалықтары · шешім бекітілді', 'City wire · decision approved'],
  pending: ['Жители ждут результата. Сейчас утверждён проект; показатели показывают прогноз на восемь кварталов.', 'Тұрғындар нәтижені күтуде. Қазір жоба бекітілді; көрсеткіштер сегіз тоқсанға арналған болжамды көрсетеді.', 'Residents await the result. The project is approved; indicators show an eight-quarter forecast.'],
  countdown: ['До первой встречи', 'Алғашқы кездесуге дейін', 'Until the first meeting'],
  timerHint: ['Таймер вступления: можно продолжить раньше. Истечение времени не меняет решения и бюджет.', 'Кіріспе таймері: ертерек жалғастыруға болады. Уақыт бітуі шешімдер мен бюджетке әсер етпейді.', 'Introduction timer: continue whenever you are ready. Expiry does not change decisions or budget.'],
  ready: ['Штаб готов к приёму', 'Штаб қабылдауға дайын', 'Headquarters is ready'],
  alert: ['Срочная городская сводка', 'Шұғыл қала ақпараты', 'Urgent city bulletin'],
  eventHint: ['Случайное событие этого дня сохранено. Проверьте устойчивость текущего плана: основной бюджет и Score остаются прежними.', 'Осы күннің кездейсоқ оқиғасы сақталды. Ағымдағы жоспардың төзімділігін тексеріңіз: негізгі бюджет пен Score өзгермейді.', 'This day’s random event is saved. Check the current plan’s resilience; the main budget and Score remain unchanged.'],
  forecast: ['Рассчитать последствия события', 'Оқиға салдарын есептеу', 'Calculate the event forecast'],
  calculating: ['Сервер рассчитывает…', 'Сервер есептеуде…', 'Server is calculating…'],
  failed: ['Прогноз события недоступен. Повторите запрос; принятые решения сохранены.', 'Оқиға болжамы қолжетімсіз. Сұрауды қайталаңыз; бекітілген шешімдер сақталды.', 'The event forecast is unavailable. Retry; your approved decisions are saved.'],
  ordinary: ['Основной прогноз', 'Негізгі болжам', 'Ordinary forecast'],
  shocked: ['При этом событии', 'Осы оқиға кезінде', 'With this event'],
  affected: ['Затронутые районы', 'Әсер еткен аудандар', 'Affected districts'],
  inspect: ['Районы и показатели', 'Аудандар мен көрсеткіштер', 'Districts and indicators'],
  critical: ['Критических показателей', 'Сындарлы көрсеткіштер', 'Critical indicators'],
  team: ['Команда Seniors', 'Seniors командасы', 'Team Seniors'],
  mission: ['Учебный симулятор городских решений для Astana Innovations. Все районы, данные и персонажи используются в условной модели.', 'Astana Innovations үшін қалалық шешімдердің оқу симуляторы. Аудандар, деректер және кейіпкерлер шартты модельде қолданылады.', 'An educational city decision simulator for Astana Innovations. Districts, data and characters are part of a synthetic model.'],
  pipeline: ['Кто за что отвечает', 'Кім неге жауапты', 'Who does what'],
  server: ['Сервер считает', 'Сервер есептейді', 'The server calculates'],
  serverBody: ['Python проверяет 100 единиц бюджета, стоимость, пять решений и несовместимости. Он применяет лаги, синергии и формулу Score. События пересчитываются той же моделью.', 'Python 100 бірлік бюджетті, құнды, бес шешімді және үйлесімсіздіктерді тексереді. Ол кідірістерді, синергияларды және Score формуласын қолданады. Оқиғалар сол модельмен есептеледі.', 'Python validates the 100-unit budget, costs, five decisions and conflicts. It applies delays, synergies and the Score formula. Events use the same model.'],
  ai: ['AI объясняет', 'AI түсіндіреді', 'AI explains'],
  aiBody: ['LLM получает уже рассчитанные результаты и объясняет сильные стороны, риски и компромиссы. AI не назначает стоимость, не подтверждает решения и не меняет Score.', 'LLM дайын есеп нәтижелерін алып, артықшылықтарды, тәуекелдерді және ымыраларды түсіндіреді. AI құнды белгілемейді, шешімді бекітпейді және Score өзгертпейді.', 'The LLM receives calculated results and explains strengths, risks and trade-offs. AI does not set costs, approve decisions or change the Score.'],
  demo: ['Без ключа — прозрачный деморазбор', 'Кілтсіз — ашық демоталдау', 'Without a key: a labelled demo'],
  demoBody: ['Без подключения AI или при ошибке провайдера выводится разбор по правилам с отметкой «без LLM». Расчёты доступны в обоих режимах.', 'AI қосылмаса немесе провайдер қатесі болса, «LLM жоқ» белгісімен ережелік талдау беріледі. Есептеу екі режимде де қолжетімді.', 'Without AI, or if the provider fails, a rule-based explanation is labelled as a demo without an LLM. Calculations work in both modes.'],
  aiOn: ['AI подключён: анализ может использовать OpenAI. Режим каждого отчёта указан в самом отчёте.', 'AI қосылған: талдауда OpenAI қолданылуы мүмкін. Әр есептің режимі есепте көрсетілген.', 'AI is configured: analysis may use OpenAI. Each report identifies its actual mode.'],
  aiOff: ['Сейчас доступен деморежим без LLM.', 'Қазір LLM жоқ деморежим қолжетімді.', 'Currently using demo mode without an LLM.'],
  privacy: ['Прозрачность данных', 'Деректер ашықтығы', 'Data transparency'],
  privacyBody: ['Прогресс хранится в этом браузере. При AI-анализе провайдер получает выбранные меры и синтетические расчёты. Ключ остаётся на сервере. Репутация и достижения — условные сюжетные индексы, а не опрос жителей и не дополнительные баллы Score.', 'Прогресс осы браузерде сақталады. AI талдауы кезінде провайдер таңдалған шаралар мен жасанды есептерді алады. Кілт серверде қалады. Бедел мен жетістіктер — шартты оқиға индекстері, тұрғындар сауалнамасы немесе қосымша Score емес.', 'Progress stays in this browser. AI analysis sends selected initiatives and synthetic results to the provider; the key stays on the server. Reputation and achievements are narrative indices, not resident surveys or extra Score points.'],
};
const events = {
  'harsh-winter': [
    ['Морозы усиливаются', 'Аяз күшейіп жатыр', 'The cold spell deepens'],
    ['Диспетчер сообщает о росте нагрузки на теплосети. Штаб проверяет, выдержит ли город сложную зиму.', 'Диспетчер жылу желілеріне жүктеме артқанын хабарлады. Штаб қаланың қиын қысқа төзімділігін тексеруде.', 'Dispatch reports growing pressure on heating networks. Headquarters checks whether the city can withstand a difficult winter.']],
  'heating-main-burst': [
    ['Аварийный звонок с теплотрассы', 'Жылу желісінен апаттық қоңырау', 'An emergency call from the heating main'],
    ['Поступило сообщение о повреждении сети. Внимание штаба — к району с наиболее уязвимыми коммуникациями.', 'Желі зақымданғаны туралы хабар түсті. Штаб назары — инфрақұрылымы ең осал ауданға.', 'A damaged network has been reported. Headquarters turns to the district with the most vulnerable utilities.']],
  'population-surge': [
    ['Новые семьи прибывают в город', 'Қалаға жаңа отбасылар келуде', 'New families arrive in the city'],
    ['Регистратуры и школы сообщают о новых заявлениях. Проверьте нагрузку на школы и первичную медицину.', 'Тіркеу бөлімдері мен мектептер жаңа өтініштер туралы хабарлады. Мектептер мен алғашқы медицина жүктемесін тексеріңіз.', 'Clinics and schools report new applications. Check the pressure on schools and primary care.']],
  'traffic-accidents': [
    ['Гололёд нарушает движение', 'Көктайғақ қозғалысты бұзуда', 'Ice disrupts traffic'],
    ['Поступают сообщения о ДТП и задержках. Транспорт и безопасные переходы вновь в центре внимания штаба.', 'Жол апаттары мен кідірістер туралы хабарлар түсуде. Көлік пен қауіпсіз өткелдер қайтадан штаб назарында.', 'Reports of collisions and delays arrive. Transport and safe crossings return to the centre of the briefing.']],
};
const languageIndex = language => ({ ru: 0, kk: 1, en: 2 })[language] ?? 0;
export const liveText = (key, language = 'ru') => copy[key]?.[languageIndex(language)] ?? key;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function eventPreviewKey(story, language) {
  return JSON.stringify([story.eventId, language, getVisibleDecisions(story)]);
}
export function drawCityEvent(ids, random = Math.random) {
  const value = random();
  return ids[Math.min(ids.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * ids.length)))] ?? null;
}
export function renderDecisionNews({ data, evaluation, story, language }) {
  const decision = getVisibleDecisions(story).at(-1);
  const consequence = decision && getConsequences(data, evaluation, decision.initiativeId, language);
  if (!consequence) return '';
  return `<section class="city-news" aria-label="${esc(liveText('news', language))}"><span>${esc(liveText('news', language))}</span><h2>${esc(consequence.title)}</h2><p>${esc(consequence.reaction)}</p><small>${esc(liveText('pending', language))}</small></section>`;
}
export function renderCityEvent({ data, story, language, num, signed, busy }) {
  if (!events[story.eventId] || getVisibleDecisions(story).length < 2) return '';
  const text = key => esc(liveText(key, language));
  const descriptor = events[story.eventId];
  const error = story.eventError === eventPreviewKey(story, language);
  const preview = story.eventPreview?.key === eventPreviewKey(story, language) ? story.eventPreview.result : null;
  const forecast = preview?.forecast;
  return `<section class="city-event" aria-labelledby="city-event-title"><div class="city-event-heading"><span class="city-alert-dot" aria-hidden="true"></span><span>${text('alert')}</span></div><h2 id="city-event-title">${esc(descriptor[0][languageIndex(language)])}</h2><p>${esc(descriptor[1][languageIndex(language)])}</p><small>${text('eventHint')}</small>${forecast ? `<div class="city-event-scores"><div>${text('ordinary')}<b>${num(preview.evaluation.score)}</b></div><div>${text('shocked')}<b>${num(forecast.score)} <em>${signed(forecast.delta)}</em></b></div><div>${text('critical')}<b>${forecast.criticalCount}</b></div></div><details><summary>${text('inspect')}</summary>${forecast.districts.map(district => `<div class="city-event-district"><strong>${esc(translate(district.name, language))}</strong><span>${num(district.before)} → ${num(district.after)}</span>${district.affected ? `<ul>${data.indicators.filter(indicator => district.metrics[indicator.id] !== district.beforeMetrics[indicator.id]).map(indicator => `<li>${esc(translate(indicator.name, language))}: ${num(district.beforeMetrics[indicator.id])} → ${num(district.metrics[indicator.id])}</li>`).join('')}</ul>` : ''}</div>`).join('')}</details>` : `<button class="story-secondary" data-action="city-event-calculate" ${busy || story.eventLoading ? 'disabled' : ''}>${text(story.eventLoading ? 'calculating' : 'forecast')}</button>`}${error ? `<p class="city-event-error" role="status">${text('failed')}</p>` : ''}</section>`;
}
export function renderIntroCountdown(story, language) {
  const remaining = Math.max(0, story.introRemaining ?? 90);
  return `<aside class="intro-countdown"><strong>${esc(liveText('countdown', language))} <time id="intro-countdown-value">${remaining ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : esc(liveText('ready', language))}</time></strong><span>${esc(liveText('timerHint', language))}</span></aside>`;
}
export function renderTransparency({ data, language, icon }) {
  const text = key => esc(liveText(key, language));
  return `<main class="story-screen transparency-screen" data-i18n-skip id="main" tabindex="-1"><header class="story-header"><div class="story-brand"><img src="/favicon.svg" alt=""/><strong>${text('team')}</strong></div><button class="story-secondary" data-action="game-menu">${text('back')}</button></header><div class="transparency-intro"><span>ASTANA INNOVATIONS · SENIORS</span><h1>${text('about')}</h1><p>${text('mission')}</p></div><section class="transparency-pipeline" aria-label="${text('pipeline')}">${['server','ai','demo'].map((key, index) => `<article><span>0${index + 1}</span><h2>${icon(key === 'server' ? 'chart' : key === 'ai' ? 'sparkle' : 'book')}${text(key)}</h2><p>${text(key + 'Body')}</p></article>`).join('')}</section><section class="transparency-data"><p class="transparency-mode">${text(data?.ai?.enabled ? 'aiOn' : 'aiOff')}</p><h2>${text('privacy')}</h2><p>${text('privacyBody')}</p></section><button class="story-primary" data-action="jury-start">${text('jury')}</button></main>`;
}

// A gentle prologue clock. It pauses off screen and never advances a scene.
export function createIntroClock(onTick, environment = globalThis) {
  const now = environment.now || (() => Date.now());
  const schedule = environment.setTimeout?.bind(environment) || globalThis.setTimeout.bind(globalThis);
  const cancel = environment.clearTimeout?.bind(environment) || globalThis.clearTimeout.bind(globalThis);
  let owner = null, remaining = 90000, timer = null, last = 0, active = false;
  function clear() { if (timer !== null) cancel(timer); timer = null; }
  function settle() { if (active) remaining = Math.max(0, remaining - Math.max(0, now() - last)); last = now(); }
  function tick() {
    timer = null;
    if (!active) return;
    settle();
    onTick(Math.ceil(remaining / 1000), owner);
    if (remaining > 0) timer = schedule(tick, 250);
  }
  return {
    sync(enabled, identity) {
      if (identity !== owner) { clear(); owner = identity; remaining = 90000; active = false; }
      settle();
      active = Boolean(enabled && remaining > 0);
      clear();
      if (active) timer = schedule(tick, 250);
      return Math.ceil(remaining / 1000);
    },
    stop() { settle(); active = false; clear(); },
  };
}
