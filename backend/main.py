"""Ticket Analyzer: a small FastAPI app that sorts support tickets into categories."""

import logging
import os
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from mistralai.client import Mistral
from mistralai.client.errors import MistralError
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

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
    """The structured output we ask Mistral for."""

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
    """Classify a ticket with Mistral, falling back to keywords if unavailable."""
    category, source = classify_ticket(ticket.text), "keywords"
    client = get_mistral_client()
    if client is not None:
        try:
            category, source = classify_with_mistral(client, ticket.text), "mistral"
        except (MistralError, httpx.HTTPError, ValueError) as exc:
            # Only the exception type: messages can echo the ticket text.
            logger.warning("Mistral classification failed (%s); using keywords", type(exc).__name__)
    return {
        "original": ticket.text,
        "character_count": len(ticket.text),
        "category": category,
        "source": source,
    }
