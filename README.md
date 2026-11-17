# Seller Intelligence Platform

Collects Amazon and Walmart seller information from licensed data providers, matches
each seller to its legal business entity (US Secretary of State filings), and enriches
records with business and decision-maker contacts — every value labelled with its
**source** and **confidence**.

> Status: **Phase 0 (setup)** — database schema, security rules and a Setup Check page.

## Start here
- **Setup checklist (click-by-click):** [docs/PHASE0_SETUP.md](docs/PHASE0_SETUP.md)
- Why we chose each provider and data model changes: [docs/DECISIONS.md](docs/DECISIONS.md)
- Outreach compliance notes: [docs/COMPLIANCE.md](docs/COMPLIANCE.md)
- API key names: [.env.example](.env.example)

## Tech stack
React + TypeScript + Vite + Tailwind + shadcn/ui · Supabase (Postgres, Auth, Edge
Functions, Row Level Security, cron) · Rainforest API · BlueCart API · Cobalt
Intelligence · Apollo.io · Netlify hosting.

## Project layout
```
src/                      Web app (React)
  components/ui/          shadcn/ui components
  lib/supabase.ts         Supabase connection (public URL + anon key only)
  pages/                  Screens
supabase/
  migrations/             Database schema (SQL) — run in Supabase SQL Editor
  tests/                  Database behaviour tests (local Postgres only)
  functions/              Edge Functions — the data pipeline (Phase 1)
docs/                     Guides
scripts/test-db.sh        Runs the database tests on a local Postgres
```

## For developers
```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```
Database tests (needs a throwaway local Postgres 15+):
```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-db.sh
```
