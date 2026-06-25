'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signIn } from '@/lib/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">AuditReady</span>
          </Link>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
            <CardDescription>Log in to view your financial health reports</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@yourstore.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-indigo-600 hover:underline font-medium">
                Start free trial
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
