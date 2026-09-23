import { getStory, storyDecisions } from './story.js';
import { getTransition } from './narrative.js';
import { classifyEnding } from './story-flow.js';
import { translate } from './i18n.js';

// Dramatic presentation of the synthetic city. This module never prices a
// project, applies effects, or calculates a score.
const words = {
  hq: ['Городской штаб', 'Қалалық штаб', 'City headquarters'],
  time: ['Время', 'Уақыт', 'Time'],
  meeting: ['Встреча {current} из {total}', '{total} кездесудің {current}-сі', 'Meeting {current} of {total}'],
  agenda: ['Повестка дня', 'Күн тәртібі', 'Today’s agenda'],
  visits: ['Пять встреч', 'Бес кездесу', 'Five meetings'],
  cityFeed: ['Голос города', 'Қала үні', 'Voices of the city'],
  cityPulse: ['Город на связи', 'Қала байланыста', 'The city is on the line'],
  budget: ['Бюджет', 'Бюджет', 'Budget'],
  decisions: ['Решения', 'Шешімдер', 'Decisions'],
  acceptedDecisions: ['Утверждённые решения', 'Бекітілген шешімдер', 'Approved decisions'],
  impact: ['Что изменит решение', 'Шешім нені өзгертеді', 'What the decision changes'],
  now: ['Сейчас', 'Қазір', 'Now'],
  later: ['После запуска', 'Іске қосылғаннан кейін', 'After implementation'],
  future: ['Прогноз на два года', 'Екі жылдық болжам', 'Two-year forecast'],
  before: ['До решений', 'Шешімдерге дейін', 'Before decisions'],
  forecast: ['Прогноз модели', 'Модель болжамы', 'Model forecast'],
  measureContribution: ['Вклад этой меры', 'Осы шараның үлесі', 'This measure’s contribution'],
  contributionNotice: ['Вклад меры с учётом срока запуска. Синергии и ограничение показателей 0–100 учитываются в общем прогнозе.', 'Іске қосылу мерзімі ескерілген шара үлесі. Синергиялар мен 0–100 шектері жалпы болжамда ескеріледі.', 'The measure’s contribution includes its launch delay. Synergies and the 0–100 limits are included in the whole-plan forecast.'],
  wholePlan: ['Весь утверждённый план', 'Бүкіл бекітілген жоспар', 'The complete approved plan'],
  chooseReply: ['Что вы ответите?', 'Не деп жауап бересіз?', 'What will you say?'],
  you: ['Вы', 'Сіз', 'You'],
  continue: ['Продолжить', 'Жалғастыру', 'Continue'],
  showAll: ['Показать весь разговор', 'Бүкіл әңгімені көрсету', 'Show the full conversation'],
  live: ['На связи', 'Байланыста', 'Connected'],
  syntheticTransmission: ['Сюжетная сцена • синтетический город', 'Оқиға көрінісі • жасанды қала', 'Story scene • synthetic city'],
  schematicRoutes: ['Условные транспортные линии: это схема эффекта, а не реальные маршруты.', 'Шартты көлік сызықтары: бұл әсер сызбасы, нақты бағыттар емес.', 'Illustrative transport lines: these show the effect schematically, not real routes.'],
  districtDetails: ['Подробности района', 'Аудан туралы мәлімет', 'District details'],
  mapTitle: ['Город за окном штаба', 'Штаб терезесінің сыртындағы қала', 'The city beyond headquarters'],
  noDecisions: ['Первое решение ещё впереди.', 'Алғашқы шешім әлі алда.', 'The first decision is still ahead.'],
  changes: ['Изменения показателей', 'Көрсеткіштердің өзгеруі', 'Indicator changes'],
  noChanges: ['В этой части прогноза пока нет изменений.', 'Болжамның осы бөлігінде әзірге өзгеріс жоқ.', 'This part of the forecast has not changed yet.'],
  decisionContext: ['Уже принято во внимание', 'Ескерілген шешімдер', 'Already taken into account'],
  details: ['Подробнее', 'Толығырақ', 'Details'],
  confirm: ['Утвердить решение', 'Шешімді бекіту', 'Approve the decision'],
  achievements: ['Три заметных сдвига', 'Үш елеулі өзгеріс', 'Three notable improvements'],
  problems: ['Что остаётся нерешённым', 'Шешілмеген мәселелер', 'What remains unresolved'],
  address: ['Ваше обращение к городу', 'Қалаға үндеуіңіз', 'Your address to the city'],
  style: ['Ваш стиль управления', 'Басқару мәнеріңіз', 'Your style of leadership'],
  replay: ['Показать день заново', 'Осы күнді қайта көрсету', 'Show this day again'],
  replayHint: ['Пять ключевых решений и реакции на них. Просмотр не меняет сохранённый результат.', 'Бес негізгі шешім және оларға жауаптар. Қарау сақталған нәтижені өзгертпейді.', 'Five key decisions and their reactions. Viewing them does not change your saved result.'],
  replayNotice: ['Просмотр завершённого дня • решения сохранены', 'Аяқталған күнді қарау • шешімдер сақталған', 'Reviewing a completed day • decisions are saved'],
  replayNext: ['Следующий эпизод', 'Келесі көрініс', 'Next moment'],
  replayPrevious: ['Предыдущий эпизод', 'Алдыңғы көрініс', 'Previous moment'],
  replayPrev: ['Предыдущий эпизод', 'Алдыңғы көрініс', 'Previous moment'],
  replayClose: ['Вернуться к финалу', 'Қорытындыға оралу', 'Return to the ending'],
  replayProgress: ['Эпизод {current} из {total}', '{total} көріністің {current}-сі', 'Moment {current} of {total}'],
  finalMap: ['Город после ваших решений', 'Шешімдеріңізден кейінгі қала', 'The city after your decisions'],
  finalDetails: ['Полный отчёт и показатели', 'Толық есеп пен көрсеткіштер', 'Full report and indicators'],
  scene: ['Сцена {current} из {total}', '{total} көріністің {current}-сі', 'Scene {current} of {total}'],
  camera: ['Городская камера', 'Қала камерасы', 'City camera'],
  message: ['Сообщение жителей', 'Тұрғындар хабарламасы', 'Residents’ message'],
  call: ['Входящий звонок', 'Кіріс қоңырауы', 'Incoming call'],
  news: ['Городская новость', 'Қала жаңалығы', 'City news'],
  map: ['Отметка на карте', 'Картадағы белгі', 'Map update'],
  lag: ['Запуск через {lag} кварт.', '{lag} тоқсаннан кейін іске қосылады', 'Starts after {lag} quarters'],
  wholeCity: ['Весь город', 'Бүкіл қала', 'Whole city'],
  lastDecision: ['Последнее решение', 'Соңғы шешім', 'Latest decision'],
  funding: ['Финансирование', 'Қаржыландыру', 'Funding'],
  selectedReply: ['Ваш ответ', 'Сіздің жауабыңыз', 'Your response'],
  indicatorDetails: ['Показатели района', 'Аудан көрсеткіштері', 'District indicators'],
  replayTitle: ['Как прошёл ваш день', 'Күніңіз қалай өтті', 'How your day unfolded'],
  forecastMap: ['Карта прогноза', 'Болжам картасы', 'Forecast map'],
  openingBudget: ['Начальный бюджет', 'Бастапқы бюджет', 'Opening budget'],
  futureAfterLag: ['Прогноз учитывает запуск через {lag} кварт.', 'Болжам {lag} тоқсаннан кейінгі іске қосуды ескереді', 'The forecast includes a launch after {lag} quarters'],
  noConfirmedDecision: ['Решение ещё не утверждено.', 'Шешім әлі бекітілген жоқ.', 'No decision has been approved yet.'],
  metricChange: ['В прогнозе: {before} → {after} ({delta}).', 'Болжамда: {before} → {after} ({delta}).', 'Forecast: {before} → {after} ({delta}).'],
  criticalProblem: ['{value} / 100. Значение остаётся ниже 40: этой потребности нужен следующий шаг.', '{value} / 100. Көрсеткіш 40-тан төмен: бұл қажеттілікке келесі қадам керек.', '{value} / 100. Still below 40: this need requires a further step.'],
  remainingProblem: ['{value} / 100. Один из самых низких оставшихся показателей города.', '{value} / 100. Қалада қалған ең төмен көрсеткіштердің бірі.', '{value} / 100. One of the city’s lowest remaining indicators.'],
  unfunded: ['Эта альтернатива не вошла в утверждённый план. Её потребность не исчезла.', 'Бұл балама бекітілген жоспарға кірмеді. Оған деген қажеттілік жойылған жоқ.', 'This alternative did not enter the approved plan. The need for it has not disappeared.'],
  delivery: ['Сроки реализации', 'Іске асыру мерзімдері', 'Delivery times'],
  deliveryDetail: ['Проектам ещё предстоят подготовка и запуск. Сегодня утверждены решения, а не завершены работы.', 'Жобаларды әлі дайындап, іске қосу қажет. Бүгін шешімдер бекітілді, жұмыстар аяқталған жоқ.', 'Projects still need preparation and implementation. Today approved decisions; it did not complete construction.'],
  accountability: ['Проверка обещаний', 'Уәделерді тексеру', 'Following up on promises'],
  accountabilityDetail: ['Жителям нужен следующий отчёт: кто отвечает за каждую меру и что сделано к сроку.', 'Тұрғындарға келесі есеп қажет: әр шараға кім жауапты және мерзімге дейін не істелді.', 'Residents need the next report: who owns each measure and what has been done by the deadline.'],
  addressBudget: ['Сегодня я утвердил пять решений и направил на них {spent} из {budget} единиц. Не использовано {remaining}. За этим планом стоят конкретные семьи и районы.', 'Бүгін бес шешімді бекітіп, оларға {budget} бірліктің {spent} бірлігін бағыттадым. {remaining} пайдаланылмады. Бұл жоспардың артында нақты отбасылар мен аудандар тұр.', 'Today I approved five decisions and committed {spent} of {budget} units. There are {remaining} left. Behind every line of this plan are families and neighbourhoods.'],
  addressForecast: ['Расчёт модели даёт Score {score}, изменение {delta}. Я называю это прогнозом: жители сегодня услышали решения, но ещё не получили готовые объекты.', 'Модель есебі Score {score}, өзгеріс {delta} екенін көрсетеді. Бұл — болжам: тұрғындар бүгін шешімдерді естіді, бірақ дайын нысандарды әлі алған жоқ.', 'The model gives a Score of {score}, a change of {delta}. This is a forecast: today residents heard decisions, but have not yet received completed projects.'],
  addressDuty: ['Я не могу объявить все проблемы решёнными. Следующая обязанность штаба — назвать ответственных, следить за сроками и вернуться к тем, чья потребность пока осталась без ответа.', 'Барлық мәселе шешілді деп айта алмаймын. Штабтың келесі міндеті — жауаптыларды белгілеу, мерзімдерді бақылау және қажеттілігі әлі өтелмеген адамдарға қайта оралу.', 'I cannot declare every problem solved. Headquarters must name those responsible, track delivery and return to the people whose needs are still unanswered.'],
};

