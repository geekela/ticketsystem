"""Live tests: send real tickets to Claude through `POST /analyze`.

Skipped by default. Run with `uv run pytest -m live -v` (or `pnpm test:live`
from the repo root). They use the keys in backend/.env and cost a little.

None of these tickets contain a keyword, so the keyword fallback would answer
"Other" for all of them: a correct non-"Other" category means Claude did the work.
"""

import logging
import os

import pytest
from fastapi.testclient import TestClient

from main import app

pytestmark = pytest.mark.live

client = TestClient(app)


@pytest.fixture(autouse=True)
def use_anthropic(monkeypatch):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.fail("ANTHROPIC_API_KEY is not set: add it to backend/.env to run live tests")
    monkeypatch.setenv("ANALYZER", "anthropic")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I was charged twice for my subscription this month", "Billing"),
        ("Why is there an extra fee from you on my credit card statement?", "Billing"),
        ("The export button doesn't do anything when I click it", "Technical"),
        ("The app freezes every time I open the reports page", "Technical"),
        ("I can't sign in anymore, it says my credentials are wrong", "Account"),
        ("How do I change the email address on my profile?", "Account"),
        ("Do you have an office in Rome?", "Other"),
        ("What are your opening hours on public holidays?", "Other"),
    ],
)
def test_claude_classifies_ticket(text, expected, caplog):
    with caplog.at_level(logging.WARNING, logger="main"):
        response = client.post("/analyze", json={"text": text})
    assert response.status_code == 200
    body = response.json()
    # The backend silently falls back to keywords on any API failure, so check
    # who answered first; the log names the error type (auth, rate limit, ...).
    assert body["source"] == "anthropic", f"Claude was not used: {caplog.text.strip() or 'no error logged'}"
    assert body["category"] == expected
