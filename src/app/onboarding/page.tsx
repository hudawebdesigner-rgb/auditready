import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if Xero is already connected
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('id, tenant_name')
    .eq('user_id', user.id)
    .single()

  if (xeroConnection) redirect('/dashboard')

  const xeroAuthUrl = buildXeroAuthUrl()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">AuditReady</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect your Xero account</h1>
          <p className="text-slate-500">We need read-only access to your Xero data to generate your financial health reports.</p>
        </div>

        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base">What we&apos;ll access</CardTitle>
            <CardDescription>Read-only access — we never modify your Xero data</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                'Profit & Loss report',
                'Balance Sheet',
                'Bank account balances',
                'Aged Receivables (who owes you money)',
                'Aged Payables (who you owe money to)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <a href={xeroAuthUrl} className="block">
          <Button className="w-full" size="lg">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.048 4.698c3.976 0 7.204 3.228 7.204 7.204 0 3.977-3.228 7.205-7.204 7.205-3.977 0-7.205-3.228-7.205-7.205 0-3.976 3.228-7.204 7.205-7.204z" />
            </svg>
            Connect Xero Account
          </Button>
        </a>
        <p className="text-center text-xs text-slate-400 mt-4">
          You&apos;ll be redirected to Xero to authorise the connection
        </p>
      </div>
    </div>
  )
}

function buildXeroAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID || '',
    redirect_uri: process.env.XERO_REDIRECT_URI || '',
    scope: 'openid profile email accounting.reports.read accounting.settings.read offline_access',
    state: 'xero_oauth',
  })
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
}
