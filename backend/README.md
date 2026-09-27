# Receipt Scanner — Backend

FastAPI service that takes a receipt photo, runs OCR + an LLM (Gemini) to
extract structured data (vendor, date, total, tax, category), and exposes it
through a searchable API with CSV export.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in and click "Create API key"
3. Open `.env` in this folder and paste it into `GEMINI_API_KEY=`

Without this key, uploads will still work, but extraction will fail and
receipts will be marked `failed` — everything else in the app still runs.

## 2. Run it (Docker — recommended)

```bash
docker compose up --build
```

This starts Postgres and the API together. First run takes a minute (it
installs Tesseract and Python deps inside the image).

- API root: http://localhost:8000
- Interactive docs (try every endpoint from the browser): http://localhost:8000/docs
- Health check: http://localhost:8000/health

Stop it with `Ctrl+C`, or `docker compose down` to also stop the containers.
Add `-v` to `docker compose down -v` if you want to wipe the database too.

## 3. Try it end-to-end (via /docs)

1. Open http://localhost:8000/docs
2. `POST /auth/signup` — create a user (email + password, 8+ chars)
3. `POST /auth/login` — get back an `access_token`
4. Click "Authorize" at the top of the docs page, paste the token in as
   `Bearer <token>` (or just the token — FastAPI's docs UI handles the prefix)
5. `POST /receipts` — upload a receipt image (there are a couple of sample
   ones in `sample_receipts/` once you add some, or use any photo of a
   receipt from your phone)
6. `GET /receipts/{id}` — check back after a couple of seconds; `status`
   moves from `processing` to `confirmed`/`needs_review`/`failed`
7. `GET /export/csv` — download everything as a spreadsheet

## 4. Run without Docker (optional)

Needs Tesseract installed locally (`sudo apt install tesseract-ocr` on
Ubuntu) and a Postgres instance, or point `DATABASE_URL` in `.env` at
`sqlite:///./dev.db` for the quickest possible local run.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 5. Run the tests

```bash
docker compose exec api pytest
# or, without Docker:
pytest
```

Tests run against an in-memory SQLite DB and don't need Postgres or a real
Gemini key for the schema/dedupe tests — only `test_auth_api.py` and the
extraction tests touch anything close to "real" behavior.

## Project layout

```
app/
├── main.py           FastAPI app + router registration
├── config.py         env-based settings
├── routers/          auth, receipts, export — HTTP layer only
├── services/         ocr.py, extract.py, dedupe.py — pure logic, easy to test
├── jobs/             process_receipt.py — the OCR → LLM → save pipeline
├── models/           SQLAlchemy tables
├── schemas/          Pydantic request/response + the strict LLM output schema
└── core/             database session, JWT/password hashing, auth dependency
```

## Credentials summary

| What | Where it lives | Real secret? |
|---|---|---|
| Postgres user/password | `docker-compose.yml` / `.env` | No — dev-only, not used anywhere real |
| JWT signing key | `.env` (`JWT_SECRET_KEY`) | Locally generated random value |
| Gemini API key | `.env` (`GEMINI_API_KEY`) | **Yes** — the only real credential, get it yourself, never commit it |

`.env` is in `.gitignore`. `.env.example` shows the shape without any real
values, so it's safe to commit.

## What's deliberately left out (v1)

- Celery/Redis queue — using FastAPI `BackgroundTasks` for now, which is
  enough for a single-instance demo. Swap in Celery later without touching
  `services/` or `routers/`.
- Alembic migrations — tables are created automatically on startup
  (`Base.metadata.create_all`) for simplicity. Add real migrations before
  this ever holds data you care about keeping.
- Rate limiting on `/receipts` uploads.