const languageId = language => ['ru', 'kk', 'en'].includes(language) ? language : 'ru';
const local = (values, language) => values[{ ru: 0, kk: 1, en: 2 }[languageId(language)]];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const tr = (value, language) => translate(String(value ?? ''), languageId(language));
const validStep = step => Number.isInteger(step) && step >= 0 && step < 5;

export function dramaText(key, language = 'ru', vars = {}) {
  const value = Object.hasOwn(words, key) ? local(words[key], language) : String(key);
  return value.replace(/\{(\w+)\}/g, (placeholder, name) => Object.hasOwn(vars, name) ? String(vars[name]) : placeholder);
}

/** Only facts already reached at this moment can appear in the sidebar/map.
 * Replays are read-only windows onto a prefix of a completed campaign.
 */
export function getVisibleDecisions(story = {}) {
  if (!Array.isArray(story?.choices)) return [];
  const step = Number.isInteger(story.step) && story.step >= 0 && story.step <= 5 ? story.step : 0;
  let phase = story.phase;
  if (phase === 'planning') phase = story.planReturn?.phase || 'intro';
  let count;
  if (story.phase === 'ending' && validStep(story.replayIndex)) count = story.replayIndex + 1;
  else if (phase === 'ending') count = 5;
  else if (['briefing', 'discovery', 'council'].includes(phase)) count = step;
  else if (['meeting', 'transition'].includes(phase)) count = Math.min(5, step + 1);
  else count = 0;
  return storyDecisions(story.choices.slice(0, count));
}

