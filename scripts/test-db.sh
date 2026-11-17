#!/usr/bin/env bash
# Developer tool: tests the SQL migration on a throwaway LOCAL Postgres
# (with a stand-in for Supabase's auth schema). Never points at Supabase.
# Usage: PGHOST=/path/to/socket PGPORT=55432 PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="sip_schema_test_$$"
psql -q -c "create database $DB"
trap 'psql -q -c "drop database if exists $DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/local_stub_supabase.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/schema_test.sql
