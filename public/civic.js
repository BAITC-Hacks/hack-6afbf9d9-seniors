import { getVisibleDecisions } from './drama.js';
import { translate } from './i18n.js';

// Narrative interpretation only: no values are accumulated or written back to
// the model. Replays must provide the server evaluation for their visible prefix.
const text = {
  reputation: ['Репутация штаба', 'Штаб беделі', 'Headquarters reputation'],
  notice: ['Условные сюжетные индексы — не опрос жителей и не Score. На расчёт города они не влияют.', 'Шартты оқиғалық индекстер — тұрғындар сауалнамасы да, Score да емес. Қала есебіне әсер етпейді.', 'Illustrative story indices, not a resident survey or Score. They do not affect the city calculation.'],
  rules: ['Как считаются индексы', 'Индекстер қалай есептеледі', 'How the indices are calculated'],
  rounding: ['Каждый индекс начинается с 50, округляется до целого и ограничивается диапазоном 0–100. Δ — изменение в серверном прогнозе. Это единые условные правила симулятора.', 'Әр индекс 50-ден басталады, бүтін санға дөңгелектеніп, 0–100 аралығымен шектеледі. Δ — сервер болжамындағы өзгеріс. Бұл — симулятордың бірыңғай шартты ережелері.', 'Each index starts at 50, is rounded to an integer and limited to 0–100. Δ means the change in the server forecast. These are fixed illustrative simulator rules.'],
  pending: ['Ожидается расчёт текущего эпизода.', 'Ағымдағы көрініс есебі күтілуде.', 'Waiting for the current episode’s evaluation.'],
  mapLegend: ['Состояние районов', 'Аудандар жағдайы', 'District conditions'],
  mapCritical: ['Есть показатель ниже 40', '40-тан төмен көрсеткіш бар', 'An indicator is below 40'],
  mapImproving: ['Оценка района выросла', 'Аудан бағасы өсті', 'District score improved'],
  mapStable: ['Без роста оценки', 'Баға өскен жоқ', 'No score improvement'],
  mapCategories: ['Направления выбранных мер', 'Таңдалған шаралар бағыттары', 'Areas covered by selected measures'],
  trust: ['Доверие жителей', 'Тұрғындар сенімі', 'Resident trust'],
  business: ['Поддержка бизнеса', 'Бизнес қолдауы', 'Business support'],
  environment: ['Экологическая репутация', 'Экологиялық бедел', 'Environmental reputation'],
  efficiency: ['Эффективность', 'Тиімділік', 'Efficiency'],
  trustRule: ['50 + 2×Δ соцсферы + 2×Δ безопасности + Δ сервисов + 2×(критических показателей до − после).', '50 + 2×Δ әлеуметтік сала + 2×Δ қауіпсіздік + Δ қызметтер + 2×(бұрынғы − кейінгі сыни көрсеткіштер).', '50 + 2×Δ social infrastructure + 2×Δ safety + Δ services + 2×(critical indicators before − after).'],
  businessRule: ['50 + 3×Δ транспорта + 2×Δ сервисов.', '50 + 3×Δ көлік + 2×Δ қызметтер.', '50 + 3×Δ transport + 2×Δ services.'],
  environmentRule: ['50 + 5×Δ экологии.', '50 + 5×Δ экология.', '50 + 5×Δ environment.'],
  efficiencyRule: ['50 + 2×сумма Δ пяти направлений + 2×число мер с лагом 1 − 2×число мер с лагом 3 или 4 квартала.', '50 + 2×бес бағыттың Δ қосындысы + 2×1 тоқсандық шаралар саны − 2×3 не 4 тоқсандық шаралар саны.', '50 + 2×sum of the five category changes + 2×measures starting after 1 quarter − 2×measures starting after 3 or 4 quarters.'],
  achievements: ['Достижения этого дня', 'Осы күннің жетістіктері', 'This day’s achievements'],
  achievementNotice: ['Отметки за выполненные условия. Они не добавляют бюджет или баллы Score.', 'Орындалған шарттарға берілетін белгілер. Олар бюджет не Score ұпайларын қоспайды.', 'Milestones for meeting stated conditions. They add neither budget nor Score points.'],
  earned: ['Получено', 'Алынды', 'Earned'],
  locked: ['Условие не выполнено', 'Шарт орындалмады', 'Condition not met'],
  voices: ['Голос районов', 'Аудандар үні', 'Voice of the districts'],
  voicesDetail: ['Утверждённые меры охватывают не менее трёх районов. Общегородская мера охватывает все пять.', 'Бекітілген шаралар кемінде үш ауданды қамтиды. Жалпықалалық шара бес ауданның бәрін қамтиды.', 'Approved measures cover at least three districts. A citywide measure covers all five.'],
  exact: ['Ни одного лишнего тенге', 'Бір теңге де артық емес', 'Not one extra tenge'],
  exactDetail: ['Пять решений используют ровно {budget} условных единиц, без превышения. Название образное: бюджет симулятора не выражен в реальных тенге.', 'Бес шешім дәл {budget} шартты бірлікті артық шығынсыз пайдаланады. Атауы бейнелі: симулятор бюджеті нақты теңгемен берілмейді.', 'Five decisions use exactly {budget} virtual units without overspending. The title is figurative: the simulator budget is not denominated in real tenge.'],
  green: ['Зелёный курс', 'Жасыл бағыт', 'A greener direction'],
  greenDetail: ['Выбрана экологическая мера, а прирост направления «Экология» в прогнозе — не менее 0,9 пункта.', 'Экологиялық шара таңдалып, болжамдағы экология өсімі кемінде 0,9 ұпайға жетеді.', 'Choose an environmental measure and reach at least a 0.9-point forecast improvement in the environment category.'],
  people: ['Сначала люди', 'Алдымен адамдар', 'People first'],
  peopleDetail: ['Школа или поликлиника профинансирована в Нуре; оценка Нуры в прогнозе выросла минимум на 2 пункта.', 'Нұрада мектеп не емхана қаржыландырылып, аудан бағасы болжамда кемінде 2 ұпайға өсті.', 'Fund a school or clinic in Nura, with at least a 2-point forecast improvement in Nura’s district score.'],
  day: ['Аким за пять часов', 'Бес сағаттағы әкім', 'Akim in five hours'],
  dayDetail: ['Завершить день с пятью проверенными сервером решениями в пределах общего бюджета.', 'Күнді жалпы бюджет шегіндегі сервер тексерген бес шешіммен аяқтау.', 'Finish the day with five server-validated decisions within the total budget.'],
  profile: ['Портрет руководителя', 'Басшы бейнесі', 'Your leadership profile'],
  profileNote: ['Сюжетное описание выбранного подхода. Оно дополняет финал и не меняет его расчёт.', 'Таңдалған тәсілдің оқиғалық сипаттамасы. Ол қорытындыны толықтырады, есебін өзгертпейді.', 'A narrative description of your approach. It adds context to the ending without changing its calculation.'],
  profileSocial: ['Руководитель социальной повестки', 'Әлеуметтік бағыттағы басшы', 'A leader for social needs'],
  profileSocialBody: ['Школа или медицина вошла в план, а социальные расходы стали одними из самых крупных. Вы начали с повседневной жизни семей; теперь нужно объяснить очередь остальных задач.', 'Мектеп не медицина жоспарға кіріп, әлеуметтік шығындар ең үлкен бағыттардың біріне айналды. Отбасылардың күнделікті өмірінен бастадыңыз; енді қалған міндеттердің кезегін түсіндіру қажет.', 'Schools or healthcare entered the plan, and social spending became one of the largest priorities. You began with families’ daily lives; the remaining tasks still need a clear place in the queue.'],
  profileGreen: ['Защитник городского воздуха', 'Қала ауасының қорғаушысы', 'A champion of the city’s environment'],
  profileGreenBody: ['Экологический прогноз заметно вырос, а озеленение или чистое топливо стало одним из приоритетов. Обещание длиннее сегодняшнего дня: жители будут ждать подготовки и запуска.', 'Экологиялық болжам елеулі өсіп, көгалдандыру не таза отын басымдықтардың біріне айналды. Уәде бүгінгі күннен ұзақ: тұрғындар дайындық пен іске қосуды күтеді.', 'The environmental forecast improved, with greening or cleaner fuel becoming a priority. The promise extends beyond today: residents will be watching preparation and implementation.'],
  profileCrisis: ['Руководитель в условиях дефицита', 'Тапшылық жағдайындағы басшы', 'A leader under pressure'],
  profileCrisisBody: ['Осталось не более пяти единиц бюджета, а критические показатели ещё есть. Вы распределили почти все средства; следующий шаг — объяснить ограничения и сравнить замены мер.', 'Бюджетте бес бірліктен артық қалмады, ал сыни көрсеткіштер әлі бар. Қаражаттың көбін бөлдіңіз; келесі қадам — шектеулерді түсіндіріп, шараларды ауыстыруды салыстыру.', 'At most five budget units remain and some indicators are still critical. Almost all funding is committed; the next step is to explain the limits and compare possible replacements.'],
  profileReformer: ['Системный реформатор', 'Жүйелі реформатор', 'A system reformer'],
  profileReformerBody: ['Вы выбрали несколько общегородских мер или проектов с длительной подготовкой. Прогноз растёт, но такой подход требует координации и терпения жителей.', 'Бірнеше жалпықалалық шараны не ұзақ дайындықты жобаны таңдадыңыз. Болжам өседі, бірақ бұл тәсіл үйлестіру мен тұрғындар шыдамын қажет етеді.', 'You chose several citywide measures or projects requiring longer preparation. The forecast improves, but this approach calls for coordination and residents’ patience.'],
  profileBalanced: ['Координатор разных интересов', 'Әртүрлі мүдделерді үйлестіруші', 'A coordinator of different needs'],
  profileBalancedBody: ['План сочетает несколько направлений без одного определяющего приоритета. Ваша задача — удержать связь между решениями и не потерять слабые районы.', 'Жоспар бірнеше бағытты бір басымдықсыз біріктіреді. Міндетіңіз — шешімдер арасындағы байланысты сақтап, әлсіз аудандарды ұмытпау.', 'The plan combines several areas without a single defining priority. Your task is to keep the decisions connected and the weaker districts in view.'],
  winners: ['Какие районы выигрывают по прогнозу', 'Болжам бойынша қай аудандар ұтады', 'Which districts benefit in the forecast'],
  winnerDetail: ['Оценка района: {before} → {after} ({delta}). Это совокупный результат плана.', 'Аудан бағасы: {before} → {after} ({delta}). Бұл — бүкіл жоспар нәтижесі.', 'District score: {before} → {after} ({delta}). This is the combined result of the plan.'],
  noWinners: ['Положительного изменения районных оценок пока нет.', 'Аудан бағаларында әзірге оң өзгеріс жоқ.', 'No district score has improved yet.'],
  tradeoffs: ['Компромиссы, о которых стоит сказать', 'Айтылуы тиіс ымыралар', 'Trade-offs worth explaining'],
  crossing: ['Переходы и скорость движения', 'Өткелдер және қозғалыс жылдамдығы', 'Crossings and traffic flow'],
  crossingDetail: ['Мера безопасных переходов даёт T1 {delta} в {district}. Это её отдельный вклад; общий план может компенсировать снижение другими мерами.', 'Қауіпсіз өткелдер шарасы {district} ауданында T1 {delta} береді. Бұл — оның жеке үлесі; жалпы жоспар төмендеуді басқа шаралармен өтей алады.', 'The safer-crossings measure contributes T1 {delta} in {district}. This is its individual contribution; other measures may offset the decline in the whole plan.'],
  waiting: ['Результат потребует времени', 'Нәтижеге уақыт қажет', 'Results will take time'],
  waitingDetail: ['Мер с запуском через 3–4 квартала: {count}. Сегодня принят план; запуск ещё впереди.', '3–4 тоқсаннан кейін іске қосылатын шаралар: {count}. Бүгін жоспар қабылданды; іске қосылуы әлі алда.', 'Measures starting after 3–4 quarters: {count}. Today approved the plan; implementation is still ahead.'],
  unmet: ['Потребность без прямого улучшения', 'Тікелей жақсармаған қажеттілік', 'A need without direct improvement'],
  unmetDetail: ['{district}: {indicator} остаётся на уровне {value}/100. Для этого показателя выбранный план не дал положительного изменения.', '{district}: {indicator} {value}/100 деңгейінде қалды. Таңдалған жоспар бұл көрсеткішке оң өзгеріс берген жоқ.', '{district}: {indicator} remains at {value}/100. The selected plan did not give this indicator a positive change.'],
  reviewNeeds: ['Следующая проверка потребностей', 'Қажеттіліктерді қайта тексеру', 'The next needs review'],
  reviewNeedsDetail: ['Даже выросшие показатели требуют наблюдения. Штабу предстоит проверить сроки и выслушать тех, кому выбранных мер недостаточно.', 'Өскен көрсеткіштердің өзін бақылау қажет. Штаб мерзімдерді тексеріп, шаралар жеткіліксіз болған адамдарды тыңдауы керек.', 'Even improved indicators need follow-up. Headquarters must check delivery dates and hear from people whose needs the selected measures do not fully meet.'],
};
const lang = language => ['ru', 'kk', 'en'].includes(language) ? language : 'ru';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const local = (key, language) => Object.hasOwn(text, key) ? text[key][{ ru: 0, kk: 1, en: 2 }[lang(language)]] : String(key);
export function civicText(key, language = 'ru', vars = {}) {
  return local(key, language).replace(/\{(\w+)\}/g, (placeholder, key) => Object.hasOwn(vars, key) ? String(vars[key]) : placeholder);
}

