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

# How a shock chooses its target.
#   "city"    - every district
#   "weakest" - the district with the lowest indicator named in `focus`
EVENTS = [
    {
        "id": "harsh-winter",
        "title": "Суровая зима",
        "titleEn": "A harsh winter",
        "summary": "Затяжные морозы. Нагрузка на теплосети растёт, частный сектор топит углём.",
        "summaryEn": "A long cold spell. Heating networks strain and the private sector burns more coal.",
        "scope": "city",
        "effects": {"C1": -12, "E2": -8},
    },
    {
        "id": "heating-main-burst",
        "title": "Прорыв теплотрассы",
        "titleEn": "A heating main bursts",
        "summary": "Авария в районе с самыми изношенными сетями. Отопление и вода пропадают на несколько дней.",
        "summaryEn": "A failure in the district with the most worn networks. Heating and water are lost for days.",
        "scope": "weakest",
        "focus": "C1",
        "effects": {"C1": -25, "C2": -8},
    },
    {
        "id": "population-surge",
        "title": "Приток населения",
        "titleEn": "A surge in population",
        "summary": "Быстрый рост числа жителей. Школы переходят на вторую смену, к врачам очереди.",
        "summaryEn": "Rapid growth in residents. Schools move to a second shift and clinic queues grow.",
        "scope": "city",
        "effects": {"S1": -10, "S2": -8},
    },
    {
        "id": "school-overcrowding",
        "title": "Перегрузка школ",
        "titleEn": "Schools overcrowded",
        "summary": "Район со слабейшей соцсферой принимает больше всего новых семей.",
        "summaryEn": "The district with the weakest social infrastructure takes in the most new families.",
        "scope": "weakest",
        "focus": "S1",
        "effects": {"S1": -18, "S2": -6},
    },
    {
        "id": "smog-episode",
        "title": "Смоговый эпизод",
        "titleEn": "A smog episode",
        "summary": "Безветренная неделя. Выбросы частного сектора скапливаются над городом.",
        "summaryEn": "A windless week. Emissions from the private sector settle over the city.",
        "scope": "city",
        "effects": {"E2": -15},
    },
    {
        "id": "traffic-accidents",
        "title": "Всплеск ДТП",
        "titleEn": "A spike in road accidents",
        "summary": "Гололёд и ранние сумерки. Аварийность на дорогах резко растёт.",
        "summaryEn": "Ice and early darkness. Road accident rates rise sharply.",
        "scope": "city",
        "effects": {"B2": -12, "T1": -5},
    },
]

EVENT_BY_ID = {event["id"]: event for event in EVENTS}


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

    english = language == "en"
    entries = []
    for event in EVENTS:
        shocked = apply_event(base_state, event)
        scored = _score_state(data, shocked)
        targets = _target_ids(event, base_state)
        entries.append({
            "id": event["id"],
            "title": event["titleEn"] if english else event["title"],
            "summary": event["summaryEn"] if english else event["summary"],
            "scope": event["scope"],
            "districts": [data["districts"][i]["name"]
                          for i, d in enumerate(data["districts"]) if d["id"] in targets],
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
    english = language == "en"
    return {
        "events": [
            {
                "id": event["id"],
                "title": event["titleEn"] if english else event["title"],
                "summary": event["summaryEn"] if english else event["summary"],
                "scope": event["scope"],
                "effects": event["effects"],
            }
            for event in EVENTS
        ]
    }
