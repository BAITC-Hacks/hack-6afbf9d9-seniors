import { getStory } from './story.js';

// These are observations and commitments, never a second simulation model.
// The API still owns prices, eligibility, effects, and the two-year forecast.
const column = language => language === 'kk' ? 1 : language === 'en' ? 2 : 0;
const local = (value, language) => value?.[column(language)] || '';
const words = {
  start: ['Начать', 'Бастау', 'Start'],
  modeTitle: ['Как проживём этот день?', 'Бұл күнді қалай өткіземіз?', 'How will you spend the day?'],
  modeHint: ['Выберите историю с жителями или собственный городской эксперимент.', 'Тұрғындармен бірге оқиғаны немесе өз қалалық тәжірибеңізді таңдаңыз.', 'Choose a story with residents or your own city experiment.'],
  storyMode: ['Сюжет', 'Оқиға', 'Story'],
  freeMode: ['Свободный режим', 'Еркін режим', 'Free mode'],
  backMenu: ['Вернуться в меню', 'Мәзірге оралу', 'Back to menu'],
  storyModeHint: ['Пять часов в роли акима: расследуйте проблемы, распределяйте бюджет и отвечайте за решения.', 'Әкім рөліндегі бес сағат: мәселелерді зерттеп, бюджетті бөліп, шешімдерге жауап беріңіз.', 'Five hours as mayor: investigate problems, allocate your budget and stand behind your decisions.'],
  freeModeHint: ['Все районы и инициативы открыты. Проверяйте идеи и сравнивайте прогнозы без сюжетных ограничений.', 'Барлық аудан мен бастама қолжетімді. Идеяларды тексеріп, болжамдарды оқиғалық шектеусіз салыстырыңыз.', 'Explore every district and initiative. Test ideas and compare forecasts at your own pace.'],
  planningTitle: ['Ваш план на 100 единиц', '100 бірлікке арналған жоспарыңыз', 'Your plan for 100 units'],
  planningIntro: ['Задайте лимит для каждого направления. Он определяет, какие проекты вы готовы оплатить. Суммы можно перераспределять; цена проекта и его эффект остаются фиксированными.', 'Әр бағытқа шек белгілеңіз. Ол қандай жобаларды қаржыландыра алатыныңызды анықтайды. Қаражатты қайта бөлуге болады; жоба бағасы мен әсері өзгермейді.', 'Set a spending limit for each area. It determines which projects you can fund. You can reallocate these limits; project prices and effects remain fixed.'],
  planningApply: ['Утвердить распределение', 'Бөлуді бекіту', 'Approve allocation'],
  planningCancel: ['Отмена', 'Бас тарту', 'Cancel'],
  planningEdit: ['Распределить бюджет', 'Бюджетті бөлу', 'Allocate budget'],
  planned: ['Лимит направления', 'Бағыт шегі', 'Area limit'],
  allocated: ['Распределено', 'Бөлінді', 'Allocated'],
  reserve: ['Нераспределённый резерв', 'Бөлінбеген резерв', 'Unallocated reserve'],
  committed: ['Уже утверждено', 'Бекітілді', 'Already committed'],
  minimum: ['Минимум для завершения истории', 'Оқиғаны аяқтауға қажетті ең аз сома', 'Minimum to finish the story'],
  remaining: ['Осталось', 'Қалды', 'Remaining'],
  planInvalid: ['Нужен выполнимый план: сумма лимитов не больше 100, утверждённые проекты учтены, а для оставшихся встреч доступны решения.', 'Орындалатын жоспар керек: шектердің қосындысы 100-ден аспасын, бекітілген жобалар ескерілсін, қалған кездесулерге шешімдер қолжетімді болсын.', 'The plan must be feasible: limits total at most 100, cover approved projects and allow a decision at every remaining meeting.'],
  allocationLocked: ['Проект не помещается в лимит направления. Измените распределение бюджета или выберите другой проект.', 'Жоба бағыт шегіне сыймайды. Бюджетті қайта бөліңіз немесе басқа жобаны таңдаңыз.', 'This project exceeds its area limit. Reallocate the budget or choose another project.'],
  budgetHint: ['Лимит — это план, а не расход. Деньги списываются только после утверждения проекта по фиксированной цене. Резерв не даёт баллов. Если резерв равен нулю, сначала уменьшите другой лимит.', 'Шек — жоспар, шығын емес. Қаражат жоба бекітілгенде ғана тұрақты бағамен жұмсалады. Резерв ұпай бермейді. Резерв нөл болса, алдымен басқа шекті азайтыңыз.', 'A limit is a plan, not an expense. A project spends its fixed price only when approved. Reserves earn no score. If the reserve is zero, lower another limit first.'],
  inquiryChoose: ['Сначала разобраться', 'Алдымен зерттеу', 'Investigate first'],
  inquiryContinue: ['Перейти к решению', 'Шешімге көшу', 'Discuss the decision'],
  councilKeep: ['Сохранить план', 'Жоспарды сақтау', 'Keep the plan'],
  councilReview: ['Пересмотреть распределение', 'Бөлуді қайта қарау', 'Review the allocation'],
  approach: ['Выбранный подход', 'Таңдалған тәсіл', 'Your approach'],
  chronicle: ['То, что осталось за цифрами', 'Сандардың артындағы оқиға', 'The story behind the numbers'],
  inquiryHint: ['Сначала выберите, кого выслушать. Узнанное изменит разговор, но не потратит бюджет.', 'Алдымен кімді тыңдайтыныңызды таңдаңыз. Білгеніңіз әңгімені өзгертеді, бірақ бюджет жұмсалмайды.', 'Choose whom to hear first. What you learn changes the conversation without spending the budget.'],
  councilHint: ['Оставшиеся решения ещё впереди. Вы можете изменить лимиты, сохранив уже утверждённые проекты.', 'Алда әлі шешімдер бар. Бекітілген жобаларды сақтап, шектерді өзгерте аласыз.', 'There are still decisions ahead. You can change the limits while keeping projects already approved.'],
  presetBalanced: ['Ровный старт', 'Тең бастама', 'Even start'],
  presetSocial: ['Приоритет семьям', 'Отбасыларға басымдық', 'Families first'],
  presetGreen: ['Приоритет воздуху', 'Ауаға басымдық', 'Air first'],
  planningReset: ['Распределить по умолчанию', 'Әдепкі бойынша бөлу', 'Use the default allocation'],
  projectCosts: ['Стоимость инициатив', 'Бастамалар құны', 'Initiative costs'],
  categoryCap: ['Лимит направления', 'Бағыт шегі', 'Area limit'],
  currentPlan: ['План распределения', 'Бөлу жоспары', 'Allocation plan'],
  planning: ['Бюджетный план', 'Бюджет жоспары', 'Budget plan'],
  briefing: ['Перед встречей', 'Кездесу алдында', 'Before the meeting'],
  council: ['Совет штаба', 'Штаб кеңесі', 'Headquarters council'],
  discovery: ['Что выяснили', 'Не анықталды', 'What you learned'],
  replanFromHere: ['Перепланировать с этой встречи', 'Осы кездесуден бастап қайта жоспарлау', 'Replan from this meeting'],
  replanWarning: ['Текущее и последующие решения и выборы расследований будут отменены. Их бюджет освободится после подтверждения. Ранние решения и сохранённые отчёты останутся.', 'Ағымдағы және кейінгі шешімдер мен зерттеу таңдаулары жойылады. Олардың бюджеті растағаннан кейін босайды. Бұрынғы шешімдер мен сақталған есептер қалады.', 'This meeting’s decision and investigation choice, and all later ones, will be cleared. Their budget is released after confirmation. Earlier decisions and saved reports will remain.'],
  replanConfirm: ['Освободить бюджет и перепланировать', 'Бюджетті босатып, қайта жоспарлау', 'Release the budget and replan'],
};

