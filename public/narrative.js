import { getStory, storyDecisions } from './story.js';

// Storytelling only: costs, eligibility, effects and scores remain in the model.
// Every consequence during this day is a reaction or a planning step.
const words = {
  intro: ['Пролог', 'Пролог', 'Prologue'],
  introProgress: ['{current} из {total}', '{total} кезеңнің {current}-сі', '{current} of {total}'],
  next: ['Далее', 'Әрі қарай', 'Continue'],
  enter: ['Войти в городской штаб', 'Қалалық штабқа кіру', 'Enter city headquarters'],
  back: ['Назад', 'Артқа', 'Back'],
  transition: ['Город отвечает', 'Қала жауап береді', 'The city responds'],
  nextMeeting: ['К следующей встрече', 'Келесі кездесуге', 'Next meeting'],
  ending: ['Подвести итог дня', 'Күнді қорытындылау', 'Review the day'],
  decisionContext: ['С учётом ваших решений', 'Шешімдеріңізді ескере отырып', 'In light of your decisions'],
  forecastNotice: ['Реакции жителей — сегодня. Изменения показателей — прогноз на два года.', 'Тұрғындар бүгін жауап береді. Көрсеткіштердің өзгерісі — екі жылдық болжам.', 'Residents react today. Indicator changes are a two-year forecast.'],
  resume: ['Продолжить историю', 'Оқиғаны жалғастыру', 'Continue the story'],
  today: ['Сегодня', 'Бүгін', 'Today'],
  future: ['Через два года', 'Екі жылдан кейін', 'In two years'],
  endingReason: ['Почему такой финал', 'Неліктен осындай финал', 'Why the story ends this way'],
  viewJournal: ['Хроника решений', 'Шешімдер шежіресі', 'Decision journal'],
  availableReplies: ['Новые реплики', 'Жаңа жауаптар', 'New replies'],
  shortTerm: ['Сразу после решения', 'Шешімнен кейін бірден', 'Right after the decision'],
  hours: ['Часов на решения', 'Шешімдерге берілген сағат', 'Hours to decide'],
  budget: ['Бюджет города', 'Қала бюджеті', 'City budget'],
  decisions: ['Решений', 'Шешім', 'Decisions'],
  callConnected: ['Соединение установлено', 'Байланыс орнатылды', 'Call connected'],
  cityPulse: ['Город ждёт вашего решения', 'Қала шешіміңізді күтуде', 'The city is waiting for your decision'],
};

