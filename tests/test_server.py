"""HTTP and optional AI boundary tests; no paid API calls or network dependencies."""

import io
import json
import os
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import ai_analysis
import server
from city_model import evaluate, load_data


EXAMPLE = [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12"},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
]


class ServerTests(unittest.TestCase):
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

    def setUp(self):
        self.env = patch.dict(os.environ, {"OPENAI_API_KEY": "", "OPENAI_MODEL": "gpt-4.1-mini"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.logs = patch.object(server.SimulatorHandler, "log_message")
        self.logs.start()
        self.addCleanup(self.logs.stop)

    def request(self, method, path, data=None, *, body=None, headers=None):
        request_headers = dict(headers or {})
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=4)
        try:
            connection.request(method, path, body=body, headers=request_headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_bootstrap_has_identical_baseline_and_no_key(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-test-never-expose"}):
            status, headers, body = self.request("GET", "/api/bootstrap")
        result = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(result["baseline"]["score"], 52.56)
        self.assertEqual(result["baseline"]["budget"], 100)
        self.assertEqual(result["ai"], {"enabled": True, "provider": "OpenAI"})
        self.assertNotIn(b"secret-test-never-expose", body)
        self.assertEqual(len(result["initiatives"]), 14)
        self.assertIn("application/json", headers["Content-Type"])

    def test_evaluate_returns_authoritative_result(self):
        status, _, body = self.request("POST", "/api/evaluate", {"decisions": EXAMPLE})
        result = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(result["spent"], 95)
        self.assertEqual(result["score"], 56.54)
        self.assertTrue(result["complete"])

    def test_overbudget_is_rejected(self):
        decisions = list(EXAMPLE)
        decisions[2] = {"categoryId": "transport", "initiativeId": "M3", "districtId": "nura"}
        status, _, body = self.request("POST", "/api/evaluate", {"decisions": decisions})
        self.assertEqual(status, 400)
        self.assertIn("бюджет", json.loads(body)["error"].lower())
        self.assertNotIn("score", json.loads(body))

    def test_analyze_requires_exactly_five_decisions(self):
        status, _, body = self.request("POST", "/api/analyze", {"decisions": EXAMPLE[:4]})
        self.assertEqual(status, 400)
        self.assertIn("error", json.loads(body))

    def test_analyze_is_explicitly_demo_without_key(self):
        with patch("ai_analysis.urlopen") as external:
            status, _, body = self.request("POST", "/api/analyze", {"decisions": EXAMPLE})
        result = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(result["evaluation"]["score"], 56.54)
        self.assertEqual(result["analysis"]["mode"], "demo")
        self.assertTrue(result["analysis"]["notice"])
        self.assertTrue(result["analysis"]["strengths"])
        external.assert_not_called()

    def test_invalid_json_and_payload_shapes_are_rejected(self):
        for payload in (b"{", b"[]", b"null", b'{"decisions":{}}',
                        b'{"decisions":[],"spent":0}', b'{"decisions":NaN}'):
            with self.subTest(payload=payload):
                status, _, body = self.request("POST", "/api/evaluate", body=payload,
                                                headers={"Content-Type": "application/json"})
                self.assertEqual(status, 400)
                self.assertIn("error", json.loads(body))

    def test_wrong_content_type_and_oversize_rejected(self):
        status, _, _ = self.request("POST", "/api/evaluate", body=b"{}",
                                     headers={"Content-Type": "text/plain"})
        self.assertEqual(status, 415)
        status, _, _ = self.request("POST", "/api/evaluate", body=b"x" * (server.MAX_BODY_BYTES + 1),
                                     headers={"Content-Type": "application/json"})
        self.assertEqual(status, 413)

    def test_cross_origin_ai_request_is_rejected(self):
        with patch("ai_analysis.urlopen") as external:
            status, _, _ = self.request("POST", "/api/analyze", {"decisions": EXAMPLE},
                                         headers={"Origin": "https://unrelated.example"})
        self.assertEqual(status, 403)
        external.assert_not_called()

    def test_private_files_and_traversal_are_not_served(self):
        for path in ("/.env", "/.git/config", "/server.py", "/data/city.json",
                     "/../server.py", "/%2e%2e/.env", "/%2e%2e%5c.env", "/"):
            with self.subTest(path=path):
                status, headers, body = self.request("GET", path)
                if path == "/":
                    self.assertEqual(status, 200)
                    self.assertIn(b"<!doctype html>", body.lower())
                    self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
                else:
                    self.assertEqual(status, 404)

    def test_static_content_types_health_and_unknown_endpoint(self):
        status, headers, _ = self.request("GET", "/app.js")
        self.assertEqual(status, 200)
        self.assertIn("javascript", headers["Content-Type"])
        status, _, body = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"status": "ok"})
        self.assertEqual(self.request("POST", "/api/missing", {"decisions": []})[0], 404)

    def test_rejected_posts_consume_body_before_sending_json(self):
        # Sending headers and body separately reproduces the Windows reset race:
        # an early response must not close the socket before the body arrives.
        body = json.dumps({"decisions": [], "padding": "x" * 32000}).encode()
        for path, headers, expected in (
            ("/api/missing", {"Content-Type": "application/json"}, 404),
            ("/api/evaluate", {"Content-Type": "text/plain"}, 415),
            ("/api/analyze", {"Content-Type": "application/json", "Origin": "https://other.example"}, 403),
        ):
            with self.subTest(path=path, expected=expected):
                connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=4)
                try:
                    connection.putrequest("POST", path)
                    for key, value in headers.items():
                        connection.putheader(key, value)
                    connection.putheader("Content-Length", str(len(body)))
                    connection.endheaders()
                    connection.send(body)
                    response = connection.getresponse()
                    self.assertEqual(response.status, expected)
                    self.assertIn("error", json.loads(response.read()))
                finally:
                    connection.close()


class AIAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "gpt-4.1-mini"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.evaluation = evaluate(EXAMPLE, require_complete=True)
        self.catalog = load_data()
        self.answer = {
            "summary": "Показатель вырос с 52.56 до 56.54.",
            "strengths": ["Сценарий укладывается в бюджет."],
            "risks": ["Эффект мер зависит от сроков реализации."],
            "recommendations": ["Проверьте альтернативный набор в симуляторе."],
        }

    def api_response(self, answer=None, **overrides):
        payload = {
            "status": "completed",
            "output": [{"type": "message", "content": [
                {"type": "output_text", "text": json.dumps(answer if answer is not None else self.answer)}
            ]}],
        }
        payload.update(overrides)
        return io.BytesIO(json.dumps(payload).encode())

    def test_valid_structured_ai_response(self):
        with patch("ai_analysis.urlopen", return_value=self.api_response()) as external:
            result = ai_analysis.analyze(self.evaluation, self.catalog)
        self.assertEqual(result["mode"], "ai")
        self.assertEqual(result["summary"], self.answer["summary"])
        request = external.call_args.args[0]
        sent = json.loads(request.data)
        self.assertEqual(request.full_url, "https://api.openai.com/v1/responses")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
        self.assertEqual(sent["text"]["format"]["type"], "json_schema")
        self.assertTrue(sent["text"]["format"]["strict"])
        self.assertFalse(sent["store"])
        self.assertEqual(sent["model"], "gpt-4.1-mini")
        self.assertEqual(external.call_args.kwargs["timeout"], 45)
        self.assertNotIn("test-key", json.dumps(result))

    def test_external_failure_falls_back_without_leaking_secrets(self):
        failures = [URLError("secret-upstream-body"), TimeoutError("test-key"),
                    HTTPError("https://api.openai.com", 429, "secret-upstream-body", {}, None)]
        for failure in failures:
            with self.subTest(error=type(failure).__name__), patch("ai_analysis.urlopen", side_effect=failure):
                result = ai_analysis.analyze(self.evaluation, self.catalog)
            self.assertEqual(result["mode"], "demo")
            self.assertIn("не ответил", result["notice"])
            self.assertNotIn("secret-upstream-body", json.dumps(result))
            self.assertNotIn("test-key", json.dumps(result))

    def test_incomplete_refused_and_malformed_results_fall_back(self):
        responses = [
            self.api_response(status="incomplete"),
            self.api_response(output=[{"type": "message", "content": [{"type": "refusal", "refusal": "No"}]}]),
            self.api_response(answer={"summary": "Missing fields"}),
            self.api_response(answer={**self.answer, "risks": "wrong type"}),
            self.api_response(answer={**self.answer, "score": 100}),
            io.BytesIO(b"invalid-json"),
            io.BytesIO(b"x" * (ai_analysis.MAX_RESPONSE_BYTES + 1)),
        ]
        for response in responses:
            with patch("ai_analysis.urlopen", return_value=response):
                result = ai_analysis.analyze(self.evaluation, self.catalog)
            self.assertEqual(result["mode"], "demo")

    def test_truncated_http_response_falls_back(self):
        from http.client import IncompleteRead

        class TruncatedResponse(io.BytesIO):
            def read(self, size=-1):
                raise IncompleteRead(b"private-upstream-fragment", 100)

        with patch("ai_analysis.urlopen", return_value=TruncatedResponse()):
            result = ai_analysis.analyze(self.evaluation, self.catalog)
        self.assertEqual(result["mode"], "demo")
        self.assertNotIn("private-upstream-fragment", json.dumps(result))

    def test_env_loading_preserves_environment_and_ignores_arbitrary_keys(self):
        contents = 'OPENAI_API_KEY="file-key"\nOPENAI_MODEL=custom-model\nUNSAFE_SETTING=no\n'
        with patch.object(Path, "is_file", return_value=True), \
             patch.object(Path, "read_text", return_value=contents), \
             patch.dict(os.environ, {"OPENAI_API_KEY": "existing-key"}, clear=True):
            ai_analysis.load_environment(Path("unused-test.env"))
            self.assertEqual(os.environ["OPENAI_API_KEY"], "existing-key")
            self.assertEqual(os.environ["OPENAI_MODEL"], "custom-model")
            self.assertNotIn("UNSAFE_SETTING", os.environ)


if __name__ == "__main__":
    unittest.main()