const beats = [
  {
    channel: 'camera', districtId: 'nura', time: '08:58',
    title: ['Очередь ещё до первого звонка', 'Алғашқы қоңырауға дейінгі кезек', 'A queue before the first bell'],
    body: ['У школьного входа родители передают друг другу список. Один ребёнок сидит на рюкзаке. Айгуль выключает звук камеры: «Это не просто очередь за местами. Это семьи, которым нужно планировать завтрашний день».', 'Мектеп кіреберісінде ата-аналар тізімді бір-біріне беріп тұр. Бір бала сөмкесіне отырды. Айгүл камера дыбысын өшірді: «Бұл жай ғана орын кезегі емес. Бұл — ертеңгі күнін жоспарлауы керек отбасылар».', 'Parents pass a list along the school entrance. A child sits on a backpack. Aigul mutes the camera: “This is more than a queue for places. These are families trying to plan tomorrow.”'],
  },
  {
    channel: 'message', districtId: 'saryarka', time: '09:50',
    title: ['«Наше окно тоже есть на вашей карте?»', '«Біздің терезе де картаңызда бар ма?»', '“Is our window on your map too?”'],
    body: ['В чат штаба пришла фотография двора Сарыарки и короткая подпись: «Зимой мы узнаём погоду по запаху дыма. Нас услышат сегодня?» Дана ждёт у двери с картой частного сектора.', 'Штаб чатына Сарыарқа ауласының фотосы мен қысқа жазба келді: «Қыста ауа райын түтін иісінен білеміз. Бүгін бізді тыңдай ма?» Дана жеке сектор картасымен есік алдында тұр.', 'A courtyard photograph arrives in headquarters’ chat: “In winter we recognise the weather by the smell of smoke. Will someone hear us today?” Dana waits at the door with a map of private homes.'],
  },
  {
    channel: 'call', districtId: 'almaty', time: '10:50',
    title: ['Марат звонит с остановившегося маршрута', 'Марат тоқтап тұрған бағыттан қоңырау шалды', 'Marat calls from a stalled route'],
    body: ['«До штаба рукой подать, а автобус стоит уже второй цикл светофора. На заднем сиденье пассажир считает минуты до приёма. Я приеду, только не начинайте разговор о транспорте без нас».', '«Штаб жақын, ал автобус бағдаршамның екінші айналымында да тұр. Артқы орындықтағы жолаушы қабылдауға дейінгі минуттарды санап отыр. Барамыз, тек көлік туралы әңгімені бізсіз бастамаңыздар».', '“Headquarters is close, but the bus has missed a second light. A passenger in the back is counting minutes until an appointment. I am coming; please do not discuss transport without us.”'],
  },
  {
    channel: 'news', districtId: 'nura', time: '11:55',
    title: ['Полдень: у любого маршрута есть последний переход', 'Түс: әр бағыттың соңғы өткелі бар', 'Midday: every route ends at a crossing'],
    body: ['В районной ленте Серик отмечает два адреса: тёмный участок у дома и переход возле школы. «Доехать — полдела. Последние двести метров человек проходит сам». В штаб несут его блокнот.', 'Аудан хабарларында Серік екі мекенжайды белгіледі: үй жанындағы қараңғы жер және мектеп өткелі. «Жету — істің жартысы. Соңғы екі жүз метрді адам өзі жүреді». Оның дәптерін штабқа әкеліп жатыр.', 'In the district feed, Serik marks two addresses: an unlit stretch near home and a school crossing. “Getting a ride is half the journey. People walk the last two hundred metres themselves.” His notebook is on its way to headquarters.'],
  },
  {
    channel: 'map', districtId: 'nura', time: '12:50',
    title: ['Под улицами — ещё одна карта', 'Көшелердің астында тағы бір карта бар', 'There is another map beneath the streets'],
    body: ['Алия накладывает на карту Нуры схему тепла, воды и обращений. «Школа, поликлиника, освещённый двор — всё зависит от обычных сетей. Последнее решение должно связать обещания в работающий план».', 'Әлия Нұра картасына жылу, су және өтініштер сызбасын қосты. «Мектеп, емхана, жарық аула — бәрі қарапайым желілерге тәуелді. Соңғы шешім уәделерді жұмыс істейтін жоспарға біріктіруі керек».', 'Aliya overlays heating, water and resident requests on the Nura map. “Schools, clinics and well-lit yards all depend on ordinary networks. The final decision must connect our promises into a workable plan.”'],
  },
];