const copy = {
  'intro.morning.kicker': ['Обычное утро', 'Кәдімгі таң', 'An ordinary morning'],
  'intro.morning.title': ['Кофе. Таблицы. Ещё один рабочий день.', 'Кофе. Кестелер. Тағы бір жұмыс күні.', 'Coffee. Spreadsheets. Another working day.'],
  'intro.morning.1': ['Вы — аналитик городской лаборатории. В отчёте на экране снова Нура: мест в школах мало, к врачу попасть непросто.', 'Сіз қалалық зертхананың талдаушысысыз. Экрандағы есепте тағы Нұра: мектепте орын аз, дәрігерге жазылу қиын.', 'You are an analyst at the city laboratory. Nura appears on your screen again: too few school places, and appointments are hard to get.'],
  'intro.morning.2': ['Обычно вы готовите рекомендации. Решения за вас принимают другие. Сегодня всё начнётся иначе.', 'Әдетте сіз ұсыныстар дайындайсыз. Шешімді басқалар қабылдайды. Бүгін бәрі басқаша басталады.', 'Usually, you prepare recommendations. Someone else makes the decisions. Today will be different.'],
  'intro.morning.cta': ['Посмотреть на телефон', 'Телефонға қарау', 'Look at your phone'],
  'intro.call.kicker': ['Входящий звонок', 'Кіріс қоңырауы', 'Incoming call'],
  'intro.call.title': ['«У нас изменились планы»', '«Жоспарымыз өзгерді»', '“There has been a change of plan”'],
  'intro.call.1': ['На экране — Алия Нурланова, советник акима. «Руководитель сегодняшнего городского эксперимента не сможет приехать. Жители уже собираются».', 'Экранда — әкім кеңесшісі Әлия Нұрланова. «Бүгінгі қалалық тәжірибенің жетекшісі келе алмайды. Тұрғындар жиналып жатыр».', 'It is Aliya Nurlanova, the mayor’s advisor. “The person leading today’s city experiment cannot make it. Residents are already arriving.”'],
  'intro.call.2': ['«Вы знаете районы и видите, что стоит за цифрами. Возьмёте на себя роль акима — сегодня с девяти до четырнадцати?»', '«Сіз аудандарды білесіз, сандардың артындағы өмірді көресіз. Бүгін сағат тоғыздан он төртке дейін әкім рөлін қабылдайсыз ба?»', '“You know the districts and the lives behind the numbers. Will you take the mayor’s role today, from nine until two?”'],
  'intro.call.cta': ['Принять вызов', 'Шақыруды қабылдау', 'Take the challenge'],
  'intro.map.kicker': ['Город за пределами таблицы', 'Кестеден тыс қала', 'The city beyond the spreadsheet'],
  'intro.map.title': ['Пять районов. Ни одного лишнего человека.', 'Бес аудан. Әр тұрғын маңызды.', 'Five districts. Every resident matters.'],
  'intro.map.1': ['На карте — Есиль, Алматы, Сарыарка, Байконур и Нура. У каждого района свои сильные стороны и свои незакрытые вопросы.', 'Картада — Есіл, Алматы, Сарыарқа, Байқоңыр және Нұра. Әр ауданның артықшылықтары мен шешілмеген мәселелері бар.', 'The map shows Esil, Almaty, Saryarka, Baikonur and Nura. Every district has strengths and unanswered needs.'],
  'intro.map.2': ['За одним показателем — ребёнок без места в школе. За другим — вечерний путь домой. Сегодня эти люди придут к вам.', 'Бір көрсеткіштің артында мектепте орны жоқ бала тұр. Басқасының артында — үйге қайтатын кешкі жол. Бүгін сол адамдар сізге келеді.', 'One indicator means a child without a school place. Another means the walk home at night. Today, those people will come to you.'],
  'intro.map.cta': ['Узнать условия дня', 'Күннің шарттарын білу', 'See today’s brief'],
  'intro.briefing.kicker': ['Пять часов полномочий', 'Бес сағаттық өкілеттік', 'Five hours in charge'],
  'intro.briefing.title': ['Сначала выслушать. Потом решить.', 'Алдымен тыңдау. Содан кейін шешу.', 'Listen first. Then decide.'],
  'intro.briefing.1': ['До 14:00 вам предстоят пять встреч и ровно пять решений. Общий бюджет — 100 условных единиц. На каждой встрече можно утвердить одну инициативу.', '14:00-ге дейін бес кездесу өткізіп, дәл бес шешім қабылдайсыз. Жалпы бюджет — 100 шартты бірлік. Әр кездесуде бір бастаманы бекітуге болады.', 'Before 14:00, you have five meetings and exactly five decisions. Your total budget is 100 units. Each meeting lets you approve one initiative.'],
  'intro.briefing.2': ['Слова жителей будут меняться вслед за вашим выбором. Но школы не строятся за один день: вечером увидим первые реакции, а модель отдельно покажет прогноз на два года.', 'Таңдауыңызға қарай тұрғындардың сөздері өзгереді. Бірақ мектеп бір күнде салынбайды: кешке алғашқы пікірлерді көреміз, ал модель екі жылдық болжамды бөлек көрсетеді.', 'Residents will respond to your choices. Schools are not built in a day: tonight brings first reactions, while the model separately shows a two-year forecast.'],
  'meeting.first.note': ['В приёмной ещё тихо. Это первое решение дня — остальные встречи начнутся уже с его последствиями для плана.', 'Қабылдау бөлмесі әзірге тыныш. Бұл күннің алғашқы шешімі — кейінгі кездесулер осы жоспарды ескереді.', 'The waiting room is still quiet. This first decision will shape the plan discussed at the remaining meetings.'],
  'meeting.eco.open': ['Дана входит с распечатанной картой Сарыарки. Она уже слышала, чем закончилась встреча с Айгуль.', 'Дана Сарыарқаның басылған картасымен кірді. Ол Айгүлмен кездесу қалай аяқталғанын естіп үлгерген.', 'Dana enters with a printed map of Saryarka. She has already heard how your meeting with Aigul ended.'],
  'meeting.eco.M7': ['«Школа в Нуре — важный шаг. Но детям нужен и воздух, которым можно дышать. У нас зимой пахнет дымом, а зелени мало».', '«Нұрадағы мектеп — маңызды қадам. Бірақ балаларға таза ауа да керек. Бізде қыста түтін иісі сезіледі, жасыл желек аз».', '“A school in Nura matters. But children also need air they can breathe. Our winters smell of smoke, and green space is scarce.”'],
  'meeting.eco.M8': ['«Вы выбрали поликлинику для Нуры. Я рада. А в Сарыарке люди спрашивают: можно ли заняться ещё и тем, чем мы дышим?»', '«Нұраға емхана таңдадыңыз. Қуаныштымын. Ал Сарыарқа тұрғындары: тыныстайтын ауамызға да назар аударуға бола ма деп сұрайды».', '“You chose a clinic for Nura. I am glad. In Saryarka, people are asking whether we can also address the air we breathe.”'],
  'meeting.eco.M9': ['«Спортивные дворы дают детям повод выйти на улицу. Но зимой в Сарыарке даже гулять не хочется: дым и мало зелени».', '«Спорт алаңдары балаларды далаға шығуға ынталандырады. Бірақ қыста Сарыарқада серуендеу қиын: түтін көп, жасыл желек аз».', '“Sports spaces give children a reason to go outside. But winter walks in Saryarka are not inviting: smoke and too little greenery.”'],
  'meeting.eco.ask': ['«Что выбираем для следующего шага: районный парк, чистое топливо или озеленение всего города?»', '«Келесі қадамға не таңдаймыз: аудандық саябақ, таза отын әлде бүкіл қаланы көгалдандыру ма?»', '“What comes next: a district park, cleaner fuel, or greening across the whole city?”'],
  'meeting.taxi.open': ['Марат кладёт ключи на край стола. Пока вы обсуждали экологию, он привёз в штаб следующего посетителя.', 'Марат кілтін үстел шетіне қойды. Сіз экологияны талқылап жатқанда, ол штабқа келесі келушіні алып келді.', 'Marat rests his keys on the desk. While you discussed the environment, he drove the next visitor to headquarters.'],
  'meeting.taxi.M4': ['«Про парк в Сарыарке уже говорят. Хорошо бы однажды добираться до таких мест без долгой пробки. В Алматы утром стоят и машины, и автобусы».', '«Сарыарқадағы саябақ туралы жұрт айтып жатыр. Сондай жерлерге ұзақ кептеліссіз жетсек жақсы. Алматыда таңертең көліктер де, автобустар да тұрады».', '“People are already talking about Saryarka’s park. It would be good to reach places like that without a long traffic jam. In Almaty, cars and buses both get stuck.”'],
  'meeting.taxi.M5': ['«На чистое топливо вы уже выделили серьёзную часть бюджета. С транспортом тоже тянуть трудно: в Алматы каждое утро теряем время в пробках».', '«Таза отынға бюджеттің елеулі бөлігін бөлдіңіз. Көлік мәселесін де созу қиын: Алматыда күн сайын таңертең кептелісте уақыт жоғалтамыз».', '“You have already committed a substantial part of the budget to cleaner fuel. Transport cannot wait forever either: every morning in Almaty we lose time in traffic.”'],
  'meeting.taxi.M6': ['«Озеленение пойдёт по всему городу — хорошая мысль. А транспорт сегодня тоже можно рассмотреть шире одного района. Хотя пробки Алматы мне особенно знакомы».', '«Бүкіл қаланы көгалдандыру — жақсы ой. Көлікке де бір ауданнан кеңірек қарауға болады. Дегенмен Алматының кептелісін ерекше жақсы білемін».', '“Greening the whole city makes sense. We can also think beyond one district for transport, though Almaty’s congestion is the part I know best.”'],
  'meeting.taxi.ask': ['«Выделим полосы автобусам в Алматы, настроим светофоры всего города или вложимся в LRT?»', '«Алматыда автобус жолақтарын бөлеміз бе, қала бағдаршамдарын реттейміз бе, әлде LRT-ге қаржы саламыз ба?»', '“Bus lanes in Almaty, adaptive traffic lights citywide, or an investment in LRT?”'],
  'meeting.safety.open': ['Серик Ахметов садится напротив вас. В руках у него блокнот с адресами переходов возле дома.', 'Серік Ахметов алдыңызға отырды. Қолында үйінің маңындағы өткелдер мекенжайлары жазылған қойын дәптер бар.', 'Serik Akhmetov sits opposite you, holding a notebook of crossing locations near his home.'],
  'meeting.safety.M1': ['«Слышал, автобусам в Алматы выделят полосы. А я в Нуре чаще хожу пешком. Вечером улица темнеет, и на переходе не по себе».', '«Алматыда автобустарға жолақ бөлінетінін естідім. Ал мен Нұрада көбіне жаяу жүремін. Кешке көше қараңғы, өткелде алаңдаймын».', '“I heard buses in Almaty will get their own lanes. I mostly walk around Nura. At night, the street is dark and the crossing feels uneasy.”'],
  'meeting.safety.M2': ['«Умные светофоры будут во всём городе — это касается и нас. Но возле моего дома в Нуре ещё нужны свет и удобный переход».', '«Ақылды бағдаршамдар бүкіл қалада болады — бұл бізге де қатысты. Бірақ Нұрадағы үйімнің маңына жарық пен қолайлы өткел де керек».', '“Citywide adaptive traffic lights include us too. But near my home in Nura, we still need light and a safer place to cross.”'],
  'meeting.safety.M3': ['«LRT в Алматы — большое дело, и ждать придётся долго. А по вечерней Нуре я хожу уже сейчас. Давайте не потеряем из виду обычный путь домой».', '«Алматыдағы LRT — үлкен іс, оны ұзақ күту керек. Ал мен кешкі Нұрада қазір жүрмін. Үйге қайтатын қарапайым жолды ұмытпайық».', '“LRT in Almaty is a big undertaking, with a long wait. I am walking through Nura every evening already. Let us keep the ordinary walk home in mind.”'],
  'meeting.safety.ask': ['«С чего начнём у нас: освещение и камеры или безопасные пешеходные переходы?»', '«Бізде неден бастаймыз: жарық пен камералардан ба, әлде қауіпсіз жаяу өткелдерден бе?»', '“Where do we start here: lighting and cameras, or safer pedestrian crossings?”'],
  'meeting.advisor.open': ['Алия возвращается с четырьмя листами — по одному на каждое ваше решение. «Остался городской сервис. Давайте свяжем этот день в один план».', 'Әлия төрт парақпен оралды — әр шешіміңізге бір парақ. «Қалалық қызметтер қалды. Бүгінгі шешімдерді бір жоспарға біріктірейік».', 'Aliya returns with four sheets, one for each decision. “City services are left. Let us bring today’s choices into one plan.”'],
  'meeting.advisor.M7': ['«В Нуре запланированы школа и детсад. Им, как поликлиникам и домам, нужны надёжные тепло- и водосети. Вопрос медицины сегодня остался без отдельного решения».', '«Нұрада мектеп пен балабақша жоспарланды. Емханалар мен үйлер сияқты оларға сенімді жылу мен су желілері керек. Бүгін медицинаға жеке шешім қабылданбады».', '“Nura has a school and kindergarten in the plan. Like clinics and homes, they need reliable heating and water. Healthcare did not receive its own decision today.”'],
  'meeting.advisor.M8': ['«Новую поликлинику для Нуры вы уже выбрали на встрече с Айгуль. Теперь важно помнить: медицинская помощь зависит и от обычных тепло- и водосетей».', '«Айгүлмен кездесуде Нұраға жаңа емхана таңдадыңыз. Енді медициналық көмектің қарапайым жылу мен су желілеріне де тәуелді екенін ескерейік».', '“You already chose a new clinic for Nura with Aigul. Now remember that healthcare also depends on ordinary heating and water networks.”'],
  'meeting.advisor.M9': ['«В Нуре пока запланированы спортивные дворы. Школа и поликлиника остаются отдельными задачами; сегодня мы обсуждали их с Айгуль, но выбрали другой шаг».', '«Нұрада әзірге спорт алаңдары жоспарланды. Мектеп пен емхана бөлек міндет болып қалады; оларды Айгүлмен талқыладық, бірақ басқа қадам таңдадық».', '“Nura has neighbourhood sports spaces in the plan. A school and clinic remain separate needs; we discussed them with Aigul, but chose another step.”'],
  'meeting.advisor.M4': ['«Для Сарыарки выбран парк.', '«Сарыарқа үшін саябақ таңдалды.', '“Saryarka has a park in the plan.'],
  'meeting.advisor.M5': ['«Для Сарыарки выбрано чистое топливо.', '«Сарыарқа үшін таза отын таңдалды.', '“Saryarka has cleaner fuel in the plan.'],
  'meeting.advisor.M6': ['«Озеленение охватит все районы.', '«Көгалдандыру барлық ауданға таралады.', '“The greening program will cover every district.'],
  'meeting.advisor.M1': ['А автобусные полосы — это ваш транспортный приоритет для Алматы».', 'Ал автобус жолақтары — Алматыдағы көлік бойынша басымдығыңыз».', 'And bus lanes are your transport priority for Almaty.”'],
  'meeting.advisor.M2': ['Адаптивные светофоры тоже запланированы для всего города».', 'Бейімделетін бағдаршамдар да бүкіл қалаға жоспарланған».', 'Adaptive traffic lights are also planned citywide.”'],
  'meeting.advisor.M3': ['На LRT в Алматы вы отвели крупную часть бюджета; последнее решение должно учитывать остаток».', 'Алматыдағы LRT-ге бюджеттің үлкен бөлігін бөлдіңіз; соңғы шешім қалдықты ескеруі керек».', 'You committed a large share of the budget to LRT in Almaty; the final decision must respect what remains.”'],
  'meeting.advisor.M10': ['«Освещение и камеры в Нуре могут работать вместе с цифровой платформой обращений — у этой пары есть дополнительный эффект. Но сети и аварийная служба тоже требуют внимания».', '«Нұрадағы жарық пен камералар өтініштердің цифрлық платформасымен бірге жұмыс істей алады — бұл жұптың қосымша әсері бар. Бірақ желілер мен апаттық қызметке де назар керек».', '“Nura’s lighting and cameras can work with a digital request platform: that pair has an additional effect. Networks and emergency services also need attention.”'],
  'meeting.advisor.M11': ['«Вы выбрали безопасные переходы в Нуре. Теперь решим, как город будет слышать обращения и справляться с коммунальными проблемами».', '«Нұрада қауіпсіз өткелдерді таңдадыңыз. Енді қаланың өтініштерді қалай қабылдап, коммуналдық мәселелерді қалай шешетінін анықтайық».', '“You chose safer crossings in Nura. Now let us decide how the city will hear requests and handle utility problems.”'],
  'lead.M7': ['Школа для Нуры уже в плане.', 'Нұра мектебі жоспарда бар.', 'Nura’s school is already in the plan.'],
  'lead.M8': ['Поликлиника для Нуры уже в плане.', 'Нұра емханасы жоспарда бар.', 'Nura’s clinic is already in the plan.'],
  'lead.M9': ['Спортивные дворы Нуры уже в плане.', 'Нұраның спорт алаңдары жоспарда бар.', 'Nura’s sports spaces are already in the plan.'],
  'lead.M4': ['Парк Сарыарки уже выбран.', 'Сарыарқа саябағы таңдалды.', 'Saryarka’s park has been chosen.'],
  'lead.M5': ['Средства на чистое топливо Сарыарки уже выделены.', 'Сарыарқаның таза отынына қаржы бөлінді.', 'Funding for Saryarka’s cleaner fuel is committed.'],
  'lead.M6': ['Озеленение всего города уже в плане.', 'Бүкіл қаланы көгалдандыру жоспарда бар.', 'Citywide greening is already in the plan.'],
  'lead.M1': ['Автобусные полосы Алматы уже в плане.', 'Алматының автобус жолақтары жоспарда бар.', 'Almaty’s bus lanes are already in the plan.'],
  'lead.M2': ['Светофоры всего города уже в плане.', 'Қала бағдаршамдары жоспарда бар.', 'Citywide traffic lights are already in the plan.'],
  'lead.M3': ['На LRT Алматы средства уже выделены.', 'Алматыдағы LRT-ге қаржы бөлінді.', 'Funding for Almaty’s LRT is committed.'],
  'lead.M10': ['Для Нуры выбраны освещение и камеры.', 'Нұраға жарық пен камералар таңдалды.', 'Lighting and cameras have been chosen for Nura.'],
  'lead.M11': ['Для Нуры выбраны безопасные переходы.', 'Нұраға қауіпсіз өткелдер таңдалды.', 'Safe crossings have been chosen for Nura.'],
  'context.M7': ['Новые учебные места — долгосрочное вложение. Остальные встречи потребуют части общего бюджета.', 'Жаңа оқу орындары — ұзақ мерзімді салым. Қалған кездесулерге де ортақ бюджеттен қаржы қажет.', 'New school places are a long-term investment. The remaining meetings also need part of the shared budget.'],
  'context.M8': ['Медицина получает приоритет, а вопрос школьных мест остаётся открытым.', 'Медицинаға басымдық беріледі, ал мектеп орындары мәселесі ашық қалады.', 'Healthcare takes priority, while the shortage of school places remains open.'],
  'context.M9': ['Небольшой шаг оставляет больше средств на другие встречи, но не заменяет школу или поликлинику.', 'Шағын қадам басқа кездесулерге көбірек қаржы қалдырады, бірақ мектеп пен емхананы алмастырмайды.', 'A smaller step leaves more for the other meetings, but does not replace a school or clinic.'],
  'context.M4': ['Парк планируется в Сарыарке: это отдельный район, а не участок социальной инициативы в Нуре.', 'Саябақ Сарыарқада жоспарланады: бұл Нұрадағы әлеуметтік бастаманың орны емес, басқа аудан.', 'The park is planned in Saryarka, a different district from Nura’s social initiative.'],
  'context.M5': ['Решение направлено на источники отопления Сарыарки; изменения воздуха потребуют времени.', 'Шешім Сарыарқаның жылу көздеріне бағытталған; ауаның өзгеруіне уақыт қажет.', 'This targets Saryarka’s heating sources; changes in air quality will take time.'],
  'context.M6': ['Городская мера расширяет охват плана на все пять районов, но зелень растёт постепенно.', 'Қалалық шара жоспарды барлық бес ауданға таратады, бірақ жасыл желек біртіндеп өседі.', 'A citywide measure extends the plan to all five districts, but greenery grows gradually.'],
  'context.M1': ['Автобусные полосы работают в Алматы. Развитие LRT вместо них в этот же сценарий не входит.', 'Автобус жолақтары Алматыда іске асады. Олардың орнына LRT дамыту осы сценарийге кірмейді.', 'The bus lanes serve Almaty. LRT expansion is an alternative and cannot join the same scenario.'],
  'context.M2': ['Светофоры затронут весь город; на следующей встрече можно отдельно обсудить безопасность Нуры.', 'Бағдаршамдар бүкіл қалаға әсер етеді; келесі кездесуде Нұра қауіпсіздігін жеке талқылауға болады.', 'Traffic lights affect the whole city; the next meeting can still address Nura’s safety specifically.'],
  'context.M3': ['Это крупное транспортное вложение с долгим запуском. После него ещё две встречи.', 'Бұл — іске қосылуы ұзақ ірі көлік салымы. Одан кейін тағы екі кездесу бар.', 'This is a major transport investment with a long launch time. Two meetings still follow.'],
  'context.M10': ['На последней встрече цифровая платформа сможет усилить это решение; выбор платформы остаётся за вами.', 'Соңғы кездесуде цифрлық платформа бұл шешімді күшейте алады; платформаны таңдау өз еркіңізде.', 'At the last meeting, a digital platform could strengthen this decision; that choice remains yours.'],
  'context.M11': ['Безопасность переходов в Нуре растёт в прогнозе, но показатель разгрузки дорог там немного снижается.', 'Болжамда Нұра өткелдерінің қауіпсіздігі артады, бірақ ондағы жол жүктемесін азайту көрсеткіші сәл төмендейді.', 'The forecast improves crossing safety in Nura, but slightly lowers its road congestion relief indicator.'],
  'context.M12': ['Платформа ускоряет обращения во всём городе. Она не обновляет сами сети.', 'Платформа бүкіл қаладағы өтініштерді жеделдетеді. Ол желілердің өзін жаңартпайды.', 'The platform speeds up requests citywide. It does not renew the networks themselves.'],
  'context.M12.synergy': ['Выбранные ранее освещение и камеры Нуры образуют с платформой предусмотренную моделью синергию.', 'Бұрын таңдалған Нұрадағы жарық пен камералар платформамен модельде көзделген синергия құрайды.', 'Nura’s previously chosen lighting and cameras form a modeled synergy with this platform.'],
  'context.M13': ['Обновление коммунальных сетей направлено на надёжность ЖКХ Нуры; перед работами предстоит подготовка проекта.', 'Коммуналдық желілерді жаңарту Нұра ТКШ сенімділігіне бағытталған; жұмыстар алдында жобаны дайындау қажет.', 'Utility network renewal targets Nura’s utility reliability; project preparation comes before the work.'],
  'context.M13.school': ['После выбора школы в Нуре это ещё одно вложение в тот же район — теперь в надёжность коммунальных сетей.', 'Нұрада мектеп таңдағаннан кейін бұл сол ауданға тағы бір салым — енді коммуналдық желілердің сенімділігіне.', 'After choosing a school in Nura, this is another investment in the same district, now in utility reliability.'],
  'context.M13.clinic': ['Поликлиника уже в плане Нуры. Обновление сетей отвечает на другой вопрос — надёжность ЖКХ этого района.', 'Емхана Нұра жоспарында бар. Желілерді жаңарту басқа мәселені — аудан ТКШ сенімділігін шешуге бағытталған.', 'Nura’s clinic is already in the plan. Network renewal addresses a different need: the district’s utility reliability.'],
  'context.M13.sport': ['Спортивные дворы остаются социальной мерой. Обновление сетей улучшает другой показатель — надёжность ЖКХ Нуры.', 'Спорт алаңдары әлеуметтік шара болып қалады. Желілерді жаңарту басқа көрсеткішті — Нұра ТКШ сенімділігін жақсартады.', 'Sports spaces remain the social measure. Network renewal improves a different indicator: Nura’s utility reliability.'],
  'context.M14': ['Аварийная служба охватит все районы, но долгосрочную замену сетей не подменяет.', 'Апаттық қызмет барлық ауданды қамтиды, бірақ желілерді ұзақ мерзімді ауыстыруды алмастырмайды.', 'Emergency services cover every district, but do not replace long-term network renewal.'],
  'reply.M12.synergy': ['Свяжем освещение и камеры Нуры с городской цифровой платформой обращений.', 'Нұраның жарығы мен камераларын қалалық цифрлық өтініштер платформасымен байланыстырамыз.', 'Connect Nura’s lighting and cameras with a citywide digital request platform.'],
  'reply.M13.school': ['После решения о школе модернизируем коммунальные сети Нуры.', 'Мектеп туралы шешімнен кейін Нұраның коммуналдық желілерін жаңғыртамыз.', 'After the school decision, modernize Nura’s utility networks.'],
  'reply.M13.clinic': ['В дополнение к поликлинике модернизируем коммунальные сети Нуры.', 'Емханаға қосымша Нұраның коммуналдық желілерін жаңғыртамыз.', 'Alongside the clinic, modernize Nura’s utility networks.'],
  'reply.M13.sport': ['Следующим вложением в Нуру станет модернизация коммунальных сетей.', 'Нұраға келесі салым коммуналдық желілерді жаңғырту болады.', 'Make utility modernization our next investment in Nura.'],
  'ack.M7': ['«Я сообщу родителям: школа и детсад вошли в план. До открытия ещё работа, но теперь есть решение».', '«Ата-аналарға айтамын: мектеп пен балабақша жоспарға енді. Ашылуына дейін жұмыс көп, бірақ шешім бар».', '“I will tell the parents: the school and kindergarten are in the plan. There is work before they open, but now we have a decision.”'],
  'ack.M8': ['«Расскажу семьям о решении по поликлинике. И отдельно сохраню обращения о школьных местах — этот вопрос не исчез».', '«Отбасыларға емхана туралы шешімді айтамын. Мектеп орындары жайлы өтініштерді де сақтаймын — бұл мәселе жойылған жоқ».', '“I will tell families about the clinic decision. I will also keep their requests for school places; that need has not disappeared.”'],
  'ack.M9': ['«Попрошу родителей отметить дворы для обсуждения. Заодно объясню: спортивные площадки — первый шаг, не готовое решение всех проблем».', '«Ата-аналардан талқылауға аулаларды белгілеуді сұраймын. Спорт алаңдары — алғашқы қадам, барлық мәселенің дайын шешімі емес екенін түсіндіремін».', '“I will ask parents to suggest courtyards for discussion. I will also explain that sports spaces are a first step, not a complete answer.”'],
  'ack.M4': ['«Принесу предложения жителей по будущему парку. Сначала обсудим место и проект, а уже потом появится зелёная зона».', '«Болашақ саябақ туралы тұрғындар ұсыныстарын әкелемін. Алдымен орны мен жобасын талқылаймыз, содан кейін жасыл аймақ пайда болады».', '“I will bring residents’ suggestions for the future park. First we discuss the site and design; the green space comes later.”'],
  'ack.M5': ['«Соберу вопросы жителей к переходу на чистое топливо. Сегодня воздух не изменился, но мы договорились, с чего начать».', '«Таза отынға көшу туралы тұрғындар сұрақтарын жинаймын. Бүгін ауа өзгерген жоқ, бірақ неден бастайтынымызды келістік».', '“I will collect residents’ questions about cleaner fuel. The air has not changed today, but we have agreed where to start.”'],
  'ack.M6': ['«Приглашу представителей районов обсудить программу. Всем хочется тени и зелени; теперь предстоит долгая работа».', '«Аудан өкілдерін бағдарламаны талқылауға шақырамын. Бәрі көлеңке мен жасыл желек қалайды; енді ұзақ жұмыс күтіп тұр».', '“I will invite district representatives to discuss the program. Everyone wants shade and greenery; now the long work begins.”'],
  'ack.M1': ['«Передам водителям новость. Вопросов про полосы будет много — давайте начнём с понятного обсуждения маршрутов».', '«Жүргізушілерге жаңалықты жеткіземін. Жолақтар туралы сұрақ көп болады — маршруттарды түсінікті талқылаудан бастайық».', '“I will tell the drivers. There will be questions about the lanes; let us start with a clear discussion of routes.”'],
  'ack.M2': ['«Отмечу перекрёстки, где чаще теряем время. До настройки светофоров ещё далеко, но у команды будет с чего начать».', '«Көбіне уақыт жоғалтатын қиылыстарды белгілеймін. Бағдаршамдарды реттеуге дейін уақыт бар, бірақ команда неден бастау керегін біледі».', '“I will mark the intersections where we lose the most time. The signals are not adjusted yet, but the team will have a starting point.”'],
  'ack.M3': ['«Люди спросят про сроки и маршруты. Скажу честно: сегодня принято решение, а не открыта линия».', '«Жұрт мерзімдер мен маршруттарды сұрайды. Шынын айтамын: бүгін шешім қабылданды, желі ашылған жоқ».', '“People will ask about dates and routes. I will be honest: today brought a decision, not an open line.”'],
  'ack.M10': ['«Оставлю адреса тёмных участков. Сегодня пойду прежней дорогой, но буду знать, что вы услышали нас».', '«Қараңғы жерлердің мекенжайларын қалдырамын. Бүгін бұрынғы жолмен қайтамын, бірақ бізді тыңдағаныңызды білемін».', '“I will leave the locations of the dark stretches. Tonight I will walk the same road, knowing that you heard us.”'],
  'ack.M11': ['«Передам список переходов и поговорю с соседями. Хорошо, что пешеходов тоже включили в план».', '«Өткелдер тізімін беріп, көршілермен сөйлесемін. Жаяу жүргіншілер де жоспарға енгені жақсы».', '“I will hand over the list of crossings and talk to my neighbours. I am glad pedestrians are part of the plan too.”'],
  'ack.M12': ['«Запишу требования к платформе: жителю должно быть понятно, куда попало обращение. Сегодня это задача для команды, не запущенный сервис».', '«Платформа талаптарын жазамын: тұрғын өтінішінің қайда түскенін білуі керек. Бүгін бұл іске қосылған сервис емес, командаға берілген міндет».', '“I will note the platform requirements: residents should know where their request went. Today it is a task for the team, not a launched service.”'],
  'ack.M13': ['«Передам решение специалистам по сетям Нуры. Сначала обследование и проектирование — обещать мгновенные перемены нельзя».', '«Шешімді Нұра желілерінің мамандарына жеткіземін. Алдымен тексеру мен жобалау — лезде өзгеріс болады деп уәде бере алмаймыз».', '“I will pass the decision to Nura’s utility specialists. Surveying and design come first; we cannot promise instant change.”'],
  'ack.M14': ['«Начнём обсуждение организации аварийной службы. Быстрый ответ важен, но не отменяет будущего обновления сетей».', '«Апаттық қызметті ұйымдастыруды талқылауды бастаймыз. Жылдам жауап маңызды, бірақ болашақта желілерді жаңартуды жоққа шығармайды».', '“We will start discussing how to organize the emergency service. A quick response matters, but future network renewal still needs attention.”'],
  'ackChain.M7': ['В дневном плане рядом остаются школа и детсад Нуры.', 'Күн жоспарында Нұраның мектебі мен балабақшасы да қалады.', 'Nura’s school and kindergarten remain alongside it in today’s plan.'],
  'ackChain.M8': ['Решение по поликлинике Нуры остаётся в дневном плане.', 'Нұра емханасы туралы шешім күн жоспарында қалады.', 'Nura’s clinic decision remains part of today’s plan.'],
  'ackChain.M9': ['Команда сохраняет в плане и выбранные ранее спортивные дворы Нуры.', 'Команда бұрын таңдалған Нұра спорт алаңдарын да жоспарда сақтайды.', 'The team also keeps Nura’s earlier sports-space decision in the plan.'],
  'ackChain.M4': ['Подготовку парка Сарыарки продолжают обсуждать отдельно.', 'Сарыарқа саябағын дайындауды бөлек талқылау жалғасады.', 'Preparation for Saryarka’s park remains a separate discussion.'],
  'ackChain.M5': ['Выделенные на чистое топливо Сарыарки средства остаются частью общего плана.', 'Сарыарқаның таза отынына бөлінген қаржы ортақ жоспарда қалады.', 'The cleaner-fuel commitment for Saryarka remains part of the shared plan.'],
  'ackChain.M6': ['Городское озеленение остаётся ещё одной общей задачей команды.', 'Қаланы көгалдандыру команданың тағы бір ортақ міндеті болып қалады.', 'Citywide greening remains another shared task for the team.'],
  'ackChain.M1': ['При этом транспортный проект автобусных полос остаётся в Алматы.', 'Бұл ретте автобус жолақтарының көлік жобасы Алматыда қалады.', 'The bus-lane transport project remains in Almaty.'],
  'ackChain.M2': ['Команда отметит это решение рядом с планом адаптивных светофоров.', 'Команда бұл шешімді бейімделетін бағдаршамдар жоспарымен қатар белгілейді.', 'The team will record this decision alongside the adaptive traffic light plan.'],
  'ackChain.M3': ['Обсуждение LRT Алматы продолжится своим чередом; Нура тоже получила внимание.', 'Алматыдағы LRT талқылауы өз ретімен жалғасады; Нұраға да назар аударылды.', 'Almaty’s LRT discussion will continue on its own track; Nura has also been heard.'],
  'ackChain.M10': ['В итоговом плане остаётся отдельное решение об освещении и камерах Нуры.', 'Қорытынды жоспарда Нұраның жарығы мен камералары туралы жеке шешім қалады.', 'The final plan retains the separate lighting and camera decision for Nura.'],
  'ackChain.M11': ['В итоговом плане остаётся отдельное решение о переходах Нуры.', 'Қорытынды жоспарда Нұра өткелдері туралы жеке шешім қалады.', 'The final plan retains the separate decision about Nura’s crossings.'],
  'ack.M12.synergy': ['«Поручу обсуждать платформу вместе с командой освещения Нуры. Сегодня согласуем связь проектов; дополнительный эффект появится только в прогнозе».', '«Платформаны Нұраны жарықтандыру командасымен бірге талқылауды тапсырамын. Бүгін жобалардың байланысын келісеміз; қосымша әсер тек болжамда көрінеді».', '“I will ask the platform and Nura lighting teams to discuss their projects together. Today we agree the connection; the added effect belongs to the forecast.”'],
  'transition.M7.title': ['В родительском чате появляется надежда', 'Ата-аналар чатында үміт пайда болды', 'Hope arrives in the parents’ chat'],
  'transition.M7.body': ['Айгуль пишет родителям о школе и детсаде в плане Нуры. В ответ приходят вопросы о месте и сроках. В штабе открывают папку для подготовки проекта.', 'Айгүл ата-аналарға Нұра жоспарындағы мектеп пен балабақша туралы жазды. Олардың орны мен мерзімі жайлы сұрақтар келді. Штабта жобаны дайындау үшін папка ашылды.', 'Aigul tells parents about the school and kindergarten in Nura’s plan. Questions arrive about location and timing. Headquarters opens a project preparation folder.'],
  'transition.M8.title': ['Два списка на столе Айгуль', 'Айгүлдің үстеліндегі екі тізім', 'Two lists on Aigul’s desk'],
  'transition.M8.body': ['Один список — вопросы к будущей поликлинике. Другой — обращения о местах в школе. Айгуль не убирает второй: сегодняшнее решение помогло выбрать приоритет, но не закрыло всё сразу.', 'Бір тізім — болашақ емханаға қатысты сұрақтар. Екіншісі — мектеп орындары туралы өтініштер. Айгүл екіншісін алып тастамады: бүгін басымдық таңдалды, бірақ бәрі бірден шешілген жоқ.', 'One list holds questions about the future clinic. The other holds requests for school places. Aigul keeps both: today established a priority, not a solution to everything.'],
  'transition.M9.title': ['На карте появляются детские пометки', 'Картада балалардың белгілері пайда болды', 'Children add marks to the map'],
  'transition.M9.body': ['Родители обсуждают, какие дворы предложить для спортивных площадок. Кто-то напоминает о школе. Айгуль обещает сохранить и эти вопросы в городской повестке.', 'Ата-аналар спорт алаңдарына қай аулаларды ұсынуды талқылады. Біреу мектепті еске салды. Айгүл бұл сұрақтарды да қала күн тәртібінде қалдыруға уәде берді.', 'Parents discuss which courtyards to propose for sports spaces. Someone brings up the school. Aigul promises to keep those questions on the city’s agenda too.'],
  'transition.M4.title': ['Парк пока существует на бумаге', 'Саябақ әзірге қағазда', 'For now, the park is on paper'],
  'transition.M4.body': ['Дана раскладывает предложения жителей Сарыарки. На листах — дорожки, тень и места для отдыха. За окном всё по-прежнему; работа начинается с обсуждения проекта.', 'Дана Сарыарқа тұрғындарының ұсыныстарын жайды. Парақтарда жолдар, көлеңке және демалыс орындары бар. Терезе сыртында бәрі бұрынғыдай; жұмыс жобаны талқылаудан басталады.', 'Dana lays out Saryarka residents’ suggestions: paths, shade and places to rest. Outside, the city is unchanged. Work starts with discussing the design.'],
  'transition.M5.title': ['Вместо спора — первые вопросы', 'Даудың орнына — алғашқы сұрақтар', 'The argument turns into questions'],
  'transition.M5.body': ['В обсуждении Сарыарки спрашивают, как будет устроен переход на чистое топливо. Дана собирает вопросы для специалистов. Дым не исчез сегодня, но появился предметный разговор.', 'Сарыарқа талқылауында таза отынға көшу қалай өтетінін сұрады. Дана мамандарға арналған сұрақтарды жинады. Түтін бүгін жоғалған жоқ, бірақ нақты әңгіме басталды.', 'Saryarka residents ask how the cleaner-fuel transition would work. Dana gathers questions for specialists. The smoke has not gone today, but the conversation has become concrete.'],
  'transition.M6.title': ['Пять районов на одном листе', 'Бір парақтағы бес аудан', 'Five districts on one page'],
  'transition.M6.body': ['Дана отправляет приглашение обсудить городское озеленение. В штабе отмечают предложения всех пяти районов. Пока это будущая программа, а не новые деревья за окном.', 'Дана қаланы көгалдандыруды талқылауға шақыру жіберді. Штабта барлық бес ауданның ұсыныстары белгіленді. Әзірге бұл терезе сыртындағы жаңа ағаштар емес, болашақ бағдарлама.', 'Dana invites people to discuss citywide greening. Headquarters records suggestions from all five districts. For now, it is a future program, not new trees outside.'],
  'transition.M1.title': ['Водители обсуждают новую схему', 'Жүргізушілер жаңа сызбаны талқылайды', 'Drivers discuss a new road layout'],
  'transition.M1.body': ['Марат пересказывает решение коллегам. Одни спрашивают про автобусы, другие — про оставшиеся полосы. Команда собирает вопросы для будущей схемы движения Алматы.', 'Марат шешімді әріптестеріне жеткізді. Бірі автобустарды, бірі қалған жолақтарды сұрады. Команда Алматының болашақ қозғалыс сызбасы үшін сұрақтарды жинады.', 'Marat tells his colleagues. Some ask about the buses; others ask about the remaining lanes. The team collects questions for Almaty’s future traffic layout.'],
  'transition.M2.title': ['Красные точки на карте перекрёстков', 'Қиылыстар картасындағы қызыл нүктелер', 'Red dots on the intersection map'],
  'transition.M2.body': ['Марат отмечает перекрёстки, где чаще всего застревает. К его списку добавляют предложения других районов. Светофоры пока работают по-старому — начинается подготовка.', 'Марат жиі кептелетін қиылыстарды белгіледі. Тізіміне басқа аудандардың ұсыныстары қосылды. Бағдаршамдар әзірге бұрынғыдай жұмыс істейді — дайындық басталды.', 'Marat marks the intersections where he gets stuck most often. Other districts add suggestions. The signals still run as before; preparation is beginning.'],
  'transition.M3.title': ['Большой проект, длинный список вопросов', 'Үлкен жоба, ұзын сұрақтар тізімі', 'A large project and a long list of questions'],
  'transition.M3.body': ['В приёмную приходят первые вопросы о LRT Алматы: маршрут, сроки, этапы. Марат просит команду объяснять их открыто. Ни один поезд ещё не вышел на новую линию.', 'Қабылдауға Алматыдағы LRT туралы алғашқы сұрақтар келді: маршрут, мерзім, кезеңдер. Марат командадан оларды ашық түсіндіруді сұрады. Жаңа желіге әлі бір де бір пойыз шыққан жоқ.', 'The first questions about Almaty’s LRT arrive: route, dates and stages. Marat asks the team to explain them openly. No train has entered a new line yet.'],
  'transition.M10.title': ['Серик оставляет свой блокнот', 'Серік қойын дәптерін қалдырды', 'Serik leaves his notebook'],
  'transition.M10.body': ['В блокноте — тёмные участки Нуры. Серик просит начать обсуждение с них. Сегодня фонари ещё прежние, но его наблюдения стали частью подготовки проекта.', 'Дәптерде Нұраның қараңғы жерлері жазылған. Серік талқылауды солардан бастауды сұрады. Бүгін шамдар бұрынғыдай, бірақ оның бақылаулары жоба дайындығына енді.', 'The notebook lists dark stretches of Nura. Serik asks the team to begin there. Tonight’s lamps are unchanged, but his observations are now part of project preparation.'],
  'transition.M11.title': ['У перехода собираются соседи', 'Өткелдің жанында көршілер жиналды', 'Neighbours gather by the crossing'],
  'transition.M11.body': ['Серик рассказывает соседям о решении и собирает замечания к переходам. Люди спорят об удобстве для пешеходов и машин. Разметка пока не изменилась — началось обсуждение.', 'Серік көршілеріне шешімді айтып, өткелдер туралы ескертулерді жинады. Жұрт жаяу жүргіншілер мен көліктерге қолайлылықты талқылады. Жол белгілері әлі өзгерген жоқ — талқылау басталды.', 'Serik tells his neighbours and gathers comments about the crossings. People debate convenience for pedestrians and drivers. The markings have not changed; the discussion has begun.'],
  'transition.M12.title': ['У обращения появится понятный путь', 'Өтініштің жолы түсінікті болады', 'Giving every request a clear path'],
  'transition.M12.body': ['Алия рисует на доске путь обращения: от жителя до ответственной службы. Команда обсуждает требования к платформе. Пока это схема будущего сервиса.', 'Әлия тақтаға өтініштің жолын сызды: тұрғыннан жауапты қызметке дейін. Команда платформа талаптарын талқылады. Әзірге бұл болашақ сервистің сызбасы.', 'Aliya sketches a request’s journey from resident to responsible service. The team discusses platform requirements. For now, it is the outline of a future service.'],
  'transition.M13.title': ['Последняя папка — сети Нуры', 'Соңғы папка — Нұра желілері', 'The final folder: Nura’s networks'],
  'transition.M13.body': ['Алия передаёт специалистам решение о модернизации сетей Нуры. В план подготовки добавляют обследование и проектирование. Никаких мгновенных ремонтов: работа ещё впереди.', 'Әлия мамандарға Нұра желілерін жаңғырту шешімін жеткізді. Дайындық жоспарына тексеру мен жобалау қосылды. Лезде жөндеу болған жоқ: жұмыс әлі алда.', 'Aliya passes the Nura network renewal decision to specialists. Surveying and design enter the preparation plan. There are no instant repairs; the work is still ahead.'],
  'transition.M14.title': ['Кого позовут, если случится авария?', 'Апат болса, кімді шақырады?', 'Who gets the call when something fails?'],
  'transition.M14.body': ['Алия собирает предложения к работе аварийной службы: приём сигналов, связь с бригадами, информирование жителей. Сегодня согласован приоритет, а не создана готовая служба.', 'Әлия апаттық қызметке ұсыныстар жинады: хабар қабылдау, бригадалармен байланыс, тұрғындарды ақпараттандыру. Бүгін басымдық келісілді, дайын қызмет құрылған жоқ.', 'Aliya collects proposals for the emergency service: receiving alerts, contacting crews and informing residents. Today established a priority, not a fully staffed service.'],
  'closing.title': ['Вечер. Город ещё прежний — разговор уже другой.', 'Кеш. Қала әлі бұрынғыдай — әңгіме өзгерді.', 'Evening. The city looks the same. The conversation has changed.'],
  'closing.open': ['18:40. Пять часов полномочий давно закончились. Вы снова в лаборатории и закрываете последнюю папку.', '18:40. Бес сағаттық өкілеттік әлдеқашан аяқталды. Сіз зертханаға оралып, соңғы папканы жабасыз.', '18:40. Your five hours in charge are long over. Back at the laboratory, you close the last folder.'],
  'closing.M10': ['От Серика пришло сообщение: он идёт домой по прежней тёмной улице. Но сегодня передал адреса команде и рассказал соседям о решении по освещению и камерам.', 'Серіктен хабар келді: ол бұрынғы қараңғы көшемен үйіне қайтып барады. Бірақ бүгін мекенжайларды командаға беріп, көршілеріне жарық пен камералар туралы шешімді айтты.', 'Serik has sent a message: he is walking home down the same dark street. But today he handed locations to the team and told his neighbours about the lighting and camera decision.'],
  'closing.M11': ['От Серика пришло сообщение: переход пока такой же. Он собрал замечания соседей и просит не забыть о пешеходах, когда начнётся проектирование.', 'Серіктен хабар келді: өткел әлі бұрынғыдай. Ол көршілердің ескертулерін жинап, жобалау басталғанда жаяу жүргіншілерді ұмытпауды сұрады.', 'Serik has sent a message: the crossing is still the same. He collected his neighbours’ comments and asks that pedestrians stay in focus when design begins.'],
  'closing.M7': ['Айгуль отправила родителям новость о школе и детсаде. Рядом с благодарностями уже стоят вопросы о сроках — ваши решения стали обещаниями, за которыми будут следить.', 'Айгүл ата-аналарға мектеп пен балабақша туралы жаңалық жіберді. Алғыстармен қатар мерзімдер жайлы сұрақтар бар — шешімдеріңіз енді жұрт бақылайтын уәделерге айналды.', 'Aigul shared the school and kindergarten news with parents. Thanks are already accompanied by questions about timing: your decisions are promises people will watch.'],
  'closing.M8': ['Айгуль сообщила о будущей поликлинике. А в её записной книжке остался вопрос о школе: один принятый приоритет не отменил другие нужды.', 'Айгүл болашақ емхана туралы хабарлады. Ал дәптерінде мектеп мәселесі қалды: бір басымдықтың қабылдануы басқа қажеттіліктерді жоймайды.', 'Aigul shared the future clinic decision. The school question remains in her notebook: choosing one priority did not erase the others.'],
  'closing.M9': ['Айгуль прислала первые предложения по спортивным дворам. Семьи включились в обсуждение, хотя места в школе и доступность врача остаются отдельными вопросами.', 'Айгүл спорт алаңдары туралы алғашқы ұсыныстарды жіберді. Отбасылар талқылауға қосылды, бірақ мектеп орындары мен дәрігер қолжетімділігі бөлек мәселе болып қалды.', 'Aigul sent the first suggestions for sports spaces. Families joined the discussion, while school places and access to a doctor remain separate questions.'],
  'closing.M12.synergy': ['Алия отдельно отметила связку освещения Нуры с платформой обращений. В модели она даст дополнительный эффект; сегодня команда лишь согласовала, что эти проекты нужно обсуждать вместе.', 'Әлия Нұраның жарықтандыруы мен өтініштер платформасының байланысын бөлек белгіледі. Модельде ол қосымша әсер береді; бүгін команда бұл жобаларды бірге талқылауды ғана келісті.', 'Aliya highlighted the link between Nura’s lighting and the request platform. It adds an effect in the model; today, the team only agreed to discuss the projects together.'],
  'closing.M12': ['На доске Алии осталась схема будущей платформы обращений. Теперь важно, чтобы жители однажды увидели за ней понятную работу служб.', 'Әлияның тақтасында болашақ өтініштер платформасының сызбасы қалды. Енді тұрғындар оның артынан қызметтердің түсінікті жұмысын көруі маңызды.', 'Aliya’s board still shows the future request platform. What matters next is that residents eventually see clear service behind it.'],
  'closing.M13': ['В папке Нуры теперь есть задание специалистам по коммунальным сетям. До результатов ещё время; вечером это пока план работы и ответственность за него.', 'Нұра папкасында енді коммуналдық желі мамандарына тапсырма бар. Нәтижеге дейін уақыт қажет; кешке бұл әзірге жұмыс жоспары мен оған жауапкершілік.', 'Nura’s folder now contains a brief for utility specialists. Results will take time; tonight, it is a work plan and a responsibility.'],
  'closing.M14': ['Алия завершает список вопросов к аварийной службе. Быстрый ответ жителям ещё предстоит организовать — решение обозначило направление этой работы.', 'Әлия апаттық қызметке сұрақтар тізімін аяқтап жатыр. Тұрғындарға жылдам жауапты әлі ұйымдастыру керек — шешім осы жұмыстың бағытын белгіледі.', 'Aliya is finishing the questions for the emergency service. A faster response still needs to be organized; the decision set its direction.'],
  'closing.last': ['За окном не выросли новые здания и не исчезли пробки. Изменилось другое: у города появился ваш план. Его возможный результат на два года вперёд — в прогнозе ниже.', 'Терезе сыртында жаңа ғимараттар бой көтерген жоқ, кептеліс те жоғалмады. Өзгергені басқа: қаланың сіз жасаған жоспары бар. Оның екі жылдық ықтимал нәтижесі төмендегі болжамда.', 'No new buildings have appeared outside, and traffic has not vanished. Something else changed: the city has your plan. Its possible two-year result is in the forecast below.'],
};

