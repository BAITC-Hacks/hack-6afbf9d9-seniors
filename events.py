"""Deterministic city shocks, for stress-testing a plan.

The simulator answers "how good is this plan?". This module answers the
question a city manager asks next: "and what happens when something goes
wrong?"

Each event is a fixed rule, not a random draw, so a judge can reproduce
every number here. Some events are *adaptive*: a heating main bursts in the
district whose utility reliability is already lowest, and overcrowding hits
the district with the weakest social infrastructure. That is deliberate.
Real failures do not fall on the strongest neighbourhood, and a plan that
polished the wealthy district while leaving one weak is exactly the plan
that should fail here.

Scoring reuses `city_model._score_state`, so a shocked city is scored by the
same formula as an unshocked one. The module never re-implements the Score.
"""

from __future__ import annotations

from copy import deepcopy

from city_model import evaluate, load_data, _score_state
from analysis_locale import LABELS, validate_language

# How a shock chooses its target.
#   "city"    - every district
#   "weakest" - the district with the lowest indicator named in `focus`
EVENTS = [
    {
        "id": "harsh-winter",
        "title": "Суровая зима",
        "titleEn": "A harsh winter",
        "titleKk": "Қатал қыс",
        "summary": "Затяжные морозы. Нагрузка на теплосети растёт, частный сектор топит углём.",
        "summaryEn": "A long cold spell. Heating networks strain and the private sector burns more coal.",
        "summaryKk": "Ұзақ аяз. Жылу желілеріне жүктеме артып, жеке секторда көмір көбірек жағылады.",
        "scope": "city",
        "effects": {"C1": -12, "E2": -8},
    },
    {
        "id": "heating-main-burst",
        "title": "Прорыв теплотрассы",
        "titleEn": "A heating main bursts",
        "titleKk": "Жылу магистралінің жарылуы",
        "summary": "Авария в районе с самыми изношенными сетями. Отопление и вода пропадают на несколько дней.",
        "summaryEn": "A failure in the district with the most worn networks. Heating and water are lost for days.",
        "summaryKk": "Желілері ең тозған ауданда апат болды. Жылу мен су бірнеше күнге тоқтайды.",
        "scope": "weakest",
        "focus": "C1",
        "effects": {"C1": -25, "C2": -8},
    },
    {
        "id": "population-surge",
        "title": "Приток населения",
        "titleEn": "A surge in population",
        "titleKk": "Халық санының күрт өсуі",
        "summary": "Быстрый рост числа жителей. Школы переходят на вторую смену, к врачам очереди.",
        "summaryEn": "Rapid growth in residents. Schools move to a second shift and clinic queues grow.",
        "summaryKk": "Тұрғындар саны тез өседі. Мектептер екінші ауысымға көшіп, емхана кезектері ұзарады.",
        "scope": "city",
        "effects": {"S1": -10, "S2": -8},
    },
    {
        "id": "school-overcrowding",
        "title": "Перегрузка школ",
        "titleEn": "Schools overcrowded",
        "titleKk": "Мектептердің шамадан тыс толуы",
        "summary": "Район со слабейшей соцсферой принимает больше всего новых семей.",
        "summaryEn": "The district with the weakest social infrastructure takes in the most new families.",
        "summaryKk": "Әлеуметтік инфрақұрылымы ең әлсіз ауданға жаңа отбасылар ең көп қоныстанады.",
        "scope": "weakest",
        "focus": "S1",
        "effects": {"S1": -18, "S2": -6},
    },
    {
        "id": "smog-episode",
        "title": "Смоговый эпизод",
        "titleEn": "A smog episode",
        "titleKk": "Түтін тұманы",
        "summary": "Безветренная неделя. Выбросы частного сектора скапливаются над городом.",
        "summaryEn": "A windless week. Emissions from the private sector settle over the city.",
        "summaryKk": "Желсіз апта. Жеке сектордың шығарындылары қала үстіне жиналады.",
        "scope": "city",
        "effects": {"E2": -15},
    },
    {
        "id": "traffic-accidents",
        "title": "Всплеск ДТП",
        "titleEn": "A spike in road accidents",
        "titleKk": "Жол апаттарының көбеюі",
        "summary": "Гололёд и ранние сумерки. Аварийность на дорогах резко растёт.",
        "summaryEn": "Ice and early darkness. Road accident rates rise sharply.",
        "summaryKk": "Көктайғақ пен ерте қараңғылық. Жол апаттарының саны күрт өседі.",
        "scope": "city",
        "effects": {"B2": -12, "T1": -5},
    },
]

EVENT_BY_ID = {event["id"]: event for event in EVENTS}
STORY_EVENT_IDS = ("harsh-winter", "heating-main-burst", "population-surge", "traffic-accidents")


def _event_text(event, field, language):
    return event[field + {"ru": "", "en": "En", "kk": "Kk"}[language]]


def _district_name(district, language):
    return LABELS.get(language, {}).get(district["id"], district["name"])


def _state_from(result):
    """The post-plan indicator state, district id -> metrics."""
    return {district["id"]: dict(district["metrics"]) for district in result["districts"]}


def _target_ids(event, state):
    if event["scope"] == "city":
        return list(state)
    focus = event["focus"]
    weakest = min(state, key=lambda district_id: state[district_id][focus])
    return [weakest]


