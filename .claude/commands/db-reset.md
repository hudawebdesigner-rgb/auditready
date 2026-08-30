---
description: Reset the local dev.db to a clean, migrated, empty state
allowed-tools: Bash(rm -f dev.db*), Bash(npx prisma *), Bash(git status)
---

Reset the local SQLite database for this project to a clean state, useful
after schema experiments, a bad manual edit, or corrupted local data.

Before touching anything, run `git status` and check whether `dev.db` or
`dev.db-journal` are tracked. Per `CLAUDE.md`'s Database workflow section
they must always be gitignored (`*.db`, `*.db-journal`) — if either shows up
as tracked, stop and flag it to the user instead of deleting it; that means
`.gitignore` regressed and needs fixing first, not a normal reset.

Once confirmed untracked (the expected state):

1. Delete the local database files: `dev.db` and `dev.db-journal` (if
   present) at the repo root.
2. Recreate the schema from the committed migration history —
   `npx prisma migrate deploy` (not `migrate dev`, since there's no new
   schema change to author here, just replaying existing migrations).
3. Confirm the reset worked: run `npx prisma migrate status` and report
   that the database is empty and up to date with all migrations.

This only ever touches the local `dev.db` file, never
`prisma/migrations/*` or `prisma/schema.prisma`. If the user actually wants
to change the schema, that's `/add-category` or a manual edit + `npm run
db:migrate`, not this command.