const beatResponses = {
  M7: ['После новости о школе в Нуре жители Сарыарки спрашивают, будет ли следующий шаг об их детях и воздухе.', 'Нұра мектебі туралы хабардан кейін Сарыарқа тұрғындары келесі қадам балалары мен ауасы туралы бола ма деп сұрады.', 'After hearing about Nura’s school plan, Saryarka residents ask whether the next step will concern their children and their air.'],
  M8: ['Решение о поликлинике уже обсуждают: лечить важно, но жители хотят говорить и о причинах плохого самочувствия.', 'Емхана шешімі талқыланып жатыр: емдеу маңызды, бірақ тұрғындар сырқаттың себептері туралы да сөйлескісі келеді.', 'People are discussing the clinic decision: treatment matters, but residents also want to discuss what makes them unwell.'],
  M9: ['Новость о спортивных дворах встретили надеждой. Теперь спрашивают, каким воздухом будут дышать дети на улице.', 'Спорт аулалары туралы хабар үміт тудырды. Енді балалар далада қандай ауамен тыныстайды деп сұрап жатыр.', 'The sports-space decision brought hope. The next question is what children will breathe while playing outside.'],
  M4: ['Марат слышал о парке: «Сначала сделаем так, чтобы люди могли до него доехать».', 'Марат саябақ туралы естіді: «Алдымен адамдар оған жете алатын болсын».', 'Marat heard about the park: “Let us also make it possible for people to get there.”'],
  M5: ['В машине обсуждают чистое топливо. Марат напоминает: поездки и время в пробках тоже часть повседневной жизни.', 'Көлікте таза отын талқылануда. Марат сапарлар мен кептелісте кеткен уақыт та күнделікті өмірдің бөлігі екенін еске салды.', 'The car is discussing cleaner fuel. Marat reminds everyone that daily travel and time in traffic also shape life in the city.'],
  M6: ['После решения об озеленении всего города пассажиры спрашивают, может ли транспортный план тоже охватить все районы.', 'Бүкіл қаланы көгалдандыру шешімінен кейін жолаушылар көлік жоспары да барлық ауданды қамти ала ма деп сұрады.', 'After the citywide greening decision, passengers ask whether the transport plan can reach every district too.'],
  M1: ['Водители спорят о будущих автобусных полосах. Серик просит добавить к этому разговору путь пешехода до остановки.', 'Жүргізушілер болашақ автобус жолақтары туралы дауласып жатыр. Серік аялдамаға дейінгі жаяу жолды да талқылауды сұрады.', 'Drivers debate the proposed bus lanes. Serik asks them to include the pedestrian route to the bus stop.'],
  M2: ['Объявление об умных светофорах заметили во всех районах. Серик спрашивает, кто теперь займётся тёмным двором.', 'Ақылды бағдаршамдар хабарын барлық аудан байқады. Серік енді қараңғы ауланы кім қолға алады деп сұрады.', 'The adaptive-light announcement reached every district. Serik asks who will now address the unlit courtyard.'],
  M3: ['LRT стал самой обсуждаемой строкой транспортного плана. Серик смотрит на остаток бюджета: «А на путь домой ещё хватит?»', 'LRT көлік жоспарының ең көп талқыланған тармағына айналды. Серік бюджет қалдығына қарап: «Үйге қайтатын жолға әлі жете ме?» дейді.', 'LRT has become the transport plan’s most debated item. Serik looks at the remaining budget: “Will there still be enough for the walk home?”'],
  M10: ['После решения об освещении и камерах Алия спрашивает, как жители сообщат о поломке и узнают о ремонте.', 'Жарық пен камералар шешімінен кейін Әлия тұрғындар ақауды қалай хабарлап, жөндеу туралы қалай білетінін сұрады.', 'After the lighting-and-camera decision, Aliya asks how residents will report a fault and learn when it is repaired.'],
  M11: ['В плане появились безопасные переходы. Алия напоминает, что удобный город должен ещё и вовремя отвечать на обращения.', 'Жоспарға қауіпсіз өткелдер кірді. Әлия жайлы қала өтініштерге де дер кезінде жауап беруі керегін еске салды.', 'Safe crossings are now in the plan. Aliya reminds you that a comfortable city must also answer residents’ requests on time.'],
};

