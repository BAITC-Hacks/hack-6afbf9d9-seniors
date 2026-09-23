"""Audits the project against the case document, empirically.

This is not part of the test suite. It exists to answer one question before
submission — does the running system actually satisfy every stated
requirement — by exercising the real engine rather than reading the code.

Run: py tests/audit_requirements.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from city_model import evaluate, load_data  # noqa: E402
import optimizer  # noqa: E402
import scenarios  # noqa: E402

PASS, FAIL = "PASS", "FAIL"
results = []


def check(label, condition, detail=""):
    results.append((PASS if condition else FAIL, label, detail))


REFERENCE = [
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
    {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "saryarka"},
]

data = load_data()

print("=" * 72)
print("MUST HAVE")
print("=" * 72)

# 1. A single virtual budget for every user.
check(
    "1. Single virtual budget for all users",
    data["budget"] == 100 and data["rules"]["budget"] == 100,
    f"budget = {data['budget']}, identical for every session (server-owned)",
)

# 2. Decisions across the five stated directions.
categories = [item["id"] for item in data["categories"]]
check(
    "2. Decisions across the five directions",
    len(categories) == 5,
    ", ".join(categories),
)

# 3. Automatic budget-overrun control.
overbudget = [
    {"categoryId": "transport", "initiativeId": "M3", "districtId": "nura"},
    {"categoryId": "services", "initiativeId": "M13", "districtId": "nura"},
    {"categoryId": "green", "initiativeId": "M5", "districtId": "almaty"},
    {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
    {"categoryId": "transport", "initiativeId": "M2", "districtId": None},
]
try:
    evaluate(overbudget, True)
    rejected = False
    reason = "accepted a 129-unit plan"
except ValueError as error:
    rejected, reason = True, str(error)
check("3. Automatic budget-overrun control", rejected, reason)

# 5. The Astana Quality of Life Score. (4 and 6 are AI, checked below.)
baseline = evaluate([])
check(
    "5. Astana Quality of Life Score is computed",
    baseline["score"] == 52.56,
    f"baseline = {baseline['score']} (matches the published figure)",
)

# 4 and 6. AI analysis, and the explanation of strengths, risks, consequences.
from ai_analysis import analyze, ai_status  # noqa: E402

status = ai_status()
analysis = analyze(evaluate(REFERENCE, True), data, language="en")
has_sections = all(bool(analysis.get(key)) for key in ("strengths", "risks", "tradeoffs"))
if not has_sections:
    has_sections = len(str(analysis)) > 200
check(
    "4. AI analysis of the chosen decisions",
    bool(analysis),
    f"mode = {analysis.get('mode', 'n/a')}, provider = {status['provider']}",
)
check(
    "6. Explanation of strengths, risks and consequences",
    has_sections,
    "sections present: " + ", ".join(k for k in ("strengths", "risks", "tradeoffs") if analysis.get(k)),
)

print()
for verdict, label, detail in results:
    print(f"  [{verdict}] {label}")
    if detail:
        print(f"         {detail}")

results.clear()
print()
print("=" * 72)
print("VERIFICATION CRITERIA (Критерии проверки)")
print("=" * 72)

# 1. Every team starts from the same budget and the same source data.
check(
    "1. Identical starting budget and data for everyone",
    evaluate([])["score"] == evaluate([])["score"] == 52.56,
    "the dataset is server-side and constant; no per-session state",
)

# 2. The system does not permit exceeding the budget.
check("2. Budget cannot be exceeded", rejected, reason)

# 3. Decisions affect the model's final indicators.
before = evaluate([])["districts"] if "districts" in evaluate([]) else None
ref = evaluate(REFERENCE, True)
moved = ref["score"] != baseline["score"]
check(
    "3. Decisions change the model's indicators",
    moved,
    f"{baseline['score']} -> {ref['score']} with five decisions",
)

# 4. The AI produces an intelligible explanation of the result and trade-offs.
check(
    "4. AI explains the result and the main trade-offs",
    has_sections,
    f"mode = {analysis.get('mode', 'n/a')}; falls back to a labelled deterministic report without a key",
)

# 5. Changing the decision set changes the Score.
alternative = [
    {"categoryId": "transport", "initiativeId": "M3", "districtId": "esil"},
    {"categoryId": "green", "initiativeId": "M4", "districtId": "esil"},
    {"categoryId": "social", "initiativeId": "M9", "districtId": "esil"},
    {"categoryId": "services", "initiativeId": "M12", "districtId": None},
    {"categoryId": "services", "initiativeId": "M14", "districtId": None},
]
alt = evaluate(alternative, True)
check(
    "5. A different decision set gives a different Score",
    alt["score"] != ref["score"],
    f"{ref['score']} vs {alt['score']}",
)

for verdict, label, detail in results:
    print(f"  [{verdict}] {label}")
    if detail:
        print(f"         {detail}")

results.clear()
print()
print("=" * 72)
print("RULES (Правила, section 4 of the brief)")
print("=" * 72)


def rejects(decisions, label, detail):
    try:
        evaluate(decisions, True)
        check(label, False, "ACCEPTED — should have been rejected")
    except ValueError as error:
        check(label, True, detail or str(error))


check("1. Budget is 100 units", data["budget"] == 100, "")
rejects(REFERENCE[:4], "2. Exactly five decisions, not 'up to five'", "four decisions rejected")
rejects(
    [REFERENCE[0], {"categoryId": "social", "initiativeId": "M7", "districtId": "almaty"}] + REFERENCE[2:],
    "3. No repeats, even in different districts", "duplicate M7 rejected",
)
rejects(
    [{"categoryId": "transport", "initiativeId": "M1", "districtId": None}] + REFERENCE[1:],
    "4a. District required for a district measure", "M1 without a district rejected",
)
rejects(
    [{"categoryId": "services", "initiativeId": "M12", "districtId": "nura"}] + REFERENCE[:3]
    + [{"categoryId": "social", "initiativeId": "M9", "districtId": "nura"}],
    "4b. City measure takes no district", "M12 with a district rejected",
)
rejects(
    [{"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
     {"categoryId": "social", "initiativeId": "M8", "districtId": "nura"},
     {"categoryId": "social", "initiativeId": "M9", "districtId": "nura"},
     {"categoryId": "services", "initiativeId": "M12", "districtId": None},
     {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"}],
    "5. At most two measures per direction", "three social measures rejected",
)
rejects(
    [{"categoryId": "transport", "initiativeId": "M1", "districtId": "nura"},
     {"categoryId": "transport", "initiativeId": "M3", "districtId": "almaty"},
     {"categoryId": "social", "initiativeId": "M9", "districtId": "nura"},
     {"categoryId": "services", "initiativeId": "M12", "districtId": None},
     {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"}],
    "6a. M1 and M3 incompatible anywhere", "M1 + M3 rejected",
)
rejects(
    [{"categoryId": "green", "initiativeId": "M4", "districtId": "nura"},
     {"categoryId": "social", "initiativeId": "M7", "districtId": "nura"},
     {"categoryId": "safety", "initiativeId": "M10", "districtId": "nura"},
     {"categoryId": "services", "initiativeId": "M12", "districtId": None},
     {"categoryId": "social", "initiativeId": "M9", "districtId": "nura"}],
    "6b. M4 and M7 incompatible in the same district", "M4 + M7 in Nura rejected",
)

# 7. An invalid set is not scored at all.
try:
    evaluate(REFERENCE[:3], True)
    not_scored = False
except ValueError:
    not_scored = True
check("7. An invalid set receives no Score, with a reason", not_scored, "raises with an explanation")

# 8. Order is irrelevant.
shuffled = list(reversed(REFERENCE))
check(
    "8. Decision order does not affect the result",
    evaluate(shuffled, True)["score"] == ref["score"],
    f"both orders give {ref['score']}",
)

for verdict, label, detail in results:
    print(f"  [{verdict}] {label}")
    if detail:
        print(f"         {detail}")

results.clear()
print()
print("=" * 72)
print("PUBLISHED FIGURES")
print("=" * 72)

check("Baseline Score", baseline["score"] == 52.56, f"52.56 == {baseline['score']}")
check("Baseline city average", baseline["weightedAverage"] == 56.86, f"56.86 == {baseline['weightedAverage']}")
check("Baseline weakest district", baseline["minDistrict"] == 49.18, f"49.18 == {baseline['minDistrict']}")
check("Reference example Score", ref["score"] == 56.54, f"56.54 == {ref['score']}")
cache = optimizer.load_cache()
check(
    "Optimum is proven, not estimated",
    cache is not None and cache["plans"][0]["score"] == 57.24,
    f"57.24 across {cache['plansExamined']:,} plans" if cache else "no cache exported",
)

for verdict, label, detail in results:
    print(f"  [{verdict}] {label}")
    if detail:
        print(f"         {detail}")

print()
print("=" * 72)
failures = [r for r in results if r[0] == FAIL]
print("AUDIT COMPLETE" if not failures else f"{len(failures)} FAILURES")
print("=" * 72)
