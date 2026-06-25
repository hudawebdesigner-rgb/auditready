import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">AuditReady</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Start free trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
          Built for Shopify store owners using Xero
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6 max-w-4xl mx-auto">
          Finally understand<br />
          <span className="text-indigo-600">what your numbers mean</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          AuditReady connects to your Xero account and uses AI to turn your reconciled financial data into a plain-English monthly report. No accountant required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto px-8">
              Start your 14-day free trial
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
              Log in to your account
            </Button>
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">No credit card required. Cancel anytime.</p>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Your monthly report covers everything</h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">Six sections written in plain English, generated from your actual Xero data.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Business Snapshot", desc: "3 sentences summarising the month so you know immediately how you performed." },
              { title: "Revenue Story", desc: "What revenue was, vs last month, vs 3 months ago — with a plain-English trend explanation." },
              { title: "Where Your Money Went", desc: "Top expense categories and any unusual spikes, written in plain English, not accountant language." },
              { title: "Cash Position", desc: "How much cash is in the bank right now, and whether it's healthy for a business your size." },
              { title: "Watch Out For", desc: "2-3 specific flags and risks based on your actual numbers, not generic advice." },
              { title: "Your Action List", desc: "3 specific things you should do this month based on what the numbers are telling you." },
            ].map((f) => (
              <Card key={f.title} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-500 text-center mb-12">One plan. Everything included.</p>
          <div className="max-w-sm mx-auto">
            <Card className="border-2 border-indigo-600 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">$149<span className="text-base font-normal text-slate-500">/month</span></CardTitle>
                <p className="text-slate-500 text-sm">After 14-day free trial</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {[
                    "Unlimited monthly reports",
                    "Xero OAuth2 connection",
                    "AI-powered insights (6 sections)",
                    "PDF download",
                    "Email delivery",
                    "14-day free trial",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full" size="lg">Start free trial</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-semibold text-slate-700 text-sm">AuditReady</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 AuditReady. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