function facts(data, evaluation, story) {
  const visible = getVisibleDecisions(story);
  const decisions = evaluation?.decisions;
  const key = decision => `${decision.initiativeId}:${decision.districtId ?? 'city'}`;
  const expected = new Set(visible.map(key));
  if (!Array.isArray(decisions) || decisions.length !== visible.length || new Set(decisions.map(key)).size !== visible.length || decisions.some(decision => !expected.has(key(decision)))) return null;
  const metrics = Object.fromEntries((evaluation.metrics || []).filter(item => ['social', 'transport', 'green', 'safety', 'services'].includes(item.id)).map(item => [item.id, item.delta]));
  if (!['social', 'transport', 'green', 'safety', 'services'].every(id => finite(metrics[id]))
      || !['budget', 'spent', 'remaining', 'criticalCount'].every(id => finite(evaluation[id]))) return null;
  const beforeCritical = evaluation.baselineCriticalCount ?? data?.baseline?.criticalCount;
  if (!finite(beforeCritical)) return null;
  const catalogue = new Map((data?.initiatives || []).map(item => [item.id, item]));
  if (decisions.some(item => !catalogue.has(item.initiativeId) || !finite(item.cost) || !finite(item.lag))) return null;
  const targeted = new Set();
  for (const decision of decisions) {
    if (decision.scope === 'city') for (const district of data.districts) targeted.add(district.id);
    else if (data.districts.some(district => district.id === decision.districtId)) targeted.add(decision.districtId);
  }
  const spending = {};
  for (const decision of decisions) spending[decision.categoryId] = (spending[decision.categoryId] || 0) + decision.cost;
  return { decisions, metrics, targeted, spending, beforeCritical,
    fast: decisions.filter(item => item.lag === 1).length,
    slow: decisions.filter(item => item.lag === 3 || item.lag === 4).length,
    complete: decisions.length === 5 && evaluation.spent <= evaluation.budget,
  };
}

