# Testing

The tests use [pytest](https://docs.pytest.org/) and FastAPI's `TestClient`, which calls the app in-process, so you don't need a running server.

## How do I run the tests?

```bash
uv run pytest
```

Expected output ends with `44 passed`.

Other useful forms:

```bash
uv run pytest -v                          # one line per test
uv run pytest -k classify                 # only tests whose name contains "classify"
uv run pytest tests/test_main.py::test_health_returns_ok   # one test
uv run python -m doctest main.py -v       # only the examples in docstrings
```

## How are the tests organized?

There is one test file per source module. `tests/test_main.py` covers `main.py` and is grouped by what it tests:

| Section | Covers |
|---|---|
| `classify_ticket` | Each category, `Other`, case-insensitivity, priority order, Unicode, substring matching, docstring examples |
| `GET /` | The HTML page is served, also when started from another directory |
| `GET /health` | Returns `{"status": "ok"}` |
| `GET /greet/{name}` | Plain-text greeting, URL-encoded Unicode names, whitespace names, `404` with no name or a `/` in the name |
| `POST /analyze` | Response shape, character counting, extra fields ignored, `422` for invalid bodies, `405` for wrong method |

`tests/test_backend.py` checks that the `backend` console script (`src/backend/__init__.py`) prints its greeting.

The examples in the `classify_ticket()` docstring also run as part of the suite (`test_classify_docstring_examples_are_correct`), so they can't go stale without a test failing.

Test names read as sentences (`test_classify_prefers_billing_over_technical`), so a failure explains itself.

A few tests pin down behavior that may not be intended (substring matches like `debug` → `Technical`, whitespace-only text or names being accepted). They're marked with a comment. If you change that behavior on purpose, update those tests.

## How do I add a test?

Add a function starting with `test_` to `tests/test_main.py`. When several inputs share one assertion, use `pytest.mark.parametrize`:

```python
@pytest.mark.parametrize("text", ["Where is my parcel?", "Tracking number missing"])
def test_classify_returns_shipping_for_delivery_problems(text):
    assert classify_ticket(text) == "Shipping"
```

## Configuration

`pyproject.toml` sets `pythonpath = ["."]` so tests can `import main` from the project root, and `testpaths = ["tests"]` so `uv run pytest` only looks there.
