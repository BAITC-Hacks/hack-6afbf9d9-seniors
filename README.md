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

## Story mode

1. Open the app and press **Start game** to begin the story **"One day to save a district"**. Budget **100**, baseline Score **52.56**.
2. Work through five meetings: read the dialogue, choose a reply on the right, and press **Confirm decision**. After the character responds, continue to the next meeting.
3. After the fifth decision press **End the day**. The epilogue shows the Score, the improvements, the critical indicators and the initiatives left unfunded.
4. Press **Get a breakdown** to open the AI or demo report. Download it as JSON or print it, including to PDF through your browser.
5. For free choice of initiatives and districts, open **Free simulator** in the top bar. The map and indicators recalculate after each decision; the Now/Forecast toggle compares original and new district scores.
6. Change decisions and analyse again. The **Comparison** tab ranks saved scenarios by Score. **Return to meetings** resumes the story.

### Meetings and dialogue

The character portrait, name and role sit on the left, their lines in the centre, and the replies with their cost and effects on the right. On a narrow screen the blocks stack vertically. All meetings are available in Russian, Kazakh and English, and share the sound and brightness settings.

| Time | Character | Initiatives and area |
| --- | --- | --- |
| 09:00 | Aigul Sadykova, teacher | M7 / M8 / M9 in Nura: school, clinic or yard sports hubs |
| 10:00 | Dana Omarova, engineer and environmental activist | M4 / M5 in Saryarka, or city-wide M6 |
| 11:00 | Marat Ibraev, taxi driver | M1 / M3 in Almaty, or city-wide M2 |
| 12:00 | Serik Akhmetov, pensioner | M10 / M11 in Nura |
| 13:00 | Aliya Nurlanova, doctor and adviser | City-wide M12 / M14, or M13 in Nura |

The clock marks five meetings rather than counting real time. Indicator changes are still calculated over the original horizon of **8 quarters**, not within a single day. The story draws only on initiatives from the shared catalogue and offers one per category; the free simulator keeps the original "at most two per category" rule.

Choosing a reply highlights it first; confirming submits the decisions to `/api/evaluate`. No money is spent before confirmation. Unavailable replies explain why the remaining budget could not cover the rest of the day: the client enumerates possible completions and the server revalidates the accepted initiatives. Of 162 complete routes, 127 fit within the budget of 100; the cheapest costs 67.

Meeting progress is stored separately from the simulator draft. Going back does not change decisions; confirming a different reply resets the later meetings. Restarting the day requires confirmation in-game and preserves existing reports. Final numbers are recalculated by the server on restore rather than read from the save. The epilogue buttons **Open decisions in the simulator** and **Get a breakdown** carry the story's decisions into the current draft.

The five characters are fictional. Portraits were produced with the built-in image generator and are included in the repository: [files and exact prompts](docs/character-art.md).

## Optional AI

Without a key, calculations and optimization work normally; explanations are explicitly labelled as a deterministic demo without an LLM.

Copy `.env.example` to `.env`, configure `OPENAI_API_KEY`, and restart. `OPENAI_MODEL` overrides the model configured in `ai_analysis.py`. Process environment variables take precedence.

The integration uses the Responses API with structured JSON output. The key stays on the server, `.env` is excluded from Git, and only public assets are served. Selected initiatives and calculated synthetic results are sent to the provider. Python calculates the Score; the LLM explains effects and trade-offs. Provider failures return a clearly labelled deterministic fallback.

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

Baseline: city average 56.8624, weakest district 49.18, two critical pairs, Score **52.55768**. Reference example: city average 58.0776, weakest district 52.9625, no critical pairs, Score **56.54307**.

In the interface, a category summary is the average of its two indicators with weights normalized inside the category. That is a supporting visualization; the Score is computed from all ten original indicators.

## Optimizer

`optimizer.py` exhaustively enumerates **all 694 395 valid plans** — every combination of five initiatives and every district assignment, subject to the budget, the per-category limit and the incompatibilities. The optimum is therefore proven for this dataset rather than found by heuristic.

| | Score |
|---|---:|
| No decisions | 52.56 |
| Reference example from the brief | 56.54 |
| **Proven optimum** | **57.24** |

`city_model.evaluate` remains the authority on scoring, but at ~1.4 ms per call a full sweep would take about sixteen minutes. The arithmetic is therefore duplicated over flat lists, and `verify_fast_scorer` checks the fast path against the engine on sampled plans: a divergence fails the tests rather than returning a confidently wrong answer.

The ranking is exported to `data/optimum.json`, so `POST /api/optimize` is an index lookup of roughly 76 ms rather than a full search inside a request.

```bash
py optimizer.py --top 5        # best plans
py optimizer.py --verify 300   # check the fast path against the engine
```

Regenerate the cache whenever the model rules or the data change:

```bash
python -c "from optimizer import export_cache; export_cache()"
```