export function getCityBeat(step, story = {}, language = 'ru') {
  if (!validStep(step)) return null;
  const beat = beats[step];
  const previous = storyDecisions(Array.isArray(story?.choices) ? story.choices.slice(0, step) : []);
  const response = beatResponses[previous.at(-1)?.initiativeId];
  return {
    channel: beat.channel, title: local(beat.title, language),
    body: [local(beat.body, language), response ? local(response, language) : ''].filter(Boolean).join(' '),
    speaker: getStory(language)[step].name, districtId: beat.districtId, time: beat.time,
  };
}

export function getEventFeed(story = {}, language = 'ru') {
  const visible = getVisibleDecisions(story);
  return visible.map((decision, step) => {
    const scene = getTransition(step, story.choices.slice(0, step + 1), language);
    return { time: scene.time, text: scene.lines[0], categoryId: decision.categoryId, initiativeId: decision.initiativeId, districtId: decision.districtId };
  });
}

const genericReactions = {
  social: ['Семьи обсуждают утверждённый проект и ждут понятного графика подготовки. Решение принято; новые места и услуги появятся после реализации.', 'Отбасылар бекітілген жобаны талқылап, түсінікті дайындық кестесін күтуде. Шешім қабылданды; жаңа орындар мен қызметтер іске асқаннан кейін пайда болады.', 'Families discuss the approved project and ask for a clear preparation schedule. The decision is made; new places and services will follow implementation.'],
  green: ['Жители передают штабу адреса и наблюдения. Экологическая мера вошла в план, но сегодняшние условия ещё не изменились.', 'Тұрғындар штабқа мекенжайлар мен бақылауларын беруде. Экологиялық шара жоспарға кірді, бірақ бүгінгі жағдай әлі өзгерген жоқ.', 'Residents send addresses and observations to headquarters. The environmental measure is in the plan, but today’s conditions have not changed yet.'],
  transport: ['Пассажиры и водители обсуждают будущие маршруты. Они ждут схемы запуска и ответа о том, как пройдут подготовительные работы.', 'Жолаушылар мен жүргізушілер болашақ бағыттарды талқылауда. Олар іске қосу сызбасын және дайындық жұмыстары қалай өтетінін күтеді.', 'Passengers and drivers discuss future routes. They want an implementation plan and an explanation of the preparation works.'],
  safety: ['Жители отмечают опасные места на карте и просят назвать очередь работ. Принятый план ещё предстоит реализовать.', 'Тұрғындар картада қауіпті жерлерді белгілеп, жұмыс кезегін атауды сұрайды. Қабылданған жоспар әлі іске асырылуы керек.', 'Residents mark unsafe locations on the map and ask for the order of works. The approved plan still has to be implemented.'],
  services: ['Операторы записывают вопросы жителей: кто отвечает, что будет сделано и когда придёт следующий отчёт.', 'Операторлар тұрғындар сұрағын жазуда: кім жауапты, не істеледі және келесі есеп қашан келеді.', 'Operators record residents’ questions: who is responsible, what will be done and when the next report will arrive.'],
};

