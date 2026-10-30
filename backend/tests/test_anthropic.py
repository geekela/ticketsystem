"""Tests for the Anthropic path of `POST /analyze`, using a fake client (no network)."""

import json
import logging
from types import SimpleNamespace

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient

import main
from main import app

client = TestClient(app)


class FakeMessages:
    """Stands in for `client.beta.messages`; returns `reply` as Claude's JSON text."""

    def __init__(self):
        self.reply = None
        self.text = None
        self.stop_reason = "end_turn"
        self.error = None
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        text = self.text if self.text is not None else json.dumps(self.reply)
        content = [SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)]
        return SimpleNamespace(stop_reason=self.stop_reason, content=content)


@pytest.fixture
def fake_messages(monkeypatch):
    """Install a fake Anthropic client; tests set `reply`, `text`, `stop_reason` or `error`."""
    messages = FakeMessages()
    fake_client = SimpleNamespace(beta=SimpleNamespace(messages=messages))
    monkeypatch.setattr(main, "get_anthropic_client", lambda: fake_client)
    return messages


def analyze(text):
    response = client.post("/analyze", json={"text": text})
    assert response.status_code == 200
    return response.json()


def test_anthropic_is_the_default_analyzer(fake_messages):
    # Keywords would say "Billing"; Claude's answer wins.
    fake_messages.reply = {"category": "Technical"}
    body = analyze("Refund button throws a 500")
    assert body["category"] == "Technical"
    assert body["source"] == "anthropic"


def test_sends_ticket_text_and_category_schema(fake_messages, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-test-model")
    fake_messages.reply = {"category": "Other"}
    analyze("Hello")
    call = fake_messages.calls[0]
    assert call["model"] == "claude-test-model"
    assert call["system"] == main.SYSTEM_PROMPT
    assert call["messages"] == [{"role": "user", "content": "Hello"}]
    schema = call["output_config"]["format"]["schema"]
    assert schema["properties"]["category"]["enum"] == ["Account", "Billing", "Technical", "Other"]


def test_uses_default_model_when_not_configured(fake_messages):
    fake_messages.reply = {"category": "Other"}
    analyze("Hello")
    assert fake_messages.calls[0]["model"] == main.ANTHROPIC_DEFAULT_MODEL


@pytest.mark.parametrize(
    ("text", "stop_reason"),
    [
        ('{"category": "Shipping"}', "end_turn"),  # unknown category
        ("not json", "end_turn"),  # unparseable
        ('{"category": "Billing"}', "refusal"),  # declined
        ('{"category": "Bil', "max_tokens"),  # cut off
    ],
)
def test_falls_back_to_keywords_on_unusable_output(fake_messages, text, stop_reason):
    fake_messages.text = text
    fake_messages.stop_reason = stop_reason
    body = analyze("I forgot my password")
    assert body["category"] == "Account"
    assert body["source"] == "keywords"


def _response(status):
    return httpx2.Response(status, request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages"))


@pytest.mark.parametrize(
    "error",
    [
        anthropic.RateLimitError("rate limited", response=_response(429), body=None),
        anthropic.AuthenticationError("bad key", response=_response(401), body=None),
        anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com")),
    ],
)
def test_falls_back_to_keywords_on_api_errors(fake_messages, error):
    fake_messages.error = error
    body = analyze("I want a refund")
    assert body["category"] == "Billing"
    assert body["source"] == "keywords"


def test_failure_log_names_the_error_but_not_the_ticket(fake_messages, caplog):
    fake_messages.text = "not json"
    with caplog.at_level(logging.WARNING, logger="main"):
        analyze("secret customer details")
    assert "ValidationError" in caplog.text
    assert "secret customer details" not in caplog.text


def test_unexpected_errors_are_not_swallowed(fake_messages):
    # Bugs in our own code should surface as 500s, not silently fall back.
    fake_messages.error = KeyError("bug")
    with pytest.raises(KeyError):
        client.post("/analyze", json={"text": "hi"})


def test_unknown_analyzer_uses_keywords(fake_messages, monkeypatch):
    monkeypatch.setenv("ANALYZER", "gpt")
    body = analyze("I want a refund")
    assert body["source"] == "keywords"
    assert fake_messages.calls == []


def test_no_api_key_means_no_client():
    assert main.get_anthropic_client() is None


def test_api_key_creates_client(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assert main.get_anthropic_client() is not None


def test_workspace_id_is_sent_as_header(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_WORKSPACE_ID", "wrkspc_123")
    assert main.get_anthropic_client().default_headers["anthropic-workspace-id"] == "wrkspc_123"
