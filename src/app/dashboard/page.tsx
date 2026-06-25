import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signOut } from '@/lib/actions/auth'
import type { Report } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('id, tenant_name')
    .eq('user_id', user.id)
    .single()

  const { data: userRecord } = await supabase
    .from('users')
    .select('trial_ends_at, stripe_subscription_status')
    .eq('id', user.id)
    .single()

  const { data: reports } = await supabase
    .from('reports')
    .select('id, generated_at, period_month, status')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(10)

  const isTrialActive = userRecord?.trial_ends_at
    ? new Date(userRecord.trial_ends_at) > new Date()
    : false
  const isSubscribed = userRecord?.stripe_subscription_status === 'active'
  const canGenerateReport = isTrialActive || isSubscribed

  const trialDaysLeft = userRecord?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(userRecord.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900">AuditReady</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            <Link href="/settings">
              <Button variant="ghost" size="sm">Settings</Button>
            </Link>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isTrialActive && !isSubscribed && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <p className="text-sm text-indigo-800">
              <span className="font-semibold">{trialDaysLeft} days left</span> on your free trial.
            </p>
            <Link href="/settings">
              <Button size="sm" variant="default">Upgrade now</Button>
            </Link>
          </div>
        )}

        {!canGenerateReport && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              Your free trial has ended. Subscribe to continue generating reports.
            </p>
            <Link href="/settings">
              <Button size="sm">Subscribe — $149/mo</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Xero Organisation</CardDescription>
              <CardTitle className="text-lg">
                {xeroConnection ? xeroConnection.tenant_name : 'Not connected'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {xeroConnection ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Connected
                </span>
              ) : (
                <Link href="/onboarding">
                  <Button size="sm" variant="outline">Connect Xero</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Total Reports</CardDescription>
              <CardTitle className="text-3xl font-bold">{reports?.length ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Generated reports</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Last Report</CardDescription>
              <CardTitle className="text-lg">
                {reports && reports.length > 0
                  ? reports[0].period_month
                  : 'No reports yet'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports && reports.length > 0 && (
                <Link href={`/dashboard/report/${reports[0].id}`}>
                  <Button size="sm" variant="outline">View report</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          {canGenerateReport && xeroConnection ? (
            <Link href="/dashboard/generate">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Generate New Report
              </Button>
            </Link>
          ) : !xeroConnection ? (
            <Link href="/onboarding">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Connect Xero to generate reports
              </Button>
            </Link>
          ) : null}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Past Reports</h2>
          {reports && reports.length > 0 ? (
            <div className="space-y-3">
              {(reports as Report[]).map((report) => (
                <Card key={report.id} className="border-slate-200 hover:border-indigo-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{report.period_month}</p>
                        <p className="text-sm text-slate-500">
                          Generated {new Date(report.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          report.status === 'complete' ? 'bg-green-50 text-green-700' :
                          report.status === 'generating' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {report.status}
                        </span>
                        {report.status === 'complete' && (
                          <Link href={`/dashboard/report/${report.id}`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-slate-200 border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400 text-sm">No reports yet.</p>
                {xeroConnection && canGenerateReport && (
                  <Link href="/dashboard/generate" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">Generate your first report</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
