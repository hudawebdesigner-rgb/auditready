'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signUp } from '@/lib/actions/auth'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signUp(formData)
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
            <CardTitle className="text-2xl font-bold text-slate-900">Create your account</CardTitle>
            <CardDescription>Start your 14-day free trial — no credit card required</CardDescription>
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
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
