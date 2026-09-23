"""Authoritative deterministic simulator; no client costs or effects are trusted.

The supplied synthetic dataset is the source of truth. Effects add before clipping,
so the order of decisions cannot affect the result. No intermediate score rounding.
"""

from collections import Counter
from copy import deepcopy
from functools import lru_cache
import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent / "data" / "city.json"


@lru_cache(maxsize=1)
def _source_data():
    with DATA_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def load_data():
    """Return an independent copy, so callers cannot mutate the starting city."""
    return deepcopy(_source_data())


def _rounded(value):
    return round(value, 2) + 0.0  # Avoid a displayed negative zero.


def _score_state(data, state):
    weights = {item["id"]: item["weight"] for item in data["indicators"]}
    scores = {
        district["id"]: sum(weights[key] * value for key, value in state[district["id"]].items())
        for district in data["districts"]
    }
    average = sum(district["population"] * scores[district["id"]] for district in data["districts"])
    minimum = min(scores.values())
    critical = sum(value < 40 for metrics in state.values() for value in metrics.values())
    return {"districtScores": scores, "weightedAverage": average, "minDistrict": minimum,
            "criticalCount": critical, "score": 0.7 * average + 0.3 * minimum - critical}


def _validate_decisions(decisions, data, require_complete):
    if not isinstance(decisions, list):
        raise ValueError("Решения должны быть переданы списком.")
    if len(decisions) > 5:
        raise ValueError("Можно принять не более 5 решений.")
    if require_complete and len(decisions) != 5:
        raise ValueError("Для итогового анализа необходимо принять ровно 5 решений.")
    initiatives = {item["id"]: item for item in data["initiatives"]}
    districts = {item["id"]: item for item in data["districts"]}
    categories = {item["id"]: item for item in data["categories"]}
    selected, seen, counts = [], set(), Counter()
    for item in decisions:
        if not isinstance(item, dict):
            raise ValueError("Каждое решение должно быть объектом с мероприятием и районом.")
        if set(item) - {"categoryId", "initiativeId", "districtId"}:
            raise ValueError("Решение содержит недопустимые поля. Стоимость и эффекты определяет сервер.")
        initiative_id = item.get("initiativeId")
        if not isinstance(initiative_id, str) or initiative_id not in initiatives:
            raise ValueError("Указано неизвестное мероприятие.")
        initiative = initiatives[initiative_id]
        category_id = item.get("categoryId")
        if not isinstance(category_id, str) or category_id != initiative["categoryId"]:
            raise ValueError("Направление не соответствует выбранному мероприятию.")
        if initiative_id in seen:
            raise ValueError("Каждое мероприятие можно выбрать только один раз.")
        seen.add(initiative_id)
        counts[category_id] += 1
        if counts[category_id] > 2:
            raise ValueError("В одном направлении можно выбрать не более 2 мероприятий.")
        district_id = item.get("districtId")
        if initiative["scope"] == "district":
            if not isinstance(district_id, str) or district_id not in districts:
                raise ValueError("Для районного мероприятия необходимо выбрать существующий район.")
            district_name = districts[district_id]["name"]
        else:
            if district_id is not None:
                raise ValueError("У городской меры район не указывается: она действует на весь город.")
            district_name = "Весь город"
        selected.append({
            "categoryId": category_id, "initiativeId": initiative_id, "districtId": district_id,
            "title": initiative["title"], "categoryName": categories[category_id]["name"],
            "districtName": district_name, "cost": initiative["cost"], "risk": initiative["risk"],
            "scope": initiative["scope"], "lag": initiative["lag"], "effects": deepcopy(initiative["effects"]),
        })
    by_id = {item["initiativeId"]: item for item in selected}
    if "M1" in by_id and "M3" in by_id:
        raise ValueError("Автобусные полосы M1 и развитие LRT M3 несовместимы в одном сценарии.")
    for left, right, explanation in (
        ("M4", "M7", "Парк M4 и школа с детсадом M7"),
        ("M5", "M13", "Чистое топливо M5 и модернизация ЖКХ M13"),
    ):
        if left in by_id and right in by_id and by_id[left]["districtId"] == by_id[right]["districtId"]:
            raise ValueError(explanation + " несовместимы в одном районе.")
    if sum(item["cost"] for item in selected) > data["budget"]:
        raise ValueError("Превышен бюджет: доступно 100 условных единиц.")
    # Canonical ordering also makes the full response independent of input ordering.
    return sorted(selected, key=lambda item: int(item["initiativeId"][1:]))


