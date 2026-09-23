"""Tests for the demonstration scenarios.

These lock the figures quoted in the demo. The point is not that the numbers
are correct today — it is that if the dataset or the formula ever changes,
this fails here rather than on stage.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from city_model import evaluate  # noqa: E402
import scenarios  # noqa: E402


class ScenarioTests(unittest.TestCase):
    def test_every_scenario_produces_the_score_it_claims(self):
        for scenario in scenarios.SCENARIOS:
            with self.subTest(scenario=scenario["id"]):
                decisions = scenario["decisions"]
                result = evaluate(decisions, bool(decisions))
                self.assertEqual(result["score"], scenario["expectedScore"])

    def test_every_scenario_is_a_legal_plan(self):
        for scenario in scenarios.SCENARIOS:
            decisions = scenario["decisions"]
            if not decisions:
                continue
            with self.subTest(scenario=scenario["id"]):
                self.assertEqual(len(decisions), 5)
                ids = [item["initiativeId"] for item in decisions]
                self.assertEqual(len(set(ids)), 5)
                # evaluate raises on any rule violation
                evaluate(decisions, True)

    def test_the_baseline_scenario_is_the_published_figure(self):
        self.assertEqual(evaluate([])["score"], 52.56)

    def test_the_reference_scenario_matches_the_brief(self):
        reference = scenarios.by_id("reference")
        self.assertEqual(evaluate(reference["decisions"], True)["score"], 56.54)


class ControlledPairTests(unittest.TestCase):
    """The demonstration only works if the two plans differ in one respect."""

    def setUp(self):
        wealthy_id, weakest_id = scenarios.CONTROLLED_PAIR
        self.wealthy = scenarios.by_id(wealthy_id)
        self.weakest = scenarios.by_id(weakest_id)
        self.wealthy_result = evaluate(self.wealthy["decisions"], True)
        self.weakest_result = evaluate(self.weakest["decisions"], True)

    def test_both_plans_buy_the_same_initiatives(self):
        left = sorted(item["initiativeId"] for item in self.wealthy["decisions"])
        right = sorted(item["initiativeId"] for item in self.weakest["decisions"])
        self.assertEqual(left, right)

    def test_both_plans_cost_the_same(self):
        from city_model import load_data

        costs = {item["id"]: item["cost"] for item in load_data()["initiatives"]}
        total = lambda plan: sum(costs[i["initiativeId"]] for i in plan["decisions"])  # noqa: E731
        self.assertEqual(total(self.wealthy), total(self.weakest))
        self.assertEqual(total(self.wealthy), 100)

    def test_the_plans_differ_only_in_the_target_district(self):
        for left, right in zip(self.wealthy["decisions"], self.weakest["decisions"]):
            self.assertEqual(left["initiativeId"], right["initiativeId"])
            if left["districtId"] is None:
                self.assertIsNone(right["districtId"])
            else:
                self.assertNotEqual(left["districtId"], right["districtId"])

    def test_the_wealthy_plan_has_the_higher_city_average(self):
        """The surprising half: spending on Esil raises the average."""
        self.assertGreater(
            self.wealthy_result["weightedAverage"], self.weakest_result["weightedAverage"]
        )

    def test_the_wealthy_plan_nevertheless_scores_lower(self):
        """And the point: the higher average still loses, by about three points."""
        self.assertLess(self.wealthy_result["score"], self.weakest_result["score"])
        gap = self.weakest_result["score"] - self.wealthy_result["score"]
        self.assertGreater(gap, 3.0)

    def test_the_weakest_district_is_what_separates_them(self):
        self.assertGreater(
            self.weakest_result["minDistrict"], self.wealthy_result["minDistrict"]
        )


class ListingTests(unittest.TestCase):
    def test_listing_recomputes_scores_through_the_engine(self):
        payload = scenarios.listing()
        self.assertEqual(payload["baseline"], 52.56)
        self.assertEqual(len(payload["scenarios"]), len(scenarios.SCENARIOS))
        for item in payload["scenarios"]:
            stored = scenarios.by_id(item["id"])
            self.assertEqual(item["score"], stored["expectedScore"])

    def test_listing_reports_the_delta_against_the_baseline(self):
        for item in scenarios.listing()["scenarios"]:
            self.assertAlmostEqual(item["delta"], round(item["score"] - 52.56, 2), places=2)

    def test_controlled_pair_ids_exist(self):
        for scenario_id in scenarios.listing()["controlledPair"]:
            self.assertIsNotNone(scenarios.by_id(scenario_id))


if __name__ == "__main__":
    unittest.main()
