# Edge Functions

The data pipeline (collect -> match -> enrich) is added here in Phase 1.
API keys are read from Supabase secrets with `Deno.env.get(...)` and are never stored in code.
