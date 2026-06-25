'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reports/generate', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate report. Please try again.')
        setLoading(false)
        return
      }

      router.push(`/dashboard/report/${data.reportId}`)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← Back</Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900">AuditReady</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Generate Financial Health Report</h1>
        <p className="text-slate-500 mb-8">We&apos;ll pull your latest data from Xero and use AI to generate a plain-English report.</p>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">What happens when you click Generate</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                'We fetch your P&L, Balance Sheet, bank balances, aged receivables and payables from Xero',
                'We send that data to Claude AI to generate your plain-English report',
                'Your report is saved and ready to view, download as PDF, or email to yourself',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="py-8 text-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-indigo-800 font-medium">Generating your report...</p>
              <p className="text-sm text-indigo-600 mt-1">This takes about 30-60 seconds</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}
            <Button size="lg" className="w-full" onClick={handleGenerate}>
              Generate My Financial Health Report
            </Button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Report covers the current calendar month
            </p>
          </>
        )}
      </main>
    </div>
  )
}
