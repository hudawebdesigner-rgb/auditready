export interface User {
  id: string
  email: string
  created_at: string
  stripe_customer_id: string | null
  stripe_subscription_status: string | null
  trial_ends_at: string | null
}

export interface XeroConnection {
  id: string
  user_id: string
  tenant_id: string
  tenant_name: string
  access_token: string
  refresh_token: string
  expires_at: string
}

export interface Report {
  id: string
  user_id: string
  generated_at: string
  period_month: string
  raw_xero_data: XeroData | null
  ai_report_content: AIReportContent | null
  status: 'generating' | 'complete' | 'failed'
}

export interface XeroData {
  profit_and_loss: Record<string, unknown>
  balance_sheet: Record<string, unknown>
  bank_summary: Record<string, unknown>
  aged_receivables: Record<string, unknown>
  aged_payables: Record<string, unknown>
  period: string
}

export interface AIReportSection {
  title: string
  content: string
}

export interface AIReportContent {
  business_snapshot: string
  revenue_story: string
  where_money_went: string
  cash_position: string
  watch_out_for: string[]
  action_list: string[]
  generated_at: string
}
