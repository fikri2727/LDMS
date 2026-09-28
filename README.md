# TAMCO LDMS — Python backend + Next.js frontend

The Learning & Development Management System, split into:

| Folder | What | Tech |
|---|---|---|
| `backend/` | All business logic and database access (REST API) | Python 3.12, FastAPI, SQLAlchemy |
| `frontend/` | The web UI (same screens as before) | Next.js + React + Tailwind |

It uses the **same Supabase PostgreSQL database and storage bucket** as the original Node.js app
(`ldms-web`, backed up to `Downloads\ldms-web-backup.zip`), so existing staff, passwords,
trainings and files carry over unchanged.

```
Browser ──> frontend (Next.js, :3002) ──> backend (FastAPI, :8000) ──> Supabase Postgres + Storage
             pages + forms, no DB access     permissions, rules, SQL
```

## Run it

**Easiest:** double-click **`start.cmd`**. It starts the backend and the website in two windows and
opens http://localhost:3002 when ready. Double-click **`stop.cmd`** (or close both windows) to stop.

Or start them by hand, in two terminals.

Terminal 1 — backend:

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:3002. API docs: http://localhost:8000/docs.

First-time setup for each part is in `backend/README.md` and `frontend/README.md`.

## Tests

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

The tests run against the real database but inside a transaction that is always rolled back —
nothing is saved. File uploads are faked, so Supabase Storage isn't touched either.

## Production notes

- Only the frontend needs to be public. Keep the backend on a private network (or the same host),
  and set the frontend's `API_URL` to it.
- Set `COOKIE_SECURE=true` in `backend/.env` when serving over HTTPS.
- Everyone signs in once after switching from the old app (the login cookie format changed).
