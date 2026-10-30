# Ticket System

Monorepo for the support ticket analyzer:

- `backend/`: FastAPI app that classifies tickets with Claude (Anthropic), with a keyword fallback. See [backend/README.md](backend/README.md).
- `frontend/`: React + Vite UI.

## Setup (once)

You need [uv](https://docs.astral.sh/uv/) and [pnpm](https://pnpm.io/).

```sh
pnpm install         # root tooling (concurrently)
pnpm run setup       # backend deps (uv sync) + frontend deps
```

Copy `backend/.env.example` to `backend/.env` and set `ANTHROPIC_API_KEY`. `ANALYZER` picks the AI (`anthropic`, the default, or `mistral` with `MISTRAL_API_KEY`); without a key the backend uses keyword matching.

## Run

```sh
pnpm dev
```

Starts both apps in one terminal with prefixed logs; Ctrl+C stops both.

- App: http://localhost:5173
- API: http://127.0.0.1:8000 (the frontend calls it through Vite's `/api` proxy)

Run either side alone with `pnpm dev:backend` or `pnpm dev:frontend`.

## Test

```sh
pnpm test            # backend pytest suite (no network, free)
pnpm test:live       # calls the real Anthropic API with the key in backend/.env
```

The live tests send about 8 short tickets to Claude, so each run costs a little. They fail (rather than skip) if `ANTHROPIC_API_KEY` is missing, and they check that Claude answered, not the keyword fallback.
