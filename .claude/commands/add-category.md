---
description: Add a new expense Category end-to-end (schema, migration, client)
argument-hint: <CATEGORY_NAME>
allowed-tools: Read, Edit, Bash(npx prisma *), Bash(npm run *)
---

Add a new `Category` value to the expense tracker: **$ARGUMENTS**

Normalize it to `SCREAMING_SNAKE_CASE` first (e.g. "pet care" -> `PET_CARE`).
If no argument was given, ask the user what the category should be called
before doing anything else.

Follow the exact process `CLAUDE.md` describes under "Data model and money
handling" — a category lives in two places that must stay in sync:

1. **`prisma/schema.prisma`** — add the new value to the `Category` enum.
2. **`src/lib/validations.ts`** — add the same value, in the same casing, to
   the `CATEGORIES` const array (this is what the client-side `<select>` in
   `ExpenseForm.tsx` renders — it deliberately does not import the generated
   Prisma enum into a Client Component).

Then:

3. Run `npm run db:migrate` (this both creates the migration for the enum
   change and regenerates the Prisma Client — do not run `prisma generate`
   as a separate manual step, `migrate dev` already does it).
4. Grep the codebase for any place that already special-cases specific
   category values (e.g. category icons, colors, or filters) and decide
   whether the new category needs a case there too — don't assume `OTHER`
   as a fallback is always correct.
5. Run `npm run typecheck` and `npm run test` to confirm nothing broke.

Do not hand-edit `dev.db` or anything under `prisma/migrations/` — the
migration must come from `prisma migrate dev` so it's reproducible for
every other environment, per the Database workflow section of `CLAUDE.md`.
