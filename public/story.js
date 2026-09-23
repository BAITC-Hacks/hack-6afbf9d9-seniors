/** The story is a guided route through the same city model, not a second model. */
export const STORY_VERSION = 1;

const meetings = [
  { id: 'teacher', time: '09:00', portrait: 0, choices: [
    { initiativeId: 'M7', categoryId: 'social', districtId: 'nura' },
    { initiativeId: 'M8', categoryId: 'social', districtId: 'nura' },
    { initiativeId: 'M9', categoryId: 'social', districtId: 'nura' },
  ] },
  { id: 'ecologist', time: '10:00', portrait: 1, choices: [
    { initiativeId: 'M4', categoryId: 'green', districtId: 'saryarka' },
    { initiativeId: 'M5', categoryId: 'green', districtId: 'saryarka' },
    { initiativeId: 'M6', categoryId: 'green', districtId: null },
  ] },
  { id: 'driver', time: '11:00', portrait: 2, choices: [
    { initiativeId: 'M1', categoryId: 'transport', districtId: 'almaty' },
    { initiativeId: 'M2', categoryId: 'transport', districtId: null },
    { initiativeId: 'M3', categoryId: 'transport', districtId: 'almaty' },
  ] },
  { id: 'resident', time: '12:00', portrait: 3, choices: [
    { initiativeId: 'M10', categoryId: 'safety', districtId: 'nura' },
    { initiativeId: 'M11', categoryId: 'safety', districtId: 'nura' },
  ] },
  { id: 'advisor', time: '13:00', portrait: 4, choices: [
    { initiativeId: 'M12', categoryId: 'services', districtId: null },
    { initiativeId: 'M13', categoryId: 'services', districtId: 'nura' },
    { initiativeId: 'M14', categoryId: 'services', districtId: null },
  ] },
];

