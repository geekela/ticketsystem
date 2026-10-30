# Ticket System

Monorepo for the support ticket analyzer:

- `backend/`: FastAPI app that classifies tickets (Mistral, with a keyword fallback). See [backend/README.md](backend/README.md).
- `frontend/`: React + Vite UI.

## Setup (once)

You need [uv](https://docs.astral.sh/uv/) and [pnpm](https://pnpm.io/).

```sh
pnpm install         # root tooling (concurrently)
pnpm run setup       # backend deps (uv sync) + frontend deps
```

To classify with Mistral, set `MISTRAL_API_KEY` in your environment; without it the backend uses keyword matching.

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
pnpm test            # backend pytest suite
```
