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

Classifies a support ticket.

**Request body** (JSON)

| Field | Type | Required | Rules |
|---|---|---|---|
| `text` | string | yes | At least 1 character |

**Response body** (JSON)

| Field | Type | Description |
|---|---|---|
| `original` | string | The submitted text, unchanged |
| `character_count` | integer | Number of characters in `text` (Unicode characters, not bytes; spaces count) |
| `category` | string | One of `Account`, `Billing`, `Technical`, `Other` |

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I cannot log in to my account"}'
```

```json
{"original":"I cannot log in to my account","character_count":29,"category":"Account"}
```

| Status | When |
|---|---|
| `200` | Valid body |
| `405` | Wrong method (e.g. `GET /analyze`) |
| `422` | Missing `text`, empty string, wrong type, or invalid JSON |

Extra fields in the body (e.g. `"priority": "high"`) are ignored.

How the category is chosen is explained in [Architecture](architecture.md#how-classification-works).

---

## Errors

Validation errors (`422`) use FastAPI's standard format. For example, sending `{"text": ""}` returns:

```json
{"detail":[{"type":"string_too_short","loc":["body","text"],"msg":"String should have at least 1 character","input":"","ctx":{"min_length":1}}]}
```
