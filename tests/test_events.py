"""Tests for the city shock model.

Two things matter here. The shocks must be deterministic, or a judge cannot
reproduce anything this produces. And the stress test must reuse the real
scorer, so a shocked city is never scored by different arithmetic than an
unshocked one.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import events  # noqa: E402
from city_model import evaluate, load_data, _score_state  # noqa: E402


def plan(district_id):
    return [
        {"categoryId": "transport", "initiativeId": "M3", "districtId": district_id},
        {"categoryId": "social", "initiativeId": "M7", "districtId": district_id},
        {"categoryId": "social", "initiativeId": "M8", "districtId": district_id},
        {"categoryId": "safety", "initiativeId": "M10", "districtId": district_id},
        {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    ]


class DeterminismTests(unittest.TestCase):
    def test_the_same_plan_always_gives_the_same_result(self):
        first = events.stress(plan("nura"))
        second = events.stress(plan("nura"))
        self.assertEqual(first, second)

    def test_no_event_uses_randomness(self):
        source = (Path(__file__).resolve().parent.parent / "events.py").read_text(encoding="utf-8")
        for forbidden in ("import random", "random.", "uuid", "time.time"):
            self.assertNotIn(forbidden, source, f"{forbidden} would make the shocks unreproducible")

    def test_every_event_is_declared_with_effects(self):
        seen = set()
        for event in events.EVENTS:
            self.assertNotIn(event["id"], seen, "duplicate event id")
            seen.add(event["id"])
            self.assertTrue(event["effects"], f"{event['id']} has no effects")
            self.assertIn(event["scope"], {"city", "weakest"})
            if event["scope"] == "weakest":
                self.assertIn("focus", event, f"{event['id']} must say which indicator it targets")


class ScoringTests(unittest.TestCase):
    def test_a_shocked_city_is_scored_by_the_real_engine(self):
        """The module must not re-implement the Score."""
        data = load_data()
        result = evaluate(plan("nura"), True)
        state = events._state_from(result)
        event = events.EVENT_BY_ID["smog-episode"]
        shocked = events.apply_event(state, event)

        expected = _score_state(data, shocked)["score"]
        report = events.stress(plan("nura"))
        entry = next(item for item in report["events"] if item["id"] == "smog-episode")
        self.assertEqual(entry["score"], round(expected, 2))

    def test_effects_are_clipped_to_the_valid_range(self):
        state = events._state_from(evaluate([]))
        for event in events.EVENTS:
            shocked = events.apply_event(state, event)
            for metrics in shocked.values():
                for key, value in metrics.items():
                    self.assertGreaterEqual(value, 0, f"{event['id']} drove {key} below 0")
                    self.assertLessEqual(value, 100, f"{event['id']} drove {key} above 100")

    def test_every_shock_lowers_or_holds_the_score(self):
        report = events.stress(plan("nura"))
        for entry in report["events"]:
            self.assertGreaterEqual(entry["drop"], 0, f"{entry['id']} improved the city")

    def test_an_adaptive_shock_targets_the_weakest_district(self):
        """A burst main hits the worst utilities, not a random district."""
        state = events._state_from(evaluate([]))
        event = events.EVENT_BY_ID["heating-main-burst"]
        targeted = events._target_ids(event, state)
        self.assertEqual(len(targeted), 1)
        lowest = min(state, key=lambda district_id: state[district_id]["C1"])
        self.assertEqual(targeted[0], lowest)

    def test_the_unshocked_score_matches_the_engine(self):
        report = events.stress(plan("nura"))
        self.assertEqual(report["score"], evaluate(plan("nura"), True)["score"])
        self.assertEqual(report["baseline"], 52.56)


class ResilienceTests(unittest.TestCase):
    """The finding the stress test exists to surface."""

    def setUp(self):
        self.wealthy = events.stress(plan("esil"))
        self.weakest = events.stress(plan("nura"))

    def test_the_wealthy_plan_falls_below_doing_nothing(self):
        self.assertLess(
            self.wealthy["worstCase"]["score"], self.wealthy["baseline"],
            "spending the whole budget on Esil should not survive its worst shock",
        )
        self.assertFalse(self.wealthy["holdsAboveBaseline"])

    def test_the_weakest_district_plan_stays_far_closer_to_baseline(self):
        self.assertGreater(
            self.weakest["worstCaseVsBaseline"], self.wealthy["worstCaseVsBaseline"],
            "the Nura plan should be the more resilient of the two",
        )

    def test_the_ranking_survives_the_shocks(self):
        self.assertGreater(self.weakest["score"], self.wealthy["score"])
        self.assertGreater(self.weakest["worstCase"]["score"], self.wealthy["worstCase"]["score"])

    def test_worst_case_is_the_largest_drop(self):
        for report in (self.wealthy, self.weakest):
            largest = max(entry["drop"] for entry in report["events"])
            self.assertEqual(report["worstCase"]["drop"], largest)


class CatalogueTests(unittest.TestCase):
    def test_catalogue_lists_every_event(self):
        self.assertEqual(len(events.catalogue()["events"]), len(events.EVENTS))

    def test_catalogue_translates(self):
        russian = events.catalogue("ru")["events"][0]
        english = events.catalogue("en")["events"][0]
        self.assertEqual(russian["id"], english["id"])
        self.assertNotEqual(russian["title"], english["title"])

    def test_an_empty_plan_can_still_be_stress_tested(self):
        report = events.stress([])
        self.assertEqual(report["score"], 52.56)
        self.assertEqual(len(report["events"]), len(events.EVENTS))


if __name__ == "__main__":
    unittest.main()
