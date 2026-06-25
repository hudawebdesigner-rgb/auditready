import { createClient } from '@/lib/supabase/server'

async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = await createClient()

  const { data: conn, error } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !conn) throw new Error('No Xero connection found')

  // Refresh if token expires within 5 minutes
  if (new Date(conn.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    const refreshed = await refreshXeroToken(conn.refresh_token)

    await supabase
      .from('xero_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)

    return refreshed.access_token
  }

  return conn.access_token
}

async function refreshXeroToken(refreshToken: string) {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.XERO_CLIENT_ID!,
      client_secret: process.env.XERO_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) throw new Error('Failed to refresh Xero token')
  return res.json()
}

async function xeroGet(
  path: string,
  tenantId: string,
  accessToken: string,
  params?: Record<string, string>
) {
  const url = new URL(`https://api.xero.com/api.xro/2.0${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero API error (${res.status}): ${text}`)
  }

  return res.json()
}

export async function fetchXeroFinancialData(userId: string) {
  const supabase = await createClient()
  const accessToken = await getValidAccessToken(userId)

  const { data: conn } = await supabase
    .from('xero_connections')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()

  if (!conn) throw new Error('No Xero connection')

  const tenantId = conn.tenant_id

  // Current month date range
  const now = new Date()
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [profitAndLoss, balanceSheet, bankSummary, agedReceivables, agedPayables] = await Promise.all([
    xeroGet('/Reports/ProfitAndLoss', tenantId, accessToken, {
      fromDate,
      toDate,
      periods: '3',
      timeframe: 'MONTH',
    }),
    xeroGet('/Reports/BalanceSheet', tenantId, accessToken, {
      date: toDate,
    }),
    xeroGet('/Reports/BankSummary', tenantId, accessToken, {
      fromDate,
      toDate,
    }),
    xeroGet('/Reports/AgedReceivablesByContact', tenantId, accessToken),
    xeroGet('/Reports/AgedPayablesByContact', tenantId, accessToken),
  ])

  const period = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`

  return {
    profit_and_loss: profitAndLoss,
    balance_sheet: balanceSheet,
    bank_summary: bankSummary,
    aged_receivables: agedReceivables,
    aged_payables: agedPayables,
    period,
  }
}