export function campaignText(key, language = 'ru', vars = {}) {
  const text = Object.hasOwn(words, key) ? local(words[key], language) : String(key);
  return text.replace(/\{(\w+)\}/g, (placeholder, name) => vars && Object.hasOwn(vars, name) ? String(vars[name]) : placeholder);
}

// Every dossier contains two different sources, not a right and a wrong answer.
// The player chooses which source becomes part of their public explanation.
const dossiers = [
  {
    title: ['За дверью кабинета', 'Кабинет есігінің ар жағында', 'Outside the office door'],
    lines: [
      ['В приёмной Айгуль держит папку с заявлениями родителей. Пока готовят совещание, у вас есть время для одного короткого разговора.', 'Қабылдау бөлмесінде Айгүл ата-аналардың өтініштері бар папканы ұстап тұр. Жиналыс дайындалғанша бір қысқа әңгімеге уақыт бар.', 'Aigul waits with a folder of parents’ requests. While the meeting is prepared, there is time for one short conversation.'],
      ['Кого услышать первым: тех, кто каждый день ищет школьное место, или врача, к которому приходят те же семьи?', 'Алдымен кімді тыңдайсыз: күн сайын мектептен орын іздейтіндерді ме, әлде сол отбасылар келетін дәрігерді ме?', 'Whom will you hear first: families looking for school places, or the doctor who sees those same families?'],
    ],
    options: [
      {
        title: ['Пройти по школьному коридору', 'Мектеп дәлізімен өту', 'Walk the school corridor'],
        description: ['Айгуль покажет, как семьи подстраивают день под очередь и смены.', 'Айгүл отбасылардың кезек пен ауысымға күнін қалай бейімдейтінін көрсетеді.', 'Aigul shows how families arrange their day around queues and shifts.'],
        discoveryTitle: ['Список на обратной стороне расписания', 'Сабақ кестесінің артындағы тізім', 'A list on the back of the timetable'],
        lines: [
          ['В школьном коридоре мама складывает заявление, чтобы оно поместилось в карман куртки. «Мне не обещание нужно. Скажите, куда ребёнку идти в сентябре». Айгуль молча отдаёт ей копию списка ожидания.', 'Мектеп дәлізінде ана өтінішін күртесінің қалтасына сыятындай бүктеді. «Маған уәде емес, балам қыркүйекте қайда баратынын айтыңыз». Айгүл оған күту тізімінің көшірмесін үнсіз берді.', 'In the corridor, a mother folds her application to fit her coat pocket. “I need more than a promise. Where does my child go in September?” Aigul quietly hands her a copy of the waiting list.'],
          ['Вы отмечаете в папке: школьные места — отдельная потребность; спортивная площадка её не заменит. На встрече вы сможете прямо объяснить, почему строите школу или откладываете её ради другой помощи семьям.', 'Папкаға жазасыз: мектеп орны — бөлек қажеттілік; спорт алаңы оны алмастырмайды. Кездесуде мектепті неге салатыныңызды немесе отбасыларға басқа көмек үшін кейінге қалдыратыныңызды ашық түсіндіресіз.', 'You note that school places are a separate need; a sports space cannot replace them. In the meeting, you can explain openly why you fund the school or defer it for another kind of family support.'],
        ],
        meeting: ['«Вы видели список ожидания, — говорит Айгуль. — Какой бы проект мы ни выбрали, родителям нужен честный ответ о школе».', '«Күту тізімін көрдіңіз, — дейді Айгүл. — Қандай жобаны таңдасақ та, ата-аналарға мектеп туралы адал жауап керек».', '“You saw the waiting list,” Aigul says. “Whatever we choose, parents deserve an honest answer about the school.”'],
        reply: ['В объяснении родителям отдельно укажем, что будет со школьной очередью.', 'Ата-аналарға мектеп кезегінің жағдайын бөлек түсіндіреміз.', 'We will explain separately what this means for the school waiting list.'],
        callback: ['Айгуль передала вашу заметку о школьной очереди. Семейный день начинается задолго до урока — дорога и здоровье тоже важны.', 'Айгүл мектеп кезегі туралы жазбаңызды берді. Отбасының күні сабақтан әлдеқайда бұрын басталады — жол мен денсаулық та маңызды.', 'Aigul passed on your note about school places. A family’s day starts long before lessons; travel and health matter too.'],
        closing: ['Айгуль оставила в журнале тот самый список ожидания: после совещания у него появился ответственный, но свободных мест за день не прибавилось.', 'Айгүл журналға сол күту тізімін қалдырды: жиналыстан кейін оған жауапты адам белгіленді, бірақ бір күнде бос орын көбейген жоқ.', 'Aigul leaves the waiting list in the journal. It now has someone responsible for following up, although no school places appeared in a day.'],
        visual: 'lab',
      },
      {
        title: ['Позвонить семейному врачу', 'Отбасылық дәрігерге қоңырау шалу', 'Call the family doctor'],
        description: ['Алия объяснит, как запись к врачу связана со школой и работой родителей.', 'Әлия дәрігерге жазылудың мектеп пен ата-ананың жұмысына қалай байланысты екенін түсіндіреді.', 'Aliya explains how appointments affect school and parents’ working days.'],
        discoveryTitle: ['Пропущенный приём', 'Қалып кеткен қабылдау', 'The missed appointment'],
        lines: [
          ['Алия отвечает между приёмами. «Вчера мама ушла из очереди: пора было забирать ребёнка. Сегодня пришла снова. Это одни и те же семьи в разных городских списках».', 'Әлия қабылдау арасында жауап береді. «Кеше бір ана кезектен кетіп қалды: баласын алып кетуі керек болды. Бүгін қайта келді. Қаланың әртүрлі тізімдерінде бір отбасылар жүр».', 'Aliya answers between appointments. “Yesterday a mother left the queue to collect her child. Today she came back. The same families appear on several different city lists.”'],
          ['Ваша записка связывает образование, медицину и время родителей. Теперь разговор с Айгуль будет не только о здании школы: придётся объяснить, какую часть семейной нагрузки вы берёте на себя первой.', 'Жазбаңыз білімді, медицинаны және ата-ананың уақытын байланыстырады. Енді Айгүлмен әңгіме тек мектеп ғимараты туралы емес: отбасылардың қай қиындығын алдымен шешетініңізді түсіндіру керек.', 'Your note connects education, healthcare and parents’ time. The conversation with Aigul is now about more than a building: you must explain which burden on families comes first.'],
        ],
        meeting: ['«Алия сказала, что вы ей звонили. Я прошу школу, но знаю: мои ученики тоже ждут врача. Давайте не будем делать вид, что один проект решит всё».', '«Әлия қоңырау шалғаныңызды айтты. Мен мектеп сұраймын, бірақ оқушыларым да дәрігер күтетінін білемін. Бір жоба бәрін шешеді деп айтпайық».', '“Aliya told me you called. I am asking for a school, but my pupils wait for doctors too. Let us not pretend one project solves everything.”'],
        reply: ['Объясним семьям, какую нагрузку снимет этот проект и что останется нерешённым.', 'Бұл жоба қандай қиындықты азайтып, нені шешпейтінін отбасыларға түсіндіреміз.', 'We will explain which burden this project addresses and which needs remain.'],
        callback: ['Алия прислала запись вашего звонка о семьях, которые делят день между школой и поликлиникой. Эту связь нельзя потерять в отдельных ведомственных планах.', 'Әлия мектеп пен емхана арасында күнін бөлетін отбасылар туралы қоңырау жазбасын жіберді. Бұл байланысты бөлек мекеме жоспарларында жоғалтпау керек.', 'Aliya shared the note from your call about families juggling school and appointments. Separate departments must not lose sight of that connection.'],
        closing: ['Вечером Алия возвращается к утреннему звонку: «Спасибо, что спросили про целый день семьи, а не только про очередь у моей двери».', 'Кешке Әлия таңғы қоңырауды еске алады: «Есігімдегі кезекті ғана емес, отбасының бүкіл күнін сұрағаныңызға рақмет».', 'That evening Aliya remembers your call: “Thank you for asking about a family’s whole day, not just the queue outside my door.”'],
        visual: 'call',
      },
    ],
  },
  {
    title: ['Что скрывает серое небо', 'Сұр аспан нені жасырады', 'What the grey sky hides'],
    lines: [
      ['Дана раскладывает снимки Сарыарки. На одном дворе дети, на другом дым над частными домами. Она предлагает проверить историю за фотографией.', 'Дана Сарыарқаның суреттерін жайды. Бір аулада балалар, екіншісінде жеке үйлердің үстіндегі түтін. Ол суреттің артындағы оқиғаны тексеруді ұсынады.', 'Dana spreads out photographs of Saryarka: children in one courtyard, smoke over houses in another. She wants you to examine the story behind the pictures.'],
      ['Можно поднять архив наблюдений за воздухом или выслушать жителей домов с печным отоплением.', 'Ауа бақылауының мұрағатын ашуға немесе пешпен жылынатын үй тұрғындарын тыңдауға болады.', 'You can examine the air observation archive or hear from residents who heat their homes with stoves.'],
    ],
    options: [
      {
        title: ['Открыть карту наблюдений', 'Бақылау картасын ашу', 'Open the observation map'],
        description: ['Посмотреть, где повторяются жалобы на дым и где не хватает зелени.', 'Түтін туралы шағымдар қайда қайталанатынын және көгал қайда жетіспейтінін қарау.', 'See where smoke complaints recur and where green spaces are missing.'],
        discoveryTitle: ['Зелёная точка не закрывает дым', 'Жасыл нүкте түтінді жаппайды', 'A green dot does not erase smoke'],
        lines: [
          ['В лаборатории Дана накладывает карту зелени на сообщения о зимнем воздухе. Пустой участок подходит для парка, но отметки о дыме тянутся дальше, к жилым улицам.', 'Зертханада Дана жасыл желек картасын қысқы ауа туралы хабарларға қабаттастырды. Бос жер саябаққа лайық, бірақ түтін туралы белгілер тұрғын көшелерге дейін созылады.', 'At the laboratory, Dana overlays green spaces with winter air reports. An empty site could hold a park, but smoke reports continue beyond it into residential streets.'],
          ['«Не обещайте, что деревья заменят работу с источником дыма», — просит она. В папке появляются два разных вопроса: место для прогулки и воздух зимой.', '«Ағаштар түтін көзімен жұмысты алмастырады деп уәде бермеңіз», — дейді ол. Папкада екі бөлек сұрақ пайда болды: серуен орны және қыстағы ауа.', '“Do not promise that trees can replace work on the source of smoke,” she says. Your folder now separates a place to walk from the air people breathe in winter.'],
        ],
        meeting: ['«На карте мы разделили две задачи: зелень и зимний дым. Скажите, какую берём первой, и не будем обещать вторую в нагрузку».', '«Картада екі міндетті бөлдік: жасыл желек пен қысқы түтін. Қайсысын алдымен аламыз — екіншісін қоса шешеміз деп уәде бермейік».', '“Our map separates green space from winter smoke. Say which comes first; we should not promise the other as a free extra.”'],
        reply: ['В публичном плане разделим эффект для зелени и для воздуха.', 'Ашық жоспарда жасыл желек пен ауаға әсерді бөлек көрсетеміз.', 'The public plan will distinguish effects on green space from effects on air.'],
        callback: ['Дана показала мне вашу карту: зелёные зоны и зимний дым — разные задачи. Транспортный проект тоже нельзя продавать как лекарство от всех городских проблем.', 'Дана картаңызды көрсетті: жасыл аймақ пен қысқы түтін — бөлек міндеттер. Көлік жобасын да қаланың барлық мәселесіне ем деп көрсетуге болмайды.', 'Dana showed me your map: green spaces and winter smoke are different problems. We should not sell a transport project as a cure for everything either.'],
        closing: ['Дана сохраняет в открытой папке обе карты: одна показывает зелень, другая — сообщения о дыме. В итоговом плане эти проблемы больше не смешаны.', 'Дана ашық папкада екі картаны сақтады: бірінде жасыл желек, екіншісінде түтін туралы хабарлар. Қорытынды жоспарда бұл мәселелер енді араластырылмайды.', 'Dana keeps both maps in the public folder: green spaces on one, smoke reports on the other. The final plan no longer confuses the two problems.'],
        visual: 'map',
      },
      {
        title: ['Выслушать жителей частного сектора', 'Жеке сектор тұрғындарын тыңдау', 'Hear from stove-heated households'],
        description: ['Узнать, почему семьи не могут просто отказаться от привычного отопления.', 'Отбасылар үйреншікті жылытудан неге бірден бас тарта алмайтынын білу.', 'Understand why families cannot simply abandon their current heating.'],
        discoveryTitle: ['«Нам тоже нужен чистый воздух»', '«Бізге де таза ауа керек»', '“We want clean air too”'],
        lines: [
          ['На громкой связи житель Сарыарки говорит тихо: «Мы видим этот дым из своего окна. Но прежде чем менять отопление, нужно знать, кто поможет подключиться и не замёрзнем ли мы зимой».', 'Дауысзорайтқыштан Сарыарқа тұрғыны жай сөйлейді: «Бұл түтінді өз тереземізден көреміз. Бірақ жылытуды ауыстырмас бұрын қосылуға кім көмектесетінін және қыста тоңбайтынымызды білу керек».', 'A Saryarka resident speaks quietly on the speakerphone: “We see that smoke through our own window. Before changing the heating, we need to know who helps us connect and whether we will stay warm.”'],
          ['Вы записываете просьбу: обсуждать переход вместе с семьями. Она не меняет стоимость каталога, но меняет ваше обещание — жители должны понимать последовательность работ и ограничения выбранной меры.', 'Өтінішті жазасыз: ауысуды отбасылармен бірге талқылау. Бұл каталог бағасын өзгертпейді, бірақ уәдеңізді өзгертеді — тұрғындар жұмыс ретін және таңдалған шараның шектеулерін түсінуі керек.', 'You record a request to discuss any transition with households. It changes no catalog price, but it changes your commitment: residents need to understand the sequence of work and the limits of the chosen measure.'],
        ],
        meeting: ['«Вы услышали, почему люди осторожничают, — говорит Дана. — Чистый воздух не должен начинаться с разговора о виноватых. Объясним жителям план человеческим языком».', '«Адамдардың неге сақ екенін естідіңіз, — дейді Дана. — Таза ауа кінәлі іздеуден басталмауы керек. Жоспарды тұрғындарға түсінікті тілмен түсіндірейік».', '“You heard why people are cautious,” Dana says. “Clean air should not start with blame. Let us explain the plan in language residents can use.”'],
        reply: ['Обсудим с жителями последовательность работ и ограничения этого решения.', 'Тұрғындармен жұмыс ретін және бұл шешімнің шектеулерін талқылаймыз.', 'We will discuss the sequence of work and this decision’s limits with residents.'],
        callback: ['Жители Сарыарки рассказали о вашем звонке. Хорошо, что их спросили до обещаний: пассажиры и водители тоже хотят понимать перемены заранее.', 'Сарыарқа тұрғындары қоңырауыңыз туралы айтты. Уәде бермей тұрып сұрағаныңыз дұрыс: жолаушылар мен жүргізушілер де өзгерістерді алдын ала түсінгісі келеді.', 'Saryarka residents told me about your call. It is good to ask before making promises; passengers and drivers want to understand changes in advance too.'],
        closing: ['В чате Сарыарки жители продолжают спорить, но пересылают вашу запись о порядке работ. Разговор об отоплении теперь идёт с семьями, а не только о них.', 'Сарыарқа чатында тұрғындар әлі пікірталасып жатыр, бірақ жұмыс реті туралы жазбаңызды бөліседі. Жылыту жайлы әңгіме енді отбасылар туралы ғана емес, солармен бірге жүреді.', 'Saryarka’s chat is still debating, but residents share your note about the sequence of work. Heating is now being discussed with families, not only about them.'],
        visual: 'call',
      },
    ],
  },
  {
    title: ['Два взгляда на одну пробку', 'Бір кептеліске екі көзқарас', 'Two views of the same traffic jam'],
    lines: [
      ['Марат протягивает ключи от машины, но рядом на экране уже открыт диспетчерский журнал. Город можно увидеть из окна или через цепочку задержек.', 'Марат көліктің кілтін ұсынды, ал жанындағы экранда диспетчер журналы ашық тұр. Қаланы терезеден де, кешігулер тізбегінен де көруге болады.', 'Marat offers you his car keys, while a dispatch log is open on the screen nearby. You can see the city through a window or through a chain of delays.'],
      ['Короткой проверки хватит на один маршрут или один разговор с диспетчером.', 'Қысқа тексеріске бір бағыт немесе диспетчермен бір әңгіме сыяды.', 'There is time to check one route or speak with the dispatcher.'],
    ],
    options: [
      {
        title: ['Пройти путь пассажира', 'Жолаушы жолымен жүру', 'Follow a passenger’s journey'],
        description: ['Вместе с Маратом проверить остановку и подъезд к школе.', 'Маратпен аялдама мен мектепке кіреберісті тексеру.', 'Check a bus stop and the approach to a school with Marat.'],
        discoveryTitle: ['Место в автобусе — не вся дорога', 'Автобустағы орын — жолдың бір бөлігі', 'A seat is only part of the journey'],
        lines: [
          ['У остановки Марат показывает женщину с папкой из поликлиники. «Вот почему я не спорю с автобусом за каждого пассажира. Иногда человеку нужно просто предсказуемо добраться домой».', 'Аялдамада Марат емханадан папка алып келе жатқан әйелді көрсетті. «Сондықтан әр жолаушы үшін автобуспен таласпаймын. Кейде адамға үйіне қашан жететінін білу ғана керек».', 'At the stop, Marat points to a woman carrying a clinic folder. “That is why I do not fight the bus for every passenger. Sometimes people just need a journey they can rely on.”'],
          ['Вы отмечаете остановку и дорогу к школе на карте. Доступность транспорта — это ещё и понятный подход к нему; эту заметку позже получит Серик перед разговором о безопасности.', 'Аялдама мен мектепке баратын жолды картаға белгіледіңіз. Көлік қолжетімділігі оған түсінікті жолмен жетуді де білдіреді; бұл жазбаны қауіпсіздік туралы әңгіме алдында Серік алады.', 'You mark the stop and the school approach on the map. Access to transport includes reaching it; Serik will receive this note before the safety discussion.'],
        ],
        meeting: ['«После остановки вы понимаете, о чём я, — говорит Марат. — Обсудим не только скорость машины, но и целую поездку человека».', '«Аялдамадан кейін не айтқым келгенін түсіндіңіз, — дейді Марат. — Көлік жылдамдығын ғана емес, адамның бүкіл сапарын талқылайық».', '“After that stop, you know what I mean,” Marat says. “Let us discuss the whole journey, not just how fast a car moves.”'],
        reply: ['Свяжем объяснение проекта с маршрутом пассажира, включая путь до остановки.', 'Жобаны түсіндіргенде жолаушының аялдамаға дейінгі жолын да ескереміз.', 'We will explain the project through the passenger’s whole journey, including the walk to the stop.'],
        callback: ['Марат передал вашу карту остановки и дороги к школе. Я могу показать, где этот путь становится неудобным для человека, который идёт медленно.', 'Марат аялдама мен мектеп жолының картаңызды берді. Баяу жүретін адамға бұл жолдың қай жері қолайсыз екенін көрсете аламын.', 'Marat passed on your map of the stop and school approach. I can show where that journey becomes difficult for someone who walks slowly.'],
        closing: ['Марат прислал фотографию отмеченной остановки. Рядом появилась подпись для будущего обсуждения: «Оценивать всю поездку, а не только скорость на дороге».', 'Марат белгіленген аялдаманың суретін жіберді. Болашақ талқылауға арналған жазу қосылды: «Жолдағы жылдамдықты ғана емес, бүкіл сапарды бағалау».', 'Marat sends a photo of the marked stop. A note for the next discussion reads: “Assess the whole journey, not just speed on the road.”'],
        visual: 'map',
      },
      {
        title: ['Разобрать журнал диспетчера', 'Диспетчер журналын талдау', 'Review the dispatch log'],
        description: ['Увидеть, как задержка одного перекрёстка расходится по маршрутам.', 'Бір қиылыстың кідірісі бағыттарға қалай таралатынын көру.', 'Trace how delays at one junction spread across routes.'],
        discoveryTitle: ['Город не помещается в один перекрёсток', 'Қала бір қиылысқа сыймайды', 'A city is more than one junction'],
        lines: [
          ['Диспетчер двигает на схеме карточки маршрутов. «Вот здесь водители просят зелёный дольше. А вот здесь ждут пешеходы. Если смотреть только на одну очередь, другая исчезает лишь с нашего экрана».', 'Диспетчер сызбадағы бағыт карточкаларын жылжытты. «Мұнда жүргізушілер жасыл шамды ұзартуды сұрайды. Ал мұнда жаяу жүргіншілер күтеді. Бір кезекке ғана қарасақ, екіншісі тек экранымыздан жоғалады».', 'The dispatcher moves route cards across a diagram. “Drivers here want a longer green light. Pedestrians wait here. If we watch only one queue, the other disappears from our screen, not from the city.”'],
          ['Вы просите сохранить в протоколе оба вида ожидания. На встрече с Маратом можно будет объяснить компромисс, а позже напомнить о нём при выборе безопасных переходов.', 'Хаттамада күтудің екі түрін де сақтауды сұрайсыз. Маратпен кездесуде ымыраны түсіндіріп, кейін қауіпсіз өткелдерді таңдағанда еске салуға болады.', 'You ask the minutes to record both kinds of waiting. You can explain the trade-off to Marat and return to it when choosing safer crossings.'],
        ],
        meeting: ['«Диспетчер сказал, вы не вычеркнули пешеходов из схемы. Значит, честно обсудим и ожидание машин, и время людей на переходе».', '«Диспетчер сызбадан жаяу жүргіншілерді алып тастамағаныңызды айтты. Демек, көліктердің де, өткелдегі адамдардың да күтуін ашық талқылаймыз».', '“The dispatcher said you kept pedestrians on the diagram. Then we can discuss both the cars waiting and the people waiting to cross.”'],
        reply: ['В объяснении покажем компромисс между движением и ожиданием пешеходов.', 'Түсіндірмеде көлік қозғалысы мен жаяу жүргінші күтуінің арасындағы ымыраны көрсетеміз.', 'Our explanation will include the trade-off between traffic flow and pedestrian waiting.'],
        callback: ['Я прочитал ваш протокол с диспетчером. Спасибо, что пешеход в нём не стал помехой для машины: переход должен работать и для нас.', 'Диспетчермен хаттамаңызды оқыдым. Жаяу жүргіншіні көлікке кедергі деп көрсетпегеніңізге рақмет: өткел бізге де жұмыс істеуі керек.', 'I read your dispatch notes. Thank you for not treating a pedestrian as an obstacle to a car; the crossing must work for us too.'],
        closing: ['Диспетчер сохранил схему с двумя очередями. В обсуждении транспортного плана теперь видны и водители, и те, кто ждёт у перехода.', 'Диспетчер екі кезегі бар сызбаны сақтады. Көлік жоспарын талқылауда енді жүргізушілер де, өткелде күтетіндер де көрінеді.', 'The dispatcher saves the diagram with both queues. The transport discussion now includes drivers and people waiting at the crossing.'],
        visual: 'lab',
      },
    ],
  },
  {
    title: ['Маршрут, который не виден днём', 'Күндіз көрінбейтін бағыт', 'The route daylight hides'],
    lines: [
      ['Серик кладёт на стол сложенную карту Нуры. «Я знаю короткую дорогу. Но вечером хожу длинной». До решения вы можете понять почему.', 'Серік үстелге бүктелген Нұра картасын қойды. «Қысқа жолды білемін. Бірақ кешке ұзақ жолмен жүремін». Шешімге дейін себебін білуге болады.', 'Serik lays a folded map of Nura on the desk. “I know the short way. In the evening, I take the long one.” You can find out why before deciding.'],
      ['Он предлагает отметить свой привычный обход. В лаборатории также подготовили обращения о переходах.', 'Ол үйреншікті айналма жолын белгілеуді ұсынады. Зертханада өткелдер туралы өтініштер де дайындалған.', 'He offers to mark his usual detour. The laboratory also has requests about crossings ready to examine.'],
    ],
    options: [
      {
        title: ['Пройти маршрут на карте с Сериком', 'Серікпен картадағы бағытты қарау', 'Trace Serik’s route together'],
        description: ['Отметить тёмные участки и места, где приходится обходить двор.', 'Қараңғы учаскелер мен ауланы айналып өтетін жерлерді белгілеу.', 'Mark dark stretches and places where residents detour around a courtyard.'],
        discoveryTitle: ['Лишний поворот домой', 'Үйге баратын артық бұрылыс', 'The extra turn on the way home'],
        lines: [
          ['Серик ведёт пальцем по карте: остановка, арка, двор. У арки останавливается. «Днём всё нормально. Вечером я не вижу, кто навстречу, и ухожу к большой улице».', 'Серік картада саусағымен аялдама, арка, ауланы көрсетті. Аркаға келгенде тоқтады. «Күндіз бәрі дұрыс. Кешке қарсы келе жатқан адамды көрмей, үлкен көшеге бұрыламын».', 'Serik traces the stop, an archway and a courtyard with his finger. At the archway he pauses. “It is fine by day. At night I cannot see who is coming, so I turn towards the main road.”'],
          ['Вы сохраняете маршрут целиком. Это меняет постановку задачи: не просто поставить оборудование, а проверить, можно ли будет пройти от остановки до двери без тёмного разрыва.', 'Бағытты толық сақтайсыз. Бұл міндетті өзгертеді: жабдық қою ғана емес, аялдамадан есікке дейін қараңғы үзіліссіз жетуге болатынын тексеру.', 'You save the entire route. The question becomes more than installing equipment: can someone walk from the stop to their door without a dark gap?'],
        ],
        meeting: ['«Вы отметили весь мой путь, а не только арку, — говорит Серик. — Когда начнётся проектирование, прошу не потерять этот маршрут».', '«Тек арканы емес, бүкіл жолымды белгіледіңіз, — дейді Серік. — Жобалау басталғанда осы бағытты жоғалтпауды сұраймын».', '“You marked my whole walk, not just the archway,” Serik says. “Please keep that route in view when design starts.”'],
        reply: ['Маршрут Серика останется в материалах для проектировщиков.', 'Серіктің бағыты жобалаушыларға арналған материалдарда қалады.', 'Serik’s route will stay in the brief for designers.'],
        callback: ['Серик оставил мне карту вечернего обхода. Коммунальная служба тоже должна видеть путь жителя целиком, а не только отдельную заявку.', 'Серік маған кешкі айналма жол картасын қалдырды. Коммуналдық қызмет те жеке өтінішті ғана емес, тұрғынның бүкіл жолын көруі керек.', 'Serik left me the map of his evening detour. City services should see the resident’s whole journey, not only an isolated request.'],
        closing: ['На вечерней карте Серика по-прежнему отмечен обход. Рядом теперь лежит его маршрут для проектировщиков: конкретное напоминание, что значит «безопасно дойти домой».', 'Серіктің кешкі картасында айналма жол әлі белгіленген. Қасында енді жобалаушыларға арналған бағыты жатыр: «үйге қауіпсіз жету» нені білдіретінін нақты еске салады.', 'Serik’s evening map still shows the detour. Beside it is the route for designers, a concrete reminder of what “getting home safely” means.'],
        visual: 'map',
      },
      {
        title: ['Сверить обращения о переходах', 'Өткелдер туралы өтініштерді салыстыру', 'Check the crossing requests'],
        description: ['Сопоставить адреса жителей с подходами к школе и остановке.', 'Тұрғындардың мекенжайларын мектеп пен аялдамаға баратын жолдармен салыстыру.', 'Compare residents’ locations with school and bus stop approaches.'],
        discoveryTitle: ['Короткий зелёный для длинного шага', 'Баяу қадамға қысқа жасыл шам', 'A short green for a slow walker'],
        lines: [
          ['В обращении написано: «Переход есть, но мама не успевает». Серик ставит рядом свой адрес. «На схеме это готовый объект. Для неё — всё ещё преграда».', 'Өтініште: «Өткел бар, бірақ анам өтіп үлгермейді» деп жазылған. Серік қасына өз мекенжайын қосты. «Сызбада бұл дайын нысан. Ал оған әлі де кедергі».', 'One request reads: “There is a crossing, but my mother cannot get across in time.” Serik adds his address. “On a diagram, it is a completed facility. For her, it is still a barrier.”'],
          ['Вы просите передать замечание вместе с адресами, не сводя его к галочке о наличии перехода. На встрече речь пойдёт о доступности для медленного пешехода и компромиссе с движением машин.', 'Ескертуді өткел бар деген белгіге айналдырмай, мекенжайлармен бірге беруді сұрайсыз. Кездесуде баяу жүретін адамға қолжетімділік пен көлік қозғалысы арасындағы ымыра талқыланады.', 'You ask for the comment to travel with the addresses, rather than become a checkbox for an existing crossing. The meeting will consider slower pedestrians and the trade-off with vehicle flow.'],
        ],
        meeting: ['«Теперь вы знаете, зачем я принёс обращения, — говорит Серик. — Наличие перехода и возможность им пользоваться не всегда одно и то же».', '«Өтініштерді неге әкелгенімді енді білесіз, — дейді Серік. — Өткелдің болуы мен оны пайдалана алу әрдайым бір нәрсе емес».', '“Now you know why I brought the requests,” Serik says. “Having a crossing and being able to use it are not always the same thing.”'],
        reply: ['Передадим замечания медленно идущих жителей вместе с адресами.', 'Баяу жүретін тұрғындардың ескертулерін мекенжайлармен бірге береміз.', 'We will pass on slower residents’ comments along with the locations.'],
        callback: ['В ваших материалах есть письмо о коротком зелёном сигнале. Для службы обращений это хороший вопрос: отчитаться о закрытой заявке или проверить, стало ли решение понятным человеку?', 'Материалдарыңызда қысқа жасыл шам туралы хат бар. Өтініш қызметіне бұл жақсы сұрақ: жабылған өтінішті есепке алу ма, әлде шешімнің адамға түсінікті болғанын тексеру ме?', 'Your papers include the letter about the short green signal. It raises a useful service question: record a closed request, or check whether the person understands the response?'],
        closing: ['Серик забирает копию письма о переходе. «Теперь эта фраза не потеряется среди адресов», — говорит он. Изменение улицы ещё впереди; объяснение нужды уже записано.', 'Серік өткел туралы хаттың көшірмесін алды. «Енді бұл сөйлем мекенжайлардың арасында жоғалмайды», — дейді ол. Көшені өзгерту әлі алда; қажеттілік түсіндірмесі жазылып қойды.', 'Serik takes a copy of the crossing letter. “That sentence will not get lost among the addresses now.” The street still needs work; the need has been recorded clearly.'],
        visual: 'lab',
      },
    ],
  },
  {
    title: ['Последняя папка перед подписью', 'Қол қою алдындағы соңғы папка', 'The last folder before you sign'],
    lines: [
      ['Алия закрывает дверь штаба, чтобы стало тише. На столе две папки: состояние сетей Нуры и обращения жителей. Обе про то, как город держит слово.', 'Әлия тыныш болсын деп штаб есігін жапты. Үстелде екі папка: Нұра желілерінің жағдайы және тұрғындардың өтініштері. Екеуі де қаланың уәдесін қалай орындайтыны туралы.', 'Aliya closes the headquarters door for quiet. Two folders remain: Nura’s utility networks and residents’ requests. Both concern how the city keeps its word.'],
      ['До последнего решения вы успеете проверить один сигнал. Что важнее уточнить сейчас?', 'Соңғы шешімге дейін бір хабарды тексеруге үлгересіз. Қазір нені нақтылау маңызды?', 'There is time to follow up one signal before the final decision. What do you need to understand?'],
    ],
    options: [
      {
        title: ['Связаться с инженером Нуры', 'Нұра инженерімен байланысу', 'Call Nura’s utility engineer'],
        description: ['Разобраться, что отличает предупреждение аварий от замены старой сети.', 'Апаттың алдын алу мен ескі желіні ауыстырудың айырмасын түсіну.', 'Distinguish preparing for failures from replacing an old network.'],
        discoveryTitle: ['Труба под будущими обещаниями', 'Болашақ уәделердің астындағы құбыр', 'The pipe beneath future promises'],
        lines: [
          ['Инженер разворачивает схему: линия проходит рядом с жилыми дворами и социальными объектами. «Бригада нужна, когда случилось. Замена сети нужна, чтобы случалось реже. Одно не отменяет другое».', 'Инженер сызбаны ашты: желі тұрғын аулалар мен әлеуметтік нысандардың жанынан өтеді. «Бригада оқиға болғанда керек. Желіні ауыстыру оқиға сиреуі үшін керек. Бірі екіншісін жоймайды».', 'The engineer unfolds a diagram: a line runs past housing and public facilities. “Crews help when something breaks. Replacement aims to make breaks less frequent. One does not remove the need for the other.”'],
          ['В папке появляется понятное различие между долгой модернизацией и быстрым реагированием. На финальной встрече можно связать его с утренним обещанием семьям.', 'Папкада ұзақ жаңғырту мен жылдам әрекеттің айырмасы анық жазылды. Соңғы кездесуде оны отбасыларға берген таңғы уәдемен байланыстыруға болады.', 'Your folder now distinguishes long-term modernization from rapid response. In the final meeting, you can connect that distinction to your morning commitment to families.'],
        ],
        meeting: ['«Инженер подтвердил главное: аварийная помощь и обновление сети решают разные задачи. С учётом утренних обещаний семьям выберем, какую можем оплатить сейчас».', '«Инженер негізгі ойды растады: апаттық көмек пен желіні жаңарту бөлек міндеттерді шешеді. Отбасыларға берген таңғы уәдені ескеріп, қазір қайсысын төлей алатынымызды таңдайық».', '“The engineer confirmed the distinction: emergency help and network renewal do different jobs. With our morning commitments in mind, let us choose what we can fund now.”'],
        reply: ['Объясним разницу между устранением аварий и обновлением сети.', 'Апатты жою мен желіні жаңартудың айырмасын түсіндіреміз.', 'We will explain the difference between responding to failures and renewing the network.'],
        callback: ['В журнале осталась схема инженера: городские обещания опираются в том числе на сети под землёй.', 'Журналда инженер сызбасы қалды: қаланың уәделері жер астындағы желілерге де сүйенеді.', 'The engineer’s diagram remains in the journal: city promises also depend on the networks underground.'],
        closing: ['Инженер отправляет схему для следующей рабочей встречи. Вечером это всё ещё план, но в нём уже разделены ремонт после аварии и работа с её причиной.', 'Инженер келесі жұмыс кездесуіне сызбаны жіберді. Кешке бұл әлі жоспар, бірақ онда апаттан кейінгі жөндеу мен оның себебімен жұмыс бөлінген.', 'The engineer sends the diagram for the next working meeting. Tonight it is still a plan, but it now distinguishes repairs after a failure from work on its cause.'],
        visual: 'map',
      },
      {
        title: ['Сесть рядом с оператором обращений', 'Өтініш операторымен бірге отыру', 'Sit with the requests operator'],
        description: ['Проследить одно обращение от звонка до ответа жителю.', 'Бір өтінішті қоңыраудан тұрғынға берілген жауапқа дейін қарау.', 'Follow one request from the initial call to the resident’s reply.'],
        discoveryTitle: ['«Закрыто» не значит «объяснили»', '«Жабылды» деген «түсіндірілді» емес', '“Closed” is not the same as “explained”'],
        lines: [
          ['Оператор открывает обращение о дворе. В системе стоит «передано», а житель звонит снова: «Я не знаю, кто теперь отвечает». Алия просит не торопиться с готовым обещанием приложения.', 'Оператор аула туралы өтінішті ашты. Жүйеде «жіберілді» тұр, ал тұрғын қайта қоңырау шалады: «Енді кім жауапты екенін білмеймін». Әлия дайын қосымша уәдесін беруге асықпауды сұрайды.', 'The operator opens a courtyard request. Its status says “forwarded”, but the resident calls again: “I do not know who is responsible now.” Aliya asks you not to rush into promising an app.'],
          ['Вы отмечаете три вопроса для будущей службы: кто отвечает, что будет дальше и когда сообщат новости. Они войдут в ваше объяснение любого сервисного проекта.', 'Болашақ қызметке үш сұрақ жазасыз: кім жауапты, келесі қадам қандай және қашан хабарланады. Олар кез келген қызмет жобасын түсіндіруіңізге кіреді.', 'You note three questions for a future service: who owns the request, what happens next and when there will be an update. These will inform your explanation of any service project.'],
        ],
        meeting: ['«Мы вместе слышали повторный звонок, — говорит Алия. — Жителю нужен не только статус. Выбранный проект придётся объяснить через понятную ответственность».', '«Қайталанған қоңырауды бірге естідік, — дейді Әлия. — Тұрғынға мәртебе ғана керек емес. Таңдалған жобаны түсінікті жауапкершілік арқылы түсіндіру қажет».', '“We heard that repeat call together,” Aliya says. “The resident needs more than a status. We must explain the chosen project through clear responsibility.”'],
        reply: ['В объяснении укажем ответственного, следующий шаг и порядок обратной связи.', 'Түсіндірмеде жауапты адамды, келесі қадамды және кері байланыс тәртібін көрсетеміз.', 'Our explanation will identify responsibility, the next step and how residents receive updates.'],
        callback: ['В журнале остались три вопроса оператора: кто отвечает, что дальше и когда будет новость.', 'Журналда оператордың үш сұрағы қалды: кім жауапты, келесі қадам қандай және қашан хабар болады.', 'The operator’s three questions remain in the journal: who is responsible, what happens next and when there will be an update.'],
        closing: ['Алия прикрепляет к последнему решению записку оператора: «Кто отвечает? Что дальше? Когда сообщат?» Для жителей с этих вопросов начнётся проверка вашего плана.', 'Әлия соңғы шешімге оператор жазбасын бекітті: «Кім жауапты? Келесі қадам қандай? Қашан хабарланады?» Тұрғындар жоспарыңызды осы сұрақтардан бастап тексереді.', 'Aliya attaches the operator’s note to the final decision: “Who is responsible? What next? When is the update?” Residents will judge your plan starting with those questions.'],
        visual: 'lab',
      },
    ],
  },
];

