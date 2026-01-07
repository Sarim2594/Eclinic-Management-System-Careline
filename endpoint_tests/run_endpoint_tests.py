#!/usr/bin/env python
"""
Utility to run scripted checks against every FastAPI endpoint.

The script can either (a) run tests defined in a JSON scenario file or
(b) generate a template that lists all discovered endpoints so you can
quickly fill in the payloads/params you care about.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence

from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient, HTTPError
import logging

# Ensure the project root (where main.py lives) is on sys.path even when this
# script is executed from within the scripts/ directory.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in map(str, sys.path):
    sys.path.insert(0, str(ROOT_DIR))

try:
    from main import app, db
except ImportError as exc:  # pragma: no cover
    logging.error("Unable to import FastAPI app from main.py: %s", exc)
    sys.exit(1)


DEFAULT_EXPECTED_STATUS = [200, 201, 202, 204]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run automated endpoint checks")
    parser.add_argument(
        "--scenario",
        type=Path,
        default=Path("scripts/endpoint_scenarios.json"),
        help="Path to the JSON scenario file.",
    )
    parser.add_argument(
        "--generate-template",
        action="store_true",
        help="Generate a scenario template file instead of running tests.",
    )
    parser.add_argument(
        "--stop-on-fail",
        action="store_true",
        help="Stop executing after the first failed test.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Request timeout in seconds (overrides scenario defaults).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print each request payload and response body snippet.",
    )
    return parser.parse_args()


def serialize_routes() -> Dict[str, Any]:
    """Build a JSON-friendly template that lists all discovered endpoints."""
    routes = [r for r in app.routes if isinstance(r, APIRoute)]
    tests = []
    for route in sorted(routes, key=lambda r: r.path):
        for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
            tests.append(
                {
                    "name": f"{method} {route.path}",
                    "enabled": False,
                    "method": method,
                    "path": route.path,
                    "params": {},
                    "json": {},
                    "headers": {},
                    "expected_status": DEFAULT_EXPECTED_STATUS,
                }
            )
    return {
        "defaults": {
            "timeout": 10.0,
            "expected_status": DEFAULT_EXPECTED_STATUS,
            "headers": {},
            "params": {},
        },
        "tests": tests,
    }


def generate_template(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    template = serialize_routes()
    path.write_text(json.dumps(template, indent=2))
    logging.info("Wrote template with %d tests to %s", len(template['tests']), path)


def load_scenarios(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Scenario file {path} not found. "
            "Run with --generate-template to create a starter file."
        )

    data = json.loads(path.read_text())
    if isinstance(data, list):
        return {"defaults": {}, "tests": data}
    if "tests" not in data:
        raise ValueError("Scenario file must contain a top-level 'tests' key.")
    return data


def merge_defaults(defaults: Dict[str, Any], test: Dict[str, Any]) -> Dict[str, Any]:
    merged = {**defaults, **test}
    merged.setdefault("expected_status", defaults.get("expected_status", DEFAULT_EXPECTED_STATUS))
    merged.setdefault("headers", defaults.get("headers", {}))
    merged.setdefault("params", defaults.get("params", {}))
    return merged


async def run_single_test(
    client: AsyncClient,
    test: Dict[str, Any],
    timeout: float,
    verbose: bool,
) -> Dict[str, Any]:
    method = test["method"].upper()
    path = test["path"]
    payload: Dict[str, Any] = {}

    if test.get("params"):
        payload["params"] = test["params"]
    if test.get("json") is not None:
        payload["json"] = test["json"]
    if test.get("headers"):
        payload["headers"] = test["headers"]

    try:
        response = await client.request(method, path, timeout=timeout, **payload)
        status_ok = response.status_code in test.get("expected_status", DEFAULT_EXPECTED_STATUS)
        snippet = response.text[:500] if verbose or not status_ok else ""
        return {
            "name": test.get("name", f"{method} {path}"),
            "status_code": response.status_code,
            "ok": status_ok,
            "response_preview": snippet,
        }
    except HTTPError as exc:
        return {
            "name": test.get("name", f"{method} {path}"),
            "status_code": None,
            "ok": False,
            "error": str(exc),
        }


async def execute_tests(
    tests: Sequence[Dict[str, Any]],
    timeout: float,
    verbose: bool,
    stop_on_fail: bool,
) -> List[Dict[str, Any]]:
    # Ensure database has seed data similar to when running the real app
    try:
        db.initialize_test_data()
    except Exception as exc:  # pragma: no cover
        logging.warning("Warning: failed to initialize test data: %s", exc)

    transport = ASGITransport(app=app)
    results: List[Dict[str, Any]] = []
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for test in tests:
            if not test.get("enabled", True):
                continue
            result = await run_single_test(client, test, timeout, verbose)
            results.append(result)
            status_symbol = "✅" if result["ok"] else "❌"
            logging.info("%s %s -> %s", status_symbol, result['name'], result.get('status_code'))
            if verbose and result.get("response_preview"):
                logging.info(result["response_preview"])
                logging.info("%s", "-" * 80)
            if stop_on_fail and not result["ok"]:
                break
    return results


def summarize(results: Sequence[Dict[str, Any]]) -> int:
    total = len(results)
    failed = [r for r in results if not r["ok"]]
    logging.info("\n" + "=" * 60)
    logging.info("Executed %d enabled tests | Failures: %d", total, len(failed))
    if failed:
        logging.info("%s", "-" * 60)
        for result in failed:
            detail = result.get("error") or result.get("response_preview") or "No body captured."
            logging.info("%s (Status: %s)", result['name'], result.get('status_code'))
            logging.info(detail)
            logging.info("%s", "-" * 60)
    return 1 if failed else 0


def main() -> int:
    args = parse_args()
    if args.generate_template:
        generate_template(args.scenario)
        return 0

    scenarios = load_scenarios(args.scenario)
    defaults = scenarios.get("defaults", {})
    timeout = args.timeout or defaults.get("timeout", 10.0)
    tests = [merge_defaults(defaults, test) for test in scenarios.get("tests", [])]

    if not any(t.get("enabled", True) for t in tests):
        logging.info("No enabled tests were found in the scenario file.")
        return 0

    results = asyncio.run(
        execute_tests(
            tests=tests,
            timeout=timeout,
            verbose=args.verbose,
            stop_on_fail=args.stop_on_fail,
        )
    )
    return summarize(results)


if __name__ == "__main__":
    raise SystemExit(main())