export function getReputation(data, evaluation, story, language = 'ru') {
  const current = facts(data, evaluation, story);
  const values = current ? {
    trust: 50 + 2 * current.metrics.social + 2 * current.metrics.safety + current.metrics.services + 2 * (current.beforeCritical - evaluation.criticalCount),
    business: 50 + 3 * current.metrics.transport + 2 * current.metrics.services,
    environment: 50 + 5 * current.metrics.green,
    efficiency: 50 + 2 * Object.values(current.metrics).reduce((sum, delta) => sum + delta, 0) + 2 * current.fast - 2 * current.slow,
  } : null;
  return { ready: !!current, notice: civicText('notice', language), rulesTitle: civicText('rules', language),
    items: ['trust', 'business', 'environment', 'efficiency'].map(id => ({ id, label: civicText(id, language),
      value: values ? Math.max(0, Math.min(100, Math.round(values[id]))) : null, rule: civicText(`${id}Rule`, language) })),
  };
}

export function getAchievements(data, evaluation, story, language = 'ru') {
  const current = facts(data, evaluation, story);
  const nura = evaluation?.districts?.find(district => district.id === 'nura');
  const earned = {
    voices: !!current && current.targeted.size >= 3,
    exact: !!current?.complete && evaluation.spent === evaluation.budget,
    green: !!current && current.decisions.some(item => item.categoryId === 'green') && current.metrics.green >= 0.9,
    people: !!current && current.decisions.some(item => ['M7', 'M8'].includes(item.initiativeId) && item.districtId === 'nura') && finite(nura?.delta) && nura.delta >= 2,
    day: !!current?.complete,
  };
  return ['voices', 'exact', 'green', 'people', 'day'].map(id => ({ id, label: civicText(id, language),
    detail: civicText(`${id}Detail`, language, { budget: data.budget }), earned: earned[id] }));
}

