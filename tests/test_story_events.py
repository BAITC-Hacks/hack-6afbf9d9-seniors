"""Story shocks for partial plans: authoritative numbers and strict HTTP input."""

import json
import threading
import unittest
from copy import deepcopy
from http.client import HTTPConnection
from unittest.mock import patch

import events
import server
from city_model import _score_state, evaluate, load_data


PLAN = [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12"},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
]


class StoryEventTests(unittest.TestCase):
    def test_every_prefix_preserves_evaluation_budget_and_input(self):
        for count in range(6):
            decisions = deepcopy(PLAN[:count])
            original = deepcopy(decisions)
            expected = evaluate(decisions)
            for event_id in events.STORY_EVENT_IDS:
                with self.subTest(count=count, event=event_id):
                    report = events.story_event(decisions, event_id)
                    self.assertEqual(report["evaluation"], expected)
                    self.assertEqual(report["forecast"]["baseScore"], expected["score"])
                    self.assertEqual(report["forecast"]["baseCriticalCount"], expected["criticalCount"])
                    self.assertLess(report["forecast"]["score"], expected["score"])
                    self.assertLess(report["forecast"]["delta"], 0)
                    self.assertEqual(decisions, original)
                    for district, base in zip(report["forecast"]["districts"], expected["districts"]):
                        self.assertEqual(district["beforeMetrics"], base["metrics"])
                        self.assertEqual(district["before"], base["after"])

    def test_event_is_reproducible_and_order_independent(self):
        for event_id in events.STORY_EVENT_IDS:
            expected = events.story_event(PLAN, event_id)
            self.assertEqual(events.story_event(json.loads(json.dumps(PLAN)), event_id), expected)
            self.assertEqual(events.story_event(list(reversed(PLAN)), event_id), expected)
            expected["event"]["effects"]["T1"] = 1000
            self.assertNotEqual(events.story_event(PLAN, event_id), expected)

    def test_forecast_reuses_real_scorer_with_unrounded_contributions(self):
        decisions = [
            {"categoryId": "transport", "initiativeId": "M1", "districtId": "nura"},
            {"categoryId": "transport", "initiativeId": "M2"},
            {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
            {"categoryId": "green", "initiativeId": "M6"},
            {"categoryId": "services", "initiativeId": "M12"},
        ]
        data = load_data()
        # Independent input reconstruction from the dataset, including the two
        # supplied fixed synergies. The production code uses the engine's ledger.
        state = {district["id"]: dict(district["metrics"]) for district in data["districts"]}
        catalog = {item["id"]: item for item in data["initiatives"]}
        for decision in decisions:
            measure = catalog[decision["initiativeId"]]
            targets = [decision["districtId"]] if measure["scope"] == "district" else state
            for target in targets:
                for code, delta in measure["effects"].items():
                    state[target][code] += delta * (data["horizon"] - measure["lag"]) / data["horizon"]
        state["nura"]["T1"] += 2
        state["saryarka"]["E2"] += 2
        for metrics in state.values():
            for key in metrics:
                metrics[key] = max(0, min(100, metrics[key]))
        shocked = deepcopy(state)
        for metrics in shocked.values():
            metrics["C1"] = max(0, metrics["C1"] - 12)
            metrics["E2"] = max(0, metrics["E2"] - 8)
        expected = _score_state(data, shocked)
        with patch("events._score_state", wraps=_score_state) as scorer:
            report = events.story_event(decisions, "harsh-winter")
        self.assertEqual(scorer.call_count, 2)
        self.assertEqual(scorer.call_args_list[0].args[1], state)
        self.assertEqual(scorer.call_args_list[1].args[1], shocked)
        self.assertEqual(report["forecast"]["score"], round(expected["score"], 2))
        self.assertEqual(report["forecast"]["criticalCount"], expected["criticalCount"])

    def test_burst_only_shocks_weakest_utility_district(self):
        report = events.story_event(PLAN[:2], "heating-main-burst")
        weakest = min(report["evaluation"]["districts"], key=lambda district: district["metrics"]["C1"])
        self.assertEqual(report["event"]["districtIds"], [weakest["id"]])
        for district in report["forecast"]["districts"]:
            self.assertEqual(district["affected"], district["id"] == weakest["id"])
            if not district["affected"]:
                self.assertEqual(district["metrics"], district["beforeMetrics"])
                self.assertEqual(district["delta"], 0)

    def test_language_changes_copy_but_not_numbers(self):
        reports = {language: events.story_event(PLAN, "harsh-winter", language) for language in ("ru", "kk", "en")}
        self.assertEqual(reports["kk"]["event"]["title"], "Қатал қыс")
        self.assertEqual(reports["en"]["event"]["title"], "A harsh winter")
        self.assertEqual(reports["kk"]["event"]["districts"][-1], "Нұра")
        for language in ("kk", "en"):
            self.assertEqual(reports[language]["evaluation"], reports["ru"]["evaluation"])
            self.assertEqual(reports[language]["forecast"]["score"], reports["ru"]["forecast"]["score"])
            self.assertNotEqual(reports[language]["event"]["summary"], reports["ru"]["event"]["summary"])
        kk_stress = events.stress(PLAN, "kk")
        self.assertEqual(kk_stress["events"][0]["title"], "Қатал қыс")
        self.assertEqual(len(kk_stress["events"]), 6)

    def test_unknown_event_or_language_is_rejected(self):
        for event_id in (None, [], {}, 1, "unknown", "smog-episode", "school-overcrowding"):
            with self.subTest(event=event_id), self.assertRaises(ValueError):
                events.story_event([], event_id)
        for language in (None, [], "de", ""):
            with self.assertRaises(ValueError):
                events.story_event([], "harsh-winter", language)


class StoryEventHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = server.create_server("127.0.0.1", 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def post(self, payload, path="/api/story-event"):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=4)
        try:
            with patch.object(server.SimulatorHandler, "log_message"):
                connection.request("POST", path, json.dumps(payload).encode(), {"Content-Type": "application/json"})
                response = connection.getresponse()
                return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_http_supports_zero_through_five_and_all_four_events(self):
        for count in range(6):
            for event_id in events.STORY_EVENT_IDS:
                with self.subTest(count=count, event=event_id):
                    payload = {"decisions": PLAN[:count], "eventId": event_id, "language": "en"}
                    status, result = self.post(payload)
                    self.assertEqual(status, 200)
                    self.assertEqual(result, events.story_event(PLAN[:count], event_id, "en"))

    def test_http_requires_known_event_and_rejects_extra_effects(self):
        valid = {"decisions": [], "eventId": "harsh-winter"}
        invalid = [{"decisions": []}, {"eventId": "harsh-winter"}, [], None,
                   {**valid, "decisions": {}}, {**valid, "language": "de"},
                   {**valid, "effects": {"C1": 100}}, {**valid, "cost": -10},
                   *({**valid, "eventId": value} for value in (None, [], {}, 0, True, "unknown", "smog-episode")),
                   {**valid, "decisions": [{**PLAN[0], "cost": 0}]},
                   {**valid, "decisions": [{**PLAN[0], "effects": {"S1": 100}}]},
                   {**valid, "decisions": [PLAN[0], PLAN[0]]},
                   {**valid, "decisions": [*PLAN, PLAN[0]]}]
        for payload in invalid:
            with self.subTest(payload=payload):
                status, result = self.post(payload)
                self.assertEqual(status, 400)
                self.assertEqual(set(result), {"error"})
        self.assertEqual(self.post(valid, "/api/evaluate")[0], 400)
        self.assertEqual(self.post({"decisions": []}, "/api/evaluate")[0], 200)

    def test_http_rejects_overbudget_and_keeps_stress_complete_requirement(self):
        too_expensive = deepcopy(PLAN)
        too_expensive[2] = {"categoryId": "transport", "initiativeId": "M3", "districtId": "nura"}
        status, _ = self.post({"decisions": too_expensive, "eventId": "harsh-winter"})
        self.assertEqual(status, 400)
        for count in range(5):
            self.assertEqual(self.post({"decisions": PLAN[:count]}, "/api/stress")[0], 400)
        status, stress = self.post({"decisions": PLAN, "language": "kk"}, "/api/stress")
        self.assertEqual(status, 200)
        self.assertEqual(len(stress["events"]), 6)
        self.assertEqual(stress["events"][0]["title"], "Қатал қыс")


if __name__ == "__main__":
    unittest.main()