const validStep = step => Number.isInteger(step) && step >= 0 && step < dossiers.length;
const sourceAt = (story, step) => {
  const index = story?.inquiries?.[step];
  return validStep(step) && (index === 0 || index === 1) ? dossiers[step].options[index] : null;
};
const times = ['09:00', '09:50', '10:50', '11:55', '12:50'];
const discoveryTimes = ['09:05', '09:55', '10:55', '11:58', '12:55'];

export function getBriefing(step, story = {}, language = 'ru') {
  if (!validStep(step)) return null;
  const dossier = dossiers[step];
  const character = getStory(language)[step];
  return {
    id: `briefing-${character.id}`, time: times[step], visual: 'lab',
    title: local(dossier.title, language), kicker: campaignText('inquiryChoose', language),
    lines: dossier.lines.map(line => local(line, language)), portrait: character.portrait, speaker: character.name,
    options: dossier.options.map(option => ({ title: local(option.title, language), description: local(option.description, language) })),
  };
}

export function getDiscovery(step, story = {}, language = 'ru') {
  const option = sourceAt(story, step);
  if (!option) return null;
  const character = getStory(language)[step];
  return {
    id: `discovery-${character.id}-${story.inquiries[step]}`,
    time: discoveryTimes[step], title: local(option.discoveryTitle, language),
    kicker: local(option.title, language), lines: option.lines.map(line => local(line, language)),
    portrait: step === 0 && story.inquiries[0] === 1 ? 4 : character.portrait,
    speaker: step === 0 && story.inquiries[0] === 1 ? getStory(language)[4].name : character.name,
    visual: option.visual, cta: campaignText('inquiryContinue', language),
  };
}

