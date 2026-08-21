# TAMCO LDMS (Next.js + SQLite)

A local Learning & Development Management System — Staff List, Training Records
(Public/Inhouse + OJT, with the full PME evaluation workflow), and a Dashboard.
Runs entirely on your laptop; the database is a single SQLite file
(`dev.db`), no external hosting required.

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

First run only — create the database and a bootstrap admin account:

```bash
npx prisma migrate dev
npm run db:seed
```

Default admin login: **staff no. `ADMIN01`**, **password `Welcome@1`**.
Sign in and create your real staff records; new staff get the default
password `P@ss1234` (shown on the Add Staff form) and should change it.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (via the `better-sqlite3` driver adapter)
- `iron-session` for stateless, encrypted-cookie sessions (no session table)
- Recharts for the dashboard

## Data model

`prisma/schema.prisma` is the source of truth. It mirrors the original PHP
LDMS's tables (`user`, `training`, `ojt`, `participation`, `participateojt`,
`pme`, `divisions`/`departments`/`sections`) with the same field meanings,
adapted into a normalized, typed schema. Notable deliberate differences from
the legacy app, documented here rather than silently:

- **Passwords are bcrypt-hashed**, not unsalted MD5.
- **All queries are parameterized** via Prisma (the legacy app built SQL by
  string concatenation).
- **Role-based access is consolidated** into one set of pages with
  permission-gated actions (`src/lib/rbac.ts`), instead of near-duplicate
  page trees per role (`admin/`, `clerk/`, `staff/hod/`, `staff/office/`).
  Roles: `ADMIN`, `CLERK`, `STAFF` (+ an `isHod` flag), mapped from the
  original `roletype`/`usertype`.
- **Certificates are scoped to the training** they belong to (the legacy
  certificate upload was scoped to the uploading admin instead, a bug).
- The `hadc` (HRDC) column typo is fixed to `hrdcClaimable`.
- "Departmental/Inhouse" training in the legacy app was a read-only report
  over `training` + `ojt`, not its own record type — Inhouse sessions are
  created via the same Public/Inhouse flow here (`program` field distinguishes
  External/Inhouse-external-trainer/Inhouse-internal-trainer).

## Uploads

Certificate files are written to `uploads/` at the project root (not `public/`,
so they aren't served directly) and streamed back through
`/api/certificates/[id]`. This folder and `dev.db` are gitignored.
