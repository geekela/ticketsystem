# API reference

The server exposes four *endpoints* (URLs it responds to). All examples below assume it's running locally with `uv run fastapi dev main.py`, and every output shown was captured from a real run.

FastAPI also generates interactive docs at <http://127.0.0.1:8000/docs>.

- [`GET /`](#get-)
- [`GET /health`](#get-health)
- [`GET /greet/{name}`](#get-greetname)
- [`POST /analyze`](#post-analyze)
- [Errors](#errors)

---

## `GET /`

Serves the web UI from `static/index.html`.

| | |
|---|---|
| Response | `200`, `text/html` |

The page calls `/health` on load and every 10 seconds after. The forms appear once the server answers. They stay visible if the server goes down later; only the status dot turns red.

---

## `GET /health`

Tells you whether the server is up. The web UI uses this for its green/red status dot.

```bash
curl http://127.0.0.1:8000/health
```

```json
{"status":"ok"}
```

---

## `GET /greet/{name}`

Returns a plain-text greeting. `name` is taken from the URL path, so URL-encode spaces and special characters (`José María` → `Jos%C3%A9%20Mar%C3%ADa`).

```bash
curl http://127.0.0.1:8000/greet/Elisa
```

```text
Hello, Elisa!
```

| Status | When |
|---|---|
| `200` | Any non-empty name, even just a space (`text/plain`) |
| `404` | No name given (`/greet/`), or the name contains `/` (also when encoded as `%2F`) |

---

## `POST /analyze`

Classifies a support ticket. Send the customer's answers to follow-up questions in `follow_ups` to re-classify the ticket with them; they are appended to the ticket text before classification.

**Request body** (JSON)

| Field | Type | Required | Rules |
|---|---|---|---|
| `text` | string | yes | At least 1 character |
| `follow_ups` | array of `{question, answer}` | no | Up to 10 items; both strings at least 1 character |

**Response body** (JSON)

| Field | Type | Description |
|---|---|---|
| `original` | string | The submitted text, unchanged |
| `character_count` | integer | Number of characters in `text`, not counting `follow_ups` (Unicode characters, not bytes; spaces count) |
| `category` | string | One of `Account`, `Billing`, `Technical`, `Other` |
| `source` | string | What chose the category: `anthropic`, `mistral`, or `keywords` (fallback) |

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I cannot log in to my account"}'
```

```json
{"original":"I cannot log in to my account","character_count":29,"category":"Account","source":"anthropic"}
```

| Status | When |
|---|---|
| `200` | Valid body |
| `405` | Wrong method (e.g. `GET /analyze`) |
| `422` | Missing `text`, empty string, wrong type, or invalid JSON |

Extra fields in the body (e.g. `"priority": "high"`) are ignored.

How the category is chosen is explained in [Architecture](architecture.md#how-classification-works).

---

## `POST /questions`

Drafts follow-up questions for the agent to send to the customer: at most 3, only for information missing from the ticket, in the ticket's language. An empty list means nothing important is missing.

Questions always come from Claude when `ANTHROPIC_API_KEY` is set, whatever `ANALYZER` says. Without a key, or if the call fails, a fixed list per category is returned (`PRESET_QUESTIONS` in `main.py`).

**Request body** (JSON)

| Field | Type | Required | Rules |
|---|---|---|---|
| `text` | string | yes | At least 1 character |
| `category` | string | yes | One of `Account`, `Billing`, `Technical`, `Other` |

**Response body** (JSON)

| Field | Type | Description |
|---|---|---|
| `questions` | array of strings | 0 to 3 questions, most important first |
| `source` | string | `anthropic`, or `preset` when the fixed list was used |

```bash
curl -X POST http://127.0.0.1:8000/questions \
  -H "Content-Type: application/json" \
  -d '{"text": "I was charged twice", "category": "Billing"}'
```

```json
{"questions":["What is the invoice number of the duplicate charge?","On which date did both charges appear?"],"source":"anthropic"}
```

| Status | When |
|---|---|
| `200` | Valid body |
| `422` | Missing or empty `text`, or a `category` outside the four |

---

## Errors

Validation errors (`422`) use FastAPI's standard format. For example, sending `{"text": ""}` returns:

```json
{"detail":[{"type":"string_too_short","loc":["body","text"],"msg":"String should have at least 1 character","input":"","ctx":{"min_length":1}}]}
```
