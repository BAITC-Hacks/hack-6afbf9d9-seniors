"""Dependency-free development server for the Astana city simulator."""

from __future__ import annotations

import argparse
import json
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from ai_analysis import ai_status, analyze, load_environment
from analysis_locale import validate_language
from city_model import evaluate, load_data
from scenarios import listing as scenario_listing

ROOT = Path(__file__).resolve().parent
PUBLIC_ROOT = ROOT / "public"
MAX_BODY_BYTES = 65_536
STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
}


class RequestError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message


def _reject_json_constant(value: str) -> None:
    raise ValueError("Non-finite JSON number")


class SimulatorHandler(BaseHTTPRequestHandler):
    server_version = "AkimSimulator/1.0"
    sys_version = ""

    def setup(self) -> None:
        super().setup()
        self.connection.settimeout(10)

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; "
                         "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                         "connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status: int, body: dict) -> None:
        self._send(status, json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8"),
                   "application/json; charset=utf-8")

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_GET(self) -> None:
        try:
            path = urlsplit(self.path).path
            if path == "/api/bootstrap":
                self._json(200, {**load_data(), "baseline": evaluate([]), "ai": ai_status()})
                return
            if path == "/api/scenarios":
                self._json(200, scenario_listing())
                return
            if path == "/health":
                self._json(200, {"status": "ok"})
                return
            if path.startswith("/api/"):
                self._json(404, {"error": "API-маршрут не найден."})
                return
            self._static(path)
        except (OSError, ValueError):
            self._json(500, {"error": "Не удалось обработать запрос."})

    def _static(self, path: str) -> None:
        decoded = unquote(path)
        parts = decoded.split("/")
        if "\\" in decoded or "\x00" in decoded or any(part.startswith(".") for part in parts if part):
            self._json(404, {"error": "Файл не найден."})
            return
        relative = decoded.lstrip("/") or "index.html"
        target = (PUBLIC_ROOT / relative).resolve()
        if not target.is_relative_to(PUBLIC_ROOT.resolve()) or target.suffix not in STATIC_TYPES or not target.is_file():
            self._json(404, {"error": "Файл не найден."})
            return
        self._send(200, target.read_bytes(), STATIC_TYPES[target.suffix])

    def _read_body(self) -> bytes:
        """Consume a bounded body before rejecting a route or its metadata.

        Closing a socket with unread input can reset the connection on Windows,
        hiding the JSON error response from the client.
        """
        if self.headers.get("Transfer-Encoding"):
            raise RequestError(400, "Требуется обычный JSON-запрос с Content-Length.")
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1:
            raise RequestError(400, "Требуется один заголовок Content-Length.")
        try:
            length = int(lengths[0])
        except ValueError:
            raise RequestError(400, "Некорректная длина запроса.") from None
        if length < 0:
            raise RequestError(400, "Некорректная длина запроса.")
        try:
            raw = self.rfile.read(min(length, MAX_BODY_BYTES + 1))
            if length > MAX_BODY_BYTES:
                raise RequestError(413, "Запрос слишком большой.")
            if len(raw) != length:
                raise RequestError(400, "Не удалось прочитать тело запроса полностью.")
            return raw
        except (socket.timeout, TimeoutError):
            raise RequestError(408, "Превышено время передачи запроса.") from None

    def _read_decisions(self, raw: bytes) -> tuple[list, str]:
        origin = self.headers.get("Origin")
        if origin is not None:
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or parsed.netloc != self.headers.get("Host"):
                raise RequestError(403, "Запросы разрешены только с адреса симулятора.")
        if self.headers.get_content_type() != "application/json":
            raise RequestError(415, "Отправьте данные в формате application/json.")
        try:
            data = json.loads(raw, parse_constant=_reject_json_constant)
        except (ValueError, UnicodeDecodeError, RecursionError):
            raise RequestError(400, "Некорректный JSON.") from None
        if (not isinstance(data, dict) or "decisions" not in data
                or set(data) - {"decisions", "language"} or not isinstance(data["decisions"], list)):
            raise RequestError(400, "Ожидается объект с массивом decisions.")
        try:
            language = validate_language(data.get("language", "ru"))
        except ValueError as error:
            raise RequestError(400, str(error)) from None
        return data["decisions"], language

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        try:
            raw = self._read_body()
            if path not in {"/api/evaluate", "/api/analyze"}:
                raise RequestError(404, "API-маршрут не найден.")
            decisions, language = self._read_decisions(raw)
            try:
                result = evaluate(decisions, require_complete=path == "/api/analyze")
            except ValueError as error:
                raise RequestError(400, str(error)) from None
            if path == "/api/evaluate":
                self._json(200, result)
            else:
                self._json(200, {"evaluation": result, "analysis": analyze(result, load_data(), language=language)})
        except RequestError as error:
            self._json(error.status, {"error": error.message})
        except (OSError, TypeError, KeyError, ValueError):
            self._json(500, {"error": "Не удалось обработать запрос. Попробуйте ещё раз."})


def create_server(host: str = "127.0.0.1", port: int = 8080) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), SimulatorHandler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Аким на 5 часов — локальный сервер симулятора")
    parser.add_argument("--host", default="127.0.0.1", help="Адрес сервера (по умолчанию 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8080, help="Порт сервера (по умолчанию 8080)")
    args = parser.parse_args()
    load_environment()
    with create_server(args.host, args.port) as server:
        print(f"Akim simulator: http://{args.host}:{server.server_port}", flush=True)
        print("AI: " + ai_status()["provider"], flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.", flush=True)


if __name__ == "__main__":
    main()