const narratives = {
  ru: [
    {
      name: 'Айгуль Садыкова', role: 'Учитель', districtName: 'Нура',
      title: 'Детям нужно место в городе',
      lines: [
        'Я преподаю в Нуре. Семей становится больше, а школ и мест в детсадах не хватает.',
        'Родители говорят и о другом: трудно попасть к врачу, детям негде заниматься спортом. Всё важно, но сегодня у нас одно решение.',
        'С чего начнём, аким?',
      ],
      choices: [
        { reply: 'Построим школу и детский сад в Нуре.', acknowledgement: 'У детей появятся новые места для учёбы. Строительство потребует времени, а вопрос поликлиники пока останется.' },
        { reply: 'Откроем новую поликлинику в Нуре.', acknowledgement: 'Семьям станет доступнее первичная медицинская помощь. Для школы и детсада решение ещё понадобится.' },
        { reply: 'Оборудуем спортивные дворы в Нуре.', acknowledgement: 'Дети получат пространство для спорта. Это быстрый, но небольшой шаг: школу и поликлинику он не заменит.' },
      ],
    },
    {
      name: 'Дана Омарова', role: 'Инженер и экоактивист', districtName: 'Сарыарка',
      title: 'Городу нужен чистый воздух',
      lines: [
        'В Сарыарке зимой чувствуется дым от частного сектора. Зелени у нас тоже мало.',
        'Можно создать парк, перевести отопление на более чистое топливо или запустить озеленение во всём городе.',
        'Какой путь выберем?',
      ],
      choices: [
        { reply: 'Создадим новый районный парк в Сарыарке.', acknowledgement: 'В районе станет больше зелени и безопасного общественного пространства. Проблема зимнего дыма решится лишь частично.' },
        { reply: 'Переведём теплоснабжение Сарыарки на чистое топливо.', acknowledgement: 'Это поможет воздуху и надёжности коммунальных услуг. Первые изменения потребуют нескольких кварталов.' },
        { reply: 'Запустим городскую программу озеленения.', acknowledgement: 'Изменения затронут все пять районов. Деревьям нужно время, и эффект будет постепенным.' },
      ],
    },
    {
      name: 'Марат Ибраев', role: 'Таксист', districtName: 'Алматы',
      title: 'Час в дороге — тоже часть жизни',
      lines: [
        'Каждое утро вожу людей по району Алматы. В пробке стоят и машины, и автобусы.',
        'Полосы для автобусов, умные светофоры, развитие LRT — у каждого пути своя цена и срок запуска.',
        'На что выделим бюджет?',
      ],
      choices: [
        { reply: 'Выделим автобусные полосы в районе Алматы.', acknowledgement: 'Общественный транспорт станет доступнее, дороги разгрузятся. В этом сценарии мы выбираем автобусные полосы вместо LRT.' },
        { reply: 'Установим адаптивные светофоры во всём городе.', acknowledgement: 'Настройка перекрёстков поможет движению и безопасности во всех районах. Системе потребуется время для запуска.' },
        { reply: 'Разовьём LRT в районе Алматы.', acknowledgement: 'Это крупное вложение в транспорт с долгим запуском. Эффект придёт позже, а оставшийся бюджет нужно беречь.' },
      ],
    },
    {
      name: 'Серик Ахметов', role: 'Пенсионер', districtName: 'Нура',
      title: 'Добраться домой без тревоги',
      lines: [
        'Вечером возвращаюсь домой по Нуре. На тёмной улице неуютно, а переходить дорогу бывает страшно.',
        'Нужно решить: начнём с освещения и камер или с безопасных переходов?',
      ],
      choices: [
        { reply: 'Установим освещение и камеры в Нуре.', acknowledgement: 'Так улицы станут безопаснее. Цифровая платформа обращений может дополнительно усилить это решение.' },
        { reply: 'Переоборудуем пешеходные переходы в Нуре.', acknowledgement: 'Переходить дорогу станет безопаснее. Но у решения есть компромисс: показатель разгрузки дорог немного снизится.' },
      ],
    },
    {
      name: 'Алия Нурланова', role: 'Врач и советник акима', districtName: 'Весь город',
      title: 'Чтобы город работал каждый день',
      lines: [
        'Доступность медицины мы уже обсуждали с Айгуль: новая поликлиника была одним из вариантов.',
        'Теперь поговорим о городских сервисах. Поликлиникам, школам и домам одинаково нужны надёжные тепло- и водосети.',
        'Осталось последнее решение: обращения жителей, обновление сетей или аварийная служба?',
      ],
      choices: [
        { reply: 'Создадим городскую цифровую платформу обращений.', acknowledgement: 'Обращения будут решаться быстрее во всех районах. Сама платформа не заменяет коммунальные сети.' },
        { reply: 'Модернизируем коммунальные сети Нуры.', acknowledgement: 'Это вклад в надёжность ЖКХ Нуры. Работы займут время и затронут только выбранный район.' },
        { reply: 'Усилим аварийную службу ЖКХ во всём городе.', acknowledgement: 'Коммунальные проблемы будут решаться быстрее. Долгосрочное обновление сетей всё равно потребует отдельной программы.' },
      ],
    },
  ],
  kk: [
    {
      name: 'Айгүл Садықова', role: 'Мұғалім', districtName: 'Нұра',
      title: 'Балаларға қаладан орын керек',
      lines: [
        'Мен Нұрада сабақ беремін. Отбасылар көбейіп келеді, ал мектеп пен балабақша орындары жетіспейді.',
        'Ата-аналар дәрігерге жазылудың қиындығын, балаларға спорт алаңы жетіспейтінін де айтады. Бәрі маңызды, бірақ бүгін бір шешім қабылдаймыз.',
        'Неден бастаймыз, әкім?',
      ],
      choices: [
        { reply: 'Нұрада мектеп пен балабақша саламыз.', acknowledgement: 'Балаларға жаңа оқу орындары ашылады. Құрылысқа уақыт қажет, ал емхана мәселесі әзірге қалады.' },
        { reply: 'Нұрада жаңа емхана ашамыз.', acknowledgement: 'Отбасылар үшін алғашқы медициналық көмек қолжетімді болады. Мектеп пен балабақшаға әлі де шешім қажет.' },
        { reply: 'Нұра аулаларында спорт алаңдарын жабдықтаймыз.', acknowledgement: 'Балалар спортпен айналысатын орынға ие болады. Бұл жылдам, бірақ шағын қадам: мектеп пен емхананы алмастырмайды.' },
      ],
    },
    {
      name: 'Дана Омарова', role: 'Инженер және экобелсенді', districtName: 'Сарыарқа',
      title: 'Қалаға таза ауа керек',
      lines: [
        'Сарыарқада қыста жеке сектордың түтіні сезіледі. Жасыл желек те аз.',
        'Саябақ құруға, жылытуды таза отынға ауыстыруға немесе бүкіл қаланы көгалдандыруға болады.',
        'Қай жолды таңдаймыз?',
      ],
      choices: [
        { reply: 'Сарыарқада жаңа аудандық саябақ құрамыз.', acknowledgement: 'Ауданда жасыл желек пен қауіпсіз қоғамдық кеңістік көбейеді. Қысқы түтін мәселесі тек ішінара шешіледі.' },
        { reply: 'Сарыарқаның жылу көздерін таза отынға ауыстырамыз.', acknowledgement: 'Бұл ауа сапасы мен коммуналдық қызмет сенімділігін жақсартады. Алғашқы өзгерістерге бірнеше тоқсан қажет.' },
        { reply: 'Қаланы көгалдандыру бағдарламасын іске қосамыз.', acknowledgement: 'Өзгерістер барлық бес ауданға әсер етеді. Ағаштарға уақыт керек, әсері біртіндеп байқалады.' },
      ],
    },
    {
      name: 'Марат Ибраев', role: 'Такси жүргізушісі', districtName: 'Алматы',
      title: 'Жолдағы бір сағат — өмірдің бір бөлігі',
      lines: [
        'Күн сайын таңертең Алматы ауданында жолаушы тасимын. Кептелісте көліктер де, автобустар да тұрады.',
        'Автобус жолақтары, ақылды бағдаршамдар, LRT дамыту — әр жолдың өз құны мен іске қосылу мерзімі бар.',
        'Бюджетті неге бөлеміз?',
      ],
      choices: [
        { reply: 'Алматы ауданында автобус жолақтарын бөлеміз.', acknowledgement: 'Қоғамдық көлік қолжетімді болып, жол жүктемесі азаяды. Бұл сценарийде LRT орнына автобус жолақтарын таңдаймыз.' },
        { reply: 'Бүкіл қалада бейімделетін бағдаршамдар орнатамыз.', acknowledgement: 'Қиылыстарды реттеу барлық ауданда қозғалыс пен қауіпсіздікке көмектеседі. Жүйені іске қосуға уақыт қажет.' },
        { reply: 'Алматы ауданында LRT дамытамыз.', acknowledgement: 'Бұл — іске қосылуы ұзақ, көлікке арналған ірі инвестиция. Әсері кейінірек келеді, қалған бюджетті сақтау қажет.' },
      ],
    },
    {
      name: 'Серік Ахметов', role: 'Зейнеткер', districtName: 'Нұра',
      title: 'Үйге алаңсыз жету',
      lines: [
        'Кешке Нұрадағы үйіме қайтамын. Қараңғы көшеде жайсыз, жолдан өту кейде қорқынышты.',
        'Жарық пен камералардан бастаймыз ба, әлде қауіпсіз жаяу өткелдерден бе?',
      ],
      choices: [
        { reply: 'Нұрада жарықтандыру мен камералар орнатамыз.', acknowledgement: 'Көшелер қауіпсіз болады. Өтініштердің цифрлық платформасы бұл шешімді қосымша күшейте алады.' },
        { reply: 'Нұрадағы жаяу өткелдерді жаңартамыз.', acknowledgement: 'Жолдан өту қауіпсіз болады. Бірақ ымырасы бар: жол жүктемесін азайту көрсеткіші сәл төмендейді.' },
      ],
    },
    {
      name: 'Әлия Нұрланова', role: 'Дәрігер және әкім кеңесшісі', districtName: 'Бүкіл қала',
      title: 'Қала күн сайын жұмыс істеуі үшін',
      lines: [
        'Медицинаның қолжетімділігін Айгүлмен талқыладық: жаңа емхана нұсқалардың бірі болды.',
        'Енді қалалық қызметтер туралы сөйлесейік. Емханаларға, мектептерге және үйлерге сенімді жылу мен су желілері қажет.',
        'Соңғы шешім қалды: тұрғындар өтініштері, желілерді жаңарту немесе апаттық қызмет пе?',
      ],
      choices: [
        { reply: 'Тұрғындар өтініштерінің қалалық цифрлық платформасын құрамыз.', acknowledgement: 'Барлық ауданда өтініштер жылдам шешіледі. Платформаның өзі коммуналдық желілерді алмастырмайды.' },
        { reply: 'Нұраның коммуналдық желілерін жаңғыртамыз.', acknowledgement: 'Бұл — Нұраның ТКШ сенімділігіне салым. Жұмыстарға уақыт қажет және олар тек таңдалған ауданға әсер етеді.' },
        { reply: 'Бүкіл қалада ТКШ апаттық қызметін күшейтеміз.', acknowledgement: 'Коммуналдық мәселелер жылдам шешіледі. Желілерді ұзақ мерзімді жаңарту үшін бөлек бағдарлама қажет болады.' },
      ],
    },
  ],
  en: [
    {
      name: 'Aigul Sadykova', role: 'Teacher', districtName: 'Nura',
      title: 'Children need a place in the city',
      lines: [
        'I teach in Nura. More families are moving here, but schools and kindergartens do not have enough places.',
        'Parents also struggle to see a doctor, and children need places to play sports. It all matters, but today we have one decision.',
        'Where shall we start, Mayor?',
      ],
      choices: [
        { reply: 'Build a school and kindergarten in Nura.', acknowledgement: 'Children will have new places to learn. Construction takes time, while the clinic question remains.' },
        { reply: 'Open a new health clinic in Nura.', acknowledgement: 'Families will have better access to primary care. The school and kindergarten still need a solution.' },
        { reply: 'Create neighbourhood sports spaces in Nura.', acknowledgement: 'Children will have space for sports. This is a quick but small step; it does not replace a school or clinic.' },
      ],
    },
    {
      name: 'Dana Omarova', role: 'Engineer and environmental activist', districtName: 'Saryarka',
      title: 'The city needs clean air',
      lines: [
        'In winter, you can smell smoke from private homes in Saryarka. We do not have enough green space either.',
        'We could create a park, switch heating to cleaner fuel, or launch a greening program across the city.',
        'Which approach shall we take?',
      ],
      choices: [
        { reply: 'Create a new district park in Saryarka.', acknowledgement: 'The district will gain greenery and safer public space. Winter smoke will only be addressed in part.' },
        { reply: 'Switch Saryarka’s heating sources to cleaner fuel.', acknowledgement: 'This will help air quality and utility reliability. The first changes will take several quarters.' },
        { reply: 'Launch a citywide greening program.', acknowledgement: 'All five districts will benefit. Trees need time, so the effect will emerge gradually.' },
      ],
    },
    {
      name: 'Marat Ibrayev', role: 'Taxi driver', districtName: 'Almaty',
      title: 'An hour on the road is part of life',
      lines: [
        'Every morning I drive passengers around Almaty district. Cars and buses are both stuck in traffic.',
        'Bus lanes, adaptive traffic lights, LRT expansion: each option has its own cost and launch time.',
        'Where shall we put the budget?',
      ],
      choices: [
        { reply: 'Add dedicated bus lanes in Almaty district.', acknowledgement: 'Public transport will become more accessible and roads less congested. This scenario chooses bus lanes instead of LRT.' },
        { reply: 'Install adaptive traffic lights across the city.', acknowledgement: 'Better intersection control will help traffic and safety in every district. The system needs time to launch.' },
        { reply: 'Expand LRT in Almaty district.', acknowledgement: 'This is a major transport investment with a long launch time. Benefits arrive later, and we need to protect the remaining budget.' },
      ],
    },
    {
      name: 'Serik Akhmetov', role: 'Retired resident', districtName: 'Nura',
      title: 'Getting home without worry',
      lines: [
        'I walk home through Nura in the evening. Dark streets feel uneasy, and crossing the road can be frightening.',
        'Shall we start with lighting and cameras, or with safer pedestrian crossings?',
      ],
      choices: [
        { reply: 'Install lighting and cameras in Nura.', acknowledgement: 'The streets will be safer. A digital resident request platform could strengthen this decision further.' },
        { reply: 'Upgrade pedestrian crossings in Nura.', acknowledgement: 'Crossing the road will be safer. There is a trade-off: the road congestion relief indicator will fall slightly.' },
      ],
    },
    {
      name: 'Aliya Nurlanova', role: 'Doctor and mayor’s advisor', districtName: 'Whole city',
      title: 'Keeping the city running every day',
      lines: [
        'We already discussed access to healthcare with Aigul: a new clinic was one of the options.',
        'Now let us consider city services. Clinics, schools and homes all need reliable heating and water networks.',
        'One decision remains: resident requests, utility renewal or emergency services?',
      ],
      choices: [
        { reply: 'Create a citywide digital resident request platform.', acknowledgement: 'Requests will be resolved faster across all districts. The platform itself does not replace utility networks.' },
        { reply: 'Modernize Nura’s utility networks.', acknowledgement: 'This invests in Nura’s utility reliability. The work will take time and only affect the chosen district.' },
        { reply: 'Strengthen emergency utility services citywide.', acknowledgement: 'Utility problems will be resolved faster. Long-term network renewal will still require a separate program.' },
      ],
    },
  ],
};

