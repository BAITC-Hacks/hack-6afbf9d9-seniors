"""Named demonstration scenarios.

The simulator's central claim is counter-intuitive: a plan can raise the
city's average quality of life and still score worse, because 30% of the
Score is carried by the weakest district alone. Asserting that in a README
is weak; showing it with two plans that differ in exactly one respect is
not.

`CONTROLLED_PAIR` is that demonstration. Both plans buy the same five
initiatives for the same 100 units. Only the district differs. The Esil
plan produces the higher city average and the lower Score.

Each scenario carries the figure it is expected to produce, and
`tests/test_scenarios.py` checks every one against `city_model.evaluate`.
If the dataset or the formula changes, the demonstration fails in the test
suite rather than in front of a judge.
"""

from __future__ import annotations

from city_model import evaluate

BASELINE_SCORE = 52.56


def _plan(district_id):
    """The same five initiatives, aimed at one district."""
    return [
        {"categoryId": "transport", "initiativeId": "M3", "districtId": district_id},
        {"categoryId": "social", "initiativeId": "M7", "districtId": district_id},
        {"categoryId": "social", "initiativeId": "M8", "districtId": district_id},
        {"categoryId": "safety", "initiativeId": "M10", "districtId": district_id},
        {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    ]


SCENARIOS = [
    {
        "id": "baseline",
        "title": "Ничего не делать",
        "titleEn": "Do nothing",
        "summary": "Отправная точка. В Нуре школы на 38 и поликлиники на 35 — два критических показателя.",
        "summaryEn": "The starting point. Nura's schools sit at 38 and its clinics at 35 — two critical values.",
        "decisions": [],
        "expectedScore": BASELINE_SCORE,
    },
    {
        "id": "wealthy-district",
        "title": "Вложить всё в Есиль",
        "titleEn": "Spend it all on Esil",
        "summary": (
            "Инстинктивный ход: развивать сильный район. Средний балл по городу — "
            "самый высокий из всех сценариев, а итоговый Score почти не растёт."
        ),
        "summaryEn": (
            "The instinctive move: develop the strong district. It produces the highest "
            "city average of any scenario here, and barely moves the Score."
        ),
        "decisions": _plan("esil"),
        "expectedScore": 54.01,
    },
    {
        "id": "weakest-district",
        "title": "Те же меры — в Нуру",
        "titleEn": "The same measures, into Nura",
        "summary": (
            "Те же пять мероприятий, те же 100 единиц, другой район. Средний балл по "
            "городу ниже, а Score выше на 3.2. Город силён настолько, насколько силён "
            "его слабейший район."
        ),
        "summaryEn": (
            "The same five initiatives, the same 100 units, a different district. The city "
            "average is lower and the Score is 3.2 higher. A city is only as strong as its "
            "weakest district."
        ),
        "decisions": _plan("nura"),
        "expectedScore": 57.21,
    },
    {
        "id": "reference",
        "title": "Эталонный сценарий из ТЗ",
        "titleEn": "The reference scenario from the brief",
        "summary": "Пример из технического задания: стоимость 95, Score 56.54. Используется для проверки движка.",
        "summaryEn": "The worked example from the brief: cost 95, Score 56.54. Used to verify the engine.",
        "decisions": [
            {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
            {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
            {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
            {"categoryId": "services", "initiativeId": "M12", "districtId": None},
            {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
        ],
        "expectedScore": 56.54,
    },
]

CONTROLLED_PAIR = ("wealthy-district", "weakest-district")


def by_id(scenario_id):
    for scenario in SCENARIOS:
        if scenario["id"] == scenario_id:
            return scenario
    return None


def listing():
    """Scenarios with their live figures, for the API and the interface.

    Scores are recomputed through the engine rather than served from the
    stored constants, so the response can never drift from the model.
    """
    items = []
    for scenario in SCENARIOS:
        decisions = scenario["decisions"]
        result = evaluate(decisions, bool(decisions))
        items.append(
            {
                "id": scenario["id"],
                "title": scenario["title"],
                "titleEn": scenario["titleEn"],
                "summary": scenario["summary"],
                "summaryEn": scenario["summaryEn"],
                "decisions": decisions,
                "score": result["score"],
                "delta": round(result["score"] - BASELINE_SCORE, 2),
                "weightedAverage": result["weightedAverage"],
                "minDistrict": result["minDistrict"],
            }
        )
    return {"baseline": BASELINE_SCORE, "controlledPair": list(CONTROLLED_PAIR), "scenarios": items}
