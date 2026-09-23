# Akim for 5 Hours

A city decision simulator for the Astana Innovations hackathon by **Seniors**. Every player starts with the same synthetic data and **100 budget units**. Choose exactly **five initiatives**, inspect the Astana Quality of Life Score, and explore the trade-offs. This is an educational model, not a forecast of actual conditions in Astana.

[Russian project description](README.ru.md) | [Deployment guide in Russian](DEPLOY.ru.md)

## Quick start

Requires **Python 3.10+** and a modern browser. No third-party Python packages, database, Node.js or build step are needed to run the app.

```bash
python server.py
```

On Windows, use `py server.py` if needed. Open **http://127.0.0.1:8080**. Do not open `public/index.html` directly: the interface uses the server API. Stop with Ctrl+C.

The default host is `127.0.0.1`. Override it with `--host`; set the port with `--port` or the `PORT` environment variable (default 8080).

## Two-minute demo

1. Start a game: budget 100, baseline Score **52.56**, zero of five decisions.
2. Select initiatives and districts. City-wide initiatives do not require a district.
3. Inspect the map and current/forecast indicators as your choices change.
4. Load the reference example: M7, M8 and M10 in Nura, M12 city-wide, M5 in Saryarka. Cost: **95**. Score: **56.54**.
5. Evaluate the scenario to see strengths, risks, district changes and recommendations.
6. In the report, click **Show the best plan** to see the optimal five decisions, their districts and the gap between your Score and the optimum.
7. Export JSON or print the report, including to PDF through your browser. Change decisions and compare saved scenarios.

Drafts and up to 12 distinct recent reports are stored in this browser's `localStorage`; there is no shared leaderboard. Settings include Russian, Kazakh and English, sound volume/mute, and game brightness. Language changes apply to the interface and new reports; saved report text and user names remain unchanged. Brightness affects the app, not the monitor or printout. Sounds start after user interaction. Exiting preserves the draft.

## Optional AI

## Сюжетный режим

1. Откройте приложение и нажмите **«Начать игру»**: откроется сюжет **«Один день, чтобы спасти район»**. Бюджет — **100**, базовый Score — **52,56**.
2. Пройдите пять встреч: прочитайте диалог, выберите ответ справа и нажмите **«Подтвердить решение»**. После реакции персонажа переходите к следующей встрече.
3. После пятого решения нажмите **«Завершить день»**. Эпилог покажет Score, улучшения, критические показатели и инициативы, оставшиеся без финансирования.
4. Нажмите **«Получить разбор решений»**, чтобы открыть AI/демоотчёт. Скачайте JSON или распечатайте его, в том числе в PDF средствами браузера.
5. Для свободного выбора мер и районов откройте **«Свободный симулятор»** в верхней панели. Карта и показатели пересчитываются после каждого решения. Переключатель «Сейчас / Прогноз» сравнивает исходные и новые оценки районов.
6. Измените решения и выполните анализ снова. Во вкладке **«Сравнение»** сохранённые сценарии ранжируются по Score. Кнопка **«Вернуться к встречам»** продолжает сюжет.

Without a key, calculations and optimization work normally; explanations are explicitly labelled as a deterministic demo without an LLM.

Copy `.env.example` to `.env`, configure `OPENAI_API_KEY`, and restart. `OPENAI_MODEL` overrides the model configured in `ai_analysis.py`. Process environment variables take precedence.

The existing integration uses the Responses API with structured JSON output. The key stays on the server, `.env` is excluded from Git, and only public assets are served. Selected initiatives and calculated synthetic results are sent to the provider. Python calculates the Score; the LLM explains effects and trade-offs. Provider failures return a clearly labelled deterministic fallback.

## Сюжет и диалоги

Слева находится портрет с именем и ролью персонажа, в центре — реплики в тёмной рамке с плашкой имени, справа — ответы с ценой и эффектами. На узком экране блоки выстраиваются вертикально. Все встречи доступны на русском, казахском и английском; действуют общие настройки звука и яркости.