def apply_event(state, event):
    """Return a copy of `state` with the event's effects applied and clipped."""
    shocked = deepcopy(state)
    for district_id in _target_ids(event, state):
        for key, delta in event["effects"].items():
            shocked[district_id][key] = max(0, min(100, shocked[district_id][key] + delta))
    return shocked


def stress(decisions, language="ru"):
    """Score a plan, then score it again under each shock.

    Returns the plan's Score, one entry per event with the Score it survives
    to, and a resilience summary: the worst single drop and the average.
    A plan whose worst case falls below the do-nothing baseline is flagged,
    because that is the case a city manager actually needs to see.
    """
    data = load_data()
    result = evaluate(decisions, bool(decisions))
    base_state = _state_from(result)
    base_score = result["score"]
    baseline = evaluate([])["score"]

    language = validate_language(language)
    entries = []
    for event in EVENTS:
        shocked = apply_event(base_state, event)
        scored = _score_state(data, shocked)
        targets = _target_ids(event, base_state)
        entries.append({
            "id": event["id"],
            "title": _event_text(event, "title", language),
            "summary": _event_text(event, "summary", language),
            "scope": event["scope"],
            "districts": [_district_name(district, language)
                          for district in data["districts"] if district["id"] in targets],
            "score": round(scored["score"], 2),
            "drop": round(base_score - scored["score"], 2),
            "belowBaseline": scored["score"] < baseline,
            "criticalCount": scored["criticalCount"],
        })

    drops = [entry["drop"] for entry in entries]
    worst = max(entries, key=lambda entry: entry["drop"])

    # The honest measure of resilience is the worst case a plan survives to,
    # not the size of its drop: a stronger plan has more to lose and will
    # often fall further while still landing higher. What a city manager
    # needs to know is whether the bad year leaves them better off than
    # having done nothing at all.
    return {
        "baseline": baseline,
        "score": base_score,
        "events": entries,
        "worstCase": {
            "id": worst["id"],
            "title": worst["title"],
            "score": worst["score"],
            "drop": worst["drop"],
        },
        "worstCaseVsBaseline": round(worst["score"] - baseline, 2),
        "holdsAboveBaseline": worst["score"] >= baseline,
        "averageDrop": round(sum(drops) / len(drops), 2),
    }


def catalogue(language="ru"):
    """The event list on its own, without scoring a plan."""
    language = validate_language(language)
    return {
        "events": [
            {
                "id": event["id"],
                "title": _event_text(event, "title", language),
                "summary": _event_text(event, "summary", language),
                "scope": event["scope"],
                "effects": dict(event["effects"]),
            }
            for event in EVENTS
        ]
    }


def _precise_evaluated_state(data, result):
    """Restore the engine's state from its unrounded contribution ledger.

    The engine already computed lag factors and synergies. Reusing those
    numbers avoids feeding display-rounded district metrics into a new score.
    """
    state = {district["id"]: dict(district["metrics"]) for district in data["districts"]}
    for contribution in result["contributions"]:
        targets = [contribution["districtId"]] if contribution["districtId"] else state
        for district_id in targets:
            for indicator_id, delta in contribution["effects"].items():
                state[district_id][indicator_id] += delta
    for synergy in result["synergies"]:
        for indicator_id, delta in synergy["effects"].items():
            state[synergy["districtId"]][indicator_id] += delta
    return {district_id: {key: max(0, min(100, value)) for key, value in metrics.items()}
            for district_id, metrics in state.items()}


def story_event(decisions, event_id, language="ru"):
    """One reproducible what-if forecast for a draft or completed story plan.

    It never changes the approved evaluation, project costs or budget. Event
    selection happens once in the story controller; this function has no draw.
    """
    language = validate_language(language)
    if not isinstance(event_id, str) or event_id not in STORY_EVENT_IDS:
        raise ValueError("Неизвестное сюжетное событие.")
    data = load_data()
    evaluation = evaluate(decisions, require_complete=False)
    event = EVENT_BY_ID[event_id]
    state = _precise_evaluated_state(data, evaluation)
    before = _score_state(data, state)
    shocked = apply_event(state, event)
    after = _score_state(data, shocked)
    targets = _target_ids(event, state)
    return {
        "event": {
            "id": event_id,
            "title": _event_text(event, "title", language),
            "summary": _event_text(event, "summary", language),
            "scope": event["scope"],
            "districtIds": targets,
            "districts": [_district_name(district, language) for district in data["districts"]
                          if district["id"] in targets],
            "effects": dict(event["effects"]),
        },
        "evaluation": evaluation,
        "forecast": {
            "score": round(after["score"], 2),
            "baseScore": evaluation["score"],
            "delta": round(after["score"] - before["score"], 2),
            "criticalCount": after["criticalCount"],
            "baseCriticalCount": before["criticalCount"],
            "weightedAverage": round(after["weightedAverage"], 2),
            "minDistrict": round(after["minDistrict"], 2),
            "districts": [{
                "id": district["id"],
                "name": _district_name(district, language),
                "before": round(before["districtScores"][district["id"]], 2),
                "after": round(after["districtScores"][district["id"]], 2),
                "delta": round(after["districtScores"][district["id"]] - before["districtScores"][district["id"]], 2),
                "metrics": {key: round(value, 2) for key, value in shocked[district["id"]].items()},
                "beforeMetrics": {key: round(value, 2) for key, value in state[district["id"]].items()},
                "affected": district["id"] in targets,
            } for district in data["districts"]],
        },
    }
