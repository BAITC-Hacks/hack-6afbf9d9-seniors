"""Exhaustive search for the best-scoring valid decision set.

The simulator answers "how good is this plan?". This module answers the
question a city manager actually asks next: "what was the best plan
available?" — and, given the plan on screen, how much was left on the table
and which single swap recovers most of it.

The search is exhaustive, not heuristic: every legal combination of five
initiatives and every district assignment for them is scored, so the result
is a proven optimum for the supplied dataset rather than a good guess.

`city_model.evaluate` is the authority on scoring, but at ~1.4 ms per call a
full sweep of the 736,765 legal assignments would take about seventeen
minutes. This module therefore reimplements the scoring arithmetic over flat
lists, which is roughly fifty times faster, and `verify_fast_scorer` proves
the fast path agrees with the engine on every sampled case. The test suite
runs that proof; if the two ever diverge, the tests fail rather than the
optimiser quietly returning a wrong answer.
"""

from __future__ import annotations

import argparse
import itertools
import json
import random
from pathlib import Path
from collections import Counter

from city_model import evaluate, load_data

EXCLUSIVE_PAIRS = (("M1", "M3"),)
SAME_DISTRICT_CONFLICTS = (("M4", "M7"), ("M5", "M13"))
SYNERGY_PAIRS = (("M1", "M2", "T1"), ("M10", "M12", "B1"), ("M5", "M6", "E2"))
CRITICAL_THRESHOLD = 40


def _tables(data):
    """Flatten the dataset into index-addressed lists for the fast scorer."""
    metric_keys = [item["id"] for item in data["indicators"]]
    weights = [item["weight"] for item in data["indicators"]]
    districts = [item["id"] for item in data["districts"]]
    populations = [item["population"] for item in data["districts"]]
    baseline = [
        [item["metrics"][key] for key in metric_keys] for item in data["districts"]
    ]
    horizon = data["horizon"]

    initiatives = {}
    for item in data["initiatives"]:
        factor = (horizon - item["lag"]) / horizon
        delta = [item["effects"].get(key, 0) * factor for key in metric_keys]
        initiatives[item["id"]] = {
            "id": item["id"],
            "categoryId": item["categoryId"],
            "scope": item["scope"],
            "cost": item["cost"],
            "delta": delta,
        }

    return {
        "metric_keys": metric_keys,
        "weights": weights,
        "districts": districts,
        "populations": populations,
        "baseline": baseline,
        "initiatives": initiatives,
        "metric_index": {key: i for i, key in enumerate(metric_keys)},
        "budget": data["budget"],
    }


def _score(tables, assignment):
    """Score one assignment: [(initiative_id, district_index or None), ...]."""
    metric_count = len(tables["weights"])
    state = [row[:] for row in tables["baseline"]]
    initiatives = tables["initiatives"]

    for initiative_id, district_index in assignment:
        delta = initiatives[initiative_id]["delta"]
        if district_index is None:
            for row in state:
                for i in range(metric_count):
                    row[i] += delta[i]
        else:
            row = state[district_index]
            for i in range(metric_count):
                row[i] += delta[i]

    placed = dict(assignment)
    for left, right, metric in SYNERGY_PAIRS:
        if left in placed and right in placed:
            # Flat bonus, never lag-scaled, in the district of the first measure.
            anchor = placed[left]
            index = tables["metric_index"][metric]
            if anchor is None:
                for row in state:
                    row[index] += 2
            else:
                state[anchor][index] += 2

    weights = tables["weights"]
    populations = tables["populations"]
    critical = 0
    weighted_average = 0.0
    worst = None

    for district_index, row in enumerate(state):
        total = 0.0
        for i in range(metric_count):
            value = row[i]
            if value < 0:
                value = 0.0
            elif value > 100:
                value = 100.0
            # Strictly below the threshold; a value of exactly 40 is not critical.
            if value < CRITICAL_THRESHOLD:
                critical += 1
            total += weights[i] * value
        weighted_average += populations[district_index] * total
        if worst is None or total < worst:
            worst = total

    return 0.7 * weighted_average + 0.3 * worst - critical