| Время | Персонаж | Меры и территория |
| --- | --- | --- |
| 09:00 | Айгуль Садыкова, учитель | M7 / M8 / M9 в Нуре: школа, поликлиника или спортивные дворы |
| 10:00 | Дана Омарова, инженер и экоактивист | M4 / M5 в Сарыарке или городская M6 |
| 11:00 | Марат Ибраев, таксист | M1 / M3 в Алматы или городская M2 |
| 12:00 | Серик Ахметов, пенсионер | M10 / M11 в Нуре |
| 13:00 | Алия Нурланова, врач и советник | Городские M12 / M14 или M13 в Нуре |

Игровые часы обозначают пять встреч, а не таймер реального времени. Изменения показателей рассчитываются на исходном горизонте **8 кварталов**, а не в течение одного дня. Сюжет использует только меры из общего каталога и выбирает по одной мере из каждого направления; свободный симулятор сохраняет исходное правило «не более двух мер из направления».

Выбор ответа сначала показывает выделение, подтверждение отправляет решения в `/api/evaluate`. До подтверждения деньги не списываются. Недоступные ответы объясняют, почему бюджета не хватит на все оставшиеся встречи: клиент перебирает возможные завершения, сервер повторно проверяет принятые меры. Из 162 полных маршрутов 127 укладываются в бюджет 100; самый дешёвый стоит 67.

Прогресс встреч сохраняется отдельно от черновика симулятора. Возврат назад не меняет решения; подтверждение другого ответа сбрасывает последующие встречи. Повторный запуск дня требует подтверждения внутри игры и сохраняет существующие отчёты. Итоговые числа при восстановлении пересчитываются сервером, а не берутся из сохранения. Кнопки эпилога **«Открыть решения в симуляторе»** и **«Получить разбор решений»** переносят сюжетные решения в текущий черновик.

Пять персонажей вымышлены. Портреты созданы встроенным image_gen и включены в репозиторий: [файлы и точные промпты](docs/character-art.md).

## Главное меню и настройки

## Rules

- Budget: 100. Unused money gives no bonus.
- Exactly five decisions for analysis and optimization; incomplete drafts can be evaluated.
- Each initiative may occur once; at most two initiatives per category.
- District initiatives require a target; city-wide initiatives do not.
- M1 and M3 are incompatible everywhere.
- M4/M7 and M5/M13 are incompatible within the same district.
- Order does not affect results. The server owns costs, effects, scores and validation.

The detailed assignment rules allow two initiatives in a category rather than requiring one in each category. The supplied reference example follows this interpretation.

## Calculation

The horizon is eight quarters:

```text
I'[d,k] = clip(I[d,k] + sum(effect[m,k] * (8 - lag[m]) / 8) + synergy[d,k], 0, 100)
D[d] = sum(weight[k] * I'[d,k])
D_avg = sum(population_share[d] * D[d])
N_crit = number of district/indicator pairs with I'[d,k] < 40
Score = 0.7 * D_avg + 0.3 * min(D[d]) - N_crit
```

District initiatives affect one district; city-wide initiatives affect all five. Only indicators are clipped, not the Score. Calculations use unrounded values; display uses two decimal places. Higher is always better; exactly 40 is not critical.

| Indicator | Meaning | Weight |
|---|---|---:|
| T1 | Road congestion relief | 0.10 |
| T2 | Public transport access | 0.10 |
| E1 | Green spaces | 0.09 |
| E2 | Air quality | 0.11 |
| S1 | Schools and kindergartens | 0.11 |
| S2 | Primary healthcare | 0.11 |
| B1 | Street safety | 0.09 |
| B2 | Road safety | 0.09 |
| C1 | Utility reliability | 0.10 |
| C2 | Resident request resolution | 0.10 |

Population shares: Yesil 0.27, Almaty 0.24, Saryarka 0.20, Baikonur 0.13, Nura 0.16. Synergies are not reduced by lag: M1 + M2 adds T1 +2 in M1's district; M10 + M12 adds B1 +2 in M10's district; M5 + M6 adds E2 +2 in M5's district.

Baseline: city average 56.8624, weakest district 49.18, two critical pairs, Score **52.55768**. Reference example: city average 58.0776, weakest district 52.9625, no critical pairs, Score **56.54307**. Category summaries normalize weights within each category; Score uses all ten original indicators.