export function getCivicFinale(data, evaluation, story, language = 'ru') {
  const current = facts(data, evaluation, story);
  const reputation = getReputation(data, evaluation, story, language);
  const achievements = getAchievements(data, evaluation, story, language);
  if (!current?.complete) return { profile: { id: 'pending', title: civicText('profile', language), body: civicText('pending', language) }, winners: [], tradeoffs: [], achievements, reputation };
  const number = new Intl.NumberFormat({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }[lang(language)], { maximumFractionDigits: 2 });
  const num = value => number.format(value);
  const signed = value => `${value > 0 ? '+' : ''}${num(value)}`;
  const tr = value => translate(value, lang(language));
  const winners = (evaluation.districts || []).filter(item => finite(item.delta) && item.delta > 0 && finite(item.before) && finite(item.after))
    .slice().sort((left, right) => right.delta - left.delta || left.id.localeCompare(right.id))
    .map(district => ({ districtId: district.id, label: tr(district.name), delta: district.delta,
      detail: civicText('winnerDetail', language, { before: num(district.before), after: num(district.after), delta: signed(district.delta) }) }));
  const tradeoffs = [];
  const crossing = current.decisions.find(item => item.initiativeId === 'M11');
  const crossingEffect = evaluation.contributions?.find(item => item.initiativeId === 'M11')?.effects?.T1;
  if (crossing && finite(crossingEffect) && crossingEffect < 0) tradeoffs.push({ id: 'crossing', label: civicText('crossing', language),
    detail: civicText('crossingDetail', language, { delta: signed(crossingEffect), district: tr(data.districts.find(item => item.id === crossing.districtId)?.name || crossing.districtId) }) });
  if (current.slow) tradeoffs.push({ id: 'waiting', label: civicText('waiting', language), detail: civicText('waitingDetail', language, { count: current.slow }) });
  const indicatorNames = new Map(data.indicators.map(item => [item.id, item.name]));
  const unmet = (evaluation.districts || []).flatMap(district => Object.entries(district.metrics || {})
    .filter(([id, value]) => indicatorNames.has(id) && finite(value) && finite(district.baselineMetrics?.[id]) && value <= district.baselineMetrics[id])
    .map(([id, value]) => ({ district, id, value })))
    .sort((left, right) => left.value - right.value || left.district.id.localeCompare(right.district.id))[0];
  if (unmet) tradeoffs.push({ id: 'unmet', label: civicText('unmet', language), detail: civicText('unmetDetail', language,
    { district: tr(unmet.district.name), indicator: tr(indicatorNames.get(unmet.id)), value: num(unmet.value) }) });
  if (!tradeoffs.length) tradeoffs.push({ id: 'reviewNeeds', label: civicText('reviewNeeds', language), detail: civicText('reviewNeedsDetail', language) });
  let id;
  if (evaluation.remaining <= 5 && evaluation.criticalCount > 0) id = 'crisis';
  else if (current.decisions.some(item => ['M7', 'M8'].includes(item.initiativeId)) && (current.spending.social || 0) >= Math.max(...Object.values(current.spending))) id = 'social';
  else if (current.metrics.green >= 1.5 || (current.metrics.green >= 0.9 && (current.spending.green || 0) >= Math.max(...Object.values(current.spending)))) id = 'green';
  else if (finite(evaluation.delta) && evaluation.delta > 0 && (current.slow >= 2 || current.decisions.filter(item => item.scope === 'city').length >= 2)) id = 'reformer';
  else id = 'balanced';
  const profileKey = id[0].toUpperCase() + id.slice(1);
  return { profile: { id, title: civicText(`profile${profileKey}`, language), body: civicText(`profile${profileKey}Body`, language) }, winners, tradeoffs, achievements, reputation };
}
