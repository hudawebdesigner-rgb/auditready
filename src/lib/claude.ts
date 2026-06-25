import Anthropic from '@anthropic-ai/sdk'
import type { XeroData, AIReportContent } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateFinancialReport(xeroData: XeroData): Promise<AIReportContent> {
  const prompt = `You are a financial advisor helping a Shopify store owner understand their business finances.
You have been given their reconciled financial data from Xero for ${xeroData.period}.

Here is their financial data:

PROFIT & LOSS:
${JSON.stringify(xeroData.profit_and_loss, null, 2)}

BALANCE SHEET:
${JSON.stringify(xeroData.balance_sheet, null, 2)}

BANK SUMMARY:
${JSON.stringify(xeroData.bank_summary, null, 2)}

AGED RECEIVABLES (money owed TO the business):
${JSON.stringify(xeroData.aged_receivables, null, 2)}

AGED PAYABLES (money the business OWES):
${JSON.stringify(xeroData.aged_payables, null, 2)}

Generate a Financial Health Report with EXACTLY these 6 sections. Write in plain English — no jargon, no accountant language. Write directly to the business owner as "you".

Return your response as valid JSON with this exact structure:
{
  "business_snapshot": "3 sentences summarising the month in plain English",
  "revenue_story": "Plain English explanation of revenue vs last month, vs 3 months ago, and the trend",
  "where_money_went": "Plain English summary of top expense categories and any unusual spikes",
  "cash_position": "How much cash is in the bank right now and whether it is healthy for a business this size",
  "watch_out_for": ["First specific risk or flag", "Second specific risk or flag", "Third specific risk or flag"],
  "action_list": ["First specific action to take this month", "Second specific action", "Third specific action"]
}

Rules:
- write_out_for must have exactly 2-3 items
- action_list must have exactly 3 items
- Be specific to their actual numbers, not generic advice
- Use dollar amounts from the data where relevant
- Keep each section concise but informative
- Do not use accounting jargon`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  const parsed = JSON.parse(jsonMatch[0]) as Omit<AIReportContent, 'generated_at'>

  return {
    ...parsed,
    generated_at: new Date().toISOString(),
  }
}
