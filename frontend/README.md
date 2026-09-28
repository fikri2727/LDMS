# TAMCO LDMS — frontend (Next.js)

The web UI. It has **no database access**: every page and form calls the Python backend
(`../backend`) through `src/lib/api.ts`.

## Setup

```bash
npm install
```

Optional `.env.local` (defaults shown):

```
API_URL=http://127.0.0.1:8000
```

## Run

Start the backend first (see `../backend/README.md`), then:

```bash
npm run dev
```

Open http://localhost:3002.

## How it talks to the backend

- **Pages** (server components) call `api.get(...)`, e.g. `api.get("/api/staff", { q })`.
  Dates in responses are turned back into `Date` objects automatically.
- **Server actions** (`actions.ts`) forward the form's `FormData` to the backend with `api.post(...)`,
  then `revalidatePath`/`redirect` as before. A backend error message is shown in the form, same as before.
- **Login**: `app/login/actions.ts` posts to `/api/auth/login` and stores the signed `ldms_session`
  cookie; `lib/session.ts` reads the current user from `/api/auth/me`.
- **Files** (certificates, lesson slides/videos, brochures) are streamed through `app/api/*/route.ts`.
- Model types that used to come from Prisma live in `src/lib/db-types.ts`.

Permission checks in `src/lib/rbac.ts` only decide what to *show*; the backend enforces them.

## Deploy (Vercel)

Vercel project `ldms` → Root Directory `frontend`, environment variable
`API_URL=https://ldms-api.vercel.app` (the Python backend, Vercel project `ldms-api`).