const column = language => language === 'kk' ? 1 : language === 'en' ? 2 : 0;
const say = (key, language) => copy[key]?.[column(language)] || '';
const safeChoices = choices => Array.isArray(choices) ? choices : [];
const selectedBefore = (choices, step) => new Set(storyDecisions(safeChoices(choices).slice(0, step)).map(decision => decision.initiativeId));
const firstSelected = (selected, candidates) => candidates.find(id => selected.has(id));

export function narrativeText(key, language = 'ru', vars = {}) {
  const template = Object.hasOwn(words, key) ? words[key][column(language)] : String(key);
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => vars && Object.hasOwn(vars, name) ? String(vars[name]) : placeholder);
}

export function getIntro(language = 'ru') {
  const advisor = getStory(language)[4];
  return [
    { id: 'ordinary-morning', time: '08:15', type: 'morning', visual: 'lab' },
    { id: 'urgent-call', time: '08:27', type: 'call', visual: 'call', portrait: 4, speaker: advisor.name },
    { id: 'city-map', time: '08:40', type: 'map', visual: 'map' },
    { id: 'five-hours', time: '08:55', type: 'briefing', visual: 'briefing', portrait: 4, speaker: advisor.name },
  ].map(({ type, ...scene }) => ({
    ...scene,
    kicker: say(`intro.${type}.kicker`, language),
    title: say(`intro.${type}.title`, language),
    lines: [say(`intro.${type}.1`, language), say(`intro.${type}.2`, language)],
    cta: type === 'briefing' ? narrativeText('enter', language) : say(`intro.${type}.cta`, language),
  }));
}