export function enrichMeeting(meeting, story = {}, language = 'ru') {
  if (!meeting) return null;
  const step = getStory(language).findIndex(item => item.id === meeting.id);
  const result = { ...meeting, lines: [...meeting.lines], choices: meeting.choices.map(choice => ({ ...choice })) };
  if (!validStep(step)) return result;
  if (step === 0) result.time = '09:15';
  const current = sourceAt(story, step);
  // Only information gathered at this meeting or earlier can appear here.
  const previous = step > 0 ? sourceAt(story, step - 1) : null;
  const additions = [previous && local(previous.callback, language), current && local(current.meeting, language)].filter(Boolean);
  if (step === 4 && sourceAt(story, 0)) additions.unshift(local(story.inquiries[0] === 0 ? [
    '«Начнём с утренней записки о школьной очереди, — предлагает Алия. — Надёжность города нужна тем же семьям, которых вы встретили в коридоре».',
    '«Мектеп кезегі туралы таңғы жазбадан бастайық, — дейді Әлия. — Қаланың сенімді жұмысы дәлізде кездескен сол отбасыларға да керек».',
    '“Let us return to your morning note on school places,” Aliya says. “A reliable city matters to the same families you met in that corridor.”',
  ] : [
    '«Утром мы говорили по телефону о родителях между школой и поликлиникой, — напоминает Алия. — В последнем решении важно снова увидеть целый день этой семьи».',
    '«Таңертең мектеп пен емхана арасында жүрген ата-аналар туралы телефонмен сөйлестік, — деп еске салады Әлия. — Соңғы шешімде сол отбасының бүкіл күнін қайта ескеру маңызды».',
    '“This morning we spoke about parents juggling school and appointments,” Aliya reminds you. “In this last decision, let us see that family’s whole day again.”',
  ], language));
  result.lines = [...result.lines, ...additions];
  if (current) {
    result.choices = result.choices.map(choice => ({
      ...choice,
      reply: `${choice.reply} ${local(current.reply, language)}`,
      context: [choice.context, local(current.title, language)].filter(Boolean).join(' · '),
    }));
  }
  if (step >= 3 && story.council === 'review') result.lines.push(local([
    'На промежуточном совете вы вернулись к распределению средств. В этом разговоре опираемся на действующие лимиты и уже утверждённые проекты.',
    'Аралық кеңесте қаражатты бөлуге қайта оралдыңыз. Бұл әңгімеде қолданыстағы шектер мен бекітілген жобаларға сүйенеміз.',
    'At the mid-day council, you reopened the allocation. This conversation uses the current limits and the projects already approved.',
  ], language));
  if (step >= 3 && story.council === 'hold') result.lines.push(local([
    'На промежуточном совете вы решили держаться плана. Сейчас важно объяснить, какое место в нём осталось для этой встречи.',
    'Аралық кеңесте жоспарды сақтауды шештіңіз. Енді бұл кездесуге жоспарда қандай орын қалғанын түсіндіру маңызды.',
    'At the mid-day council, you chose to keep the plan. Now explain the place this meeting still has within it.',
  ], language));
  return result;
}

