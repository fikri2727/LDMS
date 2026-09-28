# TAMCO LDMS — Python backend (FastAPI)

Python replacement for the server side of `../ldms-web` (Next.js server actions).
Uses the **same Supabase PostgreSQL database** — existing data and passwords keep working.

## Setup (first time)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env   # then fill in the values (same as ldms-web/.env)
```

## Run

```bash
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

- API docs (try every endpoint in the browser): http://localhost:8000/docs
- Check models match the database: `python -m scripts.check_db`

## Layout

| File | What it replaces in ldms-web |
|---|---|
| `app/models.py` | `prisma/schema.prisma` (maps the existing tables, doesn't change them) |
| `app/security.py` | `lib/auth.ts`, `lib/session.ts` |
| `app/rbac.py` | `lib/rbac.ts` |
| `app/deps.py` | `lib/guard.ts` (`requireSession`) |
| `app/routers/auth.py` | `login/actions.ts`, `logout/actions.ts`, `account/actions.ts` |
| `app/routers/staff.py`, `org.py` | Staff List (incl. Excel upload), Organization |
| `app/routers/training.py`, `ojt.py`, `checkin.py` | Public/Inhouse training, OJT, QR self check-in |
| `app/routers/pme.py` | PME evaluation |
| `app/routers/elearning.py` | E-Learning authoring, learner player, quiz grading, certificates |
| `app/routers/tna.py`, `requisition.py` | Training Need Analysis, Training Requisition |
| `app/routers/dashboard.py` | Dashboard figures |
| `app/services/` | Shared rules: PME due dates, module completion, surveys, Excel parsing, Supabase Storage |
| `app/serialize.py` | Returns rows in the same camelCase shape Prisma gave the pages |

## Migration progress

- [x] 1. Setup, models, login/session, roles
- [x] 2. Staff + Organization
- [x] 3. Training + QR check-in + OJT
- [x] 4. PME
- [x] 5. E-Learning
- [x] 6. TNA + Requisition
- [x] 7. Dashboard
- [x] 8. Frontend: ldms-web pages converted to call this API (`../frontend`)

## Tests

```bash
.venv\Scripts\python -m pytest -q
```

Runs against the real database inside a transaction that is always rolled back — nothing is saved.