def evaluate(decisions, require_complete=False):
    """Validate and evaluate 0–5 choices; require_complete enforces exactly five.

    District measures affect only their target. City measures affect every district.
    H=8; regular effects scale by (H-lag)/H; fixed synergies do not scale.
    Score = .7 population-weighted district score + .3 worst district - N(<40).
    """
    data = load_data()
    selected = _validate_decisions(decisions, data, require_complete)
    baseline = {district["id"]: deepcopy(district["metrics"]) for district in data["districts"]}
    state = deepcopy(baseline)
    contributions = []
    for decision in selected:
        factor = (data["horizon"] - decision["lag"]) / data["horizon"]
        effects = {key: value * factor for key, value in decision["effects"].items()}
        target_ids = [decision["districtId"]] if decision["scope"] == "district" else list(state)
        for district_id in target_ids:
            for key, value in effects.items():
                state[district_id][key] += value
        contributions.append({key: decision[key] for key in (
            "initiativeId", "title", "districtId", "districtName", "cost", "lag"
        )} | {"factor": factor, "effects": effects})
    by_id = {item["initiativeId"]: item for item in selected}
    synergies = []
    for left, right, metric, title in (
        ("M1", "M2", "T1", "Автобусные полосы + адаптивные светофоры"),
        ("M10", "M12", "B1", "Освещение и камеры + платформа обращений"),
        ("M5", "M6", "E2", "Чистое топливо + городское озеленение"),
    ):
        if left in by_id and right in by_id:
            district_id = by_id[left]["districtId"]
            state[district_id][metric] += 2
            synergies.append({"id": left + "+" + right, "title": title,
                              "districtId": district_id, "districtName": by_id[left]["districtName"],
                              "effects": {metric: 2}})
    for district_metrics in state.values():
        for key in district_metrics:
            district_metrics[key] = max(0, min(100, district_metrics[key]))

    before = _score_state(data, baseline)
    after = _score_state(data, state)
    metric_summaries = []
    for category in data["categories"]:
        members = [item for item in data["indicators"] if item["categoryId"] == category["id"]]
        weight = sum(item["weight"] for item in members)
        values = []
        for source in (baseline, state):
            values.append(sum(district["population"] * sum(
                source[district["id"]][item["id"]] * item["weight"] for item in members
            ) / weight for district in data["districts"]))
        metric_summaries.append({"id": category["id"], "name": category["name"],
                                 "before": _rounded(values[0]), "after": _rounded(values[1]),
                                 "delta": _rounded(values[1] - values[0])})
    district_results = []
    for district in data["districts"]:
        district_id = district["id"]
        old, new = before["districtScores"][district_id], after["districtScores"][district_id]
        district_results.append({"id": district_id, "name": district["name"],
                                 "population": district["population"], "before": _rounded(old),
                                 "after": _rounded(new), "delta": _rounded(new - old),
                                 "metrics": {key: _rounded(value) for key, value in state[district_id].items()},
                                 "baselineMetrics": baseline[district_id]})
    spent = sum(item["cost"] for item in selected)
    strengths, risks, recommendations = _explain(data, selected, before, after, metric_summaries, synergies, spent)
    return {
        "budget": data["budget"], "spent": spent, "remaining": data["budget"] - spent,
        "decisionCount": len(selected), "complete": len(selected) == 5,
        "score": _rounded(after["score"]), "baselineScore": _rounded(before["score"]),
        "delta": _rounded(after["score"] - before["score"]),
        "weightedAverage": _rounded(after["weightedAverage"]), "minDistrict": _rounded(after["minDistrict"]),
        "criticalCount": after["criticalCount"], "baselineCriticalCount": before["criticalCount"],
        "metrics": metric_summaries, "districts": district_results, "decisions": selected,
        "synergies": synergies, "contributions": contributions,
        "strengths": strengths, "risks": risks, "recommendations": recommendations,
    }


def _explain(data, selected, before, after, metrics, synergies, spent):
    """Transparent rule-based facts, also used as grounded input for optional AI."""
    strengths, risks, recommendations = [], [], []
    if selected:
        best = max(metrics, key=lambda item: item["delta"])
        if best["delta"] > 0:
            strengths.append(f"Наибольший прирост направления «{best['name']}»: +{best['delta']:.2f} пункта.")
        if after["minDistrict"] > before["minDistrict"]:
            strengths.append(f"Оценка самого слабого района выросла с {before['minDistrict']:.2f} до {after['minDistrict']:.2f}.")
        removed = before["criticalCount"] - after["criticalCount"]
        if removed > 0:
            strengths.append(f"Выведено из критической зоны показателей: {removed}. Это уменьшает штраф итогового Score.")
        for synergy in synergies:
            strengths.append(f"Синергия «{synergy['title']}»: дополнительный эффект в районе {synergy['districtName']}.")
    else:
        recommendations.append("Добавьте 5 мероприятий в пределах общего бюджета 100.")
    if after["criticalCount"]:
        risks.append(f"Остаются показатели ниже 40: {after['criticalCount']}. Каждый снижает итоговый Score на 1 пункт.")
        recommendations.append("Проверьте показатели ниже 40: приоритетные вложения в эти потребности могут убрать штраф.")
    if any(item["initiativeId"] == "M11" for item in selected):
        risks.append("Безопасные переходы M11 повышают дорожную безопасность, но уменьшают разгрузку дорог T1 на 1,75 пункта в выбранном районе.")
    slow = [item["title"] for item in selected if item["lag"] >= 3]
    if slow:
        risks.append("Часть эффекта выходит за горизонт 8 кварталов из-за лага: " + ", ".join(slow) + ".")
    untouched = [item["name"] for item in metrics if item["delta"] == 0]
    if untouched and selected:
        risks.append("Без изменения средних показателей остались направления: " + ", ".join(untouched) + ".")
    if len(selected) < 5 and selected:
        recommendations.append(f"До итогового анализа добавьте ещё {5 - len(selected)} мероприятий, соблюдая лимит 2 на направление.")
    if spent < data["budget"] and selected:
        recommendations.append(f"Остаток бюджета {data['budget'] - spent} не даёт бонуса. Сравните доступные замены мер по эффекту и лагу.")
    weakest_id = min(after["districtScores"], key=after["districtScores"].get)
    weakest_name = next(item["name"] for item in data["districts"] if item["id"] == weakest_id)
    recommendations.append(f"Самый низкий районный результат — {weakest_name} ({after['minDistrict']:.2f}). Его улучшение влияет и на среднюю оценку, и на компонент минимального района.")
    return strengths, risks, recommendations