export function getCouncil(story = {}, language = 'ru') {
  const advisor = getStory(language)[4];
  const lines = [local([
    '11:50. Алия просит закрыть дверь на несколько минут. «Мы уже услышали семьи, жителей Сарыарки и транспортную службу. Впереди безопасность и городские сервисы. Наш план ещё выдерживает всё, что мы узнали?»',
    '11:50. Әлия есікті бірнеше минутқа жабуды сұрайды. «Отбасыларды, Сарыарқа тұрғындарын және көлік қызметін тыңдадық. Алда қауіпсіздік пен қалалық қызметтер бар. Жоспарымыз білгеніміздің бәрін әлі көтере ала ма?»',
    '11:50. Aliya asks for a few quiet minutes. “We have heard families, Saryarka residents and transport staff. Safety and city services are still ahead. Does our plan still fit what we have learned?”',
  ], language)];
  // The council occurs after transport. Safety/service inquiry data in a later
  // save must never leak into this scene when the player returns here.
  for (let step = 0; step < 3; step += 1) {
    const option = sourceAt(story, step);
    if (option) lines.push(local(option.callback, language));
  }
  lines.push(campaignText('councilHint', language));
  return {
    id: 'midday-council', time: '11:50', visual: 'lab', portrait: 4, speaker: advisor.name,
    title: local(['Совет посреди дня', 'Күн ортасындағы кеңес', 'The mid-day council'], language),
    kicker: local(['Проверка приоритетов', 'Басымдықтарды тексеру', 'A check on priorities'], language), lines,
    options: [
      { title: campaignText('councilKeep', language), description: local(['Продолжить с действующими лимитами и объяснить оставшиеся приоритеты.', 'Қолданыстағы шектермен жалғастырып, қалған басымдықтарды түсіндіру.', 'Continue with the current limits and explain the priorities still ahead.'], language) },
      { title: campaignText('councilReview', language), description: local(['Открыть бюджетный план и перераспределить средства с учётом услышанного.', 'Бюджет жоспарын ашып, естігеніңізді ескеріп қаражатты қайта бөлу.', 'Open the budget plan and reallocate funds in light of what you have heard.'], language) },
    ],
  };
}

