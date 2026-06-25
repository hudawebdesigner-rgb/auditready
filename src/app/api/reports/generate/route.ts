import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchXeroFinancialData } from '@/lib/xero'
import { generateFinancialReport } from '@/lib/claude'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('trial_ends_at, stripe_subscription_status')
    .eq('id', user.id)
    .single()

  const isTrialActive = userRecord?.trial_ends_at
    ? new Date(userRecord.trial_ends_at) > new Date()
    : false
  const isSubscribed = userRecord?.stripe_subscription_status === 'active'

  if (!isTrialActive && !isSubscribed) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 })
  }

  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!xeroConn) {
    return NextResponse.json({ error: 'No Xero connection' }, { status: 400 })
  }

  const now = new Date()
  const periodMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const { data: report, error: createError } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      period_month: periodMonth,
      status: 'generating',
    })
    .select('id')
    .single()

  if (createError || !report) {
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }

  try {
    const xeroData = await fetchXeroFinancialData(user.id)
    const aiContent = await generateFinancialReport(xeroData)

    await supabase
      .from('reports')
      .update({
        raw_xero_data: xeroData,
        ai_report_content: aiContent,
        status: 'complete',
        generated_at: new Date().toISOString(),
      })
      .eq('id', report.id)

    return NextResponse.json({ reportId: report.id })
  } catch (err) {
    console.error('Report generation failed:', err)

    await supabase
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', report.id)

    return NextResponse.json(
      { error: 'Report generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
