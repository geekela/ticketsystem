"""Ticket Analyzer: a small FastAPI app that sorts support tickets into categories."""

import logging
import os
from pathlib import Path
from typing import Literal, get_args

import anthropic
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from dotenv import load_dotenv
from mistralai.client import Mistral
from mistralai.client.errors import MistralError
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# Load API keys and ANALYZER from backend/.env if present. Variables already set
# in the environment win, and a missing file is fine (keyword fallback).
load_dotenv(Path(__file__).parent / ".env")

# Which AI classifies tickets: "anthropic" (default) or "mistral".
DEFAULT_ANALYZER = "anthropic"

ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5"
ANTHROPIC_TIMEOUT_S = 30.0
MISTRAL_MODEL = "mistral-small-latest"
MISTRAL_TIMEOUT_MS = 10_000
SYSTEM_PROMPT = (
    "You classify customer support tickets. Reply with one category:\n"
    "- Account: login, password, access, profile or account settings\n"
    "- Billing: invoices, payments, refunds, charges, subscriptions\n"
    "- Technical: errors, bugs, crashes, features not working\n"
    "- Other: anything else"
)

# Resolved from this file, not the working directory, so the page loads
# no matter where the server is started from.
INDEX_HTML = Path(__file__).parent / "static" / "index.html"

# Checked top to bottom: the first category with a matching keyword wins.
CATEGORY_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Account", ("login", "log in", "password", "account")),
    ("Billing", ("invoice", "payment", "refund")),
    ("Technical", ("error", "bug", "crash", "dashboard")),
)
DEFAULT_CATEGORY = "Other"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

class TicketRequest(BaseModel):
    """Request body for `POST /analyze`."""

    text: str = Field(min_length=1)


class TicketClassification(BaseModel):
    """The structured output we ask the AI for."""

    category: Literal["Account", "Billing", "Technical", "Other"]

    @field_validator("category", mode="before")
    @classmethod
    def normalize_case(cls, value: object) -> object:
        """Accept case and whitespace variations such as " billing "."""
        return value.strip().capitalize() if isinstance(value, str) else value


@app.get("/")
def index() -> FileResponse:
    """Serve the HTML page that calls `/analyze`."""
    return FileResponse(INDEX_HTML)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Report that the server is up."""
    return {"status": "ok"}


@app.get("/greet/{name}", response_class=PlainTextResponse)
def greet(name: str) -> str:
    """Return a plain-text greeting using the name from the URL path."""
    return f"Hello, {name}!"


def classify_ticket(text: str) -> str:
    """Return the category of a support ticket based on keywords in its text.

    Matching is case-insensitive and works on substrings, so "crashing"
    matches "crash". Categories are checked in the order of
    `CATEGORY_KEYWORDS`; text matching none of them is `"Other"`.

    >>> classify_ticket("I forgot my password")
    'Account'
    >>> classify_ticket("Refund for the crash")
    'Billing'
    """
    text = text.lower()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(word in text for word in keywords):
            return category
    return DEFAULT_CATEGORY


def get_analyzer() -> str:
    """Return which AI to use, from the `ANALYZER` environment variable."""
    return os.environ.get("ANALYZER", DEFAULT_ANALYZER).strip().lower()


def get_anthropic_client() -> anthropic.Anthropic | None:
    """Return an Anthropic client, or `None` when no API key is configured."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    # Organization-scoped keys must name their workspace on every request.
    workspace_id = os.environ.get("ANTHROPIC_WORKSPACE_ID")
    headers = {"anthropic-workspace-id": workspace_id} if workspace_id else None
    # Fail fast for an interactive UI: one retry on 429/5xx/network errors.
    return anthropic.Anthropic(timeout=ANTHROPIC_TIMEOUT_S, max_retries=1, default_headers=headers)


def classify_with_anthropic(client: anthropic.Anthropic, text: str) -> str:
    """Ask Claude for the ticket's category, validated against `TicketClassification`.

    Raises `anthropic.APIError` on API or network failures, and `ValueError`
    (including Pydantic's `ValidationError`) on a refusal or unusable output.
    """
    categories = list(get_args(TicketClassification.model_fields["category"].annotation))
    response = client.beta.messages.create(
        model=os.environ.get("ANTHROPIC_MODEL", ANTHROPIC_DEFAULT_MODEL),
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text}],
        output_config={
            # Classification doesn't need deep reasoning; low effort keeps it fast.
            "effort": "low",
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {"category": {"type": "string", "enum": categories}},
                    "required": ["category"],
                    "additionalProperties": False,
                },
            },
        },
        # If a safety classifier declines, retry on Anthropic's recommended fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason != "end_turn":
        raise ValueError(f"Claude stopped with {response.stop_reason!r}")
    reply = next((block.text for block in response.content if block.type == "text"), None)
    if reply is None:
        raise ValueError("Claude returned no text")
    return TicketClassification.model_validate_json(reply).category


def get_mistral_client() -> Mistral | None:
    """Return a Mistral client, or `None` when no API key is configured."""
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        return None
    return Mistral(api_key=api_key, timeout_ms=MISTRAL_TIMEOUT_MS)


def classify_with_mistral(client: Mistral, text: str) -> str:
    """Ask Mistral for the ticket's category, validated against `TicketClassification`.

    Raises `MistralError` or `httpx.HTTPError` on API or network failures, and
    `ValueError` (including Pydantic's `ValidationError`) on unusable output.
    """
    response = client.chat.parse(
        response_format=TicketClassification,
        model=MISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0,
    )
    parsed = response.choices[0].message.parsed if response.choices else None
    if parsed is None:
        raise ValueError("Mistral returned no parsed content")
    return parsed.category


@app.post("/analyze")
def analyze_ticket(ticket: TicketRequest) -> dict[str, str | int]:
    """Classify a ticket with the configured AI, falling back to keywords if unavailable."""
    category, source = classify_ticket(ticket.text), "keywords"
    analyzer = get_analyzer()
    try:
        if analyzer == "anthropic":
            if (client := get_anthropic_client()) is not None:
                category, source = classify_with_anthropic(client, ticket.text), "anthropic"
        elif analyzer == "mistral":
            if (client := get_mistral_client()) is not None:
                category, source = classify_with_mistral(client, ticket.text), "mistral"
        else:
            logger.warning("Unknown ANALYZER %r; using keywords", analyzer)
    except (anthropic.APIError, MistralError, httpx.HTTPError, ValueError) as exc:
        # Only the exception type: messages can echo the ticket text.
        logger.warning("%s classification failed (%s); using keywords", analyzer, type(exc).__name__)
    return {
        "original": ticket.text,
        "character_count": len(ticket.text),
        "category": category,
        "source": source,
    }