export function getCampaignClosing(story = {}, language = 'ru') {
  const lines = [];
  for (let step = 0; step < 5; step += 1) {
    const option = sourceAt(story, step);
    if (option) lines.push(local(option.closing, language));
  }
  if (story.council === 'review') lines.push(local([
    'В середине дня вы остановились и ещё раз проверили бюджетный план. В журнале осталась причина: услышанное может менять приоритеты, а уже принятые обязательства нужно учитывать.',
    'Күн ортасында тоқтап, бюджет жоспарын қайта тексердіңіз. Журналда себебі қалды: естігеніңіз басымдықтарды өзгерте алады, ал қабылданған міндеттемелерді ескеру керек.',
    'At mid-day you paused to review the budget plan. The journal records why: new information can change priorities, while commitments already made still count.',
  ], language));
  if (story.council === 'hold') lines.push(local([
    'На промежуточном совете вы сохранили распределение средств. В журнале отмечено: последовательность тоже требует объяснения — особенно тем, чья проблема пока ждёт.',
    'Аралық кеңесте қаражат бөлінісін сақтадыңыз. Журналда белгіленді: бірізділік те түсіндіруді қажет етеді, әсіресе мәселесі әлі күтіп тұрғандарға.',
    'At the council you kept the allocation. The journal notes that consistency also needs explaining, especially to people whose problem still waits.',
  ], language));
  return { title: campaignText('chronicle', language), lines };
}
