import doctest

import pytest
from fastapi.testclient import TestClient

import main
from main import app, classify_ticket

client = TestClient(app)


@pytest.fixture(autouse=True)
def no_mistral_key(monkeypatch):
    """Force the keyword fallback so these tests never call the real API."""
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)


# --- classify_ticket -------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "I can't login",
        "I cannot log in to the site",
        "I forgot my password",
        "Please delete my account",
    ],
)
def test_classify_returns_account_for_access_problems(text):
    assert classify_ticket(text) == "Account"


@pytest.mark.parametrize(
    "text",
    [
        "Where is my invoice?",
        "My payment did not go through",
        "I want a refund",
    ],
)
def test_classify_returns_billing_for_money_problems(text):
    assert classify_ticket(text) == "Billing"


@pytest.mark.parametrize(
    "text",
    [
        "I get an error on save",
        "Found a bug in the editor",
        "The app keeps crashing",  # "crash" matches inside "crashing"
        "The dashboard is blank",
    ],
)
def test_classify_returns_technical_for_software_problems(text):
    assert classify_ticket(text) == "Technical"


@pytest.mark.parametrize("text", ["", "Hello there", "What are your opening hours?"])
def test_classify_returns_other_when_no_keyword_matches(text):
    assert classify_ticket(text) == "Other"


@pytest.mark.parametrize("text", ["PASSWORD reset", "Refund Please", "BUG"])
def test_classify_is_case_insensitive(text):
    assert classify_ticket(text) != "Other"


def test_classify_prefers_account_over_billing_and_technical():
    assert classify_ticket("login error after payment") == "Account"


def test_classify_prefers_billing_over_technical():
    assert classify_ticket("refund for the crash") == "Billing"


def test_classify_handles_unicode_text():
    assert classify_ticket("Café payment failed ☕") == "Billing"


def test_classify_matches_keywords_inside_other_words():
    # Current behavior: keywords match as substrings, so "debug" contains
    # "bug" and "accountant" contains "account". Possibly unintended.
    assert classify_ticket("please debug this") == "Technical"
    assert classify_ticket("I am an accountant") == "Account"


def test_classify_docstring_examples_are_correct():
    assert doctest.testmod(main).failed == 0


# --- GET / -----------------------------------------------------------------


def test_index_serves_the_html_page():
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>Ticket Analyzer</title>" in response.text


def test_index_works_when_started_from_another_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert client.get("/").status_code == 200


# --- GET /health -----------------------------------------------------------


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --- GET /greet/{name} -----------------------------------------------------


def test_greet_returns_plain_text_greeting():
    response = client.get("/greet/Elisa")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == "Hello, Elisa!"


def test_greet_decodes_url_encoded_unicode_names():
    response = client.get("/greet/Jos%C3%A9%20Mar%C3%ADa")
    assert response.text == "Hello, José María!"


def test_greet_without_name_returns_404():
    assert client.get("/greet/").status_code == 404


@pytest.mark.parametrize("path", ["/greet/a/b", "/greet/a%2Fb"])
def test_greet_with_slash_in_name_returns_404(path):
    assert client.get(path).status_code == 404


def test_greet_accepts_whitespace_only_name():
    # Current behavior: the name is not trimmed or validated.
    assert client.get("/greet/%20").text == "Hello,  !"


# --- POST /analyze ---------------------------------------------------------


def test_analyze_returns_category_and_character_count():
    response = client.post("/analyze", json={"text": "I want a refund"})
    assert response.status_code == 200
    assert response.json() == {
        "original": "I want a refund",
        "character_count": 15,
        "category": "Billing",
        "source": "keywords",
    }


def test_analyze_keeps_original_text_unchanged():
    response = client.post("/analyze", json={"text": "  LOGIN Broken  "})
    body = response.json()
    assert body["original"] == "  LOGIN Broken  "
    assert body["character_count"] == 16
    assert body["category"] == "Account"


def test_analyze_counts_unicode_characters_not_bytes():
    response = client.post("/analyze", json={"text": "café"})
    assert response.json()["character_count"] == 4


def test_analyze_accepts_whitespace_only_text():
    # Current behavior: min_length=1 counts spaces, so "   " is accepted.
    response = client.post("/analyze", json={"text": "   "})
    assert response.status_code == 200
    assert response.json()["category"] == "Other"


@pytest.mark.parametrize(
    "payload",
    [
        {"text": ""},
        {},
        {"text": None},
        {"text": 123},
        {"message": "hello"},
    ],
)
def test_analyze_rejects_invalid_body_with_422(payload):
    assert client.post("/analyze", json=payload).status_code == 422


def test_analyze_ignores_extra_fields():
    response = client.post("/analyze", json={"text": "hi", "priority": "high"})
    assert response.status_code == 200
    assert response.json() == {
        "original": "hi",
        "character_count": 2,
        "category": "Other",
        "source": "keywords",
    }


def test_analyze_rejects_non_json_body_with_422():
    response = client.post(
        "/analyze", content="not json", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


def test_analyze_rejects_get_with_405():
    assert client.get("/analyze").status_code == 405
