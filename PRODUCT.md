# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Support agents triaging incoming customer tickets during their shift. They work on a desktop, alongside their helpdesk, and handle many tickets per hour, so speed, scanability, and keyboard use matter more than anything decorative.

## Product Purpose

Support Ticket Analyzer reads a customer support ticket and sorts it into a category so agents can route it fast. Today it is a single page: paste a ticket, get its category, see which classifier made the call. Success means an agent can classify and route a ticket in seconds and trust the result enough to act on it.

Direction: the product is growing from a single-ticket tool into a triage queue (a list of tickets, history, and filtering by category). The shape of that queue (data source, persistence, assignment) is not decided yet.

## Positioning

AI classification (Claude by default, Mistral optionally) with an honest, visible fallback to keyword matching. The product never hides which method answered, so agents know how much to trust each classification.

## Operating Context

- Used next to an existing helpdesk tool; tickets are pasted in, not pulled from an integration (yet).
- High-volume, repetitive work on desktop screens: the same action many times per hour.
- Frontend: React + Vite (`frontend/`), calling the FastAPI backend (`backend/`) through Vite's `/api` proxy. The backend also serves an older standalone page at `backend/static/index.html`.

## Capabilities and Constraints

- `POST /analyze` takes `{ text }` and returns `original`, `character_count`, `category`, and `source`.
- **Categories are fixed at four:** Account, Billing, Technical, Other.
- **The classifier is always shown.** `source` is `anthropic`, `mistral`, or `keywords`; every surface that shows a classification must say which one produced it. Keyword-fallback results must be visibly distinguishable from AI results.
- Classifier selection is a backend setting (`ANALYZER`); without an API key the backend falls back to keywords.
- Keyword fallback is first-match by category order and substring-based, so its results can be wrong in known ways (see `backend/docs/architecture.md`).
- Open: triage-queue data model, ticket persistence, history, assignment, and helpdesk integration.

## Brand Commitments

- The product name is **Support Ticket Analyzer** (final).

## Evidence on Hand

- Real behavior: the API and classifier, documented in `backend/README.md` and `backend/docs/` (api, architecture, testing).
- No customers, usage metrics, accuracy benchmarks, or testimonials exist. Do not invent them, including accuracy claims for any classifier.

## Product Principles

1. **Speed of triage first.** Every screen is judged by how quickly an agent can get from ticket to routed category.
2. **Show your work.** Which classifier answered is always visible; never present a keyword guess as if it were AI.
3. **Built for repetition.** Optimize for the hundredth ticket of the shift: keyboard paths, stable layout, no friction that compounds.
4. **Grow toward the queue.** Single-ticket decisions should not block a later list/history/filter view.

## Accessibility & Inclusion

Must meet **WCAG 2.2 AA**. Full keyboard operability is essential given high-volume use; category and classifier must not be conveyed by color alone.
