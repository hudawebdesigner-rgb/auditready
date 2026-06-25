# AuditReady — Project Brief

## What We're Building
AuditReady is a SaaS web app for Shopify store owners who use Xero for accounting. The app connects to Xero, reads reconciled financial data, and uses Claude AI to generate plain-English monthly Financial Health Reports.

This is NOT a reconciliation tool — we sit on top of Xero AFTER reconciliation and turn numbers into narrative insight.

## Target User
Shopify store owners who use Xero, have a bookkeeper or use A2X, can't read their own financial reports, and pay $300-500/month for bookkeeping but still feel lost.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Anthropic Claude API (claude-sonnet-4-6)
- **Xero**: OAuth2 via xero-node
- **PDF**: @react-pdf/renderer
- **Email**: Resend
- **Payments**: Stripe
- **Deploy**: Vercel

## Database Schema

### users
- id (uuid, PK), email, created_at, stripe_customer_id, stripe_subscription_status, trial_ends_at

### xero_connections
- id (uuid, PK), user_id (FK), tenant_id, tenant_name, access_token (encrypted), refresh_token (encrypted), expires_at

### reports
- id (uuid, PK), user_id (FK), generated_at, period_month, raw_xero_data (jsonb), ai_report_content (jsonb), status (generating/complete/failed)

## Routes
- `/` — Landing page
- `/signup` — Signup
- `/login` — Login
- `/onboarding` — Connect Xero
- `/dashboard` — Main dashboard
- `/dashboard/report/[id]` — View report
- `/dashboard/generate` — Generate report
- `/settings` — Account settings + billing
- `/api/xero/callback` — Xero OAuth callback
- `/api/xero/data` — Fetch Xero data
- `/api/reports/generate` — Generate AI report
- `/api/webhooks/stripe` — Stripe webhooks

## AI Report Sections
A) BUSINESS SNAPSHOT — 3 sentence summary
B) REVENUE STORY — Revenue vs last month, vs 3 months ago, trend
C) WHERE YOUR MONEY WENT — Top expense categories, unusual spikes
D) CASH POSITION — Bank balance, is it healthy?
E) WATCH OUT FOR — 2-3 specific flags/risks
F) YOUR ACTION LIST — 3 specific actions to take this month

## Design
- Clean, minimal, professional
- White background, dark navy text
- Accent: #6366F1 (indigo)
- Font: Inter
- shadcn/ui Card components for report sections
- Mobile responsive

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

## Build Phases
1. **Phase 1** — Foundation: Next.js setup, Supabase, auth, dashboard shell
2. **Phase 2** — Xero OAuth integration + data fetching
3. **Phase 3** — AI report generation + display + PDF
4. **Phase 4** — Stripe billing
5. **Phase 5** — Landing page, email, polish

## Important Rules
- Never store Anthropic API key on the frontend
- All Xero tokens stored encrypted
- Every API route checks authentication first
- Use server actions for database mutations
- TypeScript types everywhere