This takes about a minute. A missing cache returns HTTP 503 for optimization; evaluation and analysis remain available. The `bestSingleSwap` field searches only the cached top plans and may also change a district, so the interface shows the full optimal plan rather than presenting that field as a guaranteed best single edit.

### The controlled pair

`GET /api/scenarios` returns two plans that buy **the same five initiatives for the same 100 units**, differing only in the target district:

| Plan | City average | Score |
|---|---:|---:|
| Everything into Yesil | 58.75 | 54.01 |
| Everything into Nura | 58.16 | **57.21** |

The plan with the **higher** city average loses by more than three points. That is the `0.3 × weakest district` term at work: a city is only as strong as its weakest district. Both figures are pinned by tests, so if the dataset or the formula changes the test suite fails rather than the demonstration.

## Architecture

```text
Browser: HTML + CSS + JavaScript
    │  JSON / HTTP
    ▼
server.py ─────► city_model.py ─────► data/city.json
    │               │
    │          validation + deterministic calculation
    │               │
    │               └──► optimizer.py ──► data/optimum.json
    ▼
ai_analysis.py ─────► OpenAI Responses API (when a key is set)
    └──────────────► rule-based explanation (demo / provider failure)
```

| File | Purpose |
|---|---|
| `data/city.json` | Five districts, ten indicators, weights, 14 initiatives |
| `city_model.py` | Server-side validation, lags, synergies, constraints, Score |
| `optimizer.py`, `data/optimum.json` | Exhaustive search and cached ranking |
| `scenarios.py` | Named demonstration scenarios, including the controlled pair |
| `ai_analysis.py`, `analysis_locale.py` | Optional AI analysis and localized deterministic explanations |
| `server.py` | JSON API and serving of public files only |
| `public/app.js` | Interface state, map, catalogue, report, comparison |
| `public/story.js`, `public/story-view.js`, `public/story.css` | Meetings, dialogue, epilogue and their layout |
| `public/portraits/` | Five local character portraits |
| `public/preferences.js`, `public/menu.css` | Volume, brightness, language, main menu |
| `public/i18n.js` | Interface and catalogue translations |
| `public/styles.css`, `public/city-map.svg` | Responsive interface and schematic map, no external map service |
| `render.yaml`, `requirements.txt` | Render web service configuration |
| `tests/` | Model, optimizer, API, story and frontend checks |

## API

- `GET /api/bootstrap` — catalogue, source data, budget, baseline calculation and AI availability.
- `GET /api/scenarios` — the demonstration scenarios with freshly recalculated figures.
- `GET /health` — server health.
- `POST /api/evaluate` — validate and evaluate a draft.
- `POST /api/analyze` — validate exactly five decisions and return the evaluation plus an explanation.
- `POST /api/optimize` — validate five decisions and return the gap to the proven optimum. `POST /api/advice` is an alias of the same operation.

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

Optional `language`: `ru` (default), `kk`, or `en`. The response includes `analysis.language`; language does not affect the model's numbers. An invalid plan returns HTTP 400 with an explanation and no Score. Client changes are committed only after successful server validation; if the connection drops, the last confirmed scenario is kept.

## Deployment

Create a Render account, connect this repository, choose **New > Blueprint**, and select the branch containing `render.yaml`. Review the service configuration before creating it. The blueprint starts `python server.py --host 0.0.0.0`, reads the platform's `PORT`, and checks `/health`. The service starts in demo mode; an AI key can be configured through its environment settings.

**No live deployment URL has been created yet.** After deployment, verify the reference example and the optimizer, then add the working demo URL here. Follow [the Russian deployment guide](DEPLOY.ru.md). Configuration reference: [Render Blueprints](https://render.com/docs/blueprint-spec).

## Verification

```bash
python -m unittest discover -s tests -v
```

Tests need no API key and make no paid requests. They cover the reference calculations, the constraints, synergies, API validation, private-file protection, provider failures, the optimizer and the documented figures in this file. Some optimizer tests repeat the exhaustive search and take longer.

Optional frontend checks require Node.js 18+; `frontend_smoke.mjs` also needs a server running on port 8080:

```bash
node tests/frontend_smoke.mjs
node tests/preferences.test.mjs
node tests/story.test.mjs
```

These exercise JavaScript, screen generation, the menu, settings, the full story, every budget branch, returning to meetings, corrupted saves, transitions, language, sound events, brightness, loading the example, export, late responses and server failure. They do not launch a browser and do not check visual layout or audibility on a physical device. No paid AI requests are made.

Reproduce the headline figures directly:

| Check | Expected |
|---|---|
| Evaluate with no decisions | Score **52.56** |
| The reference example, cost 95 | Score **56.54** |
| `py optimizer.py --top 1` | Score **57.24** |
| `py optimizer.py --verify 300` | 0 divergences from the engine |

## Limitations

There is no shared database, real geography, random-event simulation or calibration against real city statistics. The standard-library HTTP server is intended for a hackathon demo. A public production service needs a suitable production server, authentication, AI request limits and shared storage.