function choiceContext(id, previous, language) {
  if (id === 'M12' && previous.has('M10')) return say('context.M12.synergy', language);
  if (id === 'M13' && firstSelected(previous, ['M7', 'M8', 'M9'])) return say(`context.M13.${previous.has('M7') ? 'school' : previous.has('M8') ? 'clinic' : 'sport'}`, language);
  return say(`context.${id}`, language);
}

export function getMeeting(step, choices = [], language = 'ru', data) {
  if (!Number.isInteger(step) || step < 0 || step >= 5) return null;
  const meeting = getStory(language)[step];
  const previous = selectedBefore(choices, step);
  const social = firstSelected(previous, ['M7', 'M8', 'M9']);
  const green = firstSelected(previous, ['M4', 'M5', 'M6']);
  const transport = firstSelected(previous, ['M1', 'M2', 'M3']);
  const safety = firstSelected(previous, ['M10', 'M11']);
  const previousId = [null, social, green, transport, safety][step];
  const lead = previousId ? say(`lead.${previousId}`, language) : '';
  if (step === 1 && social) meeting.lines = [say('meeting.eco.open', language), say(`meeting.eco.${social}`, language), say('meeting.eco.ask', language)];
  if (step === 2 && green) meeting.lines = [say('meeting.taxi.open', language), say(`meeting.taxi.${green}`, language), say('meeting.taxi.ask', language)];
  if (step === 3 && transport) meeting.lines = [say('meeting.safety.open', language), say(`meeting.safety.${transport}`, language), say('meeting.safety.ask', language)];
  if (step === 4 && social && green && transport && safety) meeting.lines = [
    say('meeting.advisor.open', language),
    say(`meeting.advisor.${social}`, language),
    `${say(`meeting.advisor.${green}`, language)} ${say(`meeting.advisor.${transport}`, language)}`,
    say(`meeting.advisor.${safety}`, language),
  ];
  meeting.cityNote = step === 0 ? say('meeting.first.note', language)
    : step === 4 ? [social, green, transport, safety].filter(Boolean).map(id => say(`lead.${id}`, language)).join(' ')
      : lead;
  meeting.choices = meeting.choices.map(choice => {
    let reply = choice.reply;
    if (choice.initiativeId === 'M12' && previous.has('M10')) reply = say('reply.M12.synergy', language);
    if (choice.initiativeId === 'M13' && social) reply = say(`reply.M13.${previous.has('M7') ? 'school' : previous.has('M8') ? 'clinic' : 'sport'}`, language);
    const acknowledgement = choice.initiativeId === 'M12' && previous.has('M10') ? say('ack.M12.synergy', language) : say(`ack.${choice.initiativeId}`, language);
    return {
      ...choice,
      reply,
      acknowledgement: [acknowledgement, previousId ? say(`ackChain.${previousId}`, language) : ''].filter(Boolean).join(' '),
      context: choiceContext(choice.initiativeId, previous, language),
    };
  });
  return meeting;
}