def _legal_combinations(tables):
    """Every five-initiative set that satisfies the rules independent of district."""
    initiatives = list(tables["initiatives"].values())
    budget = tables["budget"]
    for combo in itertools.combinations(initiatives, 5):
        if sum(item["cost"] for item in combo) > budget:
            continue
        counts = Counter(item["categoryId"] for item in combo)
        if max(counts.values()) > 2:
            continue
        ids = {item["id"] for item in combo}
        if any(left in ids and right in ids for left, right in EXCLUSIVE_PAIRS):
            continue
        yield combo


def _assignments(tables, combo):
    """Every district assignment for one combination that satisfies the rules."""
    district_count = len(tables["districts"])
    local = [item for item in combo if item["scope"] == "district"]
    city = [(item["id"], None) for item in combo if item["scope"] == "city"]

    for placement in itertools.product(range(district_count), repeat=len(local)):
        placed = {item["id"]: index for item, index in zip(local, placement)}
        conflict = False
        for left, right in SAME_DISTRICT_CONFLICTS:
            if left in placed and right in placed and placed[left] == placed[right]:
                conflict = True
                break
        if conflict:
            continue
        yield [(item["id"], placed[item["id"]]) for item in local] + city


def search(limit=None, progress=False):
    """Score every legal plan. Returns the ranked list, best first."""
    data = load_data()
    tables = _tables(data)
    results = []
    examined = 0

    for combo in _legal_combinations(tables):
        for assignment in _assignments(tables, combo):
            results.append((_score(tables, assignment), assignment))
            examined += 1
            if progress and examined % 100000 == 0:
                print(f"  ...{examined} plans scored", flush=True)

    results.sort(key=lambda pair: pair[0], reverse=True)
    return results[:limit] if limit else results, examined, tables


def to_decisions(tables, assignment):
    """Convert an internal assignment into the engine's decision format."""
    initiatives = tables["initiatives"]
    districts = tables["districts"]
    decisions = []
    for initiative_id, district_index in sorted(assignment, key=lambda p: int(p[0][1:])):
        item = initiatives[initiative_id]
        decisions.append(
            {
                "categoryId": item["categoryId"],
                "initiativeId": initiative_id,
                "districtId": None if district_index is None else districts[district_index],
            }
        )
    return decisions


def best_plan():
    """The single highest-scoring legal plan, verified through the real engine."""
    ranked, examined, tables = search(limit=1)
    score, assignment = ranked[0]
    decisions = to_decisions(tables, assignment)
    # The fast scorer proposes; the engine disposes. Never report a number
    # the real model has not confirmed.
    confirmed = evaluate(decisions, True)
    return {
        "decisions": decisions,
        "score": confirmed["score"],
        "fastScore": round(score, 2),
        "plansExamined": examined,
    }


CACHE_PATH = Path(__file__).resolve().parent / "data" / "optimum.json"