const text = {
  title: ['Один день, чтобы спасти район', 'Ауданды құтқаруға бір күн', 'One day to save a district'],
  subtitle: ['Пять встреч. Пять решений. Услышьте жителей и определите будущее города.', 'Бес кездесу. Бес шешім. Тұрғындарды тыңдап, қаланың болашағын анықтаңыз.', 'Five meetings. Five decisions. Listen to residents and shape the city’s future.'],
  meeting: ['Встреча {current} из {total}', '{total} кездесудің {current}-сі', 'Meeting {current} of {total}'],
  hours: ['5 часов на решения', 'Шешімдерге 5 сағат', '5 hours to make decisions'],
  budget: ['Бюджет', 'Бюджет', 'Budget'],
  remaining: ['Осталось', 'Қалды', 'Remaining'],
  choicesTitle: ['Что вы ответите?', 'Не деп жауап бересіз?', 'What will you say?'],
  back: ['Назад', 'Артқа', 'Back'],
  next: ['Следующая встреча', 'Келесі кездесу', 'Next meeting'],
  finish: ['Завершить день', 'Күнді аяқтау', 'Finish the day'],
  menu: ['Главное меню', 'Басты мәзір', 'Main menu'],
  simulator: ['Свободный симулятор', 'Еркін симулятор', 'Free simulator'],
  restart: ['Начать историю заново', 'Оқиғаны қайта бастау', 'Restart story'],
  confirmRestart: ['Начать этот день заново? Прогресс встреч будет сброшен.', 'Осы күнді қайта бастаймыз ба? Кездесулер барысы қалпына келтіріледі.', 'Start this day again? Meeting progress will be reset.'],
  cancel: ['Отмена', 'Бас тарту', 'Cancel'],
  accept: ['Подтвердить решение', 'Шешімді растау', 'Confirm decision'],
  selected: ['Ваш выбор', 'Сіздің таңдауыңыз', 'Your choice'],
  locked: ['Бюджета не хватит на оставшиеся встречи.', 'Қалған кездесулерге бюджет жетпейді.', 'There will not be enough budget for the remaining meetings.'],
  resume: ['Продолжить историю', 'Оқиғаны жалғастыру', 'Continue story'],
  epilogue: ['Эпилог', 'Эпилог', 'Epilogue'],
  endingTitle: ['День закончился. Изменения только начинаются.', 'Күн аяқталды. Өзгерістер енді басталады.', 'The day is over. Change is just beginning.'],
  endingBody: ['Вы выслушали пять жителей и приняли пять решений. Теперь посмотрим, как они изменят город за два года.', 'Сіз бес тұрғынды тыңдап, бес шешім қабылдадыңыз. Енді олардың қаланы екі жылда қалай өзгертетінін көрейік.', 'You listened to five residents and made five decisions. Now see how they will change the city over two years.'],
  viewReport: ['Открыть решения в симуляторе', 'Шешімдерді симуляторда ашу', 'Open decisions in simulator'],
  freePlay: ['Перейти в свободный режим', 'Еркін режимге өту', 'Open free mode'],
  freePlayTitle: ['История завершена. Что дальше?', 'Оқиға аяқталды. Әрі қарай не істейміз?', 'The story is complete. What next?'],
  freePlayHint: ['Продолжите с решениями из сюжета: свободно меняйте мероприятия и районы, пробуйте другие сочетания и сравнивайте результаты. Итог истории сохранится.', 'Оқиғадағы шешімдермен жалғастырыңыз: шаралар мен аудандарды еркін өзгертіп, басқа үйлесімдерді байқап, нәтижелерді салыстырыңыз. Оқиғаның қорытындысы сақталады.', 'Continue with your story decisions: freely change initiatives and districts, try other combinations and compare results. Your story ending stays saved.'],
  editChoices: ['Пересмотреть решения', 'Шешімдерді қайта қарау', 'Review decisions'],
  effectTiming: ['Эффекты показаны на горизонте двух лет.', 'Әсерлер екі жылдық мерзімде көрсетілген.', 'Effects are shown over a two-year horizon.'],
  progress: ['Принято решений: {current} / {total}', 'Қабылданған шешімдер: {current} / {total}', 'Decisions made: {current} / {total}'],
  saved: ['История сохранена в этом браузере.', 'Оқиға осы браузерде сақталды.', 'Your story is saved in this browser.'],
  spent: ['Потрачено', 'Жұмсалды', 'Spent'],
  score: ['Качество жизни города', 'Қаладағы өмір сапасы', 'City quality of life'],
  improved: ['Что изменилось к лучшему', 'Не жақсарды', 'What improved'],
  unresolved: ['Что ещё требует внимания', 'Тағы неге назар аудару керек', 'What still needs attention'],
  before: ['До решений', 'Шешімдерге дейін', 'Before decisions'],
  after: ['Через два года', 'Екі жылдан кейін', 'After two years'],
  noImprovements: ['По этому показателю улучшений пока нет.', 'Бұл көрсеткіш бойынша жақсару әзірге жоқ.', 'This indicator has not improved yet.'],
  critical: ['Показатели ниже 40', '40-тан төмен көрсеткіштер', 'Indicators below 40'],
  missed: ['Что осталось без финансирования', 'Қаржыландырылмаған шаралар', 'What remains unfunded'],
  analyze: ['Получить разбор решений', 'Шешімдердің талдауын алу', 'Analyze these decisions'],
  analyzing: ['Анализируем ваши решения…', 'Шешімдеріңіз талдануда…', 'Analyzing your decisions…'],
  complete: ['Все пять решений приняты', 'Бес шешімнің бәрі қабылданды', 'All five decisions are made'],
  decision: ['Решение', 'Шешім', 'Decision'],
  available: ['Доступно', 'Қолжетімді', 'Available'],
  total: ['Всего', 'Барлығы', 'Total'],
  units: ['ед.', 'бірл.', 'units'],
  city: ['Весь город', 'Бүкіл қала', 'Whole city'],
  launch: ['Запуск через {quarters} кв.', '{quarters} тоқсаннан кейін іске қосылады', 'Starts in {quarters} quarters'],
  effect: ['Ожидаемый эффект', 'Күтілетін әсер', 'Expected effect'],
  minimumTotal: ['Минимальная стоимость всей истории: {cost} ед.', 'Бүкіл оқиғаның ең төмен құны: {cost} бірл.', 'Minimum cost for the whole story: {cost} units'],
  conflict: ['Это решение несовместимо с предыдущими.', 'Бұл шешім алдыңғы шешімдермен үйлеспейді.', 'This decision conflicts with earlier choices.'],
  invalid: ['Не удалось проверить выбор. Вернитесь к текущей встрече.', 'Таңдауды тексеру мүмкін болмады. Ағымдағы кездесуге оралыңыз.', 'Could not validate this choice. Return to the current meeting.'],
  unavailable: ['Данные мероприятия недоступны. Перезагрузите симулятор.', 'Шара деректері қолжетімсіз. Симуляторды қайта жүктеңіз.', 'Initiative data is unavailable. Reload the simulator.'],
  start: ['Начать день', 'Күнді бастау', 'Start the day'],
  acknowledgement: ['Ответ жителя', 'Тұрғынның жауабы', 'Resident’s response'],
  savedDecision: ['Решение принято и сохранено.', 'Шешім қабылданып, сақталды.', 'Decision accepted and saved.'],
  modelNotice: ['Учебная история. Персонажи вымышлены, данные условные.', 'Оқу оқиғасы. Кейіпкерлер ойдан шығарылған, деректер шартты.', 'A learning story. Characters are fictional and data is synthetic.'],
  changeWarning: ['Если изменить ответ, последующие встречи нужно пройти заново.', 'Жауапты өзгертсеңіз, кейінгі кездесулерден қайта өту керек.', 'If you change your answer, you will need to replay the following meetings.'],
  restartHint: ['Сохранённые отчёты останутся.', 'Сақталған есептер қалады.', 'Saved reports will remain.'],
  backToStory: ['Вернуться к встречам', 'Кездесулерге оралу', 'Return to meetings'],
  opening: ['Сегодня вы временно исполняете обязанности акима. До 14:00 нужно утвердить пять решений. На весь город — 100 единиц бюджета.', 'Бүгін сіз әкімнің міндетін уақытша атқарасыз. 14:00-ге дейін бес шешімді бекіту қажет. Бүкіл қалаға — 100 бюджет бірлігі.', 'Today you are the acting mayor. You must approve five decisions by 14:00. The whole city has a budget of 100 units.'],
  futureCost: ['Минимум на весь сценарий: {cost}', 'Бүкіл сценарийге кемінде: {cost}', 'Minimum for the full scenario: {cost}'],
  notFunded: ['Не выбрано', 'Таңдалмаған', 'Not selected'],
  district: ['Район', 'Аудан', 'District'],
  outcome: ['Ваше решение', 'Сіздің шешіміңіз', 'Your decision'],
  hourUnit: ['час', 'сағат', 'hour'],
  evaluating: ['Проверяем решение…', 'Шешім тексерілуде…', 'Checking your decision…'],
};