export function getConsequences(data, evaluation, initiativeId, language = 'ru') {
  const decision = Array.isArray(evaluation?.decisions) ? evaluation.decisions.find(item => item.initiativeId === initiativeId) : null;
  const contribution = Array.isArray(evaluation?.contributions) ? evaluation.contributions.find(item => item.initiativeId === initiativeId) : null;
  if (!decision || !contribution || !contribution.effects || !finite(decision.lag)) return null;
  const indicators = new Map((data?.indicators || []).map(item => [item.id, item]));
  const changes = Object.entries(contribution.effects).filter(([id, value]) => indicators.has(id) && finite(value))
    .map(([indicatorId, delta]) => ({ indicatorId, indicatorName: tr(indicators.get(indicatorId).name, language), delta }));
  const districtIds = decision.scope === 'city'
    ? (evaluation.districts || []).map(item => item.id)
    : typeof decision.districtId === 'string' ? [decision.districtId] : [];
  if (!districtIds.length) return null;
  const route = [];
  let scene = null;
  for (const [step, meeting] of getStory(language).entries()) {
    const index = meeting.choices.findIndex(choice => evaluation.decisions.some(item => item.initiativeId === choice.initiativeId && item.districtId === choice.districtId));
    if (index < 0) break;
    route.push(index);
    if (meeting.choices[index].initiativeId === initiativeId) { scene = getTransition(step, route, language, data); break; }
  }
  return {
    initiativeId, categoryId: decision.categoryId, title: tr(decision.title, language), districtIds, lag: decision.lag, changes,
    reaction: scene?.lines[0] || local(genericReactions[decision.categoryId] || genericReactions.services, language),
  };
}