def export_cache(top=200, path=CACHE_PATH):
    """Precompute the ranked plans once so the running app never searches.

    A full sweep takes over a minute, which is far too slow to sit inside a
    request. Writing the ranking to disk turns advice into a lookup.
    """
    ranked, examined, tables = search(limit=top)
    baseline = evaluate([])["score"]
    payload = {
        "baseline": baseline,
        "plansExamined": examined,
        "plans": [
            {"score": round(score, 2), "decisions": to_decisions(tables, assignment)}
            for score, assignment in ranked
        ],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def load_cache(path=CACHE_PATH):
    """The precomputed ranking, or None when it has not been exported yet."""
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


_UNSET = object()


def advise(decisions, cache=_UNSET):
    """Compare a plan against the proven optimum and name the best single swap.

    Reads the precomputed ranking so this is a lookup, not a search. Returns
    None when no cache exists, letting the caller degrade gracefully rather
    than blocking a request for a minute.

    `cache` defaults to the exported file; passing an explicit None means the
    caller already found no cache, and must not silently fall back to it.
    """
    if cache is _UNSET:
        cache = load_cache()
    if cache is None:
        return None

    current = evaluate(decisions, True)
    best = cache["plans"][0]
    chosen = {item["initiativeId"] for item in decisions}

    swap = None
    for plan in cache["plans"]:
        ids = {item["initiativeId"] for item in plan["decisions"]}
        if len(ids - chosen) == 1 and len(chosen - ids) == 1:
            swap = {
                "remove": next(iter(chosen - ids)),
                "add": next(iter(ids - chosen)),
                "score": plan["score"],
                "gain": round(plan["score"] - current["score"], 2),
                "decisions": plan["decisions"],
            }
            break

    return {
        "currentScore": current["score"],
        "bestScore": best["score"],
        "gap": round(best["score"] - current["score"], 2),
        "bestPlan": best["decisions"],
        "bestSingleSwap": swap,
        "plansExamined": cache["plansExamined"],
    }


def verify_fast_scorer(sample=400, seed=20260923):
    """Prove the fast scorer agrees with city_model.evaluate.

    Returns (checked, mismatches). A non-empty mismatch list means the fast
    path has drifted from the engine and its results must not be trusted.
    """
    data = load_data()
    tables = _tables(data)
    rng = random.Random(seed)

    pool = []
    for combo in _legal_combinations(tables):
        for assignment in _assignments(tables, combo):
            pool.append(assignment)
    chosen = rng.sample(pool, min(sample, len(pool)))

    mismatches = []
    for assignment in chosen:
        fast = round(_score(tables, assignment), 2)
        real = evaluate(to_decisions(tables, assignment), True)["score"]
        if abs(fast - real) > 0.005:
            mismatches.append({"assignment": assignment, "fast": fast, "engine": real})
    return len(chosen), mismatches


def main():
    parser = argparse.ArgumentParser(
        description="Поиск оптимального плана для симулятора «Аким на 5 часов»"
    )
    parser.add_argument("--top", type=int, default=5, help="Сколько лучших планов показать")
    parser.add_argument("--verify", type=int, default=0, help="Сверить N планов с движком")
    parser.add_argument("--json", action="store_true", help="Вывести JSON")
    args = parser.parse_args()

    if args.verify:
        checked, mismatches = verify_fast_scorer(args.verify)
        print(f"Сверено планов: {checked}, расхождений: {len(mismatches)}")
        if mismatches:
            print(json.dumps(mismatches[:3], ensure_ascii=False, indent=2))
            raise SystemExit(1)
        return

    print("Перебор всех допустимых планов...", flush=True)
    ranked, examined, tables = search(limit=args.top, progress=True)
    baseline = evaluate([])["score"]

    payload = []
    for score, assignment in ranked:
        decisions = to_decisions(tables, assignment)
        confirmed = evaluate(decisions, True)
        payload.append(
            {
                "score": confirmed["score"],
                "delta": round(confirmed["score"] - baseline, 2),
                "cost": sum(tables["initiatives"][d["initiativeId"]]["cost"] for d in decisions),
                "decisions": decisions,
            }
        )

    if args.json:
        print(json.dumps({"plansExamined": examined, "baseline": baseline, "top": payload},
                         ensure_ascii=False, indent=2))
        return

    print(f"\nПроверено планов: {examined}")
    print(f"Базовый Score без действий: {baseline}\n")
    for position, item in enumerate(payload, start=1):
        print(f"{position}. Score {item['score']} (+{item['delta']}), стоимость {item['cost']}")
        for decision in item["decisions"]:
            where = decision["districtId"] or "весь город"
            print(f"     {decision['initiativeId']:<4} {where}")
        print()


if __name__ == "__main__":
    main()