## Optimizer

`optimizer.py` exhaustively enumerates valid initiative combinations and district assignments. Sampled tests compare its fast scorer with `city_model.evaluate`. The app reads `data/optimum.json` instead of repeating the search for every request.

Regenerate the cache whenever model rules or data change:

В интерфейсе сводка по направлению — среднее двух его показателей с нормировкой весов внутри направления. Это вспомогательная визуализация; Score считается по десяти исходным показателям.

## Оптимум и сценарии

`optimizer.py` перебирает **все 694 395 допустимых планов** — каждое сочетание пяти мероприятий и каждое распределение по районам, с учётом бюджета, лимита направлений и несовместимостей. Поэтому оптимум здесь доказан, а не подобран эвристикой.

| | Score |
|---|---:|
| Без решений | 52.56 |
| Пример из задания | 56.54 |
| **Доказанный оптимум** | **57.24** |

`city_model.evaluate` остаётся источником истины, но при ~1.4 мс на вызов полный перебор занял бы около шестнадцати минут. Поэтому арифметика продублирована на плоских списках, а `verify_fast_scorer` сверяет быстрый путь с движком: расхождение роняет тесты, а не выдаёт уверенно неверный ответ.

Ранжирование выгружается в `data/optimum.json`, поэтому `POST /api/advice` — это поиск по индексу за ~76 мс, а не минутный перебор внутри запроса.

```bash
py optimizer.py --top 5        # лучшие планы
py optimizer.py --verify 300   # сверить быстрый путь с движком
```

### Контрольная пара

`GET /api/scenarios` отдаёт два плана с **одинаковыми пятью мероприятиями за одинаковые 100 единиц** — различается только район:

| План | Средний балл города | Score |
|---|---:|---:|
| Всё в Есиль | 58.75 | 54.01 |
| Всё в Нуру | 58.16 | **57.21** |

План с **более высоким** средним баллом города проигрывает три с лишним балла. Так работает слагаемое `0.3 × худший район`: город силён настолько, насколько силён его слабейший район. Обе цифры зафиксированы тестами — если набор данных или формула изменятся, упадут тесты, а не демонстрация.

## Архитектура

