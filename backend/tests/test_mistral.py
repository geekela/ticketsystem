"""Tests for the Mistral path of `POST /analyze`, using a fake client (no network)."""

import logging
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from mistralai.client.errors import SDKError

import main
from main import app

client = TestClient(app)


class FakeChat:
    """Stands in for `client.chat`. Validates `reply` the way the real SDK does."""

    def __init__(self, reply=None, error=None):
        self.reply = reply
        self.error = error
        self.calls = []

    def parse(self, response_format, **kwargs):
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        parsed = None if self.reply is None else response_format.model_validate(self.reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))])


@pytest.fixture
def fake_chat(monkeypatch):
    """Install a fake Mistral client; tests set `reply` or `error` on it."""
    chat = FakeChat()
    monkeypatch.setattr(main, "get_mistral_client", lambda: SimpleNamespace(chat=chat))
    return chat


def analyze(text):
    response = client.post("/analyze", json={"text": text})
    assert response.status_code == 200
    return response.json()


def test_uses_mistral_category_when_client_is_available(fake_chat):
    # Keywords would say "Billing"; Mistral's answer wins.
    fake_chat.reply = {"category": "Technical"}
    body = analyze("Refund button throws a 500")
    assert body["category"] == "Technical"
    assert body["source"] == "mistral"


def test_sends_ticket_text_as_user_message(fake_chat):
    fake_chat.reply = {"category": "Other"}
    analyze("Hello")
    messages = fake_chat.calls[0]["messages"]
    assert messages[-1] == {"role": "user", "content": "Hello"}
    assert fake_chat.calls[0]["model"] == main.MISTRAL_MODEL


@pytest.mark.parametrize("raw", ["billing", "BILLING", " Billing "])
def test_normalizes_category_case_and_whitespace(fake_chat, raw):
    fake_chat.reply = {"category": raw}
    body = analyze("I want a refund")
    assert body == {**body, "category": "Billing", "source": "mistral"}


@pytest.mark.parametrize(
    "reply",
    [
        {"category": "Shipping"},  # unknown category
        {"category": 42},  # wrong type
        {},  # missing field
        None,  # no parsed content
    ],
)
def test_falls_back_to_keywords_on_invalid_output(fake_chat, reply):
    fake_chat.reply = reply
    body = analyze("I forgot my password")
    assert body["category"] == "Account"
    assert body["source"] == "keywords"


@pytest.mark.parametrize(
    "error",
    [
        SDKError("Unauthorized", httpx.Response(401, request=httpx.Request("POST", "https://x"))),
        httpx.ConnectTimeout("timed out"),
    ],
)
def test_falls_back_to_keywords_on_api_errors(fake_chat, error):
    fake_chat.error = error
    body = analyze("I want a refund")
    assert body["category"] == "Billing"
    assert body["source"] == "keywords"


def test_failure_log_names_the_error_but_not_the_ticket(fake_chat, caplog):
    fake_chat.reply = {"category": "Shipping"}
    with caplog.at_level(logging.WARNING, logger="main"):
        analyze("secret customer details")
    assert "ValidationError" in caplog.text
    assert "secret customer details" not in caplog.text


def test_unexpected_errors_are_not_swallowed(fake_chat):
    # Bugs in our own code should surface as 500s, not silently fall back.
    fake_chat.error = KeyError("bug")
    with pytest.raises(KeyError):
        client.post("/analyze", json={"text": "hi"})


def test_no_api_key_means_no_client(monkeypatch):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    assert main.get_mistral_client() is None


def test_api_key_creates_client(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
    assert main.get_mistral_client() is not None
