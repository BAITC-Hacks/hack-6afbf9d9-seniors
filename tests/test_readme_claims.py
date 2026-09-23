"""Checks that the figures quoted in README.md are the ones the code produces.

The brief is explicit that documentation must describe only what the
repository actually does. Numbers in prose drift silently as code changes,
so the ones that matter are asserted here instead of trusted.
"""

from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from city_model import evaluate  # noqa: E402
import optimizer  # noqa: E402
import scenarios  # noqa: E402

README = (ROOT / "README.md").read_text(encoding="utf-8")


def quoted(pattern):
    """True when the README contains the pattern, ignoring digit grouping."""
    normalised = README.replace(" ", " ").replace(" ", "")
    return re.search(pattern, normalised) is not None


class ReadmeClaimTests(unittest.TestCase):
    def test_the_quoted_plan_count_is_what_the_search_examines(self):
        cache = optimizer.load_cache()
        self.assertIsNotNone(cache, "export the ranking first")
        self.assertTrue(
            quoted(str(cache["plansExamined"])),
            f"README should quote {cache['plansExamined']} examined plans",
        )

    def test_the_quoted_optimum_is_the_best_plan_found(self):
        cache = optimizer.load_cache()
        best = cache["plans"][0]
        self.assertEqual(evaluate(best["decisions"], True)["score"], best["score"])
        self.assertTrue(quoted(re.escape(str(best["score"]))),
                        f"README should quote the optimum {best['score']}")

    def test_the_quoted_baseline_matches_the_model(self):
        self.assertEqual(evaluate([])["score"], 52.56)
        self.assertTrue(quoted("52\\.56"))

    def test_the_controlled_pair_figures_in_the_readme_are_real(self):
        wealthy_id, weakest_id = scenarios.CONTROLLED_PAIR
        for scenario_id in (wealthy_id, weakest_id):
            scenario = scenarios.by_id(scenario_id)
            result = evaluate(scenario["decisions"], True)
            self.assertTrue(
                quoted(re.escape(str(result["score"]))),
                f"README should quote {scenario_id} score {result['score']}",
            )
            self.assertTrue(
                quoted(re.escape(str(result["weightedAverage"]))),
                f"README should quote {scenario_id} average {result['weightedAverage']}",
            )

    def test_the_documented_endpoints_exist_in_the_server(self):
        source = (ROOT / "server.py").read_text(encoding="utf-8")
        for endpoint in re.findall(r"`(?:GET|POST) (/api/[a-z]+)`", README):
            with self.subTest(endpoint=endpoint):
                self.assertIn(f'"{endpoint}"', source,
                              f"README documents {endpoint} but server.py does not route it")


if __name__ == "__main__":
    unittest.main()