const normalizeLanguage = language => Object.hasOwn(narratives, language) ? language : 'ru';

export function getStory(language = 'ru') {
  const translated = narratives[normalizeLanguage(language)];
  return meetings.map((meeting, index) => ({
    ...meeting,
    ...translated[index],
    lines: [...translated[index].lines],
    choices: meeting.choices.map((choice, choiceIndex) => ({ ...choice, ...translated[index].choices[choiceIndex] })),
  }));
}

/** Returns plain text. A renderer must escape it when inserting it into HTML. */
export function storyText(key, language = 'ru', vars = {}) {
  const column = { ru: 0, kk: 1, en: 2 }[normalizeLanguage(language)];
  const template = Object.hasOwn(text, key) ? text[key][column] : String(key);
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => Object.hasOwn(vars, name) ? String(vars[name]) : placeholder);
}

function validChoiceIndices(indices) {
  if (!Array.isArray(indices) || indices.length > meetings.length) return false;
  // Array.every skips holes; an explicit loop also rejects sparse/corrupt saves.
  for (let step = 0; step < indices.length; step += 1) {
    if (!Number.isInteger(indices[step]) || indices[step] < 0 || indices[step] >= meetings[step].choices.length) return false;
  }
  return true;
}

export function normalizeStory(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== STORY_VERSION || !validChoiceIndices(value.choices)) return null;
  const step = Number.isInteger(value.step) && value.step >= 0 && value.step <= value.choices.length ? value.step : value.choices.length;
  return { version: STORY_VERSION, choices: [...value.choices], step };
}

