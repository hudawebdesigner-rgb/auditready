import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signOut } from '@/lib/actions/auth'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('id, tenant_name, expires_at')
    .eq('user_id', user.id)
    .single()

  const isTrialActive = userRecord?.trial_ends_at
    ? new Date(userRecord.trial_ends_at) > new Date()
    : false
  const trialEndsAt = userRecord?.trial_ends_at
    ? new Date(userRecord.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-slate-900">AuditReady</span>
            </Link>
          </div>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">Sign out</Button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Email address</p>
              <p className="font-medium text-slate-900">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            {userRecord?.stripe_subscription_status === 'active' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-green-700 font-medium">Active subscription — $149/month</span>
                </div>
                <p className="text-sm text-slate-500">Your subscription is active. You have unlimited access to all features.</p>
                <Button variant="outline" size="sm">Manage billing</Button>
              </div>
            ) : isTrialActive ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  <span className="text-sm text-indigo-700 font-medium">Free trial — ends {trialEndsAt}</span>
                </div>
                <p className="text-sm text-slate-500">Upgrade to continue generating reports after your trial ends.</p>
                <Button size="sm">Subscribe — $149/month</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-sm text-red-700 font-medium">Trial expired</span>
                </div>
                <p className="text-sm text-slate-500">Subscribe to continue generating reports.</p>
                <Button size="sm">Subscribe — $149/month</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Xero Connection</CardTitle>
            <CardDescription>Manage your Xero account connection</CardDescription>
          </CardHeader>
          <CardContent>
            {xeroConnection ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-green-700 font-medium">Connected</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Organisation</p>
                  <p className="font-medium text-slate-900">{xeroConnection.tenant_name}</p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                  Disconnect Xero
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">No Xero account connected.</p>
                <Link href="/onboarding">
                  <Button size="sm">Connect Xero</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all your data.</p>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              Delete account
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
