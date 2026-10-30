# Ticket Analyzer

A small [FastAPI](https://fastapi.tiangolo.com/) backend that reads a support ticket and sorts it into a category (**Account**, **Billing**, **Technical**, or **Other**). It ships with a one-page web UI to try it out.

## Quick start

You need [uv](https://docs.astral.sh/uv/). It installs Python 3.12 and the dependencies for you.

```bash
uv sync
uv run fastapi dev main.py
```

Open <http://127.0.0.1:8000> for the web page, or <http://127.0.0.1:8000/docs> for FastAPI's interactive API explorer.

## What it does

| Method | Path | What it does |
|---|---|---|
| `GET` | `/` | Serves the web UI (`static/index.html`) |
| `GET` | `/health` | Returns `{"status": "ok"}` when the server is up |
| `GET` | `/greet/{name}` | Returns `Hello, {name}!` as plain text |
| `POST` | `/analyze` | Classifies a ticket and returns its category and character count |

The full details are in the [API reference](docs/api.md).

## Example

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I cannot log in to my account"}'
```

```json
{"original":"I cannot log in to my account","character_count":29,"category":"Account","source":"anthropic"}
```

## How are tickets classified?

By default the ticket is sent to Claude (`ANALYZER=anthropic`, needs `ANTHROPIC_API_KEY` in `.env`; see `.env.example`). Set `ANALYZER=mistral` to use Mistral instead. If no key is set or the AI call fails, the backend falls back to keywords, and the response's `source` field says which was used.

The keyword fallback works like this: the text is lowercased and checked for keywords, one category at a time. The first category that matches wins.

| Order | Category | Keywords |
|---|---|---|
| 1 | Account | `login`, `log in`, `password`, `account` |
| 2 | Billing | `invoice`, `payment`, `refund` |
| 3 | Technical | `error`, `bug`, `crash`, `dashboard` |
| – | Other | nothing matched |

So `"refund for the crash"` is **Billing**, because Billing is checked before Technical. See [Architecture](docs/architecture.md#how-classification-works) for details and how to add a category.

## Project structure

```text
.
├── main.py              # The FastAPI app: routes + classify_ticket()
├── static/
│   └── index.html       # Web UI (health indicator, ticket form, greeting form)
├── tests/
│   ├── test_main.py     # Unit tests for the classifier and every endpoint
│   └── test_backend.py  # Test for the `backend` console script
├── src/backend/         # Package placeholder behind the `backend` console script
├── docs/                # In-depth documentation
└── pyproject.toml       # Dependencies and pytest settings
```

## Running the tests

```bash
uv run pytest
```

This runs the offline tests only. To check the real Anthropic API with the key in `.env` (costs a few cents):

```bash
uv run pytest -m live -v
```

More in [Testing](docs/testing.md).

## Documentation

- [Architecture](docs/architecture.md): how a request flows through the app, how classification works, how to extend it
- [API reference](docs/api.md): every endpoint with request, response, and status codes
- [Testing](docs/testing.md): how the tests are organized and how to add one
