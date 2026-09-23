"""Tests for the /api/advice endpoint.

The optimiser's value is only realised if the running application can reach
it. These tests cover the endpoint's contract: it answers for a legal plan,
refuses an illegal one, and degrades honestly when the precomputed ranking
is missing rather than blocking a request on a sixty-second search.
"""

from __future__ import annotations

import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import optimizer  # noqa: E402
import server  # noqa: E402

REFERENCE = [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
]


def post(port, path, payload):
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, json.loads(response.read())


class AdviceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = server.create_server("127.0.0.1", 0)
        cls.port = cls.server.server_port
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_advice_reports_the_gap_to_the_proven_optimum(self):
        status, body = post(self.port, "/api/advice", {"decisions": REFERENCE})
        self.assertEqual(status, 200)
        self.assertEqual(body["currentScore"], 56.54)
        self.assertGreater(body["bestScore"], body["currentScore"])
        self.assertGreater(body["plansExamined"], 100000)

    def test_advice_names_a_single_legal_swap(self):
        _, body = post(self.port, "/api/advice", {"decisions": REFERENCE})
        swap = body["bestSingleSwap"]
        self.assertIsNotNone(swap)
        chosen = {item["initiativeId"] for item in REFERENCE}
        proposed = {item["initiativeId"] for item in swap["decisions"]}
        self.assertEqual(len(proposed - chosen), 1)
        self.assertEqual(len(chosen - proposed), 1)
        self.assertEqual(len(swap["decisions"]), 5)

    def test_advice_requires_a_complete_plan(self):
        with self.assertRaises(urllib.error.HTTPError) as caught:
            post(self.port, "/api/advice", {"decisions": REFERENCE[:3]})
        self.assertEqual(caught.exception.code, 400)

    def test_advice_rejects_an_overbudget_plan(self):
        overbudget = [
            {"categoryId": "transport", "initiativeId": "M3", "districtId": "nura"},
            {"categoryId": "services", "initiativeId": "M13", "districtId": "nura"},
            {"categoryId": "green", "initiativeId": "M5", "districtId": "almaty"},
            {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
            {"categoryId": "transport", "initiativeId": "M2", "districtId": None},
        ]
        with self.assertRaises(urllib.error.HTTPError) as caught:
            post(self.port, "/api/advice", {"decisions": overbudget})
        self.assertEqual(caught.exception.code, 400)

    def test_missing_ranking_returns_503_rather_than_hanging(self):
        """A missing cache must fail fast, not trigger a 60-second search."""
        with mock.patch.object(server, "plan_advice", return_value=None):
            with self.assertRaises(urllib.error.HTTPError) as caught:
                post(self.port, "/api/advice", {"decisions": REFERENCE})
        self.assertEqual(caught.exception.code, 503)

    def test_the_optimum_reports_no_remaining_gap(self):
        cache = optimizer.load_cache()
        best = cache["plans"][0]["decisions"]
        _, body = post(self.port, "/api/advice", {"decisions": best})
        self.assertEqual(body["gap"], 0.0)

    def test_scenarios_endpoint_serves_the_controlled_pair(self):
        with urllib.request.urlopen(
            f"http://127.0.0.1:{self.port}/api/scenarios", timeout=10
        ) as response:
            body = json.loads(response.read())
        wealthy_id, weakest_id = body["controlledPair"]
        found = {item["id"]: item for item in body["scenarios"]}
        self.assertGreater(
            found[wealthy_id]["weightedAverage"], found[weakest_id]["weightedAverage"]
        )
        self.assertLess(found[wealthy_id]["score"], found[weakest_id]["score"])


if __name__ == "__main__":
    unittest.main()
