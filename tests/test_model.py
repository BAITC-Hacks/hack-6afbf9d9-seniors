"""Behavioral checks against the supplied numerical examples and model rules."""

import itertools
import unittest
from unittest.mock import patch

from city_model import evaluate, load_data


def decision(initiative_id, district_id=None):
    initiative = next(item for item in load_data()["initiatives"] if item["id"] == initiative_id)
    return {"categoryId": initiative["categoryId"], "initiativeId": initiative_id, "districtId": district_id}


def example():
    return [decision("M7", "nura"), decision("M8", "nura"), decision("M10", "nura"),
            decision("M12"), decision("M5", "saryarka")]


def district(result, district_id):
    return next(item for item in result["districts"] if item["id"] == district_id)


class ModelTests(unittest.TestCase):
    def test_exact_source_dataset(self):
        data = load_data()
        self.assertEqual(data["budget"], 100)
        self.assertEqual(data["horizon"], 8)
        self.assertEqual(len(data["districts"]), 5)
        self.assertEqual(len(data["initiatives"]), 14)
        self.assertAlmostEqual(sum(item["weight"] for item in data["indicators"]), 1)
        self.assertAlmostEqual(sum(item["population"] for item in data["districts"]), 1)
        self.assertEqual(data["districts"][-1]["metrics"]["S2"], 35)

    def test_baseline_matches_supplied_oracle(self):
        result = evaluate([])
        self.assertEqual(result["score"], 52.56)
        self.assertEqual(result["baselineScore"], 52.56)
        self.assertEqual(result["delta"], 0)
        self.assertEqual(result["weightedAverage"], 56.86)
        self.assertEqual(result["minDistrict"], 49.18)
        self.assertEqual(result["criticalCount"], 2)
        self.assertEqual(result["remaining"], 100)
        self.assertFalse(result["complete"])
        self.assertEqual([item["before"] for item in result["districts"]],
                         [62.99, 57.06, 54.65, 56.63, 49.18])

    def test_reference_scenario_matches_independent_oracle(self):
        result = evaluate(example(), require_complete=True)
        self.assertEqual(result["score"], 56.54)
        self.assertEqual(result["delta"], 3.99)  # Difference is rounded only after subtracting raw scores.
        self.assertEqual(result["spent"], 95)
        self.assertEqual(result["remaining"], 5)
        self.assertEqual(result["criticalCount"], 0)
        self.assertEqual(result["weightedAverage"], 58.08)
        self.assertEqual(result["minDistrict"], 52.96)
        self.assertTrue(result["complete"])
        self.assertEqual(district(result, "nura")["after"], 52.96)
        self.assertEqual(district(result, "saryarka")["after"], 56.30)
        self.assertEqual(district(result, "nura")["metrics"]["B1"], 67.5)
        self.assertEqual([item["id"] for item in result["synergies"]], ["M10+M12"])

    def test_determinism_and_order_independence_for_every_example_permutation(self):
        expected = evaluate(example())
        for permutation in itertools.permutations(example()):
            self.assertEqual(evaluate(list(permutation)), expected)

    def test_targeted_effect_has_no_spillover(self):
        result = evaluate([decision("M7", "nura")])
        self.assertEqual(district(result, "nura")["metrics"]["S1"], 48)
        self.assertEqual(district(result, "esil")["metrics"]["S1"], 48)
        self.assertEqual(district(result, "esil")["delta"], 0)
        self.assertEqual(result["criticalCount"], 1)

    def test_city_effect_applies_to_every_district_with_lag(self):
        result = evaluate([decision("M2")])
        for item in result["districts"]:
            self.assertEqual(item["metrics"]["T1"], item["baselineMetrics"]["T1"] + 3)
            self.assertEqual(item["metrics"]["B2"], item["baselineMetrics"]["B2"] + 2.25)

    def test_all_three_synergies_are_fixed_not_lag_scaled(self):
        cases = [("M1", "M2", "T1", 54.5), ("M10", "M12", "B1", 90.5),
                 ("M5", "M6", "E2", 84.25)]
        for left, right, metric, expected in cases:
            with self.subTest(pair=(left, right)):
                result = evaluate([decision(left, "esil"), decision(right)])
                self.assertEqual(district(result, "esil")["metrics"][metric], expected)
                self.assertEqual(result["synergies"][0]["effects"], {metric: 2})

    def test_negative_tradeoff_can_create_a_new_critical_metric(self):
        result = evaluate([decision("M11", "almaty")])
        self.assertEqual(district(result, "almaty")["metrics"]["T1"], 38.25)
        self.assertEqual(district(result, "almaty")["metrics"]["B2"], 62.5)
        self.assertEqual(result["criticalCount"], 3)
        self.assertLess(result["score"], result["baselineScore"])

    def test_threshold_is_strictly_less_than_40(self):
        data = load_data()
        data["districts"][-1]["metrics"]["S1"] = 40
        data["districts"][-1]["metrics"]["S2"] = 40
        with patch("city_model.load_data", return_value=data):
            self.assertEqual(evaluate([])["criticalCount"], 0)

    def test_metrics_clip_at_zero_and_one_hundred(self):
        data = load_data()
        data["districts"][1]["metrics"].update({"T1": 1, "B2": 99})
        with patch("city_model.load_data", return_value=data):
            result = evaluate([decision("M11", "almaty")])
        self.assertEqual(district(result, "almaty")["metrics"]["T1"], 0)
        self.assertEqual(district(result, "almaty")["metrics"]["B2"], 100)

    def test_changes_to_decisions_change_score(self):
        first = evaluate(example())
        other = example()
        other[0]["districtId"] = "almaty"
        self.assertNotEqual(first["score"], evaluate(other)["score"])

    def test_source_and_results_cannot_mutate_later_runs(self):
        data = load_data()
        data["budget"] = 100000
        data["districts"][0]["metrics"]["T1"] = 0
        result = evaluate(example())
        result["decisions"][0]["effects"]["E2"] = 9999
        self.assertEqual(evaluate([])["score"], 52.56)
        self.assertEqual(evaluate(example())["score"], 56.54)
        self.assertEqual(load_data()["budget"], 100)

    def test_incomplete_preview_is_valid_but_final_analysis_is_not(self):
        self.assertFalse(evaluate(example()[:4])["complete"])
        for choices in ([], example()[:4]):
            with self.assertRaisesRegex(ValueError, "ровно 5"):
                evaluate(choices, require_complete=True)

    def test_five_choices_need_not_cover_five_categories(self):
        self.assertTrue(evaluate(example(), require_complete=True)["complete"])
        self.assertEqual(len({item["categoryId"] for item in example()}), 4)

    def test_too_many_choices(self):
        with self.assertRaisesRegex(ValueError, "не более 5"):
            evaluate(example() + [decision("M14")])

    def test_more_than_two_in_one_category_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "не более 2"):
            evaluate([decision("M7", "nura"), decision("M8", "nura"), decision("M9", "almaty")])

    def test_repeated_measure_is_rejected_even_in_different_districts(self):
        with self.assertRaisesRegex(ValueError, "только один раз"):
            evaluate([decision("M7", "nura"), decision("M7", "esil")])

    def test_global_and_local_incompatibilities(self):
        for left, right in (("M1", "M3"), ("M4", "M7"), ("M5", "M13")):
            with self.subTest(pair=(left, right)):
                with self.assertRaisesRegex(ValueError, "несовместимы"):
                    evaluate([decision(left, "nura"), decision(right, "nura")])
        with self.assertRaisesRegex(ValueError, "несовместимы"):
            evaluate([decision("M1", "nura"), decision("M3", "esil")])
        for left, right in (("M4", "M7"), ("M5", "M13")):
            self.assertEqual(evaluate([decision(left, "nura"), decision(right, "esil")])["decisionCount"], 2)

    def test_budget_is_enforced_using_catalog_costs(self):
        over = [decision("M3", "esil"), decision("M7", "nura"), decision("M8", "nura"),
                decision("M5", "saryarka"), decision("M12")]
        with self.assertRaisesRegex(ValueError, "Превышен бюджет"):
            evaluate(over, require_complete=True)
        exact = [decision("M3", "esil"), decision("M8", "nura"), decision("M5", "saryarka"),
                 decision("M9", "nura"), decision("M4", "almaty")]
        self.assertEqual(evaluate(exact, require_complete=True)["remaining"], 0)

    def test_cheapest_supplied_scenario_costs_61(self):
        choices = [decision("M9", "nura"), decision("M11", "nura"), decision("M10", "nura"),
                   decision("M12"), decision("M4", "nura")]
        self.assertEqual(evaluate(choices, require_complete=True)["spent"], 61)

    def test_omitted_city_district_is_equivalent_to_null(self):
        choice = decision("M12")
        expected = evaluate([choice])
        del choice["districtId"]
        self.assertEqual(evaluate([choice]), expected)

    def test_district_scope_validation(self):
        invalid = [decision("M7"), decision("M7", "missing"), decision("M12", "nura")]
        for choice in invalid:
            with self.subTest(choice=choice), self.assertRaises(ValueError):
                evaluate([choice])

    def test_client_cannot_forge_cost_score_effects_or_category(self):
        for field, value in (("cost", 0), ("score", 100), ("effects", {"T1": 1000})):
            choice = decision("M7", "nura") | {field: value}
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "недопустимые поля"):
                evaluate([choice])
        choice = decision("M7", "nura") | {"categoryId": "green"}
        with self.assertRaisesRegex(ValueError, "Направление"):
            evaluate([choice])

    def test_malformed_requests_raise_value_error_not_internal_errors(self):
        invalid = [None, {}, "M1", 5, [None], [[]], [{}],
                   [{"initiativeId": []}], [{"initiativeId": True}],
                   [decision("M7", "nura") | {"categoryId": []}],
                   [decision("M7", "nura") | {"districtId": {}}],
                   [{"initiativeId": "M99", "categoryId": "transport"}],
                   [decision("M12") | {"districtId": False}]]
        for choices in invalid:
            with self.subTest(choices=choices), self.assertRaises(ValueError):
                evaluate(choices)


if __name__ == "__main__":
    unittest.main()