export function getTransition(step, choices = [], language = 'ru', data) {
  const prefix = safeChoices(choices).slice(0, step + 1);
  if (!Number.isInteger(step) || step < 0 || step >= 5 || prefix.length !== step + 1) return null;
  const decisions = storyDecisions(prefix);
  if (decisions.length !== step + 1) return null;
  const meeting = getMeeting(step, prefix, language, data);
  const chosen = meeting.choices[prefix[step]];
  const id = chosen.initiativeId;
  return {
    id: `after-${id.toLowerCase()}`,
    time: ['09:40', '10:40', '11:40', '12:40', '14:00'][step],
    kicker: narrativeText('transition', language),
    title: say(`transition.${id}.title`, language),
    lines: [say(`transition.${id}.body`, language), chosen.acknowledgement],
    visual: step === 4 ? 'briefing' : step === 1 || step === 2 ? 'map' : 'lab',
    portrait: meeting.portrait,
    speaker: meeting.name,
    cta: narrativeText(step === 4 ? 'ending' : 'nextMeeting', language),
    cityNote: chosen.context,
  };
}

export function getClosing(choices = [], language = 'ru') {
  const selected = selectedBefore(choices, 5);
  const social = firstSelected(selected, ['M7', 'M8', 'M9']);
  const safety = firstSelected(selected, ['M10', 'M11']);
  const services = firstSelected(selected, ['M12', 'M13', 'M14']);
  const serviceKey = services === 'M12' && selected.has('M10') ? 'M12.synergy' : services;
  return {
    title: say('closing.title', language),
    lines: [
      say('closing.open', language),
      safety ? say(`closing.${safety}`, language) : '',
      social ? say(`closing.${social}`, language) : '',
      serviceKey ? say(`closing.${serviceKey}`, language) : '',
      say('closing.last', language),
    ].filter(Boolean),
  };
}
