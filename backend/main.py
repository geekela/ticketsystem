"""Ticket Analyzer: a small FastAPI app that sorts support tickets into categories."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, Field

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


class TicketRequest(BaseModel):
    """Request body for `POST /analyze`."""

    text: str = Field(min_length=1)


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


@app.post("/analyze")
def analyze_ticket(ticket: TicketRequest) -> dict[str, str | int]:
    """Classify a ticket and echo it back with its character count."""
    return {
        "original": ticket.text,
        "character_count": len(ticket.text),
        "category": classify_ticket(ticket.text),
    }
