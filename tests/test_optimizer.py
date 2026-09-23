"""Tests for the exhaustive plan optimiser.

The optimiser reimplements the scoring arithmetic for speed, so the central
test here is not "does it find a good plan" but "does its arithmetic still
agree with city_model". If those two ever diverge the optimiser would report
confident nonsense, so that agreement is asserted directly.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from city_model import evaluate  # noqa: E402
import optimizer  # noqa: E402

REFERENCE = [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
]


class FastScorerTests(unittest.TestCase):
    def test_fast_scorer_agrees_with_the_engine(self):
        """The whole optimiser rests on this: no drift from city_model."""
        checked, mismatches = optimizer.verify_fast_scorer(sample=250)
        self.assertEqual(checked, 250)
        self.assertEqual(mismatches, [], f"fast scorer diverged on {len(mismatches)} plans")

    def test_fast_scorer_reproduces_the_supplied_reference_score(self):
        data = optimizer.load_data()
        tables = optimizer._tables(data)
        districts = {name: index for index, name in enumerate(tables["districts"])}
        assignment = [
            ("M7", districts["nura"]),
            ("M8", districts["nura"]),
            ("M10", districts["nura"]),
            ("M5", districts["saryarka"]),
            ("M12", None),
        ]
        self.assertEqual(round(optimizer._score(tables, assignment), 2), 56.54)


class SearchTests(unittest.TestCase):
    def test_every_cached_plan_is_accepted_by_the_engine(self):
        cache = optimizer.load_cache()
        self.assertIsNotNone(cache, "run `py optimizer.py --export` first")
        for plan in cache["plans"][:40]:
            result = evaluate(plan["decisions"], True)
            self.assertEqual(result["score"], plan["score"])

    def test_the_optimum_beats_the_supplied_reference_scenario(self):
        cache = optimizer.load_cache()
        reference = evaluate(REFERENCE, True)["score"]
        self.assertGreater(cache["plans"][0]["score"], reference)

    def test_plans_are_ranked_best_first(self):
        cache = optimizer.load_cache()
        scores = [plan["score"] for plan in cache["plans"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_the_search_respects_the_budget_and_the_rules(self):
        data = optimizer.load_data()
        costs = {item["id"]: item["cost"] for item in data["initiatives"]}
        cache = optimizer.load_cache()
        for plan in cache["plans"][:40]:
            ids = [item["initiativeId"] for item in plan["decisions"]]
            self.assertEqual(len(ids), 5)
            self.assertEqual(len(set(ids)), 5, "a measure appears twice")
            self.assertLessEqual(sum(costs[i] for i in ids), 100)
            self.assertFalse("M1" in ids and "M3" in ids, "M1 and M3 are incompatible")


class AdviceTests(unittest.TestCase):
    def test_advice_reports_the_gap_to_the_proven_optimum(self):
        advice = optimizer.advise(REFERENCE)
        self.assertIsNotNone(advice)
        self.assertEqual(advice["currentScore"], 56.54)
        self.assertGreater(advice["bestScore"], advice["currentScore"])
        self.assertAlmostEqual(
            advice["gap"], round(advice["bestScore"] - advice["currentScore"], 2), places=2
        )

    def test_the_suggested_swap_changes_exactly_one_measure(self):
        advice = optimizer.advise(REFERENCE)
        swap = advice["bestSingleSwap"]
        self.assertIsNotNone(swap)
        chosen = {item["initiativeId"] for item in REFERENCE}
        proposed = {item["initiativeId"] for item in swap["decisions"]}
        self.assertEqual(len(chosen - proposed), 1)
        self.assertEqual(len(proposed - chosen), 1)
        self.assertEqual(swap["remove"], next(iter(chosen - proposed)))
        self.assertEqual(swap["add"], next(iter(proposed - chosen)))

    def test_the_suggested_swap_is_itself_a_legal_plan(self):
        swap = optimizer.advise(REFERENCE)["bestSingleSwap"]
        self.assertEqual(evaluate(swap["decisions"], True)["score"], swap["score"])

    def test_advice_degrades_gracefully_when_no_cache_exists(self):
        """A missing cache must not stall a request with a 60-second search."""
        with tempfile.TemporaryDirectory() as folder:
            missing = Path(folder) / "absent.json"
            self.assertIsNone(optimizer.advise(REFERENCE, cache=optimizer.load_cache(missing)))

    def test_the_optimum_itself_has_no_remaining_gap(self):
        cache = optimizer.load_cache()
        best = cache["plans"][0]["decisions"]
        advice = optimizer.advise(best)
        self.assertEqual(advice["gap"], 0.0)


class CacheTests(unittest.TestCase):
    def test_export_writes_readable_json(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "optimum.json"
            payload = optimizer.export_cache(top=3, path=path)
            self.assertTrue(path.exists())
            stored = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(stored["plans"][0]["score"], payload["plans"][0]["score"])
            self.assertEqual(stored["baseline"], 52.56)
            self.assertEqual(len(stored["plans"]), 3)


if __name__ == "__main__":
    unittest.main()
