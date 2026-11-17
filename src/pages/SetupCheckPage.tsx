import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CheckCircle2, CircleDashed, RefreshCw, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

type Status = 'pass' | 'fail' | 'waiting'
interface Check {
  label: string
  status: Status
  detail: string
}

interface Settings {
  us_only: boolean
  apollo_daily_credit_limit: number
  match_confidence_threshold: number
  stale_after_days: number
}

async function runChecks(session: Session | null): Promise<{ checks: Check[]; settings: Settings | null }> {
  const checks: Check[] = []
  let settings: Settings | null = null

  checks.push({
    label: 'App settings (.env / Vercel)',
    status: isSupabaseConfigured ? 'pass' : 'fail',
    detail: isSupabaseConfigured
      ? 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
      : 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. See docs/PHASE0_SETUP.md, step 4.',
  })
  if (!isSupabaseConfigured || !supabase) return { checks, settings }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: supabaseAnonKey } })
    checks.push({
      label: 'Supabase project reachable',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok ? 'Connected.' : `Supabase answered with HTTP ${res.status}. Check the URL and anon key.`,
    })
    if (!res.ok) return { checks, settings }
  } catch {
    checks.push({ label: 'Supabase project reachable', status: 'fail', detail: 'Could not connect. Check VITE_SUPABASE_URL.' })
    return { checks, settings }
  }

  if (!session) {
    checks.push({ label: 'Signed in', status: 'waiting', detail: 'Sign in to run the remaining checks.' })
    return { checks, settings }
  }
  checks.push({ label: 'Signed in', status: 'pass', detail: session.user.email ?? session.user.id })

  const team = await supabase.from('team_members').select('role').eq('user_id', session.user.id).maybeSingle()
  if (team.error) {
    checks.push({
      label: 'Database tables installed',
      status: 'fail',
      detail: `Could not read team_members (${team.error.message}). Run the SQL migration — docs/PHASE0_SETUP.md, step 3.`,
    })
    return { checks, settings }
  }
  checks.push({ label: 'Database tables installed', status: 'pass', detail: 'Migration has been run.' })
  checks.push({
    label: 'You are on the team allowlist',
    status: team.data ? 'pass' : 'fail',
    detail: team.data
      ? `Role: ${team.data.role}`
      : 'Your email is not in team_allowed_emails, so security rules hide all data. See step 5.',
  })
  if (!team.data) return { checks, settings }

  const s = await supabase
    .from('settings')
    .select('us_only, apollo_daily_credit_limit, match_confidence_threshold, stale_after_days')
    .maybeSingle()
  checks.push({
    label: 'Security rules let you read data',
    status: s.data ? 'pass' : 'fail',
    detail: s.data ? 'Settings row readable.' : `Could not read settings (${s.error?.message ?? 'no row'}).`,
  })
  settings = (s.data as Settings | null) ?? null
  return { checks, settings }
}

const icon: Record<Status, ReactNode> = {
  pass: <CheckCircle2 className="text-success size-5" />,
  fail: <XCircle className="text-destructive size-5" />,
  waiting: <CircleDashed className="text-muted-foreground size-5" />,
}

export function SetupCheckPage({ session }: { session: Session | null }) {
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  const refresh = useCallback(() => {
    setChecks(null)
    runChecks(session).then((r) => {
      setChecks(r.checks)
      setSettings(r.settings)
    })
  }, [session])

  useEffect(refresh, [refresh])

  const allPass = checks?.every((c) => c.status === 'pass') ?? false

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Setup check</h1>
          <p className="text-muted-foreground text-sm">Phase 0 — confirms the app, Supabase, database and security rules are connected.</p>
        </div>
        <Button variant="outline" onClick={refresh}><RefreshCw /> Re-run checks</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Checklist
            {checks && (allPass ? <Badge variant="success">All good</Badge> : <Badge variant="warning">Needs attention</Badge>)}
          </CardTitle>
          <CardDescription>Every line should be green before we start Phase 1.</CardDescription>
        </CardHeader>
        <CardContent>
          {!checks ? (
            <p className="text-muted-foreground text-sm">Checking…</p>
          ) : (
            <ul className="divide-y">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 py-3">
                  {icon[c.status]}
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-muted-foreground text-sm">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Current pipeline settings</CardTitle>
            <CardDescription>Read from the database. You will be able to edit these in Phase 3.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Setting label="US sellers only" value={settings.us_only ? 'Yes' : 'No'} />
            <Setting label="Apollo daily credit limit" value={String(settings.apollo_daily_credit_limit)} />
            <Setting label="Min. legal-entity match confidence before Apollo" value={`${settings.match_confidence_threshold} / 100`} />
            <Setting label="Refresh records older than" value={`${settings.stale_after_days} days`} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-md p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}