export function storyDecisions(choiceIndices) {
  if (!validChoiceIndices(choiceIndices)) return [];
  return choiceIndices.map((choiceIndex, step) => ({ ...meetings[step].choices[choiceIndex] }));
}

function compatible(decisions) {
  const selected = new Map(decisions.map(decision => [decision.initiativeId, decision]));
  if (selected.size !== decisions.length) return false;
  if (selected.has('M1') && selected.has('M3')) return false;
  for (const [left, right] of [['M4', 'M7'], ['M5', 'M13']]) {
    if (selected.has(left) && selected.has(right) && selected.get(left).districtId === selected.get(right).districtId) return false;
  }
  const counts = new Map();
  for (const decision of decisions) {
    const count = (counts.get(decision.categoryId) || 0) + 1;
    if (count > 2) return false;
    counts.set(decision.categoryId, count);
  }
  return true;
}

/** Check a candidate against every remaining story branch (at most 162).
 * When revisiting a meeting, later choices are intentionally discarded.
 * minimumTotal is the cheapest valid completion, including the chosen prefix;
 * it may exceed the budget so that the UI can explain a blocked choice.
 * The server remains authoritative for validation and the final score.
 */
export function storyOptionAvailability(choiceIndices, step, choiceIndex, initiatives, budget = 100) {
  const reject = reason => ({ allowed: false, reason, minimumTotal: null });
  if (!validChoiceIndices(choiceIndices) || !Number.isInteger(step) || step < 0 || step >= meetings.length || step > choiceIndices.length
      || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= meetings[step].choices.length
      || !Number.isFinite(budget) || budget < 0) return reject('invalid');
  if (!Array.isArray(initiatives)) return reject('unavailable');
  const catalogue = new Map(initiatives.filter(item => item && typeof item.id === 'string').map(item => [item.id, item]));
  const costOf = decisions => {
    let total = 0;
    for (const decision of decisions) {
      const item = catalogue.get(decision.initiativeId);
      if (!item || !Number.isFinite(item.cost) || item.cost < 0 || item.categoryId !== decision.categoryId
          || item.scope !== (decision.districtId ? 'district' : 'city')) return null;
      total += item.cost;
    }
    return total;
  };
  const prefix = [...choiceIndices.slice(0, step), choiceIndex];
  const prefixDecisions = storyDecisions(prefix);
  if (costOf(prefixDecisions) === null) return reject('unavailable');
  if (!compatible(prefixDecisions)) return reject('conflict');
  let minimumTotal = Infinity;
  let missingData = false;
  const visit = indices => {
    const decisions = storyDecisions(indices);
    if (!compatible(decisions)) return;
    if (indices.length === meetings.length) {
      const total = costOf(decisions);
      if (total === null) missingData = true;
      else minimumTotal = Math.min(minimumTotal, total);
      return;
    }
    for (let next = 0; next < meetings[indices.length].choices.length; next += 1) visit([...indices, next]);
  };
  visit(prefix);
  if (!Number.isFinite(minimumTotal)) return reject(missingData ? 'unavailable' : 'conflict');
  return { allowed: minimumTotal <= budget, reason: minimumTotal <= budget ? '' : 'budget', minimumTotal };
}
