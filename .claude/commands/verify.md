---
description: Run the full pre-commit gate (typecheck, lint, test, build)
allowed-tools: Bash(npm run *)
---

Run this repo's full verification gate, exactly as documented in `CLAUDE.md`
under "Before considering any change done":

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Run them in that order and stop at the first failure. For each failure:

- Read the actual error output, don't guess at the cause.
- Fix it in the smallest way that addresses the root cause — no
  `@ts-ignore`, no `eslint-disable`, no skipped/`.skip`'d tests, no
  loosening `tsconfig.json` strictness, unless the user explicitly asks
  for one of those.
- Re-run the step you fixed before moving to the next one.

If all four pass, report a short summary (pass/fail per step) — don't
re-explain what each command does, the user already knows.

If a failure looks unrelated to any change in this session (e.g. it also
fails on a clean `main`), say so explicitly instead of silently patching
around it.