/** Final prose cites evaluated values. It does not rerun the model or turn an
 * individual contribution into a whole-plan district/score improvement.
 */
export function getFinalSummary(data, evaluation, story = {}, language = 'ru') {
  const style = classifyEnding(evaluation, data.initiatives, language);
  const number = new Intl.NumberFormat({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }[languageId(language)], { maximumFractionDigits: 2 });
  const format = value => number.format(value);
  const signed = value => `${value > 0 ? '+' : ''}${format(value)}`;
  const achievements = evaluation.metrics.filter(metric => finite(metric.delta) && metric.delta > 0 && finite(metric.before) && finite(metric.after))
    .slice().sort((left, right) => right.delta - left.delta || left.id.localeCompare(right.id)).slice(0, 3)
    .map(metric => ({ label: tr(metric.name, language), detail: dramaText('metricChange', language, { before: format(metric.before), after: format(metric.after), delta: signed(metric.delta) }) }));
  const indicators = new Map(data.indicators.map(item => [item.id, item]));
  const lowest = (evaluation.districts || []).flatMap(district => Object.entries(district.metrics || {})
    .filter(([id, value]) => indicators.has(id) && finite(value))
    .map(([id, value]) => ({ district, id, value })))
    .sort((left, right) => left.value - right.value || left.district.id.localeCompare(right.district.id) || left.id.localeCompare(right.id));
  const problems = lowest.slice(0, 2).map(item => ({
    label: `${tr(item.district.name, language)} · ${tr(indicators.get(item.id).name, language)}`,
    detail: dramaText(item.value < 40 ? 'criticalProblem' : 'remainingProblem', language, { value: format(item.value) }),
  }));
  const selected = new Set(evaluation.decisions.map(item => item.initiativeId));
  for (const measure of data.initiatives.filter(item => !selected.has(item.id))) {
    if (problems.length === 2) break;
    problems.push({ label: tr(measure.title, language), detail: dramaText('unfunded', language) });
  }
  for (const key of ['delivery', 'accountability']) {
    if (problems.length === 2) break;
    problems.push({ label: dramaText(key, language), detail: dramaText(`${key}Detail`, language) });
  }
  const vars = { spent: format(evaluation.spent), budget: format(evaluation.budget), remaining: format(evaluation.remaining), score: format(evaluation.score), delta: signed(evaluation.delta) };
  const address = ['addressBudget', 'addressForecast', 'addressDuty'].map(key => dramaText(key, language, vars));
  return { address, achievements, problems, style };
}

/** Escape first, then insert only a fixed mark element around known words.
 * Neither dialogue nor imported text may introduce HTML into the renderer.
 */
export function highlightDialogue(text, language = 'ru') {
  const escaped = String(text ?? '').replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]);
  const terms = local([
    'бюджет|школ[а-яё]*|поликлиник[а-яё]*|безопасност[а-яё]*|воздух[а-яё]*|решени[а-яё]*|срок[а-яё]*|Нура|Сарыарк[а-яё]*|Алматы|100',
    'бюджет[а-яёәіңғүұқөһ]*|мектеп[а-яёәіңғүұқөһ]*|емхана[а-яёәіңғүұқөһ]*|қауіпсіз[а-яёәіңғүұқөһ]*|ауа|шешім[а-яёәіңғүұқөһ]*|мерзім[а-яёәіңғүұқөһ]*|Нұра|Сарыарқа|Алматы|100',
    'budget|schools?|clinics?|safety|air|decisions?|deadlines?|Nura|Saryarka|Almaty|100',
  ], language);
  return escaped.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms})(?![\\p{L}\\p{N}_])`, 'giu'), value => `<mark>${value}</mark>`);
}