```text
Браузер: HTML + CSS + JavaScript
    │  JSON / HTTP
    ▼
server.py ─────► city_model.py ─────► data/city.json
    │               │
    │          валидация + детерминированный расчёт
    ▼
ai_analysis.py ─────► OpenAI Responses API (если задан ключ)
    └──────────────► объяснение по правилам (демо / отказ провайдера)
```bash
python -c "from optimizer import export_cache; export_cache()"
```

This may take several minutes. A missing cache returns HTTP 503 for optimization; evaluation and analysis remain available. The existing `bestSingleSwap` API field searches only cached top plans and can also change districts. The UI therefore shows the full optimal plan rather than claiming that field is a guaranteed best single edit.

## Компоненты проекта

| Файл | Назначение |
|---|---|
| `data/city.json` | Пять районов, десять показателей, веса, 14 мероприятий |
| `city_model.py` | Серверная валидация, лаги, синергии, ограничения, Score |
| `ai_analysis.py` | Настоящий AI-анализ и прозрачный демонстрационный режим |
| `server.py` | API и раздача только публичных файлов |
| `public/app.js` | Состояние интерфейса, карта, каталог, отчёт, сравнение |
| `public/preferences.js` | Сохранение громкости, яркости и языка; звуки интерфейса |
| `public/i18n.js` | Переводы интерфейса и каталога на казахский и английский |
| `public/menu.css` | Главное меню, настройки и экран выхода |
| `public/story.js` | Встречи на трёх языках, сохранение прогресса и проверка оставшегося бюджета |
| `public/story-view.js` | Диалоги и эпилог на основе серверного расчёта |
| `public/story.css` | Игровая рамка диалогов, портреты, ответы и адаптивная вёрстка |
| `public/portraits/` | Пять локальных портретов персонажей |
| `analysis_locale.py` | Локализованные объяснения результатов |
| `public/styles.css` | Адаптивный интерфейс, состояния и печатная версия |
| `public/city-map.svg` | Схематическая иллюстрация города, без внешних картографических сервисов |
| `tests/` | Проверки модели, API и интеграции AI с подставным провайдером |

## Architecture and API

| File | Purpose |
|---|---|
| `server.py` | Public assets, JSON API and health check |
| `city_model.py`, `data/city.json` | Validation, calculation and synthetic dataset |
| `optimizer.py`, `data/optimum.json` | Exhaustive search and cached ranking |
| `ai_analysis.py`, `analysis_locale.py` | Optional AI and localized deterministic explanations |
| `public/` | HTML, CSS, JavaScript, SVG map; no external map service |
| `tests/` | Model, optimizer, API and frontend checks |
| `render.yaml` | Render web service configuration |

- `GET /api/bootstrap`: catalog, baseline and AI availability.
- `GET /health`: server health.
- `POST /api/evaluate`: validate and evaluate a draft.
- `POST /api/analyze`: validate five decisions and return evaluation plus explanation.
- `POST /api/optimize`: validate five decisions and return the optimum comparison.

`GET /api/bootstrap` — каталог, исходные данные, бюджет, базовый расчёт, доступность AI. `GET /health` — состояние сервера.

`POST /api/evaluate` — валидация и промежуточный расчёт. `POST /api/analyze` — финальная проверка ровно пяти решений и объяснение.

`GET /api/scenarios` — готовые сценарии демонстрации с пересчитанными значениями. `POST /api/advice` — разрыв до доказанного оптимума и одна замена, дающая наибольший прирост; тело запроса такое же, как у `/api/analyze`.

Для языка анализа передайте дополнительное поле `"language": "ru"`, `"kk"` или `"en"`. По умолчанию — `ru`. Ответ содержит `analysis.language`; язык не влияет на числа модели.

Пример тела запроса:
Example request body:

```json
{
  "language": "en",
  "decisions": [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12"},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"}
  ]
}
```

Optional `language`: `ru` (default), `kk`, or `en`. Analysis includes `analysis.language`; language does not affect calculations. Invalid plans return HTTP 400 without a Score. Client changes are committed only after server validation.

## Deployment

Create a Render account, connect this repository, choose **New > Blueprint**, and select the branch containing `render.yaml`. Review the service configuration before creating it. The blueprint starts `python server.py --host 0.0.0.0`, reads the platform's `PORT`, and checks `/health`. The service starts in demo mode; an AI key can be configured through its environment settings.

**No live deployment URL has been created yet.** After deployment, verify the reference example and optimizer, then add the working demo URL here. Follow [the Russian deployment guide](DEPLOY.ru.md). Configuration reference: [Render Blueprints](https://render.com/docs/blueprint-spec).

## Verification

```bash
python -m unittest discover -s tests -v
```

Tests need no API key and make no paid requests. They cover reference calculations, constraints, synergies, API validation, private-file protection, provider failures and optimization. Some optimizer tests repeat the exhaustive search and take longer.

Optional frontend checks require Node.js 18+ and a running server on port 8080:

```bash
node tests/frontend_smoke.mjs
node tests/preferences.test.mjs
node tests/story.test.mjs
```

These exercise JavaScript and simulated UI interactions, not browser layout or physical audio. Manually check the map, report, mobile layout, optimizer button, language switching and restored drafts.
Эти необязательные тесты проверяют JavaScript, генерацию экранов, меню, настройки, полный сюжет, все ветки бюджета, возврат к встречам, повреждённые сохранения, переходы, язык, звуковые события, яркость, загрузку примера, экспорт, запоздавшие ответы и отказ сервера. Они не запускают браузер и не проверяют визуальную вёрстку или слышимость на физическом устройстве. Запросы к платному AI в тестах не выполняются. Сервер требуется только для `frontend_smoke.mjs`.

## Limitations

There is no shared database, real geography, random-event simulation or calibration against real city statistics. The standard-library HTTP server is intended for a hackathon demo. A public production service needs a suitable production server, authentication, AI request limits and shared storage.
